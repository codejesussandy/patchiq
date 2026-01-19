import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile });

// Environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Session Settings
  SESSION_ABSOLUTE_TIMEOUT_HOURS: z.string().transform(Number).default('8'),
  SESSION_IDLE_TIMEOUT_MINUTES: z.string().transform(Number).default('30'),

  // External Services Mocking
  USE_MOCK_NVD: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  USE_MOCK_EMAIL: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  USE_MOCK_LDAP: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  USE_MOCK_PATCHES: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // Optional: NIST NVD API
  NIST_NVD_API_KEY: z.string().optional(),

  // Optional: SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Optional: LDAP
  LDAP_HOST: z.string().optional(),
  LDAP_PORT: z.string().transform(Number).optional(),
  LDAP_BASE_DN: z.string().optional(),
  LDAP_BIND_DN: z.string().optional(),
  LDAP_BIND_PASSWORD: z.string().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32).optional(),
});

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      console.error('Environment validation failed:');
      missingVars.forEach((v) => console.error(`  - ${v}`));
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
