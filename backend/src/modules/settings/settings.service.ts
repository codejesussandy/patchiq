import { prisma } from '@db/client';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { encrypt, decrypt } from '@shared/utils/crypto';
import type {
  AlertConfigResponse,
  LdapConfigResponse,
  AuditLogResponse,
  AuditLogFilterOptions,
  PaginatedResponse,
  MessageResponse,
  SuccessResponse,
  AgentApprovalResponse,
} from './settings.types';
import type {
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
      orderBy: { type: 'asc' },
    });

    return configs.map((c) => this.transformAlertConfig(c));
  }

  async getAlertConfig(type: string): Promise<AlertConfigResponse> {
    const config = await prisma.alertConfig.findUnique({
      where: { type },
    });

    if (!config) {
      // Return default config
      return {
        id: '',
        type,
        enabled: false,
        config: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return this.transformAlertConfig(config);
  }

  async updateAlertConfig(type: string, input: UpdateAlertConfigInput): Promise<AlertConfigResponse> {
    const config = await prisma.alertConfig.upsert({
      where: { type },
      update: {
        enabled: input.enabled,
        config: input.config ? JSON.parse(JSON.stringify(input.config)) : undefined,
      },
      create: {
        type,
        enabled: input.enabled ?? false,
        config: input.config ? JSON.parse(JSON.stringify(input.config)) : {},
      },
    });

    return this.transformAlertConfig(config);
  }

  private transformAlertConfig(config: {
    id: string;
    type: string;
    enabled: boolean;
    config: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): AlertConfigResponse {
    return {
      id: config.id,
      type: config.type,
      enabled: config.enabled,
      config: config.config as Record<string, unknown>,
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
    // Encrypt sensitive fields
    const bindDnEnc = encrypt(input.bindDn);
    const bindPasswordEnc = encrypt(input.bindPassword);

    const config = await prisma.ldapConfig.create({
      data: {
        name: input.name,
        host: input.host,
        port: input.port,
        baseDn: input.baseDn,
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

    const updateData: Record<string, unknown> = {
      name: input.name,
      host: input.host,
      port: input.port,
      baseDn: input.baseDn,
      userFilter: input.userFilter,
      isActive: input.isActive,
    };

    if (input.bindDn) {
      updateData.bindDnEnc = encrypt(input.bindDn);
    }
    if (input.bindPassword) {
      updateData.bindPasswordEnc = encrypt(input.bindPassword);
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

    // TODO: Implement actual LDAP connection test
    console.log(`[DEV] Testing LDAP connection to ${config.host}:${config.port}`);
    console.log(`[DEV] Base DN: ${config.baseDn}, Bind DN: ${bindDn}`);

    // Simulated success for now
    return {
      success: true,
      message: 'LDAP connection successful',
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
    // TODO: Implement actual proxy test
    console.log(`[DEV] Testing proxy connection to ${input.host}:${input.port}`);

    return {
      success: true,
      message: 'Proxy connection successful',
    };
  }

  async getMailServer(): Promise<Record<string, unknown>> {
    const settings = await prisma.setting.findMany({
      where: { category: 'mail' },
    });

    const defaults: Record<string, unknown> = {
      host: '',
      port: 587,
      secure: true,
      username: null,
      fromAddress: null,
      fromName: null,
    };

    const result = { ...defaults };
    for (const setting of settings) {
      const key = setting.key.replace('mail.', '');
      result[key] = setting.value;
    }

    return result;
  }

  async updateMailServer(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const updates = Object.entries(input).filter(([, value]) => value !== undefined);

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
    // TODO: Implement actual mail server test
    console.log(`[DEV] Testing mail server ${input.host}:${input.port}`);
    console.log(`[DEV] Sending test email to ${input.testEmail}`);

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
}

export const settingsService = new SettingsService();
