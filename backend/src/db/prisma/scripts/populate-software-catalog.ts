#!/usr/bin/env tsx
/**
 * Populate Software Catalog from External Sources
 *
 * Run: npx tsx src/db/prisma/scripts/populate-software-catalog.ts
 */

import { prisma } from '../../../db/client';
import { softwareCatalogPopulatorService } from '../../../modules/software-catalog/software-catalog-populator.service';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Software Catalog Populator                                ║');
  console.log('║  Fetches popular software from Chocolatey, Homebrew,       ║');
  console.log('║  npm, and PyPI to populate the master software catalog     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    const result = await softwareCatalogPopulatorService.populateAll();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  SUMMARY                                                   ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Packages: ${result.total.toString().padEnd(43)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Chocolatey (Windows):  ${result.bySource.chocolatey?.toString().padEnd(32)}║`);
    console.log(`║  Homebrew (macOS):      ${result.bySource.homebrew?.toString().padEnd(32)}║`);
    console.log(`║  npm (Node.js):         ${result.bySource.npm?.toString().padEnd(32)}║`);
    console.log(`║  PyPI (Python):         ${result.bySource.pypi?.toString().padEnd(32)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Show sample entries
    const samples = await prisma.softwarePackage.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        packageId: true,
        displayName: true,
        version: true,
        platform: true,
        category: true,
      },
    });

    console.log('Sample entries:');
    samples.forEach((pkg) => {
      console.log(`  • ${pkg.displayName} (${pkg.version}) - ${pkg.platform} [${pkg.category}]`);
    });

    console.log('\n✓ Software catalog populated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Failed to populate software catalog:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
