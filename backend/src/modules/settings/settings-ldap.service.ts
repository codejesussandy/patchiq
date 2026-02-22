import { prisma } from '@db/client';
import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors';
import { encrypt, decrypt } from '@shared/utils/crypto';
import { createLogger } from '@shared/services/logger';
import { ldapService, type LdapConfig } from '@shared/services/ldap.service';
import type { LdapConfigResponse, SuccessResponse } from './settings.types';
import type { CreateLdapConfigInput, UpdateLdapConfigInput } from './settings.validators';

const logger = createLogger('settings');

// ============================================
// LDAP Configurations
// ============================================

export function transformLdapConfig(config: {
  id: string;
  name: string;
  host: string;
  port: number;
  baseDn: string;
  userFilter: string | null;
  isActive: boolean;
  fqdn?: string | null;
  protocol?: string | null;
  description?: string | null;
  timeoutSeconds?: number | null;
  autoSyncInterval?: string | null;
  syncEnabled?: boolean;
  groupSearchBase?: string | null;
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
    fqdn: config.fqdn ?? null,
    protocol: config.protocol ?? 'LDAP',
    description: config.description ?? null,
    timeout: config.timeoutSeconds ?? null,
    enableAutoSync: config.syncEnabled ?? false,
    autoSyncInterval: config.autoSyncInterval ?? null,
    groupBase: config.groupSearchBase ?? null,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function listLdapConfigs(): Promise<LdapConfigResponse[]> {
  const configs = await prisma.ldapConfig.findMany({
    orderBy: { name: 'asc' },
  });

  return configs.map((c) => transformLdapConfig(c));
}

export async function getLdapConfig(id: string): Promise<LdapConfigResponse> {
  const config = await prisma.ldapConfig.findUnique({
    where: { id },
  });

  if (!config) {
    throw new NotFoundError('LDAP configuration not found');
  }

  return transformLdapConfig(config);
}

export async function createLdapConfig(input: CreateLdapConfigInput): Promise<LdapConfigResponse> {
  const baseDn = input.baseDn || input.baseDN || '';
  const bindDn = input.bindDn || input.username || '';
  const bindPassword = input.bindPassword || input.password || '';

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
      fqdn: input.fqdn,
      protocol: input.protocol,
      description: input.description,
      timeoutSeconds: input.timeout,
      autoSyncInterval: input.autoSyncInterval,
      syncEnabled: input.enableAutoSync ?? false,
      groupSearchBase: input.groupBase,
    },
  });

  return transformLdapConfig(config);
}

export async function updateLdapConfig(id: string, input: UpdateLdapConfigInput): Promise<LdapConfigResponse> {
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
    fqdn: input.fqdn,
    protocol: input.protocol,
    description: input.description,
    timeoutSeconds: input.timeout,
    autoSyncInterval: input.autoSyncInterval,
    syncEnabled: input.enableAutoSync,
    groupSearchBase: input.groupBase,
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

  try {
    const { updateLdapSyncSchedule } = await import('./ldap-sync.worker');
    await updateLdapSyncSchedule(id);
  } catch (err) {
    logger.error({ err, ldapConfigId: id }, 'Failed to update LDAP sync schedule');
  }

  return transformLdapConfig(updated);
}

export async function deleteLdapConfig(id: string): Promise<void> {
  const config = await prisma.ldapConfig.findUnique({
    where: { id },
  });

  if (!config) {
    throw new NotFoundError('LDAP configuration not found');
  }

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

export async function testLdapConfig(id: string): Promise<SuccessResponse> {
  const config = await prisma.ldapConfig.findUnique({
    where: { id },
  });

  if (!config) {
    throw new NotFoundError('LDAP configuration not found');
  }

  const bindDn = decrypt(config.bindDnEnc);
  const bindPassword = decrypt(config.bindPasswordEnc);

  logger.info({ host: config.host, port: config.port, baseDn: config.baseDn, bindDn }, 'Testing LDAP connection');

  const ldapConfig: LdapConfig = {
    host: config.host,
    port: config.port,
    baseDn: config.baseDn,
    bindDn,
    bindPassword,
    useTLS: config.port === 636,
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

// ============================================
// LDAP Group Mappings
// ============================================

export async function listGroupMappings(ldapConfigId: string) {
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

export async function createGroupMapping(ldapConfigId: string, input: { ldapGroupDn: string; roleId: string; priority?: number }) {
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

export async function updateGroupMapping(mappingId: string, input: { ldapGroupDn?: string; roleId?: string; priority?: number }) {
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

export async function deleteGroupMapping(mappingId: string) {
  const existing = await prisma.ldapGroupMapping.findUnique({ where: { id: mappingId } });
  if (!existing) throw new NotFoundError('Group mapping not found');

  await prisma.ldapGroupMapping.delete({ where: { id: mappingId } });
}

export async function discoverGroups(ldapConfigId: string) {
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

export async function triggerLdapSync(ldapConfigId: string) {
  const config = await prisma.ldapConfig.findUnique({ where: { id: ldapConfigId } });
  if (!config) throw new NotFoundError('LDAP configuration not found');

  const running = await prisma.ldapSyncJob.findFirst({
    where: { ldapConfigId, status: 'RUNNING' },
  });
  if (running) {
    const err = new BadRequestError('A sync is already in progress for this LDAP configuration');
    (err as unknown as { statusCode: number }).statusCode = 409;
    throw err;
  }

  const job = await prisma.ldapSyncJob.create({
    data: {
      ldapConfigId,
      status: 'RUNNING',
      triggerType: 'MANUAL',
      startedAt: new Date(),
    },
  });

  executeLdapSync(config, job.id).catch((err) => {
    logger.error({ err, jobId: job.id }, 'LDAP sync failed');
  });

  return { id: job.id, syncJobId: job.id, status: 'RUNNING', triggerType: 'MANUAL' };
}

export async function executeLdapSync(config: { id: string; host: string; port: number; baseDn: string; bindDnEnc: string; bindPasswordEnc: string; userSearchBase: string | null; userFilter: string | null; groupSearchBase: string | null; groupFilter: string | null; groupMemberAttribute: string }, jobId: string) {
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

    const { users: ldapUsers } = await searchUsers(
      decryptedConfig,
      decryptedConfig.userFilter,
      1000
    );

    const groups = await searchGroups({
      ...decryptedConfig,
      groupSearchBase: config.groupSearchBase || undefined,
      groupFilter: config.groupFilter || '(objectClass=groupOfNames)',
      groupMemberAttribute: config.groupMemberAttribute || 'member',
    });

    usersFound = ldapUsers.length;
    const ldapDnSet = new Set<string>();

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

      const userGroups: string[] = [];
      for (const group of groups) {
        const members = group.members || [];
        if (members.some((m: string) => m.toLowerCase() === dn.toLowerCase())) {
          userGroups.push(group.dn);
        }
      }

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

    await prisma.ldapConfig.update({
      where: { id: config.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: errors > 0 ? 'partial' : 'success',
      },
    });

  } catch (err) {
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

export async function listSyncJobs(ldapConfigId: string) {
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

export async function getSyncJob(jobId: string) {
  const job = await prisma.ldapSyncJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Sync job not found');
  return job;
}
