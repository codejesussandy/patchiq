/**
 * Deployment Executor Types
 * Types for the deployment-to-command bridge
 */

// Software installation payload sent to agent
export interface SoftwareInstallPayload {
  name: string;
  version?: string;
  source: 'apt' | 'brew' | 'dnf' | 'yum' | 'snap' | 'flatpak' | 'pkg' | 'dmg' | 'msi' | 'exe' | 'deb' | 'rpm' | 'url';
  packageUrl?: string;       // For URL-based installs or MinIO presigned URL
  checksum?: string;
  checksumType?: 'md5' | 'sha256';
  installArgs?: string;      // Additional install arguments
  silentInstall?: boolean;
  preInstallScript?: string;
  postInstallScript?: string;
}

// Software uninstall payload sent to agent
export interface SoftwareUninstallPayload {
  name: string;
  version?: string;
  source?: string;
  uninstallCommand?: string;
}

// Patch install payload sent to agent
export interface PatchInstallPayload {
  patchId: string;
  kbNumber?: string;         // Windows KB number
  packageName?: string;      // Linux package name
  downloadUrl?: string;      // Presigned URL for patch file
  checksum?: string;
  checksumType?: 'md5' | 'sha256';
  rebootRequired?: boolean;
  forceReboot?: boolean;
}

// Options for creating a software deployment
export interface CreateSoftwareDeploymentOptions {
  name: string;
  description?: string;
  deploymentType: 'install' | 'uninstall' | 'upgrade';
  targetAgentIds: string[];
  package: SoftwareInstallPayload | SoftwareUninstallPayload;
  retryCount?: number;
  createdBy?: string;
}

// Options for creating a patch deployment
export interface CreatePatchDeploymentOptions {
  name: string;
  description?: string;
  targetAgentIds: string[];
  patches: PatchInstallPayload[];
  retryCount?: number;
  createdBy?: string;
}

// Result of deployment creation
export interface DeploymentCreationResult {
  deploymentId: string;
  tasksCreated: number;
  commandsCreated: number;
  status: 'created' | 'partial' | 'failed';
  errors?: string[];
}

// Task status update from agent
export interface TaskStatusUpdate {
  commandId: string;
  status: 'in_progress' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  errorMessage?: string;
  output?: string;
}

// Command types that map to agent executors
export const COMMAND_TYPES = {
  SOFTWARE_INSTALL: 'software_install',
  SOFTWARE_UNINSTALL: 'software_uninstall',
  PATCH_INSTALL: 'patch_install',
  PATCH_UNINSTALL: 'patch_uninstall',
  PATCH_LIST: 'patch_list',
  PATCH_INSTALL_ALL: 'patch_install_all',
  CHECK_REBOOT: 'check_reboot_required',
  ROLLBACK_EXECUTE: 'rollback_execute',
  ROLLBACK_LIST: 'rollback_list',
} as const;

export type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES];
