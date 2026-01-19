import { prisma } from '@/db/client';
import { NotFoundError, ConflictError, BadRequestError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import { PaginationParams } from '@shared/types';
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

// Helper to generate asset display ID
function generateAssetId(count: number): string {
  return `AST-${String(count + 1).padStart(4, '0')}`;
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

export async function addTagsToAsset(assetId: string, tagIds: string[]): Promise<TagResponse[]> {
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

  return getAssetTags(assetId);
}

export async function removeTagFromAsset(assetId: string, tagId: string): Promise<void> {
  // Verify asset exists
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

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
        agent: { select: { id: true, status: true } },
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
      agent: { select: { id: true, status: true, lastHeartbeat: true } },
      hardware: true,
      security: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  return transformAsset(asset);
}

export async function createAsset(data: AssetCreateInput): Promise<AssetResponse> {
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

  return transformAsset(asset);
}

export async function updateAsset(id: string, data: AssetUpdateInput): Promise<AssetResponse> {
  const existing = await prisma.asset.findUnique({
    where: { id },
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
      name: data.name,
      status: data.status,
      serialNumber: data.serialNumber,
      os: data.osType,
      osVersion: data.osVersion,
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      manufacturer: data.manufacturer,
      model: data.model,
    },
    include: {
      tags: { include: { tag: true } },
      agent: { select: { id: true, status: true } },
    },
  });

  return transformAsset(asset);
}

export async function deleteAsset(id: string): Promise<void> {
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
}

export async function bulkDeleteAssets(ids: string[]): Promise<{ deleted: number }> {
  const result = await prisma.asset.deleteMany({
    where: { id: { in: ids } },
  });

  return { deleted: result.count };
}

function transformAsset(asset: any): AssetResponse {
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
    ipAddress: asset.ipAddress,
    macAddress: asset.macAddress,
    serialNumber: asset.serialNumber,
    manufacturer: asset.manufacturer,
    model: asset.model,
    osType: asset.os,
    osVersion: asset.osVersion,
    tags: asset.tags?.map((at: any) => transformTag(at.tag)),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

// ============================================
// Asset Details Service
// ============================================

export async function getAssetLifeCycle(id: string): Promise<AssetLifeCycle> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: {
      purchaseDate: true,
      warrantyExpiry: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const now = new Date();
  const purchaseDate = asset.purchaseDate;
  const purchaseValue = 40000; // Mock value
  const depreciationRate = 0.2; // 20% per year

  // Calculate current value based on straight-line depreciation
  let currentValue = purchaseValue;
  if (purchaseDate) {
    const yearsOwned = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    currentValue = Math.max(purchaseValue * (1 - depreciationRate * yearsOwned), purchaseValue * 0.2);
  }

  const depreciationTimeline: Array<{ date: string; value: number; label: string }> = [];

  if (purchaseDate) {
    depreciationTimeline.push({
      date: purchaseDate.toISOString().split('T')[0],
      value: purchaseValue,
      label: 'Purchased on',
    });
  }

  depreciationTimeline.push({
    date: now.toISOString().split('T')[0],
    value: Math.round(currentValue),
    label: 'Today',
  });

  if (asset.warrantyExpiry) {
    depreciationTimeline.push({
      date: asset.warrantyExpiry.toISOString().split('T')[0],
      value: Math.round(currentValue * 0.8),
      label: 'Warranty Expiry Date',
    });
  }

  return {
    purchaseDate: purchaseDate?.toISOString().split('T')[0],
    purchaseValue,
    currentDate: now.toISOString().split('T')[0],
    currentValue: Math.round(currentValue),
    amcExpiryDate: null,
    warrantyExpiryDate: asset.warrantyExpiry?.toISOString().split('T')[0],
    endOfLife: purchaseDate
      ? new Date(purchaseDate.getTime() + 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null,
    endOfLifeValue: Math.round(purchaseValue * 0.2),
    depreciationTimeline,
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

  return {
    bios: {
      name: hw.biosVersion || undefined,
      biosVersion: hw.biosVersion || undefined,
    },
    processor: {
      name: hw.cpu || undefined,
      numberOfCores: hw.cpuCores || undefined,
    },
    storage: [
      {
        name: 'Primary Drive',
        capacity: hw.diskTotal ? `${Math.round(Number(hw.diskTotal) / (1024 * 1024 * 1024))} GB` : undefined,
        type: 'SSD',
      },
    ],
    memory: [
      {
        slot: 'Slot 1',
        capacity: hw.ramTotal ? `${Math.round(Number(hw.ramTotal) / (1024 * 1024 * 1024))} GB` : undefined,
      },
    ],
    networkAdapters: [],
  };
}

export async function getAssetSoftware(id: string): Promise<AssetSoftware | null> {
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      software: true,
    },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const applications = asset.software
    .filter((s) => !s.isSystem)
    .map((s, i) => ({
      id: s.id,
      name: s.name,
      vendor: s.vendor || undefined,
      version: s.version || undefined,
      appInstalledOn: s.installDate?.toISOString(),
    }));

  const services = asset.software
    .filter((s) => s.isSystem)
    .map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version || undefined,
      type: 'System',
    }));

  return {
    os: asset.os
      ? {
          name: asset.os,
          version: asset.osVersion || undefined,
        }
      : undefined,
    applications,
    services,
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

  return {
    timestamp: latestTelemetry.timestamp.toISOString(),
    cpu: {
      usagePercent: latestTelemetry.cpuUsage ?? 0,
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
    systemUptime: latestTelemetry.uptime || undefined,
    pendingReboot: false,
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
    networkIn: [],
    networkOut: [],
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
      resource: 'Asset',
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
