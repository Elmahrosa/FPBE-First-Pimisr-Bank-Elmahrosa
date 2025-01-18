# AWS CloudWatch Configuration for FPBE Mobile Banking System
# Version: 1.0.0
# Provider version: ~> 4.0

# KMS key for CloudWatch log encryption
resource "aws_kms_key" "cloudwatch" {
  description             = "KMS key for CloudWatch logs encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
        Action   = "kms:*"
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:CallerAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Environment = var.environment
    Service     = "cloudwatch"
    Encryption  = "AES256"
  }
}

# Log Groups for different services
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/${var.environment}"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = {
    Environment = var.environment
    Service     = "api-gateway"
    Encryption  = "KMS"
  }
}

resource "aws_cloudwatch_log_group" "auth_service" {
  name              = "/aws/auth-service/${var.environment}"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = {
    Environment = var.environment
    Service     = "auth-service"
    Encryption  = "KMS"
  }
}

resource "aws_cloudwatch_log_group" "transaction_service" {
  name              = "/aws/transaction-service/${var.environment}"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.cloudwatch.arn

  tags = {
    Environment = var.environment
    Service     = "transaction-service"
    Encryption  = "KMS"
  }
}

# Metric Alarms for API Gateway
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.environment}-api-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name        = "Latency"
  namespace          = "FPBE/APIGateway"
  period             = 60
  statistic          = "Average"
  threshold          = 100
  alarm_description  = "API Gateway latency is above 100ms"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = "FPBE-API"
    Stage   = var.environment
  }

  tags = {
    Environment = var.environment
    Service     = "api-gateway"
    Type        = "latency"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "${var.environment}-api-errors-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name        = "5XXError"
  namespace          = "FPBE/APIGateway"
  period             = 60
  statistic          = "Sum"
  threshold          = 5
  alarm_description  = "API Gateway 5XX errors above threshold"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = "FPBE-API"
    Stage   = var.environment
  }

  tags = {
    Environment = var.environment
    Service     = "api-gateway"
    Type        = "errors"
  }
}

# Database Query Performance Monitoring
resource "aws_cloudwatch_metric_alarm" "db_latency" {
  alarm_name          = "${var.environment}-db-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name        = "ReadLatency"
  namespace          = "AWS/RDS"
  period             = 60
  statistic          = "Average"
  threshold          = 0.01
  alarm_description  = "Database read latency above 10ms"
  alarm_actions      = [aws_sns_topic.alerts.arn]
  ok_actions         = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = "fpbe-${var.environment}"
  }

  tags = {
    Environment = var.environment
    Service     = "rds"
    Type        = "latency"
  }
}

# Service Health Dashboard
resource "aws_cloudwatch_dashboard" "fpbe_dashboard" {
  dashboard_name = "FPBE-${var.environment}-Dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["FPBE/APIGateway", "Latency", "ApiName", "FPBE-API", "Stage", var.environment],
            [".", "5XXError", ".", ".", ".", "."],
            [".", "4XXError", ".", ".", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "API Gateway Metrics"
          period  = 60
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", "fpbe-${var.environment}"],
            [".", "WriteLatency", ".", "."],
            [".", "CPUUtilization", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Database Performance"
          period  = 60
        }
      }
    ]
  })
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name              = "fpbe-${var.environment}-alerts"
  kms_master_key_id = aws_kms_key.cloudwatch.id

  tags = {
    Environment = var.environment
    Service     = "monitoring"
    Type        = "alerts"
  }
}

# Outputs
output "log_groups" {
  value = {
    api_gateway         = aws_cloudwatch_log_group.api_gateway.arn
    auth_service        = aws_cloudwatch_log_group.auth_service.arn
    transaction_service = aws_cloudwatch_log_group.transaction_service.arn
  }
  description = "ARNs of CloudWatch Log Groups"
}

output "metric_alarms" {
  value = {
    api_latency = aws_cloudwatch_metric_alarm.api_latency.arn
    api_errors  = aws_cloudwatch_metric_alarm.api_errors.arn
    db_latency  = aws_cloudwatch_metric_alarm.db_latency.arn
  }
  description = "ARNs of CloudWatch Metric Alarms"
}