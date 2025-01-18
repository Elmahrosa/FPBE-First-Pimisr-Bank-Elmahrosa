# RDS Configuration for FPBE Mobile Banking Application
# Version: 1.0.0
# Provider version: ~> 4.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

# KMS key for RDS encryption
resource "aws_kms_key" "rds_encryption" {
  description             = "KMS key for RDS encryption - FPBE Banking"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name        = "fpbe-rds-kms-${var.environment}"
    Environment = var.environment
  }
}

# RDS Parameter Group
resource "aws_db_parameter_group" "postgresql" {
  family = "postgres15"
  name   = "fpbe-pg-${var.environment}"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "ssl"
    value = "1"
  }

  tags = {
    Name        = "fpbe-pg-${var.environment}"
    Environment = var.environment
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "postgresql" {
  name       = "fpbe-subnet-group-${var.environment}"
  subnet_ids = module.vpc.private_subnet_ids

  tags = {
    Name        = "fpbe-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "fpbe-rds-sg-${var.environment}"
  description = "Security group for RDS PostgreSQL instance"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = {
    Name        = "fpbe-rds-sg-${var.environment}"
    Environment = var.environment
  }
}

# RDS Instance
resource "aws_db_instance" "postgresql" {
  identifier     = var.db_identifier
  instance_class = var.db_instance_class
  engine         = "postgres"
  engine_version = "15.3"

  # Storage configuration
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds_encryption.arn

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.postgresql.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az              = true
  publicly_accessible   = false

  # Database configuration
  db_name  = "fpbe_${var.environment}"
  username = "fpbe_admin"
  password = random_password.db_password.result
  port     = 5432

  # Backup and maintenance
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot  = true

  # Monitoring and insights
  monitoring_interval             = var.monitoring_interval
  monitoring_role_arn            = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Security and protection
  deletion_protection      = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.db_identifier}-final-snapshot"
  parameter_group_name    = aws_db_parameter_group.postgresql.name

  tags = {
    Name        = "fpbe-rds-${var.environment}"
    Environment = var.environment
  }
}

# Random password generation for RDS
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "fpbe-rds-monitoring-${var.environment}"

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
}

# Attach policy to RDS monitoring role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgresql.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.postgresql.port
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "rds_resource_id" {
  description = "RDS resource ID"
  value       = aws_db_instance.postgresql.resource_id
}