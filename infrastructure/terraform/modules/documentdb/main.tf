# AWS Provider version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Import VPC module for network configuration
module "vpc" {
  source = "../vpc"
}

# Input Variables
variable "cluster_identifier" {
  type        = string
  description = "Unique identifier for the DocumentDB cluster"
  default     = "fpbe-docdb"
}

variable "engine_version" {
  type        = string
  description = "DocumentDB engine version for MongoDB compatibility"
  default     = "6.0"
}

variable "instance_count" {
  type        = number
  description = "Number of cluster instances for high availability"
  default     = 3

  validation {
    condition     = var.instance_count >= 3
    error_message = "At least 3 instances are required for high availability."
  }
}

variable "instance_class" {
  type        = string
  description = "Instance class for DocumentDB nodes"
  default     = "db.r6g.xlarge"
}

variable "kms_key_id" {
  type        = string
  description = "KMS key ID for encryption at rest"
  sensitive   = true
}

variable "master_username" {
  type        = string
  description = "Master username for DocumentDB authentication"
  sensitive   = true
}

variable "master_password" {
  type        = string
  description = "Master password for DocumentDB authentication"
  sensitive   = true
}

variable "backup_retention_period" {
  type        = number
  description = "Backup retention period in days for disaster recovery"
  default     = 15

  validation {
    condition     = var.backup_retention_period >= 15
    error_message = "Backup retention period must be at least 15 days for compliance."
  }
}

variable "preferred_backup_window" {
  type        = string
  description = "Preferred backup window for minimal impact"
  default     = "02:00-04:00"
}

variable "environment" {
  type        = string
  description = "Environment name for resource tagging and isolation"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

# IAM role for DocumentDB monitoring
resource "aws_iam_role" "docdb_monitoring" {
  name = "${var.cluster_identifier}-monitoring-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.cluster_identifier}-monitoring-role-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Parameter group for DocumentDB cluster
resource "aws_docdb_cluster_parameter_group" "fpbe" {
  family = "docdb6.0"
  name   = "${var.cluster_identifier}-params-${var.environment}"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  parameter {
    name  = "ttl_monitor"
    value = "enabled"
  }

  tags = {
    Name        = "${var.cluster_identifier}-params-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Subnet group for DocumentDB cluster
resource "aws_docdb_subnet_group" "fpbe" {
  name       = "${var.cluster_identifier}-subnet-group-${var.environment}"
  subnet_ids = module.vpc.private_subnet_ids

  tags = {
    Name        = "${var.cluster_identifier}-subnet-group-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security group for DocumentDB cluster
resource "aws_security_group" "docdb" {
  name        = "${var.cluster_identifier}-sg-${var.environment}"
  description = "Security group for DocumentDB cluster"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = {
    Name        = "${var.cluster_identifier}-sg-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# DocumentDB cluster
resource "aws_docdb_cluster" "fpbe" {
  cluster_identifier              = "${var.cluster_identifier}-${var.environment}"
  engine                         = "docdb"
  engine_version                 = var.engine_version
  master_username                = var.master_username
  master_password                = var.master_password
  backup_retention_period        = var.backup_retention_period
  preferred_backup_window        = var.preferred_backup_window
  skip_final_snapshot           = false
  final_snapshot_identifier     = "${var.cluster_identifier}-final-snapshot-${var.environment}"
  deletion_protection           = true
  storage_encrypted             = true
  kms_key_id                    = var.kms_key_id
  db_subnet_group_name          = aws_docdb_subnet_group.fpbe.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.fpbe.name
  vpc_security_group_ids        = [aws_security_group.docdb.id]
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = {
    Name        = "${var.cluster_identifier}-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# DocumentDB cluster instances
resource "aws_docdb_cluster_instance" "fpbe" {
  count              = var.instance_count
  identifier         = "${var.cluster_identifier}-${var.environment}-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.fpbe.id
  instance_class     = var.instance_class

  auto_minor_version_upgrade = true
  monitoring_interval       = 30
  monitoring_role_arn      = aws_iam_role.docdb_monitoring.arn

  tags = {
    Name        = "${var.cluster_identifier}-${var.environment}-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Outputs
output "cluster_endpoint" {
  description = "Primary cluster endpoint for write operations"
  value       = aws_docdb_cluster.fpbe.endpoint
}

output "reader_endpoint" {
  description = "Read-only endpoint for scalable read operations"
  value       = aws_docdb_cluster.fpbe.reader_endpoint
}

output "cluster_resource_id" {
  description = "Cluster resource ID for IAM and monitoring integration"
  value       = aws_docdb_cluster.fpbe.cluster_resource_id
}