// External dependencies
import jwt from 'jsonwebtoken'; // ^9.0.0
import crypto from 'crypto'; // built-in
import { RedisClient } from 'redis'; // ^4.6.0

// Internal imports
import { authConfig } from './config/auth.config';
import { User, KYCStatus } from '../models/user.model';

// Type definitions
enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh'
}

interface ITokenPayload {
  userId: string;
  email: string;
  kycStatus: KYCStatus;
  deviceId: string;
  deviceFingerprint: string;
  iat: number;
  exp: number;
  iss: string;
  jti: string;
  keyId: string;
}

interface ITokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  keyId: string;
  deviceBinding: string;
}

interface IKeyPair {
  id: string;
  publicKey: string;
  privateKey: string;
  createdAt: Date;
}

class JWTService {
  private readonly tokenCache: RedisClient;
  private currentKeyPair: IKeyPair;
  private readonly TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly TOKEN_METADATA_PREFIX = 'token:metadata:';
  private readonly KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(redisClient: RedisClient) {
    this.tokenCache = redisClient;
    this.currentKeyPair = this.generateKeyPair();
    this.initializeKeyRotation();
  }

  /**
   * Generates a new key pair for JWT signing
   */
  private generateKeyPair(): IKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    return {
      id: crypto.randomBytes(16).toString('hex'),
      publicKey,
      privateKey,
      createdAt: new Date()
    };
  }

  /**
   * Initializes automatic key rotation
   */
  private initializeKeyRotation(): void {
    setInterval(() => {
      this.rotateKeys();
    }, this.KEY_ROTATION_INTERVAL);
  }

  /**
   * Rotates JWT signing keys
   */
  public async rotateKeys(): Promise<void> {
    const newKeyPair = this.generateKeyPair();
    const oldKeyPair = this.currentKeyPair;
    this.currentKeyPair = newKeyPair;

    // Store old key temporarily for token validation
    await this.tokenCache.set(
      `jwt:key:${oldKeyPair.id}`,
      JSON.stringify(oldKeyPair),
      'EX',
      3600 // Keep old key for 1 hour
    );
  }

  /**
   * Generates access and refresh tokens
   */
  public async generateTokens(
    user: User,
    deviceId: string,
    deviceFingerprint: string
  ): Promise<ITokenResponse> {
    // Validate KYC status
    if (user.kycStatus === KYCStatus.REJECTED) {
      throw new Error('User KYC validation failed');
    }

    const tokenId = crypto.randomBytes(32).toString('hex');
    const basePayload = {
      userId: user.id,
      email: user.email,
      kycStatus: user.kycStatus,
      deviceId,
      deviceFingerprint,
      iss: authConfig.jwt.issuer,
      keyId: this.currentKeyPair.id
    };

    // Generate access token
    const accessToken = jwt.sign(
      { ...basePayload, type: TokenType.ACCESS },
      this.currentKeyPair.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: authConfig.jwt.accessTokenExpiry,
        jwtid: `${tokenId}-access`,
        audience: authConfig.jwt.audience
      }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { ...basePayload, type: TokenType.REFRESH },
      this.currentKeyPair.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: authConfig.jwt.refreshTokenExpiry,
        jwtid: `${tokenId}-refresh`,
        audience: authConfig.jwt.audience
      }
    );

    // Store token metadata
    await this.storeTokenMetadata(tokenId, user.id, deviceId);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiryInSeconds(authConfig.jwt.accessTokenExpiry),
      tokenType: 'Bearer',
      keyId: this.currentKeyPair.id,
      deviceBinding: deviceFingerprint
    };
  }

  /**
   * Verifies and decodes a JWT token
   */
  public async verifyToken(
    token: string,
    deviceId: string,
    tokenType: TokenType
  ): Promise<ITokenPayload> {
    try {
      // Check token blacklist
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Decode token without verification to get key ID
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token format');
      }

      // Get the correct key for verification
      const keyPair = await this.getKeyPair(decoded.header.kid);
      if (!keyPair) {
        throw new Error('Invalid token key');
      }

      // Verify token
      const verified = jwt.verify(token, keyPair.publicKey, {
        algorithms: ['RS256'],
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience,
        clockTolerance: authConfig.jwt.clockTolerance
      }) as ITokenPayload;

      // Validate device binding
      if (verified.deviceId !== deviceId) {
        throw new Error('Invalid device binding');
      }

      // Validate token type
      if (verified.type !== tokenType) {
        throw new Error('Invalid token type');
      }

      return verified;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      throw error;
    }
  }

  /**
   * Stores token metadata in cache
   */
  private async storeTokenMetadata(
    tokenId: string,
    userId: string,
    deviceId: string
  ): Promise<void> {
    const metadata = {
      userId,
      deviceId,
      createdAt: new Date().toISOString()
    };

    await this.tokenCache.set(
      `${this.TOKEN_METADATA_PREFIX}${tokenId}`,
      JSON.stringify(metadata),
      'EX',
      this.getExpiryInSeconds(authConfig.jwt.refreshTokenExpiry)
    );
  }

  /**
   * Checks if a token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const exists = await this.tokenCache.exists(
      `${this.TOKEN_BLACKLIST_PREFIX}${token}`
    );
    return exists === 1;
  }

  /**
   * Retrieves a key pair by ID
   */
  private async getKeyPair(keyId: string): Promise<IKeyPair | null> {
    if (keyId === this.currentKeyPair.id) {
      return this.currentKeyPair;
    }

    const storedKey = await this.tokenCache.get(`jwt:key:${keyId}`);
    return storedKey ? JSON.parse(storedKey) : null;
  }

  /**
   * Converts expiry string to seconds
   */
  private getExpiryInSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }

  /**
   * Revokes a token by adding it to the blacklist
   */
  public async revokeToken(token: string): Promise<void> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }

    await this.tokenCache.set(
      `${this.TOKEN_BLACKLIST_PREFIX}${token}`,
      '1',
      'EX',
      this.getExpiryInSeconds(authConfig.jwt.refreshTokenExpiry)
    );
  }
}

export {
  JWTService,
  TokenType,
  type ITokenPayload,
  type ITokenResponse
};