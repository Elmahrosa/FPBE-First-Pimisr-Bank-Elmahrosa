# Provider configuration
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Local variables for configuration
locals {
  database_instance_name = "${var.environment}-fpbe-postgresql"
  database_version      = "POSTGRES_15"
  backup_retention_days = 7
  maintenance_day      = 7  # Sunday
  maintenance_hour     = 3  # 3 AM
}

# Generate secure random password for database user
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_special      = 2
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
}

# Primary PostgreSQL instance configuration
resource "google_sql_database_instance" "main" {
  name                = local.database_instance_name
  database_version    = local.database_version
  region             = var.primary_region
  deletion_protection = true

  settings {
    tier              = var.cloud_sql_config.tier
    availability_type = var.cloud_sql_config.availability_type

    backup_configuration {
      enabled                        = true
      start_time                    = "02:00"  # 2 AM UTC
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = local.backup_retention_days
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc_network.id
      require_ssl     = true
      ssl_mode        = "VERIFY_X509"
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }

    database_flags {
      name  = "shared_buffers"
      value = "256MB"
    }

    database_flags {
      name  = "work_mem"
      value = "4MB"
    }

    database_flags {
      name  = "ssl"
      value = "on"
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }

    database_flags {
      name  = "log_temp_files"
      value = "0"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }

    maintenance_window {
      day          = local.maintenance_day
      hour         = local.maintenance_hour
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length    = 1024
      record_application_tags = true
      record_client_address  = true
    }

    # Add labels for resource management
    user_labels = merge(var.labels, {
      component = "database"
    })
  }

  # Depends on VPC network for private connectivity
  depends_on = [
    google_compute_network.vpc_network,
    google_compute_global_address.private_ip_address
  ]
}

# Create main application database
resource "google_sql_database" "fpbe_banking" {
  name      = "fpbe_banking"
  instance  = google_sql_database_instance.main.name
  charset   = "UTF8"
  collation = "en_US.UTF8"
}

# Create database user with secure password
resource "google_sql_user" "fpbe_admin" {
  name     = "fpbe_admin"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
  type     = "BUILT_IN"
}

# Output values for application configuration
output "database_connection_name" {
  value       = google_sql_database_instance.main.connection_name
  description = "The connection name of the database instance"
  sensitive   = false
}

output "database_private_ip" {
  value       = google_sql_database_instance.main.private_ip_address
  description = "The private IP address of the database instance"
  sensitive   = false
}

output "database_ca_cert" {
  value       = google_sql_database_instance.main.server_ca_cert
  description = "The CA certificate information used to connect to the SQL instance via SSL"
  sensitive   = true
}