import { prisma } from '@db/client';
import { BadRequestError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import type { SuccessResponse } from './settings.types';

const logger = createLogger('settings');

// ============================================
// Vulnerability Preference
// ============================================

export async function getVulnerabilityPreference(): Promise<Record<string, unknown>> {
  const dbSync = await prisma.vulnerabilityDBSync.findFirst();

  if (!dbSync) {
    return {
      id: '1',
      lastSyncAt: null,
      scanJobInterval: 24,
      scanJobUnit: 'Hour',
      databaseSyncTime: '02:00:00',
      totalCveCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    id: dbSync.id,
    lastSyncAt: dbSync.lastSync?.toISOString() ?? null,
    scanJobInterval: dbSync.scanJobInterval,
    scanJobUnit: dbSync.scanJobUnit,
    databaseSyncTime: dbSync.databaseSyncTime,
    totalCveCount: dbSync.totalCVE,
    createdAt: dbSync.createdAt.toISOString(),
  };
}

export async function updateVulnerabilityPreference(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  let dbSync = await prisma.vulnerabilityDBSync.findFirst();

  if (dbSync) {
    dbSync = await prisma.vulnerabilityDBSync.update({
      where: { id: dbSync.id },
      data: {
        scanJobInterval: input.scanJobInterval as number | undefined,
        scanJobUnit: input.scanJobUnit as string | undefined,
        databaseSyncTime: input.databaseSyncTime as string | undefined,
      },
    });
  } else {
    dbSync = await prisma.vulnerabilityDBSync.create({
      data: {
        scanJobInterval: (input.scanJobInterval as number) ?? 24,
        scanJobUnit: (input.scanJobUnit as string) ?? 'Hour',
        databaseSyncTime: (input.databaseSyncTime as string) ?? '02:00:00',
      },
    });
  }

  return getVulnerabilityPreference();
}

export async function syncVulnerabilityDatabase(): Promise<SuccessResponse> {
  const { queueCveSyncJob } = await import('@modules/vulnerabilities/cve-sync.worker');
  const result = await queueCveSyncJob({ incremental: true });

  logger.info({ jobId: result.jobId, alreadyRunning: result.alreadyRunning }, 'CVE database sync triggered');

  return {
    success: true,
    message: result.alreadyRunning ? 'CVE sync already in progress' : 'CVE database sync queued',
  };
}

// ============================================
// Platform License
// ============================================

export async function getPlatformLicense(): Promise<Record<string, unknown>> {
  const { computeLicenseStatus } = await import('./license.service');
  const settings = await prisma.setting.findMany({
    where: { category: 'license' },
  });

  const usedEndpoints = await prisma.agent.count();

  const defaults: Record<string, unknown> = {
    licenseTo: 'Unlicensed',
    licenseType: 'Trial',
    poNumber: null,
    invoiceNumber: null,
    email: '',
    partner: null,
    productCode: 'PATCHIQ',
    productVersion: '1.0.0',
    issueDate: new Date().toISOString().split('T')[0],
    expiresOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    numberOfEndpoints: 25,
    usedEndpoints,
    activationCode: '',
    remainingDays: 30,
    remainingEndpoints: 25 - usedEndpoints,
    status: 'TRIAL',
  };

  const result = { ...defaults };
  for (const setting of settings) {
    const key = setting.key.replace('license.', '');
    result[key] = setting.value;
  }

  result.usedEndpoints = usedEndpoints;

  if (result.expiresOn) {
    const expiryDate = new Date(result.expiresOn as string);
    const today = new Date();
    result.remainingDays = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const numberOfEndpoints = typeof result.numberOfEndpoints === 'string'
    ? parseInt(result.numberOfEndpoints as string, 10)
    : result.numberOfEndpoints as number;
  result.remainingEndpoints = Math.max(0, numberOfEndpoints - usedEndpoints);

  result.status = computeLicenseStatus(
    result.licenseType as string,
    result.expiresOn as string,
    usedEndpoints,
    numberOfEndpoints,
  );

  return result;
}

export async function updatePlatformLicense(licenseCode: string): Promise<Record<string, unknown>> {
  const { validateLicenseFormat, getLicenseType, getLicenseEndpointLimit, getLicenseExpiryDays } = await import('./license.service');

  const validation = validateLicenseFormat(licenseCode);
  if (!validation.valid) {
    throw new BadRequestError(validation.error || 'Invalid license code');
  }

  const licenseType = getLicenseType(licenseCode);
  const numberOfEndpoints = getLicenseEndpointLimit(licenseType);
  const expiryDays = getLicenseExpiryDays(licenseType);

  logger.info({ licenseCode: `****-****-****-${licenseCode.slice(-4)}`, licenseType }, 'License validated');

  const licenseData: Record<string, unknown> = {
    licenseTo: 'PatchIQ Customer',
    licenseType,
    productCode: 'PATCHIQ',
    productVersion: '1.0.0',
    issueDate: new Date().toISOString().split('T')[0],
    expiresOn: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    numberOfEndpoints,
    activationCode: licenseCode,
  };

  for (const [key, val] of Object.entries(licenseData)) {
    const jsonVal = val as string | number;
    await prisma.setting.upsert({
      where: { key: `license.${key}` },
      update: { value: jsonVal },
      create: { key: `license.${key}`, value: jsonVal, category: 'license' },
    });
  }

  return getPlatformLicense();
}

// ============================================
// Password Policy
// ============================================

export async function getPasswordPolicy(): Promise<Record<string, unknown>> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'passwordPolicy' },
  });

  const defaults = {
    minCharacterCount: 8,
    minNumbers: true,
    minLowerCaseCharacters: true,
    minUpperCaseCharacters: true,
    minSpecialCharacters: true,
  };

  if (!setting || !setting.value) {
    return defaults;
  }

  return { ...defaults, ...(setting.value as Record<string, unknown>) };
}

export async function updatePasswordPolicy(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const policy = await getPasswordPolicy();
  const updated = { ...policy, ...input };

  await prisma.setting.upsert({
    where: { key: 'passwordPolicy' },
    update: { value: updated as unknown as Record<string, string> },
    create: { key: 'passwordPolicy', value: updated as unknown as Record<string, string>, category: 'security' },
  });

  return getPasswordPolicy();
}
