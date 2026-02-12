import {
  signAccessToken,
  signRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  getTokenExpiration,
} from '@shared/utils/jwt';
import { UnauthorizedError } from '@shared/errors';

describe('JWT Utilities', () => {
  const testPayload = {
    userId: 'test-user-id',
    email: 'test@patchiq.io',
    role: 'ADMIN',
  };

  describe('Token Signing', () => {
    it('should sign an access token', () => {
      const token = signAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should sign a refresh token', () => {
      const token = signRefreshToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate token pair', () => {
      const { accessToken, refreshToken } = generateTokenPair(testPayload);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('Token Verification', () => {
    it('should verify a valid access token', () => {
      const token = signAccessToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.type).toBe('access');
    });

    it('should verify a valid refresh token', () => {
      const token = signRefreshToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded.type).toBe('refresh');
    });

    it('should throw UnauthorizedError for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for tampered token', () => {
      const token = signAccessToken(testPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyToken(tamperedToken)).toThrow(UnauthorizedError);
    });
  });

  describe('Token Decoding', () => {
    it('should decode token without verification', () => {
      const token = signAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testPayload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');

      expect(decoded).toBeNull();
    });
  });

  describe('Token Expiration', () => {
    it('should get token expiration date', () => {
      const token = signAccessToken(testPayload);
      const expiration = getTokenExpiration(token);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiration = getTokenExpiration('invalid-token');

      expect(expiration).toBeNull();
    });
  });
});
