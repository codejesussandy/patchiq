/**
 * Semantic Version Comparison Engine
 * Handles real-world version strings from NVD and agent software reports
 * Supports multiple version formats (standard semantic versioning, zero-padded, pre-release, Ubuntu variants)
 */

/**
 * Normalize version strings for comparison
 * Examples:
 *   "3.0.13-1ubuntu3.1" → "3.0.13"
 *   "v16.20.0" → "16.20.0"
 *   "8.8.9" → "8.8.9"
 *
 * @param raw - Raw version string from various sources
 * @returns Normalized version string (numeric parts only)
 */
export function normalizeVersion(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  // Remove leading 'v' or 'V'
  const cleaned = raw.replace(/^v/i, '');

  // Extract only the numeric parts with dots (e.g., "3.0.13" from "3.0.13-1ubuntu3.1")
  const match = cleaned.match(/^(\d+(?:\.\d+)*)/);

  return match ? match[1] : '';
}

/**
 * Parse version string into array of numeric parts for comparison
 * Examples:
 *   "3.0.13" → [3, 0, 13]
 *   "24.05" → [24, 5]
 *   "1" → [1]
 *
 * @param version - Normalized version string
 * @returns Array of numeric version parts
 */
function parseVersion(version: string): number[] {
  return version
    .split('.')
    .map((part) => parseInt(part, 10))
    .filter((num) => !isNaN(num));
}

/**
 * Compare two version strings
 * Returns -1 if a < b, 0 if a === b, 1 if a > b
 *
 * Supports:
 * - Standard semantic versioning (1.2.3)
 * - Zero-padded versions (24.05 === 24.5)
 * - Missing segments (3.0 < 3.0.1)
 *
 * @param a - First version string
 * @param b - Second version string
 * @returns -1 (a < b), 0 (a === b), or 1 (a > b)
 */
export function compareVersions(a: string, b: string): number {
  const normalizedA = normalizeVersion(a);
  const normalizedB = normalizeVersion(b);

  const partsA = parseVersion(normalizedA);
  const partsB = parseVersion(normalizedB);

  // Compare each part, treating missing parts as 0
  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    const partA = partsA[i] ?? 0;
    const partB = partsB[i] ?? 0;

    if (partA < partB) {
      return -1;
    }
    if (partA > partB) {
      return 1;
    }
  }

  return 0;
}

/**
 * Check if a version falls within a vulnerability range
 *
 * Handles NVD version ranges with inclusive/exclusive bounds:
 * - "3.0.8 >= 3.0.1 AND < 3.0.19" → vulnerable
 * - "24.05 <= 24.09" → vulnerable
 * - "25.00 > 24.09" → not vulnerable
 *
 * @param version - Version string to check
 * @param versionStart - Range start version (undefined = no lower bound)
 * @param versionStartType - "including" or "excluding" (ignored if versionStart is undefined)
 * @param versionEnd - Range end version (undefined = no upper bound)
 * @param versionEndType - "including" or "excluding" (ignored if versionEnd is undefined)
 * @returns true if version is within the vulnerability range, false otherwise
 */
export function isVersionVulnerable(
  version: string,
  versionStart?: string,
  versionStartType?: 'including' | 'excluding',
  versionEnd?: string,
  versionEndType?: 'including' | 'excluding',
): boolean {
  const normalizedVersion = normalizeVersion(version);

  // No version constraints = not vulnerable
  if (!versionStart && !versionEnd) {
    return false;
  }

  // Check lower bound
  if (versionStart) {
    const normalizedStart = normalizeVersion(versionStart);
    const comparison = compareVersions(normalizedVersion, normalizedStart);

    if (versionStartType === 'including') {
      // version >= versionStart
      if (comparison < 0) {
        return false;
      }
    } else if (versionStartType === 'excluding') {
      // version > versionStart
      if (comparison <= 0) {
        return false;
      }
    }
  }

  // Check upper bound
  if (versionEnd) {
    const normalizedEnd = normalizeVersion(versionEnd);
    const comparison = compareVersions(normalizedVersion, normalizedEnd);

    if (versionEndType === 'including') {
      // version <= versionEnd
      if (comparison > 0) {
        return false;
      }
    } else if (versionEndType === 'excluding') {
      // version < versionEnd
      if (comparison >= 0) {
        return false;
      }
    }
  }

  return true;
}
