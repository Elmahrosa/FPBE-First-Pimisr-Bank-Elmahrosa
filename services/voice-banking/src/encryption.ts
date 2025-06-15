import * as crypto from "crypto";

/**
 * Encrypts audio or binary data using AES-256-GCM.
 * @param data Buffer of the data to encrypt (e.g. voice recording)
 * @param key 32-byte Buffer (256 bits)
 * @returns Buffer containing IV + Auth Tag + Ciphertext
 */
export function encryptVoiceData(data: Buffer, key: Buffer): Buffer {
  if (key.length !== 32) {
    throw new Error("Encryption key must be 32 bytes (256 bits)");
  }
  const iv = crypto.randomBytes(12); // 96-bit nonce is recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Output concatenates: [IV][AuthTag][Ciphertext]
  return Buffer.concat([iv, authTag, ciphertext]);
}

/**
 * Decrypts data encrypted by encryptVoiceData.
 * @param encrypted Buffer containing IV + Auth Tag + Ciphertext
 * @param key 32-byte Buffer (256 bits)
 * @returns Decrypted Buffer
 */
export function decryptVoiceData(encrypted: Buffer, key: Buffer): Buffer {
  if (key.length !== 32) {
    throw new Error("Decryption key must be 32 bytes (256 bits)");
  }
  const iv = encrypted.subarray(0, 12);
  const authTag = encrypted.subarray(12, 28);
  const ciphertext = encrypted.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Securely generates a random 256-bit (32-byte) key.
 * Store this key safely; do not hard-code in production.
 */
export function generateEncryptionKey(): Buffer {
  return crypto.randomBytes(32);
}
