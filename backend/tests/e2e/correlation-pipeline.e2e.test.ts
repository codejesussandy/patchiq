/**
 * E2E Integration Tests for Patch-Vulnerability Correlation Pipeline
 *
 * Tests the full correlation pipeline: CVE data -> vulnerability scanning -> patch recommendations
 * All tests run against a real database (no mocks) and are self-contained:
 * seed -> execute -> assert -> cleanup
 */

import { prisma } from '@db/client';
import { cveDatabase } from '@shared/services/cve-database.service';
import { assetPatchRecommendationService } from '@modules/patches/asset-patch-recommendation.service';
import { isVersionVulnerable } from '@shared/utils/version-compare';

// Unique prefix for this test run to avoid collisions
const RUN_ID = `E2E-${Date.now()}`;

// Track all created IDs for cleanup
let testOrgId: string;
let testBranchId: string;

// Collector arrays for cleanup
const createdAssetIds: string[] = [];
const createdVulnIds: string[] = [];
const createdPatchIds: string[] = [];

/** Small delay helper to let async IIFE complete in checkAssetVulnerabilities */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to create an asset with software installed
 */
async function createAssetWithSoftware(
  name: string,
  softwareList: Array<{
    name: string;
    version: string;
    vendor?: string;
    cpeVendor?: string;
    cpeProduct?: string;
  }>
): Promise<{ assetId: string; softwareIds: string[] }> {
  const asset = await prisma.asset.create({
    data: {
      name: `${RUN_ID}-${name}`,
      type: 'Endpoint',
      status: 'In Use',
      os: 'Windows',
      organizationId: testOrgId,
    },
  });
  createdAssetIds.push(asset.id);

  const softwareIds: string[] = [];
  for (const sw of softwareList) {
    const record = await prisma.assetSoftware.create({
      data: {
        assetId: asset.id,
        name: sw.name,
        version: sw.version,
        vendor: sw.vendor || null,
        cpeVendor: sw.cpeVendor || null,
        cpeProduct: sw.cpeProduct || null,
        matchConfidence: sw.cpeVendor ? 1.0 : null,
      },
    });
    softwareIds.push(record.id);
  }

  return { assetId: asset.id, softwareIds };
}

/**
 * Helper to create a vulnerability with VulnerabilitySoftware records
 */
async function createVulnerability(params: {
  cveId: string;
  severity: string;
  cvss3BaseScore?: number;
  epss?: number;
  exploitable?: boolean;
  patchAvailable?: boolean;
  affectedSoftware: Array<{
    cpeVendor: string;
    cpeProduct: string;
    versionEnd?: string;
    versionEndType?: string;
    versionStart?: string;
    versionStartType?: string;
  }>;
}): Promise<string> {
  const vuln = await prisma.vulnerability.create({
    data: {
      cveId: params.cveId,
      title: `${params.cveId}: Test vulnerability`,
      description: `Test vulnerability for ${params.cveId}`,
      severity: params.severity,
      cvss3BaseScore: params.cvss3BaseScore ?? null,
      epss: params.epss ?? null,
      exploitable: params.exploitable ?? false,
      patchAvailable: params.patchAvailable ?? false,
      publishedDate: new Date(),
    },
  });
  createdVulnIds.push(vuln.id);

  for (const sw of params.affectedSoftware) {
    await prisma.vulnerabilitySoftware.create({
      data: {
        vulnerabilityId: vuln.id,
        name: sw.cpeProduct,
        vendor: sw.cpeVendor,
        cpeUri: `cpe:2.3:a:${sw.cpeVendor}:${sw.cpeProduct}:*:*:*:*:*:*:*:*`,
        cpeVendor: sw.cpeVendor,
        cpeProduct: sw.cpeProduct,
        versionEnd: sw.versionEnd || null,
        versionEndType: sw.versionEndType || null,
        versionStart: sw.versionStart || null,
        versionStartType: sw.versionStartType || null,
      },
    });
  }

  return vuln.id;
}

/**
 * Helper to create an approved patch
 */
async function createPatch(params: {
  patchId: string;
  cveNumbers: string[];
  software?: string;
  supersedes?: string[];
  supersededBy?: string[];
}): Promise<string> {
  const patch = await prisma.patch.create({
    data: {
      patchId: params.patchId,
      title: `Test Patch ${params.patchId}`,
      severity: 'HIGH',
      approvalStatus: 'Approved',
      cveNumbers: params.cveNumbers,
      software: params.software || 'Test Software',
      supersedes: params.supersedes || [],
      supersededBy: params.supersededBy || [],
      operationalStatusSince: new Date(),
    },
  });
  createdPatchIds.push(patch.id);
  return patch.id;
}

describe('E2E: Correlation Pipeline', () => {
  beforeAll(async () => {
    // Create test organization and branch
    const org = await prisma.organization.create({
      data: { name: `${RUN_ID}-TestOrg` },
    });
    testOrgId = org.id;

    const branch = await prisma.branch.create({
      data: {
        name: `${RUN_ID}-TestBranch`,
        organizationId: testOrgId,
      },
    });
    testBranchId = branch.id;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (createdAssetIds.length > 0) {
      await prisma.assetPatchRecommendation.deleteMany({
        where: { assetId: { in: createdAssetIds } },
      });
      await prisma.assetVulnerability.deleteMany({
        where: { assetId: { in: createdAssetIds } },
      });
    }

    if (createdPatchIds.length > 0) {
      await prisma.patchVulnerability.deleteMany({
        where: { patchId: { in: createdPatchIds } },
      });
    }

    if (createdVulnIds.length > 0) {
      await prisma.vulnerabilitySoftware.deleteMany({
        where: { vulnerabilityId: { in: createdVulnIds } },
      });
      await prisma.vulnerabilityReference.deleteMany({
        where: { vulnerabilityId: { in: createdVulnIds } },
      });
    }

    if (createdAssetIds.length > 0) {
      await prisma.assetSoftware.deleteMany({
        where: { assetId: { in: createdAssetIds } },
      });
      await prisma.asset.deleteMany({
        where: { id: { in: createdAssetIds } },
      });
    }

    if (createdPatchIds.length > 0) {
      await prisma.patch.deleteMany({
        where: { id: { in: createdPatchIds } },
      });
    }

    if (createdVulnIds.length > 0) {
      await prisma.vulnerability.deleteMany({
        where: { id: { in: createdVulnIds } },
      });
    }

    // UnmatchedSoftware cleanup
    await prisma.unmatchedSoftware.deleteMany({
      where: { name: { contains: 'XyzFooBar' } },
    });

    await prisma.branch.deleteMany({ where: { id: testBranchId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-1: Full pipeline - vulnerable asset
  // Uses unique CPE vendor/product to avoid seed data collisions
  // ─────────────────────────────────────────────────────────────────
  test('E2E-1: Full pipeline - vulnerable asset (Firefox 115.0)', async () => {
    const cpeProd = `firefox-e2e1-${RUN_ID}`;
    const cpeVend = `mozilla-e2e1-${RUN_ID}`;

    // 1. Create asset with Firefox 115.0
    const { assetId } = await createAssetWithSoftware('E2E1-Asset', [
      { name: 'Firefox', version: '115.0', vendor: 'Mozilla', cpeVendor: cpeVend, cpeProduct: cpeProd },
    ]);

    // 2. Create vulnerability affecting Firefox < 116.0
    const cveId = `CVE-TEST-E2E1-${RUN_ID}`;
    const vulnId = await createVulnerability({
      cveId,
      severity: 'HIGH',
      cvss3BaseScore: 8.8,
      affectedSoftware: [{
        cpeVendor: cpeVend,
        cpeProduct: cpeProd,
        versionEnd: '116.0',
        versionEndType: 'excluding',
      }],
    });

    // 3. Run vulnerability scan
    await cveDatabase.checkAssetVulnerabilities(assetId);

    // 4. Create approved patch fixing this CVE
    const patchInternalId = await createPatch({
      patchId: `PATCH-FF116-${RUN_ID}`,
      cveNumbers: [cveId],
      software: 'Firefox',
    });

    // 5. Create recommendations
    const sw = await prisma.assetSoftware.findFirst({ where: { assetId } });
    await assetPatchRecommendationService.createRecommendationsForVulnerability(
      assetId, vulnId, { name: sw!.name, version: sw!.version }
    );

    // 6. Assert: AssetVulnerability exists with status 'Open'
    const assetVuln = await prisma.assetVulnerability.findUnique({
      where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
    });
    expect(assetVuln).not.toBeNull();
    expect(assetVuln!.status).toBe('Open');

    // 7. Assert: AssetPatchRecommendation exists
    const rec = await prisma.assetPatchRecommendation.findFirst({
      where: { assetId, vulnerabilityId: vulnId, patchId: patchInternalId },
    });
    expect(rec).not.toBeNull();
    expect(rec!.status).toBe('RECOMMENDED');
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-2: Full pipeline - safe asset (not in vulnerable range)
  // ─────────────────────────────────────────────────────────────────
  test('E2E-2: Full pipeline - safe asset (Firefox 120.0 above range)', async () => {
    const cpeProd = `firefox-e2e2-${RUN_ID}`;
    const cpeVend = `mozilla-e2e2-${RUN_ID}`;

    // 1. Create asset with Firefox 120.0 (above vulnerability range)
    const { assetId } = await createAssetWithSoftware('E2E2-Asset', [
      { name: 'Firefox', version: '120.0', vendor: 'Mozilla', cpeVendor: cpeVend, cpeProduct: cpeProd },
    ]);

    // 2. Create vulnerability affecting Firefox < 116.0
    const cveId = `CVE-TEST-E2E2-${RUN_ID}`;
    const vulnId = await createVulnerability({
      cveId,
      severity: 'HIGH',
      affectedSoftware: [{
        cpeVendor: cpeVend,
        cpeProduct: cpeProd,
        versionEnd: '116.0',
        versionEndType: 'excluding',
      }],
    });

    // 3. Run vulnerability scan
    await cveDatabase.checkAssetVulnerabilities(assetId);

    // 4. Assert: NO AssetVulnerability record for this test's vulnerability
    const assetVuln = await prisma.assetVulnerability.findUnique({
      where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
    });
    expect(assetVuln).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-3: Patch supersedence
  // Create patches BEFORE scan so the async IIFE in scan creates recs.
  // ─────────────────────────────────────────────────────────────────
  test('E2E-3: Patch supersedence - only non-superseded patch recommended', async () => {
    const cpeProd = `7zip-e2e3-${RUN_ID}`;
    const cpeVend = `7zip-e2e3-${RUN_ID}`;

    // 1. Create asset with 7-Zip 24.05
    const { assetId } = await createAssetWithSoftware('E2E3-Asset', [
      { name: '7-Zip', version: '24.05', vendor: '7-zip', cpeVendor: cpeVend, cpeProduct: cpeProd },
    ]);

    // 2. Create vulnerability for 7-Zip <= 24.09
    const cveId = `CVE-TEST-E2E3-${RUN_ID}`;
    const vulnId = await createVulnerability({
      cveId,
      severity: 'CRITICAL',
      affectedSoftware: [{
        cpeVendor: cpeVend,
        cpeProduct: cpeProd,
        versionEnd: '24.09',
        versionEndType: 'including',
      }],
    });

    // 3. Create Patch A (superseded by Patch B) BEFORE scan
    const patchAId = await createPatch({
      patchId: `PATCH-7ZIP-2408-${RUN_ID}`,
      cveNumbers: [cveId],
      software: '7-Zip',
      supersededBy: [`PATCH-7ZIP-2500-${RUN_ID}`],
    });

    // 4. Create Patch B (supersedes A) BEFORE scan
    const patchBId = await createPatch({
      patchId: `PATCH-7ZIP-2500-${RUN_ID}`,
      cveNumbers: [cveId],
      software: '7-Zip',
      supersedes: [`PATCH-7ZIP-2408-${RUN_ID}`],
    });

    // 5. Run scan - the async IIFE inside will create recommendations
    await cveDatabase.checkAssetVulnerabilities(assetId);

    // Wait for the async IIFE recommendation creation to complete
    await delay(200);

    // 6. Assert: Recommendation exists for Patch B only (non-superseded)
    const recB = await prisma.assetPatchRecommendation.findFirst({
      where: { assetId, vulnerabilityId: vulnId, patchId: patchBId },
    });
    expect(recB).not.toBeNull();

    // Assert: No recommendation for superseded Patch A
    const recA = await prisma.assetPatchRecommendation.findFirst({
      where: { assetId, vulnerabilityId: vulnId, patchId: patchAId },
    });
    expect(recA).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-4: Bidirectional - new patch triggers recommendations
  // ─────────────────────────────────────────────────────────────────
  test('E2E-4: Bidirectional - new patch triggers recommendations', async () => {
    const cpeProd = `openssl-e2e4-${RUN_ID}`;
    const cpeVend = `openssl-e2e4-${RUN_ID}`;

    // 1. Create asset + vulnerability + run scan (no patch yet)
    const { assetId } = await createAssetWithSoftware('E2E4-Asset', [
      { name: 'OpenSSL', version: '3.0.8', vendor: 'openssl', cpeVendor: cpeVend, cpeProduct: cpeProd },
    ]);

    const cveId = `CVE-TEST-E2E4-${RUN_ID}`;
    const vulnId = await createVulnerability({
      cveId,
      severity: 'CRITICAL',
      cvss3BaseScore: 9.8,
      affectedSoftware: [{
        cpeVendor: cpeVend,
        cpeProduct: cpeProd,
        versionEnd: '3.0.19',
        versionEndType: 'excluding',
      }],
    });

    // Run scan to create AssetVulnerability (no patch exists yet, so no async rec creation)
    await cveDatabase.checkAssetVulnerabilities(assetId);

    const assetVuln = await prisma.assetVulnerability.findUnique({
      where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
    });
    expect(assetVuln).not.toBeNull();
    expect(assetVuln!.status).toBe('Open');

    // 2. Create a new approved patch fixing that CVE
    const patchInternalId = await createPatch({
      patchId: `PATCH-OSSL-${RUN_ID}`,
      cveNumbers: [cveId],
      software: 'OpenSSL',
    });

    // 3. Call createRecommendationsForVulnerability explicitly
    const sw = await prisma.assetSoftware.findFirst({ where: { assetId } });
    const recs = await assetPatchRecommendationService.createRecommendationsForVulnerability(
      assetId, vulnId, { name: sw!.name, version: sw!.version }
    );

    // 4. Assert: Recommendation auto-created
    expect(recs.length).toBeGreaterThanOrEqual(1);
    const rec = await prisma.assetPatchRecommendation.findFirst({
      where: { assetId, vulnerabilityId: vulnId, patchId: patchInternalId },
    });
    expect(rec).not.toBeNull();
    expect(rec!.status).toBe('RECOMMENDED');
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-5: Bidirectional - new CVE triggers patchAvailable
  // ─────────────────────────────────────────────────────────────────
  test('E2E-5: Bidirectional - new CVE triggers patchAvailable', async () => {
    const cveId = `CVE-TEST-E2E5-${RUN_ID}`;

    // 1. Create approved patch with the CVE
    await createPatch({
      patchId: `PATCH-BIDIR5-${RUN_ID}`,
      cveNumbers: [cveId],
      software: 'TestApp',
    });

    // 2. Create vulnerability with patchAvailable=false
    const vulnId = await createVulnerability({
      cveId,
      severity: 'HIGH',
      patchAvailable: false,
      affectedSoftware: [{
        cpeVendor: `testvendor-e2e5-${RUN_ID}`,
        cpeProduct: `testapp-e2e5-${RUN_ID}`,
        versionEnd: '2.0.0',
        versionEndType: 'excluding',
      }],
    });

    // 3. Correlate new CVEs with existing patches
    await cveDatabase.correlateNewCVEsWithPatches();

    // 4. Assert: Vulnerability now has patchAvailable=true
    const vuln = await prisma.vulnerability.findUnique({ where: { id: vulnId } });
    expect(vuln).not.toBeNull();
    expect(vuln!.patchAvailable).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-6: Version upgrade resolves vulnerability
  // ─────────────────────────────────────────────────────────────────
  test('E2E-6: Version upgrade resolves vulnerability', async () => {
    const cpeProd = `openssl-e2e6-${RUN_ID}`;
    const cpeVend = `openssl-e2e6-${RUN_ID}`;

    // 1. Create asset with OpenSSL 3.0.8
    const { assetId, softwareIds } = await createAssetWithSoftware('E2E6-Asset', [
      { name: 'OpenSSL', version: '3.0.8', vendor: 'openssl', cpeVendor: cpeVend, cpeProduct: cpeProd },
    ]);

    const cveId = `CVE-TEST-E2E6-${RUN_ID}`;
    const vulnId = await createVulnerability({
      cveId,
      severity: 'HIGH',
      affectedSoftware: [{
        cpeVendor: cpeVend,
        cpeProduct: cpeProd,
        versionEnd: '3.0.19',
        versionEndType: 'excluding',
      }],
    });

    // Run scan -> AssetVulnerability created with status 'Open'
    await cveDatabase.checkAssetVulnerabilities(assetId);

    let assetVuln = await prisma.assetVulnerability.findUnique({
      where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
    });
    expect(assetVuln).not.toBeNull();
    expect(assetVuln!.status).toBe('Open');

    // 2. Update AssetSoftware version to patched version 3.0.19
    await prisma.assetSoftware.update({
      where: { id: softwareIds[0] },
      data: { version: '3.0.19' },
    });

    // 3. Re-run scan
    await cveDatabase.checkAssetVulnerabilities(assetId);

    // 4. Assert: Previous AssetVulnerability now has status 'Resolved'
    assetVuln = await prisma.assetVulnerability.findUnique({
      where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
    });
    expect(assetVuln).not.toBeNull();
    expect(assetVuln!.status).toBe('Resolved');
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-7: Multiple vulns, multiple patches
  // Uses unique CPE per app to avoid seed data collisions
  // ─────────────────────────────────────────────────────────────────
  test('E2E-7: Multiple vulns, multiple patches (3 apps)', async () => {
    const cpeFF = { v: `mozilla-e2e7-${RUN_ID}`, p: `firefox-e2e7-${RUN_ID}` };
    const cpeSSL = { v: `openssl-e2e7-${RUN_ID}`, p: `openssl-e2e7-${RUN_ID}` };
    const cpeNode = { v: `nodejs-e2e7-${RUN_ID}`, p: `nodejs-e2e7-${RUN_ID}` };

    // 1. Create asset with 3 vulnerable apps
    const { assetId } = await createAssetWithSoftware('E2E7-Asset', [
      { name: 'Firefox', version: '115.0', vendor: 'Mozilla', cpeVendor: cpeFF.v, cpeProduct: cpeFF.p },
      { name: 'OpenSSL', version: '3.0.8', vendor: 'openssl', cpeVendor: cpeSSL.v, cpeProduct: cpeSSL.p },
      { name: 'Node.js', version: '16.20.0', vendor: 'nodejs', cpeVendor: cpeNode.v, cpeProduct: cpeNode.p },
    ]);

    // 2. Create 3 vulnerabilities with unique CPE
    const cve1 = `CVE-TEST-E2E7-FF-${RUN_ID}`;
    const cve2 = `CVE-TEST-E2E7-SSL-${RUN_ID}`;
    const cve3 = `CVE-TEST-E2E7-NODE-${RUN_ID}`;

    const vulnId1 = await createVulnerability({
      cveId: cve1, severity: 'HIGH', cvss3BaseScore: 8.8,
      affectedSoftware: [{ cpeVendor: cpeFF.v, cpeProduct: cpeFF.p, versionEnd: '116.0', versionEndType: 'excluding' }],
    });

    const vulnId2 = await createVulnerability({
      cveId: cve2, severity: 'CRITICAL', cvss3BaseScore: 9.8,
      affectedSoftware: [{ cpeVendor: cpeSSL.v, cpeProduct: cpeSSL.p, versionEnd: '3.0.19', versionEndType: 'excluding' }],
    });

    const vulnId3 = await createVulnerability({
      cveId: cve3, severity: 'HIGH', cvss3BaseScore: 7.5,
      affectedSoftware: [{ cpeVendor: cpeNode.v, cpeProduct: cpeNode.p, versionEnd: '18.0.0', versionEndType: 'excluding' }],
    });

    // 3. Create 3 approved patches
    await createPatch({ patchId: `PATCH-E7-FF-${RUN_ID}`, cveNumbers: [cve1], software: 'Firefox' });
    await createPatch({ patchId: `PATCH-E7-SSL-${RUN_ID}`, cveNumbers: [cve2], software: 'OpenSSL' });
    await createPatch({ patchId: `PATCH-E7-NODE-${RUN_ID}`, cveNumbers: [cve3], software: 'Node.js' });

    // 4. Run scan
    await cveDatabase.checkAssetVulnerabilities(assetId);

    // Wait for async IIFE recommendation creation
    await delay(300);

    // 5. Assert: Exactly 3 AssetVulnerability records (only our test vulns)
    const assetVulns = await prisma.assetVulnerability.findMany({
      where: { assetId, status: 'Open' },
    });
    expect(assetVulns.length).toBe(3);

    // 6. Assert: Exactly 3 AssetPatchRecommendation records
    const recs = await prisma.assetPatchRecommendation.findMany({
      where: { assetId },
    });
    expect(recs.length).toBe(3);
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-8: EPSS + CISA KEV enrichment
  // ─────────────────────────────────────────────────────────────────
  test('E2E-8: EPSS + CISA KEV enrichment (risk scoring)', async () => {
    const cpeProd = `testapp8-e2e8-${RUN_ID}`;
    const cpeVend = `testvendor8-e2e8-${RUN_ID}`;

    // 1. Create vulnerability with exploitable=true, high EPSS, high CVSS
    const cveId = `CVE-TEST-E2E8-${RUN_ID}`;
    const vulnId = await createVulnerability({
      cveId,
      severity: 'CRITICAL',
      cvss3BaseScore: 9.8,
      epss: 95.5,
      exploitable: true,
      affectedSoftware: [{
        cpeVendor: cpeVend,
        cpeProduct: cpeProd,
        versionEnd: '2.0.0',
        versionEndType: 'excluding',
      }],
    });

    // 2. Create asset with software in vulnerable range
    const { assetId } = await createAssetWithSoftware('E2E8-Asset', [
      { name: 'TestApp8', version: '1.5.0', vendor: 'testvendor8', cpeVendor: cpeVend, cpeProduct: cpeProd },
    ]);

    // 3. Run scan
    await cveDatabase.checkAssetVulnerabilities(assetId);

    // 4. Create patch and recommendation
    await createPatch({
      patchId: `PATCH-E8-${RUN_ID}`,
      cveNumbers: [cveId],
      software: 'TestApp8',
    });

    const sw = await prisma.assetSoftware.findFirst({ where: { assetId } });
    await assetPatchRecommendationService.createRecommendationsForVulnerability(
      assetId, vulnId, { name: sw!.name, version: sw!.version }
    );

    // 5. Assert: Recommendation has epssScore > 0
    const rec = await prisma.assetPatchRecommendation.findFirst({
      where: { assetId, vulnerabilityId: vulnId },
    });
    expect(rec).not.toBeNull();
    expect(rec!.epssScore).toBeGreaterThan(0);

    // Assert: Vulnerability has exploitable=true
    const vuln = await prisma.vulnerability.findUnique({ where: { id: vulnId } });
    expect(vuln!.exploitable).toBe(true);

    // Assert: riskScore > 0 (calculated from CVSS + EPSS + severity + exploitable bonus)
    expect(rec!.riskScore).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-9: Unmatched software tracking
  // ─────────────────────────────────────────────────────────────────
  test('E2E-9: Unmatched software tracking', async () => {
    const unknownName = `XyzFooBar-${RUN_ID}`;

    // 1. Create asset with unknown software (no CPE mapping exists)
    const { assetId } = await createAssetWithSoftware('E2E9-Asset', [
      { name: unknownName, version: '1.0', vendor: 'UnknownVendor' },
    ]);

    // 2. Run vulnerability scan
    await cveDatabase.checkAssetVulnerabilities(assetId);

    // 3. Assert: UnmatchedSoftware record created
    const unmatched = await prisma.unmatchedSoftware.findFirst({
      where: { name: unknownName },
    });
    expect(unmatched).not.toBeNull();
    expect(unmatched!.occurrences).toBeGreaterThanOrEqual(1);

    // 4. Assert: No false AssetVulnerability record
    const assetVulns = await prisma.assetVulnerability.findMany({
      where: { assetId },
    });
    expect(assetVulns.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────
  // E2E-10: Idempotent scan
  // Uses unique CPE to avoid seed data collisions
  // ─────────────────────────────────────────────────────────────────
  test('E2E-10: Idempotent scan (no duplicates on re-run)', async () => {
    const cpeProd = `firefox-e2e10-${RUN_ID}`;
    const cpeVend = `mozilla-e2e10-${RUN_ID}`;

    // 1. Create asset with a vulnerable app (unique CPE)
    const { assetId } = await createAssetWithSoftware('E2E10-Asset', [
      { name: 'Firefox', version: '115.0', vendor: 'Mozilla', cpeVendor: cpeVend, cpeProduct: cpeProd },
    ]);

    const cveId = `CVE-TEST-E2E10-${RUN_ID}`;
    const vulnId = await createVulnerability({
      cveId,
      severity: 'HIGH',
      cvss3BaseScore: 8.0,
      affectedSoftware: [{
        cpeVendor: cpeVend,
        cpeProduct: cpeProd,
        versionEnd: '116.0',
        versionEndType: 'excluding',
      }],
    });

    // Create patch BEFORE scan so async IIFE can create recommendations
    await createPatch({
      patchId: `PATCH-E10-${RUN_ID}`,
      cveNumbers: [cveId],
      software: 'Firefox',
    });

    // 2. Run full scan (first time) - async IIFE will create recs
    await cveDatabase.checkAssetVulnerabilities(assetId);
    await delay(200);

    // 3. Record counts
    const vulnCount1 = await prisma.assetVulnerability.count({ where: { assetId } });
    const recCount1 = await prisma.assetPatchRecommendation.count({ where: { assetId } });

    expect(vulnCount1).toBe(1);
    expect(recCount1).toBe(1);

    // 4. Run scan again (second time)
    await cveDatabase.checkAssetVulnerabilities(assetId);
    await delay(200);

    // 5. Assert: Same counts (no duplicates)
    const vulnCount2 = await prisma.assetVulnerability.count({ where: { assetId } });
    const recCount2 = await prisma.assetPatchRecommendation.count({ where: { assetId } });

    expect(vulnCount2).toBe(vulnCount1);
    expect(recCount2).toBe(recCount1);
  });
});
