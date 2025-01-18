# GKE cluster outputs for multi-cloud orchestration and monitoring
output "gke_cluster_name" {
  description = "Name of the GKE cluster for multi-cloud orchestration and monitoring"
  value       = google_container_cluster.primary.name
  sensitive   = false
}

output "gke_cluster_endpoint" {
  description = "Endpoint for GKE cluster access and health monitoring"
  value       = google_container_cluster.primary.endpoint
  sensitive   = false
}

output "gke_cluster_ca_certificate" {
  description = "Public certificate authority of the GKE cluster for secure communication"
  value       = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
  sensitive   = true
}

# Cloud SQL outputs for database connectivity and disaster recovery
output "cloud_sql_instance_name" {
  description = "Name of the Cloud SQL instance for database management and monitoring"
  value       = google_sql_database_instance.fpbe-db-primary.name
  sensitive   = false
}

output "cloud_sql_connection_name" {
  description = "Connection name for Cloud SQL instance private connectivity"
  value       = google_sql_database_instance.fpbe-db-primary.connection_name
  sensitive   = false
}