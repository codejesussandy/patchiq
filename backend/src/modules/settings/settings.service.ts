import { prisma } from '@db/client';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { encrypt, decrypt } from '@shared/utils/crypto';
import { emailService, type MailServerConfig } from '@shared/services/email.service';
import { ldapService, type LdapConfig } from '@shared/services/ldap.service';
import { proxyService, type ProxyConfig } from '@shared/services/proxy.service';
import { minioStorage } from '@shared/services/minio.service';
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
    // Normalize field names (support both old and new naming conventions)
    const baseDn = input.baseDn || (input as any).baseDN;
    const bindDn = input.bindDn || (input as any).username;
    const bindPassword = input.bindPassword || (input as any).password;

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

    // Normalize field names (support both old and new naming conventions)
    const baseDn = input.baseDn || (input as any).baseDN;
    const bindDn = input.bindDn || (input as any).username;
    const bindPassword = input.bindPassword || (input as any).password;

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

    return this.transformLdapConfig(updated);
  }

  async deleteLdapConfig(id: string): Promise<void> {
    const config = await prisma.ldapConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundError('LDAP configuration not found');
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

    console.log(`[LDAP Test] Testing connection to ${config.host}:${config.port}`);
    console.log(`[LDAP Test] Base DN: ${config.baseDn}, Bind DN: ${bindDn}`);

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

  async updateServerSettings(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key: `server.${key}` },
        update: { value: JSON.parse(JSON.stringify(value)) },
        create: { key: `server.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'server' },
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
      ssdmRefreshCycle: 300,
      processRefreshCycle: 300,
      networkRefreshCycle: 600,
      certificateRefreshCycle: 3600,
      startupItemsRefreshCycle: 3600,
      usersRefreshCycle: 3600,
      systemResourcesRefreshCycle: 60,
      systemServicesRefreshCycle: 300,
      fimEventsRefreshCycle: 60,
      softwareMeterRefreshCycle: 3600,
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
      result[key] = setting.value;
    }

    return result;
  }

  async updateProxyServer(input: Record<string, unknown>): Promise<Record<string, unknown>> {
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

    return this.getProxyServer();
  }

  async testProxyServer(input: Record<string, unknown>): Promise<SuccessResponse> {
    const host = input.host as string;
    const port = Number(input.port);
    const protocol = (input.protocol as 'HTTP' | 'HTTPS' | 'SOCKS5') || 'HTTP';

    console.log(`[Proxy Test] Testing proxy connection to ${host}:${port} (${protocol})`);

    const proxyConfig: ProxyConfig = {
      host,
      port,
      protocol,
      username: input.username as string | undefined,
      password: input.password as string | undefined,
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

    // Build internal config first
    const internal: Record<string, unknown> = {
      host: '',
      port: 587,
      secure: true,
      username: null,
      fromAddress: null,
      fromName: null,
      enableAuthentication: false,
    };

    for (const setting of settings) {
      const key = setting.key.replace('mail.', '');
      // Don't return encrypted password
      if (key !== 'password') {
        internal[key] = setting.value;
      }
    }

    // Convert secure (boolean) to protocol (NONE/SSL/TLS)
    let protocol: 'NONE' | 'SSL' | 'TLS' = 'NONE';
    if (internal.secure === true) {
      // Port 465 typically uses SSL, others use TLS
      protocol = internal.port === 465 ? 'SSL' : 'TLS';
    }

    // Return with frontend field names
    return {
      smtpHost: internal.host,
      smtpPort: internal.port,
      protocol,
      email: internal.fromAddress,
      enableAuthentication: internal.enableAuthentication || !!internal.username,
      username: internal.username,
      fromName: internal.fromName,
      // Also return backend names for compatibility
      host: internal.host,
      port: internal.port,
      secure: internal.secure,
      fromAddress: internal.fromAddress,
    };
  }

  async updateMailServer(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Normalize frontend field names to backend field names
    const normalized: Record<string, unknown> = {};

    // Map smtpHost -> host
    if (input.smtpHost !== undefined) {
      normalized.host = input.smtpHost;
    } else if (input.host !== undefined) {
      normalized.host = input.host;
    }

    // Map smtpPort -> port
    if (input.smtpPort !== undefined) {
      normalized.port = Number(input.smtpPort);
    } else if (input.port !== undefined) {
      normalized.port = Number(input.port);
    }

    // Map protocol (NONE/SSL/TLS) -> secure (boolean)
    if (input.protocol !== undefined) {
      normalized.secure = input.protocol !== 'NONE';
    } else if (input.secure !== undefined) {
      normalized.secure = input.secure;
    }

    // Map email -> fromAddress
    if (input.email !== undefined) {
      normalized.fromAddress = input.email;
    } else if (input.fromAddress !== undefined) {
      normalized.fromAddress = input.fromAddress;
    }

    // Handle enableAuthentication flag
    if (input.enableAuthentication !== undefined) {
      normalized.enableAuthentication = input.enableAuthentication;
    }

    // Pass through username, password, fromName
    if (input.username !== undefined) normalized.username = input.username;
    if (input.password !== undefined) normalized.password = input.password;
    if (input.fromName !== undefined) normalized.fromName = input.fromName;

    const updates = Object.entries(normalized).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      // Encrypt password if provided
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

    return this.getMailServer();
  }

  async testMailServer(input: Record<string, unknown>): Promise<SuccessResponse> {
    // Normalize frontend field names to backend field names
    const host = (input.smtpHost || input.host) as string;
    const port = Number(input.smtpPort || input.port);
    const testEmail = input.testEmail as string;

    // Determine secure from protocol or secure flag
    let secure = false;
    if (input.protocol !== undefined) {
      secure = input.protocol !== 'NONE';
    } else if (input.secure !== undefined) {
      secure = input.secure as boolean;
    }

    // Get password - if provided use it, otherwise try to get stored one
    let password = input.password as string | undefined;
    if (!password && input.enableAuthentication) {
      // Try to get stored password
      const storedPassword = await prisma.setting.findUnique({
        where: { key: 'mail.password' },
      });
      if (storedPassword?.value) {
        try {
          password = decrypt(storedPassword.value as string);
        } catch {
          // Password couldn't be decrypted
        }
      }
    }

    const mailConfig: MailServerConfig = {
      host,
      port,
      secure,
      username: input.username as string | undefined,
      password,
      fromAddress: (input.email || input.fromAddress) as string | undefined,
      fromName: input.fromName as string | undefined,
    };

    console.log(`[Mail Test] Testing mail server ${host}:${port} (secure: ${secure})`);
    console.log(`[Mail Test] Sending test email to ${testEmail}`);

    // Send actual test email
    const result = await emailService.sendTestEmail(mailConfig, testEmail);

    if (!result.success) {
      throw new BadRequestError(result.message);
    }

    return {
      success: true,
      message: result.message,
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
    // TODO: Trigger actual CVE database sync job
    console.log('[DEV] Triggering CVE database sync');

    // Update last sync time
    const dbSync = await prisma.vulnerabilityDBSync.findFirst();
    if (dbSync) {
      await prisma.vulnerabilityDBSync.update({
        where: { id: dbSync.id },
        data: { lastSync: new Date() },
      });
    }

    return {
      success: true,
      message: 'CVE database sync initiated',
    };
  }

  // ============================================
  // Platform License
  // ============================================

  async getPlatformLicense(): Promise<Record<string, unknown>> {
    const settings = await prisma.setting.findMany({
      where: { category: 'license' },
    });

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
      numberOfEndpoints: 10,
      usedEndpoints: 0,
      activationCode: '',
      remainingDays: 30,
      remainingEndpoints: 10,
    };

    const result = { ...defaults };
    for (const setting of settings) {
      const key = setting.key.replace('license.', '');
      result[key] = setting.value;
    }

    // Calculate remaining days and endpoints
    if (result.expiresOn) {
      const expiryDate = new Date(result.expiresOn as string);
      const today = new Date();
      result.remainingDays = Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }
    result.remainingEndpoints = Math.max(0, (result.numberOfEndpoints as number) - (result.usedEndpoints as number));

    return result;
  }

  async updatePlatformLicense(licenseCode: string): Promise<Record<string, unknown>> {
    // TODO: Validate license code with license server
    console.log(`[DEV] Validating license code: ${licenseCode}`);

    // For now, simulate a valid license
    const licenseData = {
      licenseTo: 'PatchIQ Customer',
      licenseType: 'Enterprise',
      email: 'customer@example.com',
      productCode: 'PATCHIQ-ENT',
      productVersion: '1.0.0',
      issueDate: new Date().toISOString().split('T')[0],
      expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      numberOfEndpoints: 1000,
      activationCode: licenseCode,
    };

    for (const [key, value] of Object.entries(licenseData)) {
      await prisma.setting.upsert({
        where: { key: `license.${key}` },
        update: { value },
        create: { key: `license.${key}`, value, category: 'license' },
      });
    }

    return this.getPlatformLicense();
  }

  // ============================================
  // Agent Approvals
  // ============================================

  async listAgentApprovals(params: { page: number; limit: number; search?: string }): Promise<PaginatedResponse<AgentApprovalResponse>> {
    const where: Record<string, unknown> = {
      status: 'Pending',
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

  async approveAgent(id: string): Promise<SuccessResponse> {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    if (agent.status !== 'Pending') {
      throw new BadRequestError(`Agent is already ${agent.status.toLowerCase()}`);
    }

    await prisma.agent.update({
      where: { id },
      data: { status: 'Connected' },
    });

    return {
      success: true,
      message: 'Agent approved successfully',
    };
  }

  async rejectAgent(id: string): Promise<SuccessResponse> {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    if (agent.status === 'Rejected') {
      throw new BadRequestError('Agent is already rejected');
    }

    await prisma.agent.update({
      where: { id },
      data: { status: 'Rejected' },
    });

    return {
      success: true,
      message: 'Agent rejected successfully',
    };
  }

  // ============================================
  // Computer Groups
  // ============================================

  async listComputerGroups() {
    return prisma.computerGroup.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getComputerGroup(id: string) {
    const group = await prisma.computerGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundError('Computer group not found');
    return group;
  }

  async createComputerGroup(data: { name: string; description?: string; endpoints?: string[] }) {
    return prisma.computerGroup.create({
      data: {
        name: data.name,
        description: data.description,
        endpoints: data.endpoints || [],
        endpointCount: data.endpoints?.length || 0,
      },
    });
  }

  async updateComputerGroup(id: string, data: { name?: string; description?: string; endpoints?: string[] }) {
    const group = await prisma.computerGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundError('Computer group not found');
    return prisma.computerGroup.update({
      where: { id },
      data: {
        ...data,
        endpointCount: data.endpoints ? data.endpoints.length : undefined,
      },
    });
  }

  async deleteComputerGroup(id: string) {
    const group = await prisma.computerGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundError('Computer group not found');
    await prisma.computerGroup.delete({ where: { id } });
  }

  async getAvailableEndpoints() {
    const assets = await prisma.asset.findMany({
      select: {
        id: true,
        hostname: true,
        ipAddress: true,
        status: true,
      },
      orderBy: { hostname: 'asc' },
    });
    return assets.map((a) => ({
      id: a.id,
      name: a.hostname,
      ipAddress: a.ipAddress,
      status: a.status === 'In Use' ? 'Online' : 'Offline',
    }));
  }

  // ============================================
  // Deployment Policies
  // ============================================

  async listDeploymentPolicies() {
    return prisma.deploymentPolicy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeploymentPolicy(id: string) {
    const policy = await prisma.deploymentPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('Deployment policy not found');
    return policy;
  }

  async createDeploymentPolicy(data: { name: string; description?: string; type?: string; supportedModule?: string; relatedType?: string }) {
    const count = await prisma.deploymentPolicy.count();
    return prisma.deploymentPolicy.create({
      data: {
        policyId: `POL-${String(count + 1).padStart(4, '0')}`,
        name: data.name,
        description: data.description,
        type: data.type || 'INSTANT',
        supportedModule: data.supportedModule || 'All',
        relatedType: data.relatedType || 'No Relation',
      },
    });
  }

  async updateDeploymentPolicy(id: string, data: { name?: string; description?: string; type?: string; supportedModule?: string; relatedType?: string }) {
    const policy = await prisma.deploymentPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('Deployment policy not found');
    return prisma.deploymentPolicy.update({
      where: { id },
      data,
    });
  }

  async deleteDeploymentPolicy(id: string) {
    const policy = await prisma.deploymentPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundError('Deployment policy not found');
    await prisma.deploymentPolicy.delete({ where: { id } });
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

    return result;
  }

  async updateBranding(
    input: { companyName?: string },
    logoFile?: { buffer: Buffer; originalname: string; mimetype: string }
  ): Promise<Record<string, unknown>> {
    // Update company name if provided
    if (input.companyName !== undefined) {
      await prisma.setting.upsert({
        where: { key: 'branding.companyName' },
        update: { value: JSON.parse(JSON.stringify(input.companyName)) },
        create: { key: 'branding.companyName', value: JSON.parse(JSON.stringify(input.companyName)), category: 'branding' },
      });
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

  async updateRiskScoreSettings(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key: `risk-score.${key}` },
        update: { value: JSON.parse(JSON.stringify(value)) },
        create: { key: `risk-score.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'risk-score' },
      });
    }

    return this.getRiskScoreSettings();
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
      userConsent: true,
    };

    const result = { ...defaults };
    for (const setting of settings) {
      const key = setting.key.replace('remote-desktop.', '');
      result[key] = setting.value;
    }

    return result;
  }

  async updateRemoteDesktopSettings(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

    for (const [key, value] of updates) {
      await prisma.setting.upsert({
        where: { key: `remote-desktop.${key}` },
        update: { value: JSON.parse(JSON.stringify(value)) },
        create: { key: `remote-desktop.${key}`, value: JSON.parse(JSON.stringify(value)), category: 'remote-desktop' },
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

  async createVendorLogo(
    data: { name: string; type: string },
    logoFile: { buffer: Buffer; originalname: string; mimetype: string }
  ) {
    const objectKey = `vendor-logos/${data.type}/${Date.now()}-${logoFile.originalname}`;

    await minioStorage.uploadBuffer(objectKey, logoFile.buffer, {
      contentType: logoFile.mimetype,
      metadata: {
        'original-filename': logoFile.originalname,
      },
    });

    // Get presigned URL (7 days expiry)
    const logoUrl = await minioStorage.getPresignedUrl(objectKey, { expirySeconds: 604800 });

    return prisma.vendorLogo.create({
      data: {
        name: data.name,
        type: data.type,
        logoUrl,
        fileName: logoFile.originalname,
        objectKey,
      },
    });
  }

  async updateVendorLogo(
    id: string,
    data: { name?: string; type?: string },
    logoFile?: { buffer: Buffer; originalname: string; mimetype: string }
  ) {
    const existing = await prisma.vendorLogo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Vendor logo not found');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;

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
    }

    return prisma.vendorLogo.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteVendorLogo(id: string) {
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
  }
}

export const settingsService = new SettingsService();
