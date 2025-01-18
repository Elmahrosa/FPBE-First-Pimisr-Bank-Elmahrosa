# Provider configuration with version constraint
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Application data storage bucket
resource "google_storage_bucket" "app_data" {
  name                        = "${var.project_id}-app-data-${var.environment}"
  location                    = "US"
  storage_class              = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = "projects/${var.project_id}/locations/global/keyRings/fpbe-keyring/cryptoKeys/app-data-key"
  }

  lifecycle_rule {
    condition {
      age                = 90
      num_newer_versions = 3
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    environment         = var.environment
    managed-by         = "terraform"
    purpose            = "app-data"
    data-classification = "sensitive"
  }
}

# Backup storage bucket with regional redundancy
resource "google_storage_bucket" "backups" {
  name                        = "${var.project_id}-backups-${var.environment}"
  location                    = "US-CENTRAL1"
  storage_class              = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = "projects/${var.project_id}/locations/global/keyRings/fpbe-keyring/cryptoKeys/backup-key"
  }

  lifecycle_rule {
    condition {
      age        = 30
      with_state = "ARCHIVED"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  labels = {
    environment         = var.environment
    managed-by         = "terraform"
    purpose            = "backups"
    data-classification = "critical"
  }
}

# Application logs storage bucket
resource "google_storage_bucket" "logs" {
  name                        = "${var.project_id}-logs-${var.environment}"
  location                    = "US"
  storage_class              = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = "projects/${var.project_id}/locations/global/keyRings/fpbe-keyring/cryptoKeys/logs-key"
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    environment         = var.environment
    managed-by         = "terraform"
    purpose            = "logs"
    data-classification = "internal"
  }
}

# CI/CD artifacts storage bucket
resource "google_storage_bucket" "artifacts" {
  name                        = "${var.project_id}-artifacts-${var.environment}"
  location                    = "US"
  storage_class              = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = "projects/${var.project_id}/locations/global/keyRings/fpbe-keyring/cryptoKeys/artifacts-key"
  }

  labels = {
    environment         = var.environment
    managed-by         = "terraform"
    purpose            = "artifacts"
    data-classification = "internal"
  }
}

# Output definitions for bucket references
output "app_data_bucket" {
  value = {
    name = google_storage_bucket.app_data.name
    url  = google_storage_bucket.app_data.url
  }
  description = "Application data storage bucket details"
}

output "backups_bucket" {
  value = {
    name = google_storage_bucket.backups.name
    url  = google_storage_bucket.backups.url
  }
  description = "Backup storage bucket details"
}

output "logs_bucket" {
  value = {
    name = google_storage_bucket.logs.name
    url  = google_storage_bucket.logs.url
  }
  description = "Log storage bucket details"
}

output "artifacts_bucket" {
  value = {
    name = google_storage_bucket.artifacts.name
    url  = google_storage_bucket.artifacts.url
  }
  description = "Artifacts storage bucket details"
}