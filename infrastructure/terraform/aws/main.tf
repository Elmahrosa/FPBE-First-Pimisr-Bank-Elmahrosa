# FPBE Mobile Banking Application - Main Terraform Configuration
# Version: 1.0.0
# Required Terraform version: >=1.0.0

terraform {
  required_version = ">=1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws" # version: ~> 4.0
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes" # version: ~> 2.0
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm" # version: ~> 2.0
      version = "~> 2.0"
    }
  }

  backend "s3" {
    bucket         = "fpbe-terraform-state"
    key            = "aws/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "fpbe-terraform-locks"
    kms_key_id     = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
  }
}

# Provider Configuration for Primary Region
provider "aws" {
  region = var.aws_primary_region
  alias  = "primary"

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "FPBE"
      ManagedBy   = "Terraform"
    }
  }
}

# Provider Configuration for Secondary Region (DR)
provider "aws" {
  region = var.aws_secondary_region
  alias  = "secondary"

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "FPBE"
      ManagedBy   = "Terraform"
    }
  }
}

# Data Sources for Availability Zones
data "aws_availability_zones" "primary" {
  provider = aws.primary
  state    = "available"
}

data "aws_availability_zones" "secondary" {
  provider = aws.secondary
  state    = "available"
}

# Primary Region VPC
module "vpc_primary" {
  source = "../modules/vpc"
  providers = {
    aws = aws.primary
  }

  vpc_cidr            = var.vpc_cidr_primary
  environment         = var.environment
  availability_zones  = data.aws_availability_zones.primary.names
  enable_flow_logs    = true
  enable_vpc_endpoints = true

  tags = {
    Region = var.aws_primary_region
  }
}

# Secondary Region VPC (DR)
module "vpc_secondary" {
  source = "../modules/vpc"
  providers = {
    aws = aws.secondary
  }

  vpc_cidr            = var.vpc_cidr_secondary
  environment         = var.environment
  availability_zones  = data.aws_availability_zones.secondary.names
  enable_flow_logs    = true
  enable_vpc_endpoints = true

  tags = {
    Region = var.aws_secondary_region
  }
}

# Primary Region EKS Cluster
module "eks_primary" {
  source = "../modules/eks"
  providers = {
    aws = aws.primary
  }

  cluster_name           = "fpbe-eks-${var.environment}-primary"
  vpc_id                = module.vpc_primary.vpc_id
  subnet_ids            = module.vpc_primary.private_subnet_ids
  enable_irsa           = true
  enable_cluster_encryption = true
  node_groups_config    = var.node_groups_config

  tags = {
    Region = var.aws_primary_region
  }
}

# Primary Region RDS
module "rds_primary" {
  source = "../modules/rds"
  providers = {
    aws = aws.primary
  }

  identifier              = "fpbe-rds-${var.environment}-primary"
  instance_class         = "db.r6g.xlarge"
  multi_az               = true
  backup_retention_period = 30
  enable_performance_insights = true
  enable_cross_region_replica = true
  vpc_security_group_ids = [module.vpc_primary.database_security_group_id]
  subnet_ids             = module.vpc_primary.private_subnet_ids

  tags = {
    Region = var.aws_primary_region
  }
}

# WAF Configuration
resource "aws_wafv2_web_acl" "main" {
  provider    = aws.primary
  name        = "fpbe-waf-${var.environment}"
  description = "WAF rules for FPBE application"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "FPBEWAFMetrics"
    sampled_requests_enabled  = true
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "application" {
  provider          = aws.primary
  name              = "/aws/fpbe/${var.environment}/application"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Application = "FPBE"
  }
}

# Outputs
output "vpc_primary" {
  description = "Primary VPC outputs"
  value = {
    vpc_id           = module.vpc_primary.vpc_id
    private_subnets  = module.vpc_primary.private_subnet_ids
    public_subnets   = module.vpc_primary.public_subnet_ids
  }
}

output "eks_primary" {
  description = "Primary EKS cluster outputs"
  value = {
    cluster_endpoint = module.eks_primary.cluster_endpoint
    cluster_name     = module.eks_primary.cluster_name
    cluster_sg_id    = module.eks_primary.cluster_security_group_id
  }
}

output "rds_primary" {
  description = "Primary RDS instance outputs"
  value = {
    endpoint = module.rds_primary.endpoint
    arn      = module.rds_primary.arn
  }
  sensitive = true
}