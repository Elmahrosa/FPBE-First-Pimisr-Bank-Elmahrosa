import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import jwt from 'jsonwebtoken'; // ^9.0.0
import { createClient } from 'redis'; // ^4.6.0
import { createLogger, format, transports } from 'winston'; // ^3.8.0
import { kongConfig } from '../config/kong.config';

// Constants
const TOKEN_HEADER = 'Authorization';
const TOKEN_PREFIX = 'Bearer ';
const TOKEN_REGEX = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
const CACHE_TTL = 300; // 5 minutes
const MAX_TOKEN_AGE = 3600; // 1 hour

const ERROR_MESSAGES = {
  MISSING_TOKEN: 'No token provided',
  INVALID_TOKEN: 'Invalid or expired token',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_DEVICE: 'Invalid device binding',
  BLACKLISTED_TOKEN: 'Token has been revoked',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions'
} as const;

// Redis client for token blacklist and cache
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: process.env.REDIS_PASSWORD
});

// Logger configuration
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'jwt-validation.log' })
  ]
});

// Interfaces
interface JWTPayload {
  userId: string;
  email: string;
  deviceId: string;
  sessionId: string;
  roles: string[];
  iat: number;
  exp: number;
  jti: string;
}

interface TokenValidationError {
  code: string;
  message: string;
  details?: object;
}

// Cache for excluded paths
const pathExclusionCache = new Map<string, boolean>();

/**
 * Checks if the request path is excluded from JWT validation
 */
const isExcludedPath = (path: string): boolean => {
  // Check cache first
  if (pathExclusionCache.has(path)) {
    return pathExclusionCache.get(path)!;
  }

  const excludedPaths = kongConfig.plugins.jwt.exclude_paths;
  const isExcluded = excludedPaths.some(pattern => {
    const regexPattern = pattern.replace('*', '.*');
    return new RegExp(`^${regexPattern}$`).test(path);
  });

  // Cache the result
  pathExclusionCache.set(path, isExcluded);
  setTimeout(() => pathExclusionCache.delete(path), CACHE_TTL * 1000);

  return isExcluded;
};

/**
 * Extracts and validates JWT token format from request
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.header(TOKEN_HEADER);
  
  if (!authHeader || !authHeader.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  const token = authHeader.slice(TOKEN_PREFIX.length);
  return TOKEN_REGEX.test(token) ? token : null;
};

/**
 * Validates device binding for the token
 */
const validateDeviceBinding = async (payload: JWTPayload, deviceId: string): Promise<boolean> => {
  try {
    const storedBinding = await redisClient.get(`device:${payload.userId}`);
    const isValid = storedBinding === deviceId;

    if (!isValid) {
      logger.warn({
        message: 'Device binding mismatch',
        userId: payload.userId,
        expectedDevice: storedBinding,
        actualDevice: deviceId
      });
    }

    return isValid;
  } catch (error) {
    logger.error('Device binding validation error:', error);
    return false;
  }
};

/**
 * JWT validation middleware
 */
const jwtValidatorMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if path is excluded from validation
    if (isExcludedPath(req.path)) {
      return next();
    }

    // Extract and validate token format
    const token = extractToken(req);
    if (!token) {
      throw { code: 'AUTH_ERROR', message: ERROR_MESSAGES.MISSING_TOKEN };
    }

    // Check token blacklist
    const isBlacklisted = await redisClient.sIsMember('token:blacklist', token);
    if (isBlacklisted) {
      throw { code: 'AUTH_ERROR', message: ERROR_MESSAGES.BLACKLISTED_TOKEN };
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Validate token age
    const tokenAge = Math.floor(Date.now() / 1000) - payload.iat;
    if (tokenAge > MAX_TOKEN_AGE) {
      throw { code: 'AUTH_ERROR', message: ERROR_MESSAGES.INVALID_TOKEN };
    }

    // Validate device binding
    const deviceId = req.header('X-Device-ID');
    if (deviceId && !(await validateDeviceBinding(payload, deviceId))) {
      throw { code: 'AUTH_ERROR', message: ERROR_MESSAGES.INVALID_DEVICE };
    }

    // Validate permissions for the route
    const requiredRoles = req.route?.meta?.requiredRoles || [];
    if (requiredRoles.length > 0 && !requiredRoles.some(role => payload.roles.includes(role))) {
      throw { code: 'AUTH_ERROR', message: ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS };
    }

    // Enrich request with user context
    req.user = {
      id: payload.userId,
      email: payload.email,
      roles: payload.roles,
      sessionId: payload.sessionId
    };

    // Log successful validation
    logger.info({
      message: 'JWT validation successful',
      userId: payload.userId,
      path: req.path
    });

    next();
  } catch (error) {
    const validationError: TokenValidationError = {
      code: error.code || 'AUTH_ERROR',
      message: error.message || ERROR_MESSAGES.UNAUTHORIZED,
      details: error.details
    };

    logger.error({
      message: 'JWT validation failed',
      error: validationError,
      path: req.path
    });

    res.status(401).json(validationError);
  }
};

// Initialize Redis connection
redisClient.connect().catch(error => {
  logger.error('Redis connection error:', error);
  process.exit(1);
});

export default jwtValidatorMiddleware;