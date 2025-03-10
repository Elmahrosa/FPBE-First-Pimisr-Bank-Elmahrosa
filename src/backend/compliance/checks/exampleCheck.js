// src/backend/compliance/checks/exampleCheck.js

const { check, validationResult } = require('express-validator');
const logger = require('../logging/logger'); // Import the logger for logging compliance checks

/**
 * Middleware for compliance checks on fund transfer requests.
 * Validates that the transfer amount is positive and that the user has permission to transfer funds.
 */
const complianceCheckTransfer = [
  // Validate the amount
  check('amount')
    .isNumeric().withMessage('Amount must be a number')
    .custom(value => {
      if (value <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      return true;
    }),
  
  // Validate the recipient account
  check('toAccount')
    .isLength({ min: 1 }).withMessage('Recipient account is required'),

  // Custom validation to check user permissions (mock implementation)
  (req, res, next) => {
    const userId = req.body.userId; // Assuming userId is sent in the request body
    const amount = req.body.amount;

    // Mock function to check user permissions (replace with actual implementation)
    const hasPermission = (userId, amount) => {
      // Example: Check if the user has sufficient balance or permission
      // This should be replaced with actual logic to check user permissions
      return true; // Assume user has permission for this example
    };

    if (!hasPermission(userId, amount)) {
      logger.warn({
        message: 'Compliance check failed: User does not have permission to transfer funds',
        userId: userId,
        amount: amount,
        timestamp: new Date().toISOString(),
      });
      return res.status(403).json({ error: 'User  does not have permission to transfer funds' });
    }

    next();
  },

  // Final validation result check
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn({
        message: 'Compliance validation errors',
        errors: errors.array(),
        userId: req.body.userId,
        timestamp: new Date().toISOString(),
      });
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  complianceCheckTransfer,
};
