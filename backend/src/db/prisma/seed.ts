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
  // Agent binaries stored in MinIO bucket: "agents/patchiq-agent-{platform}-{arch}-{version}{ext}"
  // To make downloads work: run `make agent-release` to build binaries, then upload to MinIO
  const agentVersions = [
    {
      platform: 'WINDOWS',
      architecture: 'amd64',
      version: '1.0.0',
      filePath: 'agents/patchiq-agent-windows-amd64-1.0.0.exe',
      fileSize: BigInt(15728640), // ~15 MB
      checksum: 'sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6', // Placeholder
    },
    {
      platform: 'LINUX',
      architecture: 'amd64',
      version: '1.0.0',
      filePath: 'agents/patchiq-agent-linux-amd64-1.0.0',
      fileSize: BigInt(12582912), // ~12 MB
      checksum: 'sha256:b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1', // Placeholder
    },
    {
      platform: 'LINUX',
      architecture: 'arm64',
      version: '1.0.0',
      filePath: 'agents/patchiq-agent-linux-arm64-1.0.0',
      fileSize: BigInt(11534336), // ~11 MB
      checksum: 'sha256:c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2', // Placeholder
    },
    {
      platform: 'MACOS',
      architecture: 'amd64',
      version: '1.0.0',
      filePath: 'agents/patchiq-agent-darwin-amd64-1.0.0',
      fileSize: BigInt(14680064), // ~14 MB
      checksum: 'sha256:d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3', // Placeholder
    },
    {
      platform: 'MACOS',
      architecture: 'arm64',
      version: '1.0.0',
      filePath: 'agents/patchiq-agent-darwin-arm64-1.0.0',
      fileSize: BigInt(13631488), // ~13 MB
      checksum: 'sha256:e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4', // Placeholder
    },
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
        filePath: av.filePath,
        fileSize: av.fileSize,
        checksum: av.checksum,
        lastUpdatedAt: new Date(),
      },
    });
  }
  console.log('Created', agentVersions.length, 'agent versions');
  console.log('⚠️  Agent binaries not included in seed. Run `make agent-release` to build, then upload to MinIO.');
  console.log('   Expected paths in MinIO bucket: agents/patchiq-agent-{platform}-{arch}-{version}{.exe}');

  // ============================================
  // Sample Agents
  // ============================================

  console.log('\nSeeding sample agents...');
  const sampleAgents = [
    {
      machineId: 'WIN-WKS-001-UUID',
      name: 'WIN-WKS-001',
      hostname: 'WIN-WKS-001',
      status: 'Online',
      os: 'Windows',
      osVersion: '10.0.19045',
      architecture: 'x86_64',
      agentVersion: '1.0.0',
      ipAddress: '192.168.1.101',
      macAddress: '00:1A:2B:3C:4D:01',
      serialNumber: 'WIN-SN-001',
      lastHeartbeat: new Date(),
      capabilities: ['software_install', 'patch_install', 'inventory_collect'],
    },
    {
      machineId: 'UBUNTU-SRV-01-UUID',
      name: 'UBUNTU-SRV-01',
      hostname: 'ubuntu-srv-01',
      status: 'Online',
      os: 'Linux',
      osVersion: 'Ubuntu 22.04.3 LTS',
      architecture: 'x86_64',
      agentVersion: '1.0.0',
      ipAddress: '192.168.1.102',
      macAddress: '00:1A:2B:3C:4D:02',
      serialNumber: 'LNX-SN-002',
      lastHeartbeat: new Date(),
      capabilities: ['software_install', 'patch_install', 'inventory_collect'],
    },
    {
      machineId: 'MAC-MBA-101-UUID',
      name: 'MAC-MBA-101',
      hostname: 'mac-mba-101',
      status: 'Online',
      os: 'macOS',
      osVersion: '14.2.1',
      architecture: 'arm64',
      agentVersion: '1.0.0',
      ipAddress: '192.168.1.103',
      macAddress: '00:1A:2B:3C:4D:03',
      serialNumber: 'MAC-SN-003',
      lastHeartbeat: new Date(),
      capabilities: ['software_install', 'patch_install', 'inventory_collect'],
    },
    {
      machineId: 'WIN-SRV-DC01-UUID',
      name: 'WIN-SRV-DC01',
      hostname: 'WIN-SRV-DC01',
      status: 'Online',
      os: 'Windows',
      osVersion: '10.0.20348',
      architecture: 'x86_64',
      agentVersion: '1.0.0',
      ipAddress: '192.168.1.104',
      macAddress: '00:1A:2B:3C:4D:04',
      serialNumber: 'WIN-SN-004',
      lastHeartbeat: new Date(),
      capabilities: ['software_install', 'patch_install', 'inventory_collect'],
    },
    {
      machineId: 'DEBIAN-WEB-01-UUID',
      name: 'DEBIAN-WEB-01',
      hostname: 'debian-web-01',
      status: 'Offline',
      os: 'Linux',
      osVersion: 'Debian 12.5',
      architecture: 'x86_64',
      agentVersion: '1.0.0',
      ipAddress: '192.168.1.105',
      macAddress: '00:1A:2B:3C:4D:05',
      serialNumber: 'LNX-SN-005',
      lastHeartbeat: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      capabilities: ['software_install', 'patch_install', 'inventory_collect'],
    },
  ];

  const createdAgents = [];
  for (const agent of sampleAgents) {
    const createdAgent = await prisma.agent.upsert({
      where: { machineId: agent.machineId },
      update: {},
      create: agent,
    });
    createdAgents.push(createdAgent);
  }
  console.log('Created', createdAgents.length, 'sample agents');

  // ============================================
  // Sample Assets
  // ============================================

  console.log('\nSeeding sample assets...');
  const sampleAssets = [
    {
      name: 'Finance Workstation 01',
      type: 'Workstation',
      status: 'In Use',
      serialNumber: 'WIN-SN-001',
      assetTag: 'AST-WKS-001',
      os: 'Windows',
      osVersion: '10.0.19045',
      osEdition: 'Pro',
      architecture: 'x86_64',
      ipAddress: '192.168.1.101',
      macAddress: '00:1A:2B:3C:4D:01',
      manufacturer: 'Dell',
      model: 'OptiPlex 7090',
      hostname: 'WIN-WKS-001',
      purchaseDate: new Date('2023-03-15'),
      warrantyExpiry: new Date('2026-03-15'),
      organizationId: org.id,
      locationId: location.id,
      agentId: createdAgents[0].id,
    },
    {
      name: 'Production Ubuntu Server',
      type: 'Server',
      status: 'In Use',
      serialNumber: 'LNX-SN-002',
      assetTag: 'AST-SRV-002',
      os: 'Linux',
      osVersion: 'Ubuntu 22.04.3 LTS',
      osEdition: 'Server',
      architecture: 'x86_64',
      ipAddress: '192.168.1.102',
      macAddress: '00:1A:2B:3C:4D:02',
      manufacturer: 'HPE',
      model: 'ProLiant DL380 Gen10',
      hostname: 'ubuntu-srv-01',
      purchaseDate: new Date('2022-11-20'),
      warrantyExpiry: new Date('2027-11-20'),
      organizationId: org.id,
      locationId: location.id,
      agentId: createdAgents[1].id,
    },
    {
      name: 'Engineering MacBook Air',
      type: 'Laptop',
      status: 'In Use',
      serialNumber: 'MAC-SN-003',
      assetTag: 'AST-LAP-003',
      os: 'macOS',
      osVersion: '14.2.1',
      osEdition: 'Sonoma',
      architecture: 'arm64',
      ipAddress: '192.168.1.103',
      macAddress: '00:1A:2B:3C:4D:03',
      manufacturer: 'Apple',
      model: 'MacBook Air M2',
      hostname: 'mac-mba-101',
      purchaseDate: new Date('2024-01-10'),
      warrantyExpiry: new Date('2025-01-10'),
      organizationId: org.id,
      locationId: location.id,
      agentId: createdAgents[2].id,
    },
    {
      name: 'Windows Server Domain Controller',
      type: 'Server',
      status: 'In Use',
      serialNumber: 'WIN-SN-004',
      assetTag: 'AST-SRV-004',
      os: 'Windows',
      osVersion: '10.0.20348',
      osEdition: 'Server 2022 Standard',
      architecture: 'x86_64',
      installedFeatures: ['Active Directory', 'DNS', 'DHCP'],
      ipAddress: '192.168.1.104',
      macAddress: '00:1A:2B:3C:4D:04',
      manufacturer: 'Dell',
      model: 'PowerEdge R750',
      hostname: 'WIN-SRV-DC01',
      purchaseDate: new Date('2023-06-01'),
      warrantyExpiry: new Date('2028-06-01'),
      organizationId: org.id,
      locationId: location.id,
      agentId: createdAgents[3].id,
    },
    {
      name: 'Debian Web Server',
      type: 'Server',
      status: 'Maintenance',
      serialNumber: 'LNX-SN-005',
      assetTag: 'AST-SRV-005',
      os: 'Linux',
      osVersion: 'Debian 12.5',
      osEdition: 'Server',
      architecture: 'x86_64',
      ipAddress: '192.168.1.105',
      macAddress: '00:1A:2B:3C:4D:05',
      manufacturer: 'Lenovo',
      model: 'ThinkSystem SR650 V2',
      hostname: 'debian-web-01',
      purchaseDate: new Date('2023-09-12'),
      warrantyExpiry: new Date('2026-09-12'),
      organizationId: org.id,
      locationId: location.id,
      agentId: createdAgents[4].id,
    },
  ];

  const createdAssets = [];
  for (const asset of sampleAssets) {
    const createdAsset = await prisma.asset.upsert({
      where: { serialNumber: asset.serialNumber },
      update: {},
      create: asset,
    });
    createdAssets.push(createdAsset);

    // Update agent with assetId
    await prisma.agent.update({
      where: { id: asset.agentId },
      data: { assetId: createdAsset.id },
    });
  }
  console.log('Created', createdAssets.length, 'sample assets');

  // Assign tags to assets
  const productionTag = await prisma.tag.findUnique({ where: { name: 'Production' } });
  const criticalTag = await prisma.tag.findUnique({ where: { name: 'Critical' } });
  const developmentTag = await prisma.tag.findUnique({ where: { name: 'Development' } });

  if (productionTag && createdAssets[1]) {
    await prisma.assetTag.upsert({
      where: { assetId_tagId: { assetId: createdAssets[1].id, tagId: productionTag.id } },
      update: {},
      create: { assetId: createdAssets[1].id, tagId: productionTag.id },
    });
  }

  if (criticalTag && createdAssets[3]) {
    await prisma.assetTag.upsert({
      where: { assetId_tagId: { assetId: createdAssets[3].id, tagId: criticalTag.id } },
      update: {},
      create: { assetId: createdAssets[3].id, tagId: criticalTag.id },
    });
  }

  if (developmentTag && createdAssets[2]) {
    await prisma.assetTag.upsert({
      where: { assetId_tagId: { assetId: createdAssets[2].id, tagId: developmentTag.id } },
      update: {},
      create: { assetId: createdAssets[2].id, tagId: developmentTag.id },
    });
  }
  console.log('Assigned tags to assets');

  // ============================================
  // Sample Patches
  // ============================================

  console.log('\nSeeding sample patches...');
  const samplePatches = [
    {
      patchId: 'KB5034441',
      title: '2024-01 Cumulative Update for Windows 10 Version 22H2 (KB5034441)',
      description: 'This security update includes quality improvements. Key changes include addressing security vulnerabilities.',
      severity: 'CRITICAL',
      category: 'Security Update',
      vendor: 'Microsoft',
      product: 'Windows 10',
      os: 'Windows',
      osVersion: '10.0.19045',
      platform: 'windows',
      architecture: 'x64',
      kbNumber: 'KB5034441',
      bulletinId: 'MS24-JAN',
      publishedAt: new Date('2024-01-09'),
      size: BigInt(512000000),
      sizeFormatted: '512 MB',
      downloadUrl: 'https://catalog.update.microsoft.com/v7/site/Search.aspx?q=KB5034441',
      referenceUrl: 'https://support.microsoft.com/kb/5034441',
      rebootRequired: true,
      supportUninstallation: true,
      supportsRollback: false,
      patchType: 'UPDATE',
      cveNumbers: ['CVE-2024-0001', 'CVE-2024-0002'],
      status: 'Approved',
      approvalStatus: 'Approved',
      testStatus: 'Passed',
    },
    {
      patchId: 'KB5034763',
      title: '2024-01 Security Update for Windows Server 2022 (KB5034763)',
      description: 'Security update addressing remote code execution vulnerabilities in Windows Server 2022.',
      severity: 'CRITICAL',
      category: 'Security Update',
      vendor: 'Microsoft',
      product: 'Windows Server 2022',
      os: 'Windows',
      osVersion: '10.0.20348',
      platform: 'windows',
      architecture: 'x64',
      kbNumber: 'KB5034763',
      bulletinId: 'MS24-JAN',
      publishedAt: new Date('2024-01-09'),
      size: BigInt(640000000),
      sizeFormatted: '640 MB',
      downloadUrl: 'https://catalog.update.microsoft.com/v7/site/Search.aspx?q=KB5034763',
      referenceUrl: 'https://support.microsoft.com/kb/5034763',
      rebootRequired: true,
      supportUninstallation: true,
      supportsRollback: false,
      patchType: 'UPDATE',
      cveNumbers: ['CVE-2024-0003', 'CVE-2024-0004'],
      status: 'Approved',
      approvalStatus: 'Approved',
      testStatus: 'Passed',
    },
    {
      patchId: 'USN-6549-1',
      title: 'OpenSSL vulnerabilities (USN-6549-1)',
      description: 'Security update for OpenSSL addressing multiple vulnerabilities including potential memory corruption.',
      severity: 'HIGH',
      category: 'Security Update',
      vendor: 'Canonical',
      product: 'OpenSSL',
      os: 'Linux',
      osVersion: 'Ubuntu 22.04 LTS',
      platform: 'linux',
      architecture: 'x64',
      publishedAt: new Date('2024-01-15'),
      size: BigInt(2400000),
      sizeFormatted: '2.4 MB',
      referenceUrl: 'https://ubuntu.com/security/notices/USN-6549-1',
      rebootRequired: false,
      supportUninstallation: true,
      supportsRollback: true,
      patchType: 'UPDATE',
      cveNumbers: ['CVE-2023-5678', 'CVE-2023-5679'],
      status: 'Approved',
      approvalStatus: 'Approved',
      testStatus: 'Passed',
    },
    {
      patchId: 'USN-6550-1',
      title: 'Linux kernel vulnerabilities (USN-6550-1)',
      description: 'Security update for Linux kernel addressing privilege escalation and denial of service vulnerabilities.',
      severity: 'HIGH',
      category: 'Security Update',
      vendor: 'Canonical',
      product: 'Linux Kernel',
      os: 'Linux',
      osVersion: 'Ubuntu 22.04 LTS',
      platform: 'linux',
      architecture: 'x64',
      publishedAt: new Date('2024-01-18'),
      size: BigInt(18500000),
      sizeFormatted: '18.5 MB',
      referenceUrl: 'https://ubuntu.com/security/notices/USN-6550-1',
      rebootRequired: true,
      supportUninstallation: false,
      supportsRollback: false,
      patchType: 'UPDATE',
      cveNumbers: ['CVE-2023-6789', 'CVE-2023-6790'],
      status: 'Approved',
      approvalStatus: 'Approved',
      testStatus: 'Passed',
    },
    {
      patchId: 'macOS-14.2.1',
      title: 'macOS Sonoma 14.2.1',
      description: 'This update provides important security fixes and addresses issues with Wi-Fi connectivity and Bluetooth devices.',
      severity: 'HIGH',
      category: 'Security Update',
      vendor: 'Apple',
      product: 'macOS Sonoma',
      os: 'macOS',
      osVersion: '14.2.1',
      platform: 'darwin',
      architecture: 'universal',
      publishedAt: new Date('2024-01-08'),
      size: BigInt(3200000000),
      sizeFormatted: '3.2 GB',
      downloadUrl: 'https://support.apple.com/downloads/macos',
      referenceUrl: 'https://support.apple.com/en-us/HT214036',
      rebootRequired: true,
      supportUninstallation: false,
      supportsRollback: false,
      patchType: 'UPDATE',
      cveNumbers: ['CVE-2023-7890', 'CVE-2023-7891'],
      status: 'Approved',
      approvalStatus: 'Approved',
      testStatus: 'Passed',
    },
    {
      patchId: 'DEBIAN-DLA-3712-1',
      title: 'Apache2 security update (DLA-3712-1)',
      description: 'Security update for Apache HTTP Server fixing multiple vulnerabilities including HTTP request smuggling.',
      severity: 'MEDIUM',
      category: 'Security Update',
      vendor: 'Debian',
      product: 'Apache HTTP Server',
      os: 'Linux',
      osVersion: 'Debian 12',
      platform: 'linux',
      architecture: 'x64',
      publishedAt: new Date('2024-01-20'),
      size: BigInt(1800000),
      sizeFormatted: '1.8 MB',
      referenceUrl: 'https://www.debian.org/security/2024/dla-3712',
      rebootRequired: false,
      supportUninstallation: true,
      supportsRollback: true,
      patchType: 'UPDATE',
      cveNumbers: ['CVE-2023-8901', 'CVE-2023-8902'],
      status: 'Approved',
      approvalStatus: 'Approved',
      testStatus: 'Passed',
    },
    {
      patchId: 'KB5033920',
      title: '.NET Framework 4.8.1 Security Update (KB5033920)',
      description: 'Security and quality update for .NET Framework 4.8.1 addressing remote code execution vulnerabilities.',
      severity: 'HIGH',
      category: 'Security Update',
      vendor: 'Microsoft',
      product: '.NET Framework',
      os: 'Windows',
      osVersion: '10.0',
      platform: 'windows',
      architecture: 'x64',
      kbNumber: 'KB5033920',
      publishedAt: new Date('2024-01-09'),
      size: BigInt(95000000),
      sizeFormatted: '95 MB',
      downloadUrl: 'https://catalog.update.microsoft.com/v7/site/Search.aspx?q=KB5033920',
      referenceUrl: 'https://support.microsoft.com/kb/5033920',
      rebootRequired: false,
      supportUninstallation: true,
      supportsRollback: false,
      patchType: 'UPDATE',
      cveNumbers: ['CVE-2024-0010', 'CVE-2024-0011'],
      status: 'Approved',
      approvalStatus: 'Approved',
      testStatus: 'Passed',
    },
    {
      patchId: 'USN-6548-1',
      title: 'Git vulnerabilities (USN-6548-1)',
      description: 'Security update for Git addressing arbitrary code execution vulnerabilities via malicious repositories.',
      severity: 'MEDIUM',
      category: 'Security Update',
      vendor: 'Canonical',
      product: 'Git',
      os: 'Linux',
      osVersion: 'Ubuntu 22.04 LTS',
      platform: 'linux',
      architecture: 'x64',
      publishedAt: new Date('2024-01-12'),
      size: BigInt(8500000),
      sizeFormatted: '8.5 MB',
      referenceUrl: 'https://ubuntu.com/security/notices/USN-6548-1',
      rebootRequired: false,
      supportUninstallation: true,
      supportsRollback: true,
      patchType: 'UPDATE',
      cveNumbers: ['CVE-2023-9012', 'CVE-2023-9013'],
      status: 'Approved',
      approvalStatus: 'Approved',
      testStatus: 'Passed',
    },
  ];

  const createdPatches = [];
  for (const patch of samplePatches) {
    const createdPatch = await prisma.patch.upsert({
      where: { patchId: patch.patchId },
      update: {},
      create: patch,
    });
    createdPatches.push(createdPatch);
  }
  console.log('Created', createdPatches.length, 'sample patches');

  // ============================================
  // Sample Vulnerabilities (Famous CVEs)
  // ============================================

  console.log('\nSeeding sample vulnerabilities...');
  const sampleVulnerabilities = [
    {
      cveId: 'CVE-2021-44228',
      title: 'Apache Log4j2 Remote Code Execution (Log4Shell)',
      description: 'Apache Log4j2 2.0-beta9 through 2.15.0 (excluding security releases 2.12.2, 2.12.3, and 2.3.1) JNDI features used in configuration, log messages, and parameters do not protect against attacker controlled LDAP and other JNDI related endpoints. An attacker who can control log messages or log message parameters can execute arbitrary code loaded from LDAP servers when message lookup substitution is enabled.',
      severity: 'CRITICAL',
      cvss3BaseScore: 10.0,
      cvss3AttackVector: 'NETWORK',
      cvss3AttackComplexity: 'LOW',
      cvss3PrivilegesRequired: 'NONE',
      cvss3Scope: 'CHANGED',
      cvss3Confidentiality: 'HIGH',
      cvss3Integrity: 'HIGH',
      cvss3Availability: 'HIGH',
      cvss3VectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
      epss: 97.5,
      exploitable: true,
      isZeroDay: false,
      patchAvailable: true,
      fixRecommendation: 'Upgrade to Log4j 2.17.0 or later. Java 8 users should upgrade to release 2.17.1.',
      publishedDate: new Date('2021-12-10'),
      lastModified: new Date('2023-11-07'),
    },
    {
      cveId: 'CVE-2014-0160',
      title: 'OpenSSL Heartbleed Vulnerability',
      description: 'The TLS heartbeat extension in OpenSSL before 0.9.8za, 1.0.0 before 1.0.0m, and 1.0.1 before 1.0.1g allows remote attackers to obtain sensitive information from process memory via crafted packets that trigger a buffer over-read.',
      severity: 'HIGH',
      cvss3BaseScore: 7.5,
      cvss3AttackVector: 'NETWORK',
      cvss3AttackComplexity: 'LOW',
      cvss3PrivilegesRequired: 'NONE',
      cvss3Scope: 'UNCHANGED',
      cvss3Confidentiality: 'HIGH',
      cvss3Integrity: 'NONE',
      cvss3Availability: 'NONE',
      cvss3VectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
      epss: 78.2,
      exploitable: true,
      isZeroDay: false,
      patchAvailable: true,
      fixRecommendation: 'Update OpenSSL to version 1.0.1g or later.',
      publishedDate: new Date('2014-04-07'),
      lastModified: new Date('2023-11-07'),
    },
    {
      cveId: 'CVE-2017-5638',
      title: 'Apache Struts2 Remote Code Execution',
      description: 'The Jakarta Multipart parser in Apache Struts 2 2.3.x before 2.3.32 and 2.5.x before 2.5.10.1 has incorrect exception handling and error-message generation during file-upload attempts, which allows remote attackers to execute arbitrary commands via a crafted Content-Type, Content-Disposition, or Content-Length HTTP header.',
      severity: 'CRITICAL',
      cvss3BaseScore: 10.0,
      cvss3AttackVector: 'NETWORK',
      cvss3AttackComplexity: 'LOW',
      cvss3PrivilegesRequired: 'NONE',
      cvss3Scope: 'CHANGED',
      cvss3Confidentiality: 'HIGH',
      cvss3Integrity: 'HIGH',
      cvss3Availability: 'HIGH',
      cvss3VectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H',
      epss: 89.3,
      exploitable: true,
      isZeroDay: false,
      patchAvailable: true,
      fixRecommendation: 'Upgrade to Apache Struts 2.3.32 or 2.5.10.1 or later.',
      publishedDate: new Date('2017-03-10'),
      lastModified: new Date('2023-11-07'),
    },
    {
      cveId: 'CVE-2021-26855',
      title: 'Microsoft Exchange Server ProxyLogon',
      description: 'Microsoft Exchange Server Remote Code Execution Vulnerability (ProxyLogon). This vulnerability is part of a chain of vulnerabilities that allows an unauthenticated attacker to execute arbitrary code on vulnerable Exchange servers.',
      severity: 'CRITICAL',
      cvss3BaseScore: 9.8,
      cvss3AttackVector: 'NETWORK',
      cvss3AttackComplexity: 'LOW',
      cvss3PrivilegesRequired: 'NONE',
      cvss3Scope: 'UNCHANGED',
      cvss3Confidentiality: 'HIGH',
      cvss3Integrity: 'HIGH',
      cvss3Availability: 'HIGH',
      cvss3VectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      epss: 94.7,
      exploitable: true,
      isZeroDay: false,
      patchAvailable: true,
      fixRecommendation: 'Apply Microsoft Exchange Server security updates immediately.',
      publishedDate: new Date('2021-03-02'),
      lastModified: new Date('2023-11-07'),
    },
    {
      cveId: 'CVE-2019-0708',
      title: 'Windows RDP BlueKeep Vulnerability',
      description: 'A remote code execution vulnerability exists in Remote Desktop Services when an unauthenticated attacker connects to the target system using RDP and sends specially crafted requests. This vulnerability is pre-authentication and requires no user interaction.',
      severity: 'CRITICAL',
      cvss3BaseScore: 9.8,
      cvss3AttackVector: 'NETWORK',
      cvss3AttackComplexity: 'LOW',
      cvss3PrivilegesRequired: 'NONE',
      cvss3Scope: 'UNCHANGED',
      cvss3Confidentiality: 'HIGH',
      cvss3Integrity: 'HIGH',
      cvss3Availability: 'HIGH',
      cvss3VectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      epss: 91.2,
      exploitable: true,
      isZeroDay: false,
      patchAvailable: true,
      fixRecommendation: 'Apply Windows security updates and enable Network Level Authentication (NLA).',
      publishedDate: new Date('2019-05-16'),
      lastModified: new Date('2023-11-07'),
    },
  ];

  const createdVulnerabilities = [];
  for (const vuln of sampleVulnerabilities) {
    const createdVuln = await prisma.vulnerability.upsert({
      where: { cveId: vuln.cveId },
      update: {},
      create: vuln,
    });
    createdVulnerabilities.push(createdVuln);
  }
  console.log('Created', createdVulnerabilities.length, 'sample vulnerabilities');

  // ============================================
  // Sample Software & Installations
  // ============================================

  console.log('\nSeeding sample software installations...');

  // Software installations for Windows Workstation (Asset 0)
  const windowsSoftware = [
    {
      assetId: createdAssets[0].id,
      name: 'Google Chrome',
      version: '120.0.6099.129',
      vendor: 'Google LLC',
      installDate: new Date('2024-01-05'),
      installPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      category: 'Browser',
    },
    {
      assetId: createdAssets[0].id,
      name: 'Microsoft Office 365',
      version: '16.0.17126.20132',
      vendor: 'Microsoft Corporation',
      installDate: new Date('2023-12-01'),
      installPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16',
      category: 'Productivity',
    },
    {
      assetId: createdAssets[0].id,
      name: '7-Zip',
      version: '23.01',
      vendor: 'Igor Pavlov',
      installDate: new Date('2023-11-15'),
      installPath: 'C:\\Program Files\\7-Zip',
      category: 'Utility',
    },
  ];

  // Software installations for Ubuntu Server (Asset 1)
  const ubuntuSoftware = [
    {
      assetId: createdAssets[1].id,
      name: 'openssl',
      version: '3.0.2-0ubuntu1.12',
      vendor: 'OpenSSL Project',
      installDate: new Date('2023-10-20'),
      installPath: '/usr/bin/openssl',
      category: 'Security',
    },
    {
      assetId: createdAssets[1].id,
      name: 'apache2',
      version: '2.4.52-1ubuntu4.7',
      vendor: 'Apache Software Foundation',
      installDate: new Date('2023-09-15'),
      installPath: '/usr/sbin/apache2',
      category: 'Web Server',
    },
    {
      assetId: createdAssets[1].id,
      name: 'postgresql',
      version: '14.10-0ubuntu0.22.04.1',
      vendor: 'PostgreSQL Global Development Group',
      installDate: new Date('2023-11-01'),
      installPath: '/usr/lib/postgresql/14',
      category: 'Database',
    },
  ];

  // Software installations for MacBook (Asset 2)
  const macOsSoftware = [
    {
      assetId: createdAssets[2].id,
      name: 'Safari',
      version: '17.2.1',
      vendor: 'Apple Inc.',
      installDate: new Date('2024-01-08'),
      installPath: '/Applications/Safari.app',
      category: 'Browser',
    },
    {
      assetId: createdAssets[2].id,
      name: 'Visual Studio Code',
      version: '1.85.2',
      vendor: 'Microsoft Corporation',
      installDate: new Date('2024-01-10'),
      installPath: '/Applications/Visual Studio Code.app',
      category: 'Development',
    },
    {
      assetId: createdAssets[2].id,
      name: 'Homebrew',
      version: '4.2.0',
      vendor: 'Homebrew Team',
      installDate: new Date('2023-12-15'),
      installPath: '/opt/homebrew/bin/brew',
      category: 'Package Manager',
    },
  ];

  // Software installations for Windows Server (Asset 3)
  const windowsServerSoftware = [
    {
      assetId: createdAssets[3].id,
      name: 'Active Directory Domain Services',
      version: '10.0.20348.1',
      vendor: 'Microsoft Corporation',
      installDate: new Date('2023-06-01'),
      installPath: 'C:\\Windows\\System32\\ntdsa.dll',
      category: 'Directory Service',
    },
    {
      assetId: createdAssets[3].id,
      name: 'IIS',
      version: '10.0.20348',
      vendor: 'Microsoft Corporation',
      installDate: new Date('2023-06-01'),
      installPath: 'C:\\Windows\\System32\\inetsrv',
      category: 'Web Server',
    },
  ];

  // Software installations for Debian Server (Asset 4)
  const debianSoftware = [
    {
      assetId: createdAssets[4].id,
      name: 'nginx',
      version: '1.22.1-9',
      vendor: 'NGINX Inc.',
      installDate: new Date('2023-09-12'),
      installPath: '/usr/sbin/nginx',
      category: 'Web Server',
    },
    {
      assetId: createdAssets[4].id,
      name: 'git',
      version: '2.39.2-1.1',
      vendor: 'Software Freedom Conservancy',
      installDate: new Date('2023-09-12'),
      installPath: '/usr/bin/git',
      category: 'Version Control',
    },
    {
      assetId: createdAssets[4].id,
      name: 'Docker',
      version: '24.0.7-1~debian.12~bookworm',
      vendor: 'Docker Inc.',
      installDate: new Date('2023-10-05'),
      installPath: '/usr/bin/docker',
      category: 'Container Runtime',
    },
    {
      assetId: createdAssets[4].id,
      name: 'Python',
      version: '3.11.2-6',
      vendor: 'Python Software Foundation',
      installDate: new Date('2023-09-12'),
      installPath: '/usr/bin/python3.11',
      category: 'Programming Language',
    },
  ];

  const allSoftware = [...windowsSoftware, ...ubuntuSoftware, ...macOsSoftware, ...windowsServerSoftware, ...debianSoftware];

  for (const software of allSoftware) {
    await prisma.assetSoftware.create({
      data: software,
    });
  }
  console.log('Created', allSoftware.length, 'software installations across', createdAssets.length, 'assets');

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
