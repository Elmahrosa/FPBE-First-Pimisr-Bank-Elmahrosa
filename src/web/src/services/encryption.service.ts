/**
 * @fileoverview Encryption service for FPBE mobile banking application
 * Implements AES-256-GCM encryption with comprehensive security controls and performance monitoring
 * @version 2024.1
 */

import { encryptData, decryptData, generateEncryptionKey } from '../utils/encryption.utils';
import { LoggerService } from './logger.service';
import { SecureRandom } from 'react-native-get-random-values'; // v1.8.0
import { zxcvbn } from 'zxcvbn'; // v4.4.2
import { PerformanceMonitor } from '@performance/monitor'; // v2.0.0

// Encryption configuration constants
const ENCRYPTION_KEY_SIZE = 256;
const ENCRYPTION_ALGORITHM = 'AES-256-GCM';
const KEY_ROTATION_INTERVAL = 86400000; // 24 hours in milliseconds
const MAX_ENCRYPTION_OPERATIONS_PER_MINUTE = 100;

// Type definitions
interface EncryptionContext {
    userId?: string;
    operation: string;
    metadata?: Record<string, any>;
}

interface EncryptedData {
    ciphertext: string;
    iv: string;
    salt: string;
    authTag: string;
    keyVersion: string;
}

/**
 * Service class implementing encryption operations with comprehensive security controls
 */
export class EncryptionService {
    private encryptionKey: string;
    private readonly logger: LoggerService;
    private readonly performanceMonitor: PerformanceMonitor;
    private operationCount: number = 0;
    private lastKeyRotation: Date;
    private keyVersion: string;

    constructor(logger: LoggerService, performanceMonitor: PerformanceMonitor) {
        this.logger = logger;
        this.performanceMonitor = performanceMonitor;
        this.lastKeyRotation = new Date();
        this.keyVersion = crypto.randomUUID();
        
        // Initialize encryption key
        this.initializeEncryption().catch(error => {
            this.logger.error('Failed to initialize encryption service', { error });
            throw error;
        });

        // Set up key rotation interval
        setInterval(() => this.rotateEncryptionKey(), KEY_ROTATION_INTERVAL);

        // Reset operation counter every minute
        setInterval(() => {
            this.operationCount = 0;
        }, 60000);
    }

    /**
     * Initializes the encryption service with a secure key
     */
    private async initializeEncryption(): Promise<void> {
        try {
            this.encryptionKey = await generateEncryptionKey(ENCRYPTION_KEY_SIZE / 8);
            this.logger.info('Encryption service initialized', {
                algorithm: ENCRYPTION_ALGORITHM,
                keyVersion: this.keyVersion
            });
        } catch (error) {
            this.logger.error('Encryption initialization failed', { error });
            throw new Error('Failed to initialize encryption service');
        }
    }

    /**
     * Encrypts sensitive data with comprehensive security controls
     */
    public async encryptSensitiveData(
        data: any,
        context: EncryptionContext
    ): Promise<EncryptedData> {
        const startTime = performance.now();

        try {
            // Rate limiting check
            if (this.operationCount >= MAX_ENCRYPTION_OPERATIONS_PER_MINUTE) {
                throw new Error('Encryption rate limit exceeded');
            }
            this.operationCount++;

            // Input validation
            if (!data) {
                throw new Error('Invalid input data for encryption');
            }

            // Start performance monitoring
            const perfTrace = this.performanceMonitor.startTrace('encrypt_data');

            // Perform encryption
            const encryptedData = await encryptData(data, this.encryptionKey);

            // Add key version for key rotation support
            const result: EncryptedData = {
                ...encryptedData,
                keyVersion: this.keyVersion
            };

            // Log operation
            this.logger.info('Data encrypted successfully', {
                context,
                keyVersion: this.keyVersion,
                duration: performance.now() - startTime
            });

            // End performance monitoring
            await perfTrace.stop();

            return result;
        } catch (error) {
            this.logger.error('Encryption failed', {
                error,
                context,
                duration: performance.now() - startTime
            });
            throw new Error('Encryption operation failed');
        }
    }

    /**
     * Decrypts encrypted data with validation and error handling
     */
    public async decryptSensitiveData(
        encryptedData: EncryptedData,
        context: EncryptionContext
    ): Promise<any> {
        const startTime = performance.now();

        try {
            // Rate limiting check
            if (this.operationCount >= MAX_ENCRYPTION_OPERATIONS_PER_MINUTE) {
                throw new Error('Decryption rate limit exceeded');
            }
            this.operationCount++;

            // Input validation
            if (!encryptedData?.ciphertext || !encryptedData?.keyVersion) {
                throw new Error('Invalid encrypted data format');
            }

            // Start performance monitoring
            const perfTrace = this.performanceMonitor.startTrace('decrypt_data');

            // Perform decryption
            const decryptedData = await decryptData(encryptedData, this.encryptionKey);

            // Log operation
            this.logger.info('Data decrypted successfully', {
                context,
                keyVersion: encryptedData.keyVersion,
                duration: performance.now() - startTime
            });

            // End performance monitoring
            await perfTrace.stop();

            return decryptedData;
        } catch (error) {
            this.logger.error('Decryption failed', {
                error,
                context,
                duration: performance.now() - startTime
            });
            throw new Error('Decryption operation failed');
        }
    }

    /**
     * Rotates encryption key with secure key generation and validation
     */
    public async rotateEncryptionKey(): Promise<void> {
        const startTime = performance.now();

        try {
            // Generate new key
            const newKey = await generateEncryptionKey(ENCRYPTION_KEY_SIZE / 8);
            const newKeyVersion = crypto.randomUUID();

            // Validate new key strength
            const keyStrength = zxcvbn(newKey);
            if (keyStrength.score < 4) {
                throw new Error('Generated key does not meet strength requirements');
            }

            // Update key and version
            const oldKey = this.encryptionKey;
            this.encryptionKey = newKey;
            this.keyVersion = newKeyVersion;
            this.lastKeyRotation = new Date();

            // Securely clear old key from memory
            oldKey.split('').forEach((_, i) => oldKey[i] = '\0');

            this.logger.info('Encryption key rotated successfully', {
                keyVersion: this.keyVersion,
                duration: performance.now() - startTime
            });
        } catch (error) {
            this.logger.error('Key rotation failed', {
                error,
                duration: performance.now() - startTime
            });
            throw new Error('Failed to rotate encryption key');
        }
    }
}

export default EncryptionService;