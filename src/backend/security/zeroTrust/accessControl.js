// src/backend/security/zeroTrust/accessControl.js

const jwt = require('jsonwebtoken');
const config = require('../../../config'); // Configuration for JWT secret
const logger = require('../auditing/logger'); // Import the logger for logging access attempts

/**
 * Middleware to check user permissions based on roles.
 * @param {Array} requiredRoles - An array of roles that are allowed to access the route.
 */
const checkPermissions = (requiredRoles) => {
  return (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    // Check if token is provided
    if (!token) {
      logger.logEvent('Unauthorized access attempt: No token provided');
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Verify the token
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        logger.logEvent(`Unauthorized access attempt: ${err.message}`);
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
      }

      // Check if the user role is in the list of required roles
      if (!requiredRoles.includes(decoded.role)) {
        logger.logEvent(`Access denied for user ${decoded.userId}: Insufficient permissions`);
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      // Attach user information to the request object
      req.user = decoded;
      next();
    });
  };
};

/**
 * Middleware to log access attempts.
 */
const logAccessAttempt = (req, res, next) => {
  const userId = req.user ? req.user.userId : 'Guest';
  const method = req.method;
  const path = req.originalUrl;

  logger.logEvent(`Access attempt by user ${userId}: ${method} ${path}`);
  next();
};

module.exports = {
  checkPermissions,
  logAccessAttempt,
};
