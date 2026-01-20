// Jobs Types
// Centralized type definitions for all job-related data

// ============ Common Types ============

export type JobScope = 'Global' | 'Group' | 'Endpoint';
export type OSType = 'Windows' | 'Mac' | 'Linux';
export type ArchitectureType = 'x64' | 'x86' | 'ARM64';
export type DeploymentStage = 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';

// ============ Patch Jobs ============

export interface PatchJob {
  id: string;
  policyId: string;
  name: string;
  description: string;
  type: 'SCHEDULE' | 'INSTANT';
  configType: 'INSTALL' | 'ROLLBACK';
  scope: JobScope;
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
  scope: JobScope;
  endpoints?: string[];
  scanType: 'instant' | 'scheduled';
  scheduleDate?: string;
  scheduleTime?: string;
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly';
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
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

export type ApplicationLocationType = 'Local Directory' | 'Network Share' | 'URL';
export type ApplicationType = 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP';

export interface SoftwareCatalogItem {
  id: string;
  deploymentId: string;
  applicationName: string;
  description: string;
  tags?: string[];
  os: OSType;
  version: string;
  applicationLocationType: ApplicationLocationType;
  installationCommand?: string;
  uninstallationCommand?: string;
  upgradeCommand?: string;
  iconUrl?: string;
  selfService: boolean;
  architecture: ArchitectureType;
  applicationType: ApplicationType;
  applicationFileUrl?: string;
  createdBy: string;
  createdOn: string;
}

export interface SoftwareBundle {
  id: string;
  bundleId: string;
  bundleName: string;
  os: OSType;
  description: string;
  applications: string[];
  createdBy: string;
  createdOn: string;
}

export interface SoftwareDeployment {
  id: string;
  deploymentId: string;
  deploymentName: string;
  description: string;
  deploymentType: 'install' | 'uninstall' | 'upgrade';
  selectionType: 'application' | 'bundle';
  selectedItems: string[];
  scope: 'all' | 'windows' | 'mac' | 'linux';
  endpoints?: string[];
  deploymentPolicy: string;
  retryCount: number;
  notifyTo: 'admin' | 'user';
  stage: DeploymentStage;
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
}

// ============ Configuration Jobs ============

export type ConfigurationType = 'command' | 'policy' | 'script';
export type CommandType = 'powershell' | 'cmd' | 'bash' | 'sh';

export interface ConfigCatalogItem {
  id: string;
  configurationId: string;
  name: string;
  os: OSType;
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
  os: OSType;
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
  notifyTo: 'admin' | 'user';
  stage: DeploymentStage;
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
}

// ============ Deployment Tasks ============

export type EndpointOS = 'Windows' | 'MacOS' | 'Ubuntu' | 'Linux';
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
  supportedModule: 'All' | 'Patch' | 'Update' | 'Security';
  relatedType: 'No Relation' | 'Critical' | 'Important' | 'Optional';
  createdBy: string;
  createdOn: string;
}

// ============ API Response Types ============

export interface JobListResponse<T> {
  data: T[];
  total: number;
}
