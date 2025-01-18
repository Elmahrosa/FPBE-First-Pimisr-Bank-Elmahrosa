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

# Redis subnet group for private subnet deployment
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.name_prefix}-redis-subnet-group-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name         = "${var.name_prefix}-redis-subnet-group-${var.environment}"
    Environment  = var.environment
    ManagedBy    = "terraform"
    Application  = "FPBE-Mobile-Banking"
    CostCenter   = "Infrastructure"
  }
}

# Redis parameter group for performance optimization
resource "aws_elasticache_parameter_group" "redis" {
  family = "redis6.x"
  name   = "${var.name_prefix}-redis-params-${var.environment}"

  # Performance and reliability optimizations
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"  # Evict keys with TTL using LRU
  }

  parameter {
    name  = "timeout"
    value = "300"  # Connection timeout in seconds
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"  # TCP keepalive interval
  }

  tags = {
    Name        = "${var.name_prefix}-redis-params-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Redis replication group with enhanced security and HA
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${var.name_prefix}-redis-${var.environment}"
  description                   = "Redis cluster for FPBE mobile banking application"
  node_type                     = var.node_type
  port                         = 6379
  parameter_group_family       = "redis6.x"
  engine_version               = "6.x"
  automatic_failover_enabled   = true
  multi_az_enabled            = true
  num_cache_clusters          = var.replica_count + 1
  subnet_group_name           = aws_elasticache_subnet_group.redis.name
  security_group_ids          = [aws_security_group.redis.id]
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                 = var.auth_token
  maintenance_window         = "sun:05:00-sun:09:00"
  snapshot_window            = "03:00-05:00"
  snapshot_retention_limit   = 7
  auto_minor_version_upgrade = true
  notification_topic_arn     = var.sns_topic_arn

  tags = {
    Name         = "${var.name_prefix}-redis-${var.environment}"
    Environment  = var.environment
    ManagedBy    = "terraform"
    Application  = "FPBE-Mobile-Banking"
    CostCenter   = "Infrastructure"
  }
}

# Security group with strict access controls
resource "aws_security_group" "redis" {
  name        = "${var.name_prefix}-redis-sg-${var.environment}"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
    description     = "Redis access from application layer"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name         = "${var.name_prefix}-redis-sg-${var.environment}"
    Environment  = var.environment
    ManagedBy    = "terraform"
    Application  = "FPBE-Mobile-Banking"
  }
}

# Output the Redis endpoints and security group ID
output "redis_endpoint" {
  description = "Primary endpoint for Redis cluster connection"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Reader endpoint for Redis read replicas"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_security_group_id" {
  description = "Security group ID for Redis access control"
  value       = aws_security_group.redis.id
}