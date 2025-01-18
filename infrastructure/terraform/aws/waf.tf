# AWS WAF configuration for FPBE mobile banking application
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

# Local variables for WAF configuration
locals {
  waf_tags = {
    Environment = "production"
    Service     = "fpbe-banking"
    ManagedBy   = "terraform"
  }
  rate_limit_threshold = 1000
  log_retention_days  = 90
  blocked_countries   = ["KP", "IR", "CU"]
  rule_priorities = {
    rate_limit    = 1
    reputation    = 2
    geo          = 3
    sql_injection = 4
    xss          = 5
  }
}

# WAF logging configuration
resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "/aws/waf/fpbe"
  retention_in_days = local.log_retention_days
  tags              = local.waf_tags
}

# WAF logging configuration
resource "aws_wafv2_web_acl_logging_configuration" "fpbe_waf_logging" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]
  resource_arn           = aws_wafv2_web_acl.fpbe_waf_acl.arn

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

# IP Set for managing allowed and blocked IPs
resource "aws_wafv2_ip_set" "fpbe_ip_set" {
  name               = "fpbe-ip-set"
  description        = "IP set for FPBE banking application"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"
  addresses          = []
  tags               = local.waf_tags
}

# Main WAF Web ACL
resource "aws_wafv2_web_acl" "fpbe_waf_acl" {
  name        = "fpbe-waf-acl"
  description = "WAF Web ACL for FPBE banking application"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate-based rule to prevent DDoS
  rule {
    name     = "rate-limit-rule"
    priority = local.rule_priorities.rate_limit

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = local.rate_limit_threshold
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitRule"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules for SQL injection protection
  rule {
    name     = "aws-managed-sql-rules"
    priority = local.rule_priorities.sql_injection

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesSQLiRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules for XSS protection
  rule {
    name     = "aws-managed-xss-rules"
    priority = local.rule_priorities.xss

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

  # Geo-restriction rule
  rule {
    name     = "geo-block-rule"
    priority = local.rule_priorities.geo

    override_action {
      none {}
    }

    statement {
      geo_match_statement {
        country_codes = local.blocked_countries
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "GeoBlockRule"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "fpbe-waf-metrics"
    sampled_requests_enabled  = true
  }

  tags = local.waf_tags
}

# Metric alarms for WAF monitoring
resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "fpbe-waf-blocked-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period             = "300"
  statistic          = "Sum"
  threshold          = "100"
  alarm_description  = "This metric monitors blocked requests by WAF"
  alarm_actions      = []

  dimensions = {
    WebACL = aws_wafv2_web_acl.fpbe_waf_acl.name
    Region = var.aws_region
  }

  tags = local.waf_tags
}

# Outputs for WAF resources
output "web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.fpbe_waf_acl.arn
}

output "web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.fpbe_waf_acl.id
}