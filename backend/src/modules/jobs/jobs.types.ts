// ============================================
// Patch Jobs Types
// ============================================

export interface PatchJob {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: 'SCHEDULE' | 'INSTANT';
  configType: 'INSTALL' | 'ROLLBACK';
  scope: 'Global' | 'Group' | 'Endpoint';
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

// ============================================
// Vulnerability Jobs Types
// ============================================

export interface VulnerabilityJob {
  id: string;
  jobId: string;
  name: string;
  description: string | null;
  scope: 'Global' | 'Group' | 'Endpoint';
  endpoints: string[];
  scanType: 'instant' | 'scheduled';
  scheduleDate: string | null;
  scheduleTime: string | null;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly' | null;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
  scheduledTime: string | null;
  lastRun: string | null;
  nextRun: string | null;
  createdBy: string | null;
  createdOn: string;
}

export interface VulnerabilityDBSync {
  scanJobInterval: number;
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;
  lastSync: string | null;
  totalCVE: number;
}

// ============================================
// Software Jobs Types
// ============================================

export interface SoftwareCatalogItem {
  id: string;
  deploymentId: string;
  applicationName: string;
  description: string | null;
  tags: string[];
  os: 'Windows' | 'Mac' | 'Linux';
  version: string;
  applicationLocationType: 'Local Directory' | 'Network Share' | 'URL';
  installationCommand: string | null;
  uninstallationCommand: string | null;
  upgradeCommand: string | null;
  iconUrl: string | null;
  selfService: boolean;
  architecture: 'x64' | 'x86' | 'ARM64';
  applicationType: 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP';
  applicationFileUrl: string | null;
  createdBy: string | null;
  createdOn: string;
}

export interface SoftwareBundle {
  id: string;
  bundleId: string;
  bundleName: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description: string | null;
  applications: string[];
  createdBy: string | null;
  createdOn: string;
}

export interface SoftwareDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string | null;
  deploymentType: 'install' | 'uninstall' | 'upgrade';
  selectionType: 'application' | 'bundle';
  selectedItems: string[];
  scope: 'all' | 'windows' | 'mac' | 'linux';
  endpoints: string[];
  deploymentPolicy: string | null;
  retryCount: number;
  notifyTo: 'admin' | 'user';
  stage: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string | null;
  createdOn: string;
}

// ============================================
// Configuration Jobs Types
// ============================================

export interface ConfigCatalogItem {
  id: string;
  configurationId: string;
  name: string;
  os: 'Windows' | 'Mac' | 'Linux';
  description: string | null;
  tags: string[];
  configurationType: 'command' | 'policy' | 'script';
  architecture: 'x64' | 'x86' | 'ARM64';
  isRemediation: boolean;
  commandType: 'powershell' | 'cmd' | 'bash' | 'sh';
  command: string;
  createdBy: string | null;
  createdOn: string;
}

export interface ConfigBundle {
  id: string;
  bundleId: string;
  bundleName: string;
  os: 'Windows' | 'Mac' | 'Linux';
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
  selectionType: 'configuration' | 'bundle';
  selectedItems: string[];
  scope: 'all' | 'windows' | 'mac' | 'linux';
  endpoints: string[];
  deploymentPolicy: string | null;
  retryCount: number;
  notifyTo: 'admin' | 'user';
  stage: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string | null;
  createdOn: string;
}

// ============================================
// Deployment Tasks Types
// ============================================

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

// ============================================
// Deployment Policies Types
// ============================================

export interface DeploymentPolicy {
  id: string;
  policyId: string;
  name: string;
  description: string | null;
  type: 'SCHEDULE' | 'INSTANT';
  supportedModule: 'All' | 'Patch' | 'Update' | 'Security';
  relatedType: 'No Relation' | 'Critical' | 'Important' | 'Optional';
  createdBy: string | null;
  createdOn: string;
}

// ============================================
// Query Types
// ============================================

export interface JobListQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  scope?: string;
  search?: string;
}

export interface SoftwareCatalogQuery {
  page?: number;
  limit?: number;
  os?: string;
  search?: string;
}

export interface ConfigCatalogQuery {
  page?: number;
  limit?: number;
  os?: string;
  search?: string;
}

export interface DeploymentQuery {
  page?: number;
  limit?: number;
  stage?: string;
}
