# AWS IAM Configuration for FPBE Mobile Banking Application
# Version: 1.0.0
# Provider version: ~> 4.0

terraform {
  required_version = ">=1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# KMS key for IAM encryption
resource "aws_kms_key" "iam_encryption" {
  description             = "KMS key for IAM role encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region           = true

  tags = {
    Name           = "${var.project_name}-${var.environment}-iam-key"
    Environment    = var.environment
    SecurityLevel  = "Critical"
    ComplianceScope = "PCI-DSS"
  }
}

# EKS Cluster Role
resource "aws_iam_role" "eks_cluster_role" {
  name = "${var.project_name}-${var.environment}-eks-cluster-role"
  path = "/system/"
  max_session_duration = 3600
  force_detach_policies = true

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "aws:SourceAccount": data.aws_caller_identity.current.account_id
          }
          Bool = {
            "aws:SecureTransport": "true"
          }
        }
      }
    ]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  ]

  tags = {
    Environment     = var.environment
    SecurityLevel   = "Critical"
    ComplianceScope = "PCI-DSS"
    ManagedBy       = "Terraform"
  }
}

# S3 Access Policy with Enhanced Security
resource "aws_iam_policy" "s3_access_policy" {
  name        = "${var.project_name}-${var.environment}-s3-access-policy"
  description = "S3 access policy with encryption and MFA requirements"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EncryptedTransferRequired"
        Effect = "Deny"
        Action = "s3:*"
        Resource = [
          "arn:aws:s3:::${var.project_name}-*",
          "arn:aws:s3:::${var.project_name}-*/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport": "false"
          }
        }
      },
      {
        Sid    = "MFARequired"
        Effect = "Deny"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-*",
          "arn:aws:s3:::${var.project_name}-*/*"
        ]
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent": "false"
          }
        }
      }
    ]
  })

  tags = {
    Environment     = var.environment
    SecurityLevel   = "High"
    ComplianceScope = "GDPR"
  }
}

# Database Access Role
resource "aws_iam_role" "rds_access_role" {
  name = "${var.project_name}-${var.environment}-rds-access-role"
  path = "/database/"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Condition = {
          StringEquals = {
            "aws:SourceVpc": data.aws_vpc.selected.id
          }
        }
      }
    ]
  })

  tags = {
    Environment     = var.environment
    SecurityLevel   = "Critical"
    ComplianceScope = "PCI-DSS"
  }
}

# CloudWatch Logging Role
resource "aws_iam_role" "cloudwatch_role" {
  name = "${var.project_name}-${var.environment}-cloudwatch-role"
  path = "/logging/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
      }
    ]
  })

  inline_policy {
    name = "cloudwatch-logging-policy"
    policy = jsonencode({
      Version = "2012-10-17"
      Statement = [
        {
          Effect = "Allow"
          Action = [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
            "logs:DescribeLogStreams"
          ]
          Resource = "arn:aws:logs:*:*:*"
        }
      ]
    })
  }

  tags = {
    Environment     = var.environment
    SecurityLevel   = "High"
    ComplianceScope = "SOC2"
  }
}

# Data Sources
data "aws_caller_identity" "current" {}

data "aws_vpc" "selected" {
  tags = {
    Name = "${var.project_name}-vpc-${var.environment}"
  }
}

# Outputs
output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster_role.arn
}

output "rds_access_role_arn" {
  description = "ARN of the RDS access IAM role"
  value       = aws_iam_role.rds_access_role.arn
}

output "cloudwatch_role_arn" {
  description = "ARN of the CloudWatch logging IAM role"
  value       = aws_iam_role.cloudwatch_role.arn
}

output "s3_access_policy_arn" {
  description = "ARN of the S3 access IAM policy"
  value       = aws_iam_policy.s3_access_policy.arn
}