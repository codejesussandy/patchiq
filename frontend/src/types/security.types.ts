// Security & Compliance Types
// Based on contracts/schemas/security.schema.json

// Encryption Types
export type EncryptionType = 'BitLocker' | 'FileVault' | 'LUKS' | 'VeraCrypt' | 'None' | 'Unknown';

export type EncryptionStatusType =
  | 'FullyEncrypted'
  | 'PartiallyEncrypted'
  | 'EncryptionInProgress'
  | 'DecryptionInProgress'
  | 'NotEncrypted'
  | 'Suspended'
  | 'Unknown';

export type ProtectionStatus = 'On' | 'Off' | 'Unknown';

export type DriveEncryption = {
  mountPoint: string;
  encrypted: boolean;
  encryptionMethod?: string;
  encryptionPercentage?: number;
  status: EncryptionStatusType;
  protectionStatus?: ProtectionStatus;
  recoveryKeyBackedUp?: boolean;
};

export type EncryptionStatus = {
  driveEncryptionEnabled: boolean;
  encryptionType: EncryptionType;
  drives?: DriveEncryption[];
  tpmEnabled?: boolean;
  tpmVersion?: string;
};

// Firewall Types
export type FirewallProfileName = 'Domain' | 'Private' | 'Public' | 'All';
export type FirewallAction = 'Allow' | 'Block' | 'NotConfigured';

export type FirewallProfile = {
  name: FirewallProfileName;
  enabled: boolean;
  defaultInboundAction?: FirewallAction;
  defaultOutboundAction?: FirewallAction;
};

export type FirewallStatus = {
  enabled: boolean;
  productName?: string;
  profiles?: FirewallProfile[];
  activeProfile?: string;
  stealthModeEnabled?: boolean;
  blockAllIncoming?: boolean;
  loggingEnabled?: boolean;
};

// Antivirus Types
export type ScanType = 'Quick' | 'Full' | 'Custom' | 'Unknown';
export type ScanResult = 'Clean' | 'ThreatsFound' | 'InProgress' | 'Failed' | 'Unknown';

export type AntivirusProduct = {
  name: string;
  vendor?: string;
  version?: string;
  enabled?: boolean;
  realTimeProtection?: boolean;
  definitionVersion?: string;
  definitionDate?: string;
  definitionAge?: string;
  lastScanDate?: string;
  lastScanType?: ScanType;
  lastScanResult?: ScanResult;
  threatsDetected?: number;
  quarantinedItems?: number;
};

export type AntivirusStatus = {
  installed: boolean;
  products?: AntivirusProduct[];
  xdrInstalled?: boolean;
  xdrProductName?: string;
};

// Local User Types
export type LocalUser = {
  username: string;
  fullName?: string;
  sid?: string;
  uid?: number;
  isAdmin?: boolean;
  isBuiltIn?: boolean;
  isEnabled?: boolean;
  isLocked?: boolean;
  passwordRequired?: boolean;
  passwordLastSet?: string;
  passwordAge?: string;
  passwordExpires?: string;
  passwordNeverExpires?: boolean;
  lastLogon?: string;
  groups?: string[];
};

export type UserAccounts = {
  localUsers?: LocalUser[];
  localAdminCount?: number;
  localAdminAccounts?: string[];
  guestAccountEnabled?: boolean;
  autoLoginEnabled?: boolean;
  autoLoginUser?: string;
};

// Patch Status Types (for security context)
export type PatchSeverity = 'Critical' | 'Important' | 'Moderate' | 'Low' | 'Unspecified';

export type MissingPatch = {
  id: string;
  kbNumber?: string;
  title: string;
  severity: PatchSeverity;
  releaseDate?: string;
  rebootRequired?: boolean;
};

export type SecurityPatchStatus = {
  lastScanDate?: string;
  lastScanRelative?: string;
  pendingUpdates?: number;
  criticalUpdates?: number;
  securityUpdates?: number;
  otherUpdates?: number;
  pendingReboot?: boolean;
  lastUpdateInstalled?: string;
  windowsUpdateEnabled?: boolean;
  autoUpdateEnabled?: boolean;
  missingPatches?: MissingPatch[];
};

// Complete Security Compliance Type
export type SecurityCompliance = {
  collectedAt: string;
  encryption?: EncryptionStatus;
  firewall?: FirewallStatus;
  antivirus?: AntivirusStatus;
  userAccounts?: UserAccounts;
  patchStatus?: SecurityPatchStatus;
  secureBootEnabled?: boolean;
  uacEnabled?: boolean;
  sipEnabled?: boolean;
  gatekeeperEnabled?: boolean;
  screenLockEnabled?: boolean;
  screenLockTimeout?: number;
  remoteDesktopEnabled?: boolean;
  sshEnabled?: boolean;
};

// Export all types
export type {
  DriveEncryption as SecurityDriveEncryption,
  FirewallProfile as SecurityFirewallProfile,
  AntivirusProduct as SecurityAntivirusProduct,
  LocalUser as SecurityLocalUser,
  MissingPatch as SecurityMissingPatch,
};
