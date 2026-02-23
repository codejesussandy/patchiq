/**
 * Cleanup script to remove fake/demo seeded data from the database.
 * Run with: npx ts-node src/db/prisma/cleanup-seed-data.ts
 * Or via: bun run src/db/prisma/cleanup-seed-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup of fake seeded data...\n');

  // ============================================
  // Remove fake Agents (seeded with hardcoded machine IDs)
  // ============================================
  const fakeAgentMachineIds = [
    'WIN-WKS-001-UUID',
    'UBUNTU-SRV-01-UUID',
    'MAC-MBA-101-UUID',
    'WIN-SRV-DC01-UUID',
    'DEBIAN-WEB-01-UUID',
  ];

  const deletedAgents = await prisma.agent.deleteMany({
    where: { machineId: { in: fakeAgentMachineIds } },
  });
  console.log(`Deleted ${deletedAgents.count} fake agents`);

  // ============================================
  // Remove fake Assets (seeded with hardcoded serial numbers)
  // ============================================
  const fakeAssetSerialNumbers = ['WIN-SN-001', 'LNX-SN-002', 'MAC-SN-003', 'WIN-SN-004', 'LNX-SN-005'];

  // First delete AssetTags for fake assets
  const fakeAssets = await prisma.asset.findMany({
    where: { serialNumber: { in: fakeAssetSerialNumbers } },
    select: { id: true },
  });
  const fakeAssetIds = fakeAssets.map((a) => a.id);

  if (fakeAssetIds.length > 0) {
    await prisma.assetTag.deleteMany({ where: { assetId: { in: fakeAssetIds } } });
    await prisma.assetSoftware.deleteMany({ where: { assetId: { in: fakeAssetIds } } });
    await prisma.assetPatchRecommendation.deleteMany({ where: { assetId: { in: fakeAssetIds } } });
    const deletedAssets = await prisma.asset.deleteMany({
      where: { id: { in: fakeAssetIds } },
    });
    console.log(`Deleted ${deletedAssets.count} fake assets (Finance Workstation, Ubuntu Server, MacBook, etc.)`);
  }

  // ============================================
  // Remove test Assets for Vulnerability Correlation
  // ============================================
  const testAssetNames = ['ASSET-WIN-01', 'ASSET-WIN-02', 'ASSET-LIN-01', 'ASSET-LIN-02', 'ASSET-MAC-01'];

  const testAssets = await prisma.asset.findMany({
    where: { name: { in: testAssetNames } },
    select: { id: true },
  });
  const testAssetIds = testAssets.map((a) => a.id);

  if (testAssetIds.length > 0) {
    await prisma.assetTag.deleteMany({ where: { assetId: { in: testAssetIds } } });
    await prisma.assetSoftware.deleteMany({ where: { assetId: { in: testAssetIds } } });
    await prisma.assetPatchRecommendation.deleteMany({ where: { assetId: { in: testAssetIds } } });
    const deletedTestAssets = await prisma.asset.deleteMany({
      where: { id: { in: testAssetIds } },
    });
    console.log(`Deleted ${deletedTestAssets.count} test assets (ASSET-WIN-01, ASSET-LIN-01, etc.)`);
  }

  // ============================================
  // Remove fake Patches (seeded KB patches + PATCH-* test patches)
  // ============================================
  const fakePatchIds = [
    'KB5034441',
    'KB5034763',
    'USN-6549-1',
    'USN-6550-1',
    'macOS-14.2.1',
    'DEBIAN-DLA-3712-1',
    'KB5033920',
    'USN-6548-1',
    'PATCH-FIREFOX-116',
    'PATCH-7ZIP-2408',
    'PATCH-7ZIP-2500',
    'PATCH-NOTEPAD-889',
    'PATCH-OPENSSL-3019',
    'PATCH-NODE-1620.2',
  ];

  const deletedPatches = await prisma.patch.deleteMany({
    where: { patchId: { in: fakePatchIds } },
  });
  console.log(`Deleted ${deletedPatches.count} fake patches`);

  // ============================================
  // Remove fake Vulnerabilities (famous CVEs seeded for demo)
  // ============================================
  const fakeCveIds = ['CVE-2021-44228', 'CVE-2014-0160', 'CVE-2017-5638', 'CVE-2021-26855', 'CVE-2019-0708'];

  const deletedVulns = await prisma.vulnerability.deleteMany({
    where: { cveId: { in: fakeCveIds } },
  });
  console.log(`Deleted ${deletedVulns.count} fake vulnerabilities (Log4Shell, Heartbleed, etc.)`);

  // ============================================
  // Remove fake Distribution Servers
  // ============================================
  const fakeServerNames = ['Primary Hub', 'EU Relay', 'APAC Relay', 'Staging Server', 'Legacy Relay'];

  const deletedServers = await prisma.distributionServer.deleteMany({
    where: { name: { in: fakeServerNames } },
  });
  console.log(`Deleted ${deletedServers.count} fake distribution servers`);

  // ============================================
  // Summary
  // ============================================
  // ============================================
  // Remove leftover INTTEST assets from integration test runs
  // ============================================
  const inttestAssets = await prisma.asset.findMany({
    where: { name: { startsWith: 'INTTEST' } },
    select: { id: true },
  });
  const inttestIds = inttestAssets.map((a) => a.id);

  if (inttestIds.length > 0) {
    await prisma.assetTag.deleteMany({ where: { assetId: { in: inttestIds } } });
    await prisma.assetSoftware.deleteMany({ where: { assetId: { in: inttestIds } } });
    await prisma.assetPatchRecommendation.deleteMany({ where: { assetId: { in: inttestIds } } });
    const deletedInttest = await prisma.asset.deleteMany({ where: { id: { in: inttestIds } } });
    console.log(`Deleted ${deletedInttest.count} leftover INTTEST integration test assets`);
  }

  console.log('\nCleanup complete!');
  console.log('The following data was preserved:');
  console.log('  - Organization, branch, department, location');
  console.log('  - Roles (admin, user)');
  console.log('  - Users (admin@patchiq.io, demo@patchiq.io)');
  console.log('  - Tags, computer groups, deployment policies');
  console.log('  - Settings, alert configs, LDAP config');
  console.log('  - Patch repository sources (whitelist)');
  console.log('  - CPE mappings');
  console.log('  - Agent versions and downloads');
  console.log('  - Hub software packages');
}

main()
  .catch((e) => {
    console.error('Cleanup error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
