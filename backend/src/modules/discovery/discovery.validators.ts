import { z } from 'zod';

// ============================================
// IP Range Validators
// ============================================

// CIDR notation regex: matches formats like 192.168.1.0/24
const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/;

const scanScheduleSchema = z.object({
  type: z.enum(['ONCE', 'DAILY', 'WEEKLY']),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
  dayOfWeek: z.number().min(0).max(6).optional(), // 0 = Sunday, 6 = Saturday
});

export const createIPRangeSchema = z.object({
  name: z.string().min(2).max(100),
  range: z.string().regex(cidrRegex, 'Invalid CIDR notation (e.g., 192.168.1.0/24)'),
  description: z.string().max(500).optional(),
  credentialId: z.string().uuid().optional(),
  scanSchedule: scanScheduleSchema.optional(),
});

export const updateIPRangeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  range: z.string().regex(cidrRegex, 'Invalid CIDR notation').optional(),
  description: z.string().max(500).optional().nullable(),
  credentialId: z.string().uuid().optional().nullable(),
  scanSchedule: scanScheduleSchema.optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const listIPRangesQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// ============================================
// Credential Validators
// ============================================

export const createCredentialSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['SSH', 'WINDOWS', 'SNMP', 'WINRM']),
  username: z.string().min(1).max(100).optional(),
  password: z.string().min(1).max(256).optional(),
  domain: z.string().max(100).optional(),
  snmpCommunity: z.string().max(100).optional(),
  snmpVersion: z.enum(['V2C', 'V3']).optional(),
  port: z.number().int().positive().max(65535).optional(),
  description: z.string().max(500).optional(),
}).refine(
  (data) => {
    // SSH and WinRM require username
    if ((data.type === 'SSH' || data.type === 'WINRM') && !data.username) {
      return false;
    }
    // Windows requires username
    if (data.type === 'WINDOWS' && !data.username) {
      return false;
    }
    // SNMP requires community string
    if (data.type === 'SNMP' && !data.snmpCommunity) {
      return false;
    }
    return true;
  },
  {
    message: 'Required fields missing for credential type',
  }
);

export const updateCredentialSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(['SSH', 'WINDOWS', 'SNMP', 'WINRM']).optional(),
  username: z.string().min(1).max(100).optional(),
  password: z.string().min(1).max(256).optional(),
  domain: z.string().max(100).optional().nullable(),
  snmpCommunity: z.string().max(100).optional().nullable(),
  snmpVersion: z.enum(['V2C', 'V3']).optional().nullable(),
  port: z.number().int().positive().max(65535).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const listCredentialsQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  search: z.string().optional(),
  type: z.enum(['SSH', 'WINDOWS', 'SNMP', 'WINRM']).optional(),
});

export const getCredentialQuerySchema = z.object({
  showPassword: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const testCredentialSchema = z.object({
  targetHost: z.string().ip({ message: 'Invalid IP address' }),
});

// ============================================
// Scan Validators
// ============================================

export const getScanResultsQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

// ============================================
// Discovered Device Validators
// ============================================

export const listDiscoveredDevicesQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  ipRangeId: z.string().uuid().optional(),
  status: z.enum(['DISCOVERED', 'ENROLLED', 'IGNORED']).optional(),
  search: z.string().optional(),
});

export const enrollDeviceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.string().max(50).optional(),
});

// ============================================
// Type Exports
// ============================================

export type CreateIPRangeInput = z.infer<typeof createIPRangeSchema>;
export type UpdateIPRangeInput = z.infer<typeof updateIPRangeSchema>;
export type ListIPRangesQuery = z.infer<typeof listIPRangesQuerySchema>;

export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;
export type ListCredentialsQuery = z.infer<typeof listCredentialsQuerySchema>;
export type TestCredentialInput = z.infer<typeof testCredentialSchema>;
export type GetCredentialQuery = z.infer<typeof getCredentialQuerySchema>;

export type GetScanResultsQuery = z.infer<typeof getScanResultsQuerySchema>;
export type ListDiscoveredDevicesQuery = z.infer<typeof listDiscoveredDevicesQuerySchema>;
export type EnrollDeviceInput = z.infer<typeof enrollDeviceSchema>;
