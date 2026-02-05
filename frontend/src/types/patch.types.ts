// TODO: Align with @patchiq/shared-types when API contracts are finalized
// Mismatch: shared uses string for severity/os; frontend has bundle fields not in shared

export type Patch = {
  id: string;
  software: string;
  patchId: string;
  endpoints: number;
  os: 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux';
  severity: 'CRITICAL' | 'High' | 'Medium' | 'Low' | 'UNSPECIFIED';
  operationalStatusSince: string;
  platform: string;
  description: string;
  category: string;
  bulletinId: string;
  kbNumber: string;
  releaseDate: string;
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
  releasedOn?: string;
  downloadedOn?: string;
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

export type AffectedProduct = {
  id: string;
  name: string;
  vendor: string;
  version: string;
};

export type AffectedSoftware = {
  id: string;
  softwareName: string;
  version: string;
  vendor: string;
  installedOn: number; // Number of endpoints with this software installed
  platform: string;
};

export type FileDetail = {
  id: string;
  fileName: string;
  version: string;
  size: string;
  path: string;
};

export type Vulnerability = {
  id: string;
  cveNumber: string;
  severity: string;
  description: string;
  publishedDate: string;
};

import type {
  Asset,
  AssetPatchStatus,
  AssetRelatedPatch,
  AssetDeployment,
  AssetGroup,
  PatchSummary,
  AgentLink,
} from './asset.types';

// Re-export Asset types for use in patch context
export type { Asset, AssetPatchStatus, AssetRelatedPatch, AssetDeployment, AssetGroup, PatchSummary, AgentLink };

// Simple endpoint reference (used in patch endpoints list)
export type Endpoint = {
  id: string;
  name: string;
  os: string;
  status: string;
  lastSeen: string;
};

// Backward compatibility aliases - these map to the new Asset types
export type EndpointPatchStatus = AssetPatchStatus;
export type EndpointRelatedPatch = AssetRelatedPatch;
export type EndpointDeployment = AssetDeployment;

/**
 * EndpointDetails - Now unified with Asset type
 *
 * This type represents an asset/endpoint with full details including
 * agent info, patch compliance, and deployment history.
 *
 * @deprecated Use Asset type from asset.types.ts for new code.
 * This type is kept for backward compatibility.
 */
export type EndpointDetails = {
  id: string;
  name: string;
  os: string;
  osVersion: string;
  status: 'Online' | 'Offline';
  lastSeen: string;

  // Agent info (flattened from AgentLink for convenience)
  agentId?: string;
  agentName?: string;
  agentVersion?: string;
  agentStatus?: 'Connected' | 'Disconnected' | 'Pending' | 'Error';

  // Asset link (when endpoint is linked to an asset)
  assetId?: string;
  assetName?: string;

  // Groups for deployment targeting
  groups?: AssetGroup[];

  // Network
  ipAddress?: string;
  macAddress?: string;
  hostname?: string;

  // Hardware summary
  manufacturer?: string;
  model?: string;
  serialNumber?: string;

  // Location
  location?: string;
  department?: string;
  owner?: string;

  // Patch summary
  patchSummary: PatchSummary;

  // Related patches for this endpoint
  relatedPatches: AssetRelatedPatch[];

  // Recent deployment history
  recentDeployments: AssetDeployment[];
};

export type Deployment = {
  id: string;
  name: string;
  deploymentId: string;
  type: 'INSTALL' | 'ROLLBACK';
  stage: 'INSTALLED' | 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
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
