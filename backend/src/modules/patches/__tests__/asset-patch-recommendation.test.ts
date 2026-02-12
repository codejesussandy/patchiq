import { prisma } from '@db/client';
import { assetPatchRecommendationService } from '../asset-patch-recommendation.service';

// Mock Prisma client
jest.mock('@db/client', () => ({
  prisma: {
    vulnerability: {
      findUnique: jest.fn(),
    },
    patch: {
      findMany: jest.fn(),
    },
    assetPatchRecommendation: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AssetPatchRecommendationService', () => {
  const mockVulnerability = {
    id: 'vuln-1',
    cveId: 'CVE-2025-11111',
    title: 'Remote Code Execution in Firefox',
    severity: 'CRITICAL',
    cvss3BaseScore: 9.8,
    epss: 95,
    exploitable: true,
  };

  const mockSoftware = { name: 'Firefox', version: '115.0' };

  // T5.1: Basic recommendation creation
  describe('T5.1: Basic recommendation creation', () => {
    it('should create a recommendation for a detected vulnerability with an approved patch', async () => {
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue(mockVulnerability);

      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-uuid-1', patchId: 'PATCH-FIREFOX-116', supersededBy: [] },
      ]);

      (mockPrisma.assetPatchRecommendation.findUnique as jest.Mock).mockResolvedValue(null);

      const mockCreatedRecommendation = {
        id: 'rec-1',
        assetId: 'asset-1',
        vulnerabilityId: 'vuln-1',
        patchId: 'patch-uuid-1',
        status: 'RECOMMENDED',
        severity: 'CRITICAL',
        cvssScore: 9.8,
        epssScore: 95,
        riskScore: 100,
        reason: 'Fixes CVE-2025-11111: Remote Code Execution in Firefox',
        affectedSoftware: 'Firefox 115.0',
        recommendedAt: new Date(),
      };
      (mockPrisma.assetPatchRecommendation.create as jest.Mock).mockResolvedValue(
        mockCreatedRecommendation
      );

      const result = await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-1',
        mockSoftware
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('RECOMMENDED');
      expect(result[0].reason).toBe('Fixes CVE-2025-11111: Remote Code Execution in Firefox');
      expect(result[0].affectedSoftware).toBe('Firefox 115.0');

      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          assetId: 'asset-1',
          vulnerabilityId: 'vuln-1',
          patchId: 'patch-uuid-1',
          status: 'RECOMMENDED',
          severity: 'CRITICAL',
          reason: 'Fixes CVE-2025-11111: Remote Code Execution in Firefox',
          affectedSoftware: 'Firefox 115.0',
        }),
      });
    });
  });

  // T5.2: No approved patch -> no recommendation
  describe('T5.2: No approved patch produces no recommendation', () => {
    it('should return empty array when no approved patches fix the CVE', async () => {
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue(mockVulnerability);

      // No approved patches found (the query already filters by approvalStatus='Approved')
      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([]);

      const result = await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-1',
        mockSoftware
      );

      expect(result).toHaveLength(0);
      expect(mockPrisma.assetPatchRecommendation.create).not.toHaveBeenCalled();
    });

    it('should return empty array when vulnerability does not exist', async () => {
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'nonexistent',
        mockSoftware
      );

      expect(result).toHaveLength(0);
      expect(mockPrisma.patch.findMany).not.toHaveBeenCalled();
    });
  });

  // T5.3: Superseded patch skipped
  describe('T5.3: Superseded patch is skipped', () => {
    it('should only recommend non-superseded patches, skipping superseded ones', async () => {
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue({
        ...mockVulnerability,
        cveId: 'CVE-2025-11001',
        title: 'Buffer overflow in 7-Zip',
        severity: 'HIGH',
        cvss3BaseScore: 7.5,
        epss: 50,
        exploitable: false,
      });

      // Two patches fix the CVE, but PATCH-7ZIP-2408 is superseded by PATCH-7ZIP-2500
      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'patch-7zip-old-uuid',
          patchId: 'PATCH-7ZIP-2408',
          supersededBy: ['PATCH-7ZIP-2500'],
        },
        {
          id: 'patch-7zip-new-uuid',
          patchId: 'PATCH-7ZIP-2500',
          supersededBy: [],
        },
      ]);

      (mockPrisma.assetPatchRecommendation.findUnique as jest.Mock).mockResolvedValue(null);

      const mockCreatedRecommendation = {
        id: 'rec-2',
        assetId: 'asset-1',
        vulnerabilityId: 'vuln-1',
        patchId: 'patch-7zip-new-uuid',
        status: 'RECOMMENDED',
        severity: 'HIGH',
        riskScore: 67,
        reason: 'Fixes CVE-2025-11001: Buffer overflow in 7-Zip',
        affectedSoftware: '7-Zip 24.05',
      };
      (mockPrisma.assetPatchRecommendation.create as jest.Mock).mockResolvedValue(
        mockCreatedRecommendation
      );

      const result = await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-1',
        { name: '7-Zip', version: '24.05' }
      );

      // Only the non-superseded patch should be recommended
      expect(result).toHaveLength(1);
      expect(result[0].patchId).toBe('patch-7zip-new-uuid');

      // create should only be called once (for the non-superseded patch)
      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patchId: 'patch-7zip-new-uuid',
        }),
      });
    });

    it('should skip all patches if all are superseded', async () => {
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue(mockVulnerability);

      // All patches are superseded
      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'patch-old-uuid',
          patchId: 'PATCH-OLD',
          supersededBy: ['PATCH-NEW'],
        },
      ]);

      const result = await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-1',
        mockSoftware
      );

      expect(result).toHaveLength(0);
      expect(mockPrisma.assetPatchRecommendation.create).not.toHaveBeenCalled();
    });
  });

  // T5.4: Risk score calculation
  describe('T5.4: Risk score calculation with known values', () => {
    it('should calculate risk score correctly: CVSS=9.8, EPSS=95, CRITICAL, exploitable -> capped at 100', async () => {
      // riskScore = (9.8 * 10 * 0.5) + (95 * 0.3) + 20 + 10
      //           = 49 + 28.5 + 20 + 10
      //           = 107.5 -> capped at 100
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue({
        ...mockVulnerability,
        cvss3BaseScore: 9.8,
        epss: 95,
        severity: 'CRITICAL',
        exploitable: true,
      });

      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-uuid', patchId: 'PATCH-1', supersededBy: [] },
      ]);

      (mockPrisma.assetPatchRecommendation.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assetPatchRecommendation.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({ id: 'rec-x', ...args.data });
      });

      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-1',
        mockSoftware
      );

      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskScore: 100,
        }),
      });
    });

    it('should calculate risk score correctly for MEDIUM severity, non-exploitable', async () => {
      // riskScore = (5.0 * 10 * 0.5) + (30 * 0.3) + 10 + 0
      //           = 25 + 9 + 10 + 0
      //           = 44
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue({
        id: 'vuln-2',
        cveId: 'CVE-2025-22222',
        title: 'Minor issue',
        severity: 'MEDIUM',
        cvss3BaseScore: 5.0,
        epss: 30,
        exploitable: false,
      });

      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-uuid', patchId: 'PATCH-2', supersededBy: [] },
      ]);

      (mockPrisma.assetPatchRecommendation.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assetPatchRecommendation.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({ id: 'rec-x', ...args.data });
      });

      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-2',
        mockSoftware
      );

      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskScore: 44,
        }),
      });
    });

    it('should handle null CVSS and EPSS gracefully', async () => {
      // riskScore = (0) + (0) + 5 + 0 = 5
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue({
        id: 'vuln-3',
        cveId: 'CVE-2025-33333',
        title: 'Unknown vuln',
        severity: 'LOW',
        cvss3BaseScore: null,
        epss: null,
        exploitable: false,
      });

      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-uuid', patchId: 'PATCH-3', supersededBy: [] },
      ]);

      (mockPrisma.assetPatchRecommendation.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assetPatchRecommendation.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({ id: 'rec-x', ...args.data });
      });

      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-3',
        mockSoftware
      );

      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          riskScore: 5,
        }),
      });
    });
  });

  // T5.5: Duplicate prevention
  describe('T5.5: Duplicate prevention', () => {
    it('should not create duplicate recommendations', async () => {
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue(mockVulnerability);

      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-uuid-1', patchId: 'PATCH-FIREFOX-116', supersededBy: [] },
      ]);

      // Recommendation already exists
      (mockPrisma.assetPatchRecommendation.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-rec',
        assetId: 'asset-1',
        vulnerabilityId: 'vuln-1',
        patchId: 'patch-uuid-1',
        status: 'RECOMMENDED',
      });

      const result = await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-1',
        mockSoftware
      );

      expect(result).toHaveLength(0);
      expect(mockPrisma.assetPatchRecommendation.create).not.toHaveBeenCalled();
    });
  });

  // Additional: Verify reason and affectedSoftware field formats
  describe('Reason and affectedSoftware field format', () => {
    it('should format reason as "Fixes CVE-XXXX-XXXXX: [title]"', async () => {
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue({
        ...mockVulnerability,
        cveId: 'CVE-2025-15467',
        title: 'Stack buffer overflow in CMS',
      });

      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-uuid', patchId: 'PATCH-OPENSSL-3019', supersededBy: [] },
      ]);

      (mockPrisma.assetPatchRecommendation.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assetPatchRecommendation.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({ id: 'rec-x', ...args.data });
      });

      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-1',
        { name: 'OpenSSL', version: '3.0.8' }
      );

      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reason: 'Fixes CVE-2025-15467: Stack buffer overflow in CMS',
          affectedSoftware: 'OpenSSL 3.0.8',
        }),
      });
    });

    it('should handle null version in affectedSoftware', async () => {
      (mockPrisma.vulnerability.findUnique as jest.Mock).mockResolvedValue(mockVulnerability);

      (mockPrisma.patch.findMany as jest.Mock).mockResolvedValue([
        { id: 'patch-uuid', patchId: 'PATCH-1', supersededBy: [] },
      ]);

      (mockPrisma.assetPatchRecommendation.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assetPatchRecommendation.create as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({ id: 'rec-x', ...args.data });
      });

      await assetPatchRecommendationService.createRecommendationsForVulnerability(
        'asset-1',
        'vuln-1',
        { name: 'SomeApp', version: null }
      );

      expect(mockPrisma.assetPatchRecommendation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          affectedSoftware: 'SomeApp',
        }),
      });
    });
  });
});
