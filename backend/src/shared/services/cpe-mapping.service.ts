/**
 * CPE Mapping Service
 *
 * Phase 4: Vulnerability Correlation Improvement
 *
 * Resolves agent-reported software names to CPE (Common Platform Enumeration)
 * vendor/product identifiers for accurate vulnerability matching.
 *
 * Problem: Agent reports "Google Chrome", NVD uses "google:chrome"
 * Solution: Look up mapping and return standardized CPE identifiers
 */

import { prisma } from '@/db/client';
import { normalizeVersion } from '@shared/utils/version.utils';

/**
 * Result of CPE resolution
 */
export interface CpeResolution {
  /** CPE vendor identifier (e.g., "google", "openssl") */
  cpeVendor: string;
  /** CPE product identifier (e.g., "chrome", "openssl") */
  cpeProduct: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** How the match was found */
  source: 'mapping_table' | 'normalized_match' | 'direct_match' | 'fuzzy_match';
  /** ID of the CpeMapping record used (if from mapping table) */
  mappingId?: string;
}

/**
 * Software info from agent
 */
export interface AgentSoftware {
  name: string;
  vendor?: string | null;
  version?: string | null;
  platform?: string | null;
  packageManager?: string | null;
}

/**
 * CPE Mapping Service
 *
 * Provides methods to resolve agent software to CPE identifiers
 * with caching for performance.
 */
class CpeMappingService {
  /** In-memory cache for resolved mappings */
  private cache: Map<string, CpeResolution | null> = new Map();

  /** Cache TTL in milliseconds (5 minutes) */
  private cacheTTL = 5 * 60 * 1000;

  /** Last cache clear timestamp */
  private lastCacheClear = Date.now();

  /**
   * Resolve agent software to CPE vendor/product
   *
   * Resolution order:
   * 1. Exact match in CpeMapping table
   * 2. Normalized name match in CpeMapping table
   * 3. Direct match in VulnerabilitySoftware table
   * 4. Fuzzy match using normalized name patterns
   *
   * @param software - Software info from agent
   * @returns CPE resolution or null if no match found
   */
  async resolveCpe(software: AgentSoftware): Promise<CpeResolution | null> {
    // Check cache TTL
    if (Date.now() - this.lastCacheClear > this.cacheTTL) {
      this.clearCache();
    }

    const cacheKey = this.getCacheKey(software);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    let result: CpeResolution | null = null;

    // 1. Try exact match in mapping table
    result = await this.findExactMapping(software);
    if (result) {
      this.cache.set(cacheKey, result);
      return result;
    }

    // 2. Try normalized name match in mapping table
    result = await this.findNormalizedMapping(software);
    if (result) {
      this.cache.set(cacheKey, result);
      return result;
    }

    // 3. Try direct match in VulnerabilitySoftware
    result = await this.findDirectMatch(software);
    if (result) {
      this.cache.set(cacheKey, result);
      return result;
    }

    // 4. Try fuzzy match using name patterns
    result = await this.findFuzzyMatch(software);
    if (result) {
      this.cache.set(cacheKey, result);
      return result;
    }

    // No match found
    this.cache.set(cacheKey, null);
    return null;
  }

  /**
   * Resolve multiple software items in batch
   *
   * @param softwareList - List of software from agent
   * @returns Map of software name to resolution
   */
  async resolveCpeBatch(
    softwareList: AgentSoftware[]
  ): Promise<Map<string, CpeResolution | null>> {
    const results = new Map<string, CpeResolution | null>();

    // Process in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < softwareList.length; i += batchSize) {
      const batch = softwareList.slice(i, i + batchSize);
      const resolutions = await Promise.all(
        batch.map(sw => this.resolveCpe(sw))
      );

      batch.forEach((sw, idx) => {
        results.set(sw.name, resolutions[idx]);
      });
    }

    return results;
  }

  /**
   * Find exact match in CpeMapping table
   */
  private async findExactMapping(software: AgentSoftware): Promise<CpeResolution | null> {
    const mapping = await prisma.cpeMapping.findFirst({
      where: {
        agentName: { equals: software.name, mode: 'insensitive' },
        isActive: true,
        OR: [
          { agentVendor: software.vendor },
          { agentVendor: null },
        ],
        AND: [
          {
            OR: [
              { platform: software.platform },
              { platform: 'all' },
              { platform: null },
            ],
          },
        ],
      },
      orderBy: [
        { confidence: 'desc' },
        { agentVendor: 'desc' }, // Prefer matches with vendor
      ],
    });

    if (mapping) {
      return {
        cpeVendor: mapping.cpeVendor,
        cpeProduct: mapping.cpeProduct,
        confidence: mapping.confidence,
        source: 'mapping_table',
        mappingId: mapping.id,
      };
    }

    return null;
  }

  /**
   * Find match using normalized name
   */
  private async findNormalizedMapping(software: AgentSoftware): Promise<CpeResolution | null> {
    const normalizedName = this.normalizeSoftwareName(software.name);

    // Names shorter than 3 chars are too ambiguous to match reliably
    if (normalizedName.length < 3) {
      return null;
    }

    const mapping = await prisma.cpeMapping.findFirst({
      where: {
        isActive: true,
        OR: [
          { agentName: { equals: normalizedName, mode: 'insensitive' } },
          { cpeProduct: { equals: normalizedName, mode: 'insensitive' } },
        ],
      },
      orderBy: { confidence: 'desc' },
    });

    if (mapping) {
      return {
        cpeVendor: mapping.cpeVendor,
        cpeProduct: mapping.cpeProduct,
        confidence: mapping.confidence * 0.9, // Slightly lower confidence for normalized match
        source: 'normalized_match',
        mappingId: mapping.id,
      };
    }

    return null;
  }

  /**
   * Find direct match in VulnerabilitySoftware table
   */
  private async findDirectMatch(software: AgentSoftware): Promise<CpeResolution | null> {
    const normalizedName = this.normalizeSoftwareName(software.name);

    // Names shorter than 3 chars are too ambiguous to match reliably
    if (normalizedName.length < 3) {
      return null;
    }

    const vulnSoftware = await prisma.vulnerabilitySoftware.findFirst({
      where: {
        OR: [
          { cpeProduct: { equals: normalizedName, mode: 'insensitive' } },
          { name: { equals: normalizedName, mode: 'insensitive' } },
        ],
        cpeVendor: { not: null },
        cpeProduct: { not: null },
      },
      select: {
        cpeVendor: true,
        cpeProduct: true,
      },
    });

    if (vulnSoftware?.cpeVendor && vulnSoftware?.cpeProduct) {
      return {
        cpeVendor: vulnSoftware.cpeVendor,
        cpeProduct: vulnSoftware.cpeProduct,
        confidence: 0.7,
        source: 'direct_match',
      };
    }

    return null;
  }

  /**
   * Find fuzzy match using name patterns
   *
   * DISABLED: Substring matching against ~998K VulnerabilitySoftware rows
   * produces far too many false positives. Examples of bad matches:
   *   libmd0 -> apple/mdnsresponder, gh -> ghostscript, bolt -> boltcms/bolt
   * Software that doesn't match in stages 1-3 goes to UnmatchedSoftware for review.
   */
  private async findFuzzyMatch(_software: AgentSoftware): Promise<CpeResolution | null> {
    return null;
  }

  /**
   * Normalize software name for matching
   *
   * Transformations:
   * - Lowercase
   * - Remove common prefixes (lib, python3-, node-, etc.)
   * - Remove version suffixes
   * - Remove separators
   */
  normalizeSoftwareName(name: string): string {
    let normalized = name.toLowerCase().trim();

    // Step 1: Remove language-specific prefixes (NOT 'lib' — handled last)
    const prefixes = [
      'python3-',
      'python-',
      'node-',
      'ruby-',
      'perl-',
      'php-',
      'golang-',
      'rust-',
      'dotnet-',
    ];

    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix) && normalized.length > prefix.length + 2) {
        normalized = normalized.substring(prefix.length);
        break;
      }
    }

    // Step 2: Remove trailing version numbers (e.g., libssl3 -> libssl, libjpeg8 -> libjpeg)
    normalized = normalized.replace(/[-._]*[0-9]+(\.[0-9]+)*$/, '');

    // Step 3: Remove common suffixes
    const suffixes = ['-dev', '-bin', '-common', '-data', '-doc', '-utils'];
    for (const suffix of suffixes) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.substring(0, normalized.length - suffix.length);
        break;
      }
    }

    // Step 4: Conditionally strip 'lib' prefix — only if the remainder is >= 3 chars
    // This prevents libmd0 -> "md" (2 chars) or libc-bin -> "c" (1 char)
    if (normalized.startsWith('lib') && normalized.length > 3) {
      const withoutLib = normalized.substring(3);
      if (withoutLib.length >= 3) {
        normalized = withoutLib;
      }
    }

    // Clean up trailing separators
    normalized = normalized.replace(/[-_\s]+$/, '').trim();

    return normalized || name.toLowerCase();
  }

  /**
   * Get cache key for software
   */
  private getCacheKey(software: AgentSoftware): string {
    return `${software.name}|${software.vendor || ''}|${software.platform || ''}`;
  }

  /**
   * Clear the resolution cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastCacheClear = Date.now();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Add a new mapping to the database
   *
   * @param mapping - Mapping data
   * @returns Created mapping
   */
  async addMapping(mapping: {
    agentName: string;
    agentVendor?: string | null;
    platform?: string | null;
    packageManager?: string | null;
    cpeVendor: string;
    cpeProduct: string;
    confidence?: number;
    source?: string;
    notes?: string;
  }): Promise<{ id: string }> {
    const created = await prisma.cpeMapping.create({
      data: {
        agentName: mapping.agentName,
        agentVendor: mapping.agentVendor,
        platform: mapping.platform,
        packageManager: mapping.packageManager,
        cpeVendor: mapping.cpeVendor,
        cpeProduct: mapping.cpeProduct,
        confidence: mapping.confidence ?? 1.0,
        source: mapping.source ?? 'manual',
        notes: mapping.notes,
        isActive: true,
      },
      select: { id: true },
    });

    // Clear cache to pick up new mapping
    this.clearCache();

    return created;
  }

  /**
   * Bulk add mappings
   *
   * @param mappings - Array of mapping data
   * @returns Number of mappings created
   */
  async addMappingsBulk(
    mappings: Array<{
      agentName: string;
      agentVendor?: string | null;
      platform?: string | null;
      packageManager?: string | null;
      cpeVendor: string;
      cpeProduct: string;
      confidence?: number;
      source?: string;
    }>
  ): Promise<number> {
    const result = await prisma.cpeMapping.createMany({
      data: mappings.map(m => ({
        agentName: m.agentName,
        agentVendor: m.agentVendor,
        platform: m.platform,
        packageManager: m.packageManager,
        cpeVendor: m.cpeVendor,
        cpeProduct: m.cpeProduct,
        confidence: m.confidence ?? 1.0,
        source: m.source ?? 'seed',
        isActive: true,
      })),
      skipDuplicates: true,
    });

    this.clearCache();

    return result.count;
  }

  /**
   * Update AssetSoftware with resolved CPE data
   *
   * @param assetSoftwareId - ID of AssetSoftware record
   * @param resolution - CPE resolution
   * @param normalizedVersion - Normalized version string
   */
  async updateAssetSoftwareCpe(
    assetSoftwareId: string,
    resolution: CpeResolution,
    version: string | null
  ): Promise<void> {
    await prisma.assetSoftware.update({
      where: { id: assetSoftwareId },
      data: {
        cpeVendor: resolution.cpeVendor,
        cpeProduct: resolution.cpeProduct,
        cpeMappingId: resolution.mappingId,
        matchConfidence: resolution.confidence,
        normalizedVersion: normalizeVersion(version),
      },
    });
  }

  /**
   * Get all active mappings (for admin/export)
   */
  async getAllMappings(): Promise<
    Array<{
      id: string;
      agentName: string;
      agentVendor: string | null;
      platform: string | null;
      cpeVendor: string;
      cpeProduct: string;
      confidence: number;
      source: string;
    }>
  > {
    return prisma.cpeMapping.findMany({
      where: { isActive: true },
      select: {
        id: true,
        agentName: true,
        agentVendor: true,
        platform: true,
        cpeVendor: true,
        cpeProduct: true,
        confidence: true,
        source: true,
      },
      orderBy: [{ agentName: 'asc' }],
    });
  }

  /**
   * Delete a mapping
   */
  async deleteMapping(id: string): Promise<void> {
    await prisma.cpeMapping.update({
      where: { id },
      data: { isActive: false },
    });
    this.clearCache();
  }
}

// Export singleton instance
export const cpeMappingService = new CpeMappingService();
