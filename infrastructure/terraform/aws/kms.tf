# AWS KMS configuration for FPBE mobile banking application
# Version: 1.0.0
# Provider version: ~> 4.0
# FIPS 140-2 Level 3 compliant configuration

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Get current AWS account details for key policies
data "aws_caller_identity" "current" {}

# Common KMS key policy document
data "aws_iam_policy_document" "kms_key_policy" {
  statement {
    sid    = "Enable IAM User Permissions"
    effect = "Allow"
    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
      ]
    }
    actions = [
      "kms:*"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "Allow CloudWatch Logs"
    effect = "Allow"
    principals {
      type = "Service"
      identifiers = [
        "logs.${var.aws_region}.amazonaws.com"
      ]
    }
    actions = [
      "kms:Encrypt*",
      "kms:Decrypt*",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:Describe*"
    ]
    resources = ["*"]
  }
}

# Database encryption key
resource "aws_kms_key" "database_encryption_key" {
  description                        = "FPBE database encryption key for ${var.environment}"
  deletion_window_in_days           = 30
  key_usage                         = "ENCRYPT_DECRYPT"
  customer_master_key_spec          = "SYMMETRIC_DEFAULT"
  enable_key_rotation               = true
  multi_region                      = true
  bypass_policy_lockout_safety_check = false

  policy = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Name        = "fpbe-${var.environment}-db-encryption"
    Environment = var.environment
    Purpose     = "Database Encryption"
    Compliance  = "FIPS-140-2-L3"
    MultiRegion = "true"
  }
}

resource "aws_kms_alias" "database_encryption_key" {
  name          = "alias/fpbe-${var.environment}-db-encryption"
  target_key_id = aws_kms_key.database_encryption_key.key_id
}

# Application secrets encryption key
resource "aws_kms_key" "secrets_encryption_key" {
  description                        = "FPBE application secrets encryption key for ${var.environment}"
  deletion_window_in_days           = 30
  key_usage                         = "ENCRYPT_DECRYPT"
  customer_master_key_spec          = "SYMMETRIC_DEFAULT"
  enable_key_rotation               = true
  multi_region                      = true
  bypass_policy_lockout_safety_check = false

  policy = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Name        = "fpbe-${var.environment}-secrets-encryption"
    Environment = var.environment
    Purpose     = "Secrets Encryption"
    Compliance  = "FIPS-140-2-L3"
    MultiRegion = "true"
  }
}

resource "aws_kms_alias" "secrets_encryption_key" {
  name          = "alias/fpbe-${var.environment}-secrets-encryption"
  target_key_id = aws_kms_key.secrets_encryption_key.key_id
}

# Pi wallet encryption key with enhanced security
resource "aws_kms_key" "pi_wallet_encryption_key" {
  description                        = "FPBE Pi wallet encryption key for ${var.environment}"
  deletion_window_in_days           = 30
  key_usage                         = "ENCRYPT_DECRYPT"
  customer_master_key_spec          = "SYMMETRIC_DEFAULT"
  enable_key_rotation               = true
  multi_region                      = true
  bypass_policy_lockout_safety_check = false

  # Enhanced policy for Pi wallet key
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      jsondecode(data.aws_iam_policy_document.kms_key_policy.json).Statement,
      [{
        Sid    = "RestrictPiWalletKeyUsage"
        Effect = "Deny"
        Principal = {
          AWS = "*"
        }
        Action = [
          "kms:ScheduleKeyDeletion",
          "kms:DisableKey"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:PrincipalArn" = [
              "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/fpbe-${var.environment}-admin"
            ]
          }
        }
      }]
    )
  })

  tags = {
    Name        = "fpbe-${var.environment}-pi-wallet-encryption"
    Environment = var.environment
    Purpose     = "Pi Wallet Encryption"
    Compliance  = "FIPS-140-2-L3"
    MultiRegion = "true"
    Sensitivity = "Critical"
  }
}

resource "aws_kms_alias" "pi_wallet_encryption_key" {
  name          = "alias/fpbe-${var.environment}-pi-wallet-encryption"
  target_key_id = aws_kms_key.pi_wallet_encryption_key.key_id
}

# CloudWatch monitoring for KMS keys
resource "aws_cloudwatch_metric_alarm" "kms_key_usage" {
  for_each = {
    database = aws_kms_key.database_encryption_key.id
    secrets  = aws_kms_key.secrets_encryption_key.id
    pi_wallet = aws_kms_key.pi_wallet_encryption_key.id
  }

  alarm_name          = "fpbe-${var.environment}-${each.key}-key-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "KeyUsage"
  namespace           = "AWS/KMS"
  period             = "300"
  statistic          = "Sum"
  threshold          = "1000"
  alarm_description  = "Monitor KMS key usage for potential security issues"
  alarm_actions      = [] # Add SNS topic ARN for notifications

  dimensions = {
    KeyId = each.value
  }

  tags = {
    Environment = var.environment
    Purpose     = "KMS Monitoring"
  }
}

# Outputs for key ARNs and IDs
output "database_encryption_key_arn" {
  description = "ARN of the database encryption KMS key"
  value       = aws_kms_key.database_encryption_key.arn
}

output "secrets_encryption_key_arn" {
  description = "ARN of the secrets encryption KMS key"
  value       = aws_kms_key.secrets_encryption_key.arn
}

output "pi_wallet_encryption_key_arn" {
  description = "ARN of the Pi wallet encryption KMS key"
  value       = aws_kms_key.pi_wallet_encryption_key.arn
}