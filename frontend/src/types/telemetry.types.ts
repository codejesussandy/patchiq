// TODO: Align with @patchiq/shared-types when API contracts are finalized
// Mismatch: agent telemetry types, not DB entities

// Real-Time Telemetry Types
// Based on contracts/schemas/telemetry.schema.json

// CPU Telemetry Types
export type CPUTelemetry = {
  usagePercent: number;
  perCoreUsage?: number[];
  userPercent?: number;
  systemPercent?: number;
  idlePercent?: number;
  loadAverage1m?: number;
  loadAverage5m?: number;
  loadAverage15m?: number;
  processCount?: number;
  threadCount?: number;
  temperature?: number;
  frequency?: number;
  throttled?: boolean;
};

// Memory Telemetry Types
// Note: usedBytes = totalBytes - freeBytes (matches Proxmox/system monitors, includes buffers/cache)
// applicationUsedBytes = totalBytes - availableBytes (memory not readily available for new apps)
export type MemoryTelemetry = {
  usagePercent: number;
  totalBytes?: number;
  usedBytes: number;              // Total - Free (what Proxmox shows, includes buffers/cache)
  availableBytes: number;         // Memory available for apps (MemAvailable)
  freeBytes?: number;             // Completely unused memory (MemFree)
  cachedBytes?: number;           // Page cache
  buffersBytes?: number;          // Kernel buffers
  applicationUsedBytes?: number;  // Total - Available (app-specific memory usage)
  usedHuman?: string;             // Human-readable used memory
  availableHuman?: string;        // Human-readable available memory
  swapUsagePercent?: number;
  swapTotalBytes?: number;
  swapUsedBytes?: number;
  swapFreeBytes?: number;
  pageFaultsPerSec?: number;
  commitPercent?: number;
};

// Disk Telemetry Types
export type DiskDriveTelemetry = {
  mountPoint?: string;
  usagePercent?: number;
  usedBytes?: number;
  freeBytes?: number;
  readBytesPerSec?: number;
  writeBytesPerSec?: number;
  readOpsPerSec?: number;
  writeOpsPerSec?: number;
  queueLength?: number;
  busyPercent?: number;
  latencyMs?: number;
};

export type DiskTelemetry = {
  drives?: DiskDriveTelemetry[];
  totalReadBytesPerSec?: number;
  totalWriteBytesPerSec?: number;
};

// Network Telemetry Types
export type NetworkInterfaceTelemetry = {
  name?: string;
  bytesSentPerSec?: number;
  bytesReceivedPerSec?: number;
  packetsSentPerSec?: number;
  packetsReceivedPerSec?: number;
  errorsIn?: number;
  errorsOut?: number;
  droppedIn?: number;
  droppedOut?: number;
  utilizationPercent?: number;
};

export type NetworkTelemetry = {
  interfaces?: NetworkInterfaceTelemetry[];
  totalBytesSentPerSec?: number;
  totalBytesReceivedPerSec?: number;
  tcpConnectionsEstablished?: number;
  tcpConnectionsActive?: number;
  latencyMs?: number;
  internetConnected?: boolean;
};

// Process Metrics Types
export type ProcessInfo = {
  pid: number;
  name: string;
  cpuPercent?: number;
  memoryPercent?: number;
  memoryBytes?: number;
  user?: string;
};

export type ProcessMetrics = {
  topByCpu?: ProcessInfo[];
  topByMemory?: ProcessInfo[];
};

// System Errors Types
export type CrashInfo = {
  timestamp: string;
  application?: string;
  errorCode?: string;
  description?: string;
};

export type BSODInfo = {
  timestamp: string;
  stopCode?: string;
  bugCheckCode?: string;
  parameter1?: string;
  parameter2?: string;
  parameter3?: string;
  parameter4?: string;
  driverName?: string;
};

export type KernelPanicInfo = {
  timestamp: string;
  panicString?: string;
};

export type SystemErrors = {
  applicationCrashCount24h?: number;
  applicationCrashCount7d?: number;
  lastCrash?: CrashInfo;
  bsodCount30d?: number;
  lastBsod?: BSODInfo;
  kernelPanicCount30d?: number;
  lastKernelPanic?: KernelPanicInfo;
  systemEventLogErrors24h?: number;
  criticalEventCount24h?: number;
};

// System Uptime Type
export type SystemUptime = {
  uptimeSeconds: number;
  uptimeHuman: string;
  bootTime?: string;
};

// Complete Telemetry Payload Type
export type TelemetryPayload = {
  timestamp: string;
  agentId?: string;
  intervalSeconds?: number;
  cpu: CPUTelemetry;
  memory: MemoryTelemetry;
  disk?: DiskTelemetry;
  network?: NetworkTelemetry;
  processes?: ProcessMetrics;
  errors?: SystemErrors;
  systemUptime?: SystemUptime;
  agentUptime?: number;
  pendingReboot?: boolean;
  batteryChargePercent?: number;
  batteryCharging?: boolean;
  onACPower?: boolean;
};

// Telemetry History Types (for charts)
export type TelemetryDataPoint = {
  timestamp: string;
  value: number;
};

export type TelemetryHistory = {
  cpu: TelemetryDataPoint[];
  memory: TelemetryDataPoint[];
  disk?: TelemetryDataPoint[];
  networkIn?: TelemetryDataPoint[];
  networkOut?: TelemetryDataPoint[];
};

// Export all types
export type {
  CPUTelemetry as TelemetryCPU,
  MemoryTelemetry as TelemetryMemory,
  DiskTelemetry as TelemetryDisk,
  NetworkTelemetry as TelemetryNetwork,
  ProcessInfo as TelemetryProcess,
  SystemErrors as TelemetryErrors,
  TelemetryPayload as TelemetryData,
};
