const logger = require('./logger');

// Middleware for logging requests
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log the incoming request
  logger.info({
    message: 'Incoming request',
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body, // Be cautious with logging sensitive data
    timestamp: new Date().toISOString(),
  });

  // Capture the response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log the response details
    logger.info({
      message: 'Response sent',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  });

  // Capture errors
  res.on('error', (err) => {
    logger.error({
      message: 'Response error',
      method: req.method,
      url: req.originalUrl,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  });

  next();
};

module.exports = requestLogger;
