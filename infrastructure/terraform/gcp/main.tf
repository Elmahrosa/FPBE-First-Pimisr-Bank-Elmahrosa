# Provider and Backend Configuration
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 4.0"
    }
  }

  backend "gcs" {
    bucket          = "fpbe-terraform-state"
    prefix          = "gcp/state"
    encryption_key  = "${var.state_encryption_key}"
  }
}

# Provider Configuration
provider "google" {
  project               = var.project_id
  region                = var.region
  zone                  = var.zone
  user_project_override = true
  request_timeout       = "60s"
  request_reason        = "FPBE Infrastructure Management"
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  zone                  = var.zone
  user_project_override = true
  request_timeout       = "60s"
  request_reason        = "FPBE Infrastructure Management"
}

# Local Variables
locals {
  common_labels = {
    environment         = var.environment
    managed_by         = "terraform"
    application        = "fpbe"
    project            = var.project_id
    business_unit      = "banking"
    cost_center        = "infrastructure"
    dr_tier            = "tier1"
    compliance_level   = "high"
    data_classification = "confidential"
  }
}

# Enable Required GCP APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "container.googleapis.com",      # GKE
    "compute.googleapis.com",        # Compute Engine
    "cloudkms.googleapis.com",       # Cloud KMS
    "redis.googleapis.com",          # Cloud Memorystore
    "sqladmin.googleapis.com",       # Cloud SQL
    "monitoring.googleapis.com",     # Cloud Monitoring
    "logging.googleapis.com",        # Cloud Logging
    "cloudbuild.googleapis.com",     # Cloud Build
    "secretmanager.googleapis.com",  # Secret Manager
    "cloudtrace.googleapis.com",     # Cloud Trace
    "clouddebugger.googleapis.com",  # Cloud Debugger
    "cloudprofiler.googleapis.com"   # Cloud Profiler
  ])

  service                    = each.value
  disable_on_destroy        = false
  disable_dependent_services = true
}

# Multi-Region Load Balancer Configuration
resource "google_compute_global_address" "default" {
  name         = "fpbe-global-address"
  description  = "Global IP address for FPBE application load balancer"
  ip_version   = "IPV4"
  address_type = "EXTERNAL"
  labels       = local.common_labels
}

resource "google_compute_global_forwarding_rule" "default" {
  name                  = "fpbe-global-forwarding-rule"
  ip_protocol          = "TCP"
  load_balancing_scheme = "EXTERNAL"
  port_range           = "443"
  target               = google_compute_target_https_proxy.default.id
  ip_address           = google_compute_global_address.default.id
  labels               = local.common_labels
}

resource "google_compute_target_https_proxy" "default" {
  name             = "fpbe-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
  ssl_policy       = google_compute_ssl_policy.default.id
}

resource "google_compute_managed_ssl_certificate" "default" {
  provider = google-beta
  name     = "fpbe-ssl-cert"
  managed {
    domains = ["api.fpbe.com", "*.fpbe.com"]
  }
}

resource "google_compute_ssl_policy" "default" {
  name            = "fpbe-ssl-policy"
  profile         = "MODERN"
  min_tls_version = "TLS_1_2"
}

resource "google_compute_url_map" "default" {
  name            = "fpbe-url-map"
  default_service = google_compute_backend_service.default.id
}

resource "google_compute_backend_service" "default" {
  name                  = "fpbe-backend-service"
  protocol             = "HTTPS"
  port_name            = "https"
  timeout_sec          = 30
  enable_cdn           = true
  health_checks        = [google_compute_health_check.default.id]
  security_policy      = google_compute_security_policy.default.id
  load_balancing_scheme = "EXTERNAL"

  backend {
    group = google_compute_region_instance_group_manager.primary.instance_group
  }

  backend {
    group = google_compute_region_instance_group_manager.secondary.instance_group
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_health_check" "default" {
  name               = "fpbe-health-check"
  timeout_sec        = 5
  check_interval_sec = 10

  https_health_check {
    port         = "443"
    request_path = "/health"
  }
}

resource "google_compute_security_policy" "default" {
  name = "fpbe-security-policy"

  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["9.9.9.0/24"]  # Example blocked IP range
      }
    }
    description = "Deny access to known malicious IPs"
  }

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["0.0.0.0/0"]
      }
    }
    description = "Default rule"
  }
}

# Cloud Monitoring and Logging Configuration
resource "google_monitoring_dashboard" "infrastructure" {
  dashboard_json = jsonencode({
    displayName = "FPBE Infrastructure Dashboard"
    gridLayout = {
      widgets = [
        {
          title = "GKE Cluster CPU Usage"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"kubernetes.io/container/cpu/core_usage_time\" resource.type=\"k8s_container\""
                }
              }
            }]
          }
        }
      ]
    }
  })
}

# Cloud Monitoring Alert Policies
resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU Usage Alert"
  combiner     = "OR"
  conditions {
    display_name = "CPU Usage > 80%"
    condition_threshold {
      filter          = "metric.type=\"compute.googleapis.com/instance/cpu/utilization\" resource.type=\"gce_instance\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
    }
  }
  notification_channels = var.monitoring_config.notification_channels
}

# Output Values
output "load_balancer_ip" {
  value       = google_compute_global_address.default.address
  description = "Global Load Balancer IP Address"
}

output "ssl_cert_id" {
  value       = google_compute_managed_ssl_certificate.default.id
  description = "SSL Certificate ID"
}

output "backend_service_id" {
  value       = google_compute_backend_service.default.id
  description = "Backend Service ID"
}