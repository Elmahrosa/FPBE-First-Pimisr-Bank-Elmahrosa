// External dependencies
import { Request, Response } from 'express'; // ^4.17.1
import { injectable } from 'inversify'; // ^6.0.1
import httpStatus from 'http-status'; // ^1.5.0
import rateLimit from 'express-rate-limit'; // ^6.0.0
import { SecurityLogger } from '@security/logger'; // ^1.0.0
import { RequestValidator } from '@common/validators'; // ^1.0.0
import { v4 as uuidv4 } from 'uuid'; // ^8.3.2

// Internal imports
import { AuthService } from '../services/auth.service';
import { BiometricType } from '../services/biometric.service';
import { AuthMethod, KYCStatus } from '../models/user.model';
import { authConfig } from '../config/auth.config';

// Interfaces
interface LoginRequest {
  email: string;
  password: string;
  deviceId: string;
  deviceFingerprint: {
    platform: string;
    osVersion: string;
    appVersion: string;
    deviceModel: string;
    uniqueId: string;
    securityLevel: string;
  };
}

interface BiometricLoginRequest {
  userId: string;
  biometricData: {
    template: Buffer;
    type: BiometricType;
    qualityScore: number;
  };
  deviceId: string;
}

@injectable()
export class AuthController {
  private static readonly LOGIN_RATE_LIMIT = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: authConfig.authMethods.maxLoginAttempts,
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  constructor(
    private readonly authService: AuthService,
    private readonly securityLogger: SecurityLogger,
    private readonly requestValidator: RequestValidator
  ) {}

  public async login(req: Request, res: Response): Promise<Response> {
    const correlationId = uuidv4();
    const clientIp = req.ip;
    
    try {
      // Validate request body
      const loginRequest = await this.requestValidator.validate<LoginRequest>(
        req.body,
        'loginSchema'
      );

      // Apply rate limiting
      AuthController.LOGIN_RATE_LIMIT(req, res, async () => {
        // Validate device trust level
        const deviceTrust = await this.authService.validateDeviceTrust(
          loginRequest.deviceId,
          loginRequest.deviceFingerprint
        );

        // Log authentication attempt
        this.securityLogger.info('Authentication attempt', {
          correlationId,
          email: loginRequest.email,
          deviceId: loginRequest.deviceId,
          clientIp,
          deviceTrust
        });

        const authResponse = await this.authService.login({
          email: loginRequest.email,
          password: loginRequest.password,
          deviceId: loginRequest.deviceId,
          deviceFingerprint: loginRequest.deviceFingerprint
        });

        // Set security headers
        this.setSecurityHeaders(res);

        // Log successful authentication
        this.securityLogger.info('Authentication successful', {
          correlationId,
          userId: authResponse.user.id,
          deviceId: loginRequest.deviceId,
          clientIp,
          authMethod: AuthMethod.PASSWORD
        });

        return res.status(httpStatus.OK).json({
          ...authResponse,
          correlationId
        });
      });
    } catch (error) {
      // Log authentication failure
      this.securityLogger.error('Authentication failed', {
        correlationId,
        error: error.message,
        clientIp,
        email: req.body?.email,
        deviceId: req.body?.deviceId
      });

      return res.status(httpStatus.UNAUTHORIZED).json({
        error: 'Authentication failed',
        message: 'Invalid credentials or account locked',
        correlationId
      });
    }
  }

  public async loginWithBiometric(req: Request, res: Response): Promise<Response> {
    const correlationId = uuidv4();
    const clientIp = req.ip;

    try {
      // Validate request body
      const biometricRequest = await this.requestValidator.validate<BiometricLoginRequest>(
        req.body,
        'biometricLoginSchema'
      );

      // Validate biometric data integrity
      if (!biometricRequest.biometricData.template || 
          biometricRequest.biometricData.qualityScore < authConfig.authMethods.biometricStrength) {
        throw new Error('Invalid biometric data');
      }

      // Log biometric authentication attempt
      this.securityLogger.info('Biometric authentication attempt', {
        correlationId,
        userId: biometricRequest.userId,
        deviceId: biometricRequest.deviceId,
        biometricType: biometricRequest.biometricData.type,
        clientIp
      });

      const authResponse = await this.authService.loginWithBiometric(
        biometricRequest.userId,
        biometricRequest.biometricData,
        biometricRequest.deviceId
      );

      // Set security headers
      this.setSecurityHeaders(res);

      // Log successful biometric authentication
      this.securityLogger.info('Biometric authentication successful', {
        correlationId,
        userId: biometricRequest.userId,
        deviceId: biometricRequest.deviceId,
        biometricType: biometricRequest.biometricData.type,
        clientIp
      });

      return res.status(httpStatus.OK).json({
        ...authResponse,
        correlationId
      });
    } catch (error) {
      // Log biometric authentication failure
      this.securityLogger.error('Biometric authentication failed', {
        correlationId,
        error: error.message,
        clientIp,
        userId: req.body?.userId,
        deviceId: req.body?.deviceId
      });

      return res.status(httpStatus.UNAUTHORIZED).json({
        error: 'Biometric authentication failed',
        message: 'Invalid biometric data or device trust',
        correlationId
      });
    }
  }

  public async refreshToken(req: Request, res: Response): Promise<Response> {
    const correlationId = uuidv4();
    
    try {
      const { refreshToken, deviceId } = req.body;

      const newTokens = await this.authService.refreshToken(
        refreshToken,
        deviceId
      );

      // Set security headers
      this.setSecurityHeaders(res);

      return res.status(httpStatus.OK).json({
        ...newTokens,
        correlationId
      });
    } catch (error) {
      this.securityLogger.error('Token refresh failed', {
        correlationId,
        error: error.message,
        clientIp: req.ip,
        deviceId: req.body?.deviceId
      });

      return res.status(httpStatus.UNAUTHORIZED).json({
        error: 'Token refresh failed',
        message: 'Invalid or expired refresh token',
        correlationId
      });
    }
  }

  public async logout(req: Request, res: Response): Promise<Response> {
    const correlationId = uuidv4();
    
    try {
      const { userId, deviceId } = req.body;

      await this.authService.logout(userId, deviceId);

      // Log successful logout
      this.securityLogger.info('Logout successful', {
        correlationId,
        userId,
        deviceId,
        clientIp: req.ip
      });

      return res.status(httpStatus.OK).json({
        message: 'Logout successful',
        correlationId
      });
    } catch (error) {
      this.securityLogger.error('Logout failed', {
        correlationId,
        error: error.message,
        clientIp: req.ip,
        userId: req.body?.userId,
        deviceId: req.body?.deviceId
      });

      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Logout failed',
        correlationId
      });
    }
  }

  private setSecurityHeaders(res: Response): void {
    res.set({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'",
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
}