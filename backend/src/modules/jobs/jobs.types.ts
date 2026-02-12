// Re-export shared API types
export type {
  JobListQuery,
  SoftwareCatalogQuery,
  ConfigCatalogQuery,
  DeploymentQuery,
  DeploymentTaskResponse,
} from '@shared/types';

// ============================================
// Internal model types (full DB response shapes, not in shared)
// ============================================

export interface PatchJob {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: 'SCHEDULE' | 'INSTANT';
  configType: 'INSTALL' | 'ROLLBACK';
  scope: 'GLOBAL' | 'GROUP' | 'ENDPOINT';
  endpoints: string[];
  patches: string[];
  deploymentPolicy: string | null;
  retryCount: number;
  batchSize: number | null;
  notifyTo: string[];
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdOn: string;
}

export interface VulnerabilityJob {
  id: string;
  jobId: string;
  name: string;
  description: string | null;
  scope: 'GLOBAL' | 'GROUP' | 'ENDPOINT';
  endpoints: string[];
  scanType: 'INSTANT' | 'SCHEDULED';
  scheduleDate: string | null;
  scheduleTime: string | null;
  recurrence: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
  scheduledTime: string | null;
  lastRun: string | null;
  nextRun: string | null;
  createdBy: string | null;
  createdOn: string;
}

export interface VulnerabilityDBSync {
  scanJobInterval: number;
  scanJobUnit: 'HOUR' | 'DAY' | 'WEEK';
  databaseSyncTime: string;
  lastSync: string | null;
  totalCVE: number;
}

export interface SoftwareDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string | null;
  deploymentType: 'INSTALL' | 'UNINSTALL' | 'UPGRADE';
  selectionType: 'APPLICATION' | 'BUNDLE';
  selectedItems: string[];
  scope: 'ALL' | 'WINDOWS' | 'MAC' | 'LINUX';
  endpoints: string[];
  deploymentPolicy: string | null;
  retryCount: number;
  notifyTo: 'ADMIN' | 'USER';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string | null;
  createdOn: string;
}

export interface ConfigCatalogItem {
  id: string;
  configurationId: string;
  name: string;
  os: 'WINDOWS' | 'MAC' | 'LINUX';
  description: string | null;
  tags: string[];
  configurationType: 'COMMAND' | 'POLICY' | 'SCRIPT';
  architecture: 'X64' | 'X86' | 'ARM64';
  isRemediation: boolean;
  commandType: 'POWERSHELL' | 'CMD' | 'BASH' | 'SH';
  command: string;
  createdBy: string | null;
  createdOn: string;
}

export interface ConfigBundle {
  id: string;
  bundleId: string;
  bundleName: string;
  os: 'WINDOWS' | 'MAC' | 'LINUX';
  description: string | null;
  configurations: string[];
  createdBy: string | null;
  createdOn: string;
}

export interface ConfigDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string | null;
  selectionType: 'CONFIGURATION' | 'BUNDLE';
  selectedItems: string[];
  scope: 'ALL' | 'WINDOWS' | 'MAC' | 'LINUX';
  endpoints: string[];
  deploymentPolicy: string | null;
  retryCount: number;
  notifyTo: 'ADMIN' | 'USER';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string | null;
  createdOn: string;
}

export interface DeploymentTask {
  id: string;
  deploymentId: string;
  endpoint: {
    name: string;
    os: string;
    status: string;
  };
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
  createdBy: string | null;
  lastUpdated: string;
  createdOn: string;
}

export interface DeploymentPolicy {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: 'SCHEDULE' | 'INSTANT';
  supportedModule: 'ALL' | 'PATCH' | 'UPDATE' | 'SECURITY';
  relatedType: 'NO_RELATION' | 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';
  createdBy: string | null;
  createdOn: string;
}
