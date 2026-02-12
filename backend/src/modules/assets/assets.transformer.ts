/**
 * Asset Transformation Layer
 *
 * Transforms raw agent data to API response format and API request data to database format.
 * This file implements the API transformation layer (Option C) from MISMATCH_DECISIONS.md.
 *
 * Key responsibilities:
 * 1. Transform DB records to frontend-expected format
 * 2. Merge rawPayload JSON with summary fields
 * 3. Compute derived fields (operationalStatus, age, etc.)
 * 4. Handle type conversions (BigInt → string, Decimal → string)
 *
 * @see MISMATCH_DECISIONS.md for detailed field mappings
 * @see DATA_FLOW_MAP.md for data flow documentation
 */

import type { Prisma } from '@prisma/client';
import { calculateAgentStatus } from '@shared/utils/agent-status';

// ============================================
// Type Definitions
// ============================================

/**
 * Database record types (from Prisma)
 */
type AssetHardwareDB = Prisma.AssetHardwareGetPayload<object>;
type AssetDB = Prisma.AssetGetPayload<{
  include: { agent: true; hardware: true; location: true };
}>;
type AgentTelemetryDB = Prisma.AgentTelemetryGetPayload<object>;

/**
 * API Response types (for frontend)
 * These match the frontend's expected types from asset.types.ts
 */
export interface HardwareResponse {
  collectedAt: string;
  systemIdentity?: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    uuid?: string;
    sku?: string;
  };
  bios?: {
    vendor: string;
    version: string;
    releaseDate?: string;
  };
  processor?: {
    name: string;
    manufacturer: string;
    architecture?: string;
    coreCount: number;
    threadCount: number;
    clockSpeedMHz?: number;
  };
  memory?: {
    totalPhysicalGB: number;
    usedSlots: number;
    modules?: Array<{
      slot: string;
      capacity: string;
      type: string;
    }>;
  };
  storage?: Array<{
    name: string;
    type: string;
    capacityGB: number;
    freeSpaceGB: number;
  }>;
  graphicsCards?: Array<{
    name: string;
    memoryMB?: number;
  }>;
}

export interface OwnerInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  department?: string | null;
}

export interface ProcurementInfo {
  amcCost: string | null;
  amcExpiryDate: string | null;
  amcVendor: string | null;
  endOfLife: string | null;
  expiryDate: string | null;
  warrantyExpiryDate: string | null;
  warrantyYearAndMonth: string | null;
}

export interface CostInfo {
  age: string | null;
  cost: string | null;
  currency: string | null;
  currentCost: string | null;
  depreciationType: string | null;
  invoiceNumber: string | null;
  purchaseDate: string | null;
  salvageValue: string | null;
}

export interface PerformanceInfo {
  cpuUtilization: number;
  memoryUtilization: number;
  diskUtilization: number;
  systemUptime: string;
}

export interface AssetDetailResponse {
  // Base fields (from Asset)
  id: string;
  name: string;
  type: string;
  status: string;
  serialNumber: string | null;
  assetTag: string | null;
  os: string | null;
  osVersion: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;

  // Computed/derived fields
  assetId: string;
  operationalStatus: 'CONNECTED' | 'DISCONNECTED';
  operationalStatusSince: string | null;
  operationalStatusDuration: string | null;

  // Nested objects (transformed from DB + telemetry)
  owner: OwnerInfo;
  processor: { name: string; cores: number; speed: string };
  ram: { size: string; type: string };
  storage: { size: string; type: string };
  performance: PerformanceInfo;
  procurement: ProcurementInfo;
  cost: CostInfo;
}

// ============================================
// Hardware Transformations
// ============================================

/**
 * Transform AssetHardware database record to API response format.
 *
 * If rawPayload exists (from agent), return it directly as it matches frontend types.
 * Otherwise, construct a response from summary fields.
 *
 * @param dbRecord - AssetHardware record from Prisma
 * @returns HardwareResponse for frontend consumption
 *
 * @example
 * const hardware = await prisma.assetHardware.findUnique({ where: { assetId } });
 * const response = transformHardwareForAPI(hardware);
 * return res.json(response);
 */
export function transformHardwareForAPI(
  dbRecord: AssetHardwareDB | null
): HardwareResponse | null {
  if (!dbRecord) return null;

  // If we have raw payload from agent, return it directly
  // The agent's Hardware struct matches frontend's ExpandedHardware type
  if (dbRecord.rawPayload) {
    const payload: unknown = dbRecord.rawPayload;
    return payload as HardwareResponse;
  }

  // Fall back to constructing from summary fields
  return {
    collectedAt: dbRecord.collectedAt?.toISOString() || new Date().toISOString(),
    systemIdentity: {
      manufacturer: dbRecord.manufacturer || 'Unknown',
      model: dbRecord.model || 'Unknown',
      serialNumber: dbRecord.serialNumber || 'Unknown',
      sku: dbRecord.systemSKU || undefined,
    },
    processor: {
      name: dbRecord.cpu || 'Unknown',
      manufacturer: dbRecord.cpuManufacturer || 'Unknown',
      coreCount: dbRecord.cpuCores || 0,
      threadCount: dbRecord.cpuThreads || dbRecord.cpuCores || 0,
      clockSpeedMHz: dbRecord.cpuSpeedMHz || undefined,
    },
    memory: {
      totalPhysicalGB: dbRecord.ramTotal
        ? Number(dbRecord.ramTotal) / (1024 ** 3)
        : 0,
      usedSlots: dbRecord.ramSlots || 0,
      modules: [], // Not stored in summary fields
    },
    storage: [
      {
        name: 'Primary Storage',
        type: dbRecord.diskType || 'Unknown',
        capacityGB: dbRecord.diskTotal
          ? Number(dbRecord.diskTotal) / (1024 ** 3)
          : 0,
        freeSpaceGB: dbRecord.diskFree
          ? Number(dbRecord.diskFree) / (1024 ** 3)
          : 0,
      },
    ],
    bios: {
      vendor: dbRecord.biosVendor || 'Unknown',
      version: dbRecord.biosVersion || 'Unknown',
    },
    graphicsCards: dbRecord.gpuModel
      ? [
          {
            name: dbRecord.gpuModel,
            memoryMB: dbRecord.gpuMemoryMB || undefined,
          },
        ]
      : [],
  };
}

// ============================================
// Asset Transformations
// ============================================

/**
 * Transform Asset database record to API response format for detail views.
 *
 * Aggregates data from Asset, Agent, AssetHardware, and AgentTelemetry
 * to produce the complete AssetDetailResponse expected by frontend.
 *
 * @param dbRecord - Asset record with included relations
 * @param telemetry - Latest telemetry record (optional)
 * @returns AssetDetailResponse for frontend consumption
 *
 * @example
 * const asset = await prisma.asset.findUnique({
 *   where: { id },
 *   include: { agent: true, hardware: true, location: true }
 * });
 * const telemetry = await getLatestTelemetry(asset.agent?.id);
 * const response = transformAssetForAPI(asset, telemetry);
 */
export function transformAssetForAPI(
  dbRecord: AssetDB | null,
  telemetry?: AgentTelemetryDB | null
): AssetDetailResponse | null {
  if (!dbRecord) return null;

  // Generate display assetId from assetTag or UUID prefix
  const assetId =
    dbRecord.assetTag || `ASSET-${dbRecord.id.slice(0, 8).toUpperCase()}`;

  // Determine operational status from agent (calculated from lastHeartbeat age)
  const computedStatus = calculateAgentStatus(dbRecord.agent);
  const isConnected = computedStatus === 'CONNECTED';
  const operationalStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';
  const operationalStatusSince = dbRecord.agent?.lastHeartbeat?.toISOString() || null;

  return {
    // Base fields
    id: dbRecord.id,
    name: dbRecord.name,
    type: dbRecord.type,
    status: dbRecord.status,
    serialNumber: dbRecord.serialNumber,
    assetTag: dbRecord.assetTag,
    os: dbRecord.os,
    osVersion: dbRecord.osVersion,
    ipAddress: dbRecord.ipAddress,
    macAddress: dbRecord.macAddress,
    hostname: dbRecord.hostname,

    // Computed fields
    assetId,
    operationalStatus,
    operationalStatusSince,
    operationalStatusDuration: formatDuration(dbRecord.agent?.lastHeartbeat),

    // Owner (from denormalized fields)
    owner: {
      name: dbRecord.ownerName,
      email: dbRecord.ownerEmail,
      phone: dbRecord.ownerPhone,
      department: dbRecord.ownerDepartment,
    },

    // Hardware summaries (from AssetHardware relation)
    processor: {
      name: dbRecord.hardware?.cpu || 'Unknown',
      cores: dbRecord.hardware?.cpuCores || 0,
      speed: dbRecord.hardware?.cpuSpeedMHz
        ? `${dbRecord.hardware.cpuSpeedMHz} MHz`
        : 'N/A',
    },
    ram: {
      size: formatBytes(dbRecord.hardware?.ramTotal),
      type: dbRecord.hardware?.ramType || 'Unknown',
    },
    storage: {
      size: formatBytes(dbRecord.hardware?.diskTotal),
      type: dbRecord.hardware?.diskType || 'Unknown',
    },

    // Performance (from latest telemetry)
    performance: {
      cpuUtilization: telemetry?.cpuUsage || 0,
      memoryUtilization: telemetry?.memoryUsage || 0,
      diskUtilization: telemetry?.diskUsage || 0,
      systemUptime: formatUptime(telemetry?.uptime),
    },

    // Procurement info
    procurement: {
      amcCost: dbRecord.amcCost,
      amcExpiryDate: dbRecord.amcExpiryDate?.toISOString() || null,
      amcVendor: dbRecord.amcVendor,
      endOfLife: dbRecord.endOfLife?.toISOString() || null,
      expiryDate: dbRecord.warrantyExpiry?.toISOString() || null,
      warrantyExpiryDate: dbRecord.warrantyExpiry?.toISOString() || null,
      warrantyYearAndMonth: calculateWarrantyRemaining(dbRecord.warrantyExpiry),
    },

    // Cost info
    cost: {
      age: calculateAge(dbRecord.purchaseDate),
      cost: dbRecord.purchaseCost?.toString() || null,
      currency: dbRecord.currency,
      currentCost: dbRecord.currentValue?.toString() || null,
      depreciationType: dbRecord.depreciationType,
      invoiceNumber: dbRecord.invoiceNumber,
      purchaseDate: dbRecord.purchaseDate?.toISOString() || null,
      salvageValue: dbRecord.salvageValue?.toString() || null,
    },
  };
}

// ============================================
// Telemetry Transformations
// ============================================

/**
 * Transform AgentTelemetry to API response format.
 *
 * If rawPayload exists, merge it with summary fields.
 * Otherwise, return summary fields only.
 *
 * @param dbRecord - AgentTelemetry record from Prisma
 * @returns Telemetry response for frontend
 */
export function transformTelemetryForAPI(
  dbRecord: AgentTelemetryDB | null
): Record<string, unknown> | null {
  if (!dbRecord) return null;

  // If we have raw payload from agent, return it
  if (dbRecord.rawPayload) {
    return dbRecord.rawPayload as Record<string, unknown>;
  }

  // Fall back to summary fields
  return {
    timestamp: dbRecord.timestamp.toISOString(),
    cpuUsage: dbRecord.cpuUsage,
    memoryUsage: dbRecord.memoryUsage,
    diskUsage: dbRecord.diskUsage,
    uptime: dbRecord.uptime,
    networkInBps: dbRecord.networkInBps?.toString(),
    networkOutBps: dbRecord.networkOutBps?.toString(),
    processCount: dbRecord.processCount,
    pendingReboot: dbRecord.pendingReboot,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format bytes to human-readable string (e.g., "16 GB")
 */
function formatBytes(bytes: bigint | null | undefined): string {
  if (!bytes) return 'Unknown';
  const num = Number(bytes);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = num;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format uptime in seconds to human-readable string (e.g., "5 days, 3 hours")
 */
function formatUptime(seconds: number | null | undefined): string {
  if (!seconds) return 'Unknown';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} min`);

  return parts.join(', ') || 'Just started';
}

/**
 * Format duration since a timestamp (e.g., "2 hours ago")
 */
function formatDuration(since: Date | null | undefined): string | null {
  if (!since) return null;

  const now = new Date();
  const diff = now.getTime() - since.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Calculate age from purchase date (e.g., "2 years, 3 months")
 */
function calculateAge(purchaseDate: Date | null | undefined): string | null {
  if (!purchaseDate) return null;

  const now = new Date();
  const years = now.getFullYear() - purchaseDate.getFullYear();
  const months = now.getMonth() - purchaseDate.getMonth();

  const totalMonths = years * 12 + months;
  const displayYears = Math.floor(totalMonths / 12);
  const displayMonths = totalMonths % 12;

  const parts: string[] = [];
  if (displayYears > 0) parts.push(`${displayYears} year${displayYears !== 1 ? 's' : ''}`);
  if (displayMonths > 0) parts.push(`${displayMonths} month${displayMonths !== 1 ? 's' : ''}`);

  return parts.join(', ') || 'Less than a month';
}

/**
 * Calculate warranty remaining (e.g., "1 year, 6 months")
 */
function calculateWarrantyRemaining(warrantyExpiry: Date | null | undefined): string | null {
  if (!warrantyExpiry) return null;

  const now = new Date();
  if (warrantyExpiry < now) return 'Expired';

  const months = (warrantyExpiry.getFullYear() - now.getFullYear()) * 12 +
    (warrantyExpiry.getMonth() - now.getMonth());

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (remainingMonths > 0) parts.push(`${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`);

  return parts.join(', ') || 'Less than a month';
}
