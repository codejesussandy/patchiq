import type { PatchOS, PatchSeverity } from '@shared/types';
export type {
  AffectedProduct,
  PatchVulnerabilityInfo as Vulnerability,
  CreatePatchInput,
  UpdatePatchInput,
  PatchListParams,
  TestPatchInput,
  RejectPatchInput,
  CreatePatchDeploymentInput,
  DeploymentPreview,
  CreatePatchTestInput,
  AutoDeploymentRules,
  CreateZeroTouchConfigInput,
  UpdateZeroTouchConfigInput,
  ScanEndpointsInput,
  DeploymentTaskResponse,
} from '@shared/types';
import type {
  Asset,
  AssetPatchStatus,
  AssetRelatedPatch,
  AssetDeployment,
  AssetGroup,
  PatchSummary,
} from './asset.types';

// Re-export Asset types for use in patch context
export type { Asset, AssetPatchStatus, AssetRelatedPatch, AssetDeployment, AssetGroup, PatchSummary };

// Frontend Patch type (used in UI - broader than shared model)
export type Patch = {
  id: string;
  software: string;
  patchId: string;
  title?: string;
  endpoints: number;
  os: PatchOS;
  severity: PatchSeverity;
  operationalStatusSince: string;
  platform: string;
  description: string;
  category: string;
  vendor?: string;
  product?: string;
  bulletinId: string;
  kbNumber: string;
  publishedAt: string;
  rebootRequired: boolean;
  supportUninstallation: boolean;
  supportsRollback?: boolean;
  patchType?: 'UPDATE' | 'HOTFIX' | 'SERVICE_PACK' | 'DRIVER';
  architecture: string;
  referenceUrl: string;
  languagesSupported: string[];
  tags: string[];
  approvalStatus?: string;
  testStatus?: string;
  cveNumbers?: string[];
  status?: string;
  downloadStatus?: string;
  size?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUpdatedAt?: string; // @deprecated - use updatedAt
  source?: string;
  supersededBy?: string[];
  supersedes?: string[];
  // Bundle info for hub-centric deployments
  bundle?: {
    id: string;
    hasBundle: boolean;
    hasScripts: boolean;
    downloadStatus: string;
    bundleChecksum?: string;
  } | null;
};

// UI-specific types
export type AffectedSoftware = {
  id: string;
  softwareName: string;
  version: string;
  vendor: string;
  installedOn: number;
  platform: string;
};

// Re-export AgentLink type
export type { AgentLink } from './asset.types';

// Simple endpoint reference (used in patch endpoints list)
export type Endpoint = {
  id: string;
  name: string;
  os: string;
  status: string;
  lastSeen: string;
};

// Backward compatibility aliases
export type EndpointPatchStatus = AssetPatchStatus;
export type EndpointRelatedPatch = AssetRelatedPatch;
export type EndpointDeployment = AssetDeployment;

/**
 * EndpointDetails - Now unified with Asset type
 * @deprecated Use Asset type from asset.types.ts for new code.
 */
export type EndpointDetails = {
  id: string;
  name: string;
  os: string;
  osVersion: string;
  status: 'Online' | 'Offline';
  lastSeen: string;
  agentId?: string;
  agentName?: string;
  agentVersion?: string;
  agentStatus?: 'CONNECTED' | 'DISCONNECTED' | 'PENDING' | 'ERROR';
  assetId?: string;
  assetName?: string;
  groups?: AssetGroup[];
  ipAddress?: string;
  macAddress?: string;
  hostname?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  department?: string;
  owner?: string;
  patchSummary: {
    total: number;
    installed: number;
    missing: number;
    failed: number;
    pending: number;
    criticalMissing?: number;
    securityMissing?: number;
    lastScanDate: string;
    lastScanRelative?: string;
    compliancePercent?: number;
  };
  relatedPatches: AssetRelatedPatch[];
  recentDeployments: AssetDeployment[];
};

export type Deployment = {
  id: string;
  name: string;
  deploymentId: string;
  description?: string;
  type: 'INSTALL' | 'ROLLBACK';
  status: 'INSTALLED' | 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
  targetAgentIds?: string[];
  patches?: Array<{ id: string; patchId?: string }>;
  skipApprovalCheck?: boolean;
  retryCount?: number;
};

export type PatchTest = {
  id: string;
  name: string;
  description: string;
  applicationType: 'ALL' | 'INCLUDE' | 'EXCLUDE';
  applications: string[];
  scope: 'ALL_COMPUTERS' | 'SCOPE' | 'SPECIFIC_GROUPS';
  computers: string[];
  groups: string[];
  status: string;
  createdBy: string;
  createdOn: string;
};

export type ZeroTouchConfig = {
  id: string;
  name: string;
  description: string;
  applicationType: 'ALL' | 'INCLUDE' | 'EXCLUDE';
  applications: string[];
  scope: 'ALL_COMPUTERS' | 'SCOPE' | 'SPECIFIC_GROUPS';
  computers: string[];
  groups: string[];
  autoDeploymentRules: {
    severity: string[];
    approvalRequired: boolean;
    schedule: string;
  };
  status: string;
  createdBy: string;
  createdOn: string;
};
