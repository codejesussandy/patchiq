import { PaginationParams } from '@shared/types';

// ============================================
// Severity and Status Types
// ============================================

export type PatchSeverity = 'CRITICAL' | 'High' | 'Medium' | 'Low' | 'UNSPECIFIED';
export type PatchOS = 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux';
export type TestStatus = 'Not Tested' | 'Tested' | 'Test Failed';
export type TestResult = 'passed' | 'failed';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type DeploymentType = 'INSTALL' | 'ROLLBACK';
export type DeploymentStage = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'INSTALLED' | 'PENDING';
export type ApplicationType = 'ALL' | 'INCLUDE' | 'EXCLUDE';
export type ScopeType = 'ALL_COMPUTERS' | 'SCOPE' | 'SPECIFIC_GROUPS';

// ============================================
// Patch Interfaces
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
  releaseDate?: string | null;
  releasedOn?: string | null;
  downloadedOn?: string | null;
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

export interface CreatePatchInput {
  software: string;
  title?: string;
  description?: string;
  severity?: PatchSeverity;
  category?: string;
  vendor?: string;
  product?: string;
  os?: PatchOS;
  platform?: string;
  architecture?: string;
  kbNumber?: string;
  bulletinId?: string;
  releaseDate?: string;
  referenceUrl?: string;
  rebootRequired?: boolean;
  supportUninstallation?: boolean;
  languagesSupported?: string[];
  tags?: string[];
  cveNumbers?: string[];
}

export interface UpdatePatchInput {
  software?: string;
  title?: string;
  description?: string;
  severity?: PatchSeverity;
  category?: string;
  testStatus?: TestStatus;
  approvalStatus?: ApprovalStatus;
  tags?: string[];
}

export interface PatchListParams extends PaginationParams {
  severity?: string;
  os?: string;
  category?: string;
  testStatus?: string;
  approvalStatus?: string;
  search?: string;
}

// ============================================
// Test/Approval Workflow Interfaces
// ============================================

export interface TestPatchInput {
  status: TestResult;
  notes?: string;
  testEnvironment?: string;
}

export interface RejectPatchInput {
  reason: string;
  notes?: string;
}

// ============================================
// Patch Related Data Interfaces
// ============================================

export interface AffectedProduct {
  id: string;
  softwareName: string;
  version?: string | null;
  vendor?: string | null;
  installedOn: number;
  platform?: string | null;
}

export interface FileDetail {
  id: string;
  fileName: string;
  version?: string | null;
  size?: string | null;
  path?: string | null;
}

export interface PatchVulnerability {
  id: string;
  cveNumber: string;
  severity?: string | null;
  description?: string | null;
  publishedDate?: string | null;
}

export interface PatchEndpoint {
  id: string;
  name: string;
  os?: string | null;
  status: string;
  lastSeen?: string | null;
}

export interface ScanEndpointsInput {
  scope: 'All End Points' | 'Specific Groups';
  endpointIds?: string[];
}

// ============================================
// Deployment Interfaces
// ============================================

export interface Deployment {
  id: string;
  name: string;
  deploymentId?: string | null;
  description?: string | null;
  type: string;
  configType: string;
  scope: string;
  status: string;
  stage: string;
  pending: number;
  succeeded: number;
  failed: number;
  targetGroups: string[];
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  patches?: Patch[];
}

export interface CreateDeploymentInput {
  name: string;
  description?: string;
  type: DeploymentType;
  configType?: 'INSTALL' | 'ROLLBACK';
  scope?: 'Global' | 'Group' | 'Endpoint';
  schedule?: string;
  targetGroups?: string[];
  patches: string[]; // patch IDs
}

export interface DeploymentPreview {
  deploymentId: string;
  patches: Patch[];
  targetEndpoints: number;
  estimatedDuration: string;
}

// ============================================
// Patch Test Interfaces
// ============================================

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

export interface CreatePatchTestInput {
  name: string;
  description?: string;
  applicationType?: ApplicationType;
  applications?: string[];
  scope?: ScopeType;
  computers?: string[];
  groups?: string[];
}

// ============================================
// Zero Touch Config Interfaces
// ============================================

export interface AutoDeploymentRules {
  severity: string[];
  approvalRequired: boolean;
  schedule: string;
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
  autoDeploymentRules: AutoDeploymentRules;
  status: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateZeroTouchConfigInput {
  name: string;
  description?: string;
  applicationType?: ApplicationType;
  applications?: string[];
  scope?: ScopeType;
  computers?: string[];
  groups?: string[];
  autoDeploymentRules: AutoDeploymentRules;
}

export interface UpdateZeroTouchConfigInput {
  name?: string;
  description?: string;
  applicationType?: ApplicationType;
  applications?: string[];
  scope?: ScopeType;
  computers?: string[];
  groups?: string[];
  autoDeploymentRules?: AutoDeploymentRules;
  status?: 'Active' | 'Inactive' | 'Draft';
}
