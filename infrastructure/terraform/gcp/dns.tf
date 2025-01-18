# Provider version constraint
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Local variables for DNS configuration
locals {
  dns_zone_name = "${var.environment}-fpbe-zone"
  dns_domain    = "fpbe-${var.environment}.elmahrosa.com"
}

# DNS Managed Zone for FPBE banking application
resource "google_dns_managed_zone" "main" {
  name        = local.dns_zone_name
  dns_name    = "${local.dns_domain}."
  description = "DNS zone for FPBE mobile banking application"
  project     = var.project_id
  visibility  = "public"

  # Enable DNSSEC for enhanced security
  dnssec_config {
    state = "on"
  }

  # Apply common labels for resource management
  labels = local.common_labels
}

# A record for API endpoint
resource "google_dns_record_set" "api" {
  name         = "api.${local.dns_domain}."
  type         = "A"
  ttl          = 300
  managed_zone = local.dns_zone_name
  project      = var.project_id
  rrdatas      = [google_compute_global_address.api.address]

  depends_on = [google_dns_managed_zone.main]
}

# A record for web application
resource "google_dns_record_set" "app" {
  name         = "app.${local.dns_domain}."
  type         = "A"
  ttl          = 300
  managed_zone = local.dns_zone_name
  project      = var.project_id
  rrdatas      = [google_compute_global_address.app.address]

  depends_on = [google_dns_managed_zone.main]
}

# MX records for email services
resource "google_dns_record_set" "mx" {
  name         = local.dns_domain
  type         = "MX"
  ttl          = 3600
  managed_zone = local.dns_zone_name
  project      = var.project_id
  rrdatas = [
    "1 aspmx.l.google.com.",
    "5 alt1.aspmx.l.google.com.",
    "5 alt2.aspmx.l.google.com.",
    "10 alt3.aspmx.l.google.com.",
    "10 alt4.aspmx.l.google.com."
  ]

  depends_on = [google_dns_managed_zone.main]
}

# TXT record for domain verification and SPF
resource "google_dns_record_set" "txt" {
  name         = local.dns_domain
  type         = "TXT"
  ttl          = 3600
  managed_zone = local.dns_zone_name
  project      = var.project_id
  rrdatas      = ["v=spf1 include:_spf.google.com ~all"]

  depends_on = [google_dns_managed_zone.main]
}

# CNAME record for monitoring subdomain
resource "google_dns_record_set" "monitoring" {
  name         = "monitoring.${local.dns_domain}."
  type         = "CNAME"
  ttl          = 300
  managed_zone = local.dns_zone_name
  project      = var.project_id
  rrdatas      = ["monitoring.${var.primary_region}-monitoring.googleapis.com."]

  depends_on = [google_dns_managed_zone.main]
}

# Health check records for high availability
resource "google_dns_record_set" "health" {
  name         = "health.${local.dns_domain}."
  type         = "A"
  ttl          = 300
  managed_zone = local.dns_zone_name
  project      = var.project_id
  rrdatas      = [google_compute_global_address.health.address]

  depends_on = [google_dns_managed_zone.main]
}

# Output DNS zone details for reference
output "dns_zone" {
  value = {
    name     = google_dns_managed_zone.main.name
    dns_name = google_dns_managed_zone.main.dns_name
  }
  description = "DNS zone details for FPBE application"
}

# Output DNS record endpoints
output "dns_endpoints" {
  value = {
    api         = google_dns_record_set.api.name
    app         = google_dns_record_set.app.name
    monitoring  = google_dns_record_set.monitoring.name
    health      = google_dns_record_set.health.name
  }
  description = "DNS endpoints for various FPBE services"
}