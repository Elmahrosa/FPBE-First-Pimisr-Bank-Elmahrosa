// src/backend/auth-service/tests/jwt.service.spec.ts

import { JWTService, TokenType } from '../../src/services/jwt.service';
import { createClient, RedisClientType } from 'redis';
import { KYCStatus } from '../../src/models/user.model';
import jwt from 'jsonwebtoken';

jest.mock('redis', () => {
  const mSet = jest.fn();
  const mGet = jest.fn();
  const mExists = jest.fn();
  return {
    createClient: jest.fn(() => ({
      connect: jest.fn(),
      set: mSet,
      get: mGet,
      exists: mExists,
      on: jest.fn(),
      quit: jest.fn(),
    })),
  };
});

describe('JWTService', () => {
  let redisClient: RedisClientType;
  let jwtService: JWTService;
  let user: any;

  beforeAll(() => {
    redisClient = createClient() as unknown as RedisClientType;
    jwtService = new JWTService(redisClient);

    user = {
      id: 'user123',
      email: 'test@example.com',
      kycStatus: KYCStatus.VERIFIED,
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('generateTokens should create valid access and refresh tokens', async () => {
    (redisClient.set as jest.Mock).mockResolvedValue('OK');

    const tokens = await jwtService.generateTokens(user, 'device1', 'fingerprint1');

    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.keyId).toBe(jwtService['currentKeyPair'].id);
    expect(tokens.deviceBinding).toBe('fingerprint1');

    const decoded = jwt.decode(tokens.accessToken) as any;
    expect(decoded.userId).toBe(user.id);
    expect(decoded.deviceId).toBe('device1');
    expect(decoded.type).toBe(TokenType.ACCESS);
  });

  test('generateTokens should throw error if user KYC is REJECTED', async () => {
    const rejectedUser  = { ...user, kycStatus: KYCStatus.REJECTED };
    await expect(jwtService.generateTokens(rejectedUser , 'device1', 'fingerprint1')).rejects.toThrow('User  KYC validation failed');
  });

  test('verifyToken should verify valid token and return payload', async () => {
    const tokens = await jwtService.generateTokens(user, 'device1', 'fingerprint1');

    (redisClient.exists as jest.Mock).mockResolvedValue(0);
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    const payload = await jwtService.verifyToken(tokens.accessToken, 'device1', TokenType.ACCESS);

    expect(payload.userId).toBe(user.id);
    expect(payload.deviceId).toBe('device1');
    expect(payload.type).toBe(TokenType.ACCESS);
  });

  test('verifyToken should throw error if token is blacklisted', async () => {
    const tokens = await jwtService.generateTokens(user, 'device1', 'fingerprint1');

    (redisClient.exists as jest.Mock).mockResolvedValue(1);

    await expect(jwtService.verifyToken(tokens.accessToken, 'device1', TokenType.ACCESS)).rejects.toThrow('Token has been revoked');
  });

  test('verifyToken should throw error if deviceId does not match', async () => {
    const tokens = await jwtService.generateTokens(user, 'device1', 'fingerprint1');

    (redisClient.exists as jest.Mock).mockResolvedValue(0);
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    await expect(jwtService.verifyToken(tokens.accessToken, 'wrongDevice', TokenType.ACCESS)).rejects.toThrow('Invalid device binding');
  });

  test('revokeToken should add token to blacklist with correct TTL', async () => {
    const tokens = await jwtService.generateTokens(user, 'device1', 'fingerprint1');

    (redisClient.set as jest.Mock).mockResolvedValue('OK');

    await jwtService.revokeToken(tokens.accessToken);

    expect(redisClient.set).toHaveBeenCalledWith(
      expect.stringContaining('token:blacklist:'),
      '1',
      expect.objectContaining({ EX: expect.any(Number) })
    );
  });

  test('rotateKeys should generate new key and store old key in Redis', async () => {
    (redisClient.set as jest.Mock).mockResolvedValue('OK');

    const oldKeyId = jwtService['currentKeyPair'].id;
    await jwtService.rotateKeys();

    expect(jwtService['currentKeyPair'].id).not.toBe(oldKeyId);
    expect(redisClient.set).toHaveBeenCalledWith(
      `jwt:key:${oldKeyId}`,
      expect.any(String),
      expect.objectContaining({ EX: 3600 })
    );
  });
});
