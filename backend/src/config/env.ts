import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile });

// Environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('1h'),
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
    .default('false'),
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

  // NIST NVD API
  NIST_NVD_API_KEY: z.string().optional(),
  NVD_API_URL: z.string().url().optional().default('https://services.nvd.nist.gov/rest/json/cves/2.0'),

  // MITRE CVE
  MITRE_CVE_URL: z.string().url().optional().default('https://cveawg.mitre.org/api/cve'),
  MITRE_CVE_GITHUB_URL: z.string().url().optional().default('https://raw.githubusercontent.com/CVEProject/cvelistV5/main'),

  // CISA KEV (Known Exploited Vulnerabilities)
  CISA_KEV_URL: z.string().url().optional().default('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'),

  // EPSS (Exploit Prediction Scoring System)
  FIRST_EPSS_URL: z.string().url().optional().default('https://api.first.org/data/v1/epss'),

  // OVAL Repositories
  OVAL_CIS_URL: z.string().optional().default('https://oval.cisecurity.org'),
  OVAL_REDHAT_URL: z.string().optional().default('https://www.redhat.com/security/data/oval/v2'),
  OVAL_UBUNTU_URL: z.string().optional().default('https://security-metadata.canonical.com/oval'),
  OVAL_DEBIAN_URL: z.string().optional().default('https://www.debian.org/security/oval'),
  OVAL_SUSE_URL: z.string().optional().default('http://ftp.suse.com/pub/projects/security/oval'),
  OVAL_ORACLE_URL: z.string().optional().default('https://linux.oracle.com/security/oval'),
  OVAL_ALPINE_URL: z.string().optional().default('https://secdb.alpinelinux.org'),

  // Microsoft Security
  MSRC_API_URL: z.string().url().optional().default('https://api.msrc.microsoft.com'),
  MS_UPDATE_CATALOG_URL: z.string().optional().default('https://www.catalog.update.microsoft.com'),

  // Third-Party Security Feeds
  GITHUB_ADVISORY_URL: z.string().url().optional().default('https://api.github.com/advisories'),
  GITHUB_TOKEN: z.string().optional(),

  // CVE Sync Settings
  CVE_SYNC_INTERVAL_HOURS: z.string().transform(Number).optional().default('24'),
  CVE_SYNC_BATCH_SIZE: z.string().transform(Number).optional().default('1000'),
  CVE_SYNC_MAX_PAGES: z.string().transform(Number).optional().default('100'),

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

  // Redis (for BullMQ job queue)
  REDIS_URL: z.string().url().optional().default('redis://localhost:3003'),

  // Backend Public URL (for agent downloads)
  // This is the URL agents use to reach the backend from outside the Docker network
  BACKEND_PUBLIC_URL: z.string().url().optional().default('http://localhost:3001'),

  // MinIO (Patch Repository Storage)
  MINIO_ENDPOINT: z.string().optional().default('localhost'),
  MINIO_PORT: z.string().transform(Number).optional().default('3008'),
  MINIO_ACCESS_KEY: z.string().optional().default('patchiq_admin'),
  MINIO_SECRET_KEY: z.string().optional().default('patchiq_secret_key'),
  MINIO_BUCKET: z.string().optional().default('patches'),
  MINIO_USE_SSL: z
    .string()
    .transform((v) => v === 'true')
    .optional()
    .default('false'),
  // Public MinIO endpoint for agents outside Docker network
  MINIO_PUBLIC_ENDPOINT: z.string().optional(),
  MINIO_PUBLIC_PORT: z.string().transform(Number).optional(),

  // AI / OpenRouter
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().optional().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().optional().default('anthropic/claude-sonnet-4-20250514'),
  OPENROUTER_MAX_TOKENS: z.string().transform(Number).optional().default('1024'),
});

// Validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      // Use console.error here since logger depends on env config being loaded first
      console.error('Environment validation failed:');
      missingVars.forEach((v) => console.error(`  - ${v}`));
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

export type Env = z.infer<typeof envSchema>;
