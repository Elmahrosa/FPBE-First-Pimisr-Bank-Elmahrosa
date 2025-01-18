#!/bin/bash

# FPBE Banking Application Database Restore Script
# Version: 1.0.0
# Dependencies:
# - aws-cli v2.x
# - postgresql-client 15.x

set -euo pipefail

# Global variables
RESTORE_DIR="/tmp/fpbe_restore"
S3_BUCKET="${APP_BACKUPS_BUCKET}"
DB_HOST="${RDS_ENDPOINT}"
DB_PORT="5432"
DB_NAME="fpbe_banking"
LOG_DIR="/var/log/fpbe/restore"
MAX_PARALLEL_DOWNLOADS=4
RESTORE_TIMEOUT=14400  # 4 hours in seconds
ENCRYPTION_KEY_ID="${KMS_KEY_ID}"

# Initialize logging
setup_logging() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p "${LOG_DIR}"
    exec 1> >(tee -a "${LOG_DIR}/restore_${timestamp}.log")
    exec 2> >(tee -a "${LOG_DIR}/restore_${timestamp}.error.log")
}

# Setup restore environment with enhanced security
setup_restore_environment() {
    echo "Setting up restore environment..."
    
    # Verify script permissions
    if [[ $EUID -ne 0 ]]; then
        echo "Error: This script must be run as root" >&2
        exit 1
    }

    # Create secure restore directory
    rm -rf "${RESTORE_DIR}" 2>/dev/null || true
    mkdir -p "${RESTORE_DIR}"
    chmod 700 "${RESTORE_DIR}"

    # Validate AWS credentials
    if ! aws sts get-caller-identity &>/dev/null; then
        echo "Error: Invalid AWS credentials" >&2
        exit 1
    }

    # Check available disk space (need at least 100GB)
    local available_space=$(df -BG "${RESTORE_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ ${available_space} -lt 100 ]]; then
        echo "Error: Insufficient disk space. Need at least 100GB" >&2
        exit 1
    }
}

# List and validate available backups
list_available_backups() {
    echo "Listing available backups..."
    
    local backups=$(aws s3 ls "s3://${S3_BUCKET}/backups/" \
        --recursive \
        --output json \
        | jq -r '.Contents[] | select(.Key | endswith(".backup.enc")) | .Key')

    if [[ -z "${backups}" ]]; then
        echo "Error: No backups found in S3 bucket" >&2
        exit 1
    }

    echo "${backups}"
}

# Download backup with parallel processing
download_backup() {
    local backup_name="$1"
    local target_file="${RESTORE_DIR}/${backup_name##*/}"
    
    echo "Downloading backup ${backup_name}..."

    # Download with progress monitoring
    if ! aws s3 cp "s3://${S3_BUCKET}/backups/${backup_name}" "${target_file}" \
        --expected-size $(aws s3 head-object --bucket "${S3_BUCKET}" --key "backups/${backup_name}" --query 'ContentLength' --output text); then
        echo "Error: Failed to download backup" >&2
        exit 1
    }

    echo "${target_file}"
}

# Decrypt backup using AWS KMS
decrypt_backup() {
    local encrypted_file="$1"
    local decrypted_file="${encrypted_file%.enc}"
    
    echo "Decrypting backup..."

    # Decrypt using AWS KMS
    if ! aws kms decrypt \
        --ciphertext-blob fileb://"${encrypted_file}" \
        --key-id "${ENCRYPTION_KEY_ID}" \
        --output text \
        --query Plaintext \
        > "${decrypted_file}"; then
        echo "Error: Backup decryption failed" >&2
        exit 1
    }

    echo "${decrypted_file}"
}

# Validate backup integrity
validate_backup() {
    local backup_file="$1"
    
    echo "Validating backup..."

    # Check file format
    if ! pg_restore -l "${backup_file}" &>/dev/null; then
        echo "Error: Invalid backup format" >&2
        return 1
    }

    # Verify backup contents
    local schema_version=$(pg_restore -l "${backup_file}" | grep -c "SCHEMA - public")
    if [[ ${schema_version} -eq 0 ]]; then
        echo "Error: Missing database schema in backup" >&2
        return 1
    }

    return 0
}

# Restore database with monitoring
restore_database() {
    local backup_file="$1"
    local start_time=$(date +%s)
    
    echo "Starting database restoration..."

    # Test database connectivity
    if ! PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c '\q' &>/dev/null; then
        echo "Error: Cannot connect to database" >&2
        exit 1
    }

    # Create restoration snapshot
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';" &>/dev/null

    # Restore database
    if ! PGPASSWORD="${DB_PASSWORD}" pg_restore \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -v \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        "${backup_file}"; then
        echo "Error: Database restoration failed" >&2
        exit 1
    }

    # Verify restoration time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    if [[ ${duration} -gt ${RESTORE_TIMEOUT} ]]; then
        echo "Warning: Restoration exceeded RTO threshold" >&2
    }

    return 0
}

# Cleanup temporary files securely
cleanup_restore_files() {
    echo "Cleaning up temporary files..."
    
    # Secure delete files
    find "${RESTORE_DIR}" -type f -exec shred -u {} \;
    rm -rf "${RESTORE_DIR}"
}

# Main function
main() {
    local backup_name="$1"
    local exit_code=0

    trap cleanup_restore_files EXIT

    setup_logging
    echo "Starting restore process at $(date)"

    setup_restore_environment

    if [[ -z "${backup_name}" ]]; then
        echo "Available backups:"
        list_available_backups
        exit 0
    }

    local downloaded_file=$(download_backup "${backup_name}")
    local decrypted_file=$(decrypt_backup "${downloaded_file}")

    if validate_backup "${decrypted_file}"; then
        if restore_database "${decrypted_file}"; then
            echo "Restore completed successfully at $(date)"
        else
            echo "Error: Restore failed" >&2
            exit_code=1
        fi
    else
        echo "Error: Backup validation failed" >&2
        exit_code=1
    fi

    return ${exit_code}
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -lt 1 ]]; then
        echo "Usage: $0 <backup_name>"
        echo "Example: $0 fpbe_backup_20230615.backup.enc"
        exit 1
    fi
    main "$1"
fi