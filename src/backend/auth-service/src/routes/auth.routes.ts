// External dependencies
import { Router } from 'express'; // ^4.17.1
import { container } from 'inversify'; // ^6.0.1
import helmet from 'helmet'; // ^4.6.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { v4 as uuidv4 } from 'uuid'; // ^8.3.2

// Internal imports
import { AuthController } from '../controllers/auth.controller';
import { SecurityMiddleware } from '@security/middleware'; // ^1.0.0
import { authConfig } from '../config/auth.config';
import { BiometricType } from '../services/biometric.service';
import { KYCStatus } from '../models/user.model';

// Constants
const LOGIN_RATE_LIMIT = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: authConfig.authMethods.maxLoginAttempts,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const REGISTER_RATE_LIMIT = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const BIOMETRIC_RATE_LIMIT = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 biometric attempts per 5 minutes
  message: 'Too many biometric authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Configures and returns Express router with secure authentication endpoints
 */
export default function configureRoutes(): Router {
  const router = Router();
  const authController = container.get<AuthController>('AuthController');
  const securityMiddleware = container.get<SecurityMiddleware>('SecurityMiddleware');

  // Apply security headers
  router.use(helmet());

  // Apply base security middleware
  router.use(securityMiddleware.validateContentType);
  router.use(securityMiddleware.validateRequestSize);
  router.use(securityMiddleware.preventNoCache);
  router.use(securityMiddleware.validateCorrelationId);

  // Login route with password
  router.post('/login',
    LOGIN_RATE_LIMIT,
    securityMiddleware.validateLoginRequest,
    securityMiddleware.sanitizeInput,
    securityMiddleware.validateDeviceFingerprint,
    async (req, res, next) => {
      try {
        const response = await authController.login(req, res);
        return response;
      } catch (error) {
        next(error);
      }
    }
  );

  // Biometric login route
  router.post('/login/biometric',
    BIOMETRIC_RATE_LIMIT,
    securityMiddleware.validateBiometricRequest,
    securityMiddleware.validateDeviceTrust,
    async (req, res, next) => {
      try {
        const response = await authController.loginWithBiometric(req, res);
        return response;
      } catch (error) {
        next(error);
      }
    }
  );

  // PIN-based login route
  router.post('/login/pin',
    LOGIN_RATE_LIMIT,
    securityMiddleware.validatePinRequest,
    securityMiddleware.validateDeviceTrust,
    async (req, res, next) => {
      try {
        const response = await authController.loginWithPin(req, res);
        return response;
      } catch (error) {
        next(error);
      }
    }
  );

  // User registration route
  router.post('/register',
    REGISTER_RATE_LIMIT,
    securityMiddleware.validateRegistrationRequest,
    securityMiddleware.sanitizeInput,
    securityMiddleware.validateKYC,
    async (req, res, next) => {
      try {
        const response = await authController.register(req, res);
        return response;
      } catch (error) {
        next(error);
      }
    }
  );

  // Token refresh route
  router.post('/refresh-token',
    securityMiddleware.validateRefreshToken,
    securityMiddleware.validateDeviceBinding,
    async (req, res, next) => {
      try {
        const response = await authController.refreshToken(req, res);
        return response;
      } catch (error) {
        next(error);
      }
    }
  );

  // Logout route
  router.post('/logout',
    securityMiddleware.validateSession,
    async (req, res, next) => {
      try {
        const response = await authController.logout(req, res);
        return response;
      } catch (error) {
        next(error);
      }
    }
  );

  // Biometric enrollment route
  router.post('/enroll-biometric',
    securityMiddleware.validateSession,
    securityMiddleware.validateBiometricEnrollment,
    securityMiddleware.validateDeviceTrust,
    async (req, res, next) => {
      try {
        const response = await authController.enrollBiometric(req, res);
        return response;
      } catch (error) {
        next(error);
      }
    }
  );

  // Device verification route
  router.post('/verify-device',
    securityMiddleware.validateDeviceRequest,
    async (req, res, next) => {
      try {
        const response = await authController.verifyDevice(req, res);
        return response;
      } catch (error) {
        next(error);
      }
    }
  );

  // Error handling middleware
  router.use((err: Error, req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    console.error(`Error [${correlationId}]:`, err);
    
    res.status(500).json({
      error: 'Internal Server Error',
      correlationId,
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  });

  return router;
}