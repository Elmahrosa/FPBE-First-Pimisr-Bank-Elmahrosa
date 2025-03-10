// src/backend/logging/audit.js

const logger = require('./logger'); // Import the logger configuration
const { v4: uuidv4 } = require('uuid'); // For generating unique request IDs

/**
 * Logs user actions with detailed information.
 * @param {string} userId - The ID of the user performing the action.
 * @param {string} action - A description of the action taken by the user.
 * @param {Object} details - Additional details about the action.
 * @param {string} [requestId] - Optional unique identifier for the request.
 */
const logAction = (userId, action, details, requestId = uuidv4()) => {
  try {
    logger.info({
      message: 'User  action logged',
      userId: userId,
      action: action,
      details: details,
      requestId: requestId,
      timestamp: new Date().toISOString(), // Use ISO format for better readability
    });
  } catch (error) {
    // Handle logging errors (e.g., log to console or send to an error tracking service)
    console.error('Failed to log action:', error);
  }
};

/**
 * Logs an error with additional context.
 * @param {string} userId - The ID of the user associated with the error.
 * @param {Error} error - The error object to log.
 * @param {string} [requestId] - Optional unique identifier for the request.
 */
const logError = (userId, error, requestId = uuidv4()) => {
  try {
    logger.error({
      message: 'Error occurred',
      userId: userId,
      error: error.message,
      stack: error.stack,
      requestId: requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
};

/**
 * Logs a compliance-related event.
 * @param {string} userId - The ID of the user associated with the compliance event.
 * @param {string} complianceType - The type of compliance event (e.g., "GDPR", "PCI DSS").
 * @param {Object} details - Additional details about the compliance event.
 * @param {string} [requestId] - Optional unique identifier for the request.
 */
const logComplianceEvent = (userId, complianceType, details, requestId = uuidv4()) => {
  try {
    logger.info({
      message: 'Compliance event logged',
      userId: userId,
      complianceType: complianceType,
      details: details,
      requestId: requestId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log compliance event:', error);
  }
};

module.exports = {
  logAction,
  logError,
  logComplianceEvent,
};
