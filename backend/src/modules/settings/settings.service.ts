import crypto from 'crypto';
import { prisma } from '@db/client';
import { NotFoundError, BadRequestError, ConflictError, UnauthorizedError, ForbiddenError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { encrypt, decrypt } from '@shared/utils/crypto';
import { emailService } from '@shared/services/email.service';
import { loadMailConfig } from '@shared/services/notification-email.service';
import { createLogger } from '@shared/services/logger';

const logger = createLogger('settings');
import { ldapService, type LdapConfig } from '@shared/services/ldap.service';
import { minioStorage } from '@shared/services/minio.service';
import { proxyService, type ProxyConfig } from '@shared/services/proxy.service';
import type {
  AlertConfigResponse,
  LdapConfigResponse,
  AuditLogResponse,
  AuditLogFilterOptions,
  PaginatedResponse,
  SuccessResponse,
  AgentApprovalResponse,
} from './settings.types';
import type {
  CreateAlertConfigInput,
  UpdateAlertConfigInput,
  CreateLdapConfigInput,
  UpdateLdapConfigInput,
  AuditLogQueryInput,
} from './settings.validators';

export class SettingsService {
  // ============================================
  // Alert Configurations
  // ============================================

  async listAlertConfigs(): Promise<AlertConfigResponse[]> {
    const configs = await prisma.alertConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return configs.map((c) => this.transformAlertConfig(c));
  }

  async getAlertConfigById(id: string): Promise<AlertConfigResponse> {
    const config = await prisma.alertConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundError('Alert configuration not found');
    }

    return this.transformAlertConfig(config);
  }

  async createAlertConfig(input: CreateAlertConfigInput): Promise<AlertConfigResponse> {
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

    return this.transformAlertConfig(config);
  }

  async updateAlertConfigById(id: string, input: UpdateAlertConfigInput): Promise<AlertConfigResponse> {
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

    return this.transformAlertConfig(config);
  }

  async deleteAlertConfig(id: string): Promise<void> {
    const existing = await prisma.alertConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Alert configuration not found');
    }

    await prisma.alertConfig.delete({ where: { id } });
  }

  private transformAlertConfig(config: {
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

  // ============================================
  // LDAP Configurations
  // ============================================

  async listLdapConfigs(): Promise<LdapConfigResponse[]> {
    const configs = await prisma.ldapConfig.findMany({
      orderBy: { name: 'asc' },
    });

    return configs.map((c) => this.transformLdapConfig(c));
  }

  async getLdapConfig(id: string): Promise<LdapConfigResponse> {
    const config = await prisma.ldapConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundError('LDAP configuration not found');
    }

    return this.transformLdapConfig(config);
  }

  async createLdapConfig(input: CreateLdapConfigInput): Promise<LdapConfigResponse> {
    const baseDn = input.baseDn || input.baseDN || '';
    const bindDn = input.bindDn || input.username || '';
    const bindPassword = input.bindPassword || input.password || '';

    // Encrypt sensitive fields
    const bindDnEnc = encrypt(bindDn);
    const bindPasswordEnc = encrypt(bindPassword);

    const config = await prisma.ldapConfig.create({
      data: {
        name: input.name,
        host: input.host,
        port: input.port,
        baseDn,
        bindDnEnc,
        bindPasswordEnc,
        userFilter: input.userFilter,
        isActive: input.isActive ?? true,
      },
    });

    return this.transformLdapConfig(config);
  }

  async updateLdapConfig(id: string, input: UpdateLdapConfigInput): Promise<LdapConfigResponse> {
    const config = await prisma.ldapConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundError('LDAP configuration not found');
    }

    const baseDn = input.baseDn || input.baseDN;
    const bindDn = input.bindDn || input.username;
    const bindPassword = input.bindPassword || input.password;

    const updateData: Record<string, unknown> = {
      name: input.name,
      host: input.host,
      port: input.port,
      baseDn: baseDn,
      userFilter: input.userFilter,
      isActive: input.isActive,
    };

    if (bindDn) {
      updateData.bindDnEnc = encrypt(bindDn);
    }
    if (bindPassword) {
      updateData.bindPasswordEnc = encrypt(bindPassword);
    }

    const updated = await prisma.ldapConfig.update({
      where: { id },
      data: updateData,
    });

    // Update BullMQ schedule if sync settings changed
    try {
      const { updateLdapSyncSchedule } = await import('./ldap-sync.worker');
      await updateLdapSyncSchedule(id);
    } catch (err) {
      logger.error({ err, ldapConfigId: id }, 'Failed to update LDAP sync schedule');
    }

    return this.transformLdapConfig(updated);
  }

  async deleteLdapConfig(id: string): Promise<void> {
    const config = await prisma.ldapConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundError('LDAP configuration not found');
    }

    // Remove BullMQ scheduled job before deleting config
    try {
      const { removeLdapSyncSchedule } = await import('./ldap-sync.worker');
      await removeLdapSyncSchedule(id);
    } catch (err) {
      logger.error({ err, ldapConfigId: id }, 'Failed to remove LDAP sync schedule');
    }

    await prisma.ldapConfig.delete({
      where: { id },
    });
  }

  async testLdapConfig(id: string): Promise<SuccessResponse> {
    const config = await prisma.ldapConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundError('LDAP configuration not found');
    }

    // Decrypt credentials
    const bindDn = decrypt(config.bindDnEnc);
    const bindPassword = decrypt(config.bindPasswordEnc);

    logger.info({ host: config.host, port: config.port, baseDn: config.baseDn, bindDn }, 'Testing LDAP connection');

    // Perform actual LDAP connection test
    const ldapConfig: LdapConfig = {
      host: config.host,
      port: config.port,
      baseDn: config.baseDn,
      bindDn,
      bindPassword,
      useTLS: config.port === 636, // LDAPS uses port 636
      userFilter: config.userFilter || undefined,
    };

    const result = await ldapService.testConnection(ldapConfig);

    if (!result.success) {
      throw new BadRequestError(result.message);
    }

    return {
      success: true,
      message: result.message,
    };
  }

  private transformLdapConfig(config: {
    id: string;
    name: string;
    host: string;
    port: number;
    baseDn: string;
    userFilter: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): LdapConfigResponse {
    return {
      id: config.id,
      name: config.name,
      host: config.host,
      port: config.port,
      baseDn: config.baseDn,
      userFilter: config.userFilter,
      isActive: config.isActive,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  // ============================================
  // Singleton Settings (using Setting table)
  // ============================================

  async getServerSettings(): Promise<Record<string, unknown>> {
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

  async updateServerSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key: `server.${key}` },
        update: { value: JSON.parse(JSON.stringify(value)) },
        create: { key: `server.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'server' },
      });
    }

    // R7B: Audit logging for server settings mutation
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

    return this.getServerSettings();
  }

  async getAgentConfig(): Promise<Record<string, unknown>> {
    const settings = await prisma.setting.findMany({
      where: { category: 'agent' },
    });

    const defaults: Record<string, unknown> = {
      allowedBandwidth: 100,
      agentRefreshCycle: 300,
      systemActionRefreshCycle: 300,
      endpointVlanRefreshCycle: 600,
      patchScanningRefreshCycle: 3600,
      softwareRefreshCycle: 3600,
      hardwareRefreshCycle: 3600,
      systemProcessRefreshCycle: 600,
      systemServiceRefreshCycle: 600,
      networkRefreshCycle: 600,
      networkSharesRefreshCycle: 3600,
      riskDetectionRefreshCycle: 7200,
    };

    const result = { ...defaults };
    for (const setting of settings) {
      const key = setting.key.replace('agent.', '');
      result[key] = setting.value;
    }

    return result;
  }

  async updateAgentConfig(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key: `agent.${key}` },
        update: { value: JSON.parse(JSON.stringify(value)) },
        create: { key: `agent.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'agent' },
      });
    }

    return this.getAgentConfig();
  }

  async resetAgentConfig(): Promise<Record<string, unknown>> {
    await prisma.setting.deleteMany({ where: { category: 'agent' } });
    return this.getAgentConfig();
  }

  async getProxyServer(): Promise<Record<string, unknown>> {
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
      // R2A, R3A: Never return password in GET response
      if (key !== 'password') {
        result[key] = setting.value;
      }
    }

    // R2A, R3A: Password masking — always return null
    result.password = null;

    return result;
  }

  async updateProxyServer(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      // Encrypt password if provided
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

    // R7B: Audit logging for proxy settings mutation (mask password)
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

    return this.getProxyServer();
  }

  async testProxyServer(input: Record<string, unknown>): Promise<SuccessResponse> {
    // R3B: Test endpoint must use SAVED config from DB, not submitted config
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

    // R3B: If proxy is disabled, return 400
    if (!proxyData.enabled) {
      throw new BadRequestError('Proxy is disabled. Enable it first.');
    }

    // R3B: Validate that saved config has required fields
    if (!proxyData.host || !proxyData.port || !proxyData.protocol) {
      throw new BadRequestError('Proxy configuration incomplete. Please configure host, port, and protocol.');
    }

    const host = proxyData.host as string;
    const port = Number(proxyData.port);
    const protocol = proxyData.protocol as 'HTTP' | 'HTTPS' | 'SOCKS5';

    // Decrypt password if exists
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

  async getMailServer(): Promise<Record<string, unknown>> {
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

  async updateMailServer(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
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

    // Only update password if a real new value is provided (not the sentinel or empty)
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

    // R7B: Audit logging for mail settings mutation (mask password)
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

    return this.getMailServer();
  }

  async testMailServer(testEmail: string): Promise<SuccessResponse> {
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
  // Audit Logs
  // ============================================

  async listAuditLogs(params: AuditLogQueryInput): Promise<PaginatedResponse<AuditLogResponse>> {
    const where: Record<string, unknown> = {};

    if (params.action) {
      where.action = params.action;
    }
    if (params.resource) {
      where.resource = params.resource;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        (where.timestamp as Record<string, unknown>).gte = new Date(params.startDate);
      }
      if (params.endDate) {
        (where.timestamp as Record<string, unknown>).lte = new Date(params.endDate);
      }
    }
    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { resource: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { email: true } },
        },
        orderBy: { timestamp: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = logs.map((l) => this.transformAuditLog(l));
    return paginate(data, total, params);
  }

  async getAuditLogFilters(): Promise<AuditLogFilterOptions> {
    const [actions, resources, users] = await Promise.all([
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action'],
      }),
      prisma.auditLog.findMany({
        select: { resource: true },
        distinct: ['resource'],
      }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, email: true },
        orderBy: { email: 'asc' },
      }),
    ]);

    return {
      actions: actions.map(a => a.action),
      resources: resources.map(r => r.resource),
      users,
    };
  }

  private transformAuditLog(log: {
    id: string;
    userId: string | null;
    action: string;
    resource: string;
    resourceId: string | null;
    details: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: Date;
    user: { email: string } | null;
  }): AuditLogResponse {
    return {
      id: log.id,
      userId: log.userId,
      userEmail: log.user?.email ?? null,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details as Record<string, unknown> | null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.timestamp.toISOString(),
    };
  }

  // ============================================
  // Vulnerability Preference
  // ============================================

  async getVulnerabilityPreference(): Promise<Record<string, unknown>> {
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

  async updateVulnerabilityPreference(input: Record<string, unknown>): Promise<Record<string, unknown>> {
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

    return this.getVulnerabilityPreference();
  }

  async syncVulnerabilityDatabase(): Promise<SuccessResponse> {
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

  async getPlatformLicense(): Promise<Record<string, unknown>> {
    const { computeLicenseStatus } = await import('./license.service');
    const settings = await prisma.setting.findMany({
      where: { category: 'license' },
    });

    // Count real agents for usedEndpoints
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

    // Always compute usedEndpoints from real agent count
    result.usedEndpoints = usedEndpoints;

    // Calculate remaining days
    if (result.expiresOn) {
      const expiryDate = new Date(result.expiresOn as string);
      const today = new Date();
      result.remainingDays = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Calculate remaining endpoints
    const numberOfEndpoints = typeof result.numberOfEndpoints === 'string'
      ? parseInt(result.numberOfEndpoints as string, 10)
      : result.numberOfEndpoints as number;
    result.remainingEndpoints = Math.max(0, numberOfEndpoints - usedEndpoints);

    // Compute status
    result.status = computeLicenseStatus(
      result.licenseType as string,
      result.expiresOn as string,
      usedEndpoints,
      numberOfEndpoints,
    );

    return result;
  }

  async updatePlatformLicense(licenseCode: string): Promise<Record<string, unknown>> {
    const { validateLicenseFormat, getLicenseType, getLicenseEndpointLimit, getLicenseExpiryDays } = await import('./license.service');

    // Validate license code format and checksum
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

    return this.getPlatformLicense();
  }

  // ============================================
  // Agent Approvals
  // ============================================

  async listAgentApprovals(params: { page: number; limit: number; search?: string }): Promise<PaginatedResponse<AgentApprovalResponse>> {
    const where: Record<string, unknown> = {
      status: 'PENDING_APPROVAL',
    };

    if (params.search) {
      where.OR = [
        { hostname: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
        { machineId: { contains: params.search, mode: 'insensitive' } },
        { ipAddress: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const paginationParams = { page: params.page, limit: params.limit };

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(paginationParams),
      }),
      prisma.agent.count({ where }),
    ]);

    const data: AgentApprovalResponse[] = agents.map((agent) => ({
      id: agent.id,
      uuid: agent.machineId,
      hostName: agent.hostname,
      ipAddresses: agent.ipAddress || '',
      createdOn: agent.createdAt.toISOString(),
      performedBy: null,
      status: agent.status as 'Approved' | 'Pending' | 'Rejected',
    }));

    return paginate(data, total, paginationParams);
  }

  async approveAgent(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    if (agent.status !== 'PENDING_APPROVAL') {
      throw new BadRequestError(`Agent is already ${agent.status.toLowerCase()}`);
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: { status: 'CONNECTED' },
    });

    return {
      id: updated.id,
      machineId: updated.machineId,
      hostname: updated.hostname,
      status: updated.status,
      message: 'Agent approved successfully',
    };
  }

  async rejectAgent(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    if (agent.status === 'REJECTED') {
      throw new BadRequestError('Agent is already rejected');
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    return {
      id: updated.id,
      machineId: updated.machineId,
      hostname: updated.hostname,
      status: updated.status,
      message: 'Agent rejected successfully',
    };
  }

  // ============================================
  // Computer Groups (R1 — Hardened)
  // ============================================

  async listComputerGroups(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const orderBy: Record<string, string> = {};
    if (params.sortBy) { orderBy[params.sortBy] = params.sortOrder || 'asc'; } else { orderBy.createdAt = 'desc'; }
    const [data, total] = await Promise.all([
      prisma.computerGroup.findMany({ where, orderBy, skip, take: limit }),
      prisma.computerGroup.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getComputerGroup(id: string) {
    const group = await prisma.computerGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundError('Computer group not found');
    return group;
  }

  async createComputerGroup(data: { name: string; description?: string | null; endpoints?: string[] }, userId?: string) {
    const existing = await prisma.computerGroup.findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictError(`Computer group with name '${data.name}' already exists`);

    const endpoints = data.endpoints || [];
    if (endpoints.length > 0) {
      const assets = await prisma.asset.findMany({ where: { id: { in: endpoints } }, select: { id: true } });
      const foundIds = new Set(assets.map(a => a.id));
      const missing = endpoints.filter(ep => !foundIds.has(ep));
      if (missing.length > 0) throw new BadRequestError(`Endpoints not found: [${missing.join(', ')}]`);
    }

    return prisma.computerGroup.create({
      data: { name: data.name, description: data.description ?? null, endpoints, endpointCount: endpoints.length, createdBy: userId || null },
    });
  }

  async updateComputerGroup(id: string, data: { name?: string; description?: string | null; endpoints?: string[] }) {
    const group = await prisma.computerGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundError('Computer group not found');

    if (data.name) {
      const existing = await prisma.computerGroup.findFirst({
        where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictError(`Computer group with name '${data.name}' already exists`);
    }

    if (data.endpoints && data.endpoints.length > 0) {
      const assets = await prisma.asset.findMany({ where: { id: { in: data.endpoints } }, select: { id: true } });
      const foundIds = new Set(assets.map(a => a.id));
      const missing = data.endpoints.filter(ep => !foundIds.has(ep));
      if (missing.length > 0) throw new BadRequestError(`Endpoints not found: [${missing.join(', ')}]`);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.endpoints !== undefined) { updateData.endpoints = data.endpoints; updateData.endpointCount = data.endpoints.length; }
    return prisma.computerGroup.update({ where: { id }, data: updateData });
  }

  async deleteComputerGroup(id: string) {
    const group = await prisma.computerGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundError('Computer group not found');
    await prisma.computerGroup.delete({ where: { id } });
  }

  async getAvailableEndpoints() {
    const assets = await prisma.asset.findMany({
      select: { id: true, hostname: true, ipAddress: true, status: true },
      orderBy: { hostname: 'asc' },
    });
    return assets.map((a) => ({ id: a.id, name: a.hostname, ipAddress: a.ipAddress, status: a.status === 'In Use' ? 'Online' : 'Offline' }));
  }

  // ============================================
  // Deployment Policies (R2 — Consolidated DPOL-XXXX)
  // ============================================

  async listDeploymentPolicies(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string; type?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 10;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.type) where.type = params.type;
    const orderBy: Record<string, string> = {};
    if (params.sortBy) { orderBy[params.sortBy] = params.sortOrder || 'asc'; } else { orderBy.createdAt = 'desc'; }
    const [data, total] = await Promise.all([
      prisma.deploymentPolicy.findMany({ where, orderBy, skip, take: limit }),
      prisma.deploymentPolicy.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getDeploymentPolicy(id: string) {
    const policy = await prisma.deploymentPolicy.findFirst({ where: { OR: [{ id }, { policyId: id }] } });
    if (!policy) throw new NotFoundError('Deployment policy not found');
    return policy;
  }

  async createDeploymentPolicy(data: { name: string; description?: string; type?: string; supportedModule?: string; relatedType?: string }, userId?: string) {
    const existing = await prisma.deploymentPolicy.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } });
    if (existing) throw new ConflictError(`Deployment policy with name '${data.name}' already exists`);

    const lastPolicy = await prisma.deploymentPolicy.findFirst({ where: { policyId: { startsWith: 'DPOL-' } }, orderBy: { policyId: 'desc' } });
    let nextNum = 1;
    if (lastPolicy) { const m = lastPolicy.policyId.match(/DPOL-(\d+)/); if (m) nextNum = parseInt(m[1], 10) + 1; }
    const policyId = `DPOL-${String(nextNum).padStart(4, '0')}`;

    return prisma.deploymentPolicy.create({
      data: { policyId, name: data.name, description: data.description, type: data.type || 'INSTANT', supportedModule: data.supportedModule || 'All', relatedType: data.relatedType || 'No Relation', createdBy: userId || null },
    });
  }

  async updateDeploymentPolicy(id: string, data: { name?: string; description?: string; type?: string; supportedModule?: string; relatedType?: string }) {
    const policy = await prisma.deploymentPolicy.findFirst({ where: { OR: [{ id }, { policyId: id }] } });
    if (!policy) throw new NotFoundError('Deployment policy not found');
    if (data.name) {
      const dup = await prisma.deploymentPolicy.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: policy.id } } });
      if (dup) throw new ConflictError(`Deployment policy with name '${data.name}' already exists`);
    }
    return prisma.deploymentPolicy.update({ where: { id: policy.id }, data });
  }

  async deleteDeploymentPolicy(id: string) {
    const policy = await prisma.deploymentPolicy.findFirst({ where: { OR: [{ id }, { policyId: id }] } });
    if (!policy) throw new NotFoundError('Deployment policy not found');
    await prisma.deploymentPolicy.delete({ where: { id: policy.id } });
  }

  // ============================================
  // Patch Preferences (R3 — singleton via Setting table)
  // ============================================

  private readonly defaultPatchPreferences = {
    enablePatching: true,
    corridorOnlyApprovedPatch: false,
    patchSyncForOS: ['Windows'] as string[],
    patchApprovalPolicy: 'ManuallyApproves' as const,
    enableThirdPartyPatching: false,
    patchApprovalScheduleTime: '02:00:00',
    scheduleTime: '03:00:00',
    zeroTouchDeploymentScheduleTime: '04:00:00',
    lastSyncedAt: null as string | null,
  };

  async getPatchPreferences() {
    const setting = await prisma.setting.findFirst({ where: { key: 'patch-preferences', category: 'patch-preferences' } });
    if (!setting) {
      const created = await prisma.setting.create({
        data: { key: 'patch-preferences', value: JSON.parse(JSON.stringify(this.defaultPatchPreferences)), category: 'patch-preferences' },
      });
      return { id: created.id, ...this.defaultPatchPreferences, createdAt: created.createdAt.toISOString() };
    }
    const v = setting.value as Record<string, unknown>;
    return {
      id: setting.id,
      enablePatching: v.enablePatching ?? this.defaultPatchPreferences.enablePatching,
      corridorOnlyApprovedPatch: v.corridorOnlyApprovedPatch ?? this.defaultPatchPreferences.corridorOnlyApprovedPatch,
      patchSyncForOS: (v.patchSyncForOS as string[]) ?? this.defaultPatchPreferences.patchSyncForOS,
      patchApprovalPolicy: (v.patchApprovalPolicy as string) ?? this.defaultPatchPreferences.patchApprovalPolicy,
      enableThirdPartyPatching: v.enableThirdPartyPatching ?? this.defaultPatchPreferences.enableThirdPartyPatching,
      patchApprovalScheduleTime: (v.patchApprovalScheduleTime as string) ?? this.defaultPatchPreferences.patchApprovalScheduleTime,
      scheduleTime: (v.scheduleTime as string) ?? this.defaultPatchPreferences.scheduleTime,
      zeroTouchDeploymentScheduleTime: (v.zeroTouchDeploymentScheduleTime as string) ?? this.defaultPatchPreferences.zeroTouchDeploymentScheduleTime,
      lastSyncedAt: (v.lastSyncedAt as string | null) ?? null,
      createdAt: setting.createdAt.toISOString(),
    };
  }

  async updatePatchPreferences(input: Record<string, unknown>) {
    const setting = await prisma.setting.findFirst({ where: { key: 'patch-preferences', category: 'patch-preferences' } });
    const currentValue = setting ? (setting.value as Record<string, unknown>) : { ...this.defaultPatchPreferences };
    const merged = { ...currentValue, ...input };
    if (setting) {
      const updated = await prisma.setting.update({ where: { id: setting.id }, data: { value: JSON.parse(JSON.stringify(merged)) } });
      return { id: updated.id, ...(updated.value as Record<string, unknown>), createdAt: updated.createdAt.toISOString() };
    }
    const created = await prisma.setting.create({
      data: { key: 'patch-preferences', value: JSON.parse(JSON.stringify(merged)), category: 'patch-preferences' },
    });
    return { id: created.id, ...(created.value as Record<string, unknown>), createdAt: created.createdAt.toISOString() };
  }

  async syncPatchNow() {
    const syncedAt = new Date().toISOString();
    await this.updatePatchPreferences({ lastSyncedAt: syncedAt });
    return { message: 'Patch sync triggered', syncedAt };
  }

  // ============================================
  // Distribution Servers
  // ============================================

  async listDistributionServers(params: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { location: { contains: params.search, mode: 'insensitive' } },
        { url: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const orderBy: Record<string, string> = {};
    if (params.sortBy) { orderBy[params.sortBy] = params.sortOrder || 'asc'; } else { orderBy.createdAt = 'desc'; }
    const [data, total] = await Promise.all([
      prisma.distributionServer.findMany({ where, orderBy, skip, take: limit }),
      prisma.distributionServer.count({ where }),
    ]);
    return { data: data.map(s => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getDistributionServer(id: string) {
    const server = await prisma.distributionServer.findUnique({ where: { id } });
    if (!server) throw new NotFoundError('Distribution server not found');
    return { ...server, createdAt: server.createdAt.toISOString(), updatedAt: server.updatedAt.toISOString() };
  }

  async createDistributionServer(data: { name: string; description?: string | null; location?: string | null; url: string; version?: string | null; status?: string }, userId?: string) {
    const existing = await prisma.distributionServer.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } });
    if (existing) throw new ConflictError(`Distribution server with name '${data.name}' already exists`);
    const server = await prisma.distributionServer.create({ data: { name: data.name, description: data.description || null, location: data.location || null, url: data.url, version: data.version || null, status: data.status || 'Active', createdBy: userId || null } });
    return { ...server, createdAt: server.createdAt.toISOString(), updatedAt: server.updatedAt.toISOString() };
  }

  async updateDistributionServer(id: string, data: { name?: string; description?: string | null; location?: string | null; url?: string; version?: string | null; status?: string }) {
    const server = await prisma.distributionServer.findUnique({ where: { id } });
    if (!server) throw new NotFoundError('Distribution server not found');
    if (data.name && data.name.toLowerCase() !== server.name.toLowerCase()) {
      const existing = await prisma.distributionServer.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } } });
      if (existing) throw new ConflictError(`Distribution server with name '${data.name}' already exists`);
    }
    const updated = await prisma.distributionServer.update({ where: { id }, data });
    return { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
  }

  async deleteDistributionServer(id: string) {
    const server = await prisma.distributionServer.findUnique({ where: { id } });
    if (!server) throw new NotFoundError('Distribution server not found');
    await prisma.distributionServer.delete({ where: { id } });
  }

  // ============================================
  // Branding
  // ============================================

  async getBranding(): Promise<Record<string, unknown>> {
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


    // Replace logoUrl with permanent endpoint if logoObjectKey exists
    if (result.logoObjectKey) {
      result.logoUrl = '/v1/settings/branding/logo';
    }

    return result;
  }


  async getBrandingLogo(): Promise<string | null> {
    const setting = await prisma.setting.findUnique({
      where: { key: 'branding.logoObjectKey' },
    });

    if (!setting?.value) {
      return null;
    }

    // Generate fresh presigned URL with 1-hour expiry
    const objectKey = setting.value as string;
    return minioStorage.getPresignedUrl(objectKey, { expirySeconds: 3600 });
  }


  async updateBranding(
    input: { companyName?: string },
    logoFile?: { buffer: Buffer; originalname: string; mimetype: string },
    userId?: string,
    ipAddress?: string
  ): Promise<Record<string, unknown>> {
    const changedFields: string[] = [];

    // Update company name if provided
    if (input.companyName !== undefined) {
      await prisma.setting.upsert({
        where: { key: 'branding.companyName' },
        update: { value: JSON.parse(JSON.stringify(input.companyName)) },
        create: { key: 'branding.companyName', value: JSON.parse(JSON.stringify(input.companyName)), category: 'branding' },
      });
      changedFields.push('companyName');
    }

    // Upload logo if provided
    if (logoFile) {
      const objectKey = `branding/logo-${Date.now()}-${logoFile.originalname}`;

      await minioStorage.uploadBuffer(objectKey, logoFile.buffer, {
        contentType: logoFile.mimetype,
        metadata: {
          'original-filename': logoFile.originalname,
        },
      });

      // Get presigned URL for the logo (long expiry for branding)
      const logoUrl = await minioStorage.getPresignedUrl(objectKey, { expirySeconds: 604800 }); // 7 days

      // Store logo info
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

    // R7B: Audit logging for branding mutation
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

    return this.getBranding();
  }

  // ============================================
  // Risk Score Settings
  // ============================================

  async getRiskScoreSettings(): Promise<Record<string, unknown>> {
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

  async updateRiskScoreSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key: `risk-score.${key}` },
        update: { value: JSON.parse(JSON.stringify(value)) },
        create: { key: `risk-score.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'risk-score' },
      });
    }

    // R7B: Audit logging for risk score settings mutation
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

    const result = await this.getRiskScoreSettings();

    // When applyDefaultSettings=true, return equal weights regardless of stored values
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

  async getRemoteDesktopSettings(): Promise<Record<string, unknown>> {
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

  async updateRemoteDesktopSettings(input: Record<string, unknown>, userId?: string, ipAddress?: string): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key: `remote-desktop.${key}` },
        update: { value: JSON.parse(JSON.stringify(value)) },
        create: { key: `remote-desktop.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'remote-desktop' },
      });
    }

    // R7B: Audit logging for remote desktop settings mutation
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

    return this.getRemoteDesktopSettings();
  }

  async resetRemoteDesktopSettings(): Promise<Record<string, unknown>> {
    // Delete all remote-desktop settings to reset to defaults
    await prisma.setting.deleteMany({
      where: { category: 'remote-desktop' },
    });

    return this.getRemoteDesktopSettings();
  }

  // ============================================
  // Vendor Logos
  // ============================================

  async listVendorLogos() {
    return prisma.vendorLogo.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVendorLogo(id: string) {
    const logo = await prisma.vendorLogo.findUnique({ where: { id } });
    if (!logo) throw new NotFoundError('Vendor logo not found');
    return logo;
  }


  async getVendorLogoImage(id: string): Promise<string | null> {
    const logo = await prisma.vendorLogo.findUnique({ where: { id } });
    if (!logo) {
      throw new NotFoundError('Vendor logo not found');
    }

    if (!logo.objectKey) {
      return null;
    }

    // Generate fresh presigned URL with 1-hour expiry
    return minioStorage.getPresignedUrl(logo.objectKey, { expirySeconds: 3600 });
  }


  async createVendorLogo(
    data: { name: string; type: string },
    logoFile: { buffer: Buffer; originalname: string; mimetype: string },
    userId?: string,
    ipAddress?: string
  ) {
    // Check for duplicate vendor logo name (case-insensitive)
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

    // Get presigned URL (7 days expiry)
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

    // R7B: Audit logging for vendor logo creation
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

  async updateVendorLogo(
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

    // If new logo file provided, upload it
    if (logoFile) {
      // Delete old logo from MinIO if exists
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

    // R7B: Audit logging for vendor logo update
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

  async deleteVendorLogo(id: string, userId?: string, ipAddress?: string) {
    const logo = await prisma.vendorLogo.findUnique({ where: { id } });
    if (!logo) throw new NotFoundError('Vendor logo not found');

    // Delete from MinIO if exists
    if (logo.objectKey) {
      try {
        await minioStorage.deleteObject(logo.objectKey);
      } catch {
        // Ignore deletion errors
      }
    }

    await prisma.vendorLogo.delete({ where: { id } });

    // R7B: Audit logging for vendor logo deletion
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
  // Patch Management Settings (singleton)
  // ============================================

  async getPatchManagementSettings(): Promise<Record<string, unknown>> {
    const settings = await prisma.setting.findMany({
      where: { category: 'patch-management' },
    });

    const defaults: Record<string, unknown> = {
      requireApprovalForDeployment: false,
      requireTestBeforeApproval: true,
      autoApproveFromVendors: [],
      autoApproveSeverities: [],
    };

    const result = { ...defaults };
    for (const setting of settings) {
      const key = setting.key.replace('patch-management.', '');
      result[key] = setting.value;
    }

    return result;
  }

  async updatePatchManagementSettings(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key: `patch-management.${key}` },
        update: { value: JSON.parse(JSON.stringify(value)) },
        create: { key: `patch-management.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'patch-management' },
      });
    }

    return this.getPatchManagementSettings();
  }

  async getPasswordPolicy(): Promise<Record<string, unknown>> {
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

  async updatePasswordPolicy(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const policy = await this.getPasswordPolicy();
    const updated = { ...policy, ...input };

    await prisma.setting.upsert({
      where: { key: 'passwordPolicy' },
      update: { value: updated as unknown as Record<string, string> },
      create: { key: 'passwordPolicy', value: updated as unknown as Record<string, string>, category: 'security' },
    });

    return this.getPasswordPolicy();
  }

  // ============================================
  // LDAP Group Mappings
  // ============================================

  async listGroupMappings(ldapConfigId: string) {
    const config = await prisma.ldapConfig.findUnique({ where: { id: ldapConfigId } });
    if (!config) throw new NotFoundError('LDAP configuration not found');

    const mappings = await prisma.ldapGroupMapping.findMany({
      where: { ldapConfigId },
      include: { role: { select: { id: true, name: true } } },
      orderBy: { priority: 'desc' },
    });

    return mappings.map((m) => ({
      id: m.id,
      ldapGroupDn: m.ldapGroupDn,
      roleId: m.roleId,
      roleName: m.role.name,
      priority: m.priority,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  async createGroupMapping(ldapConfigId: string, input: { ldapGroupDn: string; roleId: string; priority?: number }) {
    const config = await prisma.ldapConfig.findUnique({ where: { id: ldapConfigId } });
    if (!config) throw new NotFoundError('LDAP configuration not found');

    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) throw new BadRequestError('Role not found');

    const existing = await prisma.ldapGroupMapping.findUnique({
      where: { ldapConfigId_ldapGroupDn: { ldapConfigId, ldapGroupDn: input.ldapGroupDn } },
    });
    if (existing) {
      throw new ConflictError('Group mapping already exists for this LDAP group');
    }

    const mapping = await prisma.ldapGroupMapping.create({
      data: {
        ldapConfigId,
        ldapGroupDn: input.ldapGroupDn,
        roleId: input.roleId,
        priority: input.priority ?? 0,
      },
      include: { role: { select: { id: true, name: true } } },
    });

    return {
      id: mapping.id,
      ldapGroupDn: mapping.ldapGroupDn,
      roleId: mapping.roleId,
      roleName: mapping.role.name,
      priority: mapping.priority,
      createdAt: mapping.createdAt,
    };
  }

  async updateGroupMapping(mappingId: string, input: { ldapGroupDn?: string; roleId?: string; priority?: number }) {
    const existing = await prisma.ldapGroupMapping.findUnique({ where: { id: mappingId } });
    if (!existing) throw new NotFoundError('Group mapping not found');

    if (input.roleId) {
      const role = await prisma.role.findUnique({ where: { id: input.roleId } });
      if (!role) throw new BadRequestError('Role not found');
    }

    const mapping = await prisma.ldapGroupMapping.update({
      where: { id: mappingId },
      data: {
        ...(input.ldapGroupDn && { ldapGroupDn: input.ldapGroupDn }),
        ...(input.roleId && { roleId: input.roleId }),
        ...(input.priority !== undefined && { priority: input.priority }),
      },
      include: { role: { select: { id: true, name: true } } },
    });

    return {
      id: mapping.id,
      ldapGroupDn: mapping.ldapGroupDn,
      roleId: mapping.roleId,
      roleName: mapping.role.name,
      priority: mapping.priority,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    };
  }

  async deleteGroupMapping(mappingId: string) {
    const existing = await prisma.ldapGroupMapping.findUnique({ where: { id: mappingId } });
    if (!existing) throw new NotFoundError('Group mapping not found');

    await prisma.ldapGroupMapping.delete({ where: { id: mappingId } });
  }

  async discoverGroups(ldapConfigId: string) {
    const config = await prisma.ldapConfig.findUnique({ where: { id: ldapConfigId } });
    if (!config) throw new NotFoundError('LDAP configuration not found');

    const { searchGroups } = await import('@shared/services/ldap.service');

    const groups = await searchGroups({
      host: config.host,
      port: config.port,
      baseDn: config.baseDn,
      bindDn: decrypt(config.bindDnEnc),
      bindPassword: decrypt(config.bindPasswordEnc),
      groupSearchBase: config.groupSearchBase || undefined,
      groupFilter: config.groupFilter || undefined,
      groupMemberAttribute: config.groupMemberAttribute,
    });

    return groups;
  }

  // ============================================
  // LDAP Sync
  // ============================================

  async triggerLdapSync(ldapConfigId: string) {
    const config = await prisma.ldapConfig.findUnique({ where: { id: ldapConfigId } });
    if (!config) throw new NotFoundError('LDAP configuration not found');

    // Check for running sync
    const running = await prisma.ldapSyncJob.findFirst({
      where: { ldapConfigId, status: 'RUNNING' },
    });
    if (running) {
      const err = new BadRequestError('A sync is already in progress for this LDAP configuration');
      (err as unknown as { statusCode: number }).statusCode = 409;
      throw err;
    }

    // Create sync job
    const job = await prisma.ldapSyncJob.create({
      data: {
        ldapConfigId,
        status: 'RUNNING',
        triggerType: 'MANUAL',
        startedAt: new Date(),
      },
    });

    // Run sync asynchronously
    this.executeLdapSync(config, job.id).catch((err) => {
      logger.error({ err, jobId: job.id }, 'LDAP sync failed');
    });

    return { id: job.id, syncJobId: job.id, status: 'RUNNING', triggerType: 'MANUAL' };
  }

  private async executeLdapSync(config: { id: string; host: string; port: number; baseDn: string; bindDnEnc: string; bindPasswordEnc: string; userSearchBase: string | null; userFilter: string | null; groupSearchBase: string | null; groupFilter: string | null; groupMemberAttribute: string }, jobId: string) {
    const syncLog: Array<{ action: string; email: string; detail: string }> = [];
    const errorLog: Array<{ email?: string; error: string }> = [];
    let usersFound = 0, usersCreated = 0, usersUpdated = 0, usersDeactivated = 0, usersReactivated = 0, errors = 0;

    try {
      const { searchUsers, searchGroups } = await import('@shared/services/ldap.service');

      const decryptedConfig = {
        host: config.host,
        port: config.port,
        baseDn: config.baseDn,
        bindDn: decrypt(config.bindDnEnc),
        bindPassword: decrypt(config.bindPasswordEnc),
        userSearchBase: config.userSearchBase || undefined,
        userFilter: config.userFilter || '(objectClass=inetOrgPerson)',
      };

      // Search for all LDAP users
      const { users: ldapUsers } = await searchUsers(
        decryptedConfig,
        decryptedConfig.userFilter,
        1000
      );

      // Search for all groups to determine membership
      const groups = await searchGroups({
        ...decryptedConfig,
        groupSearchBase: config.groupSearchBase || undefined,
        groupFilter: config.groupFilter || '(objectClass=groupOfNames)',
        groupMemberAttribute: config.groupMemberAttribute || 'member',
      });

      usersFound = ldapUsers.length;
      const ldapDnSet = new Set<string>();

      // Get group mappings for role resolution
      const mappings = await prisma.ldapGroupMapping.findMany({
        where: { ldapConfigId: config.id },
        include: { role: true },
        orderBy: { priority: 'desc' },
      });

      const defaultRole = await prisma.role.findFirst({
        where: { name: 'user', isSystem: true },
      });

      for (const ldapUser of ldapUsers) {
        const email = ldapUser.mail ? String(ldapUser.mail).toLowerCase() : null;
        const dn = String(ldapUser.dn);
        const name = String(ldapUser.cn || '');

        if (!email) {
          syncLog.push({ action: 'skipped', email: dn, detail: 'No email attribute' });
          continue;
        }

        ldapDnSet.add(dn.toLowerCase());

        // Determine user's group membership from groups
        const userGroups: string[] = [];
        for (const group of groups) {
          const members = group.members || [];
          if (members.some((m: string) => m.toLowerCase() === dn.toLowerCase())) {
            userGroups.push(group.dn);
          }
        }

        // Resolve role
        let roleId = defaultRole!.id;
        for (const mapping of mappings) {
          if (userGroups.some(g => g.toLowerCase() === mapping.ldapGroupDn.toLowerCase())) {
            roleId = mapping.roleId;
            break;
          }
        }

        try {
          const existingUser = await prisma.user.findUnique({ where: { email } });

          if (existingUser) {
            if (existingUser.authSource === 'LOCAL') {
              syncLog.push({ action: 'skipped', email, detail: 'Local user — not overwritten' });
              continue;
            }
            if (existingUser.ldapConfigId && existingUser.ldapConfigId !== config.id) {
              syncLog.push({ action: 'skipped', email, detail: 'Belongs to different LDAP config' });
              continue;
            }

            // Update existing LDAP user
            const wasInactive = !existingUser.isActive;
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name,
                ldapDn: dn,
                ldapConfigId: config.id,
                roleId,
                isActive: true,
                authSource: 'LDAP',
              },
            });

            if (wasInactive) {
              usersReactivated++;
              syncLog.push({ action: 'reactivated', email, detail: 'Found in LDAP directory again' });
            } else {
              usersUpdated++;
              syncLog.push({ action: 'updated', email, detail: `Role: ${roleId}` });
            }
          } else {
            // Create new user
            await prisma.user.create({
              data: {
                email,
                name,
                passwordHash: '',
                authSource: 'LDAP',
                ldapDn: dn,
                ldapConfigId: config.id,
                roleId,
                isActive: true,
              },
            });
            usersCreated++;
            syncLog.push({ action: 'created', email, detail: `Role: ${roleId}` });
          }
        } catch (err) {
          errors++;
          errorLog.push({ email, error: err instanceof Error ? err.message : String(err) });
        }
      }

      // Detect removed users (deactivate)
      const existingLdapUsers = await prisma.user.findMany({
        where: { authSource: 'LDAP', ldapConfigId: config.id, isActive: true },
      });

      for (const localUser of existingLdapUsers) {
        if (localUser.ldapDn && !ldapDnSet.has(localUser.ldapDn.toLowerCase())) {
          await prisma.user.update({
            where: { id: localUser.id },
            data: { isActive: false },
          });
          usersDeactivated++;
          syncLog.push({ action: 'deactivated', email: localUser.email, detail: 'No longer in LDAP directory' });
        }
      }

      // Update job as completed
      await prisma.ldapSyncJob.update({
        where: { id: jobId },
        data: {
          status: errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          usersFound,
          usersCreated,
          usersUpdated,
          usersDeactivated,
          usersReactivated,
          errors,
          syncLog: JSON.parse(JSON.stringify(syncLog)),
          errorLog: errorLog.length > 0 ? JSON.parse(JSON.stringify(errorLog)) : undefined,
          completedAt: new Date(),
        },
      });

      // Update LdapConfig lastSync fields
      await prisma.ldapConfig.update({
        where: { id: config.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: errors > 0 ? 'partial' : 'success',
        },
      });

    } catch (err) {
      // Sync failed completely
      await prisma.ldapSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errors: 1,
          errorLog: JSON.parse(JSON.stringify([{ error: err instanceof Error ? err.message : String(err) }])),
          completedAt: new Date(),
        },
      });

      await prisma.ldapConfig.update({
        where: { id: config.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'failed',
        },
      });
    }
  }

  async listSyncJobs(ldapConfigId: string) {
    const config = await prisma.ldapConfig.findUnique({ where: { id: ldapConfigId } });
    if (!config) throw new NotFoundError('LDAP configuration not found');

    return prisma.ldapSyncJob.findMany({
      where: { ldapConfigId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        triggerType: true,
        usersFound: true,
        usersCreated: true,
        usersUpdated: true,
        usersDeactivated: true,
        usersReactivated: true,
        errors: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });
  }

  async getSyncJob(jobId: string) {
    const job = await prisma.ldapSyncJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Sync job not found');
    return job;
  }

  // ============================================
  // Enroll Secrets
  // ============================================

  async createEnrollSecret(data: { name: string; organizationId?: string; departmentId?: string; expiresAt?: string | null; maxUses?: number | null }, userId: string) {
    const secret = crypto.randomBytes(32).toString('hex');
    const record = await prisma.enrollSecret.create({
      data: {
        name: data.name, secret,
        organizationId: data.organizationId || null,
        departmentId: data.departmentId || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        maxUses: data.maxUses ?? null, createdBy: userId,
      },
      include: { organization: true, department: true },
    });
    return {
      id: record.id, name: record.name, secret: record.secret,
      organizationId: record.organizationId, organization: record.organization?.name || null,
      departmentId: record.departmentId, department: record.department?.name || null,
      expiresAt: record.expiresAt?.toISOString() || null,
      maxUses: record.maxUses, usedCount: record.usedCount, isActive: record.isActive,
      createdBy: record.createdBy,
      createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
    };
  }

  async listEnrollSecrets() {
    const records = await prisma.enrollSecret.findMany({
      include: { organization: true, department: true },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(r => ({
      id: r.id, name: r.name, secret: r.secret.substring(0, 8) + '...',
      organizationId: r.organizationId, organization: r.organization?.name || null,
      departmentId: r.departmentId, department: r.department?.name || null,
      expiresAt: r.expiresAt?.toISOString() || null,
      maxUses: r.maxUses, usedCount: r.usedCount, isActive: r.isActive,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async getEnrollSecret(id: string) {
    const r = await prisma.enrollSecret.findUnique({ where: { id }, include: { organization: true, department: true } });
    if (!r) throw new NotFoundError('Enrollment secret not found');
    return {
      id: r.id, name: r.name, secret: r.secret.substring(0, 8) + '...',
      organizationId: r.organizationId, organization: r.organization?.name || null,
      departmentId: r.departmentId, department: r.department?.name || null,
      expiresAt: r.expiresAt?.toISOString() || null,
      maxUses: r.maxUses, usedCount: r.usedCount, isActive: r.isActive,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    };
  }

  async updateEnrollSecret(id: string, data: Record<string, unknown>) {
    const existing = await prisma.enrollSecret.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Enrollment secret not found');
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;
    if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt as string) : null;
    if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    const r = await prisma.enrollSecret.update({ where: { id }, data: updateData, include: { organization: true, department: true } });
    return {
      id: r.id, name: r.name, secret: r.secret.substring(0, 8) + '...',
      organizationId: r.organizationId, organization: r.organization?.name || null,
      departmentId: r.departmentId, department: r.department?.name || null,
      expiresAt: r.expiresAt?.toISOString() || null,
      maxUses: r.maxUses, usedCount: r.usedCount, isActive: r.isActive,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    };
  }

  async deleteEnrollSecret(id: string) {
    const existing = await prisma.enrollSecret.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Enrollment secret not found');
    await prisma.enrollSecret.delete({ where: { id } });
    return { message: 'Enrollment secret deleted' };
  }

  async validateEnrollSecret(secretValue: string | undefined): Promise<{ id: string; organizationId: string | null; departmentId: string | null; maxUses: number | null; usedCount: number } | null> {
    const activeCount = await prisma.enrollSecret.count({ where: { isActive: true } });

    if (activeCount === 0) {
      if (!secretValue) {
        return null;
      }
      return null;
    }
    if (!secretValue) {
      throw new UnauthorizedError('Enrollment secret required');
    }
    const secret = await prisma.enrollSecret.findUnique({ where: { secret: secretValue } });
    if (!secret) throw new UnauthorizedError('Invalid enrollment secret');
    if (!secret.isActive) throw new UnauthorizedError('Enrollment secret is inactive');
    if (secret.expiresAt && secret.expiresAt < new Date()) throw new UnauthorizedError('Enrollment secret has expired');
    if (secret.maxUses !== null && secret.usedCount >= secret.maxUses) throw new UnauthorizedError('Enrollment secret usage limit reached');
    return { id: secret.id, organizationId: secret.organizationId, departmentId: secret.departmentId, maxUses: secret.maxUses, usedCount: secret.usedCount };
  }

  async incrementEnrollSecretUsage(secretId: string): Promise<void> {
    await prisma.enrollSecret.update({ where: { id: secretId }, data: { usedCount: { increment: 1 } } });
  }

  // ============================================
  // Agent Approval Settings
  // ============================================

  async getAgentApprovalSettings() {
    const setting = await prisma.setting.findUnique({ where: { key: 'agent-approval-settings' } });
    if (!setting) {
      return { approvalType: 'MANUAL', autoApprovalBasedOn: 'ALL', criteria: {} };
    }
    const val = setting.value as Record<string, unknown>;
    const result = { approvalType: (val.approvalType as string) || 'MANUAL', autoApprovalBasedOn: (val.autoApprovalBasedOn as string) || 'ALL', criteria: val.criteria || {} };
    return result;
  }

  async updateAgentApprovalSettings(data: Record<string, unknown>) {
    const current = await this.getAgentApprovalSettings();
    const merged = { ...current, ...data };
    await prisma.setting.upsert({
      where: { key: 'agent-approval-settings' },
      update: { value: merged },
      create: { key: 'agent-approval-settings', value: merged, category: 'agent' },
    });
    return merged;
  }

  // ============================================
  // RedHat Nominations
  // ============================================

  async createRedHatNomination(data: { agentId: string; name: string; scheduledTime?: string | null; endpoint?: number }, userId: string) {
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
    return this.transformNomination(nomination);
  }

  async listRedHatNominations() {
    const nominations = await prisma.redHatNomination.findMany({
      include: { agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return nominations.map(n => this.transformNomination(n));
  }

  async getRedHatNomination(id: string) {
    const nomination = await prisma.redHatNomination.findUnique({
      where: { id },
      include: { agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } } },
    });
    if (!nomination) throw new NotFoundError('Red Hat nomination not found');
    return this.transformNomination(nomination);
  }

  async updateRedHatNomination(id: string, data: Record<string, unknown>, userId: string) {
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
    return this.transformNomination(nomination);
  }

  async deleteRedHatNomination(id: string) {
    const existing = await prisma.redHatNomination.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Red Hat nomination not found');
    await prisma.redHatNomination.delete({ where: { id } });
    return { message: 'Red Hat nomination deleted' };
  }

  private transformNomination(n: { id: string; agentId: string; agent: { id: string; hostname: string | null; os: string | null; osVersion: string | null; status: string; ipAddress: string | null } | null; name: string; status: string; endpoint: number; scheduledTime: string | null; lastSyncTime: Date | null; updatedBy: string | null; createdAt: Date; updatedAt: Date }) {
    return { id: n.id, agentId: n.agentId, agent: n.agent, name: n.name, status: n.status, endpoint: n.endpoint, scheduledTime: n.scheduledTime, lastSyncTime: n.lastSyncTime?.toISOString() || null, updatedBy: n.updatedBy, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
  }

}

export const settingsService = new SettingsService();

// ============================================
// Standalone Consumer Functions (R5 + R6)
// ============================================

export async function getRemoteDesktopSettings(): Promise<{
  connectionType: string;
  remoteSessionIndicator: boolean;
  userConsent: boolean;
}> {
  const result = await settingsService.getRemoteDesktopSettings();
  return {
    connectionType: (result.connectionType as string) || 'Local',
    remoteSessionIndicator: (result.remoteSessionIndicator as boolean) ?? false,
    userConsent: (result.userConsent as boolean) ?? false,
  };
}

export async function getRiskScoreWeights(): Promise<{
  applyDefaultSettings: boolean;
  vulnerabilityScoreWeight: number;
  vulnerabilitySeverityWeight: number;
  threatsWeight: number;
  endpointVisitsWeight: number;
}> {
  const result = await settingsService.getRiskScoreSettings();
  const applyDefault = (result.applyDefaultSettings as boolean) ?? true;
  if (applyDefault) {
    return {
      applyDefaultSettings: true,
      vulnerabilityScoreWeight: 0.25,
      vulnerabilitySeverityWeight: 0.25,
      threatsWeight: 0.25,
      endpointVisitsWeight: 0.25,
    };
  }
  return {
    applyDefaultSettings: false,
    vulnerabilityScoreWeight: (result.vulnerabilityScoreWeight as number) ?? 0.25,
    vulnerabilitySeverityWeight: (result.vulnerabilitySeverityWeight as number) ?? 0.25,
    threatsWeight: (result.threatsWeight as number) ?? 0.25,
    endpointVisitsWeight: (result.endpointVisitsWeight as number) ?? 0.25,
  };
}

const SEVERITY_SCORES: Record<string, number> = {
  CRITICAL: 1.0, HIGH: 0.75, MEDIUM: 0.5, LOW: 0.25,
};

export async function computeAssetRiskScores(): Promise<void> {
  const weights = await getRiskScoreWeights();
  const assets = await prisma.asset.findMany({
    where: { vulnerabilities: { some: { status: 'Open' } } },
    select: {
      id: true,
      vulnerabilities: {
        where: { status: 'Open' },
        select: {
          vulnerability: {
            select: { epss: true, cvss3BaseScore: true, severity: true, exploitable: true },
          },
        },
      },
    },
  });
  for (const asset of assets) {
    const vulns = asset.vulnerabilities.map((av) => av.vulnerability);
    if (vulns.length === 0) continue;
    const scores = vulns.map((v) => {
      if (v.epss != null) return v.epss / 100;
      if (v.cvss3BaseScore != null) return v.cvss3BaseScore / 10;
      return 0;
    });
    const vulnScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const severityScore = Math.max(...vulns.map((v) => SEVERITY_SCORES[v.severity.toUpperCase()] ?? 0));
    const threatScore = vulns.some((v) => v.exploitable) ? 1.0 : 0.0;
    const endpointVisitsScore = 0.5;
    const riskScore =
      vulnScore * weights.vulnerabilityScoreWeight +
      severityScore * weights.vulnerabilitySeverityWeight +
      threatScore * weights.threatsWeight +
      endpointVisitsScore * weights.endpointVisitsWeight;
    await prisma.asset.update({
      where: { id: asset.id },
      data: { riskScore: Math.round(riskScore * 1000) / 1000 },
    });
  }
}
