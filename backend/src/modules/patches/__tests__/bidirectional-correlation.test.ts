import { prisma } from '@db/client';
import { generateRecommendationsForPatchCves, autoCorrelateCves } from '../patches.service';
import { CVEDatabaseService } from '@shared/services/cve-database.service';

// Mock Prisma client
jest.mock('@db/client', () => ({
  prisma: {
    vulnerability: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    patch: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    patchVulnerability: {
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    assetVulnerability: {
      findMany: jest.fn(),
    },
    assetPatchRecommendation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
    },
    vulnerabilitySoftware: {
      findMany: jest.fn(),
    },
    vulnerabilityReference: {
      findMany: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('@shared/services/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock env config (required by CVEDatabaseService constructor)
jest.mock('@/config/env', () => ({
  env: {
    NVD_API_URL: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
    CISA_KEV_URL: 'https://example.com/kev.json',
    FIRST_EPSS_URL: 'https://api.first.org/data/v1/epss',
    GITHUB_ADVISORY_URL: 'https://api.github.com/advisories',
    NIST_NVD_API_KEY: '',
    GITHUB_TOKEN: '',
  },
}));

// Mock notifications service
jest.mock('@/modules/notifications/notifications.service', () => ({
  notificationsService: {
    broadcast: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock CPE mapping service
jest.mock('@shared/services/cpe-mapping.service', () => ({
  cpeMappingService: {
    resolveCpe: jest.fn().mockResolvedValue(null),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('R6: Bidirectional Correlation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Direction A: New CVE → Existing Patches
  // ============================================
  describe('Direction A: correlateNewCVEsWithPatches', () => {
    // T6.1: New CVE finds existing patch → patchAvailable=true
    it('T6.1: should set patchAvailable=true when new CVE matches existing patch cveNumbers', async () => {
      // We test correlateNewCVEsWithPatches via the CVEDatabaseService
      // Since it's on a class, we test the logic directly with the mocked prisma

      // Setup: vulnerability with patchAvailable=false
      const mockVulns = [
        {
          id: 'vuln-1',
          cveId: 'CVE-2025-11001',
          severity: 'HIGH',
          description: 'Test vulnerability',
          publishedDate: new Date('2025-01-15'),
        },
      ];

      // Simulate the correlateNewCVEsWithPatches logic:
      // 1. Find uncovered vulns
      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue(mockVulns);

      // 2. Find patches that have this CVE
      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-1', cveNumbers: ['CVE-2025-11001', 'CVE-2025-11002'] },
      ]);

      // 3. No existing PatchVulnerability
      (mockPrisma.patchVulnerability.findFirst as jest.Mock).mockResolvedValue(null);

      // 4. Update and create calls
      (mockPrisma.vulnerability.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.patchVulnerability.create as jest.Mock).mockResolvedValue({});

      const service = new CVEDatabaseService();
      const result = await service.correlateNewCVEsWithPatches();

      expect(result).toBe(1);

      // Verify patchAvailable was set to true
      expect(mockPrisma.vulnerability.update).toHaveBeenCalledWith({
        where: { id: 'vuln-1' },
        data: { patchAvailable: true },
      });

      // Verify PatchVulnerability join record was created
      expect(mockPrisma.patchVulnerability.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patchId: 'patch-1',
          cveNumber: 'CVE-2025-11001',
          correlationSource: 'cve-sync',
        }),
      });
    });

    it('T6.1b: should skip CVEs that have no matching patches', async () => {
      const mockVulns = [
        {
          id: 'vuln-1',
          cveId: 'CVE-2025-99999',
          severity: 'MEDIUM',
          description: 'Unmatched CVE',
          publishedDate: new Date(),
        },
      ];

      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue(mockVulns);
      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([]);

      const { CVEDatabaseService } = await import('@shared/services/cve-database.service');
      const service = new CVEDatabaseService();
      const result = await service.correlateNewCVEsWithPatches();

      expect(result).toBe(0);
      expect(mockPrisma.vulnerability.update).not.toHaveBeenCalled();
    });

    it('T6.1c: should not create duplicate PatchVulnerability records', async () => {
      const mockVulns = [
        {
          id: 'vuln-1',
          cveId: 'CVE-2025-11001',
          severity: 'HIGH',
          description: 'Test',
          publishedDate: new Date(),
        },
      ];

      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue(mockVulns);
      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-1', cveNumbers: ['CVE-2025-11001'] },
      ]);

      // PatchVulnerability already exists
      (mockPrisma.patchVulnerability.findFirst as jest.Mock).mockResolvedValue({
        id: 'pv-existing',
        patchId: 'patch-1',
        cveNumber: 'CVE-2025-11001',
      });

      (mockPrisma.vulnerability.update as jest.Mock).mockResolvedValue({});

      const { CVEDatabaseService } = await import('@shared/services/cve-database.service');
      const service = new CVEDatabaseService();
      const result = await service.correlateNewCVEsWithPatches();

      expect(result).toBe(1);
      // patchAvailable still set
      expect(mockPrisma.vulnerability.update).toHaveBeenCalled();
      // But no duplicate PatchVulnerability record
      expect(mockPrisma.patchVulnerability.create).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Direction B: New Patch → Existing CVEs and Assets
  // ============================================
  describe('Direction B: generateRecommendationsForPatchCves', () => {
    // T6.2: New patch triggers recommendations for existing vulnerable assets
    it('T6.2: should create recommendations for assets with open vulnerabilities matching patch CVEs', async () => {
      const mockVulns = [
        { id: 'vuln-1', cveId: 'CVE-2025-11001', severity: 'HIGH', cvss3BaseScore: 7.5, epss: 30 },
        { id: 'vuln-2', cveId: 'CVE-2025-11002', severity: 'CRITICAL', cvss3BaseScore: 9.8, epss: 85 },
      ];

      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue(mockVulns);

      // Two assets with open vulns
      (mockPrisma.assetVulnerability.findMany as jest.Mock).mockResolvedValue([
        { assetId: 'asset-1', vulnerabilityId: 'vuln-1' },
        { assetId: 'asset-2', vulnerabilityId: 'vuln-1' },
        { assetId: 'asset-1', vulnerabilityId: 'vuln-2' },
      ]);

      // Patch is valid (not superseded)
      (mockPrisma.patch.findUnique as jest.Mock).mockResolvedValue({
        id: 'patch-1',
        software: 'Firefox',
        title: 'Firefox Security Update',
        supersededBy: [],
      });

      // No existing recommendations
      (mockPrisma.assetPatchRecommendation.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assetPatchRecommendation.create as jest.Mock).mockImplementation(
        ({ data }) => Promise.resolve({ id: 'rec-new', ...data })
      );

      const result = await generateRecommendationsForPatchCves(
        'patch-1',
        ['CVE-2025-11001', 'CVE-2025-11002']
      );

      // 3 recommendations: asset-1/vuln-1, asset-2/vuln-1, asset-1/vuln-2
      expect(result).toBe(3);
      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledTimes(3);

      // Verify recommendation data
      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assetId: 'asset-1',
          vulnerabilityId: 'vuln-1',
          patchId: 'patch-1',
          status: 'RECOMMENDED',
          severity: 'HIGH',
        }),
      });
    });

    it('T6.2b: should not create recommendations for superseded patches', async () => {
      const mockVulns = [
        { id: 'vuln-1', cveId: 'CVE-2025-11001', severity: 'HIGH', cvss3BaseScore: 7.5, epss: 30 },
      ];

      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue(mockVulns);

      (mockPrisma.assetVulnerability.findMany as jest.Mock).mockResolvedValue([
        { assetId: 'asset-1', vulnerabilityId: 'vuln-1' },
      ]);

      // Patch is superseded
      (mockPrisma.patch.findUnique as jest.Mock).mockResolvedValue({
        id: 'patch-old',
        software: 'Firefox',
        title: 'Old Firefox Patch',
        supersededBy: ['patch-new'],
      });

      const result = await generateRecommendationsForPatchCves(
        'patch-old',
        ['CVE-2025-11001']
      );

      expect(result).toBe(0);
      expect(mockPrisma.assetPatchRecommendation.create).not.toHaveBeenCalled();
    });

    it('T6.2c: should skip if no open asset vulnerabilities exist', async () => {
      const mockVulns = [
        { id: 'vuln-1', cveId: 'CVE-2025-11001', severity: 'HIGH', cvss3BaseScore: 7.5, epss: 30 },
      ];

      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue(mockVulns);
      (mockPrisma.assetVulnerability.findMany as jest.Mock).mockResolvedValue([]);

      const result = await generateRecommendationsForPatchCves(
        'patch-1',
        ['CVE-2025-11001']
      );

      expect(result).toBe(0);
    });

    it('T6.2d: should not create duplicate recommendations', async () => {
      const mockVulns = [
        { id: 'vuln-1', cveId: 'CVE-2025-11001', severity: 'HIGH', cvss3BaseScore: 7.5, epss: 30 },
      ];

      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue(mockVulns);
      (mockPrisma.assetVulnerability.findMany as jest.Mock).mockResolvedValue([
        { assetId: 'asset-1', vulnerabilityId: 'vuln-1' },
      ]);

      (mockPrisma.patch.findUnique as jest.Mock).mockResolvedValue({
        id: 'patch-1',
        software: 'Firefox',
        title: 'Firefox Security Update',
        supersededBy: [],
      });

      // Recommendation already exists
      (mockPrisma.assetPatchRecommendation.findFirst as jest.Mock).mockResolvedValue({
        id: 'rec-existing',
        assetId: 'asset-1',
        vulnerabilityId: 'vuln-1',
        patchId: 'patch-1',
      });

      const result = await generateRecommendationsForPatchCves(
        'patch-1',
        ['CVE-2025-11001']
      );

      expect(result).toBe(0);
      expect(mockPrisma.assetPatchRecommendation.create).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // T6.3: Auto-correlate by vendor+product
  // ============================================
  describe('T6.3: Auto-correlate by vendor+product', () => {
    it('should link CVEs whose VulnerabilitySoftware matches patch vendor+product', async () => {
      // Patch has vendor/product but no CVEs
      (mockPrisma.patch.findUnique as jest.Mock).mockResolvedValue({
        id: 'patch-ff',
        patchId: 'PATCH-FF-001',
        vendor: 'mozilla',
        product: 'firefox',
        software: 'Firefox',
        kbNumber: null,
        cveNumbers: [],
      });

      // Strategy 2: vendor+product CPE match finds CVEs
      (mockPrisma.vulnerabilitySoftware.findMany as jest.Mock).mockResolvedValue([
        { vulnerability: { cveId: 'CVE-2025-22001' } },
        { vulnerability: { cveId: 'CVE-2025-22002' } },
      ]);

      // No KB match (strategy 1 skipped since no kbNumber)
      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue([]);

      // Update patch with found CVEs
      (mockPrisma.patch.update as jest.Mock).mockResolvedValue({});

      // No existing PatchVulnerability
      (mockPrisma.patchVulnerability.findFirst as jest.Mock).mockResolvedValue(null);

      // Vulnerability details for PatchVulnerability records
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue({
        severity: 'HIGH',
        description: 'Firefox CVE',
        publishedDate: new Date('2025-01-01'),
      });

      (mockPrisma.patchVulnerability.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.vulnerability.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      // Mock for generateRecommendationsForPatchCves (called inside autoCorrelateCves)
      (mockPrisma.assetVulnerability.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.patch.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'patch-ff',
          patchId: 'PATCH-FF-001',
          vendor: 'mozilla',
          product: 'firefox',
          software: 'Firefox',
          kbNumber: null,
          cveNumbers: [],
        })
        .mockResolvedValue({
          id: 'patch-ff',
          software: 'Firefox',
          title: 'Firefox Update',
          supersededBy: [],
        });

      const result = await autoCorrelateCves('patch-ff');

      expect(result).toEqual(expect.arrayContaining(['CVE-2025-22001', 'CVE-2025-22002']));
      expect(result).toHaveLength(2);

      // Verify patch was updated with discovered CVEs
      expect(mockPrisma.patch.update).toHaveBeenCalledWith({
        where: { id: 'patch-ff' },
        data: { cveNumbers: expect.arrayContaining(['CVE-2025-22001', 'CVE-2025-22002']) },
      });

      // Verify patchAvailable was set on found vulnerabilities
      expect(mockPrisma.vulnerability.updateMany).toHaveBeenCalledWith({
        where: { cveId: { in: expect.arrayContaining(['CVE-2025-22001', 'CVE-2025-22002']) } },
        data: { patchAvailable: true },
      });
    });
  });

  // ============================================
  // T6.4: No false auto-correlation
  // ============================================
  describe('T6.4: No false auto-correlation', () => {
    it('should not correlate thunderbird patch with firefox CVEs', async () => {
      // Patch for thunderbird
      (mockPrisma.patch.findUnique as jest.Mock).mockResolvedValue({
        id: 'patch-tb',
        patchId: 'PATCH-TB-001',
        vendor: 'mozilla',
        product: 'thunderbird',
        software: 'Thunderbird',
        kbNumber: null,
        cveNumbers: [],
      });

      // Strategy 2: vendor+product match — only thunderbird CVEs should match
      // Mock returns thunderbird CVE (correct match)
      (mockPrisma.vulnerabilitySoftware.findMany as jest.Mock).mockResolvedValue([
        { vulnerability: { cveId: 'CVE-2025-TB-001' } },
      ]);

      // No KB match
      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue([]);

      (mockPrisma.patch.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.patchVulnerability.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue({
        severity: 'MEDIUM',
        description: 'Thunderbird CVE',
        publishedDate: new Date(),
      });
      (mockPrisma.patchVulnerability.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.vulnerability.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      // Mock for generateRecommendationsForPatchCves
      (mockPrisma.assetVulnerability.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.patch.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'patch-tb',
          patchId: 'PATCH-TB-001',
          vendor: 'mozilla',
          product: 'thunderbird',
          software: 'Thunderbird',
          kbNumber: null,
          cveNumbers: [],
        })
        .mockResolvedValue({
          id: 'patch-tb',
          software: 'Thunderbird',
          title: 'Thunderbird Update',
          supersededBy: [],
        });

      const result = await autoCorrelateCves('patch-tb');

      // Should only find thunderbird CVEs
      expect(result).toEqual(['CVE-2025-TB-001']);

      // Verify the vendor+product query used 'thunderbird', not 'firefox'
      expect(mockPrisma.vulnerabilitySoftware.findMany).toHaveBeenCalledWith({
        where: {
          cpeVendor: { equals: 'mozilla', mode: 'insensitive' },
          cpeProduct: { equals: 'thunderbird', mode: 'insensitive' },
        },
        select: { vulnerability: { select: { cveId: true } } },
        take: 100,
      });
    });

    it('should not correlate via software name if vendor+product already found matches', async () => {
      // Patch with vendor+product set
      (mockPrisma.patch.findUnique as jest.Mock).mockResolvedValue({
        id: 'patch-tb',
        patchId: 'PATCH-TB-001',
        vendor: 'mozilla',
        product: 'thunderbird',
        software: 'Thunderbird',
        kbNumber: null,
        cveNumbers: [],
      });

      // Strategy 2 finds results
      (mockPrisma.vulnerabilitySoftware.findMany as jest.Mock).mockResolvedValue([
        { vulnerability: { cveId: 'CVE-2025-TB-001' } },
      ]);

      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.patch.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.patchVulnerability.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue({
        severity: 'MEDIUM',
        description: 'Thunderbird CVE',
        publishedDate: new Date(),
      });
      (mockPrisma.patchVulnerability.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.vulnerability.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.assetVulnerability.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.patch.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'patch-tb',
          patchId: 'PATCH-TB-001',
          vendor: 'mozilla',
          product: 'thunderbird',
          software: 'Thunderbird',
          kbNumber: null,
          cveNumbers: [],
        })
        .mockResolvedValue({
          id: 'patch-tb',
          software: 'Thunderbird',
          title: 'Thunderbird Update',
          supersededBy: [],
        });

      const result = await autoCorrelateCves('patch-tb');

      // Strategy 3 (software name fallback) should NOT run since Strategy 2 found matches
      // Verify vulnerabilitySoftware.findMany was called once (for Strategy 2)
      // and NOT called again for Strategy 3 with cpeProduct: 'thunderbird'
      expect(result).toEqual(['CVE-2025-TB-001']);

      // Only the vendor+product strategy should have been called
      const vsFindManyCalls = (mockPrisma.vulnerabilitySoftware.findMany as jest.Mock).mock.calls;
      expect(vsFindManyCalls).toHaveLength(1);
      expect(vsFindManyCalls[0][0].where.cpeProduct).toEqual({ equals: 'thunderbird', mode: 'insensitive' });
    });
  });

  // ============================================
  // Edge cases
  // ============================================
  describe('Edge cases', () => {
    it('should handle empty CVE numbers gracefully', async () => {
      const result = await generateRecommendationsForPatchCves('patch-1', []);
      expect(result).toBe(0);
    });

    it('should handle patch not found', async () => {
      (mockPrisma.vulnerability.findMany as jest.Mock).mockResolvedValue([
        { id: 'vuln-1', cveId: 'CVE-2025-11001', severity: 'HIGH', cvss3BaseScore: 7.5, epss: 30 },
      ]);
      (mockPrisma.assetVulnerability.findMany as jest.Mock).mockResolvedValue([
        { assetId: 'asset-1', vulnerabilityId: 'vuln-1' },
      ]);
      (mockPrisma.patch.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await generateRecommendationsForPatchCves('patch-missing', ['CVE-2025-11001']);
      expect(result).toBe(0);
    });

    it('should return empty array when patch already has CVEs', async () => {
      (mockPrisma.patch.findUnique as jest.Mock).mockResolvedValue({
        id: 'patch-1',
        cveNumbers: ['CVE-2025-11001'],
        vendor: 'mozilla',
        product: 'firefox',
        software: 'Firefox',
        kbNumber: null,
      });

      const result = await autoCorrelateCves('patch-1');
      expect(result).toEqual(['CVE-2025-11001']);
    });
  });
});
