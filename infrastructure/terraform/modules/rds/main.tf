# Provider and terraform configuration
# AWS Provider version ~> 4.0
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
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption - FPBE Banking"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name        = "fpbe-rds-${var.environment}-kms"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# RDS subnet group
resource "aws_db_subnet_group" "rds" {
  name        = "fpbe-${var.environment}-subnet-group"
  description = "Subnet group for FPBE RDS instance"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "fpbe-rds-${var.environment}-subnet-group"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name        = "fpbe-${var.environment}-rds-sg"
  description = "Security group for FPBE RDS instance"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  tags = {
    Name        = "fpbe-rds-${var.environment}-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# IAM role for RDS monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "fpbe-${var.environment}-rds-monitoring"

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

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# RDS parameter group
resource "aws_db_parameter_group" "rds" {
  family = "postgres15"
  name   = "fpbe-${var.environment}-pg"

  parameter {
    name  = "max_connections"
    value = "1000"
  }

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/4096}"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  tags = {
    Name        = "fpbe-${var.environment}-pg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# RDS instance
resource "aws_db_instance" "rds" {
  identifier     = var.identifier
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.instance_class

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.rds.arn

  multi_az               = true
  db_name               = "fpbe_${var.environment}"
  username              = var.db_username
  password              = var.db_password
  port                  = 5432
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name  = aws_db_subnet_group.rds.name
  parameter_group_name  = aws_db_parameter_group.rds.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"

  auto_minor_version_upgrade = true
  deletion_protection       = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "fpbe-${var.environment}-final-snapshot"

  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "fpbe-rds-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Outputs
output "db_endpoint" {
  description = "RDS instance endpoint for application connection"
  value       = aws_db_instance.rds.endpoint
}

output "db_port" {
  description = "RDS instance port for application connection"
  value       = aws_db_instance.rds.port
}

output "db_security_group_id" {
  description = "Security group ID for RDS access control"
  value       = aws_security_group.rds.id
}