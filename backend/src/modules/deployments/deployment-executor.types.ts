// Re-export shared API types
export type {
  SoftwareInstallPayload,
  SoftwareUninstallPayload,
  PatchInstallPayload,
  CreateSoftwareDeploymentOptions,
  CreateConfigDeploymentOptions,
  CreatePatchDeploymentOptions,
  DeploymentCreationResult,
  TaskStatusUpdate,
  ScriptManifest,
  ScriptBundlePayload,
} from '@shared/types';

// Keep internal constant (not a type — runtime value)
export const COMMAND_TYPES = {
  // Legacy software commands (package manager based)
  SOFTWARE_INSTALL: 'software_install',
  SOFTWARE_UNINSTALL: 'software_uninstall',
  SOFTWARE_UPGRADE: 'software_upgrade',

  // Hub-centric commands (script bundle based)
  HUB_INSTALL: 'hub_install',
  HUB_UPDATE: 'hub_update',
  HUB_ROLLBACK: 'hub_rollback',
  HUB_UNINSTALL: 'hub_uninstall',
  SCRIPT_BUNDLE: 'script_bundle',
  SCRIPT_INLINE: 'script_inline',

  // Patch commands (bundle-based only — package managers removed)
  HUB_PATCH_INSTALL: 'hub_patch_install',
  HUB_PATCH_ROLLBACK: 'hub_patch_rollback',
  HUB_PATCH_VERIFY: 'hub_patch_verify',

  // Utility commands
  CHECK_REBOOT: 'check_reboot_required',
  ROLLBACK_EXECUTE: 'rollback_execute',
  ROLLBACK_LIST: 'rollback_list',
} as const;

export type CommandType = typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES];
