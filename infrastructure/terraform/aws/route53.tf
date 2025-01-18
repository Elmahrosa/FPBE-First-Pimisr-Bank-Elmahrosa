# AWS Route53 Configuration for FPBE Mobile Banking Application
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

# Local variables for domain configuration
locals {
  domain_name     = "fpbe.com"
  api_subdomain   = "api.${local.domain_name}"
  web_subdomain   = "www.${local.domain_name}"
  dr_region       = "eu-west-1"
}

# Primary Route53 hosted zone with DNSSEC enabled
resource "aws_route53_zone" "main" {
  name    = local.domain_name
  comment = "Secure hosted zone for FPBE mobile banking application"
  
  force_destroy = false

  dnssec_config {
    signing_status     = "SIGNING"
    signing_algorithm  = "ECDSAP256SHA256"
  }

  tags = {
    Name          = "fpbe-zone-${var.environment}"
    Environment   = var.environment
    Project       = "FPBE"
    ManagedBy     = "Terraform"
    SecurityLevel = "Critical"
  }
}

# Web application A record with failover routing
resource "aws_route53_record" "web" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.web_subdomain
  type    = "A"

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.web_primary.id

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id               = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = true
  }
}

# API endpoint A record with latency-based routing
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.api_subdomain
  type    = "A"

  latency_routing_policy {
    region = var.aws_region
  }

  health_check_id = aws_route53_health_check.api_primary.id

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id               = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = true
  }
}

# CAA records for SSL certificate validation
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.domain_name
  type    = "CAA"
  ttl     = 300

  records = [
    "0 issue \"amazon.com\"",
    "0 issuewild \"amazon.com\"",
    "0 iodef \"mailto:security@fpbe.com\""
  ]
}

# Primary health check for API endpoint
resource "aws_route53_health_check" "api_primary" {
  fqdn              = local.api_subdomain
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "2"
  request_interval  = "10"
  measure_latency   = true
  
  regions = [
    "us-west-1",
    "us-east-1",
    "eu-west-1"
  ]

  enable_sni     = true
  search_string  = "\"status\":\"healthy\""

  tags = {
    Name        = "fpbe-api-healthcheck-${var.environment}"
    Environment = var.environment
    Critical    = "true"
  }
}

# Secondary health check for disaster recovery
resource "aws_route53_health_check" "api_dr" {
  fqdn              = local.api_subdomain
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "2"
  request_interval  = "10"
  measure_latency   = true
  
  regions = [
    local.dr_region
  ]

  enable_sni     = true
  search_string  = "\"status\":\"healthy\""

  tags = {
    Name        = "fpbe-api-dr-healthcheck-${var.environment}"
    Environment = var.environment
    Critical    = "true"
  }
}

# Web application primary health check
resource "aws_route53_health_check" "web_primary" {
  fqdn              = local.web_subdomain
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "2"
  request_interval  = "10"
  measure_latency   = true
  
  regions = [
    "us-west-1",
    "us-east-1",
    "eu-west-1"
  ]

  enable_sni = true

  tags = {
    Name        = "fpbe-web-healthcheck-${var.environment}"
    Environment = var.environment
    Critical    = "true"
  }
}

# Output values for reference in other modules
output "route53_zone_id" {
  description = "The ID of the hosted zone"
  value       = aws_route53_zone.main.zone_id
}

output "route53_nameservers" {
  description = "The nameservers for the hosted zone"
  value       = aws_route53_zone.main.name_servers
}

output "health_check_ids" {
  description = "Map of health check IDs"
  value = {
    api_primary = aws_route53_health_check.api_primary.id
    api_dr      = aws_route53_health_check.api_dr.id
    web_primary = aws_route53_health_check.web_primary.id
  }
}