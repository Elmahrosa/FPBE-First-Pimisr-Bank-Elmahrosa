# AWS DocumentDB Configuration for FPBE Mobile Banking Application
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

# Local variables for DocumentDB configuration
locals {
  docdb_family           = "docdb6.0"
  docdb_port            = 27017
  backup_retention_days = 15
  backup_window        = "02:00-04:00"
  maintenance_window   = "Mon:04:00-Mon:05:00"
  instance_count       = 3
  instance_class       = "db.r6g.xlarge"
  
  common_tags = {
    Project          = "FPBE"
    Environment      = var.environment
    ManagedBy        = "Terraform"
    ComplianceLevel  = "Financial"
  }
}

# DocumentDB subnet group
resource "aws_docdb_subnet_group" "fpbe" {
  name        = "fpbe-docdb-subnet-group-${var.environment}"
  description = "DocumentDB subnet group for FPBE application"
  subnet_ids  = var.private_subnet_ids

  tags = merge(local.common_tags, {
    Name = "fpbe-docdb-subnet-group-${var.environment}"
  })
}

# Security group for DocumentDB
resource "aws_security_group" "docdb" {
  name        = "fpbe-docdb-sg-${var.environment}"
  description = "Security group for FPBE DocumentDB cluster"
  vpc_id      = var.vpc_id

  ingress {
    description = "DocumentDB access from within VPC"
    from_port   = local.docdb_port
    to_port     = local.docdb_port
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
  }

  tags = merge(local.common_tags, {
    Name = "fpbe-docdb-sg-${var.environment}"
  })
}

# DocumentDB cluster parameter group
resource "aws_docdb_cluster_parameter_group" "fpbe" {
  family      = local.docdb_family
  name        = "fpbe-docdb-params-${var.environment}"
  description = "DocumentDB cluster parameter group for FPBE application"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  parameter {
    name  = "profiler"
    value = "enabled"
  }

  tags = local.common_tags
}

# DocumentDB cluster
resource "aws_docdb_cluster" "fpbe" {
  cluster_identifier              = "fpbe-docdb-cluster-${var.environment}"
  engine                         = "docdb"
  engine_version                 = "6.0"
  master_username                = var.docdb_master_username
  master_password                = var.docdb_master_password
  backup_retention_period        = local.backup_retention_days
  preferred_backup_window        = local.backup_window
  preferred_maintenance_window   = local.maintenance_window
  skip_final_snapshot           = false
  final_snapshot_identifier     = "fpbe-docdb-final-${formatdate("YYYY-MM-DD-hh-mm", timestamp())}"
  storage_encrypted             = true
  kms_key_id                    = aws_kms_key.docdb.arn
  vpc_security_group_ids        = [aws_security_group.docdb.id]
  db_subnet_group_name          = aws_docdb_subnet_group.fpbe.name
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.fpbe.name
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]
  deletion_protection           = true
  apply_immediately            = false

  tags = merge(local.common_tags, {
    Name = "fpbe-docdb-cluster-${var.environment}"
  })
}

# DocumentDB cluster instances
resource "aws_docdb_cluster_instance" "fpbe" {
  count                   = local.instance_count
  identifier             = "fpbe-docdb-${var.environment}-${count.index + 1}"
  cluster_identifier     = aws_docdb_cluster.fpbe.id
  instance_class         = local.instance_class
  promotion_tier         = count.index

  auto_minor_version_upgrade = true
  preferred_maintenance_window = local.maintenance_window

  tags = merge(local.common_tags, {
    Name = "fpbe-docdb-instance-${var.environment}-${count.index + 1}"
  })
}

# CloudWatch alarms for DocumentDB monitoring
resource "aws_cloudwatch_metric_alarm" "docdb_cpu" {
  alarm_name          = "fpbe-docdb-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/DocDB"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_description  = "This metric monitors DocumentDB CPU utilization"
  alarm_actions      = [var.sns_topic_arn]

  dimensions = {
    DBClusterIdentifier = aws_docdb_cluster.fpbe.cluster_identifier
  }

  tags = local.common_tags
}

# Outputs
output "docdb_cluster_endpoint" {
  description = "The cluster endpoint"
  value       = aws_docdb_cluster.fpbe.endpoint
}

output "docdb_cluster_reader_endpoint" {
  description = "The cluster reader endpoint"
  value       = aws_docdb_cluster.fpbe.reader_endpoint
}

output "docdb_cluster_port" {
  description = "The cluster port"
  value       = local.docdb_port
}

output "docdb_cluster_instances" {
  description = "List of cluster instance identifiers"
  value       = aws_docdb_cluster_instance.fpbe[*].identifier
}

data "aws_vpc" "selected" {
  id = var.vpc_id
}