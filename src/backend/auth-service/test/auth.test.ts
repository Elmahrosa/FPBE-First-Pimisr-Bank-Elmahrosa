// External dependencies
import { MongoMemoryServer } from 'mongodb-memory-server'; // ^8.0.0
import mongoose from 'mongoose'; // ^6.0.0
import { createClient } from 'redis-mock'; // ^0.56.3
import { jest } from '@jest/globals'; // ^29.0.0

// Internal imports
import { AuthService } from '../src/services/auth.service';
import { User, KYCStatus, AuthMethod } from '../src/models/user.model';
import { JWTService, TokenType } from '../src/services/jwt.service';
import { BiometricService, BiometricType } from '../src/services/biometric.service';
import { authConfig } from '../src/config/auth.config';

describe('AuthService', () => {
  let mongoServer: MongoMemoryServer;
  let authService: AuthService;
  let jwtService: JWTService;
  let biometricService: BiometricService;
  let redisClient: any;

  // Mock data
  const mockUser = {
    email: 'test@fpbe.com',
    phoneNumber: '+1234567890',
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKAc.7g6eCGJwMK', // "Test123!@#"
    kycStatus: KYCStatus.VERIFIED,
    profile: {
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: new Date('1990-01-01'),
      documentType: 'PASSPORT',
      documentNumber: 'AB123456',
      documentExpiryDate: new Date('2025-01-01')
    }
  };

  const mockDeviceInfo = {
    deviceId: 'test-device-123',
    platform: 'iOS',
    osVersion: '15.0',
    appVersion: '1.0.0',
    deviceModel: 'iPhone 13',
    uniqueId: 'UDID-123-456',
    securityLevel: 'HIGH'
  };

  const mockBiometricData = {
    template: Buffer.from('mock-biometric-template'),
    type: BiometricType.FACE_ID,
    qualityScore: 0.95
  };

  beforeAll(async () => {
    // Setup MongoDB memory server
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Setup Redis mock
    redisClient = createClient();

    // Initialize services
    jwtService = new JWTService(redisClient);
    biometricService = new BiometricService(redisClient);
    authService = new AuthService(User, jwtService, biometricService);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    redisClient.quit();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Authentication Methods', () => {
    let user: any;

    beforeEach(async () => {
      user = await User.create(mockUser);
    });

    test('should successfully authenticate with valid credentials', async () => {
      const credentials = {
        email: mockUser.email,
        password: 'Test123!@#',
        deviceId: mockDeviceInfo.deviceId,
        deviceFingerprint: mockDeviceInfo
      };

      const result = await authService.login(credentials);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.deviceTrust.trustScore).toBeGreaterThan(0.7);
    });

    test('should fail authentication with invalid password', async () => {
      const credentials = {
        email: mockUser.email,
        password: 'WrongPassword123!',
        deviceId: mockDeviceInfo.deviceId,
        deviceFingerprint: mockDeviceInfo
      };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    test('should lock account after maximum failed attempts', async () => {
      const credentials = {
        email: mockUser.email,
        password: 'WrongPassword123!',
        deviceId: mockDeviceInfo.deviceId,
        deviceFingerprint: mockDeviceInfo
      };

      for (let i = 0; i < authConfig.authMethods.maxLoginAttempts; i++) {
        await expect(authService.login(credentials)).rejects.toThrow();
      }

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.lockedUntil).toBeDefined();
      expect(updatedUser.lockedUntil).toBeInstanceOf(Date);
    });

    test('should successfully authenticate with biometrics', async () => {
      const result = await authService.loginWithBiometric(
        user._id.toString(),
        mockBiometricData,
        mockDeviceInfo.deviceId
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.sessionAnalytics.authMethod).toBe(AuthMethod.BIOMETRIC);
    });
  });

  describe('Security Controls', () => {
    let user: any;
    let validToken: string;

    beforeEach(async () => {
      user = await User.create(mockUser);
      const tokens = await jwtService.generateTokens(
        user,
        mockDeviceInfo.deviceId,
        mockDeviceInfo.uniqueId
      );
      validToken = tokens.accessToken;
    });

    test('should validate device trust score', async () => {
      const credentials = {
        email: mockUser.email,
        password: 'Test123!@#',
        deviceId: mockDeviceInfo.deviceId,
        deviceFingerprint: { ...mockDeviceInfo, securityLevel: 'LOW' }
      };

      await expect(authService.login(credentials)).rejects.toThrow('Device trust validation failed');
    });

    test('should detect and prevent concurrent sessions', async () => {
      const firstLogin = await authService.login({
        email: mockUser.email,
        password: 'Test123!@#',
        deviceId: 'device-1',
        deviceFingerprint: mockDeviceInfo
      });

      const secondLogin = await authService.login({
        email: mockUser.email,
        password: 'Test123!@#',
        deviceId: 'device-2',
        deviceFingerprint: mockDeviceInfo
      });

      // Verify first session was invalidated
      await expect(
        jwtService.verifyToken(firstLogin.accessToken, 'device-1', TokenType.ACCESS)
      ).rejects.toThrow();
    });

    test('should properly handle token refresh', async () => {
      const credentials = {
        email: mockUser.email,
        password: 'Test123!@#',
        deviceId: mockDeviceInfo.deviceId,
        deviceFingerprint: mockDeviceInfo
      };

      const initialTokens = await authService.login(credentials);
      const refreshedTokens = await jwtService.verifyToken(
        initialTokens.refreshToken,
        mockDeviceInfo.deviceId,
        TokenType.REFRESH
      );

      expect(refreshedTokens).toBeDefined();
      expect(refreshedTokens.deviceId).toBe(mockDeviceInfo.deviceId);
    });
  });

  describe('KYC Integration', () => {
    let user: any;

    beforeEach(async () => {
      user = await User.create({ ...mockUser, kycStatus: KYCStatus.PENDING });
    });

    test('should restrict access for unverified KYC status', async () => {
      const credentials = {
        email: mockUser.email,
        password: 'Test123!@#',
        deviceId: mockDeviceInfo.deviceId,
        deviceFingerprint: mockDeviceInfo
      };

      const result = await authService.login(credentials);
      expect(result.user.kycStatus).toBe(KYCStatus.PENDING);
      // Verify restricted token permissions
      const decodedToken = await jwtService.verifyToken(
        result.accessToken,
        mockDeviceInfo.deviceId,
        TokenType.ACCESS
      );
      expect(decodedToken.kycStatus).toBe(KYCStatus.PENDING);
    });

    test('should update authentication level after KYC verification', async () => {
      // Simulate KYC verification
      user.kycStatus = KYCStatus.VERIFIED;
      await user.save();

      const credentials = {
        email: mockUser.email,
        password: 'Test123!@#',
        deviceId: mockDeviceInfo.deviceId,
        deviceFingerprint: mockDeviceInfo
      };

      const result = await authService.login(credentials);
      expect(result.user.kycStatus).toBe(KYCStatus.VERIFIED);
      // Verify full token permissions
      const decodedToken = await jwtService.verifyToken(
        result.accessToken,
        mockDeviceInfo.deviceId,
        TokenType.ACCESS
      );
      expect(decodedToken.kycStatus).toBe(KYCStatus.VERIFIED);
    });
  });
});