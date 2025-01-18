# AWS EKS Configuration for FPBE Mobile Banking Application
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

# KMS key for EKS cluster encryption
resource "aws_kms_key" "eks" {
  description             = "EKS cluster encryption key for FPBE banking application"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region           = true

  tags = {
    Name           = "fpbe-eks-key"
    Environment    = var.environment
    ManagedBy      = "terraform"
    SecurityLevel  = "critical"
  }
}

# IAM role for EKS cluster
resource "aws_iam_role" "cluster_role" {
  name = "fpbe-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
      Condition = {
        StringEquals = {
          "aws:SourceAccount": data.aws_caller_identity.current.account_id
        }
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  ]

  inline_policy {
    name = "eks-cluster-custom-policy"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect = "Allow"
          Action = [
            "cloudwatch:PutMetricData",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
            "logs:CreateLogGroup"
          ]
          Resource = "*"
        }
      ]
    })
  }
}

# IAM role for EKS node groups
resource "aws_iam_role" "node_role" {
  name = "fpbe-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ]

  inline_policy {
    name = "eks-node-custom-policy"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect = "Allow"
          Action = [
            "cloudwatch:PutMetricData",
            "ec2:DescribeVolumes"
          ]
          Resource = "*"
        }
      ]
    })
  }
}

# EKS cluster configuration
module "eks" {
  source = "../modules/eks"

  cluster_name         = var.cluster_name
  kubernetes_version   = var.eks_version
  environment         = var.environment
  vpc_id              = vpc.vpc_id
  private_subnet_ids  = vpc.private_subnet_ids
  security_group_ids  = vpc.security_group_ids
  node_groups         = var.eks_node_groups

  cluster_encryption_config = {
    provider = {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets", "configmaps", "logs"]
  }

  cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  endpoint_private_access = true
  endpoint_public_access  = true
  public_access_cidrs    = var.allowed_cidr_blocks

  monitoring_config = var.monitoring_config

  addon_config = {
    vpc_cni = {
      enabled = true
      version = "latest"
    }
    coredns = {
      enabled = true
      version = "latest"
    }
    kube_proxy = {
      enabled = true
      version = "latest"
    }
  }

  tags = {
    Environment    = var.environment
    ManagedBy     = "terraform"
    SecurityLevel = "critical"
    Compliance    = "pci-dss"
  }
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint URL for service connectivity"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name for reference in other resources"
  value       = module.eks.cluster_name
}

output "cluster_security_group_id" {
  description = "Security group ID for cluster network access control"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN for cluster permissions management"
  value       = module.eks.cluster_iam_role_arn
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}