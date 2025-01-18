/**
 * @fileoverview Enhanced secure storage service for FPBE mobile banking application
 * Implements AES-256 encryption for sensitive data with OWASP MASVS compliance
 * @version 2024.1
 */

import AsyncStorage from '@react-native-async-storage/async-storage'; // v1.19.0
import { encryptData, decryptData } from '../utils/encryption.utils';
import { logger } from './logger.service';

// Storage configuration constants
const STORAGE_PREFIX = '@fpbe:';
const SENSITIVE_KEYS = ['userToken', 'pin', 'biometricKey', 'walletKey', 'encryptionKey'];
const STORAGE_QUOTA_LIMIT = 10 * 1024 * 1024; // 10MB limit
const KEY_ROTATION_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Enhanced storage service with security features and OWASP MASVS compliance
 */
export class StorageService {
    private encryptionKey: string;
    private lastKeyRotation: Date;
    private storageQuota: number;

    constructor(encryptionKey: string) {
        this.encryptionKey = encryptionKey;
        this.lastKeyRotation = new Date();
        this.storageQuota = 0;
        this.validateStorageEnvironment();
    }

    /**
     * Validates storage environment security
     */
    private async validateStorageEnvironment(): Promise<void> {
        try {
            // Verify storage accessibility
            await AsyncStorage.setItem(
                `${STORAGE_PREFIX}test`,
                'test'
            );
            await AsyncStorage.removeItem(`${STORAGE_PREFIX}test`);

            // Check existing quota usage
            const keys = await AsyncStorage.getAllKeys();
            let totalSize = 0;
            for (const key of keys) {
                const value = await AsyncStorage.getItem(key);
                totalSize += (value?.length || 0) * 2; // UTF-16 encoding
            }
            this.storageQuota = totalSize;

            logger.debug('Storage environment validated', {
                quotaUsed: this.storageQuota,
                quotaLimit: STORAGE_QUOTA_LIMIT
            });
        } catch (error) {
            logger.error('Storage environment validation failed', { error });
            throw new Error('Storage environment is not secure');
        }
    }

    /**
     * Stores data securely with encryption for sensitive data
     */
    public async setItem(
        key: string,
        value: any,
        encrypt: boolean = false
    ): Promise<void> {
        try {
            // Input validation
            if (!key || value === undefined) {
                throw new Error('Invalid storage parameters');
            }

            // Force encryption for sensitive keys
            if (SENSITIVE_KEYS.includes(key)) {
                encrypt = true;
            }

            const prefixedKey = `${STORAGE_PREFIX}${key}`;
            const serializedValue = JSON.stringify(value);

            // Check quota limits
            const valueSize = serializedValue.length * 2;
            if (this.storageQuota + valueSize > STORAGE_QUOTA_LIMIT) {
                throw new Error('Storage quota exceeded');
            }

            // Encrypt if required
            const finalValue = encrypt
                ? JSON.stringify(await encryptData(serializedValue, this.encryptionKey))
                : serializedValue;

            await AsyncStorage.setItem(prefixedKey, finalValue);

            // Update quota tracking
            this.storageQuota += valueSize;

            logger.debug('Data stored successfully', {
                key,
                encrypted: encrypt,
                size: valueSize
            });

            // Check key rotation
            this.checkKeyRotation();
        } catch (error) {
            logger.error('Storage operation failed', { error, key });
            throw new Error('Failed to store data securely');
        }
    }

    /**
     * Retrieves data with automatic decryption for encrypted items
     */
    public async getItem<T>(key: string, encrypted: boolean = false): Promise<T | null> {
        try {
            const prefixedKey = `${STORAGE_PREFIX}${key}`;
            const value = await AsyncStorage.getItem(prefixedKey);

            if (!value) {
                return null;
            }

            // Force decryption for sensitive keys
            if (SENSITIVE_KEYS.includes(key)) {
                encrypted = true;
            }

            let parsedValue: T;
            if (encrypted) {
                const encryptedData = JSON.parse(value);
                const decryptedValue = await decryptData(encryptedData, this.encryptionKey);
                parsedValue = JSON.parse(decryptedValue);
            } else {
                parsedValue = JSON.parse(value);
            }

            logger.debug('Data retrieved successfully', {
                key,
                encrypted
            });

            return parsedValue;
        } catch (error) {
            logger.error('Data retrieval failed', { error, key });
            throw new Error('Failed to retrieve data securely');
        }
    }

    /**
     * Securely removes item from storage
     */
    public async removeItem(key: string): Promise<void> {
        try {
            const prefixedKey = `${STORAGE_PREFIX}${key}`;
            const value = await AsyncStorage.getItem(prefixedKey);
            
            if (value) {
                // Update quota tracking
                this.storageQuota -= value.length * 2;
                await AsyncStorage.removeItem(prefixedKey);
            }

            logger.debug('Item removed successfully', { key });
        } catch (error) {
            logger.error('Item removal failed', { error, key });
            throw new Error('Failed to remove item securely');
        }
    }

    /**
     * Securely clears all stored data
     */
    public async clear(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const prefixedKeys = keys.filter(key => key.startsWith(STORAGE_PREFIX));
            
            await AsyncStorage.multiRemove(prefixedKeys);
            this.storageQuota = 0;

            logger.security('Storage cleared successfully', {
                itemsCleared: prefixedKeys.length
            });
        } catch (error) {
            logger.error('Storage clear failed', { error });
            throw new Error('Failed to clear storage securely');
        }
    }

    /**
     * Rotates encryption key and re-encrypts sensitive data
     */
    public async rotateEncryptionKey(newKey: string): Promise<void> {
        try {
            // Get all sensitive keys
            const keys = await AsyncStorage.getAllKeys();
            const sensitiveKeys = keys.filter(key => 
                SENSITIVE_KEYS.includes(key.replace(STORAGE_PREFIX, ''))
            );

            // Re-encrypt all sensitive data
            for (const key of sensitiveKeys) {
                const value = await AsyncStorage.getItem(key);
                if (value) {
                    const decryptedData = await decryptData(
                        JSON.parse(value),
                        this.encryptionKey
                    );
                    const reEncryptedData = await encryptData(
                        decryptedData,
                        newKey
                    );
                    await AsyncStorage.setItem(key, JSON.stringify(reEncryptedData));
                }
            }

            this.encryptionKey = newKey;
            this.lastKeyRotation = new Date();

            logger.security('Encryption key rotated successfully', {
                itemsReEncrypted: sensitiveKeys.length
            });
        } catch (error) {
            logger.error('Key rotation failed', { error });
            throw new Error('Failed to rotate encryption key');
        }
    }

    /**
     * Checks if key rotation is needed
     */
    private checkKeyRotation(): void {
        const timeSinceLastRotation = Date.now() - this.lastKeyRotation.getTime();
        if (timeSinceLastRotation >= KEY_ROTATION_INTERVAL) {
            logger.security('Key rotation needed', {
                lastRotation: this.lastKeyRotation
            });
        }
    }
}