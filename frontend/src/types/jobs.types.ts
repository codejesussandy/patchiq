// Jobs Types
// Centralized type definitions for all job-related data

import type {
  DeploymentScope,
  DeploymentStatus,
  VulnerabilityScanType,
  Recurrence,
  VulnerabilityJobStatus,
  ApplicationLocationType,
  ApplicationType,
  SoftwareDeploymentType,
  SelectionType,
  NotifyTo,
  ConfigurationType,
  CommandType,
  Architecture,
  DeploymentTaskStatus,
  SupportedModule,
  RelatedType,
  PatchOS,
} from '@shared/types';

// Re-export shared enums for backward compatibility
export type {
  DeploymentScope,
  DeploymentStatus,
  VulnerabilityScanType,
  Recurrence,
  VulnerabilityJobStatus,
  ApplicationLocationType,
  ApplicationType,
  SoftwareDeploymentType,
  SelectionType,
  NotifyTo,
  ConfigurationType,
  CommandType,
  Architecture,
  DeploymentTaskStatus,
  SupportedModule,
  RelatedType,
};

// Re-export shared API types
export type {
  JobListQuery,
  SoftwareCatalogQuery,
  ConfigCatalogQuery,
  DeploymentQuery,
  DeploymentTaskResponse,
  DeploymentPolicyResponse,
} from '@shared/types';

// ============ Common Types ============

export type JobScope = DeploymentScope;
// UI-specific OS display labels (not the same as shared OSFamily enum)
export type OSTypeLabel = 'Windows' | 'Mac' | 'Linux';
// Alias for shared Architecture type
export type ArchitectureType = Architecture;

// ============ Patch Jobs ============

export interface PatchJob {
  id: string;
  policyId: string;
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  configType: 'INSTALL' | 'ROLLBACK';
  scope: DeploymentScope;
  endpoints?: string[];
  patches: string[];
  deploymentPolicy: string;
  retryCount: number;
  batchSize?: number;
  notifyTo?: string[];
  createdBy: string;
  createdOn: string;
}

// ============ Vulnerability Jobs ============

export interface VulnerabilityJob {
  id: string;
  jobId: string;
  name: string;
  description: string;
  scope: DeploymentScope;
  endpoints?: string[];
  scanType: VulnerabilityScanType;
  scheduleDate?: string;
  scheduleTime?: string;
  recurrence?: Recurrence;
  status: VulnerabilityJobStatus;
  scheduledTime?: string;
  lastRun?: string;
  nextRun?: string;
  createdBy: string;
  createdOn: string;
}

export interface VulnerabilityDBSync {
  scanJobInterval: number;
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;
  lastSync?: string;
  totalCVE: number;
}

// ============ Software Jobs ============

export interface SoftwareDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string;
  deploymentType: SoftwareDeploymentType;
  selectionType: SelectionType;
  selectedItems: string[];
  scope: 'all' | 'windows' | 'mac' | 'linux';
  endpoints?: string[];
  deploymentPolicy: string;
  retryCount: number;
  notifyTo: NotifyTo;
  status: DeploymentStatus;
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
}

// ============ Configuration Jobs ============

export interface ConfigCatalogItem {
  id: string;
  configurationId: string;
  name: string;
  os: OSTypeLabel;
  description: string;
  tags?: string[];
  configurationType: ConfigurationType;
  architecture: ArchitectureType;
  isRemediation: boolean;
  commandType: CommandType;
  command: string;
  createdBy: string;
  createdOn: string;
}

export interface ConfigBundle {
  id: string;
  bundleId: string;
  bundleName: string;
  os: OSTypeLabel;
  description: string;
  configurations: string[];
  createdBy: string;
  createdOn: string;
}

export interface ConfigDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string;
  selectionType: 'configuration' | 'bundle';
  selectedItems: string[];
  scope: 'all' | 'windows' | 'mac' | 'linux';
  endpoints?: string[];
  deploymentPolicy: string;
  retryCount: number;
  notifyTo: NotifyTo;
  status: DeploymentStatus;
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
}

// ============ Deployment Tasks ============

export type EndpointOS = PatchOS;
// UI-specific task status (uses SUCCESS instead of COMPLETED in shared DeploymentTaskStatus)
export type TaskStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';

export interface DeploymentTask {
  id: number;
  deploymentId: string;
  endpoint: {
    name: string;
    os: EndpointOS;
    status: string;
  };
  name: string;
  status: TaskStatus;
  createdBy: string;
  lastUpdated: string;
  createdOn: string;
}

// ============ Deployment Policies ============

export interface DeploymentPolicy {
  id: string;
  policyId: string;
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  supportedModule: SupportedModule;
  relatedType: RelatedType;
  createdBy: string;
  createdOn: string;
}

// ============ API Response Types ============

export interface JobListResponse<T> {
  data: T[];
  total: number;
}
