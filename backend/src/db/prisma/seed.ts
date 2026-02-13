import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { WHITELIST_SOURCES } from '../../modules/patch-repository/whitelist-sources.seed';
import { seedCpeMappings } from './seeds/cpe-mappings.seed';

const prisma = new PrismaClient();

// Inline encryption function for seed (avoids config dependency)
function encrypt(text: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('Starting database seed...');

  // ============================================
  // Organization Structure
  // ============================================

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { name: 'Default Organization' },
    update: {},
    create: {
      name: 'Default Organization',
      description: 'Default organization for PatchIQ',
      isDefault: true,
    },
  });
  console.log('Created default organization:', org.name);

  // Create default branch
  const branch = await prisma.branch.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'Headquarters',
      },
    },
    update: {},
    create: {
      name: 'Headquarters',
      description: 'Main headquarters branch',
      organizationId: org.id,
      isDefault: true,
    },
  });
  console.log('Created default branch:', branch.name);

  // Create default department
  const department = await prisma.department.upsert({
    where: {
      branchId_name: {
        branchId: branch.id,
        name: 'IT Department',
      },
    },
    update: {},
    create: {
      name: 'IT Department',
      description: 'Information Technology Department',
      branchId: branch.id,
    },
  });
  console.log('Created default department:', department.name);

  // Create default location
  const location = await prisma.location.upsert({
    where: { name: 'Main Office' },
    update: {},
    create: {
      name: 'Main Office',
      address: '123 Main Street',
      city: 'San Francisco',
      country: 'USA',
      timezone: 'America/Los_Angeles',
    },
  });
  console.log('Created default location:', location.name);

  // ============================================
  // Roles
  // ============================================

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Full system access',
      isSystem: true,
      permissions: {
        agents: { view: true, add: true, edit: true, delete: true },
        assets: { view: true, add: true, edit: true, delete: true },
        patches: { view: true, add: true, edit: true, delete: true },
        vulnerabilities: { view: true, add: true, edit: true, delete: true },
        jobs: { view: true, add: true, edit: true, delete: true },
        discovery: { view: true, add: true, edit: true, delete: true },
        reports: { view: true, add: true, edit: true, delete: true },
        dashboard: { view: true, add: true, edit: true, delete: true },
        settings: { view: true, add: true, edit: true, delete: true },
        deployments: { view: true, add: true, edit: true, delete: true },
        notifications: { view: true, add: true, edit: true, delete: true },
        hub: { view: true, add: true, edit: true, delete: true },
        'patch-repository': { view: true, add: true, edit: true, delete: true },
        'patch-templates': { view: true, add: true, edit: true, delete: true },
        ai: { view: true, add: true, edit: true, delete: true },
      },
    },
  });
  console.log('Created admin role');

  // Create user role
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Basic user access',
      isSystem: true,
      permissions: {
        agents: { view: true, add: false, edit: false, delete: false },
        assets: { view: true, add: false, edit: false, delete: false },
        patches: { view: true, add: false, edit: false, delete: false },
        vulnerabilities: { view: true, add: false, edit: false, delete: false },
        jobs: { view: true, add: false, edit: false, delete: false },
        discovery: { view: true, add: false, edit: false, delete: false },
        reports: { view: true, add: false, edit: false, delete: false },
        dashboard: { view: true, add: false, edit: false, delete: false },
        settings: { view: false, add: false, edit: false, delete: false },
        deployments: { view: true, add: false, edit: false, delete: false },
        notifications: { view: true, add: false, edit: false, delete: false },
        hub: { view: false, add: false, edit: false, delete: false },
        'patch-repository': { view: true, add: false, edit: false, delete: false },
        'patch-templates': { view: true, add: false, edit: false, delete: false },
        ai: { view: true, add: false, edit: false, delete: false },
      },
    },
  });
  console.log('Created user role');

  // ============================================
  // LDAP Configuration (Dev)
  // ============================================

  // Dev OpenLDAP config
  const ldapConfig = await prisma.ldapConfig.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440001' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Dev OpenLDAP',
      host: 'localhost',
      port: 3389,
      baseDn: 'dc=corp,dc=example,dc=com',
      bindDnEnc: encrypt('cn=admin,dc=corp,dc=example,dc=com'),
      bindPasswordEnc: encrypt('admin-ldap-password'),
      userFilter: '(objectClass=inetOrgPerson)',
      isActive: true,
      userSearchBase: 'ou=People,dc=corp,dc=example,dc=com',
      groupSearchBase: 'ou=Groups,dc=corp,dc=example,dc=com',
      groupFilter: '(objectClass=groupOfNames)',
      emailAttribute: 'mail',
      nameAttribute: 'cn',
      usernameAttribute: 'uid',
      groupMemberAttribute: 'member',
      syncEnabled: false,
      syncInterval: 360,
    },
  });
  console.log('Created dev LDAP config:', ldapConfig.name);

  // Create LDAP group mappings
  await prisma.ldapGroupMapping.upsert({
    where: {
      ldapConfigId_ldapGroupDn: {
        ldapConfigId: ldapConfig.id,
        ldapGroupDn: 'cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com',
      },
    },
    update: {},
    create: {
      ldapConfigId: ldapConfig.id,
      ldapGroupDn: 'cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com',
      roleId: adminRole.id,
      priority: 10,
    },
  });

  await prisma.ldapGroupMapping.upsert({
    where: {
      ldapConfigId_ldapGroupDn: {
        ldapConfigId: ldapConfig.id,
        ldapGroupDn: 'cn=IT-Users,ou=Groups,dc=corp,dc=example,dc=com',
      },
    },
    update: {},
    create: {
      ldapConfigId: ldapConfig.id,
      ldapGroupDn: 'cn=IT-Users,ou=Groups,dc=corp,dc=example,dc=com',
      roleId: userRole.id,
      priority: 5,
    },
  });
  console.log('Created LDAP group mappings: IT-Admins → admin, IT-Users → user');

  // ============================================
  // Users
  // ============================================

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@patchiq.io' },
    update: {},
    create: {
      email: 'admin@patchiq.io',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      roleId: adminRole.id,
      organizationId: org.id,
      departmentId: department.id,
      locationId: location.id,
      isActive: true,
      isOnboarded: true,
    },
  });
  console.log('Created admin user:', adminUser.email);

  // Create demo user
  const demoPasswordHash = await bcrypt.hash('demo123', 12);
  await prisma.user.upsert({
    where: { email: 'demo@patchiq.io' },
    update: {},
    create: {
      email: 'demo@patchiq.io',
      passwordHash: demoPasswordHash,
      name: 'Demo User',
      roleId: userRole.id,
      organizationId: org.id,
      departmentId: department.id,
      locationId: location.id,
      isActive: true,
      isOnboarded: true,
    },
  });
  console.log('Created demo user: demo@patchiq.io');

  // ============================================
  // Tags
  // ============================================

  const tags = [
    { name: 'Production', color: '#ef4444', priority: 10, compliance: true },
    { name: 'Development', color: '#3b82f6', priority: 5, compliance: false },
    { name: 'Testing', color: '#f59e0b', priority: 3, compliance: false },
    { name: 'Critical', color: '#dc2626', priority: 15, compliance: true },
    { name: 'PCI-DSS', color: '#8b5cf6', priority: 8, compliance: true },
    { name: 'HIPAA', color: '#06b6d4', priority: 8, compliance: true },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  console.log('Created', tags.length, 'tags');

  // NOTE: No sample patches seeded — patches come from real agent discovery and patch templates.
  // NOTE: No sample vulnerabilities seeded — vulnerabilities come from real CVE database sync (NVD, CISA KEV).

  // ============================================
  // Password Policy
  // ============================================

  await prisma.setting.upsert({
    where: { key: 'passwordPolicy' },
    update: {},
    create: {
      key: 'passwordPolicy',
      value: {
        minCharacterCount: 8,
        minNumbers: true,
        minLowerCaseCharacters: true,
        minUpperCaseCharacters: true,
        minSpecialCharacters: true,
      },
      category: 'security',
    },
  });
  console.log('Created default password policy');

  // ============================================
  // Computer Groups
  // ============================================

  const computerGroups = [
    { name: 'Windows Workstations', description: 'All Windows desktop and laptop endpoints', endpoints: [], endpointCount: 0 },
    { name: 'Linux Servers', description: 'Production and staging Linux servers', endpoints: [], endpointCount: 0 },
    { name: 'macOS Devices', description: 'All macOS endpoints (MacBook, iMac)', endpoints: [], endpointCount: 0 },
    { name: 'Engineering', description: 'Engineering department endpoints', endpoints: [], endpointCount: 0 },
    { name: 'Finance', description: 'Finance department endpoints', endpoints: [], endpointCount: 0 },
    { name: 'HR', description: 'Human Resources department endpoints', endpoints: [], endpointCount: 0 },
    { name: 'Production Servers', description: 'Critical production infrastructure', endpoints: [], endpointCount: 0 },
    { name: 'Test Environment', description: 'QA and test lab machines', endpoints: [], endpointCount: 0 },
  ];

  for (const group of computerGroups) {
    const existing = await prisma.computerGroup.findFirst({ where: { name: group.name } });
    if (!existing) {
      await prisma.computerGroup.create({ data: group });
    }
  }
  console.log('Created', computerGroups.length, 'computer groups');

  // ============================================
  // Deployment Policies
  // ============================================

  const deploymentPolicies = [
    { policyId: 'DPOL-0001', name: 'Immediate Critical', description: 'Deploy critical patches immediately without delay', type: 'INSTANT', supportedModule: 'All', relatedType: 'Critical' },
    { policyId: 'DPOL-0002', name: 'Scheduled Maintenance Window', description: 'Deploy during weekly maintenance window (Sunday 2-6 AM)', type: 'SCHEDULE', supportedModule: 'Patch', relatedType: 'No Relation' },
    { policyId: 'DPOL-0003', name: 'Test First Policy', description: 'Deploy to test group first, then production after 48h', type: 'SCHEDULE', supportedModule: 'All', relatedType: 'Important' },
    { policyId: 'DPOL-0004', name: 'Security Updates Only', description: 'Automatic deployment for security-classified patches', type: 'INSTANT', supportedModule: 'Security', relatedType: 'Critical' },
    { policyId: 'DPOL-0005', name: 'Monthly Rollup', description: 'Deploy cumulative updates on the second Tuesday of each month', type: 'SCHEDULE', supportedModule: 'Patch', relatedType: 'Optional' },
  ];

  for (const policy of deploymentPolicies) {
    await prisma.deploymentPolicy.upsert({
      where: { policyId: policy.policyId },
      update: {},
      create: policy,
    });
  }
  console.log('Created', deploymentPolicies.length, 'deployment policies');

  // ============================================
  // Distribution Servers
  // ============================================

  const distributionServers = [
    {
      name: 'Primary Hub',
      description: 'Main distribution server in US-East datacenter',
      location: 'US-East',
      url: 'https://patch-hub-east.internal.company.com',
      version: '2.1.0',
      status: 'Active',
    },
    {
      name: 'EU Relay',
      description: 'European distribution point for EU-based agents',
      location: 'EU-West (Frankfurt)',
      url: 'https://patch-relay-eu.internal.company.com',
      version: '2.1.0',
      status: 'Active',
    },
    {
      name: 'APAC Relay',
      description: 'Asia-Pacific distribution point',
      location: 'AP-Southeast (Singapore)',
      url: 'https://patch-relay-apac.internal.company.com',
      version: '2.0.5',
      status: 'Active',
    },
    {
      name: 'Staging Server',
      description: 'Pre-production testing server for patch validation',
      location: 'US-West',
      url: 'https://patch-staging.internal.company.com',
      version: '2.2.0-beta',
      status: 'Maintenance',
    },
    {
      name: 'Legacy Relay',
      description: 'Deprecated server pending decommission',
      location: 'US-Central',
      url: 'https://patch-legacy.internal.company.com',
      version: '1.9.3',
      status: 'Inactive',
    },
  ];

  for (const server of distributionServers) {
    const existing = await prisma.distributionServer.findFirst({ where: { name: server.name } });
    if (!existing) {
      await prisma.distributionServer.create({ data: server });
    }
  }
  console.log('Created', distributionServers.length, 'distribution servers');

  // ============================================
  // Settings
  // ============================================

  // Create default settings
  const defaultSettings = [
    {
      key: 'session.absolute_timeout_hours',
      value: 8,
      category: 'session',
    },
    {
      key: 'session.idle_timeout_minutes',
      value: 30,
      category: 'session',
    },
    {
      key: 'agent.heartbeat_interval_seconds',
      value: 60,
      category: 'agent',
    },
    {
      key: 'agent.command_poll_seconds',
      value: 30,
      category: 'agent',
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('Created', defaultSettings.length, 'default settings');

  // Create alert configurations
  const alertConfigs = [
    {
      type: 'email',
      enabled: true,
      config: { recipients: ['admin@patchiq.io'], severity: ['CRITICAL', 'HIGH'] },
    },
    {
      type: 'slack',
      enabled: false,
      config: { webhookUrl: '', channel: '#security-alerts' },
    },
  ];

  for (const alert of alertConfigs) {
    const existing = await prisma.alertConfig.findFirst({ where: { type: alert.type } });
    if (!existing) {
      await prisma.alertConfig.create({ data: alert });
    }
  }
  console.log('Created', alertConfigs.length, 'alert configurations');

  // ============================================
  // Patch Repository Sources (Whitelist)
  // ============================================

  console.log('\nSeeding patch repository whitelist sources...');

  let patchSourcesCreated = 0;
  for (const source of WHITELIST_SOURCES) {
    try {
      await prisma.patchSource.upsert({
        where: {
          vendor_name: {
            vendor: source.vendor,
            name: source.name,
          },
        },
        update: {
          category: source.category,
          platform: source.platform,
          baseUrl: source.baseUrl,
          urlPatterns: source.urlPatterns || [],
          priority: source.priority || 50,
          isEnabled: source.isEnabled ?? true,
          requiresAuth: source.requiresAuth || false,
          authType: source.authType,
          authConfig: source.authConfig,
          syncSchedule: source.syncSchedule,
          metadata: source.metadata,
        },
        create: {
          name: source.name,
          vendor: source.vendor,
          category: source.category,
          platform: source.platform,
          baseUrl: source.baseUrl,
          urlPatterns: source.urlPatterns || [],
          priority: source.priority || 50,
          isEnabled: source.isEnabled ?? true,
          requiresAuth: source.requiresAuth || false,
          authType: source.authType,
          authConfig: source.authConfig,
          syncSchedule: source.syncSchedule,
          metadata: source.metadata,
        },
      });
      patchSourcesCreated++;
    } catch (error) {
      console.error(`Failed to seed patch source "${source.name}":`, error);
    }
  }
  console.log('Created/Updated', patchSourcesCreated, 'patch repository sources');

  // ============================================
  // CPE Mappings (Vulnerability Correlation)
  // ============================================

  console.log('\nSeeding CPE mappings for vulnerability correlation...');
  const cpeMappingsCreated = await seedCpeMappings(prisma);
  console.log('Created/Updated', cpeMappingsCreated, 'CPE mappings');

  // ============================================
  // Agent Versions
  // ============================================

  console.log('\nSeeding agent versions...');
  const agentVersions = [
    { platform: 'WINDOWS', architecture: 'amd64', version: '1.0.0' },
    { platform: 'LINUX', architecture: 'amd64', version: '1.0.0' },
    { platform: 'LINUX', architecture: 'arm64', version: '1.0.0' },
    { platform: 'Mac', architecture: 'amd64', version: '1.0.0' },
    { platform: 'Mac', architecture: 'arm64', version: '1.0.0' },
  ];

  for (const av of agentVersions) {
    await prisma.agentVersion.upsert({
      where: {
        platform_architecture_version: {
          platform: av.platform,
          architecture: av.architecture,
          version: av.version,
        },
      },
      update: {},
      create: {
        platform: av.platform,
        architecture: av.architecture,
        version: av.version,
        lastUpdatedAt: new Date(),
      },
    });
  }
  console.log('Created', agentVersions.length, 'agent versions');

  // ============================================
  // Test Seed Data for Vulnerability Correlation (R7)
  // ============================================

  console.log('\nSeeding test assets and software for vulnerability correlation...');

  // Create 5 test assets
  const testAssets = [
    {
      name: 'ASSET-WIN-01',
      type: 'Endpoint',
      status: 'In Use',
      os: 'Windows',
      osVersion: '10',
      osEdition: 'Professional',
      architecture: 'x86_64',
      ipAddress: '192.168.1.10',
      macAddress: '00:11:22:33:44:01',
      manufacturer: 'Dell',
      model: 'OptiPlex 7090',
      hostname: 'ws-001-dell.company.local',
    },
    {
      name: 'ASSET-WIN-02',
      type: 'Server',
      status: 'In Use',
      os: 'Windows',
      osVersion: '2019',
      osEdition: 'Standard',
      architecture: 'x86_64',
      ipAddress: '192.168.1.20',
      macAddress: '00:11:22:33:44:02',
      manufacturer: 'HP',
      model: 'ProLiant DL360',
      hostname: 'server-win-02.company.local',
    },
    {
      name: 'ASSET-LIN-01',
      type: 'Server',
      status: 'In Use',
      os: 'Linux',
      osVersion: '22.04 LTS',
      osEdition: 'Ubuntu',
      architecture: 'x86_64',
      ipAddress: '192.168.1.30',
      macAddress: '00:11:22:33:44:03',
      manufacturer: 'Lenovo',
      model: 'ThinkSystem SR650',
      hostname: 'server-lin-01.company.local',
    },
    {
      name: 'ASSET-LIN-02',
      type: 'Endpoint',
      status: 'In Use',
      os: 'Linux',
      osVersion: '24.04 LTS',
      osEdition: 'Ubuntu',
      architecture: 'x86_64',
      ipAddress: '192.168.1.40',
      macAddress: '00:11:22:33:44:04',
      manufacturer: 'Dell',
      model: 'XPS 13',
      hostname: 'dev-lin-02.company.local',
    },
    {
      name: 'ASSET-MAC-01',
      type: 'Endpoint',
      status: 'In Use',
      os: 'macOS',
      osVersion: '13.6',
      osEdition: 'Monterey',
      architecture: 'arm64',
      ipAddress: '192.168.1.50',
      macAddress: '00:11:22:33:44:05',
      manufacturer: 'Apple',
      model: 'MacBook Pro 16',
      hostname: 'mbp-001.company.local',
    },
  ];

  const createdAssets: Record<string, string> = {};
  for (const assetData of testAssets) {
    // Check if asset already exists by name
    let asset = await prisma.asset.findFirst({
      where: { name: assetData.name },
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          ...assetData,
          organizationId: org.id,
          locationId: location.id,
        },
      });
    }
    createdAssets[assetData.name] = asset.id;
  }
  console.log('Created/Updated', testAssets.length, 'test assets');

  // Create AssetSoftware records with vulnerable versions
  const softwareRecords = [
    // ASSET-WIN-01: Firefox, 7-Zip, Notepad++, Node.js
    { assetName: 'ASSET-WIN-01', name: 'Mozilla Firefox', version: '115.0', vendor: 'Mozilla', cpeVendor: 'mozilla', cpeProduct: 'firefox' },
    { assetName: 'ASSET-WIN-01', name: '7-Zip', version: '24.05', vendor: 'Igor Pavlov', cpeVendor: '7-zip', cpeProduct: '7-zip' },
    { assetName: 'ASSET-WIN-01', name: 'Notepad++', version: '8.5.0', vendor: 'Notepad++ Team', cpeVendor: 'notepad-plus-plus', cpeProduct: 'notepad\\+\\+' },
    { assetName: 'ASSET-WIN-01', name: 'Node.js', version: '16.20.0', vendor: 'Node.js Foundation', cpeVendor: 'nodejs', cpeProduct: 'node.js' },
    // ASSET-WIN-02: 7-Zip, Node.js, OpenSSL
    { assetName: 'ASSET-WIN-02', name: '7-Zip', version: '24.05', vendor: 'Igor Pavlov', cpeVendor: '7-zip', cpeProduct: '7-zip' },
    { assetName: 'ASSET-WIN-02', name: 'Node.js', version: '16.20.0', vendor: 'Node.js Foundation', cpeVendor: 'nodejs', cpeProduct: 'node.js' },
    { assetName: 'ASSET-WIN-02', name: 'OpenSSL', version: '3.0.8', vendor: 'OpenSSL Project', cpeVendor: 'openssl', cpeProduct: 'openssl' },
    // ASSET-LIN-01: Firefox, OpenSSL, Node.js
    { assetName: 'ASSET-LIN-01', name: 'Firefox', version: '115.0', vendor: 'Mozilla Foundation', cpeVendor: 'mozilla', cpeProduct: 'firefox' },
    { assetName: 'ASSET-LIN-01', name: 'OpenSSL', version: '3.0.8', vendor: 'OpenSSL Project', cpeVendor: 'openssl', cpeProduct: 'openssl' },
    { assetName: 'ASSET-LIN-01', name: 'Node.js', version: '16.20.0', vendor: 'Node.js Foundation', cpeVendor: 'nodejs', cpeProduct: 'node.js' },
    // ASSET-LIN-02: Firefox, Node.js, OpenSSL
    { assetName: 'ASSET-LIN-02', name: 'Firefox', version: '115.0', vendor: 'Mozilla Foundation', cpeVendor: 'mozilla', cpeProduct: 'firefox' },
    { assetName: 'ASSET-LIN-02', name: 'Node.js', version: '16.20.0', vendor: 'Node.js Foundation', cpeVendor: 'nodejs', cpeProduct: 'node.js' },
    { assetName: 'ASSET-LIN-02', name: 'OpenSSL', version: '3.0.8', vendor: 'OpenSSL Project', cpeVendor: 'openssl', cpeProduct: 'openssl' },
    // ASSET-MAC-01: Firefox (safe 120.0), Node.js (vulnerable), OpenSSL (safe 3.0.19)
    { assetName: 'ASSET-MAC-01', name: 'Firefox', version: '120.0', vendor: 'Mozilla', cpeVendor: 'mozilla', cpeProduct: 'firefox' },
    { assetName: 'ASSET-MAC-01', name: 'Node.js', version: '16.20.0', vendor: 'Node.js Foundation', cpeVendor: 'nodejs', cpeProduct: 'node.js' },
    { assetName: 'ASSET-MAC-01', name: 'OpenSSL', version: '3.0.19', vendor: 'OpenSSL Project', cpeVendor: 'openssl', cpeProduct: 'openssl' },
  ];

  let softwareCreated = 0;
  for (const sw of softwareRecords) {
    const assetId = createdAssets[sw.assetName];
    const existing = await prisma.assetSoftware.findFirst({
      where: { assetId, name: sw.name, version: sw.version },
    });

    if (!existing) {
      await prisma.assetSoftware.create({
        data: {
          assetId,
          name: sw.name,
          version: sw.version,
          vendor: sw.vendor,
          cpeVendor: sw.cpeVendor,
          cpeProduct: sw.cpeProduct,
          normalizedVersion: sw.version,
          matchConfidence: 1.0,
        },
      });
      softwareCreated++;
    }
  }
  console.log('Created', softwareCreated, 'asset software records');

  // Create Patch records for test applications with CVE numbers
  const patches = [
    {
      patchId: 'PATCH-FIREFOX-116',
      title: 'Firefox 116.0 Security Update',
      software: 'Firefox',
      vendor: 'Mozilla',
      product: 'firefox',
      severity: 'CRITICAL',
      category: 'Security',
      cveNumbers: ['CVE-2026-0879', 'CVE-2026-0882'],
      approvalStatus: 'Approved',
    },
    {
      patchId: 'PATCH-7ZIP-2408',
      title: '7-Zip 24.08 Update',
      software: '7-Zip',
      vendor: 'Igor Pavlov',
      product: '7-zip',
      severity: 'HIGH',
      category: 'Security',
      cveNumbers: ['CVE-2025-0411', 'CVE-2024-11477'],
      approvalStatus: 'Approved',
      supersededBy: ['PATCH-7ZIP-2500'],
    },
    {
      patchId: 'PATCH-7ZIP-2500',
      title: '7-Zip 25.00 Update',
      software: '7-Zip',
      vendor: 'Igor Pavlov',
      product: '7-zip',
      severity: 'HIGH',
      category: 'Security',
      cveNumbers: ['CVE-2025-0411', 'CVE-2024-11477'],
      approvalStatus: 'Approved',
      supersedes: ['PATCH-7ZIP-2408'],
    },
    {
      patchId: 'PATCH-NOTEPAD-889',
      title: 'Notepad++ 8.8.9 Update',
      software: 'Notepad++',
      vendor: 'Notepad++ Team',
      product: 'notepad\\+\\+',
      severity: 'MEDIUM',
      category: 'Security',
      cveNumbers: ['CVE-2023-40031'],
      approvalStatus: 'Approved',
    },
    {
      patchId: 'PATCH-OPENSSL-3019',
      title: 'OpenSSL 3.0.19 Security Update',
      software: 'OpenSSL',
      vendor: 'OpenSSL Project',
      product: 'openssl',
      severity: 'HIGH',
      category: 'Security',
      cveNumbers: ['CVE-2025-69421'],
      approvalStatus: 'Approved',
    },
    {
      patchId: 'PATCH-NODE-1620.2',
      title: 'Node.js 16.20.2 Security Update',
      software: 'Node.js',
      vendor: 'Node.js Foundation',
      product: 'node.js',
      severity: 'CRITICAL',
      category: 'Security',
      cveNumbers: ['CVE-2023-32002'],
      approvalStatus: 'Approved',
    },
  ];

  for (const patchData of patches) {
    const existing = await prisma.patch.findFirst({ where: { patchId: patchData.patchId } });

    if (!existing) {
      await prisma.patch.create({
        data: {
          patchId: patchData.patchId,
          title: patchData.title,
          software: patchData.software,
          vendor: patchData.vendor,
          product: patchData.product,
          severity: patchData.severity,
          category: patchData.category,
          cveNumbers: patchData.cveNumbers,
          approvalStatus: patchData.approvalStatus,
          testStatus: 'Passed',
          status: 'Active',
          supersedes: patchData.supersedes || [],
          supersededBy: patchData.supersededBy || [],
        },
      });
    } else {
      // Update to ensure CVE numbers and approval status are correct
      await prisma.patch.update({
        where: { patchId: patchData.patchId },
        data: {
          cveNumbers: patchData.cveNumbers,
          approvalStatus: patchData.approvalStatus,
          testStatus: 'Passed',
          status: 'Active',
          supersedes: patchData.supersedes || [],
          supersededBy: patchData.supersededBy || [],
        },
      });
    }
  }
  console.log('Created', patches.length, 'patch records');

  // Asset alerts are now created by the real-time alert evaluation engine
  // (see backend/src/modules/alerts/alert-evaluation.service.ts)

  console.log('\nDatabase seed completed successfully!');
  console.log('\n=== Login Credentials ===');
  console.log('Admin: admin@patchiq.io / admin123');
  console.log('Demo:  demo@patchiq.io / demo123');
  console.log('\n=== Test Assets Created (for Vulnerability Correlation) ===');
  console.log('ASSET-WIN-01: Windows workstation (Firefox 115.0, 7-Zip 24.05, Notepad++ 8.5.0, Node.js 16.20.0)');
  console.log('ASSET-WIN-02: Windows server (7-Zip 24.05, Node.js 16.20.0, OpenSSL 3.0.8)');
  console.log('ASSET-LIN-01: Linux server (Firefox 115.0, OpenSSL 3.0.8, Node.js 16.20.0)');
  console.log('ASSET-LIN-02: Linux workstation (Firefox 115.0, Node.js 16.20.0, OpenSSL 3.0.8)');
  console.log('ASSET-MAC-01: macOS workstation (Firefox 120.0 [safe], Node.js 16.20.0, OpenSSL 3.0.19 [safe])');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
