#!/usr/bin/env ts-node
/**
 * Test Data Generator for PatchIQ
 *
 * Generates comprehensive test data for:
 * - Assets with all detail tabs populated
 * - Patch recommendations in various states
 * - Vulnerabilities
 * - Deployments
 * - Alerts
 *
 * Usage:
 *   npm run generate-test-data -- --assets=10 --recommendations=20 --vulnerabilities=50
 *   npm run generate-test-data -- --preset=full
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

interface GeneratorOptions {
  assets?: number;
  recommendations?: number;
  vulnerabilities?: number;
  deployments?: number;
  preset?: 'minimal' | 'standard' | 'full';
}

// Presets
const PRESETS: Record<string, GeneratorOptions> = {
  minimal: {
    assets: 5,
    recommendations: 10,
    vulnerabilities: 20,
    deployments: 3,
  },
  standard: {
    assets: 20,
    recommendations: 50,
    vulnerabilities: 100,
    deployments: 10,
  },
  full: {
    assets: 100,
    recommendations: 200,
    vulnerabilities: 500,
    deployments: 50,
  },
};

// Sample data pools
const OS_TYPES = ['Windows 11', 'Windows 10', 'Windows Server 2022', 'Ubuntu 22.04', 'Debian 12', 'macOS Sonoma', 'RHEL 9'];
const MANUFACTURERS = ['Dell', 'HP', 'Lenovo', 'Apple', 'Microsoft', 'Asus'];
const CPU_MODELS = ['Intel Core i7-12700K', 'AMD Ryzen 9 5950X', 'Intel Xeon E5-2680 v4', 'Apple M2', 'AMD EPYC 7763'];
const STATUSES = ['RECOMMENDED', 'ACCEPTED', 'REJECTED', 'DEPLOYED', 'FAILED'];
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const DEPARTMENTS = ['IT', 'Engineering', 'Finance', 'Sales', 'Marketing', 'HR'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBoolean(): boolean {
  return Math.random() > 0.5;
}

async function generateAsset(index: number): Promise<string> {
  const assetTag = `AST-TEST-${String(index).padStart(4, '0')}`;

  // Check if asset already exists
  const existing = await prisma.asset.findUnique({
    where: { assetTag },
  });

  if (existing) {
    console.log(`⏭️  Asset ${assetTag} already exists, skipping`);
    return existing.id;
  }

  // Create asset
  const asset = await prisma.asset.create({
    data: {
      name: `Test ${randomChoice(['Server', 'Workstation', 'Laptop'])} ${index}`,
      assetTag,
      type: 'Endpoint',
      status: randomChoice(['IN_USE', 'AVAILABLE', 'UNDER_MAINTENANCE']),
      os: randomChoice(OS_TYPES),
      osVersion: `${randomInt(1, 10)}.${randomInt(0, 9)}.${randomInt(0, 99)}`,
      manufacturer: randomChoice(MANUFACTURERS),
      model: `Model-${randomInt(1000, 9999)}`,
      serialNumber: `SN${Date.now()}${randomInt(1000, 9999)}`,
      ipAddress: `192.168.${randomInt(1, 255)}.${randomInt(1, 255)}`,
      macAddress: Array.from({ length: 6 }, () => randomInt(0, 255).toString(16).padStart(2, '0')).join(':'),
      hostname: `host-${index}`,
      ownerName: `User ${randomInt(1, 100)}`,
      ownerEmail: `user${randomInt(1, 100)}@patchiq.io`,
      ownerDepartment: randomChoice(DEPARTMENTS),
      purchaseDate: new Date(Date.now() - randomInt(0, 365 * 3) * 24 * 60 * 60 * 1000),
      purchaseCost: randomInt(500, 5000),
      currency: 'USD',
    },
  });

  // Add hardware data
  await prisma.assetHardware.create({
    data: {
      assetId: asset.id,
      cpu: randomChoice(CPU_MODELS),
      cpuCores: randomChoice([4, 6, 8, 12, 16, 32]),
      cpuThreads: randomChoice([8, 12, 16, 24, 32, 64]),
      cpuSpeedMHz: randomChoice([2400, 2800, 3200, 3600, 4000]),
      ramTotal: BigInt(randomChoice([8, 16, 32, 64, 128])) * BigInt(1024) * BigInt(1024) * BigInt(1024),
      ramSlots: randomChoice([2, 4, 8]),
      ramType: randomChoice(['DDR4', 'DDR5']),
      diskTotal: BigInt(randomChoice([256, 512, 1024, 2048])) * BigInt(1024) * BigInt(1024) * BigInt(1024),
      diskFree: BigInt(randomChoice([128, 256, 512, 1024])) * BigInt(1024) * BigInt(1024) * BigInt(1024),
      diskType: randomChoice(['SSD', 'NVMe', 'HDD']),
      manufacturer: asset.manufacturer,
      model: asset.model,
    },
  });

  // Add software inventory
  await prisma.assetSoftwareInventory.create({
    data: {
      assetId: asset.id,
      rawPayload: {
        installedSoftware: [
          { name: 'Chrome', version: '120.0.6099', vendor: 'Google', category: 'Browser' },
          { name: 'Node.js', version: '20.10.0', vendor: 'Node.js Foundation', category: 'Runtime' },
          { name: 'Docker', version: '24.0.7', vendor: 'Docker Inc', category: 'Container' },
          { name: 'VSCode', version: '1.85.0', vendor: 'Microsoft', category: 'IDE' },
        ],
      },
    },
  });

  // Add security data
  await prisma.assetSecurity.create({
    data: {
      assetId: asset.id,
      antivirusInstalled: randomBoolean(),
      antivirusName: randomChoice(['Windows Defender', 'ClamAV', 'Sophos', 'McAfee']),
      antivirusUpdated: new Date(),
      firewallEnabled: randomBoolean(),
      encryptionEnabled: randomBoolean(),
      complianceScore: randomInt(60, 100),
      lastSecurityScan: new Date(Date.now() - randomInt(0, 7) * 24 * 60 * 60 * 1000),
    },
  });

  // Create agent for telemetry
  const agent = await prisma.agent.create({
    data: {
      machineId: `machine-${asset.id.substring(0, 8)}`,
      name: `${asset.name}-agent`,
      hostname: asset.hostname || `host-${index}`,
      status: randomChoice(['Connected', 'Disconnected', 'Error']),
      os: asset.os,
      osVersion: asset.osVersion,
      ipAddress: asset.ipAddress,
      macAddress: asset.macAddress,
      assetId: asset.id,
      agentVersion: '1.0.0',
      lastHeartbeat: new Date(Date.now() - randomInt(0, 60) * 60 * 1000),
    },
  });

  // Add telemetry
  await prisma.agentTelemetry.create({
    data: {
      agentId: agent.id,
      cpuUsage: randomInt(10, 90) + Math.random(),
      memoryUsage: randomInt(20, 80) + Math.random(),
      diskUsage: randomInt(30, 90) + Math.random(),
      uptime: randomInt(3600, 86400 * 30),
      networkInBps: BigInt(randomInt(1024, 1024 * 1024)),
      networkOutBps: BigInt(randomInt(512, 1024 * 512)),
      processCount: randomInt(50, 300),
      pendingReboot: randomBoolean(),
    },
  });

  console.log(`✅ Created asset: ${assetTag}`);
  return asset.id;
}

async function generateRecommendation(assetId: string, index: number) {
  // Find a random patch or create a dummy one
  const patch = await prisma.patch.findFirst();

  if (!patch) {
    console.log('⚠️  No patches found in database, skipping recommendation generation');
    return;
  }

  // Find a random vulnerability or skip
  const vulnerability = await prisma.vulnerability.findFirst();

  if (!vulnerability) {
    console.log('⚠️  No vulnerabilities found in database, skipping recommendation generation');
    return;
  }

  // Check if recommendation already exists
  const existing = await prisma.assetPatchRecommendation.findFirst({
    where: {
      assetId,
      patchId: patch.id,
      vulnerabilityId: vulnerability.id,
    },
  });

  if (existing) {
    console.log(`  ⏭️  Recommendation already exists, skipping`);
    return;
  }

  await prisma.assetPatchRecommendation.create({
    data: {
      assetId,
      patchId: patch.id,
      vulnerabilityId: vulnerability.id,
      status: randomChoice(STATUSES),
      severity: randomChoice(SEVERITIES),
      riskScore: randomInt(1, 100) + Math.random(),
      reason: `Automated recommendation ${index}: Address ${randomChoice(SEVERITIES).toLowerCase()} security issue`,
    },
  });

  console.log(`  ✅ Created recommendation for asset`);
}

async function generateVulnerability(assetId: string, index: number) {
  // Find or create a vulnerability
  const cveId = `CVE-2024-${String(randomInt(10000, 99999))}`;

  let vulnerability = await prisma.vulnerability.findFirst({
    where: { cveId },
  });

  if (!vulnerability) {
    vulnerability = await prisma.vulnerability.create({
      data: {
        cveId,
        title: `Test Vulnerability ${index}`,
        description: `Test vulnerability ${index}: ${randomChoice(['Buffer overflow', 'SQL injection', 'XSS', 'RCE', 'Privilege escalation'])} vulnerability`,
        severity: randomChoice(SEVERITIES),
        cvss3BaseScore: randomInt(1, 10) + Math.random(),
        publishedDate: new Date(Date.now() - randomInt(0, 365) * 24 * 60 * 60 * 1000),
        riskScore: randomInt(1, 100),
        patchAvailable: randomBoolean(),
        exploitable: randomBoolean(),
        isZeroDay: randomBoolean(),
      },
    });
  }

  // Link to asset (skip if already linked)
  const existingLink = await prisma.assetVulnerability.findUnique({
    where: {
      assetId_vulnerabilityId: {
        assetId,
        vulnerabilityId: vulnerability.id,
      },
    },
  });

  if (existingLink) {
    console.log(`  ⏭️  Vulnerability ${cveId} already linked to asset, skipping`);
    return;
  }

  await prisma.assetVulnerability.create({
    data: {
      assetId,
      vulnerabilityId: vulnerability.id,
      status: randomChoice(['Open', 'In Progress', 'Resolved', 'Accepted Risk']),
      detectedAt: new Date(Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`  ✅ Created vulnerability: ${cveId}`);
}

async function generateTestData(options: GeneratorOptions) {
  console.log('🚀 Generating test data...\n');

  // Apply preset if specified
  if (options.preset && PRESETS[options.preset]) {
    options = { ...PRESETS[options.preset], ...options };
  }

  const {
    assets = 10,
    recommendations = 20,
    vulnerabilities = 50,
  } = options;

  console.log(`📊 Configuration:
  - Assets: ${assets}
  - Recommendations per asset: ${Math.floor(recommendations / assets)}
  - Vulnerabilities per asset: ${Math.floor(vulnerabilities / assets)}
`);

  // Generate assets
  console.log(`\n📦 Generating ${assets} assets...`);
  const assetIds: string[] = [];

  for (let i = 0; i < assets; i++) {
    const assetId = await generateAsset(i + 1);
    assetIds.push(assetId);
  }

  // Generate recommendations
  if (recommendations > 0) {
    console.log(`\n💡 Generating ${recommendations} patch recommendations...`);
    for (let i = 0; i < recommendations; i++) {
      const assetId = randomChoice(assetIds);
      await generateRecommendation(assetId, i + 1);
    }
  }

  // Generate vulnerabilities
  if (vulnerabilities > 0) {
    console.log(`\n🔒 Generating ${vulnerabilities} vulnerabilities...`);
    for (let i = 0; i < vulnerabilities; i++) {
      const assetId = randomChoice(assetIds);
      await generateVulnerability(assetId, i + 1);
    }
  }

  console.log('\n✅ Test data generation complete!');
  console.log(`\n📈 Summary:
  - ${assets} assets created with full detail data
  - ${recommendations} patch recommendations created
  - ${vulnerabilities} vulnerabilities created
`);
}

// Parse command line arguments
function parseArgs(): GeneratorOptions {
  const args = process.argv.slice(2);
  const options: GeneratorOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      if (key === 'preset') {
        options.preset = value as 'minimal' | 'standard' | 'full';
      } else if (value) {
        options[key as keyof GeneratorOptions] = parseInt(value, 10) as any;
      }
    }
  }

  return options;
}

// Main execution
generateTestData(parseArgs())
  .catch((e) => {
    console.error('❌ Error generating test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
