import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '@shared/errors';
import { prisma } from '@/db/client';
import {
  createAuditLog,
  AuditAction,
  AuditResource,
} from '@middleware/audit';
import type {
  CategoryResponse,
  SubCategoryResponse,
  TagResponse,
} from './assets.types';
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
  SubCategoryCreateInput,
  SubCategoryUpdateInput,
  TagCreateInput,
  TagUpdateInput,
} from './assets.validators';
import { categoryCrudService } from './category-crud.service';
import { tagCrudService } from './tag-crud.service';
import { transformTag } from './assets-helpers';

// ============================================
// Categories Service
// ============================================

// Categories — delegated to BaseCrudService (see category-crud.service.ts)
export async function listCategories(): Promise<CategoryResponse[]> {
  const result = await categoryCrudService.findMany({ limit: 1000 });
  return result.data;
}
export const getCategoryById = (id: string) => categoryCrudService.findById(id);
export const createCategory = (data: CategoryCreateInput) => categoryCrudService.create(data);
export const updateCategory = (id: string, data: CategoryUpdateInput) => categoryCrudService.update(id, data);
export const deleteCategory = (id: string) => categoryCrudService.delete(id);

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

function transformSubCategory(subCategory: Prisma.SubCategoryGetPayload<object> & { categoryName?: string }): SubCategoryResponse {
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

// Tags — CRUD delegated to BaseCrudService (see tag-crud.service.ts)
export interface TagQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const listTags = (params: TagQueryParams = {}) => tagCrudService.findMany(params);
export const getTagById = (id: string) => tagCrudService.findById(id);
export const createTag = (data: TagCreateInput) => tagCrudService.create(data);
export const updateTag = (id: string, data: TagUpdateInput) => tagCrudService.update(id, data);
export const deleteTag = (id: string) => tagCrudService.delete(id);

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

export async function bulkAssignTags(assetIds: string[], tagIds: string[], organizationId?: string): Promise<{ message: string; assignedCount: number }> {
  // Filter to only org-owned assets
  const assetWhere: Prisma.AssetWhereInput = { id: { in: assetIds } };
  if (organizationId) {
    assetWhere.organizationId = organizationId;
  }
  const assets = await prisma.asset.findMany({
    where: assetWhere,
    select: { id: true },
  });
  const validAssetIds = assets.map(a => a.id);

  if (validAssetIds.length === 0) {
    return { message: 'No matching assets found in your organization', assignedCount: 0 };
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
  const data = validAssetIds.flatMap((assetId) =>
    tagIds.map((tagId) => ({ assetId, tagId }))
  );

  // Bulk create, skipping duplicates
  const result = await prisma.assetTag.createMany({
    data,
    skipDuplicates: true,
  });

  return {
    message: `Tags assigned to ${validAssetIds.length} assets`,
    assignedCount: result.count,
  };
}

export async function bulkRemoveTags(assetIds: string[], tagIds: string[], organizationId?: string): Promise<{ message: string; removedCount: number }> {
  const orgFilter: Prisma.AssetWhereInput = { id: { in: assetIds } };
  if (organizationId) {
    orgFilter.organizationId = organizationId;
  }
  const assets = await prisma.asset.findMany({ where: orgFilter, select: { id: true } });
  const validAssetIds = assets.map(a => a.id);

  if (validAssetIds.length === 0) {
    return { message: 'No matching assets found in your organization', removedCount: 0 };
  }

  const result = await prisma.assetTag.deleteMany({
    where: { assetId: { in: validAssetIds }, tagId: { in: tagIds } },
  });

  return { message: `Tags removed from ${validAssetIds.length} assets`, removedCount: result.count };
}

export async function searchTags(q: string) {
  const tags = await prisma.tag.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
  });

  return tags.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    color: t.color,
    icon: t.icon,
    priority: t.priority,
    compliance: t.compliance,
  }));
}

export async function getAssetsByCategory(categoryId: string, organizationId?: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const where: Prisma.AssetWhereInput = { categoryId };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  const assets = await prisma.asset.findMany({
    where,
    include: { tags: { include: { tag: true } }, category: true, subCategory: true },
  });

  return assets;
}

export async function getAssetsBySubCategory(subCategoryId: string, organizationId?: string) {
  const subCategory = await prisma.subCategory.findUnique({ where: { id: subCategoryId } });
  if (!subCategory) {
    throw new NotFoundError('Subcategory not found');
  }

  const where: Prisma.AssetWhereInput = { subCategoryId };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  const assets = await prisma.asset.findMany({
    where,
    include: { tags: { include: { tag: true } }, category: true, subCategory: true },
  });

  return assets;
}

export async function getEndpointDetails(assetId: string, organizationId?: string) {
  const where: Prisma.AssetWhereInput = { id: assetId };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  const asset = await prisma.asset.findFirst({
    where,
    include: {
      category: true,
      subCategory: true,
      tags: { include: { tag: true } },
      vulnerabilities: { include: { vulnerability: true }, take: 20 },
    },
  });

  if (!asset) {
    throw new NotFoundError('Endpoint not found');
  }

  const [totalVulnerabilities, deploymentTasks] = await Promise.all([
    prisma.assetVulnerability.count({ where: { assetId } }),
    prisma.patchDeploymentTask.findMany({
      where: { assetId },
      include: { deployment: { include: { patches: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const relatedPatches = deploymentTasks
    .flatMap(t => t.deployment?.patches || [])
    .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
    .slice(0, 10)
    .map(p => ({ id: p.id, title: p.title, severity: p.severity, status: p.status }));

  const recentDeployments = deploymentTasks.slice(0, 5).map(t => ({
    id: t.id,
    deploymentId: t.deploymentId,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt?.toISOString() || null,
  }));

  const installedCount = deploymentTasks.filter(t => t.status === 'COMPLETED').length;
  const pendingCount = deploymentTasks.filter(t => ['PENDING', 'IN_PROGRESS'].includes(t.status)).length;

  return {
    id: asset.id,
    name: asset.name,
    os: asset.os || 'Unknown',
    osVersion: asset.osVersion || 'Unknown',
    status: asset.status || 'Unknown',
    lastSeen: asset.updatedAt.toISOString(),
    ipAddress: asset.ipAddress || null,
    hostname: asset.hostname || asset.name,
    category: asset.category,
    subCategory: asset.subCategory,
    tags: asset.tags.map(at => at.tag),
    patchSummary: {
      totalVulnerabilities,
      installedPatches: installedCount,
      pendingPatches: pendingCount,
    },
    relatedPatches,
    recentDeployments,
  };
}
