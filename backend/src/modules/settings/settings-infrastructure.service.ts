import { prisma } from '@db/client';
import { BadRequestError } from '@shared/errors';
import { encrypt, decrypt } from '@shared/utils/crypto';
import { emailService } from '@shared/services/email.service';
import { loadMailConfig } from '@shared/services/notification-email.service';
import { createLogger } from '@shared/services/logger';
import { minioStorage } from '@shared/services/minio.service';
import { proxyService, type ProxyConfig } from '@shared/services/proxy.service';
import { NotFoundError, ConflictError } from '@shared/errors';
import type { SuccessResponse } from './settings.types';

const logger = createLogger('settings');

// ============================================
// Server Settings
// ============================================

export async function getServerSettings(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany({
    where: { category: 'server' },
  });

  const defaults: Record<string, unknown> = {
    sessionTimeout: true,
    sessionTimeoutMinutes: 60,
    sessionIdleTimeoutMinutes: 15,
    endpointOnlineStatusTimeoutHours: 1,
    endpointScanJobTimeoutHours: 1,
    logLevel: 'Info',
  };

  const result = { ...defaults };
  for (const setting of settings) {
    const key = setting.key.replace('server.', '');
    result[key] = setting.value;
  }

  return result;
}

export async function updateServerSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
  const updates = Object.entries(input).filter(([, value]) => value !== undefined);

  for (const [key, value] of updates) {
    await prisma.setting.upsert({
      where: { key: `server.${key}` },
      update: { value: JSON.parse(JSON.stringify(value)) },
      create: { key: `server.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'server' },
    });
  }

  if (userId) {
    const changedFields = Object.keys(input).join(', ');
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'server-settings',
        resourceId: null,
        details: `Updated server settings: ${changedFields}`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }

  return getServerSettings();
}

// ============================================
// Proxy Server
// ============================================

export async function getProxyServer(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany({
    where: { category: 'proxy' },
  });

  const defaults: Record<string, unknown> = {
    enabled: false,
    host: null,
    port: null,
    protocol: null,
    enableAuthentication: false,
    username: null,
  };

  const result = { ...defaults };
  for (const setting of settings) {
    const key = setting.key.replace('proxy.', '');
    if (key !== 'password') {
      result[key] = setting.value;
    }
  }

  result.password = null;

  return result;
}

export async function updateProxyServer(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
  const updates = Object.entries(input).filter(([, value]) => value !== undefined);

  for (const [key, value] of updates) {
    let storedValue: unknown = value;
    if (key === 'password' && value) {
      storedValue = encrypt(value as string);
    }
    await prisma.setting.upsert({
      where: { key: `proxy.${key}` },
      update: { value: JSON.parse(JSON.stringify(storedValue)) },
      create: { key: `proxy.${key}`, value: JSON.parse(JSON.stringify(storedValue)), category: 'proxy' },
    });
  }

  if (userId) {
    const changedFields = Object.keys(input).map(k => k === 'password' ? 'password (updated)' : k).join(', ');
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'proxy-settings',
        resourceId: null,
        details: `Updated proxy settings: ${changedFields}`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }

  return getProxyServer();
}

export async function testProxyServer(_input: Record<string, unknown>): Promise<SuccessResponse> {
  const settings = await prisma.setting.findMany({
    where: { category: 'proxy' },
  });

  const proxyData: Record<string, unknown> = {
    enabled: false,
    host: null,
    port: null,
    protocol: null,
    enableAuthentication: false,
    username: null,
    password: null,
  };

  for (const setting of settings) {
    const key = setting.key.replace('proxy.', '');
    proxyData[key] = setting.value;
  }

  if (!proxyData.enabled) {
    throw new BadRequestError('Proxy is disabled. Enable it first.');
  }

  if (!proxyData.host || !proxyData.port || !proxyData.protocol) {
    throw new BadRequestError('Proxy configuration incomplete. Please configure host, port, and protocol.');
  }

  const host = proxyData.host as string;
  const port = Number(proxyData.port);
  const protocol = proxyData.protocol as 'HTTP' | 'HTTPS' | 'SOCKS5';

  let password: string | undefined;
  if (proxyData.password) {
    password = decrypt(proxyData.password as string);
  }

  logger.info({ host, port, protocol }, 'Testing proxy connection with saved config');

  const proxyConfig: ProxyConfig = {
    host,
    port,
    protocol,
    username: proxyData.username as string | undefined,
    password,
  };

  const result = await proxyService.testConnection(proxyConfig);

  if (!result.success) {
    throw new BadRequestError(result.message);
  }

  return {
    success: true,
    message: result.message,
  };
}

// ============================================
// Mail Server
// ============================================

export async function getMailServer(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany({
    where: { category: 'mail' },
  });

  const internal: Record<string, unknown> = {
    host: '',
    port: 587,
    secure: true,
    username: null,
    fromAddress: null,
    fromName: null,
  };

  for (const setting of settings) {
    const key = setting.key.replace('mail.', '');
    if (key !== 'password') {
      internal[key] = setting.value;
    }
  }

  let protocol: 'NONE' | 'SSL' | 'TLS' = 'NONE';
  if (internal.secure === true) {
    protocol = internal.port === 465 ? 'SSL' : 'TLS';
  }

  return {
    host: internal.host,
    port: internal.port,
    protocol,
    fromAddress: internal.fromAddress,
    fromName: internal.fromName,
    username: internal.username,
    password: null,
  };
}

export async function updateMailServer(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
  const PASSWORD_SENTINEL = '********';
  const normalized: Record<string, unknown> = {};

  if (input.host !== undefined) normalized.host = input.host;
  if (input.port !== undefined) normalized.port = Number(input.port);
  if (input.protocol !== undefined) {
    normalized.secure = input.protocol !== 'NONE';
  }
  if (input.fromAddress !== undefined) normalized.fromAddress = input.fromAddress;
  if (input.fromName !== undefined) normalized.fromName = input.fromName;
  if (input.username !== undefined) normalized.username = input.username;

  const password = input.password as string | undefined;
  if (password && password !== PASSWORD_SENTINEL) {
    normalized.password = password;
  }

  const updates = Object.entries(normalized).filter(([, value]) => value !== undefined);

  for (const [key, value] of updates) {
    let storedValue: unknown = value;
    if (key === 'password' && value) {
      storedValue = encrypt(value as string);
    }
    await prisma.setting.upsert({
      where: { key: `mail.${key}` },
      update: { value: JSON.parse(JSON.stringify(storedValue)) },
      create: { key: `mail.${key}`, value: JSON.parse(JSON.stringify(storedValue)), category: 'mail' },
    });
  }

  if (userId) {
    const changedFields = Object.keys(normalized).map(k => k === 'password' ? 'password (updated)' : k).join(', ');
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'mail-settings',
        resourceId: null,
        details: `Updated mail settings: ${changedFields}`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }

  return getMailServer();
}

export async function testMailServer(testEmail: string): Promise<SuccessResponse> {
  const mailConfig = await loadMailConfig();

  if (!mailConfig) {
    throw new BadRequestError('Mail server not configured. Save configuration first.');
  }

  logger.info({ host: mailConfig.host, port: mailConfig.port, testEmail }, 'Testing mail server connection');

  const result = await emailService.sendTestEmail(mailConfig, testEmail);

  if (!result.success) {
    return {
      success: false,
      message: result.message,
    };
  }

  return {
    success: true,
    message: 'Test email sent successfully',
  };
}

// ============================================
// Branding
// ============================================

export async function getBranding(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany({
    where: { category: 'branding' },
  });

  const defaults: Record<string, unknown> = {
    companyName: 'SkenzerIQ',
    logoUrl: null,
    logoFileName: null,
  };

  const result = { ...defaults };
  for (const setting of settings) {
    const key = setting.key.replace('branding.', '');
    result[key] = setting.value;
  }

  if (result.logoObjectKey) {
    result.logoUrl = '/v1/settings/branding/logo';
  }

  return result;
}

export async function getBrandingLogo(): Promise<{ objectKey: string; mimeType: string } | null> {
  const [objectKeySetting, fileNameSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'branding.logoObjectKey' } }),
    prisma.setting.findUnique({ where: { key: 'branding.logoFileName' } }),
  ]);

  if (!objectKeySetting?.value) {
    return null;
  }

  const objectKey = objectKeySetting.value as string;
  const fileName = (fileNameSetting?.value as string) || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };
  const mimeType = mimeTypes[ext] || 'image/png';

  return { objectKey, mimeType };
}

export async function updateBranding(
  input: { companyName?: string },
  logoFile?: { buffer: Buffer; originalname: string; mimetype: string },
  userId?: string,
  ipAddress?: string
): Promise<Record<string, unknown>> {
  const changedFields: string[] = [];

  if (input.companyName !== undefined) {
    await prisma.setting.upsert({
      where: { key: 'branding.companyName' },
      update: { value: JSON.parse(JSON.stringify(input.companyName)) },
      create: { key: 'branding.companyName', value: JSON.parse(JSON.stringify(input.companyName)), category: 'branding' },
    });
    changedFields.push('companyName');
  }

  if (logoFile) {
    const objectKey = `branding/logo-${Date.now()}-${logoFile.originalname}`;

    await minioStorage.uploadBuffer(objectKey, logoFile.buffer, {
      contentType: logoFile.mimetype,
      metadata: {
        'original-filename': logoFile.originalname,
      },
    });

    const logoUrl = await minioStorage.getPresignedUrl(objectKey, { expirySeconds: 604800 });

    await prisma.setting.upsert({
      where: { key: 'branding.logoUrl' },
      update: { value: JSON.parse(JSON.stringify(logoUrl)) },
      create: { key: 'branding.logoUrl', value: JSON.parse(JSON.stringify(logoUrl)), category: 'branding' },
    });

    await prisma.setting.upsert({
      where: { key: 'branding.logoFileName' },
      update: { value: JSON.parse(JSON.stringify(logoFile.originalname)) },
      create: { key: 'branding.logoFileName', value: JSON.parse(JSON.stringify(logoFile.originalname)), category: 'branding' },
    });

    await prisma.setting.upsert({
      where: { key: 'branding.logoObjectKey' },
      update: { value: JSON.parse(JSON.stringify(objectKey)) },
      create: { key: 'branding.logoObjectKey', value: JSON.parse(JSON.stringify(objectKey)), category: 'branding' },
    });

    changedFields.push(`logo file (${logoFile.originalname})`);
  }

  if (userId && changedFields.length > 0) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'branding',
        resourceId: null,
        details: `Updated branding: ${changedFields.join(', ')}`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }

  return getBranding();
}

// ============================================
// Vendor Logos
// ============================================

export async function listVendorLogos() {
  const logos = await prisma.vendorLogo.findMany({ orderBy: { createdAt: 'desc' } });
  return Promise.all(logos.map(async (logo) => ({
    ...logo,
    logoUrl: logo.objectKey
      ? await minioStorage.getPresignedUrl(logo.objectKey, { expirySeconds: 3600 })
      : logo.logoUrl,
  })));
}

export async function getVendorLogo(id: string) {
  const logo = await prisma.vendorLogo.findUnique({ where: { id } });
  if (!logo) throw new NotFoundError('Vendor logo not found');
  return logo;
}

export async function getVendorLogoImage(id: string): Promise<string | null> {
  const logo = await prisma.vendorLogo.findUnique({ where: { id } });
  if (!logo) {
    throw new NotFoundError('Vendor logo not found');
  }

  if (!logo.objectKey) {
    return null;
  }

  return minioStorage.getPresignedUrl(logo.objectKey, { expirySeconds: 3600 });
}

export async function createVendorLogo(
  data: { name: string; type: string },
  logoFile: { buffer: Buffer; originalname: string; mimetype: string },
  userId?: string,
  ipAddress?: string
) {
  const existing = await prisma.vendorLogo.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  });
  if (existing) {
    throw new ConflictError(`Vendor logo with name '${data.name}' already exists`);
  }

  const objectKey = `vendor-logos/${data.type}/${Date.now()}-${logoFile.originalname}`;

  await minioStorage.uploadBuffer(objectKey, logoFile.buffer, {
    contentType: logoFile.mimetype,
    metadata: {
      'original-filename': logoFile.originalname,
    },
  });

  const logoUrl = await minioStorage.getPresignedUrl(objectKey, { expirySeconds: 604800 });

  const logo = await prisma.vendorLogo.create({
    data: {
      name: data.name,
      type: data.type,
      logoUrl,
      fileName: logoFile.originalname,
      objectKey,
    },
  });

  if (userId) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        resource: 'vendor-logo',
        resourceId: logo.id,
        details: `Created vendor logo: ${data.name} (${logoFile.originalname})`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }

  return logo;
}

export async function updateVendorLogo(
  id: string,
  data: { name?: string; type?: string },
  logoFile?: { buffer: Buffer; originalname: string; mimetype: string },
  userId?: string,
  ipAddress?: string
) {
  const existing = await prisma.vendorLogo.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Vendor logo not found');

  const updateData: Record<string, unknown> = {};
  const changedFields: string[] = [];

  if (data.name !== undefined) {
    updateData.name = data.name;
    changedFields.push('name');
  }
  if (data.type !== undefined) {
    updateData.type = data.type;
    changedFields.push('type');
  }

  if (logoFile) {
    if (existing.objectKey) {
      try {
        await minioStorage.deleteObject(existing.objectKey);
      } catch {
        // Ignore deletion errors
      }
    }

    const objectKey = `vendor-logos/${data.type || existing.type}/${Date.now()}-${logoFile.originalname}`;

    await minioStorage.uploadBuffer(objectKey, logoFile.buffer, {
      contentType: logoFile.mimetype,
      metadata: {
        'original-filename': logoFile.originalname,
      },
    });

    const logoUrl = await minioStorage.getPresignedUrl(objectKey, { expirySeconds: 604800 });

    updateData.logoUrl = logoUrl;
    updateData.fileName = logoFile.originalname;
    updateData.objectKey = objectKey;
    changedFields.push(`logo file (${logoFile.originalname})`);
  }

  const logo = await prisma.vendorLogo.update({
    where: { id },
    data: updateData,
  });

  if (userId && changedFields.length > 0) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'vendor-logo',
        resourceId: id,
        details: `Updated vendor logo: ${existing.name} — ${changedFields.join(', ')}`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }

  return logo;
}

export async function deleteVendorLogo(id: string, userId?: string, ipAddress?: string) {
  const logo = await prisma.vendorLogo.findUnique({ where: { id } });
  if (!logo) throw new NotFoundError('Vendor logo not found');

  if (logo.objectKey) {
    try {
      await minioStorage.deleteObject(logo.objectKey);
    } catch {
      // Ignore deletion errors
    }
  }

  await prisma.vendorLogo.delete({ where: { id } });

  if (userId) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'vendor-logo',
        resourceId: id,
        details: `Deleted vendor logo: ${logo.name}`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }
}

// ============================================
// Risk Score Settings
// ============================================

export async function getRiskScoreSettings(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany({
    where: { category: 'risk-score' },
  });

  const defaults: Record<string, unknown> = {
    applyDefaultSettings: true,
    vulnerabilityScoreWeight: 0.25,
    vulnerabilitySeverityWeight: 0.25,
    threatsWeight: 0.25,
    endpointVisitsWeight: 0.25,
  };

  const result = { ...defaults };
  for (const setting of settings) {
    const key = setting.key.replace('risk-score.', '');
    result[key] = setting.value;
  }

  return result;
}

export async function updateRiskScoreSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
  const updates = Object.entries(input).filter(([, value]) => value !== undefined);

  for (const [key, value] of updates) {
    await prisma.setting.upsert({
      where: { key: `risk-score.${key}` },
      update: { value: JSON.parse(JSON.stringify(value)) },
      create: { key: `risk-score.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'risk-score' },
    });
  }

  if (userId) {
    const changedFields = Object.keys(input).join(', ');
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'risk-score-settings',
        resourceId: null,
        details: `Updated risk score settings: ${changedFields}`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }

  const result = await getRiskScoreSettings();

  if (result.applyDefaultSettings === true) {
    return {
      ...result,
      vulnerabilityScoreWeight: 0.25,
      vulnerabilitySeverityWeight: 0.25,
      threatsWeight: 0.25,
      endpointVisitsWeight: 0.25,
    };
  }

  return result;
}

// ============================================
// Remote Desktop Settings
// ============================================

export async function getRemoteDesktopSettingsData(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany({
    where: { category: 'remote-desktop' },
  });

  const defaults: Record<string, unknown> = {
    connectionType: 'Local',
    remoteSessionIndicator: false,
    userConsent: false,
  };

  const result = { ...defaults };
  for (const setting of settings) {
    const key = setting.key.replace('remote-desktop.', '');
    result[key] = setting.value;
  }

  return result;
}

export async function updateRemoteDesktopSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
  const updates = Object.entries(input).filter(([, value]) => value !== undefined);

  for (const [key, value] of updates) {
    await prisma.setting.upsert({
      where: { key: `remote-desktop.${key}` },
      update: { value: JSON.parse(JSON.stringify(value)) },
      create: { key: `remote-desktop.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'remote-desktop' },
    });
  }

  if (userId) {
    const changedFields = Object.keys(input).join(', ');
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'remote-desktop-settings',
        resourceId: null,
        details: `Updated remote desktop settings: ${changedFields}`,
        ipAddress: ipAddress || 'unknown',
      },
    });
  }

  return getRemoteDesktopSettingsData();
}

export async function resetRemoteDesktopSettings(): Promise<Record<string, unknown>> {
  await prisma.setting.deleteMany({
    where: { category: 'remote-desktop' },
  });

  return getRemoteDesktopSettingsData();
}

// ============================================
// Alert Configurations
// ============================================

import type {
  AlertConfigResponse,
} from './settings.types';
import type {
  CreateAlertConfigInput,
  UpdateAlertConfigInput,
} from './settings.validators';

export function transformAlertConfig(config: {
  id: string;
  type: string;
  enabled: boolean;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}): AlertConfigResponse {
  const cfg = (config.config || {}) as Record<string, unknown>;
  return {
    id: config.id,
    name: (cfg.name as string) || '',
    type: config.type,
    channel: (cfg.channel as string) || '',
    recipients: (cfg.recipients as string) || '',
    enabled: config.enabled,
    description: (cfg.description as string) || '',
    module: (cfg.module as string) || '',
    severity: (cfg.severity as string) || '',
    scope: (cfg.scope as string) || '',
    endpoints: (cfg.endpoints as string) || '',
    conditions: (cfg.conditions as Record<string, unknown>[]) || [],
    actions: (cfg.actions as Record<string, unknown>[]) || [],
    remediations: (cfg.remediations as Record<string, unknown>[]) || [],
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function listAlertConfigs(): Promise<AlertConfigResponse[]> {
  const configs = await prisma.alertConfig.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return configs.map((c) => transformAlertConfig(c));
}

export async function getAlertConfigById(id: string): Promise<AlertConfigResponse> {
  const config = await prisma.alertConfig.findUnique({
    where: { id },
  });

  if (!config) {
    throw new NotFoundError('Alert configuration not found');
  }

  return transformAlertConfig(config);
}

export async function createAlertConfig(input: CreateAlertConfigInput): Promise<AlertConfigResponse> {
  const { name, type, enabled, channel, recipients, description, module, severity, scope, endpoints, conditions, actions, remediations } = input;

  const config = await prisma.alertConfig.create({
    data: {
      type: type,
      enabled: enabled ?? true,
      config: JSON.parse(JSON.stringify({
        name,
        channel: channel || '',
        recipients: recipients || '',
        description: description || '',
        module: module || '',
        severity: severity || '',
        scope: scope || '',
        endpoints: endpoints || '',
        conditions: conditions || [],
        actions: actions || [],
        remediations: remediations || [],
      })),
    },
  });

  return transformAlertConfig(config);
}

export async function updateAlertConfigById(id: string, input: UpdateAlertConfigInput): Promise<AlertConfigResponse> {
  const existing = await prisma.alertConfig.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Alert configuration not found');
  }

  const existingConfig = (existing.config || {}) as Record<string, unknown>;

  const updatedConfig: Record<string, unknown> = { ...existingConfig };
  if (input.name !== undefined) updatedConfig.name = input.name;
  if (input.channel !== undefined) updatedConfig.channel = input.channel;
  if (input.recipients !== undefined) updatedConfig.recipients = input.recipients;
  if (input.description !== undefined) updatedConfig.description = input.description;
  if (input.module !== undefined) updatedConfig.module = input.module;
  if (input.severity !== undefined) updatedConfig.severity = input.severity;
  if (input.scope !== undefined) updatedConfig.scope = input.scope;
  if (input.endpoints !== undefined) updatedConfig.endpoints = input.endpoints;
  if (input.conditions !== undefined) updatedConfig.conditions = input.conditions;
  if (input.actions !== undefined) updatedConfig.actions = input.actions;
  if (input.remediations !== undefined) updatedConfig.remediations = input.remediations;

  const config = await prisma.alertConfig.update({
    where: { id },
    data: {
      type: input.type ?? existing.type,
      enabled: input.enabled ?? existing.enabled,
      config: JSON.parse(JSON.stringify(updatedConfig)),
    },
  });

  return transformAlertConfig(config);
}

export async function deleteAlertConfig(id: string): Promise<void> {
  const existing = await prisma.alertConfig.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError('Alert configuration not found');
  }

  await prisma.alertConfig.delete({ where: { id } });
}

// ============================================
// RedHat Nominations
// ============================================

export function transformNomination(n: { id: string; agentId: string; agent: { id: string; hostname: string | null; os: string | null; osVersion: string | null; status: string; ipAddress: string | null } | null; name: string; status: string; endpoint: number; scheduledTime: string | null; lastSyncTime: Date | null; updatedBy: string | null; createdAt: Date; updatedAt: Date }) {
  return { id: n.id, agentId: n.agentId, agent: n.agent, name: n.name, status: n.status, endpoint: n.endpoint, scheduledTime: n.scheduledTime, lastSyncTime: n.lastSyncTime?.toISOString() || null, updatedBy: n.updatedBy, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
}

export async function createRedHatNomination(data: { agentId: string; name: string; scheduledTime?: string | null; endpoint?: number }, userId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: data.agentId } });
  if (!agent) throw new NotFoundError('Agent not found');
  const osVersion = (agent.osVersion || '').toLowerCase();
  if (!osVersion.includes('red hat') && !osVersion.includes('centos') && !osVersion.includes('rhel')) throw new BadRequestError('Agent OS must be Red Hat Enterprise Linux or CentOS');
  const existing = await prisma.redHatNomination.findUnique({ where: { agentId: data.agentId } });
  if (existing) throw new ConflictError('Agent already nominated');
  const nomination = await prisma.redHatNomination.create({
    data: { agentId: data.agentId, name: data.name, scheduledTime: data.scheduledTime || null, endpoint: data.endpoint || 0, updatedBy: userId },
    include: { agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } } },
  });
  return transformNomination(nomination);
}

export async function listRedHatNominations() {
  const nominations = await prisma.redHatNomination.findMany({
    include: { agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return nominations.map(n => transformNomination(n));
}

export async function getRedHatNomination(id: string) {
  const nomination = await prisma.redHatNomination.findUnique({
    where: { id },
    include: { agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } } },
  });
  if (!nomination) throw new NotFoundError('Red Hat nomination not found');
  return transformNomination(nomination);
}

export async function updateRedHatNomination(id: string, data: Record<string, unknown>, userId: string) {
  const existing = await prisma.redHatNomination.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Red Hat nomination not found');
  const updateData: Record<string, unknown> = { updatedBy: userId };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime;
  if (data.endpoint !== undefined) updateData.endpoint = data.endpoint;
  const nomination = await prisma.redHatNomination.update({
    where: { id }, data: updateData,
    include: { agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } } },
  });
  return transformNomination(nomination);
}

export async function deleteRedHatNomination(id: string) {
  const existing = await prisma.redHatNomination.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Red Hat nomination not found');
  await prisma.redHatNomination.delete({ where: { id } });
  return { message: 'Red Hat nomination deleted' };
}
