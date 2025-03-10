// src/backend/monitoring/metrics.js

const client = require('prom-client');

// Create a Registry to register metrics
const register = new client.Registry();

// Create a counter for tracking total HTTP requests
const requestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Create a histogram for tracking response duration
const responseDuration = new client.Histogram({
  name: 'http_response_duration_seconds',
  help: 'Duration of HTTP responses in seconds',
  labelNames: ['method', 'route'],
});

// Create a gauge for tracking service health
const healthGauge = new client.Gauge({
  name: 'service_health',
  help: 'Health status of the service (1 = healthy, 0 = unhealthy)',
});

// Middleware to track requests and response times
const metricsMiddleware = (req, res, next) => {
  const end = responseDuration.startTimer();
  
  res.on('finish', () => {
    requestCounter.inc({ method: req.method, route: req.originalUrl, status: res.statusCode });
    end();
  });

  next();
};

// Endpoint to expose metrics to Prometheus
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

// Health check function to update the health gauge
const updateHealth = (isHealthy) => {
  healthGauge.set(isHealthy ? 1 : 0);
};

// Export the metrics functions and middleware
module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  updateHealth,
  register,
};
