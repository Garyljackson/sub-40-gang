import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard nonce length
const TAG_LENGTH = 16; // GCM auth tag length

/**
 * Get the encryption key from environment variable.
 * Key must be 32 bytes, base64 encoded.
 *
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  const keyBuffer = Buffer.from(key, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (base64 encoded)');
  }
  return keyBuffer;
}

/**
 * Encrypt a token using AES-256-GCM.
 * Returns base64 encoded string containing: IV + ciphertext + auth tag
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv + encrypted + authTag)
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString('base64');
}

/**
 * Decrypt a token encrypted with encryptToken.
 * Expects base64 encoded string containing: IV + ciphertext + auth tag
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, 'base64');

  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted token: too short');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

/**
 * Check if a value appears to be encrypted (valid base64 with sufficient length).
 * Used during migration to skip already-encrypted tokens.
 *
 * Raw Strava tokens are ~40 characters. Encrypted tokens are 60+ characters
 * and valid base64.
 */
export function isEncrypted(value: string): boolean {
  if (value.length < 50) return false;

  // Check if it's valid base64 (strict pattern matching)
  // Base64 only contains A-Z, a-z, 0-9, +, /, and optional = padding
  if (!/^[A-Za-z0-9+/]+=*$/.test(value)) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, 'base64');
    // Must be at least IV + tag + some ciphertext
    return decoded.length >= IV_LENGTH + TAG_LENGTH + 10;
  } catch {
    return false;
  }
}
