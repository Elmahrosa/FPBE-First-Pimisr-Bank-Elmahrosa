# Provider configuration for GCP
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Local variables for resource labeling
locals {
  redis_labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "fpbe"
    service     = "redis"
  }
}

# Redis instance for caching and session management
resource "google_redis_instance" "main" {
  # Instance name with environment suffix for identification
  name               = "fpbe-redis-${var.environment}"
  memory_size_gb     = 5
  tier               = "STANDARD_HA"
  region             = var.region
  project            = var.project_id
  authorized_network = var.network_name
  redis_version      = "REDIS_6_X"
  display_name       = "FPBE Redis Cache"
  
  # Private service access for enhanced security
  connect_mode = "PRIVATE_SERVICE_ACCESS"
  
  # Enable authentication for secure access
  auth_enabled = true
  
  # Enable transit encryption for data in transit
  transit_encryption_mode = "SERVER_AUTHENTICATION"
  
  # Maintenance window configuration for updates
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
      }
    }
  }
  
  # Redis configuration parameters for optimal performance
  redis_configs = {
    "maxmemory-policy"            = "allkeys-lru"
    "notify-keyspace-events"      = "Ex"
    "timeout"                     = "300"
    "maxmemory-samples"          = "5"
    "activedefrag"               = "yes"
    "maxfragmentationpct"        = "50"
    "maxmemory-delta"            = "512mb"
    "active-defrag-threshold-lower" = "10"
    "active-defrag-threshold-upper" = "100"
    "active-defrag-cycle-min"    = "25"
    "active-defrag-cycle-max"    = "75"
    "activerehashing"            = "yes"
  }

  # Resource labels for management and monitoring
  labels = local.redis_labels

  # Lifecycle policy to prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

# Outputs for Redis instance connection details
output "redis_instance_id" {
  description = "The ID of the Redis instance"
  value       = google_redis_instance.main.instance_id
}

output "redis_host" {
  description = "The IP address of the Redis instance"
  value       = google_redis_instance.main.host
}

output "redis_port" {
  description = "The port number of the Redis instance"
  value       = google_redis_instance.main.port
}

output "redis_auth_string" {
  description = "The authentication string for Redis instance"
  value       = google_redis_instance.main.auth_string
  sensitive   = true
}