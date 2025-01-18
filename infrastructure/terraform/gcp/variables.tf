# GCP Project Configuration
variable "project_id" {
  type        = string
  description = "The GCP project ID for FPBE banking infrastructure"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be between 6 and 30 characters, and contain only lowercase letters, numbers, and hyphens."
  }
}

# Regional Configuration for Active-Active Deployment
variable "primary_region" {
  type        = string
  description = "Primary GCP region for active deployment"
  default     = "us-central1"
}

variable "secondary_region" {
  type        = string
  description = "Secondary GCP region for disaster recovery"
  default     = "us-east1"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for multi-zone deployment"
  default     = ["a", "b", "c"]
}

# Environment Configuration
variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# GKE Cluster Configuration
variable "gke_cluster_config" {
  type = object({
    name         = string
    min_nodes    = number
    max_nodes    = number
    machine_type = string
  })
  description = "GKE cluster configuration"
  default = {
    name         = "fpbe-gke-cluster"
    min_nodes    = 3
    max_nodes    = 10
    machine_type = "e2-standard-4"
  }

  validation {
    condition     = var.gke_cluster_config.min_nodes >= 3
    error_message = "Minimum number of nodes must be at least 3 for high availability."
  }

  validation {
    condition     = var.gke_cluster_config.max_nodes >= var.gke_cluster_config.min_nodes
    error_message = "Maximum nodes must be greater than or equal to minimum nodes."
  }
}

# Network Configuration
variable "network_config" {
  type = object({
    network_name = string
    subnet_name  = string
    ip_range     = string
  })
  description = "VPC network configuration"
  default = {
    network_name = "fpbe-network"
    subnet_name  = "fpbe-subnet"
    ip_range     = "10.0.0.0/16"
  }

  validation {
    condition     = can(cidrhost(var.network_config.ip_range, 0))
    error_message = "IP range must be a valid CIDR block."
  }
}

# Backup Configuration for Disaster Recovery
variable "backup_config" {
  type = object({
    retention_days          = number
    backup_interval_minutes = number
  })
  description = "Backup configuration for DR"
  default = {
    retention_days          = 30
    backup_interval_minutes = 15
  }

  validation {
    condition     = var.backup_config.backup_interval_minutes <= 15
    error_message = "Backup interval must be 15 minutes or less to meet RPO requirements."
  }

  validation {
    condition     = var.backup_config.retention_days >= 30
    error_message = "Backup retention must be at least 30 days for compliance requirements."
  }
}

# Additional Service Configuration Variables
variable "cloud_sql_config" {
  type = object({
    tier                = string
    availability_type   = string
    backup_enabled     = bool
    replication_type   = string
  })
  description = "Cloud SQL configuration for database instances"
  default = {
    tier                = "db-custom-4-15360"
    availability_type   = "REGIONAL"
    backup_enabled     = true
    replication_type   = "SYNCHRONOUS"
  }
}

variable "monitoring_config" {
  type = object({
    notification_channels = list(string)
    alert_policies       = map(string)
  })
  description = "Monitoring and alerting configuration"
  default = {
    notification_channels = []
    alert_policies = {
      cpu_utilization    = "threshold: 0.8"
      memory_utilization = "threshold: 0.8"
      error_rate        = "threshold: 0.01"
    }
  }
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to all resources"
  default = {
    application = "fpbe"
    team        = "platform"
    environment = "prod"
  }
}