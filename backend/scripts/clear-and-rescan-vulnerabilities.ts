#!/usr/bin/env ts-node
/**
 * Clear all existing asset vulnerabilities and re-scan with new conservative logic
 *
 * This script:
 * 1. Clears all AssetVulnerability records (false positives)
 * 2. Re-scans all assets with the updated vulnerability detection logic
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/clear-and-rescan-vulnerabilities.ts
 */

import { prisma } from '../src/db/client';
import { cveDatabase } from '../src/shared/services/cve-database.service';

async function main() {
  console.log('=== Clearing False Positive Vulnerabilities ===\n');

  // Step 1: Clear all existing asset vulnerabilities
  console.log('Step 1: Clearing all existing AssetVulnerability records...');
  const cleared = await cveDatabase.clearAllAssetVulnerabilities();
  console.log(`✓ Cleared ${cleared.deleted} vulnerability records\n`);

  // Step 2: Get all assets
  console.log('Step 2: Finding all assets with software inventory...');
  const assets = await prisma.asset.findMany({
    where: {
      // Only scan assets that have software inventory
      software: { some: {} },
    },
    select: {
      id: true,
      name: true,
      os: true,
    },
  });
  console.log(`✓ Found ${assets.length} assets to scan\n`);

  if (assets.length === 0) {
    console.log('No assets with software inventory found. Exiting.');
    return;
  }

  // Step 3: Re-scan each asset with new logic
  console.log('Step 3: Re-scanning assets with conservative vulnerability logic...');
  console.log('(This only flags CVEs with concrete version evidence)\n');

  let totalVulns = 0;
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    console.log(`[${i + 1}/${assets.length}] Scanning: ${asset.name} (${asset.os})...`);

    try {
      const vulns = await cveDatabase.checkAssetVulnerabilities(asset.id);
      totalVulns += vulns.length;
      console.log(`  → Found ${vulns.length} vulnerabilities\n`);
    } catch (error) {
      console.error(`  ✗ Error scanning asset: ${error}\n`);
    }

    // Small delay to avoid overwhelming the database
    if (i < assets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('=== Re-scan Complete ===');
  console.log(`Total assets scanned: ${assets.length}`);
  console.log(`Total vulnerabilities found: ${totalVulns}`);
  console.log(`Average per asset: ${(totalVulns / assets.length).toFixed(1)}`);
  console.log('\nNote: The new logic is CONSERVATIVE - it only flags vulnerabilities');
  console.log('when there is concrete version evidence, preventing false positives');
  console.log('on personal PCs that receive OS security updates.\n');
}

main()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
