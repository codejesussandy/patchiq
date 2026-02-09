#!/usr/bin/env tsx
/**
 * Remove template packages that don't have actual files
 * Keeps only packages with uploaded installers (SWP-* packages)
 */

import { prisma } from '../../../db/client';

async function main() {
  console.log('Removing template packages without files...');
  
  const result = await prisma.softwarePackage.deleteMany({
    where: {
      AND: [
        {
          OR: [
            { packageId: { startsWith: 'BREW-' } },
            { packageId: { startsWith: 'CHOCO-' } },
            { packageId: { startsWith: 'NPM-' } },
            { packageId: { startsWith: 'PYPI-' } },
          ]
        },
        {
          bundleObjectKey: null, // No file uploaded
        }
      ]
    }
  });
  
  console.log(`✓ Removed ${result.count} template packages`);
  
  const remaining = await prisma.softwarePackage.count();
  console.log(`✓ ${remaining} packages remaining (with actual files)`);
  
  process.exit(0);
}

main();
