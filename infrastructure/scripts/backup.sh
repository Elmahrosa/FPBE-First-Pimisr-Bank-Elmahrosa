#!/bin/bash
# FPBE Banking Application Database Backup Script
# Version: 1.0.0
# Dependencies:
# - aws-cli v2.x
# - postgresql-client v15.x

set -euo pipefail
IFS=$'\n\t'

# Global Configuration
BACKUP_DIR="/tmp/fpbe_backups"
S3_BUCKET="${APP_BACKUPS_BUCKET}"
DB_HOST="${RDS_ENDPOINT}"
DB_PORT="5432"
DB_NAME="fpbe_banking"
BACKUP_RETENTION_DAYS="30"
KMS_KEY_ID="${KMS_BACKUP_KEY_ARN}"
LOG_DIR="/var/log/fpbe/backups"
COMPRESSION_LEVEL="9"
MAX_PARALLEL_UPLOADS="5"

# Logging configuration
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="${LOG_DIR}/backup_${TIMESTAMP}.log"

# Logging function
log() {
    local level="$1"
    local message="$2"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Error handling
error_handler() {
    local line_no=$1
    local error_code=$2
    log "ERROR" "Error occurred in script at line: ${line_no}, error code: ${error_code}"
    cleanup_local_files
    exit "${error_code}"
}

trap 'error_handler ${LINENO} $?' ERR

setup_backup_environment() {
    log "INFO" "Setting up backup environment"
    
    # Verify script is running as root or with sufficient permissions
    if [[ $EUID -ne 0 ]]; then
        log "ERROR" "Script must be run with root privileges"
        exit 1
    }

    # Create backup directory with secure permissions
    mkdir -p "${BACKUP_DIR}"
    chmod 700 "${BACKUP_DIR}"
    
    # Create and secure log directory
    mkdir -p "${LOG_DIR}"
    chmod 750 "${LOG_DIR}"
    
    # Rotate logs older than 7 days
    find "${LOG_DIR}" -type f -name "*.log" -mtime +7 -delete
    
    # Verify AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        log "ERROR" "AWS credentials not configured or invalid"
        exit 1
    }
    
    # Verify KMS key access
    if ! aws kms describe-key --key-id "${KMS_KEY_ID}" &>/dev/null; then
        log "ERROR" "Unable to access KMS key"
        exit 1
    }
    
    # Verify S3 bucket configuration
    if ! aws s3api get-bucket-versioning --bucket "${S3_BUCKET}" &>/dev/null; then
        log "ERROR" "Unable to access S3 bucket or bucket does not exist"
        exit 1
    }
    
    log "INFO" "Backup environment setup completed"
}

create_database_backup() {
    local backup_file="${BACKUP_DIR}/fpbe_backup_${TIMESTAMP}.sql.gz"
    log "INFO" "Starting database backup to ${backup_file}"
    
    # Create backup with progress monitoring
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -F c \
        -Z "${COMPRESSION_LEVEL}" \
        -v \
        -f "${backup_file}" 2>> "${LOG_FILE}"
    
    # Verify backup integrity
    if ! pg_restore -l "${backup_file}" &>/dev/null; then
        log "ERROR" "Backup verification failed"
        return 1
    }
    
    # Calculate and store checksum
    local checksum=$(sha256sum "${backup_file}" | cut -d' ' -f1)
    echo "${checksum}" > "${backup_file}.sha256"
    
    log "INFO" "Database backup completed successfully"
    echo "${backup_file}"
}

encrypt_backup() {
    local backup_file="$1"
    local encrypted_file="${backup_file}.enc"
    log "INFO" "Encrypting backup file using AWS KMS"
    
    # Generate data key
    local data_key_response=$(aws kms generate-data-key \
        --key-id "${KMS_KEY_ID}" \
        --key-spec AES_256)
    
    local encrypted_key=$(echo "${data_key_response}" | jq -r '.CiphertextBlob')
    local plaintext_key=$(echo "${data_key_response}" | jq -r '.Plaintext')
    
    # Encrypt file using AES-256-GCM
    openssl enc -aes-256-gcm \
        -in "${backup_file}" \
        -out "${encrypted_file}" \
        -K "${plaintext_key}" \
        -iv "$(openssl rand -hex 12)" \
        2>> "${LOG_FILE}"
    
    # Store encryption metadata
    echo "${encrypted_key}" > "${encrypted_file}.key"
    
    # Verify encryption
    if [[ ! -f "${encrypted_file}" ]]; then
        log "ERROR" "Encryption failed"
        return 1
    }
    
    log "INFO" "Backup encryption completed"
    echo "${encrypted_file}"
}

upload_to_s3() {
    local encrypted_file="$1"
    log "INFO" "Uploading encrypted backup to S3"
    
    # Calculate optimal part size for multi-part upload
    local file_size=$(stat -f%z "${encrypted_file}")
    local part_size=$((file_size / MAX_PARALLEL_UPLOADS + 1))
    
    # Upload to S3 with server-side encryption
    aws s3 cp "${encrypted_file}" \
        "s3://${S3_BUCKET}/backups/${TIMESTAMP}/" \
        --sse aws:kms \
        --sse-kms-key-id "${KMS_KEY_ID}" \
        --metadata "timestamp=${TIMESTAMP},checksum=$(sha256sum ${encrypted_file} | cut -d' ' -f1)" \
        --expected-size "${file_size}" \
        --part-size "${part_size}" \
        --storage-class STANDARD_IA \
        2>> "${LOG_FILE}"
    
    # Verify upload
    if ! aws s3 ls "s3://${S3_BUCKET}/backups/${TIMESTAMP}/" &>/dev/null; then
        log "ERROR" "Upload verification failed"
        return 1
    }
    
    log "INFO" "Backup upload completed successfully"
    return 0
}

cleanup_old_backups() {
    log "INFO" "Starting cleanup of old backups"
    
    # List backups older than retention period
    local old_backups=$(aws s3 ls "s3://${S3_BUCKET}/backups/" \
        --recursive \
        | awk -v date="$(date -v-${BACKUP_RETENTION_DAYS}d +%Y-%m-%d)" '$1 < date {print $4}')
    
    if [[ -n "${old_backups}" ]]; then
        echo "${old_backups}" | while read -r backup; do
            # Move to deletion queue with 7-day recovery window
            aws s3 mv \
                "s3://${S3_BUCKET}/backups/${backup}" \
                "s3://${S3_BUCKET}/deletion-queue/${backup}" \
                --quiet
            log "INFO" "Moved ${backup} to deletion queue"
        done
    fi
    
    log "INFO" "Backup cleanup completed"
}

cleanup_local_files() {
    log "INFO" "Cleaning up local backup files"
    
    # Securely delete files
    find "${BACKUP_DIR}" -type f -exec shred -u {} \;
    
    # Reset directory permissions
    chmod 700 "${BACKUP_DIR}"
    
    log "INFO" "Local cleanup completed"
}

main() {
    local exit_code=0
    
    log "INFO" "Starting backup process"
    
    setup_backup_environment
    
    # Create and encrypt backup
    local backup_file=$(create_database_backup)
    local encrypted_file=$(encrypt_backup "${backup_file}")
    
    # Upload to S3
    if upload_to_s3 "${encrypted_file}"; then
        cleanup_old_backups
    else
        exit_code=1
        log "ERROR" "Backup process failed"
    fi
    
    # Cleanup
    cleanup_local_files
    
    log "INFO" "Backup process completed with exit code: ${exit_code}"
    return "${exit_code}"
}

# Execute main function
main