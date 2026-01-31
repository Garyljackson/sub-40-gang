import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken, decryptToken, isEncrypted } from '@/lib/encryption';

// Test encryption key (32 bytes, base64 encoded)
// Generated with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
const TEST_ENCRYPTION_KEY = 'MKVHIXrmCyQTkZc2slhk1WelypV16VeNQ5sdWEvwidE=';

describe('encryption', () => {
  beforeEach(() => {
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', TEST_ENCRYPTION_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('encryptToken and decryptToken', () => {
    it('round-trips a simple token', () => {
      const token = 'abc123xyz';
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('round-trips a typical Strava access token', () => {
      const token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0';
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('round-trips a long token', () => {
      const token = 'a'.repeat(500);
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('round-trips tokens with special characters', () => {
      const token = 'token-with-special_chars.and/slashes+plus=equals';
      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(token);
    });

    it('produces different ciphertext for same plaintext (due to random IV)', () => {
      const token = 'test-token-123';
      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);
      expect(encrypted1).not.toBe(encrypted2);
      // But both decrypt to the same value
      expect(decryptToken(encrypted1)).toBe(token);
      expect(decryptToken(encrypted2)).toBe(token);
    });

    it('encrypted output is base64 encoded', () => {
      const token = 'test-token';
      const encrypted = encryptToken(token);
      // Valid base64 should not throw when decoded
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
      // Should match base64 pattern
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('encrypted output is longer than input', () => {
      const token = 'short';
      const encrypted = encryptToken(token);
      // Encrypted includes IV (12 bytes) + ciphertext + auth tag (16 bytes)
      expect(encrypted.length).toBeGreaterThan(token.length);
    });
  });

  describe('error handling', () => {
    it('throws when TOKEN_ENCRYPTION_KEY is not set', () => {
      vi.stubEnv('TOKEN_ENCRYPTION_KEY', '');
      expect(() => encryptToken('test')).toThrow(
        'TOKEN_ENCRYPTION_KEY environment variable is not set'
      );
    });

    it('throws when TOKEN_ENCRYPTION_KEY is wrong length', () => {
      vi.stubEnv('TOKEN_ENCRYPTION_KEY', Buffer.from('too-short').toString('base64'));
      expect(() => encryptToken('test')).toThrow('TOKEN_ENCRYPTION_KEY must be 32 bytes');
    });

    it('throws when decrypting with wrong key', () => {
      const token = 'test-token';
      const encrypted = encryptToken(token);

      // Change to a different valid key
      const differentKey = Buffer.from('different-key-that-is-32-bytes!').toString('base64');
      vi.stubEnv('TOKEN_ENCRYPTION_KEY', differentKey);

      expect(() => decryptToken(encrypted)).toThrow();
    });

    it('throws when decrypting invalid base64', () => {
      expect(() => decryptToken('not-valid-base64!!!')).toThrow();
    });

    it('throws when decrypting truncated ciphertext', () => {
      const token = 'test-token';
      const encrypted = encryptToken(token);
      const truncated = encrypted.slice(0, 10);
      expect(() => decryptToken(truncated)).toThrow('Invalid encrypted token: too short');
    });

    it('throws when decrypting tampered ciphertext', () => {
      const token = 'test-token';
      const encrypted = encryptToken(token);

      // Tamper with the encrypted data
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[20] = ((buffer[20] ?? 0) + 1) % 256; // Flip a byte
      const tampered = buffer.toString('base64');

      expect(() => decryptToken(tampered)).toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('returns true for encrypted tokens', () => {
      const token = 'test-token';
      const encrypted = encryptToken(token);
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('returns false for short strings', () => {
      expect(isEncrypted('short')).toBe(false);
      expect(isEncrypted('a1b2c3d4e5f6g7h8')).toBe(false);
    });

    it('returns false for typical raw Strava tokens', () => {
      // Raw Strava tokens are ~40 characters
      const rawToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0';
      expect(isEncrypted(rawToken)).toBe(false);
    });

    it('returns false for invalid base64', () => {
      // Long but not valid base64
      expect(isEncrypted('this-is-not-base64-but-is-long-enough-to-pass-length-check!!!')).toBe(
        false
      );
    });

    it('returns true for properly encrypted long tokens', () => {
      const longToken = 'a'.repeat(100);
      const encrypted = encryptToken(longToken);
      expect(isEncrypted(encrypted)).toBe(true);
    });
  });
});
