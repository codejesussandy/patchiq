/**
 * Create Patch + PatchBundle records from SoftwarePackage records
 *
 * For each SoftwarePackage that has a bundle in MinIO (bundleObjectKey set),
 * creates a Patch record + PatchBundle record linked to the same MinIO bundle.
 *
 * Also deletes any old incorrect patches (PW-20260223-*).
 *
 * Usage: cd backend && npx tsx src/db/prisma/seeds/create-patches-from-packages.ts
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Which 5 apps per OS to create patches for (must match SoftwarePackage names)
const TARGET_APPS: Record<string, string[]> = {
  windows: ['7-zip', 'firefox', 'git', 'notepad-plus-plus', 'vlc'],
  linux: ['golang', 'nodejs', 'vscode', 'terraform', 'vault'],
  macos: ['vlc', 'nodejs', 'firefox', 'gimp', 'terraform'],
};

// Map platform to OS enum value used in Patch records
const PLATFORM_TO_OS: Record<string, string> = {
  windows: 'WINDOWS',
  linux: 'LINUX',
  macos: 'MACOS',
};

// Severity based on version position (older = less critical)
function getSeverity(index: number, total: number): string {
  if (index === total - 1) return 'HIGH';     // latest
  if (index === total - 2) return 'MEDIUM';   // second latest
  return 'LOW';                                 // older
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Create Patches from SoftwarePackage Bundles        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── Step 1: Delete old incorrect patches ──────────────────────────────
  console.log('── Step 1: Cleaning up old incorrect patches ──');

  const oldPatches = await prisma.patch.findMany({
    where: { patchId: { startsWith: 'PW-20260223-' } },
    select: { id: true, patchId: true },
  });

  if (oldPatches.length > 0) {
    // Delete bundles first (foreign key)
    await prisma.patchBundle.deleteMany({
      where: { patchId: { in: oldPatches.map(p => p.id) } },
    });

    // Delete deployment tasks
    const oldDeployments = await prisma.patchDeployment.findMany({
      where: { patches: { some: { id: { in: oldPatches.map(p => p.id) } } } },
      select: { id: true },
    });

    if (oldDeployments.length > 0) {
      await prisma.patchDeploymentTask.deleteMany({
        where: { deploymentId: { in: oldDeployments.map(d => d.id) } },
      });
      // Disconnect patches from deployments
      for (const dep of oldDeployments) {
        await prisma.patchDeployment.update({
          where: { id: dep.id },
          data: { patches: { set: [] } },
        });
      }
      await prisma.patchDeployment.deleteMany({
        where: { id: { in: oldDeployments.map(d => d.id) } },
      });
    }

    // Delete recommendations
    await prisma.assetPatchRecommendation.deleteMany({
      where: { patchId: { in: oldPatches.map(p => p.id) } },
    });

    // Delete the patches
    await prisma.patch.deleteMany({
      where: { id: { in: oldPatches.map(p => p.id) } },
    });

    console.log(`  Deleted ${oldPatches.length} old patches and related records\n`);
  } else {
    console.log('  No old patches to clean up\n');
  }

  // ── Step 2: Get all bundled SoftwarePackages ──────────────────────────
  console.log('── Step 2: Creating patches from SoftwarePackage bundles ──\n');

  let patchCounter = 0;
  const baseCount = await prisma.patch.count();
  let created = 0;
  let skipped = 0;

  for (const [platform, appNames] of Object.entries(TARGET_APPS)) {
    const os = PLATFORM_TO_OS[platform];
    console.log(`  ── ${platform.toUpperCase()} ──`);

    for (const appName of appNames) {
      // Get all versions of this app, ordered by version
      const packages = await prisma.softwarePackage.findMany({
        where: {
          name: appName,
          platform,
          bundleObjectKey: { not: null },
        },
        orderBy: { version: 'asc' },
      });

      if (packages.length === 0) {
        console.log(`    SKIP: ${appName} — no bundled packages found`);
        skipped++;
        continue;
      }

      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        const severity = getSeverity(i, packages.length);

        // Check if patch already exists for this package
        const existing = await prisma.patch.findFirst({
          where: {
            software: pkg.displayName,
            os,
            title: { contains: pkg.version },
          },
        });

        if (existing) {
          console.log(`    SKIP: ${pkg.displayName} ${pkg.version} (${os}) — patch exists`);
          skipped++;
          continue;
        }

        patchCounter++;
        const patchId = `PW-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(baseCount + patchCounter).padStart(3, '0')}`;

        // Parse manifest
        const manifest = pkg.manifestJson as Record<string, unknown> | null;

        const patch = await prisma.patch.create({
          data: {
            id: uuidv4(),
            patchId,
            title: `${pkg.displayName} ${pkg.version} Update`,
            software: pkg.displayName,
            description: pkg.description || `Update ${pkg.displayName} to version ${pkg.version}`,
            severity,
            category: pkg.category || 'software-update',
            vendor: (pkg.cpeVendor || pkg.vendor || '').toLowerCase(),
            product: (pkg.cpeProduct || pkg.name || '').toLowerCase(),
            os,
            platform: platform === 'windows' ? 'Windows' : platform === 'linux' ? 'Linux' : 'macOS',
            kbNumber: pkg.version,
            rebootRequired: false,
            supportUninstallation: true,
            supportsRollback: i > 0,
            tags: [platform, pkg.category || 'utility', i === packages.length - 1 ? 'latest' : 'legacy'],
            testStatus: 'NOT_TESTED',
            testResult: null,
            approvalStatus: 'Pending',
            endpoints: 0,
            operationalStatusSince: new Date(),
          },
        });

        // Create PatchBundle — linked to same MinIO bundle as SoftwarePackage
        // scriptInstall is LEFT NULL so the agent uses Path C (full bundle extraction)
        await prisma.patchBundle.create({
          data: {
            id: uuidv4(),
            patchId: patch.id,
            minioBucket: 'patches',
            bundleObjectKey: pkg.bundleObjectKey,
            bundleChecksum: pkg.bundleChecksum,
            bundleSize: pkg.bundleSize,
            fileName: pkg.fileName,
            fileSize: pkg.fileSize,
            fileChecksum: pkg.checksum,
            checksumType: pkg.checksumType || 'sha256',
            downloadStatus: 'COMPLETED',
            downloadedAt: new Date(),
            scriptsIncluded: true,
            requiresRoot: pkg.requiresRoot,
            manifestJson: pkg.manifestJson || undefined,
            // scriptInstall LEFT NULL — agent uses bundle extraction path
            // scripts live inside the bundle.tar.gz (scripts/install.sh or scripts/install.ps1)
          },
        });

        console.log(`    CREATE: ${patchId} — ${pkg.displayName} ${pkg.version} (${os}) [${severity}]`);
        created++;
      }
    }
    console.log();
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║                     Summary                          ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Created: ${String(created).padStart(3)} patches                           ║`);
  console.log(`║  Skipped: ${String(skipped).padStart(3)} (already exist or no bundle)      ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\nNext: Deploy latest versions to test endpoints');
  console.log('  npx tsx src/db/prisma/seeds/deploy-and-test-patches.ts\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
