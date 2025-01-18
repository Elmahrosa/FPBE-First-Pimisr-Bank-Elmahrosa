# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC hosting the FPBE banking infrastructure"
  value       = module.vpc.vpc_id
  sensitive   = false
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for secure workload deployment across availability zones"
  value       = module.vpc.private_subnet_ids
  sensitive   = false
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for load balancer and NAT gateway deployment"
  value       = module.vpc.public_subnet_ids
  sensitive   = false
}

output "database_security_group_id" {
  description = "Security group ID controlling database access with strict ingress/egress rules"
  value       = module.vpc.database_security_group_id
  sensitive   = false
}

# EKS Cluster Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint URL for secure EKS cluster API access"
  value       = module.eks.cluster_endpoint
  sensitive   = false
}

output "eks_cluster_name" {
  description = "Name identifier for the EKS cluster running FPBE banking services"
  value       = module.eks.cluster_name
  sensitive   = false
}

output "eks_cluster_security_group_id" {
  description = "Security group ID managing network access to the EKS cluster"
  value       = module.eks.cluster_security_group_id
  sensitive   = false
}