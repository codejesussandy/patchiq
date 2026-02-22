import type { Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import { withTransaction } from '@shared/utils/transaction';
import { prisma } from '@/db/client';

import { generatePatchId, transformPatch } from './patches.helpers';
import {
  updateVulnerabilityPatchStatus,
  revertVulnerabilityPatchStatus,
  autoCorrelateCves,
  generateRecommendationsForPatchCves,
} from './patches-cve.service';
import { autoQueueDownload, autoGeneratePatchBundle } from './patches-bundle.service';
import { evaluateZeroTouchRules } from './patches-zero-touch.service';
import type {
  CreatePatchInput,
  UpdatePatchInput,
  PatchListQuery,
} from './patches.validator';

const logger = createLogger('patches');

// ============================================
// Patches CRUD
// ============================================

export async function listPatches(params: PatchListQuery) {
  const where: Prisma.PatchWhereInput = {};

  if (params.severity?.length) where.severity = params.severity.length === 1 ? params.severity[0] : { in: params.severity };
  if (params.os?.length) where.os = params.os.length === 1 ? params.os[0] : { in: params.os };
  if (params.category?.length) where.category = params.category.length === 1 ? params.category[0] : { in: params.category };
  if (params.testStatus) where.testStatus = params.testStatus;
  if (params.approvalStatus) where.approvalStatus = params.approvalStatus;

  if (!params.includeSuperseded) {
    where.supersededAt = null;
  }

  if (params.search) {
    where.OR = [
      { patchId: { contains: params.search, mode: 'insensitive' } },
      { title: { contains: params.search, mode: 'insensitive' } },
      { software: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [patches, total] = await Promise.all([
    prisma.patch.findMany({
      where,
      include: {
        bundle: true,
      },
      orderBy: params.sort
        ? { [params.sort]: params.order }
        : { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patch.count({ where }),
  ]);

  return paginate(patches.map(transformPatch), total, { page: params.page, limit: params.limit });
}

export async function getPatchById(id: string) {
  const patch = await prisma.patch.findUnique({
    where: { id },
    include: {
      bundle: true,
      affectedProducts: true,
      vulnerabilities: true,
    },
  });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  return transformPatch(patch);
}

export async function getPatchBundleByPatchId(patchId: string) {
  return prisma.patchBundle.findUnique({ where: { patchId } });
}

export async function createPatch(data: CreatePatchInput) {
  const patchId = await generatePatchId(data.os || 'W');

  const patch = await withTransaction('createPatch', async (tx) => {
    const patch = await tx.patch.create({
      data: {
        patchId,
        title: data.title || data.software,
        software: data.software,
        description: data.description,
        severity: data.severity || 'UNSPECIFIED',
        category: data.category,
        vendor: data.vendor,
        product: data.product,
        os: data.os,
        platform: data.platform,
        architecture: data.architecture,
        kbNumber: data.kbNumber,
        bulletinId: data.bulletinId,
        publishedAt: data.releaseDate ? new Date(data.releaseDate) : null,
        downloadUrl: data.downloadUrl || null,
        referenceUrl: data.referenceUrl,
        rebootRequired: data.rebootRequired ?? false,
        supportUninstallation: data.supportUninstallation ?? false,
        languagesSupported: data.languagesSupported || [],
        tags: data.tags || [],
        cveNumbers: data.cveNumbers || [],
        operationalStatusSince: new Date(),
      },
    });

    return patch;
  });

  await updateVulnerabilityPatchStatus(patch.id, patch.cveNumbers);

  if (patch.cveNumbers && patch.cveNumbers.length > 0) {
    generateRecommendationsForPatchCves(patch.id, patch.cveNumbers).catch((err) => {
      logger.error({ err, patchId: patch.id }, 'Direction B recommendation generation failed');
    });
  }

  if (!patch.cveNumbers || patch.cveNumbers.length === 0) {
    autoCorrelateCves(patch.id).catch((err) => {
      logger.error({ err, patchId: patch.id }, 'CVE correlator failed');
    });
  }

  if (patch.downloadUrl) {
    autoQueueDownload(patch.id, patch.downloadUrl, patch.software || patch.title).catch((err) => {
      logger.error({ err, patchId: patch.id }, 'Auto-download queue failed');
    });
  }

  autoGeneratePatchBundle(patch.id).catch((err) => {
    logger.error({ err, patchId: patch.id }, 'PatchBundle auto-generation failed');
  });

  return transformPatch(patch);
}

export async function updatePatch(id: string, data: UpdatePatchInput) {
  const existing = await prisma.patch.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Patch not found');
  }

  const oldCves = existing.cveNumbers || [];
  const newCves = data.cveNumbers !== undefined ? data.cveNumbers : oldCves;

  const patch = await prisma.patch.update({
    where: { id },
    data: {
      software: data.software,
      title: data.title,
      description: data.description,
      severity: data.severity,
      category: data.category,
      vendor: data.vendor,
      product: data.product,
      os: data.os,
      platform: data.platform,
      architecture: data.architecture,
      kbNumber: data.kbNumber,
      bulletinId: data.bulletinId,
      publishedAt: data.releaseDate ? new Date(data.releaseDate) : undefined,
      downloadUrl: data.downloadUrl,
      referenceUrl: data.referenceUrl,
      rebootRequired: data.rebootRequired,
      supportUninstallation: data.supportUninstallation,
      languagesSupported: data.languagesSupported,
      testStatus: data.testStatus,
      approvalStatus: data.approvalStatus,
      tags: data.tags,
      cveNumbers: data.cveNumbers,
    },
  });

  if (data.cveNumbers !== undefined) {
    const removedCves = oldCves.filter(cve => !newCves.includes(cve));
    const addedCves = newCves.filter(cve => !oldCves.includes(cve));

    await revertVulnerabilityPatchStatus(id, removedCves);
    await updateVulnerabilityPatchStatus(id, addedCves);
  }

  if (data.cveNumbers !== undefined && data.cveNumbers.length === 0) {
    autoCorrelateCves(id).catch((err) => {
      logger.error({ err, patchId: id }, 'CVE correlator failed');
    });
  }

  if (data.approvalStatus === 'APPROVED' &&
      existing.approvalStatus !== 'APPROVED') {
    evaluateZeroTouchRules(id).catch((err) => {
      logger.error({ err, patchId: id }, 'Zero-touch evaluation failed');
    });
  }

  if (data.downloadUrl && data.downloadUrl !== existing.downloadUrl && existing.downloadStatus !== 'COMPLETED') {
    autoQueueDownload(patch.id, data.downloadUrl, patch.software || patch.title).catch((err) => {
      logger.error({ err, patchId: patch.id }, 'Auto-download queue failed');
    });
  }

  const bundleRelevantChanged = data.software !== undefined || data.downloadUrl !== undefined;
  if (bundleRelevantChanged) {
    autoGeneratePatchBundle(patch.id).catch((err) => {
      logger.error({ err, patchId: patch.id }, 'PatchBundle re-generation failed');
    });
  }

  return transformPatch(patch);
}

export async function deletePatch(id: string) {
  const existing = await prisma.patch.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Patch not found');
  }

  await prisma.patch.delete({ where: { id } });

  await revertVulnerabilityPatchStatus(id, existing.cveNumbers || []);

  return { success: true };
}

// ============================================
// Supersedence
// ============================================

export async function supersedePatch(oldPatchId: string, newPatchId: string) {
  const [oldPatch, newPatch] = await Promise.all([
    prisma.patch.findUnique({ where: { id: oldPatchId } }),
    prisma.patch.findUnique({ where: { id: newPatchId } }),
  ]);

  if (!oldPatch) {
    throw new NotFoundError(`Patch ${oldPatchId} not found`);
  }

  if (!newPatch) {
    throw new NotFoundError(`Patch ${newPatchId} not found`);
  }

  if (newPatch.supersededBy && newPatch.supersededBy.length > 0) {
    throw new BadRequestError('Cannot supersede with a patch that is already superseded');
  }

  await withTransaction('supersedePatch', async (tx) => {
    await tx.patch.update({
      where: { id: oldPatchId },
      data: {
        supersededBy: [...(oldPatch.supersededBy || []), newPatchId],
        supersededAt: new Date(),
      },
    });
    await tx.patch.update({
      where: { id: newPatchId },
      data: {
        supersedes: [...(newPatch.supersedes || []), oldPatchId],
      },
    });
  });

  logger.info({ oldPatchId: oldPatch.patchId, newPatchId: newPatch.patchId }, 'Patch superseded');

  return {
    success: true,
    message: `Patch ${oldPatch.patchId} marked as superseded by ${newPatch.patchId}`,
  };
}

export async function removeSupersedence(oldPatchId: string, newPatchId: string) {
  const [oldPatch, newPatch] = await Promise.all([
    prisma.patch.findUnique({ where: { id: oldPatchId } }),
    prisma.patch.findUnique({ where: { id: newPatchId } }),
  ]);

  if (!oldPatch || !newPatch) {
    throw new NotFoundError('One or both patches not found');
  }

  await withTransaction('removeSupersedence', async (tx) => {
    await tx.patch.update({
      where: { id: oldPatchId },
      data: {
        supersededBy: (oldPatch.supersededBy || []).filter(id => id !== newPatchId),
        supersededAt: (oldPatch.supersededBy || []).filter(id => id !== newPatchId).length > 0
          ? oldPatch.supersededAt
          : null,
      },
    });
    await tx.patch.update({
      where: { id: newPatchId },
      data: {
        supersedes: (newPatch.supersedes || []).filter(id => id !== oldPatchId),
      },
    });
  });

  return {
    success: true,
    message: 'Supersedence relationship removed',
  };
}

export async function getSupersededPatches(patchId: string) {
  const patch = await prisma.patch.findUnique({
    where: { id: patchId },
    select: { supersedes: true },
  });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  if (!patch.supersedes || patch.supersedes.length === 0) {
    return [];
  }

  return prisma.patch.findMany({
    where: { id: { in: patch.supersedes } },
    select: {
      id: true,
      patchId: true,
      title: true,
      severity: true,
      supersededAt: true,
    },
  });
}

export async function getSupersedingPatches(patchId: string) {
  const patch = await prisma.patch.findUnique({
    where: { id: patchId },
    select: { supersededBy: true },
  });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  if (!patch.supersededBy || patch.supersededBy.length === 0) {
    return [];
  }

  return prisma.patch.findMany({
    where: { id: { in: patch.supersededBy } },
    select: {
      id: true,
      patchId: true,
      title: true,
      severity: true,
      createdAt: true,
    },
  });
}

// ============================================
// Patch Related Data
// ============================================

export async function getAffectedProducts(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const products = await prisma.patchAffectedProduct.findMany({
    where: { patchId },
  });

  return products.map((p) => ({
    id: p.id,
    softwareName: p.softwareName,
    version: p.version,
    vendor: p.vendor,
    installedOn: p.installedOn,
    platform: p.platform,
  }));
}

export async function addAffectedProduct(
  patchId: string,
  data: { softwareName: string; version?: string; vendor?: string; platform?: string }
) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const product = await prisma.patchAffectedProduct.create({
    data: {
      patchId,
      softwareName: data.softwareName,
      version: data.version || null,
      vendor: data.vendor || null,
      platform: data.platform || null,
    },
  });

  return {
    id: product.id,
    softwareName: product.softwareName,
    version: product.version,
    vendor: product.vendor,
    installedOn: product.installedOn,
    platform: product.platform,
  };
}

export async function removeAffectedProduct(patchId: string, productId: string) {
  const product = await prisma.patchAffectedProduct.findFirst({
    where: { id: productId, patchId },
  });

  if (!product) {
    throw new NotFoundError('Affected product not found');
  }

  await prisma.patchAffectedProduct.delete({ where: { id: productId } });

  return { success: true };
}
