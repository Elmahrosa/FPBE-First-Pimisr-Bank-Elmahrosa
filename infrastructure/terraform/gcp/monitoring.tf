# Configure Google Beta provider for advanced monitoring features
provider "google-beta" {
  version = "~> 4.0"
}

# Local variables for consistent labeling
locals {
  monitoring_labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "fpbe"
  }
}

# Main application dashboard
resource "google_monitoring_dashboard" "main_dashboard" {
  provider = google-beta
  
  dashboard_json = jsonencode({
    displayName = "FPBE Banking Application Dashboard"
    gridLayout = {
      columns = "2"
      widgets = [
        {
          title = "API Latency"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/api/latency\""
                  aggregation = {
                    perSeriesAligner = "ALIGN_PERCENTILE_95"
                    alignmentPeriod  = "60s"
                  }
                }
              }
            }]
          }
        },
        {
          title = "Database Query Latency"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/database/query_latency\""
                  aggregation = {
                    perSeriesAligner = "ALIGN_MEAN"
                    alignmentPeriod  = "60s"
                  }
                }
              }
            }]
          }
        },
        {
          title = "Cache Hit Ratio"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/cache/hit_ratio\""
                  aggregation = {
                    perSeriesAligner = "ALIGN_MEAN"
                    alignmentPeriod  = "300s"
                  }
                }
              }
            }]
          }
        },
        {
          title = "Transaction Processing Time"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"custom.googleapis.com/transaction/processing_time\""
                  aggregation = {
                    perSeriesAligner = "ALIGN_PERCENTILE_95"
                    alignmentPeriod  = "60s"
                  }
                }
              }
            }]
          }
        }
      ]
    }
  })
}

# Alert Policies
resource "google_monitoring_alert_policy" "api_latency_alert" {
  provider = google-beta
  
  display_name = "API Latency Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "API Latency > 100ms"
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/api/latency\""
      duration        = "60s"
      comparison     = "COMPARISON_GT"
      threshold_value = 100
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
  user_labels          = local.monitoring_labels
}

resource "google_monitoring_alert_policy" "database_latency_alert" {
  provider = google-beta
  
  display_name = "Database Query Latency Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "Database Query Latency > 10ms"
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/database/query_latency\""
      duration        = "300s"
      comparison     = "COMPARISON_GT"
      threshold_value = 10
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
  user_labels          = local.monitoring_labels
}

resource "google_monitoring_alert_policy" "cache_hit_ratio_alert" {
  provider = google-beta
  
  display_name = "Cache Hit Ratio Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "Cache Hit Ratio < 80%"
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/cache/hit_ratio\""
      duration        = "300s"
      comparison     = "COMPARISON_LT"
      threshold_value = 80
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
  user_labels          = local.monitoring_labels
}

# Uptime Checks
resource "google_monitoring_uptime_check_config" "api_health_check" {
  provider = google-beta
  
  display_name = "API Health Check"
  timeout      = "10s"
  period       = "60s"
  
  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
    
    headers = {
      "User-Agent" = "GCP-Monitor/1.0"
      "Accept"     = "application/json"
    }
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = "api.fpbe.com"
    }
  }
}

# Notification Channels
resource "google_monitoring_notification_channel" "email" {
  provider = google-beta
  
  display_name = "Email Notification Channel"
  type         = "email"
  
  labels = {
    email_address = "alerts@fpbe.com"
  }
  
  user_labels = local.monitoring_labels
}

# Custom Metric Descriptors
resource "google_monitoring_metric_descriptor" "api_latency" {
  provider = google-beta
  
  description   = "API Latency Metric"
  display_name  = "API Latency"
  type          = "custom.googleapis.com/api/latency"
  metric_kind   = "GAUGE"
  value_type    = "DOUBLE"
  unit          = "ms"
  
  labels {
    key         = "endpoint"
    value_type  = "STRING"
    description = "API endpoint"
  }
}

resource "google_monitoring_metric_descriptor" "database_latency" {
  provider = google-beta
  
  description   = "Database Query Latency Metric"
  display_name  = "Database Query Latency"
  type          = "custom.googleapis.com/database/query_latency"
  metric_kind   = "GAUGE"
  value_type    = "DOUBLE"
  unit          = "ms"
  
  labels {
    key         = "query_type"
    value_type  = "STRING"
    description = "Type of database query"
  }
}

resource "google_monitoring_metric_descriptor" "cache_hit_ratio" {
  provider = google-beta
  
  description   = "Cache Hit Ratio Metric"
  display_name  = "Cache Hit Ratio"
  type          = "custom.googleapis.com/cache/hit_ratio"
  metric_kind   = "GAUGE"
  value_type    = "DOUBLE"
  unit          = "1"
  
  labels {
    key         = "cache_type"
    value_type  = "STRING"
    description = "Type of cache"
  }
}

resource "google_monitoring_metric_descriptor" "transaction_processing_time" {
  provider = google-beta
  
  description   = "Transaction Processing Time Metric"
  display_name  = "Transaction Processing Time"
  type          = "custom.googleapis.com/transaction/processing_time"
  metric_kind   = "GAUGE"
  value_type    = "DOUBLE"
  unit          = "s"
  
  labels {
    key         = "transaction_type"
    value_type  = "STRING"
    description = "Type of transaction"
  }
}