import { databaseConfig } from './database';
import { env } from './env';

export const config = {
  // Server
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  apiVersion: env.API_VERSION,
  corsOrigin: env.CORS_ORIGIN,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  isDevelopment: env.NODE_ENV === 'development',

  // Database
  database: databaseConfig,

  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },

  // Logging
  logLevel: env.LOG_LEVEL,

  // Session
  session: {
    absoluteTimeoutHours: env.SESSION_ABSOLUTE_TIMEOUT_HOURS,
    idleTimeoutMinutes: env.SESSION_IDLE_TIMEOUT_MINUTES,
  },

  // External Services
  externalServices: {
    useMockNvd: env.USE_MOCK_NVD,
    useMockEmail: env.USE_MOCK_EMAIL,
    useMockLdap: env.USE_MOCK_LDAP,
    useMockPatches: env.USE_MOCK_PATCHES,
  },

  // SMTP (only used if not mocking)
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM || 'noreply@patchiq.io',
  },

  // LDAP (only used if not mocking)
  ldap: {
    host: env.LDAP_HOST,
    port: env.LDAP_PORT,
    baseDn: env.LDAP_BASE_DN,
    bindDn: env.LDAP_BIND_DN,
    bindPassword: env.LDAP_BIND_PASSWORD,
  },

  // NVD API (only used if not mocking)
  nvd: {
    apiKey: env.NIST_NVD_API_KEY,
  },

  // Encryption
  encryption: {
    key: env.ENCRYPTION_KEY || 'default-dev-key-change-in-production',
  },

  // AI / OpenRouter
  ai: {
    apiKey: env.OPENROUTER_API_KEY,
    baseUrl: env.OPENROUTER_BASE_URL,
    model: env.OPENROUTER_MODEL,
    maxTokens: env.OPENROUTER_MAX_TOKENS,
  },
};

export type Config = typeof config;

export { env } from './env';
