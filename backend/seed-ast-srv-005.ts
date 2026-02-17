import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config();

const prisma = new PrismaClient();

async function seedAssetData() {
  const assetId = '24196e90-f486-49c4-8494-836a2cd58bfb'; // AST-SRV-005

  console.log('Seeding test data for AST-SRV-005...');

  // 1. Add Hardware Data
  await prisma.assetHardware.upsert({
    where: { assetId },
    update: {},
    create: {
      assetId,
      cpu: 'Intel Xeon E5-2680 v4',
      cpuCores: 14,
      cpuThreads: 28,
      cpuSpeedMHz: 2400,
      ramTotal: BigInt(64) * BigInt(1024) * BigInt(1024) * BigInt(1024), // 64GB in bytes
      ramSlots: 4,
      ramType: 'DDR4',
      diskTotal: BigInt(2) * BigInt(1024) * BigInt(1024) * BigInt(1024) * BigInt(1024), // 2TB
      diskFree: BigInt(1) * BigInt(1024) * BigInt(1024) * BigInt(1024) * BigInt(1024), // 1TB
      diskType: 'SSD',
      gpuModel: 'Integrated Graphics',
      biosVersion: '2.10.0',
      systemSKU: 'SR650V2',
      manufacturer: 'Lenovo',
      model: 'ThinkSystem SR650 V2',
    },
  });
  console.log('✅ Hardware data seeded');

  // 2. Add Software Inventory
  await prisma.assetSoftwareInventory.upsert({
    where: { assetId },
    update: {},
    create: {
      assetId,
      rawPayload: {
        installedSoftware: [
          { name: 'nginx', version: '1.24.0', vendor: 'Nginx Inc', category: 'Web Server', installedDate: '2024-01-15' },
          { name: 'postgresql', version: '15.3', vendor: 'PostgreSQL Global Development Group', category: 'Database', installedDate: '2024-01-15' },
          { name: 'node', version: '20.10.0', vendor: 'Node.js Foundation', category: 'Runtime', installedDate: '2024-01-15' },
          { name: 'openssh-server', version: '9.6p1', vendor: 'OpenBSD', category: 'Security', installedDate: '2024-01-15' },
        ],
      },
    },
  });
  console.log('✅ Software inventory seeded');

  // 3. Update Asset with network info (no separate AssetNetwork model)
  await prisma.asset.update({
    where: { id: assetId },
    data: {
      hostname: 'debian-web-01',
      ipAddress: '192.168.1.105',
      macAddress: '00:1A:2B:3C:4D:05',
    },
  });
  console.log('✅ Network data seeded');

  // 4. Add Security Data
  await prisma.assetSecurity.upsert({
    where: { assetId },
    update: {},
    create: {
      assetId,
      antivirusInstalled: true,
      antivirusName: 'ClamAV',
      antivirusUpdated: new Date(),
      firewallEnabled: true,
      encryptionEnabled: true,
      complianceScore: 85,
      lastSecurityScan: new Date(),
    },
  });
  console.log('✅ Security data seeded');

  // 5. Add Telemetry Data (via Agent)
  // Find or create an agent for this asset
  let agent = await prisma.agent.findFirst({
    where: { assetId },
  });

  if (!agent) {
    agent = await prisma.agent.create({
      data: {
        machineId: `machine-${assetId.substring(0, 8)}`,
        name: 'debian-web-01-agent',
        hostname: 'debian-web-01',
        status: 'Connected',
        os: 'Linux',
        osVersion: 'Debian 12',
        architecture: 'x86_64',
        agentVersion: '1.0.0',
        ipAddress: '192.168.1.105',
        macAddress: '00:1A:2B:3C:4D:05',
        assetId,
        lastHeartbeat: new Date(),
      },
    });
    console.log('✅ Agent created');
  }

  // Create telemetry for the agent
  await prisma.agentTelemetry.create({
    data: {
      agentId: agent.id,
      cpuUsage: 45.5,
      memoryUsage: 62.3,
      diskUsage: 50.0,
      uptime: 604800, // 7 days in seconds
      networkInBps: BigInt(1024) * BigInt(1024), // 1MB/s
      networkOutBps: BigInt(512) * BigInt(1024), // 512KB/s
      processCount: 142,
      pendingReboot: false,
      timestamp: new Date(),
    },
  });
  console.log('✅ Telemetry data seeded');

  console.log('\n🎉 All test data seeded successfully for AST-SRV-005!');
}

seedAssetData()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
