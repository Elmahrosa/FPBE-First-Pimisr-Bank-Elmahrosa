const winston = require('winston');
const { format } = require('winston');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');

// Define log directory
const logDir = path.join(__dirname, 'logs');

// Create a transport for logging to files with daily rotation
const fileTransport = new DailyRotateFile({
  filename: `${logDir}/%DATE%-results.log`,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  level: 'info',
});

// Create a transport for logging to the console
const consoleTransport = new winston.transports.Console({
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug', // Log level based on environment
});

// Create the logger instance
const logger = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json() // Use JSON format for structured logging
  ),
  transports: [
    fileTransport,
    consoleTransport,
  ],
});

// Handle unhandled exceptions and promise rejections
logger.exceptions.handle(
  new DailyRotateFile({
    filename: `${logDir}/exceptions/%DATE%-exceptions.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
  })
);

// Capture unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export the logger instance
module.exports = logger;
