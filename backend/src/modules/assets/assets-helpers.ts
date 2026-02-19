import { Prisma } from '@prisma/client';
import { NotFoundError } from '@shared/errors';
import type { AssetStatus } from '@shared/types';
import { calculateAgentStatus } from '@shared/utils/agent-status';
import { prisma } from '@/db/client';
import type { AssetResponse, TagResponse } from './assets.types';

// Helper to generate asset display ID
export function generateAssetId(count: number): string {
  return `AST-${String(count + 1).padStart(4, '0')}`;
}

// Helper to format uptime seconds into a human-readable string
export function formatUptimeHuman(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

// Helper to format system uptime as an object
export function formatSystemUptime(uptimeSeconds: number | null | undefined, rawSystemUptime?: unknown): { uptimeSeconds: number; uptimeHuman: string } | undefined {
  // First try to use the raw systemUptime object from the agent
  if (rawSystemUptime && typeof rawSystemUptime === 'object') {
    const raw = rawSystemUptime as Record<string, unknown>;
    if (typeof raw.uptimeSeconds === 'number' && raw.uptimeSeconds > 0) {
      return {
        uptimeSeconds: raw.uptimeSeconds,
        uptimeHuman: (typeof raw.uptimeHuman === 'string' && raw.uptimeHuman) || formatUptimeHuman(raw.uptimeSeconds),
      };
    }
  }

  // Fall back to the database uptime field
  if (uptimeSeconds && uptimeSeconds > 0) {
    return {
      uptimeSeconds,
      uptimeHuman: formatUptimeHuman(uptimeSeconds),
    };
  }

  return undefined;
}

/**
 * Helper function to resolve asset ID (UUID or assetId) to actual UUID
 * Supports both UUID format (e.g., "24196e90-f486-49c4-8494-836a2cd58bfb")
 * and assetId format (e.g., "AST-SRV-005")
 */
export async function resolveAssetId(id: string): Promise<string> {
  // Check if ID is already a UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUUID) {
    return id;
  }

  // Look up by assetTag to get the UUID
  const asset = await prisma.asset.findFirst({
    where: { assetTag: id },
    select: { id: true },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  return asset.id;
}

// Helper to format bytes to human readable size
export function formatBytesToSize(bytes: bigint | null | undefined): string | null {
  if (!bytes) return null;
  const numBytes = Number(bytes);
  const gb = numBytes / (1024 * 1024 * 1024);
  if (gb >= 1024) {
    return `${Math.round(gb / 1024)}TB`;
  }
  return `${Math.round(gb)}GB`;
}

export type AssetWithIncludes = Prisma.AssetGetPayload<object> & {
  tags?: Array<{ tag: Prisma.TagGetPayload<object> }>;
  agent?: { id: string; status: string; hostname: string | null; ipAddress: string | null; macAddress: string | null; lastHeartbeat: Date | null; agentVersion: string | null } | null;
  hardware?: { ramTotal: bigint | null; diskTotal: bigint | null; systemSKU: string | null } | null;
  category?: { name: string } | null;
  subCategory?: { name: string } | null;
};

export function transformTag(tag: Prisma.TagGetPayload<object>, assetCount: number = 0): TagResponse {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    icon: tag.icon,
    description: tag.description,
    priority: tag.priority,
    compliance: tag.compliance,
    assetCount,
    createdAt: tag.createdAt instanceof Date ? tag.createdAt.toISOString() : tag.createdAt,
    updatedAt: tag.updatedAt instanceof Date ? tag.updatedAt.toISOString() : tag.updatedAt,
  };
}

export function transformAsset(asset: AssetWithIncludes): AssetResponse {
  // Get values from agent if available, fall back to asset
  const hostname = asset.agent?.hostname || asset.name;
  const ipAddress = asset.agent?.ipAddress || asset.ipAddress;
  const macAddress = asset.agent?.macAddress || asset.macAddress;

  // Compute memory and disk size from hardware data
  const memorySize = asset.hardware ? formatBytesToSize(asset.hardware.ramTotal) : null;
  const diskSize = asset.hardware ? formatBytesToSize(asset.hardware.diskTotal) : null;
  const systemSKU = asset.hardware?.systemSKU || null;

  // Calculate human-readable time since last heartbeat
  let lastHeartbeatRelative: string | undefined;
  if (asset.agent?.lastHeartbeat) {
    const now = new Date();
    const lastHb = new Date(asset.agent.lastHeartbeat);
    const diffMs = now.getTime() - lastHb.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) {
      lastHeartbeatRelative = `${diffSecs} seconds ago`;
    } else if (diffSecs < 3600) {
      lastHeartbeatRelative = `${Math.floor(diffSecs / 60)} minutes ago`;
    } else if (diffSecs < 86400) {
      lastHeartbeatRelative = `${Math.floor(diffSecs / 3600)} hours ago`;
    } else {
      lastHeartbeatRelative = `${Math.floor(diffSecs / 86400)} days ago`;
    }
  }

  return {
    id: asset.id,
    assetId: asset.assetTag || asset.id.substring(0, 8).toUpperCase(),
    name: asset.name,
    categoryId: asset.categoryId,
    categoryName: asset.category?.name,
    subCategoryId: asset.subCategoryId,
    subCategoryName: asset.subCategory?.name,
    status: asset.status as AssetStatus,
    operationalStatus: calculateAgentStatus(asset.agent ? { status: asset.agent.status, lastHeartbeat: asset.agent.lastHeartbeat ?? null } : null) === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED',
    operationalStatusSince: asset.agent?.lastHeartbeat?.toISOString(),
    agentId: asset.agent?.id,
    // Agent status details
    agent: asset.agent ? {
      id: asset.agent.id,
      status: calculateAgentStatus({ status: asset.agent.status, lastHeartbeat: asset.agent.lastHeartbeat ?? null }),
      version: asset.agent.agentVersion || 'Unknown',
      lastHeartbeat: asset.agent.lastHeartbeat?.toISOString(),
      lastHeartbeatRelative,
      heartbeatInterval: 60, // Default heartbeat interval in seconds
    } : null,
    hostname,
    ipAddress,
    macAddress,
    serialNumber: asset.serialNumber,
    manufacturer: asset.manufacturer,
    model: asset.model,
    osType: asset.os,
    osVersion: asset.osVersion,
    memorySize,
    diskSize,
    systemSKU,
    tags: asset.tags?.map((at) => transformTag(at.tag)),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
    // Cost properties
    cost: {
      cost: asset.purchaseCost?.toString() || null,
      currency: asset.currency || 'INR',
      currentCost: asset.currentValue?.toString() || null,
      depreciationType: asset.depreciationType || null,
      invoiceNumber: asset.invoiceNumber || null,
      purchaseDate: asset.purchaseDate?.toISOString() || null,
      salvageValue: asset.salvageValue?.toString() || null,
      age: asset.purchaseDate ? calculateAssetAge(asset.purchaseDate) : null,
    },
    // Procurement properties
    procurement: {
      vendor: asset.vendor || null,
      purchaseOrderNumber: asset.purchaseOrderNumber || null,
      amcCost: asset.amcCost || null,
      amcExpiryDate: asset.amcExpiryDate?.toISOString() || null,
      amcVendor: asset.amcVendor || null,
      warrantyExpiryDate: asset.warrantyExpiry?.toISOString() || null,
      warrantyYearAndMonth: asset.warrantyExpiry ? calculateWarrantyRemaining(asset.warrantyExpiry) : null,
      endOfLife: asset.endOfLife?.toISOString() || null,
      endOfSupport: asset.endOfSupport?.toISOString() || null,
    },
  };
}

// Helper to calculate asset age
function calculateAssetAge(purchaseDate: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - purchaseDate.getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

  if (years > 0) {
    return months > 0 ? `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''}`;
  }
  return `${months} month${months > 1 ? 's' : ''}`;
}

// Helper to calculate warranty remaining
function calculateWarrantyRemaining(warrantyExpiry: Date): string {
  const now = new Date();
  const diffMs = warrantyExpiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Expired';
  }

  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

  if (years > 0) {
    return months > 0 ? `${years}y ${months}m remaining` : `${years}y remaining`;
  }
  return `${months}m remaining`;
}
