# AWS CloudFront Configuration for FPBE Mobile Banking Application
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
}

# Origin Access Identity for secure S3 access
resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "FPBE static content access identity with enhanced security"
}

# Main CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  price_class         = "PriceClass_All"
  comment             = "FPBE mobile banking application distribution with security controls"
  aliases             = [local.web_subdomain, local.api_subdomain]
  web_acl_id          = aws_wafv2_web_acl.main.id

  # Default cache behavior for API endpoints
  default_cache_behavior {
    target_origin_id       = "api_origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    min_ttl               = 0
    default_ttl           = 3600
    max_ttl               = 86400
    compress              = true

    forwarded_values {
      query_string = true
      headers      = [
        "Authorization",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "X-Request-ID",
        "X-Api-Key"
      ]
      cookies {
        forward = "all"
      }
    }

    # Security headers configuration
    function_association {
      event_type   = "viewer-response"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
  }

  # Specific behavior for API paths
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "api_origin"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    min_ttl               = 0
    default_ttl           = 0
    max_ttl               = 0
    compress              = true

    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }
  }

  # SSL/TLS Configuration
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Geo-restriction settings
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Custom error responses
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # Resource tags
  tags = {
    Name          = "fpbe-cdn-${var.environment}"
    Environment   = var.environment
    Project       = "FPBE"
    ManagedBy     = "Terraform"
    SecurityLevel = "High"
    CostCenter    = "Infrastructure"
  }
}

# Real-time monitoring subscription
resource "aws_cloudfront_monitoring_subscription" "main" {
  distribution_id = aws_cloudfront_distribution.main.id
  monitoring_subscription {
    realtime_metrics_subscription_config {
      realtime_metrics_subscription_status = "Enabled"
    }
  }
}

# CloudFront Function for Security Headers
resource "aws_cloudfront_function" "security_headers" {
  name    = "security-headers-${var.environment}"
  runtime = "cloudfront-js-1.0"
  comment = "Add security headers to all responses"
  publish = true
  code    = <<-EOT
    function handler(event) {
      var response = event.response;
      var headers = response.headers;
      
      headers['strict-transport-security'] = {
        value: 'max-age=31536000; includeSubdomains; preload'
      };
      headers['content-security-policy'] = {
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
      };
      headers['x-content-type-options'] = {
        value: 'nosniff'
      };
      headers['x-frame-options'] = {
        value: 'DENY'
      };
      headers['x-xss-protection'] = {
        value: '1; mode=block'
      };
      headers['referrer-policy'] = {
        value: 'strict-origin-when-cross-origin'
      };
      
      return response;
    }
  EOT
}

# Outputs
output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name for DNS configuration"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID for Route53 alias records"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for monitoring and management"
  value       = aws_cloudfront_distribution.main.id
}