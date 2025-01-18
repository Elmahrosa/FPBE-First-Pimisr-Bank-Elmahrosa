# AWS S3 Terraform configuration for FPBE mobile banking application
# Version: 1.0.0
# Provider version: ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Data source for KMS key
data "aws_kms_key" "s3_key" {
  key_id = data.terraform_remote_state.kms.outputs.s3_kms_key_arn
}

# Terraform state bucket
resource "aws_s3_bucket" "terraform_state" {
  bucket = "fpbe-terraform-state-${var.environment}"
  
  tags = merge(var.tags, {
    Name = "fpbe-terraform-state-${var.environment}"
    Purpose = "Terraform State Storage"
  })
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = data.aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "cleanup"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Application assets bucket
resource "aws_s3_bucket" "application_assets" {
  bucket = "fpbe-assets-${var.environment}"
  
  tags = merge(var.tags, {
    Name = "fpbe-assets-${var.environment}"
    Purpose = "Application Static Assets"
  })
}

resource "aws_s3_bucket_versioning" "application_assets" {
  bucket = aws_s3_bucket.application_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "application_assets" {
  bucket = aws_s3_bucket.application_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*.fpbe.com"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "application_assets" {
  bucket = aws_s3_bucket.application_assets.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = data.aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

# Backup storage bucket
resource "aws_s3_bucket" "backup_storage" {
  bucket = "fpbe-backups-${var.environment}"
  
  tags = merge(var.tags, {
    Name = "fpbe-backups-${var.environment}"
    Purpose = "Application Backups"
  })
}

resource "aws_s3_bucket_versioning" "backup_storage" {
  bucket = aws_s3_bucket.backup_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup_storage" {
  bucket = aws_s3_bucket.backup_storage.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = data.aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup_storage" {
  bucket = aws_s3_bucket.backup_storage.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "GLACIER"
    }
  }
}

# Replica bucket for backups in secondary region
resource "aws_s3_bucket" "backup_replica" {
  provider = aws.secondary_region
  bucket   = "fpbe-backups-replica-${var.environment}"
  
  tags = merge(var.tags, {
    Name = "fpbe-backups-replica-${var.environment}"
    Purpose = "Backup Replication"
  })
}

resource "aws_s3_bucket_versioning" "backup_replica" {
  provider = aws.secondary_region
  bucket   = aws_s3_bucket.backup_replica.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Access logs bucket
resource "aws_s3_bucket" "access_logs" {
  bucket = "fpbe-logs-${var.environment}"
  
  tags = merge(var.tags, {
    Name = "fpbe-logs-${var.environment}"
    Purpose = "Access Logging"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = data.aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    id     = "log-retention"
    status = "Enabled"

    expiration {
      days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_object_lock_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 90
    }
  }
}

# Outputs
output "terraform_state_bucket" {
  value = {
    bucket_id  = aws_s3_bucket.terraform_state.id
    bucket_arn = aws_s3_bucket.terraform_state.arn
  }
  description = "Terraform state bucket details"
}

output "assets_bucket" {
  value = {
    bucket_id    = aws_s3_bucket.application_assets.id
    bucket_arn   = aws_s3_bucket.application_assets.arn
    domain_name  = aws_s3_bucket.application_assets.bucket_regional_domain_name
  }
  description = "Application assets bucket details"
}

output "backup_bucket" {
  value = {
    bucket_id  = aws_s3_bucket.backup_storage.id
    bucket_arn = aws_s3_bucket.backup_storage.arn
  }
  description = "Backup storage bucket details"
}