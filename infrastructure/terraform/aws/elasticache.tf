# AWS Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Local variables for Redis configuration
locals {
  redis_port          = "6379"
  maintenance_window  = "sun:05:00-sun:09:00"
  snapshot_window    = "03:00-05:00"
  snapshot_retention = "7"
}

# ElastiCache Redis module configuration
module "elasticache" {
  source = "../modules/elasticache"

  # Basic configuration
  name_prefix = "fpbe"
  environment = var.environment

  # Network configuration
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.eks.worker_security_group_id]

  # Redis cluster configuration
  node_type                    = "cache.r6g.xlarge"
  replica_count               = 2
  auth_token                  = var.redis_auth_token
  transit_encryption_enabled  = true
  at_rest_encryption_enabled  = true
  multi_az_enabled           = true
  automatic_failover_enabled = true

  # Maintenance and backup windows
  maintenance_window       = local.maintenance_window
  snapshot_window         = local.snapshot_window
  snapshot_retention_limit = local.snapshot_retention

  # Parameter group configuration
  parameter_group_family = "redis6.x"
  parameter_group_parameters = [
    {
      name  = "maxmemory-policy"
      value = "volatile-lru"
    },
    {
      name  = "timeout"
      value = "300"
    },
    {
      name  = "tcp-keepalive"
      value = "300"
    }
  ]

  # CloudWatch alarms configuration
  cloudwatch_metric_alarms = {
    cpu_threshold         = 75
    memory_threshold      = 80
    connections_threshold = 1000
  }

  # Resource tagging
  tags = {
    Application = "FPBE"
    Environment = var.environment
    Terraform   = "true"
  }
}

# Variables
variable "redis_auth_token" {
  type        = string
  description = "Authentication token for Redis access"
  sensitive   = true
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint for application connection"
  value       = module.elasticache.redis_endpoint
  sensitive   = true
}

output "redis_security_group_id" {
  description = "Security group ID for Redis access control"
  value       = module.elasticache.redis_security_group_id
}

output "redis_parameter_group_name" {
  description = "Name of the Redis parameter group"
  value       = module.elasticache.parameter_group_name
}