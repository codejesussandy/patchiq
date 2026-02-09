#!/usr/bin/env ts-node
/**
 * Quick Patch Correlation Test
 *
 * This script demonstrates the complete patch correlation pipeline:
 * 1. CPE Resolution
 * 2. Vulnerability Detection
 * 3. Patch Recommendations
 *
 * Usage: npx ts-node backend/scripts/test-correlation-quick.ts
 */

import { cpeMappingService } from '../src/shared/services/cpe-mapping.service';
import { cveDatabase } from '../src/shared/services/cve-database.service';
import { assetPatchRecommendationService } from '../src/modules/patches/asset-patch-recommendation.service';
import { prisma } from '../src/db/client';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.blue);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.clear();
  log('🔍 PatchIQ Correlation Logic Test', colors.bright + colors.cyan);
  log('Testing the 5-stage patch correlation pipeline\n', colors.cyan);

  try {
    // =================================================================
    // STAGE 1: Test CPE Resolution
    // =================================================================
    section('STAGE 1: CPE RESOLUTION');

    const testSoftware = [
      { name: 'Google Chrome', vendor: 'Google', version: '120.0.6099.71' },
      { name: 'libssl3', vendor: null, version: '3.0.0' },
      { name: 'python3-pip', vendor: null, version: '21.0' },
      { name: 'OpenSSL', vendor: 'OpenSSL Project', version: '3.0.0' },
    ];

    log('Testing CPE resolution for common software...', colors.yellow);

    for (const software of testSoftware) {
      const resolution = await cpeMappingService.resolveCpe({
        name: software.name,
        vendor: software.vendor,
        platform: 'linux',
      });

      if (resolution) {
        log(`✓ ${software.name}`, colors.green);
        log(`  → ${resolution.cpeVendor}:${resolution.cpeProduct}`);
        log(`  → Confidence: ${(resolution.confidence * 100).toFixed(0)}%`);
        log(`  → Source: ${resolution.source}`);
      } else {
        log(`✗ ${software.name} - No CPE mapping found`, colors.red);
      }
    }

    // Test normalization
    section('STAGE 1B: NAME NORMALIZATION');
    const normalizationTests = [
      'libssl3',
      'libcurl4',
      'python3-requests',
      'postgresql15',
      'openssl-dev',
    ];

    log('Testing name normalization rules...', colors.yellow);
    for (const name of normalizationTests) {
      const normalized = cpeMappingService.normalizeSoftwareName(name);
      log(`${name} → ${normalized}`, normalized !== name ? colors.green : colors.reset);
    }

    // =================================================================
    // STAGE 2: Test Vulnerability Detection
    // =================================================================
    section('STAGE 2: VULNERABILITY DETECTION');

    // Check if we have any assets
    const assetCount = await prisma.asset.count();
    log(`Found ${assetCount} assets in database`, colors.yellow);

    if (assetCount === 0) {
      log('\n⚠️  No assets found. Skipping vulnerability detection.', colors.yellow);
      log('To test this stage:', colors.yellow);
      log('  1. Register an agent via API', colors.yellow);
      log('  2. Send software inventory', colors.yellow);
      log('  3. Run this script again', colors.yellow);
    } else {
      // Get first asset
      const asset = await prisma.asset.findFirst({
        include: {
          software: true,
        },
      });

      if (!asset) {
        throw new Error('Failed to retrieve asset');
      }

      log(`\nTesting asset: ${asset.name} (${asset.id})`, colors.cyan);
      log(`Software packages: ${asset.software?.length || 0}`, colors.cyan);

      if ((asset.software?.length || 0) === 0) {
        log('\n⚠️  Asset has no software inventory', colors.yellow);
        log('Send software inventory via agent heartbeat first', colors.yellow);
      } else {
        log('\nRunning vulnerability scan...', colors.yellow);
        const startTime = Date.now();

        const vulnerabilities = await cveDatabase.checkAssetVulnerabilities(asset.id);

        const scanTime = Date.now() - startTime;
        log(`\n✓ Scan completed in ${scanTime}ms`, colors.green);
        log(`✓ Found ${vulnerabilities.length} vulnerabilities\n`, colors.green);

        // Display top 5 vulnerabilities
        if (vulnerabilities.length > 0) {
          log('Top vulnerabilities:', colors.bright);
          for (const vuln of vulnerabilities.slice(0, 5)) {
            const v = vuln.vulnerability as any;
            const severity = v.severity || 'UNKNOWN';
            const severityColor =
              severity === 'CRITICAL'
                ? colors.red
                : severity === 'HIGH'
                ? colors.yellow
                : colors.reset;

            log(`\n  ${v.cveId}`, colors.bright);
            log(`  ${v.title?.slice(0, 60) || 'No title'}...`);
            log(`  Severity: ${severity}`, severityColor);
            log(`  CVSS: ${v.cvss3BaseScore || 'N/A'} | EPSS: ${v.epss || 'N/A'}%`);
            log(`  Software: ${vuln.software.name} ${vuln.software.version || ''}`);
          }

          if (vulnerabilities.length > 5) {
            log(`\n  ... and ${vulnerabilities.length - 5} more`, colors.reset);
          }
        }
      }
    }

    // =================================================================
    // STAGE 3: Check Asset Vulnerabilities in DB
    // =================================================================
    section('STAGE 3: ASSET VULNERABILITY RECORDS');

    const assetVulnCount = await prisma.assetVulnerability.count();
    log(`Total AssetVulnerability records: ${assetVulnCount}`, colors.cyan);

    if (assetVulnCount > 0) {
      const byStatus = await prisma.assetVulnerability.groupBy({
        by: ['status'],
        _count: true,
      });

      log('\nBy Status:', colors.yellow);
      for (const group of byStatus) {
        log(`  ${group.status}: ${group._count}`, colors.green);
      }

      // Recent detections
      const recent = await prisma.assetVulnerability.findMany({
        take: 3,
        orderBy: { detectedAt: 'desc' },
        include: {
          vulnerability: true,
          asset: true,
        },
      });

      log('\nRecent Detections:', colors.yellow);
      for (const av of recent) {
        log(`  ${av.vulnerability.cveId} on ${av.asset.name}`, colors.green);
        log(`  Detected: ${av.detectedAt.toISOString()}`);
        log(`  Status: ${av.status}`);
      }
    }

    // =================================================================
    // STAGE 4: Patch Recommendations
    // =================================================================
    section('STAGE 4: PATCH RECOMMENDATIONS');

    const recCount = await prisma.assetPatchRecommendation.count();
    log(`Total recommendations: ${recCount}`, colors.cyan);

    if (recCount > 0) {
      const byStatus = await prisma.assetPatchRecommendation.groupBy({
        by: ['status'],
        _count: true,
      });

      log('\nBy Status:', colors.yellow);
      for (const group of byStatus) {
        log(`  ${group.status}: ${group._count}`, colors.green);
      }

      const bySeverity = await prisma.assetPatchRecommendation.groupBy({
        by: ['severity'],
        _count: true,
      });

      log('\nBy Severity:', colors.yellow);
      for (const group of bySeverity) {
        const severityColor =
          group.severity === 'CRITICAL'
            ? colors.red
            : group.severity === 'HIGH'
            ? colors.yellow
            : colors.reset;
        log(`  ${group.severity}: ${group._count}`, severityColor);
      }

      // Top recommendations
      const topRecs = await prisma.assetPatchRecommendation.findMany({
        take: 3,
        orderBy: { riskScore: 'desc' },
        include: {
          asset: true,
          vulnerability: true,
          patch: true,
        },
      });

      log('\nTop Recommendations (by risk score):', colors.yellow);
      for (const rec of topRecs) {
        log(`\n  Risk Score: ${rec.riskScore}/100`, colors.red);
        log(`  Asset: ${rec.asset.name}`);
        log(`  CVE: ${rec.vulnerability.cveId}`);
        log(`  Patch: ${rec.patch?.patchId || 'N/A'}`);
        log(`  Status: ${rec.status}`);
      }
    } else {
      log('\n⚠️  No recommendations found', colors.yellow);
      log('Recommendations are created when:', colors.yellow);
      log('  1. Vulnerabilities are detected on assets', colors.yellow);
      log('  2. Approved patches exist that fix those CVEs', colors.yellow);
    }

    // =================================================================
    // STAGE 5: Check Unmatched Software
    // =================================================================
    section('STAGE 5: UNMATCHED SOFTWARE TRACKING');

    const unmatchedCount = await prisma.unmatchedSoftware.count();
    log(`Unmatched software entries: ${unmatchedCount}`, colors.cyan);

    if (unmatchedCount > 0) {
      const topUnmatched = await prisma.unmatchedSoftware.findMany({
        take: 5,
        orderBy: { occurrences: 'desc' },
      });

      log('\nTop unmatched software (by occurrence):', colors.yellow);
      for (const sw of topUnmatched) {
        log(`  ${sw.name} (${sw.vendor || 'no vendor'})`, colors.red);
        log(`  Occurrences: ${sw.occurrences}`);
        log(`  Last seen: ${sw.lastSeen.toISOString()}`);
      }

      log('\n💡 Tip: Create CPE mappings for these to improve accuracy', colors.cyan);
    }

    // =================================================================
    // SUMMARY
    // =================================================================
    section('SUMMARY');

    const cveCount = await prisma.vulnerability.count();
    const patchCount = await prisma.patch.count();

    log('Database Statistics:', colors.bright);
    log(`  Assets: ${assetCount}`, colors.green);
    log(`  CVEs: ${cveCount}`, colors.green);
    log(`  Patches: ${patchCount}`, colors.green);
    log(`  Asset Vulnerabilities: ${assetVulnCount}`, colors.green);
    log(`  Patch Recommendations: ${recCount}`, colors.green);
    log(`  Unmatched Software: ${unmatchedCount}`, colors.yellow);

    log('\n✓ Test completed successfully!', colors.bright + colors.green);

    // Next steps
    log('\n📚 Next Steps:', colors.cyan);
    log('  1. Review TESTING_PATCH_CORRELATION.md for detailed testing guide');
    log('  2. Use API endpoints to trigger scans and view results');
    log('  3. Test full deployment lifecycle with agent');
    log('  4. Check frontend UI for visualizations\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
