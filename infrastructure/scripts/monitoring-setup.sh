#!/bin/bash

# FPBE Mobile Banking System - Monitoring Stack Setup Script
# Version: 1.0.0
# This script sets up and configures the monitoring stack with enhanced security,
# high availability, and disaster recovery capabilities.

set -euo pipefail

# Global Variables
MONITORING_NAMESPACE="monitoring"
PROMETHEUS_RETENTION_DAYS="15d"
PROMETHEUS_RETENTION_SIZE="50GB"
TLS_CERT_PATH="/etc/monitoring/tls"
BACKUP_RETENTION_DAYS="30"
HA_REPLICA_COUNT="3"
ALERT_NOTIFICATION_CHANNEL="slack"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    local level=$1
    shift
    local message=$@
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}"
}

# Error handling function
handle_error() {
    local exit_code=$?
    local line_number=$1
    log "ERROR" "An error occurred in line ${line_number}, exit code: ${exit_code}"
    exit $exit_code
}

trap 'handle_error ${LINENO}' ERR

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    # Check required tools
    local required_tools=("kubectl" "helm" "docker" "openssl")
    for tool in "${required_tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            log "ERROR" "${tool} is required but not installed"
            exit 1
        fi
    done

    # Verify Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        log "ERROR" "Unable to connect to Kubernetes cluster"
        exit 1
    }

    # Check Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update

    # Verify TLS certificates
    if [ ! -d "$TLS_CERT_PATH" ]; then
        log "ERROR" "TLS certificates directory not found: $TLS_CERT_PATH"
        exit 1
    fi

    log "INFO" "Prerequisites check completed successfully"
    return 0
}

# Setup monitoring namespace with enhanced security
setup_namespace() {
    log "INFO" "Setting up monitoring namespace..."

    # Create namespace if it doesn't exist
    kubectl create namespace $MONITORING_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

    # Apply resource quotas
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: monitoring-quota
  namespace: $MONITORING_NAMESPACE
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    persistentvolumeclaims: "10"
EOF

    # Apply network policies
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: monitoring-network-policy
  namespace: $MONITORING_NAMESPACE
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: $MONITORING_NAMESPACE
  egress:
  - to:
    - namespaceSelector: {}
EOF

    log "INFO" "Namespace setup completed"
    return 0
}

# Deploy monitoring stack
deploy_monitoring() {
    log "INFO" "Deploying monitoring stack..."

    # Create TLS secrets
    kubectl create secret tls prometheus-tls \
        --cert=$TLS_CERT_PATH/prometheus.crt \
        --key=$TLS_CERT_PATH/prometheus.key \
        -n $MONITORING_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

    kubectl create secret tls grafana-tls \
        --cert=$TLS_CERT_PATH/grafana.crt \
        --key=$TLS_CERT_PATH/grafana.key \
        -n $MONITORING_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

    # Deploy Prometheus stack
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace $MONITORING_NAMESPACE \
        --values ../helm/monitoring/values.yaml \
        --set prometheus.retention=$PROMETHEUS_RETENTION_DAYS \
        --set prometheus.retentionSize=$PROMETHEUS_RETENTION_SIZE \
        --set prometheus.replicaCount=$HA_REPLICA_COUNT \
        --wait

    # Deploy Grafana
    helm upgrade --install grafana grafana/grafana \
        --namespace $MONITORING_NAMESPACE \
        --values ../helm/monitoring/values.yaml \
        --set grafana.adminPassword=$GRAFANA_ADMIN_PASSWORD \
        --set grafana.replicas=$HA_REPLICA_COUNT \
        --wait

    log "INFO" "Monitoring stack deployment completed"
    return 0
}

# Verify deployment
verify_deployment() {
    log "INFO" "Verifying deployment..."

    # Check pod status
    local components=("prometheus" "grafana" "alertmanager")
    for component in "${components[@]}"; do
        if ! kubectl wait --for=condition=ready pod -l app=$component -n $MONITORING_NAMESPACE --timeout=300s; then
            log "ERROR" "Failed to verify $component deployment"
            return 1
        fi
    done

    # Verify endpoints
    local endpoints=(
        "prometheus-server:9090/-/healthy"
        "grafana:3000/api/health"
        "alertmanager:9093/-/healthy"
    )

    for endpoint in "${endpoints[@]}"; do
        IFS=: read -r service port path <<< "$endpoint"
        if ! kubectl run curl-test --image=curlimages/curl --rm --restart=Never -n $MONITORING_NAMESPACE \
            --command -- curl -s -f "http://$service.$MONITORING_NAMESPACE.svc.cluster.local:$port$path"; then
            log "ERROR" "Failed to verify $service endpoint"
            return 1
        fi
    done

    # Setup backup cronjob
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monitoring-backup
  namespace: $MONITORING_NAMESPACE
spec:
  schedule: "0 1 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: bitnami/kubectl
            command:
            - /bin/sh
            - -c
            - |
              kubectl -n $MONITORING_NAMESPACE create snapshot monitoring-backup-$(date +%Y%m%d)
          restartPolicy: OnFailure
EOF

    log "INFO" "Deployment verification completed successfully"
    return 0
}

# Main execution
main() {
    log "INFO" "Starting monitoring setup..."

    check_prerequisites || exit 1
    setup_namespace || exit 1
    deploy_monitoring || exit 1
    verify_deployment || exit 1

    log "INFO" "Monitoring setup completed successfully"
    
    # Print access information
    echo -e "\n${GREEN}Monitoring Stack Access Information:${NC}"
    echo -e "Prometheus: https://prometheus.fpbe.com"
    echo -e "Grafana: https://grafana.fpbe.com"
    echo -e "Default credentials for Grafana:"
    echo -e "Username: admin"
    echo -e "Password: ${GRAFANA_ADMIN_PASSWORD}"
}

# Execute main function
main "$@"