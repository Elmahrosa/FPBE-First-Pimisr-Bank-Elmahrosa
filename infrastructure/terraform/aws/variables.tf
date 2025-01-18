# Terraform variables configuration file for FPBE mobile banking application
# Version: 1.0.0
# Terraform version required: >=1.0.0

# Region Configuration
variable "aws_region" {
  type        = string
  description = "AWS region for deploying the infrastructure with high availability support"
  default     = "us-east-1"

  validation {
    condition     = contains(["us-east-1", "us-west-2", "eu-west-1"], var.aws_region)
    error_message = "Region must be one of: us-east-1, us-west-2, eu-west-1"
  }
}

# Environment Configuration
variable "environment" {
  type        = string
  description = "Deployment environment with strict validation"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

# VPC Configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC with proper network range validation"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0)) && split("/", var.vpc_cidr)[1] <= 16
    error_message = "VPC CIDR must be valid and have a prefix length <= 16"
  }
}

# Availability Zones Configuration
variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for multi-AZ deployment with minimum count validation"

  validation {
    condition     = length(var.availability_zones) >= 3
    error_message = "At least 3 availability zones are required for high availability."
  }
}

# Subnet Configuration
variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets with proper network segmentation validation"

  validation {
    condition     = length(var.private_subnet_cidrs) >= 3
    error_message = "At least 3 private subnets are required for high availability."
  }
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets with proper network segmentation validation"

  validation {
    condition     = length(var.public_subnet_cidrs) >= 3
    error_message = "At least 3 public subnets are required for high availability."
  }
}

# EKS Configuration
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster with naming convention validation"
  default     = "fpbe-eks-cluster"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.cluster_name))
    error_message = "Cluster name must consist of lowercase alphanumeric characters and hyphens."
  }
}

variable "eks_node_groups" {
  type = map(object({
    instance_types = list(string)
    scaling_config = object({
      desired_size = number
      max_size     = number
      min_size     = number
    })
    labels = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  description = "Configuration for EKS node groups with comprehensive validation"

  validation {
    condition     = alltrue([for ng in var.eks_node_groups : ng.scaling_config.min_size > 0 && ng.scaling_config.max_size >= ng.scaling_config.desired_size])
    error_message = "Node groups must have valid scaling configuration for high availability."
  }
}

# RDS Configuration
variable "db_identifier" {
  type        = string
  description = "Identifier for RDS database instances with naming convention validation"
  default     = "fpbe-rds"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]+$", var.db_identifier))
    error_message = "Database identifier must start with a letter and contain only lowercase alphanumeric characters and hyphens."
  }
}

variable "db_instance_class" {
  type        = string
  description = "Instance class for RDS database instances with allowed types validation"
  default     = "db.r6g.xlarge"

  validation {
    condition     = can(regex("^db\\.[trxz][3-6][a-z]\\.(small|medium|large|xlarge|[248]xlarge)$", var.db_instance_class))
    error_message = "Invalid RDS instance class specified."
  }
}