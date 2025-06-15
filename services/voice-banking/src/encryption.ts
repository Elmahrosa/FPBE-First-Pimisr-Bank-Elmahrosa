import * as crypto from "crypto";

/**
 * Encrypts audio or binary data using AES-256-GCM.
 * @param data Buffer or string to encrypt (e.g. voice recording).
 * @param key 32-byte Buffer (256 bits).
 * @param inputEncoding If data is a string, specify its encoding (default: 'utf8').
 * @returns Buffer containing: [0x01 version][IV(12)][AuthTag(16)][Ciphertext].
 */
export function encryptVoiceData(
  data: Buffer | string,
  key: Buffer,
  inputEncoding: BufferEncoding = "utf8"
): Buffer {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error("Encryption key must be a 32-byte Buffer (256 bits)");
  }
  const iv = crypto.randomBytes(12); // 12 bytes for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let input: Buffer;
  if (typeof data === "string") {
    input = Buffer.from(data, inputEncoding);
  } else if (Buffer.isBuffer(data)) {
    input = data;
  } else {
    throw new TypeError("Data must be a Buffer or string");
  }

  const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Version byte for extensibility (0x01), then [IV][AuthTag][Ciphertext]
  return Buffer.concat([Buffer.from([0x01]), iv, authTag, ciphertext]);
}

/**
 * Decrypts data encrypted by encryptVoiceData.
 * @param encrypted Buffer containing version + IV + AuthTag + Ciphertext.
 * @param key 32-byte Buffer (256 bits).
 * @param outputEncoding Optionally decode output to string (e.g., 'utf8').
 * @returns Decrypted Buffer or string.
 */
export function decryptVoiceData(
  encrypted: Buffer,
  key: Buffer,
  outputEncoding?: BufferEncoding
): Buffer | string {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error("Decryption key must be a 32-byte Buffer (256 bits)");
  }
  if (encrypted.length < 1 + 12 + 16) {
    throw new Error("Encrypted data is too short");
  }
  const version = encrypted.readUInt8(0);
  if (version !== 0x01) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }
  const iv = encrypted.subarray(1, 13);
  const authTag = encrypted.subarray(13, 29);
  const ciphertext = encrypted.subarray(29);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  if (outputEncoding) {
    return decrypted.toString(outputEncoding);
  }
  return decrypted;
}

/**
 * Securely generates a random 256-bit (32-byte) key.
 * Store this key securely; never hard-code in production.
 * @returns 32-byte Buffer.
 */
export function generateEncryptionKey(): Buffer {
  return crypto.randomBytes(32);
      }
