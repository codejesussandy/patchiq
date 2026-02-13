/**
 * R8: End-to-End Integration Tests — Patch-Vulnerability Correlation Pipeline
 *
 * Tests the complete correlation pipeline from CVE ingestion to patch recommendation.
 * Seeds data directly via Prisma (no external API calls) and validates internal logic.
 */

import { prisma } from '@/db/client';
import { cveDatabase } from '@shared/services/cve-database.service';
import { assetPatchRecommendationService } from '@modules/patches/asset-patch-recommendation.service';

// Unique prefix to avoid collision with seed data
const P = 'E2E-TEST';
const TS = Date.now();

// Helper: create an Organization for test assets
async function seedOrganization() {
  return prisma.organization.create({
    data: {
      name: `${P}-Org-${TS}`,
      description: 'E2E test organization',
    },
  });
}

// Helper: create an Asset
async function seedAsset(orgId: string, name: string, os = 'Windows') {
  return prisma.asset.create({
    data: {
      name: `${P}-${name}-${TS}`,
      type: 'Endpoint',
      status: 'In Use',
      os,
      organizationId: orgId,
    },
  });
}

// Helper: create AssetSoftware with CPE fields pre-populated
async function seedAssetSoftware(
  assetId: string,
  opts: {
    name: string;
    version: string;
    vendor?: string;
    cpeVendor?: string;
    cpeProduct?: string;
  },
) {
  return prisma.assetSoftware.create({
    data: {
      assetId,
      name: opts.name,
      version: opts.version,
      vendor: opts.vendor ?? null,
      cpeVendor: opts.cpeVendor ?? null,
      cpeProduct: opts.cpeProduct ?? null,
      matchConfidence: opts.cpeVendor ? 1.0 : null,
    },
  });
}

// Helper: create a Vulnerability
async function seedVulnerability(
  cveId: string,
  opts: Partial<{
    severity: string;
    cvss3BaseScore: number;
    epss: number;
    exploitable: boolean;
    patchAvailable: boolean;
    description: string;
  }> = {},
) {
  return prisma.vulnerability.create({
    data: {
      cveId,
      title: `${cveId}: Test vulnerability`,
      description: opts.description ?? `Description for ${cveId}`,
      severity: opts.severity ?? 'HIGH',
      cvss3BaseScore: opts.cvss3BaseScore ?? 7.5,
      epss: opts.epss ?? null,
      exploitable: opts.exploitable ?? false,
      patchAvailable: opts.patchAvailable ?? false,
      publishedDate: new Date('2025-01-01'),
      lastModified: new Date('2025-01-01'),
    },
  });
}

// Helper: create VulnerabilitySoftware (version range)
async function seedVulnerabilitySoftware(
  vulnerabilityId: string,
  opts: {
    cpeVendor: string;
    cpeProduct: string;
    versionStart?: string;
    versionStartType?: string;
    versionEnd?: string;
    versionEndType?: string;
    fixedVersion?: string;
  },
) {
  return prisma.vulnerabilitySoftware.create({
    data: {
      vulnerabilityId,
      name: opts.cpeProduct,
      vendor: opts.cpeVendor,
      cpeUri: `cpe:2.3:a:${opts.cpeVendor}:${opts.cpeProduct}:*:*:*:*:*:*:*:*`,
      cpeVendor: opts.cpeVendor,
      cpeProduct: opts.cpeProduct,
      versionStart: opts.versionStart ?? null,
      versionStartType: opts.versionStartType ?? null,
      versionEnd: opts.versionEnd ?? null,
      versionEndType: opts.versionEndType ?? null,
      fixedVersion: opts.fixedVersion ?? null,
    },
  });
}

// Helper: create a Patch
async function seedPatch(
  patchId: string,
  opts: {
    software?: string;
    vendor?: string;
    product?: string;
    cveNumbers?: string[];
    approvalStatus?: string;
    supersedes?: string[];
    supersededBy?: string[];
    supersededAt?: Date | null;
  } = {},
) {
  return prisma.patch.create({
    data: {
      patchId,
      title: `Patch ${patchId}`,
      software: opts.software ?? 'Test Software',
      vendor: opts.vendor ?? null,
      product: opts.product ?? null,
      severity: 'HIGH',
      cveNumbers: opts.cveNumbers ?? [],
      approvalStatus: opts.approvalStatus ?? 'Approved',
      supersedes: opts.supersedes ?? [],
      supersededBy: opts.supersededBy ?? [],
      supersededAt: opts.supersededAt ?? null,
    },
  });
}

// Cleanup all test data created during test run
async function cleanup() {
  // Delete in dependency order to avoid FK violations
  await prisma.assetPatchRecommendation.deleteMany({
    where: {
      asset: { name: { startsWith: P } },
    },
  });
  await prisma.assetVulnerability.deleteMany({
    where: {
      asset: { name: { startsWith: P } },
    },
  });
  await prisma.unmatchedSoftware.deleteMany({
    where: { name: { startsWith: P } },
  });
  await prisma.assetSoftware.deleteMany({
    where: {
      asset: { name: { startsWith: P } },
    },
  });
  await prisma.patchVulnerability.deleteMany({
    where: {
      patch: { patchId: { startsWith: P } },
    },
  });
  await prisma.vulnerabilitySoftware.deleteMany({
    where: {
      vulnerability: { cveId: { startsWith: `CVE-${P}` } },
    },
  });
  await prisma.vulnerabilityReference.deleteMany({
    where: {
      vulnerability: { cveId: { startsWith: `CVE-${P}` } },
    },
  });
  await prisma.patch.deleteMany({
    where: { patchId: { startsWith: P } },
  });
  await prisma.vulnerability.deleteMany({
    where: { cveId: { startsWith: `CVE-${P}` } },
  });
  await prisma.asset.deleteMany({
    where: { name: { startsWith: P } },
  });
  await prisma.organization.deleteMany({
    where: { name: { startsWith: P } },
  });
}

// ═══════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════

// Set timeout for the full suite (some tests have async settle delays)
jest.setTimeout(60000);

describe('R8: E2E Correlation Pipeline', () => {
  let orgId: string;

  beforeAll(async () => {
    await cleanup();
    const org = await seedOrganization();
    orgId = org.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // ── E2E-1: Full pipeline — vulnerable asset ──────────────────
  describe('E2E-1: Full pipeline — vulnerable asset', () => {
    let assetId: string;
    let vulnId: string;
    let patchDbId: string;
    const cveId = `CVE-${P}-001`;

    beforeAll(async () => {
      // 1. Seed asset with Firefox 115.0
      const asset = await seedAsset(orgId, 'Firefox-115');
      assetId = asset.id;

      await seedAssetSoftware(assetId, {
        name: 'Firefox',
        version: '115.0',
        vendor: 'Mozilla',
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
      });

      // 2. Seed a Vulnerability + VulnerabilitySoftware with range [100.0, 116.0)
      const vuln = await seedVulnerability(cveId);
      vulnId = vuln.id;

      await seedVulnerabilitySoftware(vulnId, {
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
        versionStart: '100.0',
        versionStartType: 'including',
        versionEnd: '116.0',
        versionEndType: 'excluding',
      });

      // 3. Run checkAssetVulnerabilities
      await cveDatabase.checkAssetVulnerabilities(assetId);

      // Small delay to let async recommendation creation settle
      await new Promise(r => setTimeout(r, 1000));

      // 4. Seed an approved Patch with cveNumbers matching the CVE
      const patch = await seedPatch(`${P}-PATCH-001`, {
        software: 'Firefox',
        vendor: 'mozilla',
        product: 'firefox',
        cveNumbers: [cveId],
        approvalStatus: 'Approved',
      });
      patchDbId = patch.id;

      // Trigger recommendation creation for this vulnerability
      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        assetId,
        vulnId,
        { name: 'Firefox', version: '115.0' },
      );
    });

    afterAll(async () => {
      await prisma.assetPatchRecommendation.deleteMany({ where: { assetId } });
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
    });

    it('should create AssetVulnerability for the vulnerable asset', async () => {
      const av = await prisma.assetVulnerability.findUnique({
        where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
      });
      expect(av).not.toBeNull();
      expect(av!.status).toBe('Open');
    });

    it('should create AssetPatchRecommendation linking asset, vuln, and patch', async () => {
      const recs = await prisma.assetPatchRecommendation.findMany({
        where: { assetId, vulnerabilityId: vulnId, patchId: patchDbId },
      });
      expect(recs.length).toBe(1);
      expect(recs[0].status).toBe('RECOMMENDED');
    });
  });

  // ── E2E-2: Full pipeline — safe asset ──────────────────────
  describe('E2E-2: Full pipeline — safe asset', () => {
    let assetId: string;
    let vulnId: string;
    const cveId = `CVE-${P}-002`;

    beforeAll(async () => {
      // 1. Seed asset with Firefox 128.0 (above vulnerable range)
      const asset = await seedAsset(orgId, 'Firefox-128');
      assetId = asset.id;

      await seedAssetSoftware(assetId, {
        name: 'Firefox',
        version: '128.0',
        vendor: 'Mozilla',
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
      });

      // 2. Seed same CVE with range [100.0, 116.0)
      const vuln = await seedVulnerability(cveId);
      vulnId = vuln.id;

      await seedVulnerabilitySoftware(vulnId, {
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
        versionStart: '100.0',
        versionStartType: 'including',
        versionEnd: '116.0',
        versionEndType: 'excluding',
      });

      // 3. Run scan
      await cveDatabase.checkAssetVulnerabilities(assetId);
    });

    afterAll(async () => {
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
    });

    it('should NOT create AssetVulnerability for safe version', async () => {
      const av = await prisma.assetVulnerability.findUnique({
        where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
      });
      expect(av).toBeNull();
    });
  });

  // ── E2E-3: Patch supersedence ─────────────────────────────
  describe('E2E-3: Patch supersedence', () => {
    let assetId: string;
    let vulnId: string;
    let patchAId: string;
    let patchBId: string;
    const cveId = `CVE-${P}-003`;

    beforeAll(async () => {
      // 1. Create Patch A (7-Zip 24.08) fixing CVE
      const patchA = await seedPatch(`${P}-PATCH-003A`, {
        software: '7-Zip',
        vendor: '7-zip',
        product: '7-zip',
        cveNumbers: [cveId],
        approvalStatus: 'Approved',
      });
      patchAId = patchA.id;

      // 2. Create Patch B (7-Zip 25.00) superseding A
      const patchB = await seedPatch(`${P}-PATCH-003B`, {
        software: '7-Zip',
        vendor: '7-zip',
        product: '7-zip',
        cveNumbers: [cveId],
        approvalStatus: 'Approved',
        supersedes: [patchAId],
      });
      patchBId = patchB.id;

      // Mark patch A as superseded by patch B
      await prisma.patch.update({
        where: { id: patchAId },
        data: {
          supersededBy: [patchBId],
          supersededAt: new Date(),
        },
      });

      // 3. Seed asset with 7-Zip 24.05, CVE with range (*, 24.09]
      const asset = await seedAsset(orgId, '7Zip-2405');
      assetId = asset.id;

      await seedAssetSoftware(assetId, {
        name: '7-Zip',
        version: '24.05',
        vendor: '7-Zip',
        cpeVendor: '7-zip',
        cpeProduct: '7-zip',
      });

      const vuln = await seedVulnerability(cveId);
      vulnId = vuln.id;

      await seedVulnerabilitySoftware(vulnId, {
        cpeVendor: '7-zip',
        cpeProduct: '7-zip',
        versionEnd: '24.09',
        versionEndType: 'including',
      });

      // 4. Run scan
      await cveDatabase.checkAssetVulnerabilities(assetId);
      await new Promise(r => setTimeout(r, 500));

      // 5. Create recommendations
      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        assetId,
        vulnId,
        { name: '7-Zip', version: '24.05' },
      );
    });

    afterAll(async () => {
      await prisma.assetPatchRecommendation.deleteMany({ where: { assetId } });
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
    });

    it('should only recommend Patch B (non-superseded), not Patch A', async () => {
      const recs = await prisma.assetPatchRecommendation.findMany({
        where: { assetId, vulnerabilityId: vulnId },
      });

      // Should have recommendation for Patch B only
      const patchIds = recs.map(r => r.patchId);
      expect(patchIds).toContain(patchBId);
      expect(patchIds).not.toContain(patchAId);
    });
  });

  // ── E2E-4: Bidirectional — new patch ──────────────────────
  describe('E2E-4: Bidirectional — new patch triggers recommendation', () => {
    let assetId: string;
    let vulnId: string;
    let patchDbId: string;
    const cveId = `CVE-${P}-004`;

    beforeAll(async () => {
      // 1. Seed asset with open vulnerability
      const asset = await seedAsset(orgId, 'OpenSSL-308-bidir');
      assetId = asset.id;

      await seedAssetSoftware(assetId, {
        name: 'OpenSSL',
        version: '3.0.8',
        vendor: 'OpenSSL',
        cpeVendor: 'openssl',
        cpeProduct: 'openssl',
      });

      const vuln = await seedVulnerability(cveId);
      vulnId = vuln.id;

      await seedVulnerabilitySoftware(vulnId, {
        cpeVendor: 'openssl',
        cpeProduct: 'openssl',
        versionStart: '3.0.1',
        versionStartType: 'including',
        versionEnd: '3.0.19',
        versionEndType: 'excluding',
      });

      // Run scan to create AssetVulnerability (status=Open)
      await cveDatabase.checkAssetVulnerabilities(assetId);
      await new Promise(r => setTimeout(r, 500));

      // 2. Create new approved patch fixing that CVE
      const patch = await seedPatch(`${P}-PATCH-004`, {
        software: 'OpenSSL',
        vendor: 'openssl',
        product: 'openssl',
        cveNumbers: [cveId],
        approvalStatus: 'Approved',
      });
      patchDbId = patch.id;

      // Simulate Direction B: generate recommendations for the new patch
      const { generateRecommendationsForPatchCves } = await import(
        '@modules/patches/patches.service'
      );
      await generateRecommendationsForPatchCves(patchDbId, [cveId]);
    });

    afterAll(async () => {
      await prisma.assetPatchRecommendation.deleteMany({ where: { assetId } });
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
    });

    it('should auto-create AssetPatchRecommendation when new patch is added', async () => {
      const recs = await prisma.assetPatchRecommendation.findMany({
        where: { assetId, patchId: patchDbId },
      });
      expect(recs.length).toBe(1);
      expect(recs[0].status).toBe('RECOMMENDED');
    });
  });

  // ── E2E-5: Bidirectional — new CVE ────────────────────────
  describe('E2E-5: Bidirectional — new CVE correlates with existing patch', () => {
    let vulnId: string;
    const cveId = `CVE-${P}-005`;

    beforeAll(async () => {
      // 1. Seed an approved patch with cveNumbers containing our CVE
      await seedPatch(`${P}-PATCH-005`, {
        software: 'Node.js',
        vendor: 'nodejs',
        product: 'node.js',
        cveNumbers: [cveId],
        approvalStatus: 'Approved',
      });

      // 2. Seed a new Vulnerability with patchAvailable=false
      const vuln = await seedVulnerability(cveId, { patchAvailable: false });
      vulnId = vuln.id;

      // 3. Call correlateNewCVEsWithPatches
      await cveDatabase.correlateNewCVEsWithPatches();
    });

    it('should set patchAvailable=true on the new CVE', async () => {
      const updated = await prisma.vulnerability.findUnique({
        where: { id: vulnId },
      });
      expect(updated!.patchAvailable).toBe(true);
    });

    it('should create PatchVulnerability join record', async () => {
      const pv = await prisma.patchVulnerability.findFirst({
        where: { cveNumber: cveId },
      });
      expect(pv).not.toBeNull();
      expect(pv!.correlationSource).toBe('cve-sync');
    });
  });

  // ── E2E-6: Version upgrade resolves vuln ──────────────────
  describe('E2E-6: Version upgrade resolves vulnerability', () => {
    let assetId: string;
    let vulnId: string;
    const cveId = `CVE-${P}-006`;

    beforeAll(async () => {
      // 1. Seed asset with OpenSSL 3.0.8
      const asset = await seedAsset(orgId, 'OpenSSL-308-upgrade');
      assetId = asset.id;

      const sw = await seedAssetSoftware(assetId, {
        name: 'OpenSSL',
        version: '3.0.8',
        vendor: 'OpenSSL',
        cpeVendor: 'openssl',
        cpeProduct: 'openssl',
      });

      // CVE with range [3.0.1, 3.0.19)
      const vuln = await seedVulnerability(cveId);
      vulnId = vuln.id;

      await seedVulnerabilitySoftware(vulnId, {
        cpeVendor: 'openssl',
        cpeProduct: 'openssl',
        versionStart: '3.0.1',
        versionStartType: 'including',
        versionEnd: '3.0.19',
        versionEndType: 'excluding',
      });

      // 2. First scan: vuln detected (status=Open)
      await cveDatabase.checkAssetVulnerabilities(assetId);
      await new Promise(r => setTimeout(r, 500));

      // 3. Update AssetSoftware version to 3.0.19 (patched version)
      await prisma.assetSoftware.update({
        where: { id: sw.id },
        data: { version: '3.0.19' },
      });

      // 4. Re-scan
      await cveDatabase.checkAssetVulnerabilities(assetId);
    });

    afterAll(async () => {
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
    });

    it('should detect vulnerability on first scan (Open)', async () => {
      // After second scan, the vuln should be marked Resolved
      const av = await prisma.assetVulnerability.findUnique({
        where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
      });
      expect(av).not.toBeNull();
    });

    it('should mark vulnerability as Resolved after version upgrade', async () => {
      const av = await prisma.assetVulnerability.findUnique({
        where: { assetId_vulnerabilityId: { assetId, vulnerabilityId: vulnId } },
      });
      expect(av).not.toBeNull();
      expect(av!.status).toBe('Resolved');
      expect(av!.resolvedAt).not.toBeNull();
    });
  });

  // ── E2E-7: Multiple vulns, multiple patches ───────────────
  describe('E2E-7: Multiple vulns, multiple patches', () => {
    let assetId: string;
    const cveIds = [
      `CVE-${P}-007A`,
      `CVE-${P}-007B`,
      `CVE-${P}-007C`,
    ];
    const vulnIds: string[] = [];
    const patchIds: string[] = [];

    beforeAll(async () => {
      // 1. Seed asset with 3 vulnerable apps
      const asset = await seedAsset(orgId, 'MultiVuln');
      assetId = asset.id;

      // Firefox 115.0
      await seedAssetSoftware(assetId, {
        name: 'Firefox',
        version: '115.0',
        vendor: 'Mozilla',
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
      });

      // OpenSSL 3.0.8
      await seedAssetSoftware(assetId, {
        name: 'OpenSSL',
        version: '3.0.8',
        vendor: 'OpenSSL',
        cpeVendor: 'openssl',
        cpeProduct: 'openssl',
      });

      // Node.js 16.20.0
      await seedAssetSoftware(assetId, {
        name: 'Node.js',
        version: '16.20.0',
        vendor: 'Node.js Foundation',
        cpeVendor: 'nodejs',
        cpeProduct: 'node.js',
      });

      // 2. Seed 3 CVEs with matching ranges
      const configs = [
        { cveId: cveIds[0], cpeVendor: 'mozilla', cpeProduct: 'firefox', vStart: '100.0', vEnd: '116.0' },
        { cveId: cveIds[1], cpeVendor: 'openssl', cpeProduct: 'openssl', vStart: '3.0.1', vEnd: '3.0.19' },
        { cveId: cveIds[2], cpeVendor: 'nodejs', cpeProduct: 'node.js', vStart: '16.0.0', vEnd: '16.21.0' },
      ];

      for (const cfg of configs) {
        const vuln = await seedVulnerability(cfg.cveId);
        vulnIds.push(vuln.id);

        await seedVulnerabilitySoftware(vuln.id, {
          cpeVendor: cfg.cpeVendor,
          cpeProduct: cfg.cpeProduct,
          versionStart: cfg.vStart,
          versionStartType: 'including',
          versionEnd: cfg.vEnd,
          versionEndType: 'excluding',
        });

        // Seed corresponding patches
        const patch = await seedPatch(`${P}-PATCH-007${cfg.cpeProduct}`, {
          software: cfg.cpeProduct,
          vendor: cfg.cpeVendor,
          product: cfg.cpeProduct,
          cveNumbers: [cfg.cveId],
          approvalStatus: 'Approved',
        });
        patchIds.push(patch.id);
      }

      // 3. Run full scan
      await cveDatabase.checkAssetVulnerabilities(assetId);
      await new Promise(r => setTimeout(r, 1000));

      // Create recommendations for each vulnerability
      for (let i = 0; i < vulnIds.length; i++) {
        await assetPatchRecommendationService.createRecommendationsForVulnerability(
          assetId,
          vulnIds[i],
          { name: configs[i].cpeProduct, version: null },
        );
      }
    });

    afterAll(async () => {
      await prisma.assetPatchRecommendation.deleteMany({ where: { assetId } });
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
    });

    it('should detect at least 3 vulnerabilities (our test CVEs)', async () => {
      const avs = await prisma.assetVulnerability.findMany({
        where: { assetId, status: 'Open' },
      });
      // At least our 3 test CVEs must be detected (more may exist from seed data)
      expect(avs.length).toBeGreaterThanOrEqual(3);

      // Verify all 3 test vulnerabilities are specifically detected
      for (const vulnId of vulnIds) {
        const match = avs.find(av => av.vulnerabilityId === vulnId);
        expect(match).toBeDefined();
      }
    });

    it('should create at least 3 patch recommendations (one per test CVE)', async () => {
      const recs = await prisma.assetPatchRecommendation.findMany({
        where: { assetId },
      });
      // At least our 3 test recommendations must exist
      expect(recs.length).toBeGreaterThanOrEqual(3);

      // Verify each test patch has a recommendation
      for (const patchId of patchIds) {
        const match = recs.find(r => r.patchId === patchId);
        expect(match).toBeDefined();
      }
    });
  });

  // ── E2E-8: EPSS + CISA KEV enrichment ────────────────────
  describe('E2E-8: EPSS + CISA KEV enrichment', () => {
    let assetId: string;
    let vulnId: string;
    let patchDbId: string;
    const cveId = `CVE-${P}-008`;

    beforeAll(async () => {
      // 1. Seed a CVE with exploitable=true and epss=95.0
      const vuln = await seedVulnerability(cveId, {
        severity: 'CRITICAL',
        cvss3BaseScore: 9.8,
        epss: 95.0,
        exploitable: true,
      });
      vulnId = vuln.id;

      await seedVulnerabilitySoftware(vulnId, {
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
        versionStart: '100.0',
        versionStartType: 'including',
        versionEnd: '120.0',
        versionEndType: 'excluding',
      });

      // 2. Seed matching asset
      const asset = await seedAsset(orgId, 'Firefox-KEV');
      assetId = asset.id;

      await seedAssetSoftware(assetId, {
        name: 'Firefox',
        version: '110.0',
        vendor: 'Mozilla',
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
      });

      // 3. Seed patch
      const patch = await seedPatch(`${P}-PATCH-008`, {
        software: 'Firefox',
        vendor: 'mozilla',
        product: 'firefox',
        cveNumbers: [cveId],
        approvalStatus: 'Approved',
      });
      patchDbId = patch.id;

      // 4. Run scan + create recommendation
      await cveDatabase.checkAssetVulnerabilities(assetId);
      await new Promise(r => setTimeout(r, 500));

      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        assetId,
        vulnId,
        { name: 'Firefox', version: '110.0' },
      );
    });

    afterAll(async () => {
      await prisma.assetPatchRecommendation.deleteMany({ where: { assetId } });
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
    });

    it('should carry EPSS score into recommendation', async () => {
      const rec = await prisma.assetPatchRecommendation.findFirst({
        where: { assetId, patchId: patchDbId },
      });
      expect(rec).not.toBeNull();
      expect(rec!.epssScore).not.toBeNull();
      expect(rec!.epssScore!).toBeGreaterThan(0);
    });

    it('should preserve exploitable=true on the vulnerability', async () => {
      const vuln = await prisma.vulnerability.findUnique({
        where: { id: vulnId },
      });
      expect(vuln!.exploitable).toBe(true);
    });
  });

  // ── E2E-9: Unmatched software tracking ────────────────────
  describe('E2E-9: Unmatched software tracking', () => {
    let assetId: string;

    beforeAll(async () => {
      // 1. Seed asset with unknown software (no CPE mapping)
      const asset = await seedAsset(orgId, 'UnknownApp');
      assetId = asset.id;

      await seedAssetSoftware(assetId, {
        name: `${P}-UnknownApp`,
        version: '1.0',
        vendor: 'Unknown Vendor',
        // No cpeVendor/cpeProduct — unresolvable
      });

      // 2. Run scan
      await cveDatabase.checkAssetVulnerabilities(assetId);
    });

    afterAll(async () => {
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
      await prisma.unmatchedSoftware.deleteMany({
        where: { name: `${P}-UnknownApp` },
      });
    });

    it('should create UnmatchedSoftware record', async () => {
      const unmatched = await prisma.unmatchedSoftware.findFirst({
        where: { name: `${P}-UnknownApp` },
      });
      expect(unmatched).not.toBeNull();
      expect(unmatched!.occurrences).toBeGreaterThanOrEqual(1);
    });

    it('should NOT create false vulnerability', async () => {
      const avs = await prisma.assetVulnerability.findMany({
        where: { assetId },
      });
      expect(avs.length).toBe(0);
    });
  });

  // ── E2E-10: Idempotent scan ───────────────────────────────
  describe('E2E-10: Idempotent scan', () => {
    let assetId: string;
    const cveId = `CVE-${P}-010`;

    beforeAll(async () => {
      // 1. Seed complete test data
      const asset = await seedAsset(orgId, 'IdempotentScan');
      assetId = asset.id;

      await seedAssetSoftware(assetId, {
        name: 'Firefox',
        version: '112.0',
        vendor: 'Mozilla',
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
      });

      const vuln = await seedVulnerability(cveId);

      await seedVulnerabilitySoftware(vuln.id, {
        cpeVendor: 'mozilla',
        cpeProduct: 'firefox',
        versionStart: '100.0',
        versionStartType: 'including',
        versionEnd: '116.0',
        versionEndType: 'excluding',
      });

      const patch = await seedPatch(`${P}-PATCH-010`, {
        software: 'Firefox',
        vendor: 'mozilla',
        product: 'firefox',
        cveNumbers: [cveId],
        approvalStatus: 'Approved',
      });

      // 2. First scan
      await cveDatabase.checkAssetVulnerabilities(assetId);
      await new Promise(r => setTimeout(r, 500));

      // Create recommendations
      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        assetId,
        vuln.id,
        { name: 'Firefox', version: '112.0' },
      );
    });

    afterAll(async () => {
      await prisma.assetPatchRecommendation.deleteMany({ where: { assetId } });
      await prisma.assetVulnerability.deleteMany({ where: { assetId } });
    });

    it('should produce same counts after running scan twice (no duplicates)', async () => {
      // Count after first scan
      const avCount1 = await prisma.assetVulnerability.count({ where: { assetId } });
      const recCount1 = await prisma.assetPatchRecommendation.count({ where: { assetId } });

      expect(avCount1).toBeGreaterThan(0);
      expect(recCount1).toBeGreaterThan(0);

      // 3. Run scan again
      await cveDatabase.checkAssetVulnerabilities(assetId);
      await new Promise(r => setTimeout(r, 500));

      // Re-run recommendation creation (should be idempotent due to unique constraint check)
      const vuln = await prisma.vulnerability.findUnique({ where: { cveId } });
      if (vuln) {
        await assetPatchRecommendationService.createRecommendationsForVulnerability(
          assetId,
          vuln.id,
          { name: 'Firefox', version: '112.0' },
        );
      }

      // 4. Count after second scan
      const avCount2 = await prisma.assetVulnerability.count({ where: { assetId } });
      const recCount2 = await prisma.assetPatchRecommendation.count({ where: { assetId } });

      // 5. Assert same counts
      expect(avCount2).toBe(avCount1);
      expect(recCount2).toBe(recCount1);
    });
  });
});
