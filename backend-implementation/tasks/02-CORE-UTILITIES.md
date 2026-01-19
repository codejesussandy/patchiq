# Task 02: Core Utilities

## Overview
Implement shared utilities including JWT handling, encryption, validation, error handling, and common middleware.

**Priority:** P0 - Foundation
**Dependencies:** Task 00
**Estimated Complexity:** Medium
**Parallel:** Yes (with Task 01)

---

## Objective
Create reusable utilities and middleware that all modules will depend on.

---

## Files to Create

```
src/
├── shared/
│   ├── types/
│   │   ├── index.ts              # Type exports
│   │   ├── api.types.ts          # API request/response types
│   │   └── common.types.ts       # Common types
│   ├── utils/
│   │   ├── jwt.ts                # JWT sign/verify
│   │   ├── crypto.ts             # Encryption/hashing
│   │   ├── date.ts               # Date utilities
│   │   └── pagination.ts         # Pagination helpers
│   ├── validators/
│   │   ├── index.ts              # Validator exports
│   │   ├── common.ts             # Common validators
│   │   └── auth.ts               # Auth validators
│   └── errors/
│       ├── index.ts              # Error exports
│       ├── AppError.ts           # Base error class
│       └── httpErrors.ts         # HTTP-specific errors
├── middleware/
│   ├── auth.ts                   # JWT auth middleware
│   ├── error.ts                  # Error handling middleware
│   ├── validation.ts             # Request validation middleware
│   ├── rateLimit.ts              # Rate limiting middleware
│   └── audit.ts                  # Audit logging middleware
└── config/
    ├── index.ts                  # Config loader
    └── env.ts                    # Environment validation
```

---

## Implementation

### 1. Configuration

**src/config/env.ts:**
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // External Services (optional)
  NIST_NVD_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}
```

**src/config/index.ts:**
```typescript
import { validateEnv } from './env';

const env = validateEnv();

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,

  database: {
    url: env.DATABASE_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  cors: {
    origin: env.CORS_ORIGIN,
  },

  logging: {
    level: env.LOG_LEVEL,
  },

  external: {
    nistApiKey: env.NIST_NVD_API_KEY,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  },
} as const;

export type Config = typeof config;
```

---

### 2. Error Handling

**src/shared/errors/AppError.ts:**
```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}
```

**src/shared/errors/httpErrors.ts:**
```typescript
import { AppError } from './AppError';

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', details?: Record<string, unknown>) {
    super(message, 400, true, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, true);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 400, true, details);
    this.name = 'ValidationError';
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true);
    this.name = 'TooManyRequestsError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false);
    this.name = 'InternalServerError';
  }
}
```

---

### 3. JWT Utilities

**src/shared/utils/jwt.ts:**
```typescript
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { config } from '@config/index';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DecodedToken extends TokenPayload, JwtPayload {}

/**
 * Parse duration string to seconds
 * Supports: 15m, 1h, 7d, etc.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Invalid duration unit: ${unit}`);
  }
}

/**
 * Generate an access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: parseDuration(config.jwt.accessExpiry),
    algorithm: 'HS256',
  };

  return jwt.sign(payload, config.jwt.secret, options);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: parseDuration(config.jwt.refreshExpiry),
    algorithm: 'HS256',
  };

  return jwt.sign({ ...payload, type: 'refresh' }, config.jwt.secret, options);
}

/**
 * Verify and decode a token
 */
export function verifyToken(token: string): DecodedToken {
  return jwt.verify(token, config.jwt.secret) as DecodedToken;
}

/**
 * Decode token without verification (for expired tokens)
 */
export function decodeToken(token: string): DecodedToken | null {
  return jwt.decode(token) as DecodedToken | null;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  return Date.now() >= decoded.exp * 1000;
}

/**
 * Generate both tokens
 */
export function generateTokenPair(payload: TokenPayload): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}
```

---

### 4. Crypto Utilities

**src/shared/utils/crypto.ts:**
```typescript
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a hash of a string (for storing tokens)
 */
export function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Encrypt sensitive data (AES-256-CBC)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
```

---

### 5. Common Validators

**src/shared/validators/common.ts:**
```typescript
import { z } from 'zod';

// Common field validators
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  search: z.string().max(100).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'Start date must be before or equal to end date' }
);

// Type exports
export type Pagination = z.infer<typeof paginationSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
```

**src/shared/validators/auth.ts:**
```typescript
import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from './common';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const completeOnboardingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  contactNumber: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
```

---

### 6. Middleware

**src/middleware/auth.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, DecodedToken } from '@shared/utils/jwt';
import { UnauthorizedError } from '@shared/errors/httpErrors';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

/**
 * Authenticate requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authentication required');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Invalid authorization format');
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid token'));
    }
  }
}

/**
 * Optional authentication - sets user if token present, continues if not
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');

      if (scheme === 'Bearer' && token) {
        const decoded = verifyToken(token);
        req.user = decoded;
      }
    }

    next();
  } catch {
    // Ignore token errors for optional auth
    next();
  }
}

/**
 * Check if user has required role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
}
```

**src/middleware/error.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/errors/AppError';
import { config } from '@config/index';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Handle AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;

    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'Resource already exists',
        details: { field: prismaError.meta?.target },
      });
    }

    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Resource not found',
      });
    }
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Validation failed',
      details: (err as any).errors,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'UnauthorizedError',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'UnauthorizedError',
      message: 'Token expired',
    });
  }

  // Default error response
  return res.status(500).json({
    error: 'InternalServerError',
    message: config.nodeEnv === 'production'
      ? 'Internal server error'
      : err.message,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'NotFoundError',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
```

**src/middleware/validation.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '@shared/errors/httpErrors';

interface ValidateOptions {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Validate request body, params, and/or query against Zod schemas
 */
export function validate(schemas: ValidateOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      next();
    } catch (error: any) {
      const details = error.errors?.reduce((acc: Record<string, string>, err: any) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {});

      next(new ValidationError('Validation failed', details));
    }
  };
}
```

**src/middleware/rateLimit.ts:**
```typescript
import rateLimit from 'express-rate-limit';
import { config } from '@config/index';

/**
 * Default rate limiter
 */
export const defaultRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'TooManyRequestsError',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'TooManyRequestsError',
    message: 'Too many attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
});
```

**src/middleware/audit.ts:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/db/client';

interface AuditOptions {
  action: string;
  module: string;
  getEntityId?: (req: Request) => string | undefined;
  getEntityType?: (req: Request) => string | undefined;
}

/**
 * Create audit log entry after successful response
 */
export function audit(options: AuditOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(body: any) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logEntry = {
          userId: req.user?.userId,
          action: options.action,
          module: options.module,
          entityId: options.getEntityId?.(req),
          entityType: options.getEntityType?.(req),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        };

        // Fire and forget - don't wait for audit log
        prisma.auditLog.create({ data: logEntry }).catch(console.error);
      }

      return originalSend.call(this, body);
    };

    next();
  };
}
```

---

### 7. Pagination & Date Utilities

**src/shared/utils/pagination.ts:**
```typescript
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Calculate pagination values for Prisma
 */
export function getPaginationParams(params: PaginationParams) {
  const { page, limit, sort, order } = params;

  return {
    skip: (page - 1) * limit,
    take: limit,
    orderBy: sort ? { [sort]: order || 'desc' } : undefined,
  };
}

/**
 * Create paginated response
 */
export function paginate<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  };
}
```

**src/shared/utils/date.ts:**
```typescript
import { formatDistanceToNow, format, parseISO } from 'date-fns';

/**
 * Get relative time string (e.g., "2 minutes ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format date to ISO string
 */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

/**
 * Add time duration to date
 */
export function addDuration(date: Date, duration: string): Date {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const result = new Date(date);

  switch (unit) {
    case 's': result.setSeconds(result.getSeconds() + value); break;
    case 'm': result.setMinutes(result.getMinutes() + value); break;
    case 'h': result.setHours(result.getHours() + value); break;
    case 'd': result.setDate(result.getDate() + value); break;
  }

  return result;
}
```

---

## TDD Scenarios

### Test: JWT Utilities

```typescript
// tests/unit/jwt.test.ts
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  isTokenExpired
} from '@shared/utils/jwt';

describe('JWT Utilities', () => {
  const payload = { userId: 'test-id', email: 'test@test.com', role: 'user' };

  it('should generate access token', () => {
    const token = generateAccessToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('should verify valid token', () => {
    const token = generateAccessToken(payload);
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('should throw on invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });

  it('should detect expired token', () => {
    // Generate token with 1ms expiry
    jest.useFakeTimers();
    const token = generateAccessToken(payload);
    jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour

    expect(isTokenExpired(token)).toBe(true);
    jest.useRealTimers();
  });
});
```

### Test: Crypto Utilities

```typescript
// tests/unit/crypto.test.ts
import {
  hashPassword,
  comparePassword,
  encrypt,
  decrypt,
  generateToken
} from '@shared/utils/crypto';

describe('Crypto Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('TestPassword123');

      const isValid = await comparePassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt data', () => {
      const plaintext = 'sensitive-data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Token Generation', () => {
    it('should generate random token', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });
  });
});
```

### Test: Validators

```typescript
// tests/unit/validators.test.ts
import { loginSchema, resetPasswordSchema } from '@shared/validators/auth';

describe('Auth Validators', () => {
  describe('loginSchema', () => {
    it('should accept valid login', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should reject mismatched passwords', () => {
      const result = resetPasswordSchema.safeParse({
        token: 'reset-token',
        password: 'Password123',
        confirmPassword: 'DifferentPassword',
      });

      expect(result.success).toBe(false);
    });
  });
});
```

### Test: Middleware

```typescript
// tests/unit/middleware.test.ts
import request from 'supertest';
import express from 'express';
import { authenticate } from '@middleware/auth';
import { errorHandler } from '@middleware/error';
import { generateAccessToken } from '@shared/utils/jwt';

describe('Auth Middleware', () => {
  const app = express();

  app.get('/protected', authenticate, (req, res) => {
    res.json({ userId: req.user?.userId });
  });

  app.use(errorHandler);

  it('should reject request without token', async () => {
    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UnauthorizedError');
  });

  it('should accept request with valid token', async () => {
    const token = generateAccessToken({
      userId: 'test-id',
      email: 'test@test.com',
      role: 'user',
    });

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe('test-id');
  });

  it('should reject invalid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });
});
```

---

## Verification Checklist

- [ ] All utility functions have unit tests
- [ ] JWT sign/verify works correctly
- [ ] Password hashing uses bcrypt with 10+ rounds
- [ ] Encryption uses AES-256
- [ ] All validators have proper error messages
- [ ] Error handler catches all error types
- [ ] Rate limiting is configured
- [ ] Auth middleware extracts user correctly
- [ ] Validation middleware works with Zod

---

## Next Task
After completing this task, proceed to:
- **Task 03: Auth Module** - Uses JWT and crypto utilities
- **Task 04-07** - All modules use these utilities
