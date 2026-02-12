import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '@shared/errors';
import { TokenPayload, TokenPair } from '@shared/types';
import { config } from '@config/index';

/**
 * Generate a unique JWT ID (jti) to ensure token uniqueness
 */
function generateJti(): string {
  return crypto.randomUUID();
}

export function signAccessToken(payload: Omit<TokenPayload, 'type'>): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'],
    jwtid: generateJti(), // Add unique identifier to prevent token collision
  };
  return jwt.sign({ ...payload, type: 'access' }, config.jwt.secret, options);
}

export function signRefreshToken(payload: Omit<TokenPayload, 'type'>): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiry as jwt.SignOptions['expiresIn'],
    jwtid: generateJti(), // Add unique identifier to prevent token collision
  };
  return jwt.sign({ ...payload, type: 'refresh' }, config.jwt.secret, options);
}

export function generateTokenPair(payload: Omit<TokenPayload, 'type'>): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Token verification failed');
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || typeof decoded === 'string') {
    return null;
  }
  const exp = (decoded as jwt.JwtPayload).exp;
  return exp ? new Date(exp * 1000) : null;
}
