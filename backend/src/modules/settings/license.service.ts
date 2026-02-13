import crypto from 'crypto';

/**
 * License code format: PIQ[EPT]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}
 * Last 4 chars = first 4 chars of SHA-256 hash of first 19 chars, uppercased
 *
 * PIQE = Enterprise (10000 endpoints, 365 days)
 * PIQP = Professional (100 endpoints, 365 days)
 * PIQT = Trial (25 endpoints, 30 days)
 */

export function validateLicenseFormat(code: string): { valid: boolean; error?: string } {
  const formatRegex = /^PIQ[EPT]-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!formatRegex.test(code)) {
    return { valid: false, error: 'Invalid license code format' };
  }

  // Checksum verification
  const prefix = code.substring(0, 19); // "PIQE-AB12-CD34-EF56"
  const providedChecksum = code.substring(20); // last 4 chars
  const expectedChecksum = computeChecksum(prefix);

  if (providedChecksum !== expectedChecksum) {
    return { valid: false, error: 'Invalid license code: checksum mismatch' };
  }

  return { valid: true };
}

export function computeChecksum(codePrefix: string): string {
  const hash = crypto.createHash('sha256').update(codePrefix).digest('hex');
  return hash.substring(0, 4).toUpperCase();
}

export function generateValidLicenseCode(prefix: 'PIQE' | 'PIQP' | 'PIQT'): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const codePrefix = `${prefix}-${segment()}-${segment()}-${segment()}`;
  const checksum = computeChecksum(codePrefix);
  return `${codePrefix}-${checksum}`;
}

export function getLicenseType(code: string): 'Trial' | 'Professional' | 'Enterprise' {
  const prefix = code.substring(0, 4);
  switch (prefix) {
    case 'PIQE': return 'Enterprise';
    case 'PIQP': return 'Professional';
    case 'PIQT': return 'Trial';
    default: return 'Trial';
  }
}

export function getLicenseEndpointLimit(type: string): number {
  switch (type) {
    case 'Enterprise': return 10000;
    case 'Professional': return 100;
    case 'Trial': return 25;
    default: return 25;
  }
}

export function getLicenseExpiryDays(type: string): number {
  switch (type) {
    case 'Enterprise': return 365;
    case 'Professional': return 365;
    case 'Trial': return 30;
    default: return 30;
  }
}

export interface LicenseData {
  licenseTo: string;
  licenseType: string;
  activationCode: string;
  productCode: string;
  productVersion: string;
  issueDate: string;
  expiresOn: string;
  numberOfEndpoints: number;
  usedEndpoints: number;
  remainingEndpoints: number;
  remainingDays: number;
  status: 'ACTIVE' | 'EXPIRED' | 'EXCEEDED' | 'TRIAL';
}

export function computeLicenseStatus(licenseType: string, expiresOn: string, usedEndpoints: number, numberOfEndpoints: number): 'ACTIVE' | 'EXPIRED' | 'EXCEEDED' | 'TRIAL' {
  const now = new Date();
  const expiry = new Date(expiresOn);

  if (expiry < now) return 'EXPIRED';
  if (usedEndpoints > numberOfEndpoints) return 'EXCEEDED';
  if (licenseType === 'Trial') return 'TRIAL';
  return 'ACTIVE';
}
