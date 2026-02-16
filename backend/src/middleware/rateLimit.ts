import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from '@shared/errors';
import { config } from '@config/index';

export const defaultRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.isDevelopment ? 10000 : 1000, // Very high limit for development/testing
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many requests, please try again later'));
  },
  skip: () => config.isTest,
});

// Stricter rate limit for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes (increased for development)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many authentication attempts, please try again later'));
  },
  skip: () => config.isTest,
});

// AI chat rate limit: 20 requests per user per minute
export const aiChatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Per authenticated user rate limiting
    return req.user?.id || req.ip || 'anonymous';
  },
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('AI chat rate limit exceeded. Please wait a moment before sending more messages.'));
  },
  skip: () => config.isTest,
});

// Even stricter for password reset
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many password reset attempts, please try again later'));
  },
  skip: () => config.isTest,
});
