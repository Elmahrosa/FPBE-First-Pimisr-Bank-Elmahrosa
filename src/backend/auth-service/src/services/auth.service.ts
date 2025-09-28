// External dependencies
import { injectable } from 'inversify'; // ^6.0.1
import bcrypt from 'bcrypt'; // ^5.0.0
import winston from 'winston'; // ^3.8.2
import { DeviceTrust } from '@security/device-trust'; // ^2.1.0

// Internal imports
import { User, KYCStatus, AuthMethod, IUserProfile, IDeviceTrust, IDeviceFingerprint } from '../models/user.model';
import { JWTService, TokenType } from './jwt.service';
import { BiometricService, BiometricType } from './biometric.service';

// Interfaces
interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: IUserProfile;
  deviceTrust: IDeviceTrust;
  sessionAnalytics: ISessionAnalytics;
}

interface ILoginCredentials {
  email: string;
  password: string;
  deviceId: string;
  deviceFingerprint: IDeviceFingerprint;
  biometricData?: IBiometricData;
}

interface IDeviceFingerprint {
  platform: string;
  osVersion: string;
  appVersion: string;
  deviceModel: string;
  uniqueId: string;
  securityLevel: string;
}

interface IDeviceTrust {
  trustScore: number;
  riskLevel: string;
  lastAssessment: Date;
  factors: string[];
}

interface ISessionAnalytics {
  loginTime: Date;
  location: string;
  ipAddress: string;
  deviceInfo: IDeviceFingerprint;
  authMethod: AuthMethod;
}

interface IBiometricData {
  template: Buffer;
  type: BiometricType;
  qualityScore: number;
}

@injectable()
export class AuthService {
  private readonly logger: winston.Logger;
  private readonly deviceTrust: DeviceTrust;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly userModel: typeof User,
    private readonly jwtService: JWTService,
    private readonly biometricService: BiometricService
  ) {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'auth-security.log' }),
        new winston.transports.Console()
      ]
    });

    this.deviceTrust = new DeviceTrust();
  }

  public async login(credentials: ILoginCredentials): Promise<IAuthResponse> {
    try {
      // Find user and validate existence
      const user = await this.userModel.findOne({ email: credentials.email }).select('+passwordHash +pin +biometricData +lockedUntil +loginAttempts');
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check account lock status
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new Error(`Account locked until ${user.lockedUntil.toISOString()}`);
      }

      // Validate device trust and calculate risk score
      const deviceTrustScore = await this.deviceTrust.assessDevice(credentials.deviceFingerprint);

      if (deviceTrustScore.trustScore < 0.7) {
        this.logger.warn('Suspicious device detected', {
          userId: user.id,
          deviceId: credentials.deviceId,
          trustScore: deviceTrustScore.trustScore,
          riskLevel: deviceTrustScore.riskLevel
        });
        throw new Error('Device trust validation failed');
      }

      // Validate password
      const isValidPassword = await user.validatePassword(credentials.password);
      if (!isValidPassword) {
        await user.incrementLoginAttempts();

        this.logger.warn('Failed login attempt', {
          userId: user.id,
          deviceId: credentials.deviceId,
          attempts: user.loginAttempts
        });

        if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
          user.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
          await user.save();
          throw new Error('Account locked due to multiple failed attempts');
        }

        throw new Error('Invalid credentials');
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Update device trust information (assumes user model has this method)
      if (typeof user.updateDeviceTrust === 'function') {
        await user.updateDeviceTrust(credentials.deviceId, deviceTrustScore);
      }

      // Generate tokens
      const tokens = await this.jwtService.generateTokens(
        user,
        credentials.deviceId,
        credentials.deviceFingerprint.uniqueId
      );

      // Prepare session analytics
      const sessionAnalytics: ISessionAnalytics = {
        loginTime: new Date(),
        location: await this.deviceTrust.getDeviceLocation(credentials.deviceFingerprint),
        ipAddress: await this.deviceTrust.getDeviceIP(credentials.deviceFingerprint),
        deviceInfo: credentials.deviceFingerprint,
        authMethod: AuthMethod.PASSWORD
      };

      // Log successful authentication
      this.logger.info('Successful authentication', {
        userId: user.id,
        deviceId: credentials.deviceId,
        trustScore: deviceTrustScore.trustScore,
        riskLevel: deviceTrustScore.riskLevel
      });

      return {
        ...tokens,
        user: user.profile,
        deviceTrust: deviceTrustScore,
        sessionAnalytics
      };
    } catch (error: any) {
      this.logger.error('Authentication error', {
        error: error.message,
        email: credentials.email,
        deviceId: credentials.deviceId
      });
      throw error;
    }
  }

  public async loginWithBiometric(
    userId: string,
    biometricData: IBiometricData,
    deviceId: string
  ): Promise<IAuthResponse> {
    try {
      // Find user and validate existence
      const user = await this.userModel.findById(userId).select('+biometricData +lockedUntil +loginAttempts');
      if (!user) {
        throw new Error('User  not found');
      }

      // Check account lock status
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new Error(`Account locked until ${user.lockedUntil.toISOString()}`);
      }

      // Verify biometric data
      const isValidBiometric = await this.biometricService.verifyBiometric(
        userId,
        biometricData.template,
        deviceId
      );

      if (!isValidBiometric) {
        this.logger.warn('Failed biometric authentication', {
          userId,
          deviceId,
          biometricType: biometricData.type
        });
        await user.incrementLoginAttempts();

        if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
          user.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
          await user.save();
          throw new Error('Account locked due to multiple failed attempts');
        }

        throw new Error('Biometric verification failed');
      }

      // Reset login attempts on successful biometric login
      await user.resetLoginAttempts();

      // Calculate device trust score
      const deviceTrustScore = await this.deviceTrust.assessDevice({
        uniqueId: deviceId,
        biometricStrength: biometricData.qualityScore,
        platform: 'unknown',
        osVersion: 'unknown',
        appVersion: 'unknown',
        deviceModel: 'unknown',
        securityLevel: 'unknown'
      });

      // Generate tokens
      const tokens = await this.jwtService.generateTokens(
        user,
        deviceId,
        deviceId // Using deviceId as fingerprint for biometric auth
      );

      // Prepare session analytics
      const sessionAnalytics: ISessionAnalytics = {
        loginTime: new Date(),
        location: await this.deviceTrust.getDeviceLocation({ uniqueId: deviceId }),
        ipAddress: await this.deviceTrust.getDeviceIP({ uniqueId: deviceId }),
        deviceInfo: { uniqueId: deviceId } as IDeviceFingerprint,
        authMethod: AuthMethod.BIOMETRIC
      };

      // Log successful biometric authentication
      this.logger.info('Successful biometric authentication', {
        userId,
        deviceId,
        biometricType: biometricData.type,
        trustScore: deviceTrustScore.trustScore
      });

      return {
        ...tokens,
        user: user.profile,
        deviceTrust: deviceTrustScore,
        sessionAnalytics
      };
    } catch (error: any) {
      this.logger.error('Biometric authentication error', {
        error: error.message,
        userId,
        deviceId
      });
      throw error;
    }
  }
  }
