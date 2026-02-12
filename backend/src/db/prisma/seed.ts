import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WHITELIST_SOURCES } from '../../modules/patch-repository/whitelist-sources.seed';
import { seedCpeMappings } from './seeds/cpe-mappings.seed';

const prisma = new PrismaClient();

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
  await prisma.role.upsert({
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
      },
    },
  });
  console.log('Created admin role');

  // Create user role
  await prisma.role.upsert({
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
      },
    },
  });
  console.log('Created user role');

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
      role: 'ADMIN',
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
      role: 'USER',
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
    { policyId: 'POL-0001', name: 'Immediate Critical', description: 'Deploy critical patches immediately without delay', type: 'INSTANT', supportedModule: 'All', relatedType: 'Critical' },
    { policyId: 'POL-0002', name: 'Scheduled Maintenance Window', description: 'Deploy during weekly maintenance window (Sunday 2-6 AM)', type: 'SCHEDULE', supportedModule: 'Patch', relatedType: 'No Relation' },
    { policyId: 'POL-0003', name: 'Test First Policy', description: 'Deploy to test group first, then production after 48h', type: 'SCHEDULE', supportedModule: 'All', relatedType: 'Important' },
    { policyId: 'POL-0004', name: 'Security Updates Only', description: 'Automatic deployment for security-classified patches', type: 'INSTANT', supportedModule: 'Security', relatedType: 'Critical' },
    { policyId: 'POL-0005', name: 'Monthly Rollup', description: 'Deploy cumulative updates on the second Tuesday of each month', type: 'SCHEDULE', supportedModule: 'Patch', relatedType: 'Optional' },
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

  // Asset alerts are now created by the real-time alert evaluation engine
  // (see backend/src/modules/alerts/alert-evaluation.service.ts)

  console.log('\nDatabase seed completed successfully!');
  console.log('\n=== Login Credentials ===');
  console.log('Admin: admin@patchiq.io / admin123');
  console.log('Demo:  demo@patchiq.io / demo123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
