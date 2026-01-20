import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WHITELIST_SOURCES } from '../../modules/patch-repository/whitelist-sources.seed';

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
      role: 'admin',
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
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@patchiq.io' },
    update: {},
    create: {
      email: 'demo@patchiq.io',
      passwordHash: demoPasswordHash,
      name: 'Demo User',
      role: 'user',
      organizationId: org.id,
      departmentId: department.id,
      locationId: location.id,
      isActive: true,
      isOnboarded: true,
    },
  });
  console.log('Created demo user:', demoUser.email);

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

  // ============================================
  // Sample Vulnerabilities
  // ============================================

  const vulnerabilities = [
    {
      cveId: 'CVE-2024-21351',
      title: 'Windows SmartScreen Security Feature Bypass Vulnerability',
      description:
        'A security feature bypass vulnerability exists in Windows SmartScreen that could allow an attacker to bypass security warnings.',
      severity: 'HIGH',
      cvss3BaseScore: 7.6,
      cvss3VectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N',
      cvss3AttackVector: 'NETWORK',
      cvss3AttackComplexity: 'LOW',
      publishedDate: new Date('2024-02-13'),
      exploitable: true,
      patchAvailable: true,
    },
    {
      cveId: 'CVE-2024-21412',
      title: 'Internet Shortcut Files Security Feature Bypass',
      description:
        'A security feature bypass vulnerability exists when handling Internet Shortcut Files.',
      severity: 'CRITICAL',
      cvss3BaseScore: 8.1,
      cvss3VectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N',
      cvss3AttackVector: 'NETWORK',
      cvss3AttackComplexity: 'LOW',
      publishedDate: new Date('2024-02-13'),
      exploitable: true,
      patchAvailable: true,
    },
    {
      cveId: 'CVE-2024-0001',
      title: 'Example Low Severity Vulnerability',
      description: 'An example low severity vulnerability for testing.',
      severity: 'LOW',
      cvss3BaseScore: 3.1,
      cvss3VectorString: 'CVSS:3.1/AV:L/AC:H/PR:H/UI:R/S:U/C:L/I:N/A:N',
      cvss3AttackVector: 'LOCAL',
      cvss3AttackComplexity: 'HIGH',
      publishedDate: new Date('2024-01-15'),
      exploitable: false,
      patchAvailable: false,
    },
  ];

  for (const vuln of vulnerabilities) {
    await prisma.vulnerability.upsert({
      where: { cveId: vuln.cveId },
      update: {},
      create: vuln,
    });
  }
  console.log('Created', vulnerabilities.length, 'sample vulnerabilities');

  // ============================================
  // Sample Patches
  // ============================================

  const patches = [
    {
      patchId: 'KB5034441',
      title: 'Windows 11 Security Update February 2024',
      description:
        'This security update addresses vulnerabilities in Windows 11.',
      severity: 'CRITICAL',
      category: 'Security',
      vendor: 'Microsoft',
      product: 'Windows 11',
      releaseDate: new Date('2024-02-13'),
      rebootRequired: true,
      testStatus: 'passed',
      approvalStatus: 'approved',
    },
    {
      patchId: 'KB5034442',
      title: 'Windows 11 Cumulative Update February 2024',
      description: 'This cumulative update includes feature and security fixes.',
      severity: 'HIGH',
      category: 'Cumulative',
      vendor: 'Microsoft',
      product: 'Windows 11',
      releaseDate: new Date('2024-02-13'),
      rebootRequired: true,
      testStatus: 'pending',
      approvalStatus: 'pending',
    },
    {
      patchId: 'macOS-14.3.1',
      title: 'macOS Sonoma 14.3.1 Security Update',
      description: 'This update provides important security fixes.',
      severity: 'HIGH',
      category: 'Security',
      vendor: 'Apple',
      product: 'macOS Sonoma',
      releaseDate: new Date('2024-02-08'),
      rebootRequired: true,
      testStatus: 'untested',
      approvalStatus: 'pending',
    },
  ];

  for (const patch of patches) {
    await prisma.patch.upsert({
      where: { patchId: patch.patchId },
      update: {},
      create: patch,
    });
  }
  console.log('Created', patches.length, 'sample patches');

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
    await prisma.alertConfig.upsert({
      where: { type: alert.type },
      update: {},
      create: alert,
    });
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
