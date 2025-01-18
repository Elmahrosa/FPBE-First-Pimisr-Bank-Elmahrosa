// External dependencies
import { injectable } from 'inversify'; // ^6.0.1
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'; // ^1.0.0
import { createClient, RedisClientType } from 'redis'; // ^4.0.0

// Internal imports
import { User } from '../models/user.model';

// Interfaces
export interface IBiometricData {
    template: Buffer;
    deviceId: string;
    type: BiometricType;
    createdAt: Date;
    lastUsed: Date;
    iv: Buffer;
    templateHash: string;
    qualityScore: number;
    attempts: number;
}

// Enums
export enum BiometricType {
    FINGERPRINT = 'FINGERPRINT',
    FACE_ID = 'FACE_ID',
    TOUCH_ID = 'TOUCH_ID',
    IRIS_SCAN = 'IRIS_SCAN',
    ANDROID_BIOMETRIC_STRONG = 'ANDROID_BIOMETRIC_STRONG',
    ANDROID_BIOMETRIC_WEAK = 'ANDROID_BIOMETRIC_WEAK',
    IOS_FACE_ID = 'IOS_FACE_ID',
    IOS_TOUCH_ID = 'IOS_TOUCH_ID'
}

@injectable()
export class BiometricService {
    private readonly encryptionKey: Buffer;
    private readonly redis: RedisClientType;
    private readonly ivSize: number = 16;
    private readonly maxAttempts: number = 5;
    private readonly templateTimeout: number = 300; // 5 minutes
    private readonly algorithm: string = 'aes-256-gcm';
    private readonly minQualityScore: number = 0.8;

    constructor(redisClient: RedisClientType) {
        // Initialize encryption key from HSM (simulated here)
        this.encryptionKey = randomBytes(32);
        this.redis = redisClient;
    }

    /**
     * Enrolls a new biometric template with enhanced security features
     */
    public async enrollBiometric(
        userId: string,
        biometricData: Buffer,
        deviceId: string,
        type: BiometricType
    ): Promise<boolean> {
        try {
            // Validate input parameters
            if (!userId || !biometricData || !deviceId || !type) {
                throw new Error('Missing required parameters for biometric enrollment');
            }

            // Validate template quality
            const qualityScore = await this.validateTemplateQuality(biometricData);
            if (qualityScore < this.minQualityScore) {
                throw new Error('Biometric template quality below acceptable threshold');
            }

            // Generate encryption components
            const iv = randomBytes(this.ivSize);
            const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
            
            // Encrypt the biometric template
            const encryptedTemplate = Buffer.concat([
                cipher.update(biometricData),
                cipher.final()
            ]);
            const authTag = cipher.getAuthTag();

            // Calculate template hash for integrity verification
            const templateHash = this.calculateTemplateHash(biometricData);

            // Prepare biometric data structure
            const biometricRecord: IBiometricData = {
                template: Buffer.concat([encryptedTemplate, authTag]),
                deviceId,
                type,
                createdAt: new Date(),
                lastUsed: new Date(),
                iv,
                templateHash,
                qualityScore,
                attempts: 0
            };

            // Store in user record
            await User.findByIdAndUpdate(userId, {
                $set: { biometricData: biometricRecord.template },
                deviceId: deviceId,
                type: type
            });

            // Cache template hash for quick verification
            await this.redis.set(
                `biometric:${userId}:${deviceId}`,
                templateHash,
                { EX: this.templateTimeout }
            );

            return true;
        } catch (error) {
            throw new Error(`Biometric enrollment failed: ${error.message}`);
        }
    }

    /**
     * Verifies biometric data with liveness detection and rate limiting
     */
    public async verifyBiometric(
        userId: string,
        biometricData: Buffer,
        deviceId: string
    ): Promise<boolean> {
        try {
            // Check rate limiting
            const attempts = await this.checkRateLimit(userId, deviceId);
            if (attempts >= this.maxAttempts) {
                throw new Error('Maximum verification attempts exceeded');
            }

            // Perform liveness detection
            const isLive = await this.performLivenessDetection(biometricData);
            if (!isLive) {
                throw new Error('Liveness check failed');
            }

            // Retrieve stored template
            const user = await User.findById(userId).select('biometricData');
            if (!user?.biometricData) {
                throw new Error('No biometric template found');
            }

            // Extract encrypted template and auth tag
            const storedTemplate = user.biometricData;
            const authTag = storedTemplate.slice(-16);
            const encryptedTemplate = storedTemplate.slice(0, -16);

            // Decrypt stored template
            const decipher = createDecipheriv(this.algorithm, this.encryptionKey, user.iv);
            decipher.setAuthTag(authTag);
            
            const decryptedTemplate = Buffer.concat([
                decipher.update(encryptedTemplate),
                decipher.final()
            ]);

            // Verify template integrity
            const storedHash = await this.redis.get(`biometric:${userId}:${deviceId}`);
            const currentHash = this.calculateTemplateHash(decryptedTemplate);
            
            if (storedHash !== currentHash) {
                throw new Error('Template integrity check failed');
            }

            // Compare templates with fuzzy matching
            const matchScore = await this.compareBiometricTemplates(
                decryptedTemplate,
                biometricData
            );

            const verified = matchScore >= this.minQualityScore;

            // Update verification metrics
            await this.updateVerificationMetrics(userId, deviceId, verified);

            return verified;
        } catch (error) {
            await this.handleVerificationFailure(userId, deviceId);
            throw new Error(`Biometric verification failed: ${error.message}`);
        }
    }

    /**
     * Private helper methods
     */
    private async validateTemplateQuality(template: Buffer): Promise<number> {
        // Implement template quality validation logic
        return 0.9; // Simulated quality score
    }

    private calculateTemplateHash(template: Buffer): string {
        return createHash('sha256').update(template).digest('hex');
    }

    private async performLivenessDetection(template: Buffer): Promise<boolean> {
        // Implement liveness detection logic
        return true; // Simulated liveness check
    }

    private async compareBiometricTemplates(
        template1: Buffer,
        template2: Buffer
    ): Promise<number> {
        // Implement fuzzy matching logic
        return 0.95; // Simulated match score
    }

    private async checkRateLimit(userId: string, deviceId: string): Promise<number> {
        const key = `biometric:attempts:${userId}:${deviceId}`;
        const attempts = await this.redis.incr(key);
        
        if (attempts === 1) {
            await this.redis.expire(key, 3600); // 1 hour window
        }
        
        return attempts;
    }

    private async updateVerificationMetrics(
        userId: string,
        deviceId: string,
        verified: boolean
    ): Promise<void> {
        if (verified) {
            await this.redis.del(`biometric:attempts:${userId}:${deviceId}`);
            await User.findByIdAndUpdate(userId, {
                $set: { 'biometricData.lastUsed': new Date() }
            });
        }
    }

    private async handleVerificationFailure(
        userId: string,
        deviceId: string
    ): Promise<void> {
        const attempts = await this.checkRateLimit(userId, deviceId);
        if (attempts >= this.maxAttempts) {
            await User.findByIdAndUpdate(userId, {
                $set: { 'biometricData.attempts': attempts }
            });
        }
    }
}