import { prisma } from '../../src/db/client';
import { DashboardService } from '@modules/dashboard/dashboard.service';

describe('Dashboard SQL Protection', () => {
  let service: DashboardService;
  let queryRawSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new DashboardService();
    queryRawSpy = jest.spyOn(prisma, '$queryRaw' as any);
  });

  afterEach(() => {
    queryRawSpy.mockRestore();
  });

  describe('getVulnerabilityByDiscoveredDate', () => {
    it('returns zero-count buckets on SQL error', async () => {
      queryRawSpy.mockRejectedValue(
        new Error('relation "asset_vulnerabilities" does not exist')
      );

      const result = await service.getVulnerabilityByDiscoveredDate();

      expect(result).toHaveLength(4);
      expect(result).toEqual([
        { date: '< 30 days', critical: 0, high: 0, medium: 0, low: 0 },
        { date: '30-60 days', critical: 0, high: 0, medium: 0, low: 0 },
        { date: '60-90 days', critical: 0, high: 0, medium: 0, low: 0 },
        { date: '> 90 days', critical: 0, high: 0, medium: 0, low: 0 },
      ]);
    });

    it('returns real data when query succeeds', async () => {
      queryRawSpy.mockResolvedValue([
        { range_label: '< 30 days', critical: 2n, high: 5n, medium: 3n, low: 1n },
        { range_label: '> 90 days', critical: 10n, high: 0n, medium: 0n, low: 0n },
      ]);

      const result = await service.getVulnerabilityByDiscoveredDate();

      expect(result).toEqual([
        { date: '< 30 days', critical: 2, high: 5, medium: 3, low: 1 },
        { date: '30-60 days', critical: 0, high: 0, medium: 0, low: 0 },
        { date: '60-90 days', critical: 0, high: 0, medium: 0, low: 0 },
        { date: '> 90 days', critical: 10, high: 0, medium: 0, low: 0 },
      ]);
    });
  });

  describe('getTotalSoftwareByPlatform', () => {
    it('returns empty array on SQL error', async () => {
      queryRawSpy.mockRejectedValue(
        new Error('relation "asset_software" does not exist')
      );

      const result = await service.getTotalSoftwareByPlatform();

      expect(result).toEqual([]);
    });

    it('returns mapped data when query succeeds', async () => {
      queryRawSpy.mockResolvedValue([
        { name: 'Windows 10', value: 42n },
      ]);

      const result = await service.getTotalSoftwareByPlatform();

      expect(result).toEqual([
        { name: 'Windows', value: 42 },
      ]);
    });
  });

  describe('getAlertSeverityCountByPlatform', () => {
    it('returns empty array on SQL error', async () => {
      queryRawSpy.mockRejectedValue(
        new Error('column "os" does not exist')
      );

      const result = await service.getAlertSeverityCountByPlatform();

      expect(result).toEqual([]);
    });

    it('returns mapped data when query succeeds', async () => {
      queryRawSpy.mockResolvedValue([
        { platform: 'Windows 10', critical: 3n, high: 5n, medium: 2n, low: 1n },
      ]);

      const result = await service.getAlertSeverityCountByPlatform();

      expect(result).toEqual([
        { platform: 'Windows 10', critical: 3, high: 5, medium: 2, low: 1 },
      ]);
    });
  });

  describe('getAlertSeverityCountByModule', () => {
    it('returns empty array on SQL error', async () => {
      queryRawSpy.mockRejectedValue(
        new Error('relation "vulnerability_software" does not exist')
      );

      const result = await service.getAlertSeverityCountByModule();

      expect(result).toEqual([]);
    });

    it('returns mapped data when query succeeds', async () => {
      queryRawSpy.mockResolvedValue([
        { module: 'openssl', critical: 5n, high: 3n, medium: 1n },
      ]);

      const result = await service.getAlertSeverityCountByModule();

      expect(result).toEqual([
        { module: 'openssl', critical: 5, high: 3, medium: 1 },
      ]);
    });
  });

  describe('error resilience', () => {
    it('does not throw when all SQL queries fail', async () => {
      queryRawSpy.mockRejectedValue(new Error('database gone'));

      // All 4 methods should resolve without throwing
      await expect(service.getVulnerabilityByDiscoveredDate()).resolves.toBeDefined();
      await expect(service.getTotalSoftwareByPlatform()).resolves.toBeDefined();
      await expect(service.getAlertSeverityCountByPlatform()).resolves.toBeDefined();
      await expect(service.getAlertSeverityCountByModule()).resolves.toBeDefined();
    });
  });
});
