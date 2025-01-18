# Provider configuration for Google Cloud with required version constraint
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Local variables for common labels and configurations
locals {
  kms_common_labels = {
    environment        = var.environment
    managed_by        = "terraform"
    application       = "fpbe"
    compliance_level  = "fips-140-2-l3"
    security_tier     = "critical"
  }
}

# KMS Keyring resource for organizing encryption keys
resource "google_kms_key_ring" "fpbe_keyring" {
  name     = "fpbe-keyring-${var.environment}"
  location = var.region
  project  = var.project_id
}

# Crypto key for user data encryption (credentials, PII)
resource "google_kms_crypto_key" "user_data" {
  name            = "user-data-key"
  key_ring        = google_kms_key_ring.fpbe_keyring.id
  rotation_period = "7776000s" # 90 days rotation

  purpose = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }

  labels = merge(local.kms_common_labels, {
    purpose             = "user-data-encryption"
    data_classification = "critical"
    compliance          = "fips-140-2"
  })

  lifecycle {
    prevent_destroy = true
  }
}

# Crypto key for financial transaction data encryption
resource "google_kms_crypto_key" "transaction_data" {
  name            = "transaction-key"
  key_ring        = google_kms_key_ring.fpbe_keyring.id
  rotation_period = "7776000s" # 90 days rotation

  purpose = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }

  labels = merge(local.kms_common_labels, {
    purpose             = "transaction-encryption"
    data_classification = "critical"
    compliance          = "fips-140-2"
  })

  lifecycle {
    prevent_destroy = true
  }
}

# Crypto key for Pi Network wallet data encryption
resource "google_kms_crypto_key" "pi_wallet" {
  name            = "pi-wallet-key"
  key_ring        = google_kms_key_ring.fpbe_keyring.id
  rotation_period = "7776000s" # 90 days rotation

  purpose = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }

  labels = merge(local.kms_common_labels, {
    purpose             = "pi-wallet-encryption"
    data_classification = "critical"
    compliance          = "fips-140-2"
  })

  lifecycle {
    prevent_destroy = true
  }
}

# IAM policy for key usage auditing
resource "google_kms_crypto_key_iam_audit_config" "key_audit_config" {
  for_each = {
    user_data      = google_kms_crypto_key.user_data.id
    transaction    = google_kms_crypto_key.transaction_data.id
    pi_wallet      = google_kms_crypto_key.pi_wallet.id
  }

  crypto_key_id = each.value
  service       = "cloudkms.googleapis.com"

  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Outputs for key references
output "kms_keyring" {
  value = {
    id   = google_kms_key_ring.fpbe_keyring.id
    name = google_kms_key_ring.fpbe_keyring.name
  }
  description = "KMS keyring details for key organization"
}

output "user_data_key" {
  value = {
    id   = google_kms_crypto_key.user_data.id
    name = google_kms_crypto_key.user_data.name
  }
  description = "Encryption key for user credentials and PII"
}

output "transaction_key" {
  value = {
    id   = google_kms_crypto_key.transaction_data.id
    name = google_kms_crypto_key.transaction_data.name
  }
  description = "Encryption key for financial transaction data"
}

output "pi_wallet_key" {
  value = {
    id   = google_kms_crypto_key.pi_wallet.id
    name = google_kms_crypto_key.pi_wallet.name
  }
  description = "Encryption key for Pi Network wallet data"
}