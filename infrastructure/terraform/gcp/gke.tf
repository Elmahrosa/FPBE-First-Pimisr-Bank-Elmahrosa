# Provider configuration for GCP
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta" 
      version = "~> 4.0"
    }
  }
}

# Primary GKE cluster configuration
resource "google_container_cluster" "primary" {
  provider = google-beta
  name     = var.gke_cluster_config.name
  location = "${var.primary_region}-${var.availability_zones[0]}"
  
  # Remove default node pool and create custom one
  remove_default_node_pool = true
  initial_node_count       = 1

  # Network configuration
  network    = var.network_config.network_name
  subnetwork = var.network_config.subnet_name

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Addon configurations
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
    istio_config {
      disabled = false
      auth     = "AUTH_MUTUAL_TLS"
    }
    config_connector_config {
      enabled = true
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }

  # Network configuration
  networking_mode = "VPC_NATIVE"
  ip_allocation_policy {
    cluster_ipv4_cidr_block  = "10.100.0.0/16"
    services_ipv4_cidr_block = "10.101.0.0/16"
  }

  # Security configuration
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = var.network_config.ip_range
      display_name = "VPC"
    }
  }

  # Maintenance window configuration
  maintenance_policy {
    recurring_window {
      start_time = "2022-01-01T00:00:00Z"
      end_time   = "2022-01-01T04:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SA,SU"
    }
  }

  # Enable Binary Authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Release channel configuration
  release_channel {
    channel = "REGULAR"
  }

  # Monitoring configuration
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Logging configuration
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  # Labels
  resource_labels = merge(var.labels, {
    cluster-type = "primary"
  })
}

# Node pool configuration
resource "google_container_node_pool" "primary_nodes" {
  provider = google-beta
  name     = "primary-node-pool"
  location = google_container_cluster.primary.location
  cluster  = google_container_cluster.primary.name

  initial_node_count = var.gke_cluster_config.min_nodes

  # Node configuration
  node_config {
    machine_type = var.gke_cluster_config.machine_type
    
    # OAuth scopes
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Labels
    labels = merge(var.labels, {
      environment    = var.environment
      managed-by    = "terraform"
      workload-type = "general"
    })

    # Metadata configuration
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Security configuration
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    # Network tags
    tags = ["gke-node", "private-cluster"]
  }

  # Management configuration
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  # Autoscaling configuration
  autoscaling {
    min_node_count  = var.gke_cluster_config.min_nodes
    max_node_count  = var.gke_cluster_config.max_nodes
    location_policy = "BALANCED"
  }

  # Upgrade settings
  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }
}

# Outputs for cluster information
output "cluster_name" {
  value       = google_container_cluster.primary.name
  description = "The name of the GKE cluster"
}

output "cluster_endpoint" {
  value       = google_container_cluster.primary.endpoint
  description = "The IP address of the cluster master"
  sensitive   = true
}

output "cluster_ca_certificate" {
  value       = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
  description = "The public certificate authority of the cluster"
  sensitive   = true
}