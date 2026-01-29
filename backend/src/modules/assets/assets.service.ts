import { prisma } from '@/db/client';
import { NotFoundError, ConflictError, BadRequestError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { PaginationParams } from '@shared/types';
import {
  createAuditLog,
  diffObjects,
  AuditAction,
  AuditResource,
} from '@middleware/audit';
import type {
  AssetResponse,
  AssetLifeCycle,
  AssetHardware,
  AssetSoftware,
  AssetSecurity,
  AssetNetwork,
  AssetPeripherals,
  AssetTelemetry,
  TelemetryHistory,
  SystemErrors,
  AssetAuditLog,
  AssetAlertResponse,
  CategoryResponse,
  SubCategoryResponse,
  TagResponse,
  SoftwareInventoryResponse,
  SoftwareLicenseResponse,
  OSLicenseResponse,
} from './assets.types';
import type {
  AssetCreateInput,
  AssetUpdateInput,
  AssetQueryInput,
  CategoryCreateInput,
  CategoryUpdateInput,
  SubCategoryCreateInput,
  SubCategoryUpdateInput,
  TagCreateInput,
  TagUpdateInput,
  SoftwareLicenseCreateInput,
  SoftwareLicenseUpdateInput,
  OSLicenseCreateInput,
  OSLicenseUpdateInput,
} from './assets.validators';
import {
  transformHardwareForAPI,
  transformTelemetryForAPI,
} from './assets.transformer';
import {
  calculateDepreciation,
  mapDepreciationMethod,
  getMethodDisplayName,
  type DepreciationMethod,
} from './depreciation.utils';

// Helper to generate asset display ID
function generateAssetId(count: number): string {
  return `AST-${String(count + 1).padStart(4, '0')}`;
}

// Helper to format uptime seconds into a human-readable string
function formatUptimeHuman(seconds: number): string {
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
function formatSystemUptime(uptimeSeconds: number | null | undefined, rawSystemUptime?: unknown): { uptimeSeconds: number; uptimeHuman: string } | undefined {
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

// ============================================
// Categories Service
// ============================================

export async function listCategories(): Promise<CategoryResponse[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  return categories.map(transformCategory);
}

export async function getCategoryById(id: string): Promise<CategoryResponse> {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  return transformCategory(category);
}

export async function createCategory(data: CategoryCreateInput): Promise<CategoryResponse> {
  // Check for duplicate name
  const existing = await prisma.category.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new ConflictError('Category with this name already exists');
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      color: data.color || null,
      description: data.description || null,
      isDefault: data.isDefault || false,
    },
  });

  return transformCategory(category);
}

export async function updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryResponse> {
  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Category not found');
  }

  // Check for duplicate name if name is being updated
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.category.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new ConflictError('Category with this name already exists');
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      color: data.color ?? undefined,
      description: data.description ?? undefined,
      isDefault: data.isDefault ?? undefined,
    },
  });

  return transformCategory(category);
}

export async function deleteCategory(id: string): Promise<void> {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: { subCategories: { take: 1 } },
  });

  if (!existing) {
    throw new NotFoundError('Category not found');
  }

  // Check if any subcategories exist for this category
  if (existing.subCategories.length > 0) {
    throw new BadRequestError('Cannot delete category that has subcategories');
  }

  await prisma.category.delete({ where: { id } });
}

function transformCategory(category: any): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    description: category.description,
    isDefault: category.isDefault ?? false,
    createdAt: category.createdAt instanceof Date ? category.createdAt.toISOString() : category.createdAt,
  };
}

// ============================================
// SubCategories Service
// ============================================

export async function listSubCategories(categoryId?: string): Promise<SubCategoryResponse[]> {
  const subCategories = await prisma.subCategory.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  return subCategories.map((sc) => transformSubCategory({
    id: sc.id,
    categoryId: sc.categoryId,
    categoryName: sc.category?.name,
    name: sc.name,
    criticality: sc.criticality,
    description: sc.description,
    createdAt: sc.createdAt,
  }));
}

export async function getSubCategoryById(id: string): Promise<SubCategoryResponse> {
  const subCategory = await prisma.subCategory.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!subCategory) {
    throw new NotFoundError('Sub-category not found');
  }

  return transformSubCategory({
    id: subCategory.id,
    categoryId: subCategory.categoryId,
    categoryName: subCategory.category?.name,
    name: subCategory.name,
    criticality: subCategory.criticality,
    description: subCategory.description,
    createdAt: subCategory.createdAt,
  });
}

export async function createSubCategory(data: SubCategoryCreateInput): Promise<SubCategoryResponse> {
  // Check category exists
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // Check for duplicate name within category
  const existing = await prisma.subCategory.findFirst({
    where: {
      categoryId: data.categoryId,
      name: { equals: data.name, mode: 'insensitive' },
    },
  });

  if (existing) {
    throw new ConflictError('Sub-category with this name already exists in this category');
  }

  const subCategory = await prisma.subCategory.create({
    data: {
      categoryId: data.categoryId,
      name: data.name,
      criticality: data.criticality || null,
      description: data.description || null,
    },
    include: { category: true },
  });

  return transformSubCategory({
    id: subCategory.id,
    categoryId: subCategory.categoryId,
    categoryName: subCategory.category?.name,
    name: subCategory.name,
    criticality: subCategory.criticality,
    description: subCategory.description,
    createdAt: subCategory.createdAt,
  });
}

export async function updateSubCategory(id: string, data: SubCategoryUpdateInput): Promise<SubCategoryResponse> {
  const existing = await prisma.subCategory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Sub-category not found');
  }

  const subCategory = await prisma.subCategory.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      categoryId: data.categoryId ?? undefined,
      criticality: data.criticality ?? undefined,
      description: data.description ?? undefined,
    },
    include: { category: true },
  });

  return transformSubCategory({
    id: subCategory.id,
    categoryId: subCategory.categoryId,
    categoryName: subCategory.category?.name,
    name: subCategory.name,
    criticality: subCategory.criticality,
    description: subCategory.description,
    createdAt: subCategory.createdAt,
  });
}

export async function deleteSubCategory(id: string): Promise<void> {
  const existing = await prisma.subCategory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Sub-category not found');
  }

  await prisma.subCategory.delete({ where: { id } });
}

function transformSubCategory(subCategory: any): SubCategoryResponse {
  return {
    id: subCategory.id,
    categoryId: subCategory.categoryId,
    categoryName: subCategory.categoryName,
    name: subCategory.name,
    criticality: subCategory.criticality,
    description: subCategory.description,
    createdAt: subCategory.createdAt instanceof Date ? subCategory.createdAt.toISOString() : subCategory.createdAt,
  };
}

// ============================================
// Tags Service
// ============================================

export interface TagQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export async function listTags(params: TagQueryParams = {}): Promise<{ data: TagResponse[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [tags, total] = await Promise.all([
    prisma.tag.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.tag.count({ where }),
  ]);

  // Get asset counts for each tag
  const tagsWithCounts = await Promise.all(
    tags.map(async (tag) => {
      const count = await prisma.assetTag.count({
        where: { tagId: tag.id },
      });
      return transformTag(tag, count);
    })
  );

  return {
    data: tagsWithCounts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTagById(id: string): Promise<TagResponse> {
  const tag = await prisma.tag.findUnique({
    where: { id },
  });

  if (!tag) {
    throw new NotFoundError('Tag not found');
  }

  const assetCount = await prisma.assetTag.count({
    where: { tagId: id },
  });

  return transformTag(tag, assetCount);
}

export async function createTag(data: TagCreateInput): Promise<TagResponse> {
  // Check for duplicate name
  const existing = await prisma.tag.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
  });

  if (existing) {
    throw new ConflictError('Tag with this name already exists');
  }

  const tag = await prisma.tag.create({
    data: {
      name: data.name,
      color: data.color,
      description: data.description,
      icon: data.icon,
      priority: data.priority ?? 0,
      compliance: data.compliance ?? false,
    },
  });

  return transformTag(tag, 0);
}

export async function updateTag(id: string, data: TagUpdateInput): Promise<TagResponse> {
  const existing = await prisma.tag.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Tag not found');
  }

  // Check for duplicate name if name is being updated
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.tag.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new ConflictError('Tag with this name already exists');
    }
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      name: data.name,
      color: data.color,
      description: data.description,
      icon: data.icon,
      priority: data.priority,
      compliance: data.compliance,
    },
  });

  const assetCount = await prisma.assetTag.count({
    where: { tagId: id },
  });

  return transformTag(tag, assetCount);
}

export async function deleteTag(id: string): Promise<void> {
  const existing = await prisma.tag.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Tag not found');
  }

  // Delete tag associations and tag in a transaction
  await prisma.$transaction([
    prisma.assetTag.deleteMany({ where: { tagId: id } }),
    prisma.tag.delete({ where: { id } }),
  ]);
}

export async function getPopularTags(limit: number = 10): Promise<TagResponse[]> {
  // Get tag usage counts grouped by tagId
  const popular = await prisma.assetTag.groupBy({
    by: ['tagId'],
    _count: {
      tagId: true,
    },
    orderBy: {
      _count: {
        tagId: 'desc',
      },
    },
    take: limit,
  });

  if (popular.length === 0) {
    return [];
  }

  const tagIds = popular.map((p) => p.tagId);
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
  });

  // Map tags with their counts, maintaining the popularity order
  return tagIds.map((tagId) => {
    const tag = tags.find((t) => t.id === tagId);
    const countInfo = popular.find((p) => p.tagId === tagId);
    return transformTag(tag!, countInfo?._count.tagId || 0);
  }).filter(Boolean);
}

export async function addTagsToAsset(assetId: string, tagIds: string[], userId?: string): Promise<TagResponse[]> {
  // Verify asset exists
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Verify all tags exist
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
  });

  if (tags.length !== tagIds.length) {
    throw new NotFoundError('One or more tags not found');
  }

  // Add tags (ignore duplicates)
  await prisma.assetTag.createMany({
    data: tagIds.map((tagId) => ({ assetId, tagId })),
    skipDuplicates: true,
  });

  // Create audit log with tag names
  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    resource: AuditResource.ASSET,
    resourceId: assetId,
    details: {
      assetName: asset.name,
      action: 'add_tags',
      tagsAdded: tags.map((t) => ({ id: t.id, name: t.name })),
    },
  });

  return getAssetTags(assetId);
}

export async function removeTagFromAsset(assetId: string, tagId: string, userId?: string): Promise<void> {
  // Verify asset exists
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Get tag info for audit log
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  });

  // Verify tag association exists
  const assetTag = await prisma.assetTag.findUnique({
    where: {
      assetId_tagId: { assetId, tagId },
    },
  });

  if (!assetTag) {
    throw new NotFoundError('Tag not associated with this asset');
  }

  await prisma.assetTag.delete({
    where: {
      assetId_tagId: { assetId, tagId },
    },
  });

  // Create audit log with tag name
  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    resource: AuditResource.ASSET,
    resourceId: assetId,
    details: {
      assetName: asset.name,
      action: 'remove_tag',
      tagRemoved: tag ? { id: tag.id, name: tag.name } : { id: tagId },
    },
  });
}

export async function getAssetTags(assetId: string): Promise<TagResponse[]> {
  const assetTags = await prisma.assetTag.findMany({
    where: { assetId },
    include: { tag: true },
  });

  // Get asset counts for each tag
  const tagsWithCounts = await Promise.all(
    assetTags.map(async (at) => {
      const count = await prisma.assetTag.count({
        where: { tagId: at.tag.id },
      });
      return transformTag(at.tag, count);
    })
  );

  return tagsWithCounts;
}

export async function bulkAssignTags(assetIds: string[], tagIds: string[]): Promise<{ message: string; assignedCount: number }> {
  // Verify all assets exist
  const assets = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true },
  });

  if (assets.length !== assetIds.length) {
    throw new NotFoundError('One or more assets not found');
  }

  // Verify all tags exist
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true },
  });

  if (tags.length !== tagIds.length) {
    throw new NotFoundError('One or more tags not found');
  }

  // Build array of all asset-tag combinations
  const data = assetIds.flatMap((assetId) =>
    tagIds.map((tagId) => ({ assetId, tagId }))
  );

  // Bulk create, skipping duplicates
  const result = await prisma.assetTag.createMany({
    data,
    skipDuplicates: true,
  });

  return {
    message: `Tags assigned to ${assetIds.length} assets`,
    assignedCount: result.count,
  };
}

function transformTag(tag: any, assetCount: number = 0): TagResponse {
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

// ============================================
// Assets Service
// ============================================

export async function listAssets(params: AssetQueryInput & PaginationParams) {
  const where: any = {};

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
        agent: { select: { id: true, status: true, hostname: true, ipAddress: true, macAddress: true } },
        hardware: true,
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
  const asset = await prisma.asset.findUnique({
    where: { id },
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
      status: data.status || 'Available',
      serialNumber: data.serialNumber,
      assetTag: assetId,
      os: data.osType,
      osVersion: data.osVersion,
      ipAddress: data.ipAddress || null,
      macAddress: data.macAddress,
      manufacturer: data.manufacturer,
      model: data.model,
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
  const existing = await prisma.asset.findUnique({
    where: { id },
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
        id: { not: id },
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
      where: { assetId: id },
    });

    // Create new tag associations
    if (data.tags.length > 0) {
      await prisma.assetTag.createMany({
        data: data.tags.map((tagId) => ({
          assetId: id,
          tagId,
        })),
      });
    }
  }

  const asset = await prisma.asset.update({
    where: { id },
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
    },
    include: {
      tags: { include: { tag: true } },
      agent: { select: { id: true, status: true } },
    },
  });

  // Track changes for audit log - include all editable fields
  const fieldsToTrack = [
    'name', 'status', 'serialNumber', 'os', 'osVersion', 'ipAddress', 'macAddress', 'manufacturer', 'model', 'hostname',
    'ownerName', 'ownerEmail', 'ownerDepartment',
    'vendor', 'purchaseDate', 'warrantyExpiry', 'purchaseOrderNumber', 'amcVendor', 'amcCost', 'amcExpiryDate', 'endOfLife', 'endOfSupport',
    'purchaseCost', 'invoiceNumber', 'currency',
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
  };

  const changes = diffObjects(beforeData, afterData, fieldsToTrack);

  // Create audit log with change details
  await createAuditLog({
    userId,
    action: AuditAction.UPDATE,
    resource: AuditResource.ASSET,
    resourceId: id,
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
  const existing = await prisma.asset.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Asset not found');
  }

  // Soft delete would be preferable in production
  await prisma.asset.delete({
    where: { id },
  });

  // Create audit log with deleted asset info
  await createAuditLog({
    userId,
    action: AuditAction.DELETE,
    resource: AuditResource.ASSET,
    resourceId: id,
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

// Helper to format bytes to human readable size
function formatBytesToSize(bytes: bigint | null | undefined): string | null {
  if (!bytes) return null;
  const numBytes = Number(bytes);
  const gb = numBytes / (1024 * 1024 * 1024);
  if (gb >= 1024) {
    return `${Math.round(gb / 1024)}TB`;
  }
  return `${Math.round(gb)}GB`;
}

function transformAsset(asset: any): AssetResponse {
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
    status: asset.status,
    operationalStatus: asset.agent?.status === 'Connected' ? 'Connected' : 'Disconnected',
    operationalStatusSince: asset.agent?.lastHeartbeat?.toISOString(),
    agentId: asset.agent?.id,
    // Agent status details
    agent: asset.agent ? {
      id: asset.agent.id,
      status: asset.agent.status || 'Unknown',
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
    tags: asset.tags?.map((at: any) => transformTag(at.tag)),
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

// ============================================
// Asset Details Service
// ============================================

export async function getAssetLifeCycle(id: string, method?: string): Promise<AssetLifeCycle> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      name: true,
      purchaseDate: true,
      warrantyExpiry: true,
      endOfLife: true,
      amcExpiryDate: true,
      // Cost fields
      purchaseCost: true,
      salvageValue: true,
      currentValue: true,
      depreciationType: true,
      depreciationRate: true,
      currency: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const now = new Date();
  const purchaseDate = asset.purchaseDate;

  // Get values from database, with sensible defaults
  const purchaseCost = asset.purchaseCost ? Number(asset.purchaseCost) : null;
  const salvageValue = asset.salvageValue ? Number(asset.salvageValue) : null;
  // Use passed method if provided, otherwise use the database stored method
  const depreciationMethod = method ? mapDepreciationMethod(method) : mapDepreciationMethod(asset.depreciationType);

  // Calculate useful life from purchase date and end of life
  let usefulLifeYears = 5; // Default: 5 years
  if (purchaseDate && asset.endOfLife) {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    usefulLifeYears = Math.max(1, Math.round((asset.endOfLife.getTime() - purchaseDate.getTime()) / msPerYear));
  }

  // If we have all required data, use the depreciation algorithm
  if (purchaseCost && purchaseCost > 0 && purchaseDate) {
    const effectiveSalvageValue = salvageValue ?? Math.round(purchaseCost * 0.1); // Default: 10% salvage

    try {
      const depreciation = calculateDepreciation({
        purchaseCost,
        salvageValue: effectiveSalvageValue,
        usefulLifeYears,
        purchaseDate,
        method: depreciationMethod,
        currentDate: now,
      });

      // Calculate end of life date
      const endOfLifeDate = asset.endOfLife
        ? asset.endOfLife.toISOString().split('T')[0]
        : new Date(purchaseDate.getTime() + usefulLifeYears * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      return {
        purchaseDate: purchaseDate.toISOString().split('T')[0],
        purchaseValue: Math.round(purchaseCost),
        currentDate: now.toISOString().split('T')[0],
        currentValue: depreciation.currentValue,
        amcExpiryDate: asset.amcExpiryDate?.toISOString().split('T')[0] ?? null,
        warrantyExpiryDate: asset.warrantyExpiry?.toISOString().split('T')[0] ?? null,
        endOfLife: endOfLifeDate,
        endOfLifeValue: Math.round(effectiveSalvageValue),
        depreciationTimeline: depreciation.depreciationTimeline,
        // Extended fields for UI
        depreciationMethod: getMethodDisplayName(depreciationMethod),
        totalDepreciation: depreciation.totalDepreciation,
        annualDepreciation: depreciation.annualDepreciation,
        yearsElapsed: depreciation.yearsElapsed,
        yearsRemaining: depreciation.yearsRemaining,
        usefulLifeYears,
        currency: asset.currency ?? 'INR',
        hasFinancialData: true,
      };
    } catch {
      // Fall through to default calculation if depreciation fails
    }
  }

  // Fallback: Use simple calculation with defaults when data is missing
  const defaultPurchaseValue = purchaseCost ?? 40000;
  const defaultSalvageValue = salvageValue ?? Math.round(defaultPurchaseValue * 0.1);
  const depreciationRate = 0.2; // 20% per year for fallback

  let currentValue = defaultPurchaseValue;
  if (purchaseDate) {
    const yearsOwned = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    currentValue = Math.max(
      defaultPurchaseValue * (1 - depreciationRate * yearsOwned),
      defaultSalvageValue
    );
  }

  // Build simple timeline for fallback
  const depreciationTimeline: Array<{ date: string; value: number; label: string }> = [];

  if (purchaseDate) {
    depreciationTimeline.push({
      date: purchaseDate.toISOString().split('T')[0],
      value: Math.round(defaultPurchaseValue),
      label: 'Purchase',
    });
  }

  depreciationTimeline.push({
    date: now.toISOString().split('T')[0],
    value: Math.round(currentValue),
    label: 'Today',
  });

  // Add end of life point
  const endOfLifeDate = purchaseDate
    ? new Date(purchaseDate.getTime() + usefulLifeYears * 365.25 * 24 * 60 * 60 * 1000)
    : null;

  if (endOfLifeDate) {
    depreciationTimeline.push({
      date: endOfLifeDate.toISOString().split('T')[0],
      value: Math.round(defaultSalvageValue),
      label: 'End of Life',
    });
  }

  return {
    purchaseDate: purchaseDate?.toISOString().split('T')[0] ?? null,
    purchaseValue: null,
    currentDate: now.toISOString().split('T')[0],
    currentValue: null,
    amcExpiryDate: asset.amcExpiryDate?.toISOString().split('T')[0] ?? null,
    warrantyExpiryDate: asset.warrantyExpiry?.toISOString().split('T')[0] ?? null,
    endOfLife: asset.endOfLife?.toISOString().split('T')[0] ?? null,
    endOfLifeValue: null,
    depreciationTimeline: [],
    // Extended fields - null when no data
    depreciationMethod: null,
    totalDepreciation: null,
    annualDepreciation: null,
    yearsElapsed: null,
    yearsRemaining: null,
    usefulLifeYears: null,
    currency: asset.currency ?? 'INR',
    hasFinancialData: false,
  };
}

export async function getAssetHardware(id: string): Promise<AssetHardware | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      hardware: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const hw = asset.hardware;
  if (!hw) {
    return null;
  }

  // Use transformer to return rawPayload if available, else construct from summary fields
  const transformed = transformHardwareForAPI(hw);
  if (transformed) {
    // The transformer returns rawPayload directly when available.
    // The rawPayload uses Go agent field names which differ from HardwareResponse:
    // - Agent sends: storageDrives, graphicsAdapters, memory.modules[].capacityGB
    // - HardwareResponse expects: storage, graphicsCards, memory.modules[].capacity
    // We need to handle BOTH formats for compatibility.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = transformed as any;

    // Get storage drives (agent sends "storageDrives", fallback to "storage")
    const storageDrives = raw.storageDrives || transformed.storage || [];

    // Get memory modules
    const memoryModules = raw.memory?.modules || [];
    const totalPhysicalGB = raw.memory?.totalPhysicalGB || transformed.memory?.totalPhysicalGB;

    // Get network adapters (agent might send these in different formats)
    const networkAdapters = raw.networkAdapters || [];

    // Get graphics (agent sends "graphicsAdapters")
    const graphicsAdapters = raw.graphicsAdapters || transformed.graphicsCards || [];

    // Get BIOS info
    const biosInfo = raw.bios || transformed.bios;

    // Get processor info
    const processorInfo = raw.processor || transformed.processor;

    // Get system identity for additional fields
    const systemIdentity = raw.systemIdentity || transformed.systemIdentity;

    // Get battery info
    const batteryInfo = raw.battery;

    return {
      bios: biosInfo ? {
        name: biosInfo.vendor || biosInfo.name,
        biosVersion: biosInfo.version,
        manufacturer: biosInfo.vendor,
        installDate: biosInfo.releaseDate,
        description: biosInfo.firmwareType || undefined,
        secureBootState: biosInfo.secureBootEnabled !== undefined
          ? (biosInfo.secureBootEnabled ? 'Enabled' : 'Disabled')
          : undefined,
        serialNumber: systemIdentity?.serialNumber,
      } : undefined,
      processor: processorInfo ? {
        name: processorInfo.name,
        manufacturer: processorInfo.manufacturer,
        numberOfCores: processorInfo.coreCount,
        logicalProcessors: processorInfo.threadCount,
        processorSpeed: processorInfo.clockSpeedMHz ? `${processorInfo.clockSpeedMHz} MHz` : undefined,
        secureBootState: biosInfo?.secureBootEnabled !== undefined
          ? (biosInfo.secureBootEnabled ? 'Enabled' : 'Disabled')
          : undefined,
      } : undefined,
      baseBoard: systemIdentity ? {
        name: systemIdentity.model || 'Unknown',
        partNumber: systemIdentity.sku || undefined,
        productId: systemIdentity.uuid || undefined,
        serialNumber: systemIdentity.serialNumber || undefined,
        tag: systemIdentity.assetTag || undefined,
        version: undefined,
      } : undefined,
      storage: storageDrives.map((s: any, i: number) => ({
        name: s.name || `Drive ${i + 1}`,
        drive: s.mountPoint || s.deviceId || s.name || `Drive ${i + 1}`,
        capacity: s.capacityGB ? `${Math.round(s.capacityGB)} GB` : undefined,
        used: s.capacityGB && s.freeSpaceGB !== undefined
          ? `${Math.round(s.capacityGB - s.freeSpaceGB)} GB`
          : undefined,
        format: s.fileSystem || undefined,
        type: s.type || 'Unknown',
        serialNumber: s.serialNumber || undefined,
      })),
      memory: memoryModules.length > 0
        ? memoryModules.map((m: any, i: number) => ({
            slot: m.slot || `Slot ${i + 1}`,
            name: m.manufacturer || 'Memory Module',
            // Handle both string "capacity" and number "capacityGB"
            capacity: typeof m.capacity === 'string'
              ? m.capacity
              : (m.capacityGB ? `${Math.round(m.capacityGB)} GB` : undefined),
            bankLabel: m.bankLabel || undefined,
            locator: m.slot || undefined,
            memoryType: m.type || m.memoryType || undefined,
            serialNumber: m.serialNumber || undefined,
            partNumber: m.partNumber || undefined,
          }))
        : [{
            slot: 'Total',
            name: 'System Memory',
            capacity: totalPhysicalGB ? `${Math.round(totalPhysicalGB)} GB` : undefined,
          }],
      networkAdapters: networkAdapters.map((n: any, i: number) => {
        // Handle nested ipConfiguration from agent (ipConfiguration.ipv4Address)
        // Also handle flat structure (ipAddressV4) for compatibility
        const ipConfig = n.ipConfiguration || {};
        return {
          id: n.id || `adapter-${i}`,
          name: n.displayName || n.name || `Network Adapter ${i + 1}`,
          type: n.type || undefined,
          status: n.status || undefined,
          ipAddressV4: n.ipAddressV4 || n.ipAddress || ipConfig.ipv4Address || undefined,
          ipAddressV6: n.ipAddressV6 || ipConfig.ipv6Address || undefined,
          macAddress: n.macAddress || undefined,
          dhcpServer: n.dhcpServer || ipConfig.dhcpServer || undefined,
          isDefault: n.isDefault || false,
        };
      }),
      battery: batteryInfo ? {
        id: 'battery-0',
        name: batteryInfo.name || 'Battery',
        health: batteryInfo.healthPercent !== undefined
          ? `${Math.round(batteryInfo.healthPercent)}%`
          : 'Unknown',
        cycleCount: batteryInfo.cycleCount || 0,
        chargeLevel: batteryInfo.chargeLevel || 0,
        chargingStatus: batteryInfo.chargingStatus || 'Unknown',
        batteryCapacity: batteryInfo.designCapacityWh
          ? `${batteryInfo.designCapacityWh} Wh`
          : undefined,
        estimatedRuntime: batteryInfo.estimatedRuntimeMinutes
          ? `${batteryInfo.estimatedRuntimeMinutes} min`
          : undefined,
        temperature: batteryInfo.temperature
          ? `${batteryInfo.temperature}°C`
          : undefined,
      } : undefined,
      graphicsCards: graphicsAdapters.map((g: any) => ({
        name: g.name || 'Unknown GPU',
        manufacturer: g.manufacturer || undefined,
        driverVersion: g.driverVersion || undefined,
        videoMemoryMB: g.memoryMB || undefined,
        currentResolution: g.resolution || undefined,
      })),
    };
  }

  // Fallback to basic fields
  return {
    bios: {
      name: hw.biosVendor || hw.biosVersion || undefined,
      biosVersion: hw.biosVersion || undefined,
      manufacturer: hw.biosVendor || undefined,
    },
    processor: {
      name: hw.cpu || undefined,
      manufacturer: hw.cpuManufacturer || undefined,
      numberOfCores: hw.cpuCores || undefined,
      logicalProcessors: hw.cpuThreads || hw.cpuCores || undefined,
      processorSpeed: hw.cpuSpeedMHz ? `${hw.cpuSpeedMHz} MHz` : undefined,
    },
    baseBoard: hw.manufacturer ? {
      name: hw.model || 'Unknown',
      serialNumber: hw.serialNumber || undefined,
    } : undefined,
    storage: [
      {
        name: 'Primary Drive',
        drive: 'C:',
        capacity: hw.diskTotal ? `${Math.round(Number(hw.diskTotal) / (1024 * 1024 * 1024))} GB` : undefined,
        used: hw.diskTotal && hw.diskFree
          ? `${Math.round((Number(hw.diskTotal) - Number(hw.diskFree)) / (1024 * 1024 * 1024))} GB`
          : undefined,
        type: hw.diskType || 'SSD',
      },
    ],
    memory: [
      {
        slot: 'Slot 1',
        name: 'System Memory',
        capacity: hw.ramTotal ? `${Math.round(Number(hw.ramTotal) / (1024 * 1024 * 1024))} GB` : undefined,
        memoryType: hw.ramType || undefined,
      },
    ],
    networkAdapters: [],
    graphicsCards: hw.gpuModel ? [{
      name: hw.gpuModel,
      videoMemoryMB: hw.gpuMemoryMB || undefined,
    }] : [],
  };
}

export async function getAssetSoftware(id: string): Promise<AssetSoftware | null> {
  // First, get the asset for OS info
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Get the full software inventory from rawPayload
  const softwareInventory = await prisma.assetSoftwareInventory.findUnique({
    where: { assetId: id },
  });

  // Extract data from rawPayload if available
  const rawPayload = softwareInventory?.rawPayload as Record<string, unknown> | null;

  // Whitelist of known commercial software (case-insensitive partial match)
  const commercialSoftwareWhitelist = [
    // Microsoft
    'microsoft office',
    'microsoft 365',
    'office 365',
    'microsoft word',
    'microsoft excel',
    'microsoft powerpoint',
    'microsoft outlook',
    'microsoft access',
    'microsoft publisher',
    'microsoft visio',
    'microsoft project',
    'visual studio',
    'sql server',
    // Adobe
    'adobe',
    'acrobat',
    'photoshop',
    'illustrator',
    'premiere',
    'after effects',
    'indesign',
    'lightroom',
    'creative cloud',
    // JetBrains
    'jetbrains',
    'intellij',
    'pycharm',
    'webstorm',
    'phpstorm',
    'rider',
    'clion',
    'goland',
    'rubymine',
    'datagrip',
    // Autodesk
    'autodesk',
    'autocad',
    'maya',
    '3ds max',
    'revit',
    'inventor',
    // Other commercial
    'vmware',
    'parallels',
    'zoom',
    'slack',
    'dropbox',
    'box',
    'salesforce',
    'tableau',
    'splunk',
    'datadog',
    'newrelic',
    'jira',
    'confluence',
    'bitbucket',
    'github enterprise',
    'gitlab',
    'teamviewer',
    'anydesk',
    'norton',
    'mcafee',
    'kaspersky',
    'bitdefender',
    'avast',
    'avg',
    'eset',
    'sophos',
    'crowdstrike',
    'sentinelone',
    'carbon black',
    'malwarebytes',
    'webroot',
    'trend micro',
    '1password',
    'lastpass',
    'dashlane',
    'keeper',
    'bitwarden',
    'nordvpn',
    'expressvpn',
    'cisco',
    'fortinet',
    'palo alto',
    'oracle',
    'sap',
    'servicenow',
    'workday',
    'docusign',
    'adobe sign',
    'figma',
    'sketch',
    'canva',
    'notion',
    'asana',
    'monday.com',
    'trello',
    'basecamp',
    'evernote',
    'onenote',
    'grammarly',
    'snagit',
    'camtasia',
    'screenflow',
    'final cut',
    'logic pro',
    'ableton',
    'fl studio',
    'pro tools',
    'cubase',
    'matlab',
    'mathematica',
    'stata',
    'spss',
    'endnote',
    'mendeley',
    'zotero',
  ];

  // System/built-in app patterns - matches native OS apps
  const systemAppPatterns = [
    // Windows built-in apps
    /^microsoft\s+(store|edge|photos|camera|calculator|clock|calendar|mail|maps|weather|news|people|groove|movies|xbox|cortana|feedback|get help|tips|voice recorder|screen sketch|snipping|sticky notes|your phone|phone link|to do|whiteboard|3d|paint 3d|mixed reality|windows|onedrive|solitaire|minesweeper|mahjong)/i,
    /^windows\s+(security|defender|update|backup|terminal|powershell|notepad|wordpad|media player|fax|dvd|photo viewer)/i,
    /^(internet explorer|microsoft solitaire|microsoft minesweeper|microsoft mahjong|microsoft jigsaw|microsoft sudoku|microsoft treasure hunt|xbox game bar|xbox identity|groove music|movies & tv|mixed reality portal|3d viewer|paint 3d)/i,

    // macOS built-in apps
    /^apple\s+(music|tv|books|podcasts|news|arcade|fitness|wallet|weather|clock|calendar|contacts|reminders|notes|freeform|home|find my|photos|facetime|messages|mail|safari|maps|compass|measure|voice memos|stocks|translate|shortcuts|files|health|journal|configurator|developer)/i,
    /^(safari|finder|preview|textedit|font book|digital color meter|grapher|keychain access|migration assistant|system (preferences|settings|information)|disk utility|activity monitor|console|terminal|screenshot|archive utility|automator|bluetooth file exchange|boot camp|colorsync|dvd player|image capture|launchpad|photo booth|quicktime|siri|time machine|xcode)/i,

    // Linux system apps (GNOME, KDE, etc.)
    /^(gnome-|kde-|systemd|dbus|gvfs|evolution|nautilus|gedit|evince|eog|totem|rhythmbox|cheese|baobab|seahorse|network-manager|bluetooth-manager)/i,
    /^(settings|system settings|software center|software updater|ubuntu software|snap store|flatpak|packagekit|synaptic|update manager|software & updates)/i,

    // Common system utilities
    /^(control panel|device manager|task manager|resource monitor|event viewer|services|registry editor|group policy|disk management|computer management)/i,
  ];

  // Parse applications from rawPayload
  const rawApplications = (rawPayload?.applications as Array<Record<string, unknown>>) || [];
  const applications = rawApplications.map((app, index) => {
    // Parse license data if present and has meaningful data
    const rawLicense = app.license as Record<string, unknown> | undefined;
    let license = undefined;

    if (rawLicense) {
      const licenseData = {
        type: rawLicense.type as string | undefined,
        status: rawLicense.status as string | undefined,
        key: rawLicense.key as string | undefined,
        expirationDate: rawLicense.expirationDate as string | undefined,
        daysRemaining: rawLicense.daysRemaining as number | undefined,
        licensedTo: rawLicense.licensedTo as string | undefined,
        productId: rawLicense.productId as string | undefined,
        channel: rawLicense.channel as string | undefined,
      };

      const appName = ((app.name as string) || '').toLowerCase();
      const licenseType = (licenseData.type || '').toLowerCase();

      // Check if app is in whitelist (commercial software)
      const isWhitelisted = commercialSoftwareWhitelist.some((name) =>
        appName.includes(name.toLowerCase())
      );

      // Check if license type is free/opensource - exclude these
      const isFreeware = ['freeware', 'opensource', 'open source', 'free', 'unknown'].includes(
        licenseType
      );

      // Has an actual tracked license key (masked key like XXXXX-XXXXX-...)
      const hasLicenseKey = !!(licenseData.key && licenseData.key.length > 5);

      // STRICT FILTERING: Only include if:
      // 1. App is in commercial whitelist (regardless of license data), OR
      // 2. Has an actual license key AND is not freeware
      if ((isWhitelisted && !isFreeware) || (hasLicenseKey && !isFreeware)) {
        license = licenseData;
      }
    }

    const appName = (app.name as string) || 'Unknown';

    // Check if app matches system app patterns
    const isSystemApp = systemAppPatterns.some((pattern) => pattern.test(appName));

    return {
      id: `app-${index}`,
      name: appName,
      vendor: app.vendor as string | undefined,
      version: app.version as string | undefined,
      appInstalledOn: app.installDate as string | undefined,
      installSource: app.installSource as string | undefined,
      isSystemApp,
      license,
    };
  });

  // Parse services from rawPayload
  const rawServices = (rawPayload?.services as Array<Record<string, unknown>>) || [];
  const services = rawServices.map((svc, index) => ({
    id: `svc-${index}`,
    name: (svc.name as string) || 'Unknown',
    displayName: svc.displayName as string | undefined,
    state: (svc.status as 'Running' | 'Stopped') || undefined,
    startupType: svc.startupType as string | undefined,
    type: 'Service',
    status: svc.status as string | undefined,
  }));

  // Parse startup programs from rawPayload
  const rawStartupPrograms = (rawPayload?.startupPrograms as Array<Record<string, unknown>>) || [];
  const startupPrograms = rawStartupPrograms.map((prog, index) => ({
    id: `startup-${index}`,
    name: (prog.name as string) || 'Unknown',
    command: prog.command as string | undefined,
    location: prog.location as string | undefined,
    enabled: (prog.enabled as boolean) ?? true,
    vendor: prog.vendor as string | undefined,
  }));

  // Get OS info from rawPayload or fall back to asset fields
  const rawOS = rawPayload?.operatingSystem as Record<string, unknown> | undefined;

  return {
    os: {
      name: (rawOS?.name as string) || asset.os || 'Unknown',
      version: (rawOS?.version as string) || asset.osVersion || undefined,
      buildNumber: rawOS?.buildNumber as string | undefined,
      architecture: rawOS?.architecture as string | undefined,
      installDate: rawOS?.installDate as string | undefined,
      licenseStatus: rawOS?.licenseStatus as string | undefined,
    },
    applications,
    services,
    startupPrograms,
  };
}

export async function getAssetSecurity(id: string): Promise<AssetSecurity | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      security: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const sec = asset.security;
  if (!sec) {
    return null;
  }

  return {
    collectedAt: new Date().toISOString(),
    encryption: {
      driveEncryptionEnabled: sec.encryptionEnabled ?? false,
    },
    firewall: {
      enabled: sec.firewallEnabled ?? false,
    },
    antivirus: {
      installed: sec.antivirusInstalled ?? false,
      products: sec.antivirusName
        ? [
            {
              name: sec.antivirusName,
              definitionDate: sec.antivirusUpdated?.toISOString(),
              lastScanDate: sec.lastSecurityScan?.toISOString(),
            },
          ]
        : undefined,
    },
    secureBootEnabled: false,
    uacEnabled: true,
  };
}

export async function getAssetNetwork(id: string): Promise<AssetNetwork | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      ipAddress: true,
      macAddress: true,
      name: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  return {
    collectedAt: new Date().toISOString(),
    identity: {
      hostname: asset.name,
    },
    adapters: asset.ipAddress
      ? [
          {
            id: 'eth0',
            name: 'Ethernet',
            macAddress: asset.macAddress || undefined,
            status: 'Up',
            ipConfiguration: {
              ipv4Address: asset.ipAddress,
              dhcpEnabled: true,
            },
            isPhysical: true,
            isEnabled: true,
          },
        ]
      : [],
    primaryAdapter: 'eth0',
    vpnConnected: false,
    proxyConfigured: false,
  };
}

export async function getAssetPeripherals(id: string): Promise<AssetPeripherals | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Return mock data for now - in production this would come from agent data
  return {
    collectedAt: new Date().toISOString(),
    monitors: [],
    monitorCount: 0,
    usbDevices: [],
    usbDeviceCount: 0,
    printers: [],
    audioDevices: [],
    bluetoothDevices: [],
    bluetoothEnabled: false,
  };
}

export async function getAssetTelemetry(id: string): Promise<AssetTelemetry | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      agent: {
        include: {
          telemetry: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const latestTelemetry = asset.agent?.telemetry?.[0];
  if (!latestTelemetry) {
    return null;
  }

  // Use transformer to get rawPayload if available
  const transformed = transformTelemetryForAPI(latestTelemetry);
  if (transformed && latestTelemetry.rawPayload) {
    // rawPayload contains full telemetry from agent
    const raw = transformed as Record<string, unknown>;
    const cpuRaw = raw.cpu as Record<string, unknown> | undefined;
    const memoryRaw = raw.memory as Record<string, unknown> | undefined;
    const diskRaw = raw.disk as Record<string, unknown> | undefined;
    const networkRaw = raw.network as Record<string, unknown> | undefined;
    const processesRaw = raw.processes as Record<string, unknown> | undefined;

    return {
      timestamp: latestTelemetry.timestamp.toISOString(),
      cpu: {
        // Support both old format (usage) and new format (usagePercent)
        usagePercent: cpuRaw?.usagePercent as number ?? cpuRaw?.usage as number ?? latestTelemetry.cpuUsage ?? 0,
        userPercent: cpuRaw?.userPercent as number | undefined,
        systemPercent: cpuRaw?.systemPercent as number | undefined,
        idlePercent: cpuRaw?.idlePercent as number | undefined,
        loadAverage: cpuRaw?.loadAverage as number[] | undefined,
        temperature: cpuRaw?.temperature as number | undefined,
        processCount: processesRaw?.totalCount as number ?? latestTelemetry.processCount ?? undefined,
      },
      memory: {
        usagePercent: memoryRaw?.usagePercent as number ?? memoryRaw?.usage as number ?? latestTelemetry.memoryUsage ?? 0,
        usedBytes: memoryRaw?.usedBytes as number | undefined,
        availableBytes: memoryRaw?.availableBytes as number | undefined,
        totalBytes: memoryRaw?.totalBytes as number | undefined,
        usedHuman: memoryRaw?.usedHuman as string | undefined,
        availableHuman: memoryRaw?.availableHuman as string | undefined,
      },
      disk: {
        drives: diskRaw?.drives as Array<{ mountPoint: string; usagePercent: number; name?: string; usedBytes?: number; availableBytes?: number; totalBytes?: number }> ?? [
          {
            mountPoint: 'C:',
            usagePercent: latestTelemetry.diskUsage ?? 0,
          },
        ],
      },
      network: {
        bytesSentPerSec: networkRaw?.bytesSentPerSec as number | undefined,
        bytesReceivedPerSec: networkRaw?.bytesReceivedPerSec as number | undefined,
        totalBytesSentPerSec: latestTelemetry.networkOutBps ? Number(latestTelemetry.networkOutBps) : undefined,
        totalBytesReceivedPerSec: latestTelemetry.networkInBps ? Number(latestTelemetry.networkInBps) : undefined,
      },
      processes: processesRaw ? {
        totalCount: processesRaw.totalCount as number | undefined,
        runningCount: processesRaw.runningCount as number | undefined,
        topByCpu: (processesRaw.topByCPU || processesRaw.topByCpu) as Array<{ pid: number; name: string; cpuPercent: number }> | undefined,
        topByMemory: processesRaw.topByMemory as Array<{ pid: number; name: string; memoryPercent: number }> | undefined,
      } : undefined,
      systemUptime: formatSystemUptime(latestTelemetry.uptime, raw.systemUptime),
      thermal: raw.thermal as Record<string, unknown> | undefined,
      power: raw.power as Record<string, unknown> | undefined,
      agentUtilization: raw.agentUtilization as Record<string, unknown> | undefined,
      pendingReboot: latestTelemetry.pendingReboot ?? false,
    };
  }

  // Fallback to summary fields
  return {
    timestamp: latestTelemetry.timestamp.toISOString(),
    cpu: {
      usagePercent: latestTelemetry.cpuUsage ?? 0,
      processCount: latestTelemetry.processCount ?? undefined,
    },
    memory: {
      usagePercent: latestTelemetry.memoryUsage ?? 0,
    },
    disk: {
      drives: [
        {
          mountPoint: 'C:',
          usagePercent: latestTelemetry.diskUsage ?? 0,
        },
      ],
    },
    network: {
      totalBytesSentPerSec: latestTelemetry.networkOutBps ? Number(latestTelemetry.networkOutBps) : undefined,
      totalBytesReceivedPerSec: latestTelemetry.networkInBps ? Number(latestTelemetry.networkInBps) : undefined,
    },
    systemUptime: formatSystemUptime(latestTelemetry.uptime, undefined),
    pendingReboot: latestTelemetry.pendingReboot ?? false,
  };
}

export async function getAssetTelemetryHistory(
  id: string,
  period: 'hour' | 'day' | 'week' = 'day'
): Promise<TelemetryHistory> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { agent: { select: { id: true } } },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const hoursMap = { hour: 1, day: 24, week: 168 };
  const hours = hoursMap[period];
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  let telemetry: any[] = [];
  if (asset.agent) {
    telemetry = await prisma.agentTelemetry.findMany({
      where: {
        agentId: asset.agent.id,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
      take: 100,
    });
  }

  const mapToDataPoints = (
    data: any[],
    getValue: (t: any) => number | null
  ): Array<{ timestamp: string; value: number }> => {
    return data
      .filter((t) => getValue(t) !== null)
      .map((t) => ({
        timestamp: t.timestamp.toISOString(),
        value: getValue(t) ?? 0,
      }));
  };

  return {
    cpu: mapToDataPoints(telemetry, (t) => t.cpuUsage),
    memory: mapToDataPoints(telemetry, (t) => t.memoryUsage),
    disk: mapToDataPoints(telemetry, (t) => t.diskUsage),
    networkIn: mapToDataPoints(telemetry, (t) => t.networkInBps ? Number(t.networkInBps) : null),
    networkOut: mapToDataPoints(telemetry, (t) => t.networkOutBps ? Number(t.networkOutBps) : null),
  };
}

export async function getAssetErrors(id: string): Promise<SystemErrors> {
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Return mock data for now - in production this would come from agent data
  return {
    applicationCrashCount24h: 0,
    applicationCrashCount7d: 0,
    bsodCount30d: 0,
    systemEventLogErrors24h: 0,
    criticalEventCount24h: 0,
  };
}

export async function getAssetAuditLog(id: string): Promise<AssetAuditLog[]> {
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      resource: 'asset',
      resourceId: id,
    },
    orderBy: { timestamp: 'desc' },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    user: log.user?.name || log.user?.email || 'System',
    details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details),
  }));
}

// ============================================
// Asset Alerts Service
// ============================================

export async function getAssetAlerts(id: string): Promise<{ data: AssetAlertResponse[]; summary: { total: number; critical: number; warning: number; info: number; clear: number; open: number; resolved: number } }> {
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const alerts = await prisma.assetAlert.findMany({
    where: { assetId: id },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    total: alerts.length,
    critical: 0,
    warning: 0,
    info: 0,
    clear: 0,
    open: 0,
    resolved: 0,
  };

  const data: AssetAlertResponse[] = alerts.map((a) => {
    const sev = a.severity.toUpperCase();
    if (sev === 'CRITICAL') summary.critical++;
    else if (sev === 'WARNING') summary.warning++;
    else if (sev === 'INFO') summary.info++;
    else if (sev === 'CLEAR') summary.clear++;

    if (a.status === 'Open') summary.open++;
    else if (a.status === 'Resolved') summary.resolved++;

    return {
      id: a.id,
      alert: a.alert,
      severity: a.severity,
      module: a.module,
      attribute: a.attribute,
      value: a.value,
      message: a.message,
      status: a.status,
      createdOn: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() || null,
    };
  });

  return { data, summary };
}

// ============================================
// Asset Vulnerabilities Service
// ============================================

export async function getAssetVulnerabilities(id: string) {
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Get vulnerabilities linked to this asset through the AssetVulnerability relation
  const assetVulnerabilities = await prisma.assetVulnerability.findMany({
    where: { assetId: id },
    include: {
      vulnerability: {
        include: {
          affectedSoftware: { select: { id: true } },
        },
      },
    },
    orderBy: { detectedAt: 'desc' },
  });

  // Calculate summary stats
  const summary = {
    total: assetVulnerabilities.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    open: 0,
    resolved: 0,
  };

  const data = assetVulnerabilities.map((av) => {
    const vuln = av.vulnerability;

    // Update summary counts
    const severity = vuln.severity.toLowerCase();
    if (severity === 'critical') summary.critical++;
    else if (severity === 'high') summary.high++;
    else if (severity === 'medium') summary.medium++;
    else if (severity === 'low') summary.low++;

    if (av.status === 'Open') summary.open++;
    else if (av.status === 'Resolved') summary.resolved++;

    return {
      id: av.id,
      cveId: vuln.cveId,
      title: vuln.title || vuln.cveId,
      description: vuln.description || '',
      severity: vuln.severity,
      cvssScore: vuln.cvss3BaseScore ?? vuln.cvss2BaseScore ?? 0,
      epss: vuln.epss ?? 0,
      exploitable: vuln.exploitable,
      riskScore: vuln.riskScore ?? 0,
      status: av.status,
      detectedAt: av.detectedAt.toISOString(),
      resolvedAt: av.resolvedAt?.toISOString() || null,
      publishedDate: vuln.publishedDate?.toISOString() || null,
      affectedSoftwareCount: vuln.affectedSoftware?.length ?? 0,
    };
  });

  return { data, summary };
}

// ============================================
// Software Inventory Service
// ============================================

export async function listSoftwareInventory(): Promise<SoftwareInventoryResponse[]> {
  // Aggregate software across all assets
  const software = await prisma.assetSoftware.groupBy({
    by: ['name', 'version', 'vendor'],
    _count: { _all: true },
  });

  return software.map((s, i) => ({
    id: `sw-${i + 1}`,
    softwareName: s.name,
    version: s.version,
    softwareType: 'Application',
    manufacturer: s.vendor,
    totalInstances: s._count._all,
    createdAt: new Date().toISOString(),
  }));
}

// ============================================
// Software Licenses Service
// ============================================

export async function listSoftwareLicenses(): Promise<SoftwareLicenseResponse[]> {
  const licenses = await prisma.softwareLicense.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return licenses.map(transformSoftwareLicense);
}

export async function getSoftwareLicenseById(id: string): Promise<SoftwareLicenseResponse> {
  const license = await prisma.softwareLicense.findUnique({
    where: { id },
  });

  if (!license) {
    throw new NotFoundError('Software license not found');
  }

  return transformSoftwareLicense(license);
}

export async function createSoftwareLicense(data: SoftwareLicenseCreateInput): Promise<SoftwareLicenseResponse> {
  const license = await prisma.softwareLicense.create({
    data: {
      licenseName: data.licenseName,
      softwareName: data.softwareName,
      publisher: data.publisher || null,
      licenseKey: data.licenseKey || null,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      licenseCount: data.licenseCount,
      vendorName: data.vendorName,
      cost: data.cost || null,
      status: data.status,
      notes: data.notes || null,
    },
  });

  return transformSoftwareLicense(license);
}

export async function updateSoftwareLicense(
  id: string,
  data: SoftwareLicenseUpdateInput
): Promise<SoftwareLicenseResponse> {
  const existing = await prisma.softwareLicense.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Software license not found');
  }

  const license = await prisma.softwareLicense.update({
    where: { id },
    data: {
      licenseName: data.licenseName ?? undefined,
      softwareName: data.softwareName ?? undefined,
      publisher: data.publisher ?? undefined,
      licenseKey: data.licenseKey ?? undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      licenseCount: data.licenseCount ?? undefined,
      vendorName: data.vendorName ?? undefined,
      cost: data.cost ?? undefined,
      status: data.status ?? undefined,
      notes: data.notes ?? undefined,
    },
  });

  return transformSoftwareLicense(license);
}

export async function deleteSoftwareLicense(id: string): Promise<void> {
  const existing = await prisma.softwareLicense.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('Software license not found');
  }

  await prisma.softwareLicense.delete({ where: { id } });
}

function transformSoftwareLicense(license: any): SoftwareLicenseResponse {
  return {
    id: license.id,
    licenseName: license.licenseName,
    softwareName: license.softwareName,
    publisher: license.publisher,
    licenseKey: license.licenseKey,
    purchaseDate: license.purchaseDate?.toISOString()?.split('T')[0],
    expiryDate: license.expiryDate?.toISOString()?.split('T')[0],
    licenseCount: license.licenseCount,
    vendorName: license.vendorName,
    cost: license.cost ? Number(license.cost) : null,
    status: license.status,
    notes: license.notes,
    createdAt: license.createdAt instanceof Date ? license.createdAt.toISOString() : license.createdAt,
  };
}

// ============================================
// OS Licenses Service
// ============================================

export async function listOSLicenses(): Promise<OSLicenseResponse[]> {
  const licenses = await prisma.oSLicense.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return licenses.map(transformOSLicense);
}

export async function getOSLicenseById(id: string): Promise<OSLicenseResponse> {
  const license = await prisma.oSLicense.findUnique({
    where: { id },
  });

  if (!license) {
    throw new NotFoundError('OS license not found');
  }

  return transformOSLicense(license);
}

export async function createOSLicense(data: OSLicenseCreateInput): Promise<OSLicenseResponse> {
  const license = await prisma.oSLicense.create({
    data: {
      licenseName: data.licenseName,
      osType: data.osType,
      status: data.status,
      licenseCount: data.licenseCount,
      vendorName: data.vendorName,
      licenseKey: data.licenseKey || null,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      publisher: data.publisher || null,
      cost: data.cost || null,
      notes: data.notes || null,
    },
  });

  return transformOSLicense(license);
}

export async function updateOSLicense(id: string, data: OSLicenseUpdateInput): Promise<OSLicenseResponse> {
  const existing = await prisma.oSLicense.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('OS license not found');
  }

  const license = await prisma.oSLicense.update({
    where: { id },
    data: {
      licenseName: data.licenseName ?? undefined,
      osType: data.osType ?? undefined,
      status: data.status ?? undefined,
      licenseCount: data.licenseCount ?? undefined,
      vendorName: data.vendorName ?? undefined,
      licenseKey: data.licenseKey ?? undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      publisher: data.publisher ?? undefined,
      cost: data.cost ?? undefined,
      notes: data.notes ?? undefined,
    },
  });

  return transformOSLicense(license);
}

export async function deleteOSLicense(id: string): Promise<void> {
  const existing = await prisma.oSLicense.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError('OS license not found');
  }

  await prisma.oSLicense.delete({ where: { id } });
}

function transformOSLicense(license: any): OSLicenseResponse {
  return {
    id: license.id,
    licenseName: license.licenseName,
    osType: license.osType,
    status: license.status,
    licenseCount: license.licenseCount,
    vendorName: license.vendorName,
    licenseKey: license.licenseKey,
    purchaseDate: license.purchaseDate?.toISOString()?.split('T')[0],
    expiryDate: license.expiryDate?.toISOString()?.split('T')[0],
    publisher: license.publisher,
    cost: license.cost,
    notes: license.notes,
    createdAt: license.createdAt instanceof Date ? license.createdAt.toISOString() : license.createdAt,
  };
}
