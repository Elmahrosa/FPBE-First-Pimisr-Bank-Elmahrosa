/**
 * @fileoverview Advanced encryption utilities for FPBE mobile banking application
 * Implements AES-256-GCM encryption with enhanced security measures for sensitive data protection
 * @version 2024.1
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import { SecureRandom } from 'react-native-get-random-values'; // v1.8.0
import zxcvbn from 'zxcvbn'; // v4.4.2
import { logger } from '../services/logger.service';

// Encryption constants
const ENCRYPTION_ALGORITHM = 'AES-256-GCM';
const KEY_SIZE = 256;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 310000;
const MIN_PASSWORD_STRENGTH = 3;
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';

// Type definitions
interface EncryptedData {
    ciphertext: string;
    iv: string;
    salt: string;
    authTag: string;
}

interface HashedPassword {
    hash: string;
    salt: string;
    iterations: number;
    version: string;
}

interface EncryptionOptions {
    iterations?: number;
    keySize?: number;
}

/**
 * Generates a cryptographically secure encryption key with enhanced entropy
 * @param length Key length in bytes
 * @param options Additional key generation options
 * @returns Promise<string> Generated encryption key
 */
export async function generateEncryptionKey(
    length: number = KEY_SIZE / 8,
    options: EncryptionOptions = {}
): Promise<string> {
    try {
        // Generate primary entropy source
        const primaryEntropy = new Uint8Array(length);
        SecureRandom.getRandomValues(primaryEntropy);

        // Generate additional entropy source
        const secondaryEntropy = CryptoJS.lib.WordArray.random(length);

        // Combine entropy sources
        const combinedEntropy = CryptoJS.lib.WordArray.create([
            ...Array.from(primaryEntropy),
            ...secondaryEntropy.words
        ]);

        // Apply key stretching
        const salt = CryptoJS.lib.WordArray.random(SALT_LENGTH);
        const key = CryptoJS.PBKDF2(
            combinedEntropy.toString(),
            salt,
            {
                keySize: (options.keySize || KEY_SIZE) / 32,
                iterations: options.iterations || PBKDF2_ITERATIONS,
                hasher: CryptoJS.algo.SHA512
            }
        );

        // Clean up sensitive data
        combinedEntropy.clear();
        salt.clear();

        return key.toString();
    } catch (error) {
        logger.error('Error generating encryption key', { error });
        throw new Error('Failed to generate secure encryption key');
    }
}

/**
 * Encrypts data using AES-256-GCM with enhanced security measures
 * @param data Data to encrypt
 * @param key Encryption key
 * @param options Encryption options
 * @returns Promise<EncryptedData> Encrypted data object
 */
export async function encryptData(
    data: any,
    key: string,
    options: EncryptionOptions = {}
): Promise<EncryptedData> {
    try {
        // Input validation
        if (!data || !key) {
            throw new Error('Invalid encryption parameters');
        }

        // Generate IV and salt
        const iv = CryptoJS.lib.WordArray.random(IV_LENGTH);
        const salt = CryptoJS.lib.WordArray.random(SALT_LENGTH);

        // Derive key using PBKDF2
        const derivedKey = CryptoJS.PBKDF2(
            key,
            salt,
            {
                keySize: KEY_SIZE / 32,
                iterations: options.iterations || PBKDF2_ITERATIONS,
                hasher: CryptoJS.algo.SHA512
            }
        );

        // Prepare data for encryption
        const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
        const dataWords = CryptoJS.enc.Utf8.parse(jsonData);

        // Perform encryption
        const cipher = CryptoJS.AES.encrypt(dataWords, derivedKey, {
            iv: iv,
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.Pkcs7
        });

        // Generate authentication tag
        const authTag = cipher.getAuthTag();

        // Clean up sensitive data
        derivedKey.clear();
        dataWords.clear();

        return {
            ciphertext: cipher.ciphertext.toString(CryptoJS.enc.Base64),
            iv: iv.toString(CryptoJS.enc.Base64),
            salt: salt.toString(CryptoJS.enc.Base64),
            authTag: authTag.toString(CryptoJS.enc.Base64)
        };
    } catch (error) {
        logger.error('Encryption error', { error });
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypts AES-256-GCM encrypted data with enhanced validation
 * @param encryptedData Encrypted data object
 * @param key Decryption key
 * @returns Promise<any> Decrypted data
 */
export async function decryptData(
    encryptedData: EncryptedData,
    key: string
): Promise<any> {
    try {
        // Validate encrypted data format
        if (!encryptedData?.ciphertext || !encryptedData?.iv || !encryptedData?.salt || !encryptedData?.authTag) {
            throw new Error('Invalid encrypted data format');
        }

        // Parse components
        const ciphertext = CryptoJS.enc.Base64.parse(encryptedData.ciphertext);
        const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);
        const salt = CryptoJS.enc.Base64.parse(encryptedData.salt);
        const authTag = CryptoJS.enc.Base64.parse(encryptedData.authTag);

        // Derive key
        const derivedKey = CryptoJS.PBKDF2(
            key,
            salt,
            {
                keySize: KEY_SIZE / 32,
                iterations: PBKDF2_ITERATIONS,
                hasher: CryptoJS.algo.SHA512
            }
        );

        // Prepare cipher parameters
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: ciphertext,
            iv: iv,
            salt: salt,
            algorithm: CryptoJS.algo.AES,
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.Pkcs7,
            blockSize: 4
        });

        // Set authentication tag
        cipherParams.setAuthTag(authTag);

        // Perform decryption
        const decrypted = CryptoJS.AES.decrypt(cipherParams, derivedKey, {
            iv: iv,
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.Pkcs7
        });

        // Clean up sensitive data
        derivedKey.clear();

        // Parse and validate decrypted data
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        try {
            return JSON.parse(decryptedStr);
        } catch {
            return decryptedStr;
        }
    } catch (error) {
        logger.error('Decryption error', { error });
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Creates a secure hash of a password using enhanced PBKDF2
 * @param password Password to hash
 * @param options Hashing options
 * @returns Promise<HashedPassword> Secure password hash object
 */
export async function hashPassword(
    password: string,
    options: EncryptionOptions = {}
): Promise<HashedPassword> {
    try {
        // Validate password strength
        const passwordStrength = zxcvbn(password);
        if (passwordStrength.score < MIN_PASSWORD_STRENGTH) {
            throw new Error('Password does not meet minimum strength requirements');
        }

        // Generate high-entropy salt
        const salt = CryptoJS.lib.WordArray.random(SALT_LENGTH);

        // Apply PBKDF2 with increased iterations
        const iterations = options.iterations || PBKDF2_ITERATIONS;
        const hash = CryptoJS.PBKDF2(
            password,
            salt,
            {
                keySize: KEY_SIZE / 32,
                iterations: iterations,
                hasher: CryptoJS.algo.SHA512
            }
        );

        // Clean up password from memory
        password = '';

        return {
            hash: hash.toString(CryptoJS.enc.Base64),
            salt: salt.toString(CryptoJS.enc.Base64),
            iterations: iterations,
            version: '2024.1'
        };
    } catch (error) {
        logger.error('Password hashing error', { error });
        throw new Error('Failed to hash password');
    }
}