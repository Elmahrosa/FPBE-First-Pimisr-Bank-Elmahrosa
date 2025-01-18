# Provider configuration for GCP
# hashicorp/google v4.0
provider "google" {
  project = var.project_id
  region  = var.primary_region
}

# Provider configuration for GCP Beta features
# hashicorp/google-beta v4.0
provider "google-beta" {
  project = var.project_id
  region  = var.primary_region
}

# Local variables for service account naming and IAM roles
locals {
  service_accounts = {
    gke        = "gke-sa-${var.environment}"
    monitoring = "monitoring-sa-${var.environment}"
    backup     = "backup-sa-${var.environment}"
  }

  iam_roles = {
    gke        = "roles/container.nodeServiceAccount"
    monitoring = "roles/monitoring.metricWriter"
    logging    = "roles/logging.logWriter"
    backup     = "roles/storage.objectViewer"
  }
}

# GKE Service Account
resource "google_service_account" "gke_service_account" {
  account_id   = local.service_accounts.gke
  display_name = "GKE Service Account for ${var.environment}"
  description  = "Service account for GKE workloads with least privilege access"
}

# Monitoring Service Account
resource "google_service_account" "monitoring_service_account" {
  account_id   = local.service_accounts.monitoring
  display_name = "Monitoring Service Account for ${var.environment}"
  description  = "Service account for monitoring, logging, and observability with restricted permissions"
}

# Backup Service Account
resource "google_service_account" "backup_service_account" {
  account_id   = local.service_accounts.backup
  display_name = "Backup Service Account for ${var.environment}"
  description  = "Service account for backup and disaster recovery operations"
}

# GKE Node Service Account IAM Binding with conditional access
resource "google_project_iam_binding" "gke_node_binding" {
  project = var.project_id
  role    = local.iam_roles.gke
  members = ["serviceAccount:${google_service_account.gke_service_account.email}"]

  condition {
    title       = "gke_node_access"
    description = "Conditional access for GKE nodes"
    expression  = "resource.type == 'container.googleapis.com/Cluster'"
  }
}

# Monitoring Service Account IAM Binding
resource "google_project_iam_binding" "monitoring_binding" {
  project = var.project_id
  role    = local.iam_roles.monitoring
  members = ["serviceAccount:${google_service_account.monitoring_service_account.email}"]
}

# Logging Service Account IAM Binding
resource "google_project_iam_binding" "logging_binding" {
  project = var.project_id
  role    = local.iam_roles.logging
  members = ["serviceAccount:${google_service_account.monitoring_service_account.email}"]
}

# Backup Service Account IAM Binding
resource "google_project_iam_binding" "backup_binding" {
  project = var.project_id
  role    = local.iam_roles.backup
  members = ["serviceAccount:${google_service_account.backup_service_account.email}"]
}

# Workload Identity IAM Binding for GKE Service Account
resource "google_service_account_iam_binding" "workload_identity_binding" {
  service_account_id = google_service_account.gke_service_account.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[monitoring/prometheus-sa]",
    "serviceAccount:${var.project_id}.svc.id.goog[logging/fluentd-sa]",
    "serviceAccount:${var.project_id}.svc.id.goog[backup/velero-sa]"
  ]
}

# Additional security controls for service accounts
resource "google_service_account_iam_policy" "security_controls" {
  service_account_id = google_service_account.gke_service_account.name
  policy_data = jsonencode({
    bindings = [
      {
        role    = "roles/iam.serviceAccountTokenCreator"
        members = ["serviceAccount:${google_service_account.gke_service_account.email}"]
      }
    ]
  })
}

# Audit logging configuration for IAM changes
resource "google_project_iam_audit_config" "audit_config" {
  project = var.project_id
  service = "iam.googleapis.com"

  audit_log_config {
    log_type = "ADMIN_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
  audit_log_config {
    log_type = "DATA_READ"
  }
}

# Custom role for fine-grained permissions
resource "google_project_iam_custom_role" "fpbe_custom_role" {
  role_id     = "fpbeCustomRole"
  title       = "FPBE Custom Role"
  description = "Custom role for FPBE application with minimal required permissions"
  permissions = [
    "container.clusters.get",
    "container.clusters.list",
    "monitoring.metricDescriptors.list",
    "monitoring.timeSeries.list",
    "logging.logEntries.list"
  ]
}

# Outputs for use in other Terraform configurations
output "gke_service_account_email" {
  value       = google_service_account.gke_service_account.email
  description = "Email address of the GKE service account"
}

output "gke_service_account_name" {
  value       = google_service_account.gke_service_account.name
  description = "Full resource name of the GKE service account"
}

output "monitoring_service_account_email" {
  value       = google_service_account.monitoring_service_account.email
  description = "Email address of the monitoring service account"
}