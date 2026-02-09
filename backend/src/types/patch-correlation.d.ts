/**
 * Patch Correlation Logic Type Definitions
 *
 * This file defines TypeScript types for the complete patch correlation pipeline:
 * 1. CPE Resolution (Software → CPE identifiers)
 * 2. Vulnerability Detection (CPE → CVE matching)
 * 3. Asset Vulnerability Management
 * 4. Patch Recommendation Engine
 * 5. Deployment Lifecycle Tracking
 *
 * @module patch-correlation
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Vulnerability severity levels (CVSS-based)
 */
export type VulnerabilitySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSPECIFIED';

/**
 * Asset vulnerability status
 */
export type AssetVulnerabilityStatus = 'Open' | 'Mitigated' | 'Resolved' | 'Exception';

/**
 * Patch recommendation status lifecycle
 */
export type RecommendationStatus =
  | 'recommended'  // Initial state: patch suggested by system
  | 'accepted'     // Admin accepted recommendation
  | 'rejected'     // Admin rejected recommendation
  | 'deployed'     // Deployment in progress
  | 'verified'     // Deployment succeeded, vulnerability resolved
  | 'failed';      // Deployment failed

/**
 * Patch approval status
 */
export type PatchApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

/**
 * Patch test status
 */
export type PatchTestStatus = 'Not Tested' | 'Tested' | 'Failed';

/**
 * Deployment task status
 */
export type DeploymentTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';

/**
 * CPE resolution sources
 */
export type CpeResolutionSource =
  | 'mapping_table'      // Explicit CpeMapping entry
  | 'normalized_match'   // Normalized name match
  | 'direct_match'       // Found in VulnerabilitySoftware
  | 'fuzzy_match';       // Pattern-based match (disabled)

/**
 * Platform identifiers for CPE resolution
 */
export type Platform = 'windows' | 'darwin' | 'linux' | 'all' | null;

/**
 * Version range boundary types (from NVD CPE match)
 */
export type VersionBoundaryType = 'including' | 'excluding' | null;

// ============================================================================
// STAGE 1: CPE RESOLUTION
// ============================================================================

/**
 * Software information reported by agent
 */
export interface AgentSoftware {
  /** Software name as reported by agent (e.g., "Google Chrome") */
  name: string;
  /** Vendor name (e.g., "Google") */
  vendor?: string | null;
  /** Version string (e.g., "120.0.6099.71") */
  version?: string | null;
  /** Platform (e.g., "windows", "darwin", "linux") */
  platform?: Platform;
  /** Package manager (e.g., "apt", "brew", "msi") */
  packageManager?: string | null;
}

/**
 * Result of CPE resolution for software
 */
export interface CpeResolution {
  /** CPE vendor identifier (e.g., "google", "openssl") */
  cpeVendor: string;
  /** CPE product identifier (e.g., "chrome", "openssl") */
  cpeProduct: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** How the match was found */
  source: CpeResolutionSource;
  /** ID of the CpeMapping record used (if from mapping table) */
  mappingId?: string;
}

/**
 * CPE mapping record in database
 */
export interface CpeMapping {
  id: string;
  /** Software name as reported by agent */
  agentName: string;
  /** Vendor name from agent */
  agentVendor?: string | null;
  /** Platform-specific mapping */
  platform?: Platform;
  /** Package manager-specific mapping */
  packageManager?: string | null;
  /** Standardized CPE vendor */
  cpeVendor: string;
  /** Standardized CPE product */
  cpeProduct: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Mapping source (manual, seed, auto) */
  source: string;
  /** Optional notes */
  notes?: string | null;
  /** Active status */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Unmatched software tracking for improvement
 */
export interface UnmatchedSoftware {
  id: string;
  /** Software name that couldn't be resolved */
  name: string;
  /** Vendor name if available */
  vendor: string;
  /** Number of times seen */
  occurrences: number;
  /** Last seen timestamp */
  lastSeen: Date;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * CPE mapping service interface
 */
export interface ICpeMappingService {
  /**
   * Resolve software to CPE identifiers
   */
  resolveCpe(software: AgentSoftware): Promise<CpeResolution | null>;

  /**
   * Batch resolve multiple software items
   */
  resolveCpeBatch(softwareList: AgentSoftware[]): Promise<Map<string, CpeResolution | null>>;

  /**
   * Normalize software name for matching
   */
  normalizeSoftwareName(name: string): string;

  /**
   * Add new CPE mapping
   */
  addMapping(mapping: CreateCpeMappingInput): Promise<{ id: string }>;

  /**
   * Bulk add CPE mappings
   */
  addMappingsBulk(mappings: CreateCpeMappingInput[]): Promise<number>;

  /**
   * Update AssetSoftware with resolved CPE data
   */
  updateAssetSoftwareCpe(
    assetSoftwareId: string,
    resolution: CpeResolution,
    version: string | null
  ): Promise<void>;

  /**
   * Clear resolution cache
   */
  clearCache(): void;

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number };
}

/**
 * Input for creating CPE mapping
 */
export interface CreateCpeMappingInput {
  agentName: string;
  agentVendor?: string | null;
  platform?: Platform;
  packageManager?: string | null;
  cpeVendor: string;
  cpeProduct: string;
  confidence?: number;
  source?: string;
  notes?: string;
}

// ============================================================================
// STAGE 2: VULNERABILITY DETECTION
// ============================================================================

/**
 * Vulnerability record from CVE database
 */
export interface Vulnerability {
  id: string;
  /** CVE identifier (e.g., "CVE-2024-1234") */
  cveId: string;
  /** Vulnerability title */
  title: string;
  /** Detailed description */
  description: string;
  /** Severity level */
  severity: VulnerabilitySeverity;

  // CVSS v3.1 metrics
  cvss3BaseScore?: number | null;
  cvss3AttackVector?: string | null;
  cvss3AttackComplexity?: string | null;
  cvss3PrivilegesRequired?: string | null;
  cvss3Scope?: string | null;
  cvss3Confidentiality?: string | null;
  cvss3Integrity?: string | null;
  cvss3Availability?: string | null;
  cvss3ImpactScore?: number | null;
  cvss3VectorString?: string | null;

  // CVSS v2 metrics (legacy)
  cvss2BaseScore?: number | null;
  cvss2Severity?: string | null;

  // Exploit prediction & tracking
  /** EPSS score (0-100) - likelihood of exploitation */
  epss?: number | null;
  /** Known to be exploited (CISA KEV) */
  exploitable: boolean;
  /** Zero-day vulnerability flag */
  isZeroDay: boolean;

  // MITRE ATT&CK framework
  mitreTactic?: string | null;
  mitreTechnique?: string | null;
  mitreSubTechnique?: string | null;

  /** Calculated risk score (0-100) */
  riskScore: number;
  /** Patch available flag */
  patchAvailable: boolean;
  /** Fix recommendation */
  fixRecommendation?: string | null;

  /** Publication date */
  publishedDate: Date;
  /** Last modified date */
  lastModified: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;

  // Relations
  references?: VulnerabilityReference[];
  affectedSoftware?: VulnerabilitySoftware[];
  affectedAssets?: AssetVulnerability[];
}

/**
 * Vulnerability reference (external links)
 */
export interface VulnerabilityReference {
  id: string;
  vulnerabilityId: string;
  /** URL to reference */
  url: string;
  /** Source (NVD, CISA, vendor, etc.) */
  source: string;
  createdAt: Date;
}

/**
 * Software affected by vulnerability (from NVD configurations)
 */
export interface VulnerabilitySoftware {
  id: string;
  vulnerabilityId: string;

  // Legacy fields
  name: string;
  vendor: string;
  version?: string | null;
  fixedVersion?: string | null;

  // CPE fields (standardized)
  /** Full CPE URI (e.g., "cpe:2.3:a:google:chrome:120.0:*:*:*:*:*:*:*") */
  cpeUri: string;
  /** CPE vendor identifier */
  cpeVendor: string;
  /** CPE product identifier */
  cpeProduct: string;

  // Version range boundaries (from NVD)
  /** Lower bound version (e.g., "120.0.0") */
  versionStart?: string | null;
  /** Upper bound version (e.g., "120.0.6099.100") */
  versionEnd?: string | null;
  /** Lower bound type (including/excluding) */
  versionStartType?: VersionBoundaryType;
  /** Upper bound type (including/excluding) */
  versionEndType?: VersionBoundaryType;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Vulnerability detected on specific asset
 */
export interface AssetVulnerability {
  id: string;
  assetId: string;
  vulnerabilityId: string;
  /** Current status */
  status: AssetVulnerabilityStatus;
  /** When vulnerability was detected */
  detectedAt: Date;
  /** When vulnerability was resolved */
  resolvedAt?: Date | null;
  /** Resolution notes */
  resolutionNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  asset?: Asset;
  vulnerability?: Vulnerability;
}

/**
 * Result of vulnerability detection for software
 */
export interface VulnerabilityMatch {
  /** Matched vulnerability */
  vulnerability: Vulnerability;
  /** Software that triggered the match */
  software: AgentSoftware;
  /** Specific vulnerable version from CVE database */
  affectedVersion?: string | null;
  /** Fixed version if available */
  fixedVersion?: string | null;
  /** CPE match details if resolved */
  cpeMatch?: {
    vendor: string;
    product: string;
    confidence: number;
  } | null;
}

/**
 * CVE database service interface
 */
export interface ICveDatabaseService {
  /**
   * Sync all vulnerability databases
   */
  syncAll(): Promise<SyncResult>;

  /**
   * Check asset for vulnerabilities
   */
  checkAssetVulnerabilities(assetId: string): Promise<VulnerabilityMatch[]>;

  /**
   * Get vulnerability by CVE ID
   */
  getVulnerabilityByCVE(cveId: string): Promise<Vulnerability | null>;

  /**
   * Search vulnerabilities with filters
   */
  searchVulnerabilities(params: SearchVulnerabilitiesParams): Promise<{
    data: Vulnerability[];
    total: number;
  }>;

  /**
   * Clear all asset vulnerability records
   */
  clearAllAssetVulnerabilities(): Promise<{ deleted: number }>;

  /**
   * Clear vulnerabilities for specific asset
   */
  clearAssetVulnerabilities(assetId: string): Promise<{ deleted: number }>;

  /**
   * Get sync status
   */
  getSyncStatus(): Promise<SyncStatus>;

  /**
   * Generate patch suggestions for unpatched vulnerabilities
   */
  generatePatchSuggestions(): Promise<number>;
}

/**
 * Sync result from CVE database update
 */
export interface SyncResult {
  success: boolean;
  message: string;
  stats: Record<string, number>;
  totalCVE?: number;
}

/**
 * Sync status information
 */
export interface SyncStatus {
  lastSync?: Date | null;
  totalCVE: number;
  syncInterval: number;
  syncUnit: string;
  syncInProgress: boolean;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  progress?: {
    currentSource: string;
    currentBatch: number;
    totalBatches: number;
    processedCVEs: number;
    currentCVE: string;
    totalLoaded: number;
    estimatedTotal: number;
    startedAt: string;
    elapsedSeconds: number;
  } | null;
}

/**
 * Parameters for searching vulnerabilities
 */
export interface SearchVulnerabilitiesParams {
  keyword?: string;
  severity?: VulnerabilitySeverity[];
  exploitable?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// STAGE 3: ASSET SOFTWARE MANAGEMENT
// ============================================================================

/**
 * Software installed on asset
 */
export interface AssetSoftware {
  id: string;
  assetId: string;
  /** Software name */
  name: string;
  /** Vendor/publisher */
  vendor?: string | null;
  /** Version string */
  version?: string | null;
  /** Installation date */
  installDate?: Date | null;
  /** Installation path */
  installLocation?: string | null;
  /** Architecture (x64, arm64, etc.) */
  architecture?: string | null;
  /** Software size in bytes */
  size?: number | null;

  // CPE resolution cache
  /** Resolved CPE vendor */
  cpeVendor?: string | null;
  /** Resolved CPE product */
  cpeProduct?: string | null;
  /** CPE mapping ID used */
  cpeMappingId?: string | null;
  /** Match confidence score */
  matchConfidence?: number | null;
  /** Normalized version for matching */
  normalizedVersion?: string | null;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  asset?: Asset;
  cpeMapping?: CpeMapping | null;
}

/**
 * Asset entity (simplified for types)
 */
export interface Asset {
  id: string;
  name: string;
  hostname?: string | null;
  os?: string | null;
  osVersion?: string | null;
  // ... other asset fields
}

// ============================================================================
// STAGE 4: PATCH RECOMMENDATION ENGINE
// ============================================================================

/**
 * Patch record
 */
export interface Patch {
  id: string;
  /** Patch identifier (e.g., "KB5034441", "PW-20260208-001") */
  patchId: string;
  /** Patch title */
  title: string;
  /** Description */
  description?: string | null;

  /** Software name */
  software: string;
  /** Vendor name */
  vendor?: string | null;
  /** Product name */
  product?: string | null;
  /** Target OS */
  os?: string | null;
  /** Target OS version */
  osVersion?: string | null;

  /** Severity level */
  severity: VulnerabilitySeverity;
  /** Patch category (Security Update, Hotfix, etc.) */
  category?: string | null;

  /** Array of CVE numbers this patch fixes */
  cveNumbers: string[];

  /** Test status */
  testStatus: PatchTestStatus;
  /** Approval status */
  approvalStatus: PatchApprovalStatus;

  /** Release date */
  releaseDate?: Date | null;
  /** Operational status since */
  operationalStatusSince?: Date | null;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  bundle?: PatchBundle | null;
  recommendations?: AssetPatchRecommendation[];
}

/**
 * Patch bundle with installation scripts
 */
export interface PatchBundle {
  id: string;
  patchId: string;
  /** MinIO path to bundle file */
  bundlePath: string;
  /** SHA256 checksum */
  checksum?: string | null;
  /** Bundle size in bytes */
  size?: number | null;

  // Script content (inline if no bundle file)
  installScript?: string | null;
  rollbackScript?: string | null;
  verifyScript?: string | null;
  uninstallScript?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patch recommendation for asset
 */
export interface AssetPatchRecommendation {
  id: string;
  assetId: string;
  vulnerabilityId: string;
  patchId: string;

  /** Recommendation status */
  status: RecommendationStatus;
  /** Severity (copied from vulnerability) */
  severity: VulnerabilitySeverity;

  // Risk scoring
  /** CVSS base score (0-10) */
  cvssScore?: number | null;
  /** EPSS score (0-100) */
  epssScore?: number | null;
  /** Calculated risk score (0-100) */
  riskScore: number;

  /** Recommendation reason */
  reason?: string | null;
  /** Affected software details */
  affectedSoftware?: string | null;

  // Lifecycle timestamps
  /** When recommendation was created */
  recommendedAt: Date;
  /** When admin accepted */
  acceptedAt?: Date | null;
  /** When admin rejected */
  rejectedAt?: Date | null;
  /** Rejection reason */
  rejectionReason?: string | null;
  /** When deployment started */
  deployedAt?: Date | null;
  /** When deployment verified */
  verifiedAt?: Date | null;
  /** When deployment failed */
  failedAt?: Date | null;
  /** Failure reason */
  failureReason?: string | null;

  /** Linked deployment task ID */
  deploymentTaskId?: string | null;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  asset?: Asset;
  vulnerability?: Vulnerability;
  patch?: Patch;
  deploymentTask?: PatchDeploymentTask | null;
}

/**
 * Parameters for listing recommendations
 */
export interface ListRecommendationsParams {
  assetId?: string;
  patchId?: string;
  status?: RecommendationStatus;
  severity?: VulnerabilitySeverity[];
  sortBy?: 'riskScore' | 'severity' | 'recommendedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Dashboard statistics for recommendations
 */
export interface RecommendationDashboardStats {
  totalRecommendations: number;
  byStatus: Record<RecommendationStatus, number>;
  bySeverity: Record<VulnerabilitySeverity, number>;
  criticalAssets: number;
  topVulnerabilities: Array<{
    cveId: string;
    affectedAssets: number;
    severity: VulnerabilitySeverity;
  }>;
}

/**
 * Patch recommendation service interface
 */
export interface IAssetPatchRecommendationService {
  /**
   * Create recommendations for detected vulnerability
   */
  createRecommendationsForVulnerability(
    assetId: string,
    vulnerabilityId: string,
    software: { name: string; version: string | null }
  ): Promise<AssetPatchRecommendation[]>;

  /**
   * List recommendations with filtering
   */
  listRecommendations(
    params: ListRecommendationsParams
  ): Promise<{ data: AssetPatchRecommendation[]; total: number }>;

  /**
   * Get single recommendation details
   */
  getRecommendation(id: string): Promise<AssetPatchRecommendation | null>;

  /**
   * Accept recommendation
   */
  acceptRecommendation(id: string, reason?: string): Promise<AssetPatchRecommendation>;

  /**
   * Reject recommendation
   */
  rejectRecommendation(id: string, reason: string): Promise<AssetPatchRecommendation>;

  /**
   * Mark recommendation as deployed
   */
  deployRecommendation(id: string, deploymentTaskId: string): Promise<AssetPatchRecommendation>;

  /**
   * Mark recommendation as verified
   */
  verifyRecommendation(id: string): Promise<AssetPatchRecommendation>;

  /**
   * Mark recommendation as failed
   */
  failRecommendation(id: string, reason: string): Promise<AssetPatchRecommendation>;

  /**
   * Get dashboard statistics
   */
  getDashboardStats(organizationId: string): Promise<RecommendationDashboardStats>;

  /**
   * Link deployment task to recommendation
   */
  linkDeploymentTask(
    assetId: string,
    patchId: string,
    deploymentTaskId: string
  ): Promise<AssetPatchRecommendation | null>;

  /**
   * Update recommendation based on deployment task status
   */
  updateFromDeploymentTask(
    deploymentTaskId: string,
    taskStatus: DeploymentTaskStatus,
    errorMessage?: string
  ): Promise<void>;

  /**
   * Bulk create recommendations
   */
  createRecommendationsBulk(
    items: Array<{
      assetId: string;
      vulnerabilityId: string;
      software: { name: string; version: string | null };
    }>
  ): Promise<number>;
}

// ============================================================================
// STAGE 5: DEPLOYMENT LIFECYCLE
// ============================================================================

/**
 * Patch deployment
 */
export interface PatchDeployment {
  id: string;
  patchId: string;
  /** Deployment name/description */
  name?: string | null;

  /** Trigger type */
  triggerType: 'manual' | 'scheduled' | 'zero_touch' | 'policy';
  /** Scheduled deployment time */
  scheduledTime?: Date | null;

  /** Auto-rollback on failure */
  autoRollback: boolean;
  /** Skip approval check (for zero-touch) */
  skipApprovalCheck: boolean;

  /** Retry policy */
  retryCount: number;
  retryDelay: number;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  patch?: Patch;
  tasks?: PatchDeploymentTask[];
}

/**
 * Patch deployment task (per agent)
 */
export interface PatchDeploymentTask {
  id: string;
  deploymentId: string;
  agentId: string;

  /** Task status */
  status: DeploymentTaskStatus;

  /** Agent command ID for execution tracking */
  commandId?: string | null;

  /** Retry attempts made */
  retryAttempts: number;
  /** Rollback available flag */
  rollbackAvailable: boolean;

  /** Task start time */
  startedAt?: Date | null;
  /** Task completion time */
  completedAt?: Date | null;
  /** Error message if failed */
  errorMessage?: string | null;
  /** Exit code from agent */
  exitCode?: number | null;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  deployment?: PatchDeployment;
  agent?: Agent;
  command?: AgentCommand | null;
}

/**
 * Agent entity (simplified)
 */
export interface Agent {
  id: string;
  machineId: string;
  hostname?: string | null;
  os?: string | null;
  // ... other agent fields
}

/**
 * Agent command for execution
 */
export interface AgentCommand {
  id: string;
  agentId: string;
  commandType: string;
  payload: Record<string, unknown>;
  status: DeploymentTaskStatus;
  // ... other command fields
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  /** Number of retry attempts */
  count: number;
  /** Delay between retries in seconds */
  delaySeconds: number;
}

/**
 * Deployment creation parameters
 */
export interface CreatePatchDeploymentParams {
  patchId: string;
  targetAgentIds: string[];
  retryPolicy?: RetryPolicy;
  autoRollback?: boolean;
  skipApprovalCheck?: boolean;
  scheduledTime?: Date;
  triggerType?: 'manual' | 'scheduled' | 'zero_touch' | 'policy';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Version comparison result
 */
export type VersionComparisonResult = -1 | 0 | 1;

/**
 * Version range check function signature
 */
export type IsVersionInRangeFn = (
  version: string | null,
  versionStart: string | null,
  versionStartType: VersionBoundaryType,
  versionEnd: string | null,
  versionEndType: VersionBoundaryType
) => boolean;

/**
 * Version normalization function signature
 */
export type NormalizeVersionFn = (version: string | null | undefined) => string | null;

/**
 * Version comparison function signature
 */
export type CompareVersionsFn = (v1: string, v2: string) => VersionComparisonResult;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * CVE database sync configuration
 */
export interface VulnerabilityDBSyncConfig {
  id: string;
  /** Last successful sync timestamp */
  lastSync?: Date | null;
  /** Total CVEs in database */
  totalCVE: number;
  /** Sync job interval */
  scanJobInterval: number;
  /** Sync job unit (Hour, Day, Week) */
  scanJobUnit: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Zero-touch deployment configuration
 */
export interface ZeroTouchConfig {
  id: string;
  organizationId: string;
  /** Auto-deploy enabled */
  enabled: boolean;
  /** Severity levels to auto-deploy */
  severityLevels: VulnerabilitySeverity[];
  /** Patch categories to include */
  patchCategories?: string[];
  /** Scope (Global, Group, Endpoint) */
  scope: string;
  /** Target group IDs if scope is Group */
  targetGroupIds?: string[];
  /** Target asset IDs if scope is Endpoint */
  targetAssetIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * API response for listing items with pagination
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * API success response
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Services
  ICpeMappingService,
  ICveDatabaseService,
  IAssetPatchRecommendationService,

  // Utility functions (from version.utils)
  IsVersionInRangeFn,
  NormalizeVersionFn,
  CompareVersionsFn,
};
