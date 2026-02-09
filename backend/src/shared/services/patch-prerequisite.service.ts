/**
 * Patch Prerequisite Validation Service
 *
 * Checks if assets meet patch applicability prerequisites
 * Prevents deploying patches to systems that don't meet requirements
 *
 * Commercial patch manager behavior:
 * - WSUS: Applicability rules (registry, file version, features)
 * - RHEL: NEVRA constraints, channel subscriptions
 * - Jamf: OS version prerequisites, architecture checks
 */

import { prisma } from '@/db/client';

/**
 * Patch prerequisites structure
 */
export interface PatchPrerequisites {
  /** Minimum OS version (e.g., "10.0.19041" for Windows 10 20H1) */
  minOsVersion?: string;

  /** Maximum OS version (e.g., "10.0.22631" for Windows 11 23H2) */
  maxOsVersion?: string;

  /** Required OS editions (e.g., ["Pro", "Enterprise"], not "Home") */
  osEditions?: string[];

  /** Required system architectures (e.g., ["x86_64"], not "arm64") */
  architectures?: string[];

  /** Required installed features/roles (e.g., ["IIS", "SQL Server"]) */
  requiredFeatures?: string[];

  /** Excluded features (patch conflicts with these) */
  excludedFeatures?: string[];

  /** Custom prerequisite description for display */
  description?: string;
}

/**
 * Prerequisite check result
 */
export interface PrerequisiteCheckResult {
  /** Whether the asset meets all prerequisites */
  applicable: boolean;

  /** Reasons why not applicable (if applicable is false) */
  reasons: string[];

  /** Which prerequisites passed */
  passed: string[];
}

/**
 * Patch Prerequisite Service
 */
export class PatchPrerequisiteService {
  /**
   * Check if an asset meets patch prerequisites
   *
   * @param assetId - Asset to check
   * @param prerequisites - Patch prerequisites
   * @returns Check result with applicability and reasons
   */
  async checkPrerequisites(
    assetId: string,
    prerequisites: PatchPrerequisites | null
  ): Promise<PrerequisiteCheckResult> {
    const result: PrerequisiteCheckResult = {
      applicable: true,
      reasons: [],
      passed: [],
    };

    // No prerequisites = always applicable
    if (!prerequisites || Object.keys(prerequisites).length === 0) {
      result.passed.push('No prerequisites defined');
      return result;
    }

    // Get asset details
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        os: true,
        osVersion: true,
        osEdition: true,
        architecture: true,
        installedFeatures: true,
      },
    });

    if (!asset) {
      result.applicable = false;
      result.reasons.push('Asset not found');
      return result;
    }

    // Check OS version range
    if (prerequisites.minOsVersion && asset.osVersion) {
      if (this.compareVersions(asset.osVersion, prerequisites.minOsVersion) < 0) {
        result.applicable = false;
        result.reasons.push(
          `OS version ${asset.osVersion} is below minimum ${prerequisites.minOsVersion}`
        );
      } else {
        result.passed.push(`OS version ${asset.osVersion} meets minimum ${prerequisites.minOsVersion}`);
      }
    }

    if (prerequisites.maxOsVersion && asset.osVersion) {
      if (this.compareVersions(asset.osVersion, prerequisites.maxOsVersion) > 0) {
        result.applicable = false;
        result.reasons.push(
          `OS version ${asset.osVersion} exceeds maximum ${prerequisites.maxOsVersion}`
        );
      } else {
        result.passed.push(`OS version ${asset.osVersion} within maximum ${prerequisites.maxOsVersion}`);
      }
    }

    // Check OS edition
    if (prerequisites.osEditions && prerequisites.osEditions.length > 0) {
      if (!asset.osEdition) {
        result.applicable = false;
        result.reasons.push('OS edition not detected on asset');
      } else if (!prerequisites.osEditions.some(ed =>
        asset.osEdition!.toLowerCase().includes(ed.toLowerCase())
      )) {
        result.applicable = false;
        result.reasons.push(
          `OS edition "${asset.osEdition}" not in required list: ${prerequisites.osEditions.join(', ')}`
        );
      } else {
        result.passed.push(`OS edition "${asset.osEdition}" matches requirement`);
      }
    }

    // Check architecture
    if (prerequisites.architectures && prerequisites.architectures.length > 0) {
      if (!asset.architecture) {
        result.applicable = false;
        result.reasons.push('Architecture not detected on asset');
      } else if (!prerequisites.architectures.includes(asset.architecture)) {
        result.applicable = false;
        result.reasons.push(
          `Architecture "${asset.architecture}" not in required list: ${prerequisites.architectures.join(', ')}`
        );
      } else {
        result.passed.push(`Architecture "${asset.architecture}" matches requirement`);
      }
    }

    // Check required features
    if (prerequisites.requiredFeatures && prerequisites.requiredFeatures.length > 0) {
      const assetFeatures = asset.installedFeatures || [];
      const missingFeatures = prerequisites.requiredFeatures.filter(
        feature => !assetFeatures.some(af =>
          af.toLowerCase().includes(feature.toLowerCase())
        )
      );

      if (missingFeatures.length > 0) {
        result.applicable = false;
        result.reasons.push(
          `Missing required features: ${missingFeatures.join(', ')}`
        );
      } else {
        result.passed.push(`All required features installed: ${prerequisites.requiredFeatures.join(', ')}`);
      }
    }

    // Check excluded features (conflicts)
    if (prerequisites.excludedFeatures && prerequisites.excludedFeatures.length > 0) {
      const assetFeatures = asset.installedFeatures || [];
      const conflictingFeatures = prerequisites.excludedFeatures.filter(
        feature => assetFeatures.some(af =>
          af.toLowerCase().includes(feature.toLowerCase())
        )
      );

      if (conflictingFeatures.length > 0) {
        result.applicable = false;
        result.reasons.push(
          `Patch conflicts with installed features: ${conflictingFeatures.join(', ')}`
        );
      } else {
        result.passed.push('No conflicting features detected');
      }
    }

    return result;
  }

  /**
   * Check prerequisites for multiple assets (batch operation)
   *
   * @param assetIds - Assets to check
   * @param prerequisites - Patch prerequisites
   * @returns Map of assetId to check result
   */
  async checkPrerequisitesBatch(
    assetIds: string[],
    prerequisites: PatchPrerequisites | null
  ): Promise<Map<string, PrerequisiteCheckResult>> {
    const results = new Map<string, PrerequisiteCheckResult>();

    // Process in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < assetIds.length; i += batchSize) {
      const batch = assetIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (assetId) => ({
          assetId,
          result: await this.checkPrerequisites(assetId, prerequisites),
        }))
      );

      batchResults.forEach(({ assetId, result }) => {
        results.set(assetId, result);
      });
    }

    return results;
  }

  /**
   * Get assets that meet patch prerequisites
   *
   * @param patchId - Patch to check
   * @returns Array of applicable asset IDs
   */
  async getApplicableAssets(patchId: string): Promise<string[]> {
    const patch = await prisma.patch.findUnique({
      where: { id: patchId },
      select: { prerequisites: true },
    });

    if (!patch) {
      return [];
    }

    const prerequisites = patch.prerequisites as PatchPrerequisites | null;

    // If no prerequisites, all assets are applicable
    if (!prerequisites || Object.keys(prerequisites).length === 0) {
      const assets = await prisma.asset.findMany({
        select: { id: true },
      });
      return assets.map(a => a.id);
    }

    // Get all assets and check prerequisites
    const assets = await prisma.asset.findMany({
      select: { id: true },
    });

    const applicableAssets: string[] = [];

    for (const asset of assets) {
      const result = await this.checkPrerequisites(asset.id, prerequisites);
      if (result.applicable) {
        applicableAssets.push(asset.id);
      }
    }

    return applicableAssets;
  }

  /**
   * Simple semantic version comparison
   *
   * @param v1 - First version
   * @param v2 - Second version
   * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(p => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map(p => parseInt(p, 10) || 0);

    const maxLen = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLen; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  }

  /**
   * Generate human-readable prerequisite summary
   *
   * @param prerequisites - Patch prerequisites
   * @returns Human-readable string
   */
  static formatPrerequisites(prerequisites: PatchPrerequisites | null): string {
    if (!prerequisites || Object.keys(prerequisites).length === 0) {
      return 'No prerequisites';
    }

    const parts: string[] = [];

    if (prerequisites.minOsVersion) {
      parts.push(`OS >= ${prerequisites.minOsVersion}`);
    }
    if (prerequisites.maxOsVersion) {
      parts.push(`OS <= ${prerequisites.maxOsVersion}`);
    }
    if (prerequisites.osEditions && prerequisites.osEditions.length > 0) {
      parts.push(`Edition: ${prerequisites.osEditions.join(' or ')}`);
    }
    if (prerequisites.architectures && prerequisites.architectures.length > 0) {
      parts.push(`Arch: ${prerequisites.architectures.join(' or ')}`);
    }
    if (prerequisites.requiredFeatures && prerequisites.requiredFeatures.length > 0) {
      parts.push(`Requires: ${prerequisites.requiredFeatures.join(', ')}`);
    }
    if (prerequisites.excludedFeatures && prerequisites.excludedFeatures.length > 0) {
      parts.push(`Conflicts: ${prerequisites.excludedFeatures.join(', ')}`);
    }
    if (prerequisites.description) {
      parts.push(prerequisites.description);
    }

    return parts.join(' | ');
  }
}

// Export singleton instance
export const patchPrerequisiteService = new PatchPrerequisiteService();
