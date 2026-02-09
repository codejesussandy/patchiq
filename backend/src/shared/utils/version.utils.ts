/**
 * Version Normalization Utilities
 *
 * Phase 3: Vulnerability Correlation Improvement
 *
 * Handles version string normalization and comparison for accurate
 * vulnerability matching between agent-reported versions and NVD versions.
 *
 * Problem: Agent reports "3.0.13-1ubuntu3.1", NVD has "3.0.14"
 * Solution: Normalize to "3.0.13" for accurate comparison
 */

/**
 * Normalize version string by removing distro-specific suffixes
 *
 * Handles common patterns:
 * - Debian/Ubuntu: "3.0.13-1ubuntu3.1" → "3.0.13"
 * - RHEL/CentOS: "3.0.13-1.el8" → "3.0.13"
 * - Fedora: "3.0.13-1.fc38" → "3.0.13"
 * - Amazon Linux: "3.0.13-1.amzn2" → "3.0.13"
 * - Epoch prefix: "1:8.5.0-1" → "8.5.0"
 * - Debian additions: "2.4.57+deb12u1" → "2.4.57"
 * - Git commits: "1.2.3-g1234abc" → "1.2.3"
 * - Release candidates: "1.2.3-rc1" → "1.2.3" (optional)
 *
 * @param version - Raw version string from agent or package manager
 * @param options - Normalization options
 * @returns Normalized version string, or null if input is null/undefined
 */
export function normalizeVersion(
  version: string | null | undefined,
  options: NormalizeOptions = {}
): string | null {
  if (!version) return null;

  const { keepPreRelease = false, keepBuildMetadata = false } = options;

  let normalized = version.trim();

  // Remove epoch prefix (common in Debian/RPM): "1:8.5.0" → "8.5.0"
  if (normalized.includes(':')) {
    const parts = normalized.split(':');
    // Only remove if the prefix looks like an epoch (numeric)
    if (parts.length === 2 && /^\d+$/.test(parts[0])) {
      normalized = parts[1];
    }
  }

  // Remove distro-specific suffixes
  // Pattern: version[-+~.]distro_suffix
  const distroPatterns = [
    // Debian/Ubuntu: -1ubuntu3.1, -1build1, -0ubuntu0.22.04.1
    /[-+](\d+)?(ubuntu|build|deb)\d*(\.\d+)*(\.\d+)?$/i,
    // RHEL/CentOS: .el8, .el8_5, .el9
    /\.el\d+(_\d+)?.*$/i,
    // Fedora: .fc38, .fc39
    /\.fc\d+.*$/i,
    // Amazon Linux: .amzn2, .amzn2023
    /\.amzn\d+.*$/i,
    // SUSE: .suse, .sles15
    /\.(suse|sles)\d*.*$/i,
    // Alpine: -r0, -r1
    /-r\d+$/i,
    // Arch Linux: -1, -2 (simple release number)
    /-\d+$/,
    // Generic: +dfsg, ~dfsg (Debian Free Software Guidelines)
    /[+~]dfsg\d*.*$/i,
    // Git suffixes: -g1234abc, +g1234abc
    /[-+]g[0-9a-f]{7,}.*$/i,
  ];

  for (const pattern of distroPatterns) {
    normalized = normalized.replace(pattern, '');
  }

  // Handle pre-release versions if not keeping them
  if (!keepPreRelease) {
    // Remove: -rc1, -beta1, -alpha1, -pre1, -dev
    normalized = normalized.replace(/[-._](rc|beta|alpha|pre|dev|snapshot)\d*$/i, '');
  }

  // Handle build metadata (semver +build suffix)
  if (!keepBuildMetadata) {
    // Remove: +build123, +20240101
    const plusIndex = normalized.indexOf('+');
    if (plusIndex > 0) {
      normalized = normalized.substring(0, plusIndex);
    }
  }

  // Final cleanup: remove trailing dots or dashes
  normalized = normalized.replace(/[-._]+$/, '');

  // Validate we still have a valid version
  if (!normalized || !/^\d/.test(normalized)) {
    // Return original if normalization removed too much
    return version;
  }

  return normalized;
}

/**
 * Options for version normalization
 */
export interface NormalizeOptions {
  /** Keep pre-release suffixes like -rc1, -beta1 (default: false) */
  keepPreRelease?: boolean;
  /** Keep build metadata like +build123 (default: false) */
  keepBuildMetadata?: boolean;
}

/**
 * Compare two version strings
 *
 * @param v1 - First version
 * @param v2 - Second version
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string | null, v2: string | null): number {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;

  // Normalize both versions first
  const norm1 = normalizeVersion(v1) || v1;
  const norm2 = normalizeVersion(v2) || v2;

  // Split into parts and compare
  const parts1 = parseVersionParts(norm1);
  const parts2 = parseVersionParts(norm2);

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
 * Parse version string into numeric parts
 *
 * Handles mixed alphanumeric parts: "1.2.3a" → [1, 2, 3]
 * (Letters are stripped for comparison)
 */
function parseVersionParts(version: string): number[] {
  return version.split(/[._-]/).map(part => {
    // Extract leading number from part
    const match = part.match(/^(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  });
}

/**
 * Check if a version is within a vulnerable range
 *
 * @param version - Installed version to check
 * @param versionStart - Start of vulnerable range (null = no lower bound)
 * @param versionStartType - "including" or "excluding"
 * @param versionEnd - End of vulnerable range (null = no upper bound)
 * @param versionEndType - "including" or "excluding"
 * @returns true if version is within the vulnerable range
 */
export function isVersionInRange(
  version: string | null,
  versionStart: string | null,
  versionStartType: string | null,
  versionEnd: string | null,
  versionEndType: string | null
): boolean {
  if (!version) return false;

  const normalizedVersion = normalizeVersion(version);
  if (!normalizedVersion) return false;

  // If neither boundary is set, we have no version constraint data —
  // cannot determine vulnerability, so default to not vulnerable (defense-in-depth)
  if (!versionStart && !versionEnd) return false;

  // Check start boundary
  if (versionStart) {
    const cmp = compareVersions(normalizedVersion, versionStart);

    if (versionStartType === 'including') {
      // Version must be >= versionStart
      if (cmp < 0) return false;
    } else if (versionStartType === 'excluding') {
      // Version must be > versionStart
      if (cmp <= 0) return false;
    }
  }

  // Check end boundary
  if (versionEnd) {
    const cmp = compareVersions(normalizedVersion, versionEnd);

    if (versionEndType === 'including') {
      // Version must be <= versionEnd
      if (cmp > 0) return false;
    } else if (versionEndType === 'excluding') {
      // Version must be < versionEnd
      if (cmp >= 0) return false;
    }
  }

  return true;
}

/**
 * Check if a version is vulnerable (below the fixed version)
 *
 * Simple helper for the common case where we just have a fixed version.
 *
 * @param installedVersion - Version installed on the asset
 * @param fixedVersion - Version where the vulnerability was fixed
 * @returns true if installed version is vulnerable (below fixed)
 */
export function isVersionVulnerable(
  installedVersion: string | null,
  fixedVersion: string | null
): boolean {
  if (!installedVersion) return false;
  if (!fixedVersion) return true; // No fix available = assume vulnerable

  return compareVersions(installedVersion, fixedVersion) < 0;
}

/**
 * Extract the base version (major.minor.patch) from a full version string
 *
 * @param version - Full version string
 * @param depth - Number of version components to keep (default: 3)
 * @returns Base version string
 */
export function getBaseVersion(version: string | null, depth: number = 3): string | null {
  if (!version) return null;

  const normalized = normalizeVersion(version);
  if (!normalized) return null;

  const parts = normalized.split(/[._-]/).slice(0, depth);
  return parts.join('.');
}

/**
 * Check if two versions are compatible (same major.minor)
 *
 * @param v1 - First version
 * @param v2 - Second version
 * @returns true if versions share the same major.minor
 */
export function areVersionsCompatible(v1: string | null, v2: string | null): boolean {
  const base1 = getBaseVersion(v1, 2);
  const base2 = getBaseVersion(v2, 2);

  if (!base1 || !base2) return false;

  return base1 === base2;
}
