#!/bin/bash

# FPBE Mobile Banking System - Security Infrastructure Setup Script
# Version: 1.0
# Description: Automated setup of security infrastructure components with enhanced compliance controls
# Dependencies: docker-ce (24.0+), openssl (3.0+), kubectl (1.27+)

set -euo pipefail

# Global Variables
VAULT_VERSION="1.13.3"
VAULT_ADDR="https://vault.fpbe.internal:8200"
WAF_CONFIG_PATH="/etc/modsecurity/modsecurity.conf"
SIEM_ENDPOINT="https://siem.fpbe.internal"
LOG_DIR="/var/log/fpbe/security"
TLS_CERT_DIR="/etc/fpbe/security/tls"
HSM_PARTITION="/dev/hsm/partition1"
COMPLIANCE_CHECK_INTERVAL="3600"

# Logging setup
setup_logging() {
    mkdir -p "${LOG_DIR}"
    exec 1> >(tee -a "${LOG_DIR}/security-setup.log")
    exec 2> >(tee -a "${LOG_DIR}/security-setup.error.log")
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting security infrastructure setup..."
}

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check required software versions
    if ! command -v docker >/dev/null 2>&1; then
        echo "Error: Docker not installed" >&2
        return 1
    fi
    
    if ! command -v openssl >/dev/null 2>&1; then
        echo "Error: OpenSSL not installed" >&2
        return 1
    fi
    
    if ! command -v kubectl >/dev/null 2>&1; then
        echo "Error: kubectl not installed" >&2
        return 1
    }
    
    # Verify FIPS mode
    if ! cat /proc/sys/crypto/fips_enabled | grep -q 1; then
        echo "Error: FIPS mode not enabled" >&2
        return 1
    }
    
    # Check required directories
    for dir in "${LOG_DIR}" "${TLS_CERT_DIR}"; do
        mkdir -p "${dir}"
        chmod 750 "${dir}"
    done
    
    return 0
}

# Setup HSM
setup_hsm() {
    local partition_name="$1"
    local crypto_user="$2"
    local security_policy="$3"
    
    echo "Configuring HSM..."
    
    # Initialize HSM partition
    softhsm2-util --init-token --slot 0 --label "${partition_name}" --pin "${RANDOM}${RANDOM}" --so-pin "${RANDOM}${RANDOM}"
    
    # Configure PKCS#11 provider
    cat > /etc/softhsm2.conf <<EOF
directories.tokendir = /var/lib/softhsm/tokens/
objectstore.backend = file
log.level = INFO
slots.removable = true
slots.mechanisms = ALL
EOF
    
    # Setup crypto user and permissions
    useradd -r -s /sbin/nologin "${crypto_user}"
    chown -R "${crypto_user}:${crypto_user}" /var/lib/softhsm
    
    # Configure key rotation policy
    cat > /etc/security/key-rotation.conf <<EOF
rotation_interval=30d
minimum_key_size=4096
allowed_algorithms=RSA,ECDSA
backup_enabled=true
audit_logging=true
EOF
    
    return 0
}

# Configure WAF
configure_waf() {
    local config_path="$1"
    local rules_path="$2"
    local monitoring_config="$3"
    
    echo "Configuring WAF..."
    
    # Deploy ModSecurity configuration
    cat > "${config_path}" <<EOF
SecRuleEngine On
SecRequestBodyAccess On
SecResponseBodyAccess On
SecResponseBodyMimeType text/plain text/html application/json
SecDebugLog ${LOG_DIR}/modsec_debug.log
SecDebugLogLevel 1
SecAuditEngine RelevantOnly
SecAuditLog ${LOG_DIR}/modsec_audit.log
SecAuditLogParts ABCFHZ
SecAuditLogType Serial
SecAuditLogStorageDir ${LOG_DIR}/audit/
EOF
    
    # Setup OWASP CRS rules
    wget -qO- https://github.com/coreruleset/coreruleset/archive/v3.3.2.tar.gz | tar xz -C "${rules_path}"
    
    # Configure rate limiting
    cat > "${rules_path}/custom/rate-limiting.conf" <<EOF
SecRule IP:REQUEST_RATE "@gt 100" \
    "phase:1,deny,status:429,msg:'Rate limit exceeded'"
EOF
    
    return 0
}

# Deploy SIEM
deploy_siem() {
    local siem_endpoint="$1"
    local retention_days="$2"
    local ml_config="$3"
    
    echo "Deploying SIEM..."
    
    # Configure Elasticsearch
    cat > /etc/elasticsearch/elasticsearch.yml <<EOF
cluster.name: fpbe-siem
node.name: siem-master
path.data: /var/lib/elasticsearch
path.logs: ${LOG_DIR}/elasticsearch
network.host: 0.0.0.0
discovery.type: single-node
xpack.security.enabled: true
xpack.monitoring.enabled: true
xpack.ml.enabled: true
EOF
    
    # Setup Kibana
    cat > /etc/kibana/kibana.yml <<EOF
server.host: "0.0.0.0"
elasticsearch.hosts: ["${siem_endpoint}"]
xpack.security.enabled: true
xpack.encryptedSavedObjects.encryptionKey: "${RANDOM}${RANDOM}${RANDOM}"
EOF
    
    # Configure log collectors
    cat > /etc/filebeat/filebeat.yml <<EOF
filebeat.inputs:
- type: log
  paths:
    - ${LOG_DIR}/*.log
output.elasticsearch:
  hosts: ["${siem_endpoint}"]
  protocol: "https"
EOF
    
    return 0
}

# Setup Vault
setup_vault() {
    local vault_addr="$1"
    local config_path="$2"
    local hsm_config="$3"
    
    echo "Setting up Vault..."
    
    # Deploy Vault configuration
    cat > "${config_path}/vault.hcl" <<EOF
storage "raft" {
  path = "/vault/data"
  node_id = "node1"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_cert_file = "${TLS_CERT_DIR}/vault.crt"
  tls_key_file = "${TLS_CERT_DIR}/vault.key"
  tls_min_version = "tls13"
}

seal "pkcs11" {
  lib = "/usr/lib/softhsm/libsofthsm2.so"
  slot = "0"
  pin = "${RANDOM}${RANDOM}"
  key_label = "vault-master"
  hmac_key_label = "vault-hmac"
}

api_addr = "${vault_addr}"
cluster_addr = "https://vault.fpbe.internal:8201"

telemetry {
  prometheus_retention_time = "30m"
  disable_hostname = true
}
EOF
    
    # Initialize Vault
    vault operator init -key-shares=5 -key-threshold=3
    
    return 0
}

# Verify setup
verify_setup() {
    echo "Verifying security setup..."
    
    # Check component status
    services=("vault" "waf" "siem" "hsm")
    for service in "${services[@]}"; do
        if ! systemctl is-active --quiet "${service}"; then
            echo "Error: ${service} is not running" >&2
            return 1
        fi
    done
    
    # Verify TLS configurations
    if ! openssl s_client -connect "${VAULT_ADDR#https://}" -tls1_3 </dev/null; then
        echo "Error: TLS 1.3 verification failed" >&2
        return 1
    }
    
    # Check audit logging
    if ! [ -f "${LOG_DIR}/audit.log" ]; then
        echo "Error: Audit logging not configured" >&2
        return 1
    }
    
    echo "Security infrastructure setup completed successfully"
    return 0
}

# Main execution
main() {
    setup_logging
    
    if ! check_prerequisites; then
        echo "Prerequisites check failed" >&2
        exit 1
    }
    
    # Setup security components
    setup_hsm "fpbe-hsm" "crypto-user" "high-security"
    configure_waf "${WAF_CONFIG_PATH}" "/etc/modsecurity/rules" "monitoring.conf"
    deploy_siem "${SIEM_ENDPOINT}" 90 "ml-config.yml"
    setup_vault "${VAULT_ADDR}" "/vault/config" "hsm-config.yml"
    
    # Verify setup
    if ! verify_setup; then
        echo "Security setup verification failed" >&2
        exit 1
    }
    
    echo "Security infrastructure setup completed successfully"
}

# Execute main function
main "$@"