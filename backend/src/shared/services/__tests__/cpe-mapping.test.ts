/**
 * CPE Mapping Service - PRD R3 Test Cases
 *
 * Tests T3.1-T3.6 from PRD-PATCH-VULNERABILITY-CORRELATION.md
 * Uses mocked Prisma client to avoid database dependency.
 */

const mockFindFirst = jest.fn();
const mockVulnFindFirst = jest.fn();

// Mock using the SAME path alias as cpe-mapping.service.ts uses for its import
jest.mock('@/db/client', () => ({
  __esModule: true,
  prisma: {
    cpeMapping: {
      findFirst: mockFindFirst,
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
    vulnerabilitySoftware: {
      findFirst: mockVulnFindFirst,
    },
    assetSoftware: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  default: {
    $disconnect: jest.fn(),
  },
}));

// Mock the config module to prevent env var issues during import
jest.mock('@config/index', () => ({
  config: {
    isDevelopment: false,
    isProduction: false,
    isTest: true,
  },
}));

// Mock normalizeVersion used by the service
jest.mock('@shared/utils/version.utils', () => ({
  normalizeVersion: jest.fn((v: string) => v),
}));

// Import after mock setup
import { cpeMappingService } from '../cpe-mapping.service';

describe('CPE Mapping Service - PRD R3 Test Cases', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockVulnFindFirst.mockReset();
    cpeMappingService.clearCache();
    // Default: VulnerabilitySoftware returns nothing (no Stage 3 fallback)
    mockVulnFindFirst.mockResolvedValue(null);
  });

  // T3.1: Exact match
  it('T3.1: resolveCpe("Firefox", "Mozilla") returns { cpeVendor: "mozilla", cpeProduct: "firefox" }', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'cpe-firefox-1',
      cpeVendor: 'mozilla',
      cpeProduct: 'firefox',
      confidence: 1.0,
    });

    const result = await cpeMappingService.resolveCpe({
      name: 'Firefox',
      vendor: 'Mozilla',
    });

    expect(result).not.toBeNull();
    expect(result!.cpeVendor).toBe('mozilla');
    expect(result!.cpeProduct).toBe('firefox');
    expect(result!.source).toBe('mapping_table');
  });

  // T3.2: Case insensitive
  it('T3.2: resolveCpe("OPENSSL", "OpenSSL Project") returns { cpeVendor: "openssl", cpeProduct: "openssl" }', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'cpe-openssl-1',
      cpeVendor: 'openssl',
      cpeProduct: 'openssl',
      confidence: 1.0,
    });

    const result = await cpeMappingService.resolveCpe({
      name: 'OPENSSL',
      vendor: 'OpenSSL Project',
    });

    expect(result).not.toBeNull();
    expect(result!.cpeVendor).toBe('openssl');
    expect(result!.cpeProduct).toBe('openssl');
  });

  // T3.3: Variant name
  it('T3.3: resolveCpe("7zip", "Igor Pavlov") returns { cpeVendor: "7-zip", cpeProduct: "7-zip" }', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'cpe-7zip-1',
      cpeVendor: '7-zip',
      cpeProduct: '7-zip',
      confidence: 1.0,
    });

    const result = await cpeMappingService.resolveCpe({
      name: '7zip',
      vendor: 'Igor Pavlov',
    });

    expect(result).not.toBeNull();
    expect(result!.cpeVendor).toBe('7-zip');
    expect(result!.cpeProduct).toBe('7-zip');
  });

  // T3.4: Linux variant
  it('T3.4: resolveCpe("libssl", "OpenSSL Project") returns { cpeVendor: "openssl", cpeProduct: "openssl" }', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'cpe-libssl-1',
      cpeVendor: 'openssl',
      cpeProduct: 'openssl',
      confidence: 1.0,
    });

    const result = await cpeMappingService.resolveCpe({
      name: 'libssl',
      vendor: 'OpenSSL Project',
    });

    expect(result).not.toBeNull();
    expect(result!.cpeVendor).toBe('openssl');
    expect(result!.cpeProduct).toBe('openssl');
  });

  // T3.5: Unmatched software
  it('T3.5: resolveCpe("VLC Media Player", "VideoLAN") returns null when no mapping found', async () => {
    // All stages return null: no exact match, no normalized match, no direct match
    mockFindFirst.mockResolvedValue(null);
    mockVulnFindFirst.mockResolvedValue(null);

    const result = await cpeMappingService.resolveCpe({
      name: 'VLC Media Player',
      vendor: 'VideoLAN',
    });

    expect(result).toBeNull();
  });

  // T3.6: Node.js variant
  it('T3.6: resolveCpe("node", "Node.js Foundation") returns { cpeVendor: "nodejs", cpeProduct: "node.js" }', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'cpe-node-1',
      cpeVendor: 'nodejs',
      cpeProduct: 'node.js',
      confidence: 1.0,
    });

    const result = await cpeMappingService.resolveCpe({
      name: 'node',
      vendor: 'Node.js Foundation',
    });

    expect(result).not.toBeNull();
    expect(result!.cpeVendor).toBe('nodejs');
    expect(result!.cpeProduct).toBe('node.js');
  });

  // Additional: Verify confidence and source fields
  it('should include confidence, source, and mappingId in resolution', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'cpe-test-1',
      cpeVendor: 'mozilla',
      cpeProduct: 'firefox',
      confidence: 0.95,
    });

    const result = await cpeMappingService.resolveCpe({
      name: 'Firefox',
      vendor: null,
    });

    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0.95);
    expect(result!.source).toBe('mapping_table');
    expect(result!.mappingId).toBe('cpe-test-1');
  });

  // Verify caching works
  it('should cache resolution results on subsequent calls', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'cpe-cache-1',
      cpeVendor: 'mozilla',
      cpeProduct: 'firefox',
      confidence: 1.0,
    });

    // First call
    await cpeMappingService.resolveCpe({ name: 'Firefox', vendor: 'Mozilla' });
    // Second call (should use cache)
    await cpeMappingService.resolveCpe({ name: 'Firefox', vendor: 'Mozilla' });

    // findFirst should only be called once due to caching
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });
});
