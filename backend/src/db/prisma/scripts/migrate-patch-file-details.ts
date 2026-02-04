/**
 * Migration Script: PatchFileDetail -> PatchBundle
 *
 * This script migrates data from the deprecated PatchFileDetail model to the new PatchBundle model.
 * Run with: npx ts-node -r tsconfig-paths/register src/db/prisma/scripts/migrate-patch-file-details.ts
 *
 * Phase 5 of PATCHES_SCHEMA_PLAN.md
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting PatchFileDetail -> PatchBundle migration...\n');

  // Get all patches that have file details but no bundle
  const patchesWithFileDetails = await prisma.patch.findMany({
    where: {
      fileDetails: {
        some: {},
      },
      bundle: null,
    },
    include: {
      fileDetails: {
        orderBy: { id: 'asc' }, // Get the first/primary file
        take: 1,
      },
    },
  });

  console.log(`Found ${patchesWithFileDetails.length} patches with file details but no bundle\n`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const patch of patchesWithFileDetails) {
    const fileDetail = patch.fileDetails[0];
    if (!fileDetail) {
      skippedCount++;
      continue;
    }

    try {
      // Create PatchBundle from PatchFileDetail
      await prisma.patchBundle.create({
        data: {
          patchId: patch.id,
          // MinIO storage fields
          minioBucket: fileDetail.minioBucket || 'patches',
          bundleObjectKey: fileDetail.minioObjectKey,
          bundleChecksum: fileDetail.checksum,
          bundleSize: fileDetail.sizeBytes,
          // Download tracking
          sourceUrl: fileDetail.sourceUrl,
          downloadStatus: fileDetail.downloadStatus,
          downloadedAt: fileDetail.downloadedAt,
          downloadError: fileDetail.downloadError,
          retryCount: fileDetail.retryCount,
          // File metadata
          fileName: fileDetail.fileName,
          fileSize: fileDetail.sizeBytes,
          checksumType: fileDetail.checksumType || 'sha256',
          // No scripts in legacy file details
          scriptsIncluded: false,
        },
      });

      console.log(`✓ Migrated: ${patch.patchId} (${fileDetail.fileName})`);
      migratedCount++;
    } catch (error) {
      console.error(`✗ Error migrating ${patch.patchId}:`, error);
      errorCount++;
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Migrated: ${migratedCount}`);
  console.log(`Skipped:  ${skippedCount}`);
  console.log(`Errors:   ${errorCount}`);

  // Show current state
  const [totalPatches, patchesWithBundles, patchesWithFileDetails2] = await Promise.all([
    prisma.patch.count(),
    prisma.patchBundle.count(),
    prisma.patchFileDetail.count(),
  ]);

  console.log('\n--- Current State ---');
  console.log(`Total patches:        ${totalPatches}`);
  console.log(`Patches with bundles: ${patchesWithBundles}`);
  console.log(`File details records: ${patchesWithFileDetails2}`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
