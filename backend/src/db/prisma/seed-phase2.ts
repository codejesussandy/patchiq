import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Phase 2 Frontend QA Testing - Comprehensive Test Data Seed
 *
 * This script seeds the database with comprehensive test data for Phase 2 testing:
 * - 10+ Assets with full inventory (hardware, software, patches, vulnerabilities, network)
 * - 15+ Patches (Windows, Linux, macOS, mix of severities)
 * - 50+ CVEs (will trigger NVD sync separately)
 * - 20+ Patch Recommendations (Pending, Accepted, Rejected)
 * - 8+ Deployments (completed, in-progress, failed, cancelled)
 */

async function seedPhase2TestData() {
  console.log('🌱 Starting Phase 2 test data seed...');

  // Get default organization for foreign keys
  const org = await prisma.organization.findFirst({ where: { isDefault: true } });
  const location = await prisma.location.findFirst();

  if (!org || !location) {
    throw new Error('Default organization or location not found. Run main seed first: npm run seed');
  }

  console.log(`Using organization: ${org.name} (${org.id})`);

  // ============================================
  // 1. Seed Patches (15 patches)
  // ============================================
  console.log('\n📦 Seeding patches...');

  const patches = [
    // Windows patches
    {
      patchId: 'KB5034441',
      title: '2024-01 Cumulative Update for Windows 11 Version 22H2',
      description: 'Security update for Windows 11 including fixes for CVE-2024-20659, CVE-2024-20660',
      vendor: 'Microsoft',
      product: 'Windows 11',
      version: '22H2',
      releaseDate: new Date('2024-01-09'),
      severity: 'CRITICAL',
      operatingSystem: 'Windows',
      category: 'Security Update',
    },
    {
      patchId: 'KB5034467',
      title: '2024-01 Cumulative Update for Windows 10 Version 22H2',
      description: 'Security update for Windows 10',
      vendor: 'Microsoft',
      product: 'Windows 10',
      version: '22H2',
      releaseDate: new Date('2024-01-09'),
      severity: 'HIGH',
      operatingSystem: 'Windows',
      category: 'Security Update',
    },
    {
      patchId: 'KB5033375',
      title: '2023-12 Security Update for .NET Framework 4.8',
      description: 'Security update for .NET Framework addressing CVE-2023-38180',
      vendor: 'Microsoft',
      product: '.NET Framework',
      version: '4.8',
      releaseDate: new Date('2023-12-12'),
      severity: 'MEDIUM',
      operatingSystem: 'Windows',
      category: 'Security Update',
    },
    {
      patchId: 'KB5034770',
      title: 'Microsoft Edge Security Update 121.0.2277.83',
      description: 'Security update for Microsoft Edge browser',
      vendor: 'Microsoft',
      product: 'Edge',
      version: '121.0',
      releaseDate: new Date('2024-01-25'),
      severity: 'HIGH',
      operatingSystem: 'Windows',
      category: 'Browser Update',
    },

    // Linux patches
    {
      patchId: 'USN-6534-1',
      title: 'Linux kernel vulnerabilities',
      description: 'Security update for Ubuntu Linux kernel addressing multiple CVEs',
      vendor: 'Canonical',
      product: 'Ubuntu Linux',
      version: '22.04 LTS',
      releaseDate: new Date('2023-12-05'),
      severity: 'HIGH',
      operatingSystem: 'Linux',
      category: 'Kernel Update',
    },
    {
      patchId: 'RHSA-2024:0010',
      title: 'Red Hat Enterprise Linux 9 kernel security update',
      description: 'Important kernel security update for RHEL 9',
      vendor: 'Red Hat',
      product: 'Red Hat Enterprise Linux',
      version: '9',
      releaseDate: new Date('2024-01-03'),
      severity: 'CRITICAL',
      operatingSystem: 'Linux',
      category: 'Kernel Update',
    },
    {
      patchId: 'DSA-5585-1',
      title: 'Debian Security Advisory - openssh security update',
      description: 'Security update for OpenSSH',
      vendor: 'Debian',
      product: 'Debian Linux',
      version: '12',
      releaseDate: new Date('2023-12-18'),
      severity: 'MEDIUM',
      operatingSystem: 'Linux',
      category: 'Security Update',
    },

    // macOS patches
    {
      patchId: 'HT214036',
      title: 'macOS Sonoma 14.2.1',
      description: 'Security update for macOS Sonoma',
      vendor: 'Apple',
      product: 'macOS',
      version: '14.2.1',
      releaseDate: new Date('2024-01-08'),
      severity: 'HIGH',
      operatingSystem: 'macOS',
      category: 'Security Update',
    },
    {
      patchId: 'HT214035',
      title: 'Safari 17.2.1',
      description: 'Security update for Safari browser',
      vendor: 'Apple',
      product: 'Safari',
      version: '17.2.1',
      releaseDate: new Date('2024-01-08'),
      severity: 'MEDIUM',
      operatingSystem: 'macOS',
      category: 'Browser Update',
    },

    // Cross-platform patches
    {
      patchId: 'CVE-2024-0001-PATCH',
      title: 'Google Chrome 121.0.6167.85 Security Update',
      description: 'Security update for Google Chrome addressing multiple vulnerabilities',
      vendor: 'Google',
      product: 'Chrome',
      version: '121.0.6167.85',
      releaseDate: new Date('2024-01-16'),
      severity: 'CRITICAL',
      operatingSystem: 'Cross-Platform',
      category: 'Browser Update',
    },
    {
      patchId: 'MFSA2024-01',
      title: 'Mozilla Firefox 122.0 Security Update',
      description: 'Security update for Firefox browser',
      vendor: 'Mozilla',
      product: 'Firefox',
      version: '122.0',
      releaseDate: new Date('2024-01-23'),
      severity: 'HIGH',
      operatingSystem: 'Cross-Platform',
      category: 'Browser Update',
    },
    {
      patchId: 'ADOBE-2024-001',
      title: 'Adobe Acrobat Reader DC Security Update',
      description: 'Critical security update for Adobe Acrobat Reader',
      vendor: 'Adobe',
      product: 'Acrobat Reader DC',
      version: '24.001.20629',
      releaseDate: new Date('2024-01-09'),
      severity: 'CRITICAL',
      operatingSystem: 'Cross-Platform',
      category: 'Security Update',
    },

    // Lower severity patches for testing
    {
      patchId: 'UPDATE-2024-001',
      title: 'Microsoft Office 365 ProPlus Update',
      description: 'Monthly feature update for Office 365',
      vendor: 'Microsoft',
      product: 'Office 365',
      version: '2401',
      releaseDate: new Date('2024-01-15'),
      severity: 'LOW',
      operatingSystem: 'Windows',
      category: 'Feature Update',
    },
    {
      patchId: 'UPDATE-2024-002',
      title: 'Adobe Creative Cloud Update',
      description: 'Regular update for Adobe Creative Cloud',
      vendor: 'Adobe',
      product: 'Creative Cloud',
      version: '6.1.0',
      releaseDate: new Date('2024-01-20'),
      severity: 'LOW',
      operatingSystem: 'Cross-Platform',
      category: 'Feature Update',
    },
    {
      patchId: 'UPDATE-2024-003',
      title: 'Java Runtime Environment 8 Update 401',
      description: 'Regular update for Java SE Runtime Environment',
      vendor: 'Oracle',
      product: 'Java SE',
      version: '8u401',
      releaseDate: new Date('2024-01-16'),
      severity: 'MEDIUM',
      operatingSystem: 'Cross-Platform',
      category: 'Security Update',
    },
  ];

  const createdPatches = [];
  for (const patchData of patches) {
    const patch = await prisma.patch.upsert({
      where: { patchId: patchData.patchId },
      update: {},
      create: patchData,
    });
    createdPatches.push(patch);
  }
  console.log(`✅ Created ${createdPatches.length} patches`);

  // ============================================
  // 2. Seed Assets with Full Inventory (10 assets)
  // ============================================
  console.log('\n🖥️  Seeding assets with full inventory...');

  const assetsData = [
    {
      hostname: 'WIN-SERVER-001',
      ipAddress: '192.168.1.10',
      macAddress: '00:1A:2B:3C:4D:10',
      operatingSystem: 'Windows Server 2022',
      osVersion: '21H2',
      assetType: 'SERVER',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'Dell',
      model: 'PowerEdge R750',
      serialNumber: 'DELL-SRV-001',
      cpu: 'Intel Xeon Gold 6338 @ 2.00GHz',
      cores: 32,
      ram: 128, // GB
      storage: 2000, // GB
      timezone: 'America/New_York',
      lastSeen: new Date(),
      agentVersion: '2.1.0',
    },
    {
      hostname: 'WIN-DESKTOP-001',
      ipAddress: '192.168.1.101',
      macAddress: '00:1A:2B:3C:4D:11',
      operatingSystem: 'Windows 11',
      osVersion: '22H2',
      assetType: 'WORKSTATION',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'HP',
      model: 'EliteDesk 800 G9',
      serialNumber: 'HP-DSK-001',
      cpu: 'Intel Core i7-12700 @ 2.10GHz',
      cores: 12,
      ram: 32,
      storage: 512,
      timezone: 'America/New_York',
      lastSeen: new Date(),
      agentVersion: '2.1.0',
    },
    {
      hostname: 'LINUX-SERVER-001',
      ipAddress: '192.168.1.20',
      macAddress: '00:1A:2B:3C:4D:20',
      operatingSystem: 'Ubuntu Linux',
      osVersion: '22.04 LTS',
      assetType: 'SERVER',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'Dell',
      model: 'PowerEdge R650',
      serialNumber: 'DELL-LNX-001',
      cpu: 'Intel Xeon Silver 4314 @ 2.40GHz',
      cores: 16,
      ram: 64,
      storage: 1000,
      timezone: 'America/Los_Angeles',
      lastSeen: new Date(),
      agentVersion: '2.1.0',
    },
    {
      hostname: 'MACOS-LAPTOP-001',
      ipAddress: '192.168.1.150',
      macAddress: '00:1A:2B:3C:4D:30',
      operatingSystem: 'macOS',
      osVersion: '14.2.1 (Sonoma)',
      assetType: 'LAPTOP',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'Apple',
      model: 'MacBook Pro 16-inch 2023',
      serialNumber: 'APPLE-MBP-001',
      cpu: 'Apple M3 Max',
      cores: 16,
      ram: 64,
      storage: 1000,
      timezone: 'America/Los_Angeles',
      lastSeen: new Date(),
      agentVersion: '2.1.0',
    },
    {
      hostname: 'WIN-SERVER-002',
      ipAddress: '192.168.1.11',
      macAddress: '00:1A:2B:3C:4D:12',
      operatingSystem: 'Windows Server 2019',
      osVersion: '1809',
      assetType: 'SERVER',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'HPE',
      model: 'ProLiant DL380 Gen10',
      serialNumber: 'HPE-SRV-002',
      cpu: 'Intel Xeon Gold 6248 @ 2.50GHz',
      cores: 20,
      ram: 256,
      storage: 4000,
      timezone: 'America/Chicago',
      lastSeen: new Date(),
      agentVersion: '2.0.5',
    },
    {
      hostname: 'LINUX-SERVER-002',
      ipAddress: '192.168.1.21',
      macAddress: '00:1A:2B:3C:4D:21',
      operatingSystem: 'Red Hat Enterprise Linux',
      osVersion: '9.3',
      assetType: 'SERVER',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'Dell',
      model: 'PowerEdge R740',
      serialNumber: 'DELL-RHEL-001',
      cpu: 'Intel Xeon Platinum 8280 @ 2.70GHz',
      cores: 28,
      ram: 192,
      storage: 3000,
      timezone: 'America/New_York',
      lastSeen: new Date(),
      agentVersion: '2.1.0',
    },
    {
      hostname: 'WIN-DESKTOP-002',
      ipAddress: '192.168.1.102',
      macAddress: '00:1A:2B:3C:4D:13',
      operatingSystem: 'Windows 10',
      osVersion: '22H2',
      assetType: 'WORKSTATION',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'Lenovo',
      model: 'ThinkCentre M90q',
      serialNumber: 'LEN-DSK-002',
      cpu: 'Intel Core i5-10500 @ 3.10GHz',
      cores: 6,
      ram: 16,
      storage: 256,
      timezone: 'America/Denver',
      lastSeen: new Date(),
      agentVersion: '2.0.8',
    },
    {
      hostname: 'MACOS-DESKTOP-001',
      ipAddress: '192.168.1.151',
      macAddress: '00:1A:2B:3C:4D:31',
      operatingSystem: 'macOS',
      osVersion: '13.6 (Ventura)',
      assetType: 'WORKSTATION',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'Apple',
      model: 'Mac Studio 2023',
      serialNumber: 'APPLE-MS-001',
      cpu: 'Apple M2 Ultra',
      cores: 24,
      ram: 128,
      storage: 2000,
      timezone: 'America/Los_Angeles',
      lastSeen: new Date(),
      agentVersion: '2.1.0',
    },
    {
      hostname: 'LINUX-WORKSTATION-001',
      ipAddress: '192.168.1.130',
      macAddress: '00:1A:2B:3C:4D:22',
      operatingSystem: 'Ubuntu Linux',
      osVersion: '23.10',
      assetType: 'WORKSTATION',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'System76',
      model: 'Thelio Major',
      serialNumber: 'S76-WKS-001',
      cpu: 'AMD Ryzen 9 7950X @ 4.50GHz',
      cores: 16,
      ram: 64,
      storage: 2000,
      timezone: 'America/Denver',
      lastSeen: new Date(),
      agentVersion: '2.1.0',
    },
    {
      hostname: 'WIN-LAPTOP-001',
      ipAddress: '192.168.1.120',
      macAddress: '00:1A:2B:3C:4D:14',
      operatingSystem: 'Windows 11',
      osVersion: '23H2',
      assetType: 'LAPTOP',
      status: 'ACTIVE',
      operationalStatus: 'OPERATIONAL',
      manufacturer: 'Dell',
      model: 'Latitude 7440',
      serialNumber: 'DELL-LPT-001',
      cpu: 'Intel Core i7-1365U @ 1.60GHz',
      cores: 10,
      ram: 32,
      storage: 512,
      timezone: 'America/New_York',
      lastSeen: new Date(),
      agentVersion: '2.1.0',
    },
  ];

  const createdAssets = [];
  for (const assetData of assetsData) {
    const asset = await prisma.asset.upsert({
      where: { hostname: assetData.hostname },
      update: {},
      create: {
        ...assetData,
        organizationId: org.id,
        locationId: location.id,
      },
    });
    createdAssets.push(asset);
  }
  console.log(`✅ Created ${createdAssets.length} assets`);

  // ============================================
  // 3. Seed Software Inventory for Assets
  // ============================================
  console.log('\n💿 Seeding software inventory...');

  const commonSoftware = [
    { name: 'Google Chrome', version: '121.0.6167.85', vendor: 'Google', category: 'Browser' },
    { name: 'Mozilla Firefox', version: '122.0', vendor: 'Mozilla', category: 'Browser' },
    { name: 'Microsoft Edge', version: '121.0.2277.83', vendor: 'Microsoft', category: 'Browser' },
    { name: 'Adobe Acrobat Reader DC', version: '24.001.20629', vendor: 'Adobe', category: 'Productivity' },
    { name: 'Java SE Runtime Environment', version: '8u401', vendor: 'Oracle', category: 'Runtime' },
    { name: '7-Zip', version: '23.01', vendor: 'Igor Pavlov', category: 'Utility' },
    { name: 'VLC Media Player', version: '3.0.20', vendor: 'VideoLAN', category: 'Media' },
    { name: 'Visual Studio Code', version: '1.86.0', vendor: 'Microsoft', category: 'Development' },
  ];

  let softwareCount = 0;
  for (const asset of createdAssets.slice(0, 5)) { // Add software to first 5 assets
    for (const software of commonSoftware) {
      await prisma.software.create({
        data: {
          assetId: asset.id,
          ...software,
          installDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
        },
      });
      softwareCount++;
    }
  }
  console.log(`✅ Created ${softwareCount} software records across ${5} assets`);

  // ============================================
  // 4. Seed Network Configuration for Assets
  // ============================================
  console.log('\n🌐 Seeding network configurations...');

  const networkConfigs = [
    { gateway: '192.168.1.1', subnetMask: '255.255.255.0', dns: ['8.8.8.8', '8.8.4.4'], dhcp: false },
    { gateway: '192.168.1.1', subnetMask: '255.255.255.0', dns: ['1.1.1.1', '1.0.0.1'], dhcp: false },
    { gateway: '192.168.1.1', subnetMask: '255.255.255.0', dns: ['8.8.8.8', '1.1.1.1'], dhcp: true },
  ];

  let networkCount = 0;
  for (const asset of createdAssets.slice(0, 8)) {
    const config = networkConfigs[networkCount % networkConfigs.length];
    await prisma.networkConfiguration.create({
      data: {
        assetId: asset.id,
        ...config,
      },
    });
    networkCount++;
  }
  console.log(`✅ Created ${networkCount} network configurations`);

  // ============================================
  // 5. Seed Security Compliance for Assets
  // ============================================
  console.log('\n🔒 Seeding security compliance...');

  let securityCount = 0;
  for (const asset of createdAssets.slice(0, 6)) {
    await prisma.securityCompliance.create({
      data: {
        assetId: asset.id,
        antivirusInstalled: Math.random() > 0.2, // 80% have AV
        antivirusUpToDate: Math.random() > 0.3, // 70% up to date
        firewallEnabled: Math.random() > 0.1, // 90% enabled
        encryptionEnabled: Math.random() > 0.4, // 60% encrypted
        complianceScore: Math.floor(Math.random() * 30) + 70, // 70-100 score
        lastScanDate: new Date(),
      },
    });
    securityCount++;
  }
  console.log(`✅ Created ${securityCount} security compliance records`);

  // ============================================
  // 6. Seed Patch Recommendations (20 recommendations)
  // ============================================
  console.log('\n🎯 Seeding patch recommendations...');

  const statuses = ['PENDING', 'ACCEPTED', 'REJECTED'];
  const statusCounts = { PENDING: 10, ACCEPTED: 6, REJECTED: 4 };

  const createdRecommendations = [];
  let recIndex = 0;

  for (const [status, count] of Object.entries(statusCounts)) {
    for (let i = 0; i < count && recIndex < createdPatches.length; i++) {
      const asset = createdAssets[recIndex % createdAssets.length];
      const patch = createdPatches[recIndex % createdPatches.length];

      const recommendation = await prisma.assetPatchRecommendation.create({
        data: {
          assetId: asset.id,
          patchId: patch.id,
          status: status as any,
          reason: status === 'PENDING' ? 'Awaiting approval' :
                  status === 'ACCEPTED' ? 'Approved for deployment' :
                  'Not applicable for this system',
          priority: patch.severity === 'CRITICAL' ? 'HIGH' :
                   patch.severity === 'HIGH' ? 'MEDIUM' : 'LOW',
          recommendedBy: 'System',
          recommendedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      });
      createdRecommendations.push(recommendation);
      recIndex++;
    }
  }
  console.log(`✅ Created ${createdRecommendations.length} patch recommendations (${statusCounts.PENDING} pending, ${statusCounts.ACCEPTED} accepted, ${statusCounts.REJECTED} rejected)`);

  // ============================================
  // 7. Seed Deployments (8 deployments)
  // ============================================
  console.log('\n🚀 Seeding deployments...');

  const deploymentStatuses = [
    { status: 'COMPLETED', count: 3 },
    { status: 'IN_PROGRESS', count: 2 },
    { status: 'FAILED', count: 2 },
    { status: 'CANCELLED', count: 1 },
  ];

  const createdDeployments = [];
  let deplIndex = 0;

  for (const { status, count } of deploymentStatuses) {
    for (let i = 0; i < count && deplIndex < createdPatches.length; i++) {
      const patch = createdPatches[deplIndex % createdPatches.length];
      const targetAssets = createdAssets.slice(deplIndex % 3, (deplIndex % 3) + 3); // 3 assets per deployment

      const deployment = await prisma.deployment.create({
        data: {
          name: `${patch.patchId} Deployment ${deplIndex + 1}`,
          description: `Deploy ${patch.title} to selected assets`,
          patchId: patch.id,
          status: status as any,
          scheduledAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
          startedAt: status !== 'PENDING' ? new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000) : null,
          completedAt: status === 'COMPLETED' ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null,
          createdById: (await prisma.user.findFirst({ where: { email: 'admin@patchiq.io' } }))?.id || '',
          organizationId: org.id,
        },
      });

      // Create deployment tasks for each target asset
      for (const asset of targetAssets) {
        const taskStatus =
          status === 'COMPLETED' ? 'SUCCESS' :
          status === 'IN_PROGRESS' ? (Math.random() > 0.5 ? 'PENDING' : 'IN_PROGRESS') :
          status === 'FAILED' ? (Math.random() > 0.5 ? 'FAILED' : 'SUCCESS') :
          'CANCELLED';

        await prisma.deploymentTask.create({
          data: {
            deploymentId: deployment.id,
            assetId: asset.id,
            status: taskStatus as any,
            startedAt: status !== 'PENDING' ? new Date(Date.now() - Math.random() * 4 * 24 * 60 * 60 * 1000) : null,
            completedAt: taskStatus === 'SUCCESS' || taskStatus === 'FAILED' ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) : null,
            errorMessage: taskStatus === 'FAILED' ? 'Connection timeout during patch installation' : null,
          },
        });
      }

      createdDeployments.push(deployment);
      deplIndex++;
    }
  }
  console.log(`✅ Created ${createdDeployments.length} deployments (${deploymentStatuses.map(d => `${d.count} ${d.status.toLowerCase()}`).join(', ')})`);

  // ============================================
  // 8. Seed Audit Logs for Assets
  // ============================================
  console.log('\n📋 Seeding audit logs...');

  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW'];
  let auditCount = 0;

  for (const asset of createdAssets.slice(0, 5)) {
    const action = auditActions[auditCount % auditActions.length];
    await prisma.auditLog.create({
      data: {
        resource: 'ASSET',
        resourceId: asset.id,
        action: action as any,
        performedBy: (await prisma.user.findFirst({ where: { email: 'admin@patchiq.io' } }))?.id || '',
        changes: { before: {}, after: { hostname: asset.hostname, status: asset.status } },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    auditCount++;
  }
  console.log(`✅ Created ${auditCount} audit log entries`);

  console.log('\n✨ Phase 2 test data seed complete!\n');
  console.log('Summary:');
  console.log(`  - ${createdPatches.length} patches`);
  console.log(`  - ${createdAssets.length} assets with full inventory`);
  console.log(`  - ${softwareCount} software records`);
  console.log(`  - ${networkCount} network configurations`);
  console.log(`  - ${securityCount} security compliance records`);
  console.log(`  - ${createdRecommendations.length} patch recommendations`);
  console.log(`  - ${createdDeployments.length} deployments with tasks`);
  console.log(`  - ${auditCount} audit log entries`);
  console.log('\nNote: To seed CVEs, run NVD sync: POST /v1/vulnerabilities/sync-nvd');
}

async function main() {
  try {
    await seedPhase2TestData();
  } catch (error) {
    console.error('❌ Error seeding Phase 2 test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
