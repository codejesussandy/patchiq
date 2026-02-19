import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '@shared/errors';
import { PaginationParams } from '@shared/types';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { prisma } from '@/db/client';
import {
  createAuditLog,
  diffObjects,
  AuditAction,
  AuditResource,
} from '@middleware/audit';
import type { AssetResponse } from './assets.types';
import type {
  AssetCreateInput,
  AssetUpdateInput,
  AssetQueryInput,
} from './assets.validators';
import { generateAssetId, resolveAssetId, transformAsset } from './assets-helpers';

// Re-export resolveAssetId for other sub-services
export { resolveAssetId } from './assets-helpers';

// ============================================
// Assets Service
// ============================================

export async function listAssets(params: AssetQueryInput & PaginationParams) {
  const where: Prisma.AssetWhereInput = {};

  if (params.status) where.status = params.status;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.subCategoryId) where.subCategoryId = params.subCategoryId;
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { serialNumber: { contains: params.search, mode: 'insensitive' } },
      { assetTag: { contains: params.search, mode: 'insensitive' } },
      { ipAddress: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        agent: { select: { id: true, status: true, hostname: true, ipAddress: true, macAddress: true, lastHeartbeat: true, agentVersion: true } },
        hardware: { select: { ramTotal: true, diskTotal: true, systemSKU: true } },
        category: { select: { name: true } },
        subCategory: { select: { name: true } },
      },
      ...getPaginationParams(params),
      orderBy: params.sort
        ? { [params.sort]: params.order || 'desc' }
        : { createdAt: 'desc' },
    }),
    prisma.asset.count({ where }),
  ]);

  return paginate(assets.map(transformAsset), total, params);
}

export async function getAssetById(id: string): Promise<AssetResponse> {
  // Resolve to UUID (supports both UUID and assetId)
  const uuid = await resolveAssetId(id);

  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    include: {
      tags: { include: { tag: true } },
      agent: {
        select: {
          id: true,
          status: true,
          lastHeartbeat: true,
          hostname: true,
          ipAddress: true,
          macAddress: true,
          agentVersion: true,
        }
      },
      hardware: true,
      security: true,
      category: true,
      subCategory: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  return transformAsset(asset);
}

export async function createAsset(data: AssetCreateInput, userId?: string): Promise<AssetResponse> {
  // Check for unique serial number
  if (data.serialNumber) {
    const existingSerial = await prisma.asset.findUnique({
      where: { serialNumber: data.serialNumber },
    });
    if (existingSerial) {
      throw new ConflictError('Asset with this serial number already exists');
    }
  }

  // Get asset count for ID generation
  const count = await prisma.asset.count();
  const assetId = generateAssetId(count);

  const asset = await prisma.asset.create({
    data: {
      name: data.name,
      type: 'Endpoint',
      status: data.status || 'AVAILABLE',
      serialNumber: data.serialNumber,
      assetTag: assetId,
      os: data.osType,
      osVersion: data.osVersion,
      ipAddress: data.ipAddress || null,
      macAddress: data.macAddress,
      manufacturer: data.manufacturer,
      model: data.model,
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,
      // Connect tags if provided
      tags: data.tags?.length
        ? {
            create: data.tags.map((tagId) => ({
              tag: { connect: { id: tagId } },
            })),
          }
        : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      category: true,
      subCategory: true,
    },
  });

  // Create audit log with full details
  await createAuditLog({
    userId,
    action: AuditAction.CREATE,
    resource: AuditResource.ASSET,
    resourceId: asset.id,
    details: {
      assetName: asset.name,
      assetTag: asset.assetTag,
      type: asset.type,
      status: asset.status,
      os: asset.os,
      osVersion: asset.osVersion,
      ipAddress: asset.ipAddress,
      macAddress: asset.macAddress,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serialNumber: asset.serialNumber,
    },
  });

  return transformAsset(asset);
}

export async function updateAsset(id: string, data: AssetUpdateInput, userId?: string): Promise<AssetResponse> {
  const uuid = await resolveAssetId(id);
  const existing = await prisma.asset.findUnique({
    where: { id: uuid },
    include: { tags: { include: { tag: true } } },
  });

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  // Check for unique serial number if being updated
  if (data.serialNumber && data.serialNumber !== existing.serialNumber) {
    const existingSerial = await prisma.asset.findFirst({
      where: {
        serialNumber: data.serialNumber,
        id: { not: uuid },
      },
    });
    if (existingSerial) {
      throw new ConflictError('Asset with this serial number already exists');
    }
  }

  // Handle tags update separately
  if (data.tags !== undefined) {
    // Delete existing tag associations
    await prisma.assetTag.deleteMany({
      where: { assetId: uuid },
    });

    // Create new tag associations
    if (data.tags.length > 0) {
      await prisma.assetTag.createMany({
        data: data.tags.map((tagId) => ({
          assetId: uuid,
          tagId,
        })),
      });
    }
  }

  const asset = await prisma.asset.update({
    where: { id: uuid },
    data: {
      // Basic info
      name: data.name,
      status: data.status,
      serialNumber: data.serialNumber,
      os: data.osType,
      osVersion: data.osVersion,
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      manufacturer: data.manufacturer,
      model: data.model,
      hostname: data.hostname,
      categoryId: data.categoryId,
      subCategoryId: data.subCategoryId,

      // Owner info
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerDepartment: data.ownerDepartment,

      // Procurement info
      vendor: data.vendor,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      purchaseOrderNumber: data.purchaseOrderNumber,
      amcVendor: data.amcVendor,
      amcCost: data.amcCost,
      amcExpiryDate: data.amcExpiryDate ? new Date(data.amcExpiryDate) : undefined,
      endOfLife: data.endOfLife ? new Date(data.endOfLife) : undefined,
      endOfSupport: data.endOfSupport ? new Date(data.endOfSupport) : undefined,

      // Cost info
      purchaseCost: data.purchaseCost,
      invoiceNumber: data.invoiceNumber,
      currency: data.currency,
      currentValue: data.currentValue,
      salvageValue: data.salvageValue,
      depreciationType: data.depreciationType,
      depreciationRate: data.depreciationRate,
    },
    include: {
      tags: { include: { tag: true } },
      agent: { select: { id: true, status: true, hostname: true, ipAddress: true, macAddress: true, lastHeartbeat: true, agentVersion: true } },
      category: true,
      subCategory: true,
    },
  });

  // Track changes for audit log - include all editable fields
  const fieldsToTrack = [
    'name', 'status', 'serialNumber', 'os', 'osVersion', 'ipAddress', 'macAddress', 'manufacturer', 'model', 'hostname',
    'ownerName', 'ownerEmail', 'ownerDepartment',
    'vendor', 'purchaseDate', 'warrantyExpiry', 'purchaseOrderNumber', 'amcVendor', 'amcCost', 'amcExpiryDate', 'endOfLife', 'endOfSupport',
    'purchaseCost', 'invoiceNumber', 'currency', 'currentValue', 'salvageValue', 'depreciationType', 'depreciationRate',
  ];
  const beforeData: Record<string, unknown> = {
    name: existing.name,
    status: existing.status,
    serialNumber: existing.serialNumber,
    os: existing.os,
    osVersion: existing.osVersion,
    ipAddress: existing.ipAddress,
    macAddress: existing.macAddress,
    manufacturer: existing.manufacturer,
    model: existing.model,
    hostname: existing.hostname,
    ownerName: existing.ownerName,
    ownerEmail: existing.ownerEmail,
    ownerDepartment: existing.ownerDepartment,
    vendor: existing.vendor,
    purchaseDate: existing.purchaseDate?.toISOString(),
    warrantyExpiry: existing.warrantyExpiry?.toISOString(),
    purchaseOrderNumber: existing.purchaseOrderNumber,
    amcVendor: existing.amcVendor,
    amcCost: existing.amcCost,
    amcExpiryDate: existing.amcExpiryDate?.toISOString(),
    endOfLife: existing.endOfLife?.toISOString(),
    endOfSupport: existing.endOfSupport?.toISOString(),
    purchaseCost: existing.purchaseCost?.toString(),
    invoiceNumber: existing.invoiceNumber,
    currency: existing.currency,
    currentValue: existing.currentValue?.toString(),
    salvageValue: existing.salvageValue?.toString(),
    depreciationType: existing.depreciationType,
    depreciationRate: existing.depreciationRate?.toString(),
  };
  const afterData: Record<string, unknown> = {
    name: asset.name,
    status: asset.status,
    serialNumber: asset.serialNumber,
    os: asset.os,
    osVersion: asset.osVersion,
    ipAddress: asset.ipAddress,
    macAddress: asset.macAddress,
    manufacturer: asset.manufacturer,
    model: asset.model,
    hostname: asset.hostname,
    ownerName: asset.ownerName,
    ownerEmail: asset.ownerEmail,
    ownerDepartment: asset.ownerDepartment,
    vendor: asset.vendor,
    purchaseDate: asset.purchaseDate?.toISOString(),
    warrantyExpiry: asset.warrantyExpiry?.toISOString(),
    purchaseOrderNumber: asset.purchaseOrderNumber,
    amcVendor: asset.amcVendor,
    amcCost: asset.amcCost,
    amcExpiryDate: asset.amcExpiryDate?.toISOString(),
    endOfLife: asset.endOfLife?.toISOString(),
    endOfSupport: asset.endOfSupport?.toISOString(),
    purchaseCost: asset.purchaseCost?.toString(),
    invoiceNumber: asset.invoiceNumber,
    currency: asset.currency,
    currentValue: asset.currentValue?.toString(),
    salvageValue: asset.salvageValue?.toString(),
    depreciationType: asset.depreciationType,
    depreciationRate: asset.depreciationRate?.toString(),
  };

  const changes = diffObjects(beforeData, afterData, fieldsToTrack);

  // Create audit log with change details
  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    resource: AuditResource.ASSET,
    resourceId: uuid,
    details: {
      assetName: asset.name,
      assetTag: asset.assetTag,
      changes: changes.map((c) => ({
        field: c.field,
        from: c.from,
        to: c.to,
      })),
      changeCount: changes.length,
    },
  });

  return transformAsset(asset);
}

export async function deleteAsset(id: string, userId?: string): Promise<void> {
  const uuid = await resolveAssetId(id);
  const existing = await prisma.asset.findUnique({
    where: { id: uuid },
  });

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  // Soft delete would be preferable in production
  await prisma.asset.delete({
    where: { id: uuid },
  });

  // Create audit log with deleted asset info
  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    resource: AuditResource.ASSET,
    resourceId: uuid,
    details: {
      deletedAsset: {
        name: existing.name,
        assetTag: existing.assetTag,
        type: existing.type,
        status: existing.status,
        os: existing.os,
        ipAddress: existing.ipAddress,
        serialNumber: existing.serialNumber,
      },
    },
  });
}

export async function bulkDeleteAssets(ids: string[], userId?: string): Promise<{ deleted: number }> {
  // Get asset info before deletion for audit log
  const assetsToDelete = await prisma.asset.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, assetTag: true, type: true },
  });

  const result = await prisma.asset.deleteMany({
    where: { id: { in: ids } },
  });

  // Create audit log for bulk delete
  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    resource: AuditResource.ASSET,
    details: {
      bulkDelete: true,
      count: result.count,
      deletedAssets: assetsToDelete.map((a) => ({
        id: a.id,
        name: a.name,
        assetTag: a.assetTag,
      })),
    },
  });

  return { deleted: result.count };
}
