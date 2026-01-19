import {
  hashPassword,
  comparePassword,
  generateToken,
  hashString,
  encrypt,
  decrypt,
  maskString,
} from '@shared/utils/crypto';

describe('Crypto Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Token Generation', () => {
    it('should generate token with default length', () => {
      const token = generateToken();

      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate token with custom length', () => {
      const token = generateToken(16);

      expect(token).toBeDefined();
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('String Hashing', () => {
    it('should hash a string consistently', () => {
      const input = 'test-string';
      const hash1 = hashString(input);
      const hash2 = hashString(input);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashString('string1');
      const hash2 = hashString('string2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt text', () => {
      const plaintext = 'sensitive data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'sensitive data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle special characters', () => {
      const plaintext = 'Test!@#$%^&*()_+-={}[]|:";\'<>?,./~`';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 🌍';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('String Masking', () => {
    it('should mask string showing last 4 characters', () => {
      const input = 'mysecretpassword';
      const masked = maskString(input);

      expect(masked).toBe('************word');
    });

    it('should mask string with custom visible chars', () => {
      const input = 'mysecretpassword';
      const masked = maskString(input, 6);

      expect(masked).toBe('**********ssword');
    });

    it('should fully mask short strings', () => {
      const input = 'abc';
      const masked = maskString(input, 4);

      expect(masked).toBe('***');
    });
  });
});
