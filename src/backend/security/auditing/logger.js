// src/backend/security/auditing/logger.js

const winston = require('winston');
const path = require('path');

// Create a directory for logs if it doesn't exist
const logDirectory = path.join(__dirname, 'logs');

// Configure the logger
const logger = winston.createLogger({
  level: 'info', // Default log level
  format: winston.format.combine(
    winston.format.timestamp(), // Add timestamp to logs
    winston.format.json() // Log in JSON format
  ),
  transports: [
    // Log to console
    new winston.transports.Console({
      format: winston.format.simple(), // Simple format for console
    }),
    // Log to file
    new winston.transports.File({
      filename: path.join(logDirectory, 'security.log'), // Log file path
      level: 'info', // Log level for file
    }),
    // Log errors to a separate file
    new winston.transports.File({
      filename: path.join(logDirectory, 'error.log'), // Error log file path
      level: 'error', // Log level for errors
    }),
  ],
});

/**
 * Function to log security events.
 * @param {string} message - The message to log.
 * @param {Object} [meta] - Optional metadata to include in the log.
 */
const logEvent = (message, meta = {}) => {
  logger.info(message, meta);
};

/**
 * Function to log error events.
 * @param {string} message - The error message to log.
 * @param {Object} [meta] - Optional metadata to include in the log.
 */
const logError = (message, meta = {}) => {
  logger.error(message, meta);
};

module.exports = {
  logEvent,
  logError,
};
