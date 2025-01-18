import express from 'express'; // ^4.18.0
import cors from 'cors'; // ^2.8.5
import winston from 'winston'; // ^3.8.0
import { kongConfig } from '../config/kong.config';

// Configure logger for security events
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'cors-security.log' })
  ]
});

// Interface definitions
interface CorsOptions {
  origin: string | string[] | boolean | ((origin: string, callback: (error: Error | null, allow?: boolean) => void) => void);
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

interface CorsEnvironmentConfig {
  development: CorsOptions;
  staging: CorsOptions;
  production: CorsOptions;
}

// Default CORS configuration with strict security settings
const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origin: false, // Disable CORS by default
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id', 'X-Rate-Limit-Remaining'],
  credentials: true,
  maxAge: 3600,
  optionsSuccessStatus: 204,
  preflightContinue: false
};

// Security headers to be applied
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};

// Origin validation function
const validateOrigin = async (origin: string): Promise<boolean> => {
  try {
    if (!origin) {
      logger.warn('Request received without origin header');
      return false;
    }

    const allowedOrigins = kongConfig.plugins.cors.origins;
    
    // Check if origin is in allowed list
    if (Array.isArray(allowedOrigins)) {
      const isAllowed = allowedOrigins.includes(origin);
      
      // Log validation result for security monitoring
      logger.info({
        message: 'Origin validation result',
        origin,
        isAllowed,
        timestamp: new Date().toISOString()
      });

      return isAllowed;
    }

    return false;
  } catch (error) {
    logger.error({
      message: 'Error validating origin',
      error,
      origin,
      timestamp: new Date().toISOString()
    });
    return false;
  }
};

// Configure CORS options based on environment
const configureCors = (): CorsOptions => {
  const environment = kongConfig.environment || 'development';
  const corsConfig = kongConfig.plugins.cors;

  const options: CorsOptions = {
    ...DEFAULT_CORS_OPTIONS,
    origin: async (origin: string, callback: (error: Error | null, allow?: boolean) => void) => {
      try {
        const isAllowed = await validateOrigin(origin);
        callback(null, isAllowed);
      } catch (error) {
        callback(new Error('CORS validation error'));
      }
    },
    methods: corsConfig.methods || DEFAULT_CORS_OPTIONS.methods,
    allowedHeaders: corsConfig.headers || DEFAULT_CORS_OPTIONS.allowedHeaders,
    exposedHeaders: corsConfig.exposed_headers || DEFAULT_CORS_OPTIONS.exposedHeaders,
    credentials: corsConfig.credentials !== undefined ? corsConfig.credentials : DEFAULT_CORS_OPTIONS.credentials,
    maxAge: corsConfig.max_age || DEFAULT_CORS_OPTIONS.maxAge,
    preflightContinue: corsConfig.preflight_continue || DEFAULT_CORS_OPTIONS.preflightContinue,
    optionsSuccessStatus: DEFAULT_CORS_OPTIONS.optionsSuccessStatus
  };

  return options;
};

// CORS middleware with enhanced security
const corsMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  try {
    // Apply security headers
    Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    // Configure CORS
    const corsOptions = configureCors();
    
    // Log CORS request for security monitoring
    logger.info({
      message: 'CORS request received',
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });

    // Handle CORS
    cors(corsOptions)(req, res, (err: Error | null) => {
      if (err) {
        logger.error({
          message: 'CORS error',
          error: err,
          origin: req.headers.origin,
          timestamp: new Date().toISOString()
        });
        
        return res.status(403).json({
          error: 'CORS policy violation',
          message: 'Origin not allowed'
        });
      }

      // Check for potential CORS attacks
      if (req.method === 'OPTIONS') {
        // Log preflight requests
        logger.info({
          message: 'CORS preflight request',
          origin: req.headers.origin,
          method: req.method,
          timestamp: new Date().toISOString()
        });
      }

      next();
    });
  } catch (error) {
    logger.error({
      message: 'CORS middleware error',
      error,
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
    
    next(error);
  }
};

export default corsMiddleware;