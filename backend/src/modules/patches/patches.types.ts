import { PaginationParams } from '@shared/types';

// Re-export shared enum types
export type { PatchSeverity, PatchOS, TestStatus, ApprovalStatus } from '@shared/types';
export type { ApplicationFilterType as ApplicationType, ScopeFilterType as ScopeType } from '@shared/types';
export type { DeploymentConfigType as DeploymentType } from '@shared/types';

// Internal type alias
export type TestResult = 'PASSED' | 'FAILED';

// Re-export shared API types
export type {
  CreatePatchInput,
  UpdatePatchInput,
  PatchListParams,
  TestPatchInput,
  RejectPatchInput,
  AffectedProduct,
  ScanEndpointsInput,
  CreatePatchDeploymentInput as CreateDeploymentInput,
  DeploymentPreview,
  CreatePatchTestInput,
  AutoDeploymentRules,
  CreateZeroTouchConfigInput,
  UpdateZeroTouchConfigInput,
} from '@shared/types';

// Re-export shared PatchVulnerabilityInfo with local name
export type { PatchVulnerabilityInfo as PatchVulnerability } from '@shared/types';

// ============================================
// Internal model types (not in shared — full DB response shapes)
// ============================================

export interface Patch {
  id: string;
  patchId: string;
  title: string;
  software?: string | null;
  description?: string | null;
  severity: string;
  category?: string | null;
  vendor?: string | null;
  product?: string | null;
  os?: string | null;
  osVersion?: string | null;
  platform?: string | null;
  architecture?: string | null;
  kbNumber?: string | null;
  bulletinId?: string | null;
  publishedAt?: string | null;
  size?: number | null;
  sizeFormatted?: string | null;
  downloadUrl?: string | null;
  referenceUrl?: string | null;
  rebootRequired: boolean;
  supportUninstallation: boolean;
  languagesSupported: string[];
  tags: string[];
  cveNumbers: string[];
  source?: string | null;
  status?: string | null;
  downloadStatus?: string | null;
  supersedes: string[];
  supersededBy: string[];
  operationalStatusSince?: string | null;
  endpoints: number;

  // Test/Approval workflow fields
  testStatus: string;
  testResult?: string | null;
  testedBy?: string | null;
  testedAt?: string | null;
  testNotes?: string | null;
  testEnvironment?: string | null;
  approvalStatus: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  rejectionNotes?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  name: string;
  deploymentId?: string | null;
  description?: string | null;
  type: string;
  configType: string;
  scope: string;
  status: string;
  pending: number;
  succeeded: number;
  failed: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  patches?: Patch[];
}

export interface PatchTest {
  id: string;
  name: string;
  description?: string | null;
  applicationType: string;
  applications: string[];
  scope: string;
  computers: string[];
  groups: string[];
  status: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ZeroTouchConfig {
  id: string;
  name: string;
  description?: string | null;
  applicationType: string;
  applications: string[];
  scope: string;
  computers: string[];
  groups: string[];
  autoDeploymentRules: import('@shared/types').AutoDeploymentRules;
  status: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
