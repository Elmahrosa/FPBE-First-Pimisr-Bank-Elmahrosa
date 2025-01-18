# Provider configuration for Google Cloud Platform
# Version: ~> 4.0
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Local variables for resource naming and configuration
locals {
  cdn_name            = "fpbe-cdn-${var.environment}"
  backend_bucket_name = "fpbe-static-assets-${var.environment}"
  ssl_certificate_name = "fpbe-cdn-cert-${var.environment}"
}

# Cloud Storage bucket for static assets
resource "google_storage_bucket" "static_assets" {
  name                        = local.backend_bucket_name
  location                    = "US"
  force_destroy               = true
  uniform_bucket_level_access = true
  project                     = var.project_id
  labels                      = local.common_labels

  versioning {
    enabled = true
  }

  # CORS configuration for web access
  cors {
    origin          = ["https://*.fpbe.com"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  # Lifecycle rules for cost optimization
  lifecycle_rule {
    condition {
      age        = 30
      with_state = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }
}

# Backend bucket configuration for CDN
resource "google_compute_backend_bucket" "static_assets" {
  name        = local.backend_bucket_name
  description = "Backend bucket for FPBE static assets with CDN enabled"
  bucket_name = google_storage_bucket.static_assets.name
  enable_cdn  = true
  project     = var.project_id
  labels      = local.common_labels

  # Cache control settings for optimal performance
  cache_control {
    default_ttl = 3600    # 1 hour default TTL
    client_ttl  = 3600    # 1 hour client TTL
    max_ttl     = 86400   # 24 hours max TTL
  }
}

# URL map for CDN configuration
resource "google_compute_url_map" "cdn" {
  name            = local.cdn_name
  description     = "URL map for FPBE CDN with default backend bucket"
  default_service = google_compute_backend_bucket.static_assets.self_link
  project         = var.project_id
  labels          = local.common_labels
}

# SSL certificate for HTTPS
resource "google_compute_managed_ssl_certificate" "cdn" {
  name     = local.ssl_certificate_name
  project  = var.project_id
  labels   = local.common_labels

  managed {
    domains = ["cdn-${var.environment}.fpbe.com"]
  }
}

# HTTPS proxy configuration
resource "google_compute_target_https_proxy" "cdn" {
  name             = "${local.cdn_name}-proxy"
  url_map          = google_compute_url_map.cdn.self_link
  ssl_certificates = [google_compute_managed_ssl_certificate.cdn.self_link]
  project          = var.project_id
  labels           = local.common_labels
  quic_override    = "ENABLE"  # Enable HTTP/3 for improved performance
}

# Global forwarding rule for CDN traffic
resource "google_compute_global_forwarding_rule" "cdn" {
  name                  = "${local.cdn_name}-forwarding-rule"
  target                = google_compute_target_https_proxy.cdn.self_link
  port_range           = "443"
  ip_protocol          = "TCP"
  load_balancing_scheme = "EXTERNAL"
  project              = var.project_id
  labels               = local.common_labels
}

# Outputs for reference in other modules
output "cdn_backend_bucket" {
  value = {
    name      = google_compute_backend_bucket.static_assets.name
    self_link = google_compute_backend_bucket.static_assets.self_link
  }
  description = "CDN backend bucket details for static assets"
}

output "cdn_url_map" {
  value = {
    name      = google_compute_url_map.cdn.name
    self_link = google_compute_url_map.cdn.self_link
  }
  description = "CDN URL map configuration details"
}

output "cdn_ip_address" {
  value = {
    address = google_compute_global_forwarding_rule.cdn.ip_address
  }
  description = "Global IP address for CDN endpoint"
}