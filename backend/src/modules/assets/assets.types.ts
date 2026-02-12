import type { AssetStatus, OperationalStatus } from '@shared/types';

// Re-export shared enum types
export type { AssetStatus, OperationalStatus } from '@shared/types';

// Internal-only type alias
export type OsType = 'WINDOWS' | 'MACOS' | 'LINUX';

// Re-export shared API types (with local name aliases where needed)
export type { AgentStatusInfo as AgentStatus } from '@shared/types';
export type {
  AssetCostInfo,
  AssetProcurementInfo,
  AssetResponse,
  AssetCreateInput,
  AssetUpdateInput,
  AssetFilters,
  CategoryResponse,
  CategoryCreateInput,
  CategoryUpdateInput,
  SubCategoryResponse,
  SubCategoryCreateInput,
  SubCategoryUpdateInput,
  TagResponse,
  TagCreateInput,
  TagUpdateInput,
  AssetLifeCycle,
  DepreciationPoint,
  BiosInfo,
  ProcessorInfo,
  BaseBoardInfo,
  StorageInfo,
  MemoryInfo,
  NetworkAdapterInfo,
  BatteryInfo,
  GraphicsCardInfo,
  SoftwareLicenseInfo,
  ApplicationInfo,
  ServiceInfo,
  StartupProgramInfo,
  AntivirusProduct,
  NetworkAdapterDetail,
  MonitorInfo,
  UsbDeviceInfo,
  PrinterInfo,
  AudioDeviceInfo,
  BluetoothDeviceInfo,
  DriveTelemetry,
  TelemetryHistory,
  TelemetryDataPoint,
  SystemErrors,
  AssetAuditLog,
  AssetAlertResponse,
  SoftwareInventoryResponse,
  SoftwareLicenseResponse,
  SoftwareLicenseCreateInput,
  SoftwareLicenseUpdateInput,
  OSLicenseResponse,
  OSLicenseCreateInput,
  OSLicenseUpdateInput,
  AssetPatchStatus,
  PatchSummary,
  AssetRelatedPatch,
  AssetDeploymentResponse,
  AssetPatchesResponse,
  AssetDeploymentsResponse,
} from '@shared/types';

// Re-export shared types with local name aliases (service uses shorter names)
export type { AssetHardwareResponse as AssetHardware } from '@shared/types';
export type { AssetSoftwareResponse as AssetSoftware } from '@shared/types';
export type { AssetSecurityResponse as AssetSecurity } from '@shared/types';
export type { AssetNetworkResponse as AssetNetwork } from '@shared/types';
export type { AssetPeripheralsResponse as AssetPeripherals } from '@shared/types';
export type { AssetTelemetryResponse as AssetTelemetry } from '@shared/types';

// Internal type (extends shared TagResponse)
import type { TagResponse } from '@shared/types';
export interface TagWithCountResponse extends TagResponse {
  assetCount: number;
}
