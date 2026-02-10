import { prisma } from '@/db/client';
import { NotFoundError, BadRequestError, ConflictError } from '@shared/errors';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import type { Prisma } from '@prisma/client';
import { deploymentExecutorService } from '@modules/deployments';
import type { PatchInstallPayload } from '@modules/deployments';
import { queueDownloadJob } from '@modules/patch-repository';
import { v4 as uuidv4 } from 'uuid';
import type {
  CreatePatchInput,
  UpdatePatchInput,
  PatchListQuery,
  TestPatchInput,
  RejectPatchInput,
  ScanEndpointsInput,
  CreateDeploymentInput,
  DeploymentListQuery,
  CreatePatchTestInput,
  CreateZeroTouchConfigInput,
  UpdateZeroTouchConfigInput,
  CreatePatchDeploymentFromUIInput,
} from './patches.validator';

// ============================================
// Patches CRUD
// ============================================

export async function listPatches(params: PatchListQuery) {
  const where: Prisma.PatchWhereInput = {};

  if (params.severity) where.severity = params.severity;
  if (params.os) where.os = params.os;
  if (params.category) where.category = params.category;
  if (params.testStatus) where.testStatus = params.testStatus;
  if (params.approvalStatus) where.approvalStatus = params.approvalStatus;

  // Filter out superseded patches by default (commercial patch manager behavior)
  // Show superseded patches only if explicitly requested
  if (!params.includeSuperseded) {
    where.supersededAt = null; // Only show non-superseded patches
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
        bundle: true, // Include bundle info for hub-centric deployments
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
      bundle: true,           // NEW: Preferred bundle storage
      affectedProducts: true,
      fileDetails: true,      // @deprecated - kept for backwards compatibility
      vulnerabilities: true,
      patchEndpoints: true,   // @deprecated - kept for backwards compatibility
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
  // Generate unique patch ID
  const patchId = await generatePatchId(data.os || 'W');

  const patch = await prisma.patch.create({
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
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
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

  // Link patch to vulnerabilities via CVE numbers
  await updateVulnerabilityPatchStatus(patch.id, patch.cveNumbers);

  // Auto-correlate CVEs if none were provided
  if (!patch.cveNumbers || patch.cveNumbers.length === 0) {
    autoCorrelateCves(patch.id).catch((err) => {
      console.error(`[CVE Correlator] Failed for patch ${patch.id}:`, err);
    });
  }

  // Auto-queue download if downloadUrl is provided
  if (patch.downloadUrl) {
    autoQueueDownload(patch.id, patch.downloadUrl, patch.software || patch.title).catch((err) => {
      console.error(`[Auto-Download] Failed to queue download for patch ${patch.id}:`, err);
    });
  }

  // Auto-generate PatchBundle with inline scripts
  autoGeneratePatchBundle(patch.id).catch((err) => {
    console.error(`[PatchBundle] Failed to auto-generate for patch ${patch.id}:`, err);
  });

  return transformPatch(patch);
}

export async function updatePatch(id: string, data: UpdatePatchInput) {
  const existing = await prisma.patch.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Patch not found');
  }

  // Track CVE changes for vulnerability linking
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
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
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

  // Handle CVE changes for vulnerability linking
  if (data.cveNumbers !== undefined) {
    // Find CVEs that were removed
    const removedCves = oldCves.filter(cve => !newCves.includes(cve));
    // Find CVEs that were added
    const addedCves = newCves.filter(cve => !oldCves.includes(cve));

    // Revert patchAvailable for removed CVEs (if no other patch covers them)
    await revertVulnerabilityPatchStatus(id, removedCves);

    // Set patchAvailable for added CVEs
    await updateVulnerabilityPatchStatus(id, addedCves);
  }

  // Auto-correlate CVEs if they were cleared
  if (data.cveNumbers !== undefined && data.cveNumbers.length === 0) {
    autoCorrelateCves(id).catch((err) => {
      console.error(`[CVE Correlator] Failed for patch ${id}:`, err);
    });
  }

  // Trigger zero-touch evaluation if patch was just approved
  if (data.approvalStatus?.toLowerCase() === 'approved' &&
      existing.approvalStatus?.toLowerCase() !== 'approved') {
    evaluateZeroTouchRules(id).catch((err) => {
      console.error(`[Zero-Touch] Failed for patch ${id}:`, err);
    });
  }

  // Auto-queue download if downloadUrl was added/changed and no download completed yet
  if (data.downloadUrl && data.downloadUrl !== existing.downloadUrl && existing.downloadStatus !== 'completed') {
    autoQueueDownload(patch.id, data.downloadUrl, patch.software || patch.title).catch((err) => {
      console.error(`[Auto-Download] Failed to queue download for patch ${patch.id}:`, err);
    });
  }

  // Re-generate PatchBundle scripts if relevant fields changed
  const bundleRelevantChanged = data.software !== undefined || data.downloadUrl !== undefined;
  if (bundleRelevantChanged) {
    autoGeneratePatchBundle(patch.id).catch((err) => {
      console.error(`[PatchBundle] Failed to re-generate for patch ${patch.id}:`, err);
    });
  }

  return transformPatch(patch);
}

export async function deletePatch(id: string) {
  const existing = await prisma.patch.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Patch not found');
  }

  // Delete the patch first
  await prisma.patch.delete({ where: { id } });

  // Revert patchAvailable for CVEs if no other patch covers them
  await revertVulnerabilityPatchStatus(id, existing.cveNumbers || []);

  return { success: true };
}

/**
 * Mark a patch as superseded by a newer patch
 * This prevents deploying obsolete patches (commercial patch manager behavior)
 *
 * @param oldPatchId - The patch being superseded
 * @param newPatchId - The patch that supersedes it
 */
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

  // Prevent circular supersedence
  if (newPatch.supersededBy && newPatch.supersededBy.length > 0) {
    throw new BadRequestError('Cannot supersede with a patch that is already superseded');
  }

  // Update both patches
  await prisma.$transaction([
    // Mark old patch as superseded
    prisma.patch.update({
      where: { id: oldPatchId },
      data: {
        supersededBy: [...(oldPatch.supersededBy || []), newPatchId],
        supersededAt: new Date(),
      },
    }),
    // Mark new patch as superseding
    prisma.patch.update({
      where: { id: newPatchId },
      data: {
        supersedes: [...(newPatch.supersedes || []), oldPatchId],
      },
    }),
  ]);

  console.log(`[Supersedence] Patch ${oldPatch.patchId} superseded by ${newPatch.patchId}`);

  return {
    success: true,
    message: `Patch ${oldPatch.patchId} marked as superseded by ${newPatch.patchId}`,
  };
}

/**
 * Remove supersedence relationship (undo supersedence)
 *
 * @param oldPatchId - The patch being un-superseded
 * @param newPatchId - The patch that supersedes it
 */
export async function removeSupersedence(oldPatchId: string, newPatchId: string) {
  const [oldPatch, newPatch] = await Promise.all([
    prisma.patch.findUnique({ where: { id: oldPatchId } }),
    prisma.patch.findUnique({ where: { id: newPatchId } }),
  ]);

  if (!oldPatch || !newPatch) {
    throw new NotFoundError('One or both patches not found');
  }

  // Update both patches
  await prisma.$transaction([
    // Remove from old patch's supersededBy list
    prisma.patch.update({
      where: { id: oldPatchId },
      data: {
        supersededBy: (oldPatch.supersededBy || []).filter(id => id !== newPatchId),
        supersededAt: (oldPatch.supersededBy || []).filter(id => id !== newPatchId).length > 0
          ? oldPatch.supersededAt
          : null, // Clear if no more superseding patches
      },
    }),
    // Remove from new patch's supersedes list
    prisma.patch.update({
      where: { id: newPatchId },
      data: {
        supersedes: (newPatch.supersedes || []).filter(id => id !== oldPatchId),
      },
    }),
  ]);

  return {
    success: true,
    message: 'Supersedence relationship removed',
  };
}

/**
 * Get all patches superseded by this patch
 */
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

/**
 * Get patches that supersede this patch
 */
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

export async function getFileDetails(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const files = await prisma.patchFileDetail.findMany({
    where: { patchId },
  });

  return files.map((f) => ({
    id: f.id,
    fileName: f.fileName,
    version: f.version,
    size: f.size,
    path: f.path,
  }));
}

export async function getVulnerabilities(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const vulnerabilities = await prisma.patchVulnerability.findMany({
    where: { patchId },
  });

  return vulnerabilities.map((v) => ({
    id: v.id,
    cveNumber: v.cveNumber,
    severity: v.severity,
    description: v.description,
    publishedDate: v.publishedDate?.toISOString() || null,
  }));
}

export async function getEndpoints(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const endpoints = await prisma.patchEndpoint.findMany({
    where: { patchId },
  });

  return endpoints.map((e) => ({
    id: e.id,
    name: e.name,
    os: e.os,
    status: e.status,
    lastSeen: e.lastSeen?.toISOString() || null,
  }));
}

export async function scanEndpoints(patchId: string, data: ScanEndpointsInput) {
  const patch = await prisma.patch.findUnique({
    where: { id: patchId },
    include: {
      affectedProducts: true,
      vulnerabilities: true,
    },
  });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  // Determine scope of assets to check
  const assetWhere: Prisma.AssetWhereInput = { status: { not: 'Retired' } };

  if (data.scope === 'Specific Groups' && data.endpointIds.length > 0) {
    assetWhere.id = { in: data.endpointIds };
  }

  if (patch.os) {
    assetWhere.os = { contains: patch.os, mode: 'insensitive' };
  }

  const assets = await prisma.asset.findMany({
    where: assetWhere,
    include: {
      software: true,
      vulnerabilities: { include: { vulnerability: true } },
    },
  });

  let missingCount = 0;
  let notApplicableCount = 0;

  for (const asset of assets) {
    const applicability = determineApplicability(patch, asset);

    const existing = await prisma.patchEndpoint.findFirst({
      where: { patchId, assetId: asset.id },
    });

    if (existing) {
      await prisma.patchEndpoint.update({
        where: { id: existing.id },
        data: {
          status: applicability,
          name: asset.name,
          os: asset.os || undefined,
          lastSeen: new Date(),
        },
      });
    } else {
      await prisma.patchEndpoint.create({
        data: {
          patchId,
          assetId: asset.id,
          name: asset.name,
          os: asset.os || undefined,
          status: applicability,
          lastSeen: new Date(),
        },
      });
    }

    if (applicability === 'missing') missingCount++;
    else notApplicableCount++;
  }

  // Update patch endpoint count
  await prisma.patch.update({
    where: { id: patchId },
    data: { endpoints: missingCount },
  });

  return {
    message: 'Scan completed',
    patchId,
    scope: data.scope,
    assetsScanned: assets.length,
    missing: missingCount,
    notApplicable: notApplicableCount,
  };
}

// ============================================
// Test & Approve Workflow
// ============================================

export async function getPatchesPendingTestApproval(params: { status?: string; page: number; limit: number }) {
  const where: Prisma.PatchWhereInput = {};

  if (params.status === 'pending-test') {
    where.testStatus = 'Not Tested';
  } else if (params.status === 'pending-approval') {
    where.testStatus = 'Tested';
    where.approvalStatus = 'Pending';
  }

  const [patches, total] = await Promise.all([
    prisma.patch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patch.count({ where }),
  ]);

  return paginate(patches.map(transformPatch), total, { page: params.page, limit: params.limit });
}

export async function testPatch(id: string, userId: string, data: TestPatchInput) {
  const patch = await prisma.patch.findUnique({ where: { id } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const testStatus = data.status === 'passed' ? 'Tested' : 'Test Failed';

  const updated = await prisma.patch.update({
    where: { id },
    data: {
      testStatus,
      testResult: data.status,
      testedBy: userId,
      testedAt: new Date(),
      testNotes: data.notes,
      testEnvironment: data.testEnvironment,
      // If test failed, also set approval to rejected
      ...(data.status === 'failed' && {
        approvalStatus: 'Rejected',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: 'Test failed',
      }),
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'TEST_PATCH',
      resource: 'patches',
      resourceId: id,
      details: { testStatus: data.status, notes: data.notes },
    },
  });

  return transformPatch(updated);
}

export async function approvePatch(id: string, userId: string) {
  const patch = await prisma.patch.findUnique({ where: { id } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  if (patch.testStatus !== 'Tested') {
    throw new BadRequestError('Patch must be tested before approval');
  }

  if (patch.testResult === 'failed') {
    throw new BadRequestError('Cannot approve patch with failed test result');
  }

  const updated = await prisma.patch.update({
    where: { id },
    data: {
      approvalStatus: 'Approved',
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'APPROVE_PATCH',
      resource: 'patches',
      resourceId: id,
    },
  });

  // Trigger zero-touch evaluation for newly approved patch
  evaluateZeroTouchRules(id).catch((err) => {
    console.error(`[Zero-Touch] Failed for patch ${id}:`, err);
  });

  return transformPatch(updated);
}

export async function rejectPatch(id: string, userId: string, data: RejectPatchInput) {
  const patch = await prisma.patch.findUnique({ where: { id } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const updated = await prisma.patch.update({
    where: { id },
    data: {
      approvalStatus: 'Rejected',
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectionReason: data.reason,
      rejectionNotes: data.notes,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'REJECT_PATCH',
      resource: 'patches',
      resourceId: id,
      details: { reason: data.reason },
    },
  });

  return transformPatch(updated);
}

// ============================================
// Deployments
// ============================================

export async function listDeployments(params: DeploymentListQuery) {
  const where: Prisma.PatchDeploymentWhereInput = {};

  if (params.type) where.type = params.type;
  if (params.stage) where.stage = params.stage;

  const [deployments, total] = await Promise.all([
    prisma.patchDeployment.findMany({
      where,
      include: {
        patches: true,
      },
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patchDeployment.count({ where }),
  ]);

  return paginate(deployments.map(transformDeployment), total, { page: params.page, limit: params.limit });
}

export async function getDeploymentById(id: string) {
  const deployment = await prisma.patchDeployment.findUnique({
    where: { id },
    include: {
      patches: true,
      tasks: {
        include: {
          asset: true,
        },
      },
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  return transformDeployment(deployment);
}

export async function createDeployment(data: CreateDeploymentInput, userId: string) {
  // Generate unique deployment ID
  const deploymentId = await generateDeploymentId();

  // Verify all patches exist and are approved
  const patches = await prisma.patch.findMany({
    where: {
      id: { in: data.patches },
    },
  });

  if (patches.length !== data.patches.length) {
    throw new BadRequestError('One or more patches not found');
  }

  // Approval enforcement
  const approvalSetting = await prisma.setting.findUnique({
    where: { key: 'patch-management.requireApprovalForDeployment' },
  });
  const requireApproval = approvalSetting?.value === true;

  if (requireApproval && !data.skipApprovalCheck) {
    const unapprovedPatches = patches.filter(p => p.approvalStatus?.toLowerCase() !== 'approved');
    if (unapprovedPatches.length > 0) {
      const names = unapprovedPatches.map(p => `${p.patchId || p.id} (${p.approvalStatus})`).join(', ');
      throw new BadRequestError(
        `Cannot deploy unapproved patches when approval enforcement is enabled. Unapproved: ${names}`,
        { unapprovedPatchIds: unapprovedPatches.map(p => p.id) },
      );
    }
  }

  if (requireApproval && data.skipApprovalCheck) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPROVAL_OVERRIDE',
        resource: 'deployments',
        details: { patchIds: data.patches, reason: 'skipApprovalCheck flag was set' },
      },
    });
  }

  const deployment = await prisma.patchDeployment.create({
    data: {
      name: data.name,
      deploymentId,
      description: data.description,
      type: data.type,
      configType: data.configType || 'INSTALL',
      scope: data.scope || 'Endpoint',
      status: 'PENDING',
      stage: data.schedule ? 'PENDING' : 'IN_PROGRESS',
      targetGroups: data.targetGroups || [],
      scheduledAt: data.schedule ? new Date(data.schedule) : null,
      triggerType: data.triggerType || 'manual',
      skipApprovalCheck: data.skipApprovalCheck || false,
      approvalOverrideBy: data.skipApprovalCheck ? userId : null,
      createdBy: userId,
      patches: {
        connect: data.patches.map((patchId) => ({ id: patchId })),
      },
    },
    include: {
      patches: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CREATE_DEPLOYMENT',
      resource: 'deployments',
      resourceId: deployment.id,
      details: { name: data.name, patchCount: data.patches.length },
    },
  });

  return transformDeployment(deployment);
}

export async function deleteDeployment(id: string, userId: string) {
  const existing = await prisma.patchDeployment.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Deployment not found');
  }

  if (existing.stage === 'IN_PROGRESS') {
    throw new BadRequestError('Cannot delete deployment that is in progress');
  }

  await prisma.patchDeployment.delete({ where: { id } });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'DELETE_DEPLOYMENT',
      resource: 'deployments',
      resourceId: id,
    },
  });

  return { success: true };
}

export async function updateDeployment(id: string, data: { name?: string; scheduledAt?: string }) {
  const existing = await prisma.patchDeployment.findUnique({
    where: { id },
    include: { patches: true },
  });

  if (!existing) {
    throw new NotFoundError('Deployment not found');
  }

  // Block update if deployment has already started executing
  if (existing.startedAt) {
    throw new BadRequestError('Cannot update deployment that has started execution');
  }

  if (existing.stage === 'COMPLETED' || existing.stage === 'CANCELLED') {
    throw new BadRequestError('Cannot update completed or cancelled deployment');
  }

  const updated = await prisma.patchDeployment.update({
    where: { id },
    data: {
      name: data.name || existing.name,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : existing.scheduledAt,
    },
    include: { patches: true },
  });

  return transformDeployment(updated);
}

export async function cancelDeployment(id: string, userId: string) {
  const existing = await prisma.patchDeployment.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Deployment not found');
  }

  if (existing.stage === 'COMPLETED') {
    throw new BadRequestError('Cannot cancel completed deployment');
  }

  const updated = await prisma.patchDeployment.update({
    where: { id },
    data: {
      stage: 'CANCELLED',
      status: 'CANCELLED',
      completedAt: new Date(),
    },
    include: { patches: true },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CANCEL_DEPLOYMENT',
      resource: 'deployments',
      resourceId: id,
    },
  });

  return transformDeployment(updated);
}

export async function getDeploymentPreview(id: string) {
  const deployment = await prisma.patchDeployment.findUnique({
    where: { id },
    include: {
      patches: true,
      tasks: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  // Calculate actual target endpoints based on deployment scope
  let targetEndpoints = 0;

  if (deployment.tasks.length > 0) {
    // If tasks already exist, use the actual task count
    targetEndpoints = deployment.tasks.length;
  } else if (deployment.scope === 'Global') {
    // Global scope: count all active assets
    targetEndpoints = await prisma.asset.count({
      where: { status: { not: 'Retired' } },
    });
  } else if (deployment.scope === 'Group' && deployment.targetGroups.length > 0) {
    // Group scope: count unique endpoints across selected groups
    const groups = await prisma.computerGroup.findMany({
      where: { id: { in: deployment.targetGroups } },
      select: { endpoints: true },
    });
    const uniqueEndpoints = new Set(groups.flatMap((g) => g.endpoints));
    targetEndpoints = uniqueEndpoints.size;
  } else if (deployment.scope === 'Endpoint' && deployment.targetGroups.length > 0) {
    // Endpoint scope: targetGroups holds endpoint IDs directly
    const validEndpoints = await prisma.asset.count({
      where: { id: { in: deployment.targetGroups } },
    });
    targetEndpoints = validEndpoints;
  }

  const patchCount = deployment.patches.length;
  const totalOperations = patchCount * targetEndpoints;

  // Task status breakdown (from existing tasks if any)
  const tasksByStatus = deployment.tasks.reduce(
    (acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    deploymentId: id,
    patches: deployment.patches.map(transformPatch),
    targetEndpoints,
    totalOperations,
    taskBreakdown: {
      pending: tasksByStatus['pending'] || 0,
      inProgress: tasksByStatus['in_progress'] || 0,
      completed: tasksByStatus['completed'] || 0,
      failed: tasksByStatus['failed'] || 0,
    },
  };
}

export async function executeDeployment(id: string, userId: string) {
  const deployment = await prisma.patchDeployment.findUnique({
    where: { id },
    include: {
      patches: true,
      tasks: true,
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment not found');
  }

  if (deployment.stage === 'IN_PROGRESS') {
    throw new BadRequestError('Deployment is already in progress');
  }

  if (deployment.stage === 'COMPLETED') {
    throw new BadRequestError('Deployment is already completed');
  }

  // Approval enforcement (skip for system-triggered scheduled deployments)
  if (userId !== 'system') {
    const approvalSetting = await prisma.setting.findUnique({
      where: { key: 'patch-management.requireApprovalForDeployment' },
    });
    const requireApproval = approvalSetting?.value === true;

    if (requireApproval && !deployment.skipApprovalCheck) {
      const unapprovedPatches = deployment.patches.filter(p => p.approvalStatus?.toLowerCase() !== 'approved');
      if (unapprovedPatches.length > 0) {
        const names = unapprovedPatches.map(p => `${p.patchId || p.id} (${p.approvalStatus})`).join(', ');
        throw new BadRequestError(
          `Cannot execute deployment with unapproved patches. Unapproved: ${names}`,
          { unapprovedPatchIds: unapprovedPatches.map(p => p.id) },
        );
      }
    }
  }

  // Check for superseded patches and log warnings
  const supersededWarnings: string[] = [];
  for (const p of deployment.patches) {
    if (p.supersededBy && p.supersededBy.length > 0) {
      supersededWarnings.push(
        `Patch ${p.patchId || p.id} has been superseded by: ${p.supersededBy.join(', ')}`,
      );
    }
  }
  if (supersededWarnings.length > 0) {
    console.warn(`[Deployment] Executing deployment with superseded patches:\n  ${supersededWarnings.join('\n  ')}`);
  }

  // If tasks already exist (created via POST /deployments/patch), just flip stage
  if (deployment.tasks.length > 0) {
    await prisma.patchDeployment.update({
      where: { id },
      data: {
        stage: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  } else {
    // Resolve scope to agent IDs for deployments created via old POST /deployments route
    let agentIds: string[] = [];

    if (deployment.scope === 'Global') {
      const agents = await prisma.agent.findMany({
        where: { assetId: { not: null } },
        select: { id: true },
      });
      agentIds = agents.map(a => a.id);
    } else if (deployment.scope === 'Group' && deployment.targetGroups.length > 0) {
      const groups = await prisma.computerGroup.findMany({
        where: { id: { in: deployment.targetGroups } },
        select: { endpoints: true },
      });
      const endpointIds = [...new Set(groups.flatMap(g => g.endpoints))];
      // endpoints in ComputerGroup are asset IDs; resolve to agent IDs
      const agents = await prisma.agent.findMany({
        where: { assetId: { in: endpointIds } },
        select: { id: true },
      });
      agentIds = agents.map(a => a.id);
    } else if (deployment.scope === 'Endpoint' && deployment.targetGroups.length > 0) {
      // targetGroups holds endpoint (asset) IDs for Endpoint scope
      const agents = await prisma.agent.findMany({
        where: { assetId: { in: deployment.targetGroups } },
        select: { id: true },
      });
      agentIds = agents.map(a => a.id);
    }

    if (agentIds.length === 0) {
      throw new BadRequestError('No target agents found for the deployment scope');
    }

    // Build patch payloads from the deployment's linked patches
    const patchPayloads: PatchInstallPayload[] = deployment.patches.map(p => ({
      patchId: p.patchId || p.id,
      kbNumber: p.kbNumber || undefined,
      packageName: p.software || undefined,
      downloadUrl: p.downloadUrl || undefined,
      rebootRequired: p.rebootRequired ?? false,
    }));

    // Use the deployment executor to create tasks and commands
    await deploymentExecutorService.createPatchDeployment({
      name: deployment.name,
      description: deployment.description || undefined,
      targetAgentIds: agentIds,
      patches: patchPayloads,
      createdBy: userId,
    });

    // Update the existing deployment stage
    await prisma.patchDeployment.update({
      where: { id },
      data: {
        stage: 'IN_PROGRESS',
        startedAt: new Date(),
        pending: agentIds.length,
      },
    });
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'EXECUTE_DEPLOYMENT',
      resource: 'deployments',
      resourceId: id,
    },
  });

  return { message: 'Deployment execution initiated' };
}

// ============================================
// Patch Deployment from UI
// ============================================

export async function createPatchDeploymentFromUI(data: CreatePatchDeploymentFromUIInput, userId: string) {
  // Look up full patch records for the given IDs
  const patchIds = data.patches.map(p => p.id);
  const patches = await prisma.patch.findMany({
    where: { id: { in: patchIds } },
  });

  if (patches.length === 0) {
    throw new BadRequestError('No valid patches found');
  }

  // Approval enforcement
  const approvalSetting = await prisma.setting.findUnique({
    where: { key: 'patch-management.requireApprovalForDeployment' },
  });
  const requireApproval = approvalSetting?.value === true;

  if (requireApproval && !data.skipApprovalCheck) {
    const unapprovedPatches = patches.filter(p => p.approvalStatus?.toLowerCase() !== 'approved');
    if (unapprovedPatches.length > 0) {
      const names = unapprovedPatches.map(p => `${p.patchId || p.id} (${p.approvalStatus})`).join(', ');
      throw new BadRequestError(
        `Cannot deploy unapproved patches when approval enforcement is enabled. Unapproved: ${names}`,
        { unapprovedPatchIds: unapprovedPatches.map(p => p.id) },
      );
    }
  }

  if (requireApproval && data.skipApprovalCheck) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPROVAL_OVERRIDE',
        resource: 'deployments',
        details: { patchIds: data.patches.map(p => p.id), reason: 'skipApprovalCheck flag was set on UI deployment' },
      },
    });
  }

  // Check for superseded patches and build warnings
  const warnings: string[] = [];
  for (const p of patches) {
    if (p.supersededBy && p.supersededBy.length > 0) {
      warnings.push(
        `Patch ${p.patchId || p.id} has been superseded by: ${p.supersededBy.join(', ')}. Consider deploying the newer patch instead.`,
      );
    }
  }

  // Delegate to the deployment executor which creates PatchDeployment + Tasks + AgentCommands
  // Pass original patch UUIDs so the executor can do its own bundle-aware lookup
  const result = await deploymentExecutorService.createPatchDeployment({
    name: data.name,
    description: data.description,
    targetAgentIds: data.targetAgentIds,
    patches: patches.map(p => ({ id: p.id })),
    retryCount: data.retryCount,
    autoRollback: data.autoRollback,
    createdBy: userId,
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CREATE_PATCH_DEPLOYMENT',
      resource: 'deployments',
      resourceId: result.deploymentId,
      details: { name: data.name, patchCount: patches.length, agentCount: data.targetAgentIds.length },
    },
  });

  return { ...result, warnings };
}

// ============================================
// Patch Tests
// ============================================

export async function listPatchTests(params: { page: number; limit: number; status?: string }) {
  const where: Prisma.PatchTestWhereInput = {};

  if (params.status) where.status = params.status;

  const [tests, total] = await Promise.all([
    prisma.patchTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.patchTest.count({ where }),
  ]);

  return paginate(tests.map(transformPatchTest), total, { page: params.page, limit: params.limit });
}

export async function getPatchTestById(id: string) {
  const test = await prisma.patchTest.findUnique({ where: { id } });

  if (!test) {
    throw new NotFoundError('Patch test not found');
  }

  return transformPatchTest(test);
}

export async function createPatchTest(data: CreatePatchTestInput, userId: string) {
  const test = await prisma.patchTest.create({
    data: {
      name: data.name,
      description: data.description,
      applicationType: data.applicationType || 'ALL',
      applications: data.applications || [],
      scope: data.scope || 'ALL_COMPUTERS',
      computers: data.computers || [],
      groups: data.groups || [],
      status: 'Pending',
      createdBy: userId,
    },
  });

  return transformPatchTest(test);
}

export async function approvePatchTest(id: string, userId: string) {
  const test = await prisma.patchTest.findUnique({ where: { id } });

  if (!test) {
    throw new NotFoundError('Patch test not found');
  }

  const updated = await prisma.patchTest.update({
    where: { id },
    data: {
      status: 'Approved',
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'APPROVE_PATCH_TEST',
      resource: 'patch_tests',
      resourceId: id,
    },
  });

  return transformPatchTest(updated);
}

export async function deletePatchTest(id: string) {
  const existing = await prisma.patchTest.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Patch test not found');
  }

  await prisma.patchTest.delete({ where: { id } });

  return { success: true };
}

// ============================================
// Zero Touch Configs
// ============================================

export async function listZeroTouchConfigs(params: { page: number; limit: number; status?: string }) {
  const where: Prisma.ZeroTouchConfigWhereInput = {};

  if (params.status) where.status = params.status;

  const [configs, total] = await Promise.all([
    prisma.zeroTouchConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...getPaginationParams({ page: params.page, limit: params.limit }),
    }),
    prisma.zeroTouchConfig.count({ where }),
  ]);

  return paginate(configs.map(transformZeroTouchConfig), total, { page: params.page, limit: params.limit });
}

export async function getZeroTouchConfigById(id: string) {
  const config = await prisma.zeroTouchConfig.findUnique({ where: { id } });

  if (!config) {
    throw new NotFoundError('Zero touch config not found');
  }

  return transformZeroTouchConfig(config);
}

export async function createZeroTouchConfig(data: CreateZeroTouchConfigInput, userId: string) {
  const config = await prisma.zeroTouchConfig.create({
    data: {
      name: data.name,
      description: data.description,
      applicationType: data.applicationType || 'ALL',
      applications: data.applications || [],
      scope: data.scope || 'ALL_COMPUTERS',
      computers: data.computers || [],
      groups: data.groups || [],
      autoDeploymentRules: data.autoDeploymentRules,
      status: 'Active',
      createdBy: userId,
    },
  });

  return transformZeroTouchConfig(config);
}

export async function updateZeroTouchConfig(id: string, data: UpdateZeroTouchConfigInput) {
  const existing = await prisma.zeroTouchConfig.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Zero touch config not found');
  }

  const config = await prisma.zeroTouchConfig.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      applicationType: data.applicationType,
      applications: data.applications,
      scope: data.scope,
      computers: data.computers,
      groups: data.groups,
      autoDeploymentRules: data.autoDeploymentRules,
      status: data.status,
    },
  });

  return transformZeroTouchConfig(config);
}

export async function deleteZeroTouchConfig(id: string) {
  const existing = await prisma.zeroTouchConfig.findUnique({ where: { id } });

  if (!existing) {
    throw new NotFoundError('Zero touch config not found');
  }

  await prisma.zeroTouchConfig.delete({ where: { id } });

  return { success: true };
}

// ============================================
// Zero-Touch Rule Evaluation
// ============================================

/**
 * Evaluate active ZeroTouchConfigs against a newly approved patch.
 * If rules match, auto-create a deployment targeting the configured scope.
 */
export async function evaluateZeroTouchRules(patchId: string): Promise<void> {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });
  if (!patch) return;

  const configs = await prisma.zeroTouchConfig.findMany({
    where: { status: 'Active' },
  });

  if (configs.length === 0) return;

  for (const config of configs) {
    try {
      const rules = config.autoDeploymentRules as any;
      if (!rules) continue;

      // 1. Severity match
      const severities: string[] = rules.severity || [];
      if (severities.length > 0) {
        const patchSeverity = (patch.severity || '').toLowerCase();
        const matches = severities.some((s: string) => s.toLowerCase() === patchSeverity);
        if (!matches) continue;
      }

      // 2. Application filter
      const appType = (config.applicationType || 'ALL').toUpperCase();
      const apps: string[] = (config.applications as string[]) || [];
      const patchSoftware = (patch.software || '').toLowerCase();

      if (appType === 'INCLUDE') {
        const inList = apps.some((a: string) => a.toLowerCase() === patchSoftware);
        if (!inList) continue;
      } else if (appType === 'EXCLUDE') {
        const inList = apps.some((a: string) => a.toLowerCase() === patchSoftware);
        if (inList) continue;
      }
      // 'ALL' always matches

      // 3. Resolve scope to agent IDs
      let agentIds: string[] = [];
      const scope = (config.scope || '').toUpperCase().replace(/\s+/g, '_');

      if (scope === 'ALL_COMPUTERS') {
        const agents = await prisma.agent.findMany({
          where: { status: { notIn: ['Inactive', 'Disconnected'] }, assetId: { not: null } },
          select: { id: true },
        });
        agentIds = agents.map((a) => a.id);
      } else if (scope === 'SPECIFIC_GROUPS') {
        const groupIds: string[] = (config.groups as string[]) || [];
        if (groupIds.length > 0) {
          const memberships = await prisma.agentGroupMembership.findMany({
            where: { groupId: { in: groupIds } },
            select: { agentId: true },
          });
          agentIds = [...new Set(memberships.map((m) => m.agentId))];
        }
      } else {
        // SCOPE / specific computers
        const computerIds: string[] = (config.computers as string[]) || [];
        if (computerIds.length > 0) {
          const agents = await prisma.agent.findMany({
            where: {
              OR: [
                { id: { in: computerIds } },
                { assetId: { in: computerIds } },
              ],
            },
            select: { id: true },
          });
          agentIds = agents.map((a) => a.id);
        }
      }

      if (agentIds.length === 0) {
        console.log(`[Zero-Touch] Config "${config.name}" matched but no agents in scope`);
        continue;
      }

      // 4. Create deployment
      const approvalRequired = rules.approvalRequired ?? true;

      if (approvalRequired) {
        // Create a PENDING deployment that still needs manual approval
        const depId = await generateDeploymentId();
        await prisma.patchDeployment.create({
          data: {
            deploymentId: depId,
            name: `[Zero-Touch] ${patch.title || patch.patchId}`,
            description: `Auto-created by zero-touch rule "${config.name}"`,
            type: 'INSTANT',
            configType: 'INSTALL',
            scope: 'Endpoint',
            status: 'PENDING',
            stage: 'PENDING',
            pending: agentIds.length,
            succeeded: 0,
            failed: 0,
            triggerType: 'zero-touch',
            createdBy: 'system',
            patches: { connect: [{ id: patch.id }] },
          },
        });
        console.log(`[Zero-Touch] Created PENDING deployment ${depId} for "${config.name}" (${agentIds.length} agents)`);
      } else {
        // Execute immediately via the deployment executor
        const result = await deploymentExecutorService.createPatchDeployment({
          name: `[Zero-Touch] ${patch.title || patch.patchId}`,
          description: `Auto-created by zero-touch rule "${config.name}"`,
          targetAgentIds: agentIds,
          patches: [{ id: patch.id }] as any,
          triggerType: 'zero-touch',
          createdBy: 'system',
        });
        console.log(`[Zero-Touch] Executed deployment ${result.deploymentId} for "${config.name}" (${result.commandsCreated} commands)`);
      }

      // 5. Update config stats
      await prisma.zeroTouchConfig.update({
        where: { id: config.id },
        data: {
          lastTriggeredAt: new Date(),
          deploymentsCreated: { increment: 1 },
        },
      });
    } catch (err) {
      console.error(`[Zero-Touch] Error evaluating config "${config.name}":`, err);
    }
  }
}

// ============================================
// Vulnerability Linking
// ============================================

/**
 * Update patchAvailable flag on vulnerabilities when a patch is created/updated.
 * This links patches to vulnerabilities via CVE numbers.
 */
async function updateVulnerabilityPatchStatus(patchId: string, cveNumbers: string[], correlationSource: string = 'manual') {
  if (!cveNumbers || cveNumbers.length === 0) return;

  const result = await prisma.vulnerability.updateMany({
    where: { cveId: { in: cveNumbers } },
    data: { patchAvailable: true },
  });

  if (result.count > 0) {
    console.log(`[Patch-Vuln Link] Marked ${result.count} vulnerabilities as patchAvailable=true for CVEs: ${cveNumbers.join(', ')}`);
  }

  // Create PatchVulnerability join records so "Related Patches" shows in CVE detail
  for (const cve of cveNumbers) {
    const existing = await prisma.patchVulnerability.findFirst({
      where: { patchId, cveNumber: cve },
    });
    if (!existing) {
      const vuln = await prisma.vulnerability.findUnique({
        where: { cveId: cve },
        select: { severity: true, description: true, publishedDate: true },
      });
      await prisma.patchVulnerability.create({
        data: {
          patchId,
          cveNumber: cve,
          severity: vuln?.severity || null,
          description: vuln?.description || null,
          publishedDate: vuln?.publishedDate || null,
          correlationSource,
        },
      });
    }
  }
}

/**
 * Revert patchAvailable flag when a patch is deleted.
 * Only reverts if no other patch covers the same CVE.
 */
async function revertVulnerabilityPatchStatus(patchId: string, cveNumbers: string[]) {
  if (!cveNumbers || cveNumbers.length === 0) return;

  // Remove PatchVulnerability join records for this patch
  await prisma.patchVulnerability.deleteMany({
    where: { patchId, cveNumber: { in: cveNumbers } },
  });

  for (const cve of cveNumbers) {
    // Check if any other patch covers this CVE
    const otherPatch = await prisma.patch.findFirst({
      where: {
        cveNumbers: { has: cve },
        id: { not: patchId },
      },
    });

    if (!otherPatch) {
      // No other patch covers this CVE, set patchAvailable = false
      await prisma.vulnerability.updateMany({
        where: { cveId: cve },
        data: { patchAvailable: false },
      });
      console.log(`[Patch-Vuln Link] Reverted patchAvailable=false for CVE: ${cve}`);
    }
  }
}

// ============================================
// CVE Auto-Correlation
// ============================================

/**
 * Auto-correlate CVEs for a patch that has empty cveNumbers.
 * Searches our NVD database using 3 strategies:
 * 1. KB number in vulnerability descriptions/references
 * 2. Vendor+Product CPE match in VulnerabilitySoftware
 * 3. Software name match against VulnerabilitySoftware.cpeProduct
 */
export async function autoCorrelateCves(patchId: string): Promise<string[]> {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });
  if (!patch) return [];

  // Skip if patch already has CVE numbers
  if (patch.cveNumbers && patch.cveNumbers.length > 0) {
    return patch.cveNumbers;
  }

  const foundCves = new Set<string>();
  const correlationSources = new Map<string, string>();

  // Strategy 1: KB number search
  if (patch.kbNumber) {
    const kbVulns = await prisma.vulnerability.findMany({
      where: {
        OR: [
          { description: { contains: patch.kbNumber, mode: 'insensitive' } },
        ],
      },
      select: { cveId: true },
      take: 50,
    });

    const kbRefs = await prisma.vulnerabilityReference.findMany({
      where: { url: { contains: patch.kbNumber, mode: 'insensitive' } },
      select: { vulnerability: { select: { cveId: true } } },
      take: 50,
    });

    for (const v of kbVulns) {
      foundCves.add(v.cveId);
      correlationSources.set(v.cveId, 'auto-kb');
    }
    for (const r of kbRefs) {
      foundCves.add(r.vulnerability.cveId);
      correlationSources.set(r.vulnerability.cveId, 'auto-kb');
    }
  }

  // Strategy 2: Vendor + Product CPE match
  if (patch.vendor && patch.product) {
    const vulnSoftware = await prisma.vulnerabilitySoftware.findMany({
      where: {
        cpeVendor: { equals: patch.vendor.toLowerCase(), mode: 'insensitive' },
        cpeProduct: { equals: patch.product.toLowerCase(), mode: 'insensitive' },
      },
      select: { vulnerability: { select: { cveId: true } } },
      take: 100,
    });

    for (const vs of vulnSoftware) {
      if (!foundCves.has(vs.vulnerability.cveId)) {
        foundCves.add(vs.vulnerability.cveId);
        correlationSources.set(vs.vulnerability.cveId, 'auto-vendor');
      }
    }
  }

  // Strategy 3: Software name fallback (only if no matches yet)
  if (patch.software && foundCves.size === 0) {
    const normalizedName = patch.software
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^lib/, '');

    if (normalizedName.length >= 3) {
      const vulnSoftware = await prisma.vulnerabilitySoftware.findMany({
        where: {
          cpeProduct: { equals: normalizedName, mode: 'insensitive' },
        },
        select: { vulnerability: { select: { cveId: true } } },
        take: 50,
      });

      for (const vs of vulnSoftware) {
        if (!foundCves.has(vs.vulnerability.cveId)) {
          foundCves.add(vs.vulnerability.cveId);
          correlationSources.set(vs.vulnerability.cveId, 'auto-nvd');
        }
      }
    }
  }

  if (foundCves.size === 0) {
    return [];
  }

  const cveArray = Array.from(foundCves);
  console.log(
    `[CVE Correlator] Found ${cveArray.length} CVEs for patch ${patch.patchId || patch.id}: ` +
    `${cveArray.slice(0, 5).join(', ')}${cveArray.length > 5 ? '...' : ''}`,
  );

  // Update the patch with discovered CVEs
  await prisma.patch.update({
    where: { id: patchId },
    data: { cveNumbers: cveArray },
  });

  // Create PatchVulnerability records with correlation source
  for (const cve of cveArray) {
    const existing = await prisma.patchVulnerability.findFirst({
      where: { patchId, cveNumber: cve },
    });
    if (!existing) {
      const vuln = await prisma.vulnerability.findUnique({
        where: { cveId: cve },
        select: { severity: true, description: true, publishedDate: true },
      });
      await prisma.patchVulnerability.create({
        data: {
          patchId,
          cveNumber: cve,
          severity: vuln?.severity || null,
          description: vuln?.description || null,
          publishedDate: vuln?.publishedDate || null,
          correlationSource: correlationSources.get(cve) || 'auto-nvd',
        },
      });
    }
  }

  // Mark matching vulnerabilities as patchAvailable
  await prisma.vulnerability.updateMany({
    where: { cveId: { in: cveArray } },
    data: { patchAvailable: true },
  });

  return cveArray;
}

// ============================================
// Patch Applicability Helpers
// ============================================

/**
 * Determine if an asset needs a specific patch.
 */
function determineApplicability(
  patch: {
    vendor: string | null;
    product: string | null;
    os: string | null;
    software: string | null;
    cveNumbers: string[];
    affectedProducts?: Array<{ softwareName: string; version: string | null; vendor: string | null; platform: string | null }>;
  },
  asset: {
    os: string | null;
    software: Array<{ name: string; version: string | null; vendor: string | null; cpeVendor: string | null; cpeProduct: string | null }>;
    vulnerabilities: Array<{ vulnerability: { cveId: string } }>;
  },
): 'missing' | 'not_applicable' {
  // Strategy 1: CVE-based matching
  if (patch.cveNumbers.length > 0) {
    const assetCveIds = new Set(asset.vulnerabilities.map(v => v.vulnerability.cveId));
    if (patch.cveNumbers.some(cve => assetCveIds.has(cve))) {
      return 'missing';
    }
  }

  // Strategy 2: AffectedProduct matching
  if (patch.affectedProducts && patch.affectedProducts.length > 0) {
    for (const affected of patch.affectedProducts) {
      for (const sw of asset.software) {
        const nameMatch =
          sw.name.toLowerCase().includes(affected.softwareName.toLowerCase()) ||
          affected.softwareName.toLowerCase().includes(sw.name.toLowerCase());
        const vendorMatch = !affected.vendor || !sw.vendor ||
          sw.vendor.toLowerCase().includes(affected.vendor.toLowerCase());
        if (nameMatch && vendorMatch) return 'missing';
      }
    }
  }

  // Strategy 3: CPE vendor/product matching
  if (patch.vendor && patch.product) {
    const pv = patch.vendor.toLowerCase();
    const pp = patch.product.toLowerCase();
    for (const sw of asset.software) {
      if (
        (sw.cpeVendor?.toLowerCase() === pv && sw.cpeProduct?.toLowerCase() === pp) ||
        (sw.vendor?.toLowerCase().includes(pv) && sw.name.toLowerCase().includes(pp))
      ) {
        return 'missing';
      }
    }
  }

  // Strategy 4: OS + software name matching
  if (patch.os && patch.software && asset.os) {
    const osMatch = asset.os.toLowerCase().includes(patch.os.toLowerCase());
    if (osMatch) {
      for (const sw of asset.software) {
        if (sw.name.toLowerCase().includes(patch.software.toLowerCase())) {
          return 'missing';
        }
      }
    }
  }

  return 'not_applicable';
}

/**
 * Check all patches for applicability against a specific asset.
 * Called after processInventory() to keep patch applicability up to date.
 */
export async function checkPatchApplicabilityForAsset(assetId: string): Promise<void> {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        software: true,
        vulnerabilities: { include: { vulnerability: true } },
      },
    });

    if (!asset) return;

    const patches = await prisma.patch.findMany({
      where: {
        OR: [
          { cveNumbers: { isEmpty: false } },
          { affectedProducts: { some: {} } },
        ],
      },
      include: { affectedProducts: true },
      take: 500,
    });

    // Import prerequisite service
    const { patchPrerequisiteService } = await import('@shared/services/patch-prerequisite.service');

    let updated = 0;
    for (const patch of patches) {
      // Check prerequisites first (commercial patch manager behavior)
      const prerequisites = patch.prerequisites as any;
      const prerequisiteCheck = await patchPrerequisiteService.checkPrerequisites(
        assetId,
        prerequisites
      );

      // If prerequisites not met, mark as "not_applicable" instead of "missing"
      if (!prerequisiteCheck.applicable) {
        const existing = await prisma.patchEndpoint.findFirst({
          where: { patchId: patch.id, assetId },
        });

        if (existing && existing.status === 'missing') {
          // Update from missing to not_applicable with reason
          await prisma.patchEndpoint.update({
            where: { id: existing.id },
            data: {
              status: 'not_applicable',
              lastSeen: new Date(),
            },
          });
        }

        // Skip to next patch - don't mark as missing if prerequisites not met
        continue;
      }

      const applicability = determineApplicability(
        patch,
        { ...asset, vulnerabilities: asset.vulnerabilities || [] },
      );

      if (applicability === 'missing') {
        const existing = await prisma.patchEndpoint.findFirst({
          where: { patchId: patch.id, assetId },
        });

        if (!existing) {
          await prisma.patchEndpoint.create({
            data: {
              patchId: patch.id,
              assetId,
              name: asset.name,
              os: asset.os || undefined,
              status: 'missing',
              lastSeen: new Date(),
            },
          });
          updated++;
        } else if (existing.status !== 'missing') {
          await prisma.patchEndpoint.update({
            where: { id: existing.id },
            data: { status: 'missing', lastSeen: new Date() },
          });
          updated++;
        }
      }
    }

    if (updated > 0) {
      console.log(`[Patch Applicability] Updated ${updated} patch-asset mappings for asset ${assetId}`);
    }
  } catch (err) {
    console.error(`[Patch Applicability] Failed for asset ${assetId}:`, err);
  }
}

// ============================================
// Auto-Download Helper
// ============================================

/**
 * Automatically queue a download job when a patch has a downloadUrl.
 * Creates a PatchDownloadJob record and queues it via BullMQ.
 */
async function autoQueueDownload(patchId: string, downloadUrl: string, fileName: string) {
  const jobId = uuidv4();
  const targetPath = `patches/${patchId}/${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // Create the PatchDownloadJob record
  await prisma.patchDownloadJob.create({
    data: {
      jobId,
      patchId,
      sourceUrl: downloadUrl,
      targetPath,
      fileName: fileName || 'patch-file',
      status: 'pending',
      priority: 50,
      maxRetries: 3,
    },
  });

  // Queue via BullMQ
  await queueDownloadJob({
    jobId,
    sourceUrl: downloadUrl,
    targetPath,
    fileName: fileName || 'patch-file',
    patchId,
    priority: 50,
  });

  // Update patch downloadStatus
  await prisma.patch.update({
    where: { id: patchId },
    data: { downloadStatus: 'pending' },
  });

  console.log(`[Auto-Download] Queued download for patch ${patchId}: ${downloadUrl}`);
}

// ============================================
// PatchBundle Auto-Generation
// ============================================

/**
 * Auto-generate a PatchBundle with inline install/rollback/verify scripts
 * when a patch has enough metadata (vendor, software, OS).
 * Does NOT upload anything to MinIO — just creates inline scripts for
 * the agent to execute via the hub_patch_install command type.
 */
export async function autoGeneratePatchBundle(patchId: string, minioObjectKey?: string | null): Promise<void> {
  const patch = await prisma.patch.findUnique({
    where: { id: patchId },
    include: { bundle: true },
  });

  if (!patch) return;

  // Skip if bundle already has a tar.gz upload (manually uploaded) — unless we're updating with a Hub MinIO key
  if (patch.bundle?.bundleObjectKey && !minioObjectKey) return;

  // Need at least OS + (kbNumber or software) to generate scripts
  const os = (patch.os || '').toLowerCase();
  const kbNumber = patch.kbNumber;
  const packageName = patch.software;
  const downloadUrl = patch.downloadUrl;

  if (!os || (!kbNumber && !packageName)) return;

  let scriptInstall: string | null = null;
  let scriptRollback: string | null = null;
  let scriptVerify: string | null = null;

  // ── Installer-aware scripts when we have a Hub MinIO file ──
  if (minioObjectKey) {
    const filename = minioObjectKey.split('/').pop() || minioObjectKey;
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (os.includes('windows') || os === 'w') {
      if (ext === 'msi') {
        scriptInstall = [
          '#!/usr/bin/env powershell',
          `# Installer-aware script for ${filename}`,
          `$Installer = "$env:PATCHIQ_DOWNLOAD_PATH"`,
          'if (-not (Test-Path $Installer)) { Write-Error "Installer not found at $Installer"; exit 1 }',
          'Write-Host "Running MSI installer: $Installer"',
          '& msiexec /i "$Installer" /quiet /norestart',
          '$exitCode = $LASTEXITCODE',
          'Write-Host "MSI exit code: $exitCode"',
          'if ($exitCode -eq 3010) { Write-Host "Reboot required"; exit 0 }',
          'if ($exitCode -ne 0) { Write-Error "Install failed (exit code $exitCode)"; exit 1 }',
          `Write-Host "${filename} installed successfully"`,
        ].join('\n');
      } else {
        // .exe installer — run directly so $LASTEXITCODE is set
        scriptInstall = [
          '#!/usr/bin/env powershell',
          `# Installer-aware script for ${filename}`,
          `$Installer = "$env:PATCHIQ_DOWNLOAD_PATH"`,
          'if (-not (Test-Path $Installer)) { Write-Error "Installer not found at $Installer"; exit 1 }',
          'Write-Host "Running installer: $Installer"',
          '& $Installer /S',
          '$exitCode = $LASTEXITCODE',
          'Write-Host "Installer exit code: $exitCode"',
          'if ($exitCode -ne 0 -and $exitCode -ne $null) { Write-Error "Install failed (exit code $exitCode)"; exit 1 }',
          `Write-Host "${filename} installed successfully"`,
        ].join('\n');
      }

      scriptRollback = [
        '#!/usr/bin/env powershell',
        `# Rollback requires uninstalling ${packageName || filename}`,
        'Write-Host "Use Add/Remove Programs or the vendor uninstaller to rollback"',
        'exit 1',
      ].join('\n');

      scriptVerify = [
        '#!/usr/bin/env powershell',
        `# Verify ${packageName || filename} is installed`,
        `$Name = "${packageName || filename}"`,
        '$found = Get-WmiObject Win32_Product | Where-Object { $_.Name -like "*$Name*" }',
        'if ($found) { Write-Host "VERIFIED: $($found.Name) $($found.Version)"; exit 0 }',
        'Write-Error "NOT FOUND: $Name"; exit 1',
      ].join('\n');

    } else if (os.includes('linux') || os === 'l') {
      if (ext === 'deb') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          'export DEBIAN_FRONTEND=noninteractive',
          `INSTALLER="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$INSTALLER" ] || { echo "Installer not found at $INSTALLER"; exit 1; }',
          'dpkg -i "$INSTALLER" || apt-get install -f -y',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      } else if (ext === 'rpm') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `INSTALLER="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$INSTALLER" ] || { echo "Installer not found at $INSTALLER"; exit 1; }',
          'rpm -Uvh "$INSTALLER"',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      } else {
        // Generic tarball or binary
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `INSTALLER="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$INSTALLER" ] || { echo "Installer not found at $INSTALLER"; exit 1; }',
          'chmod +x "$INSTALLER" && "$INSTALLER"',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      }

      scriptRollback = [
        '#!/bin/bash',
        `# Rollback for ${packageName || filename}`,
        ext === 'deb'
          ? `dpkg -r "${packageName || filename.replace(`.${ext}`, '')}"`
          : `rpm -e "${packageName || filename.replace(`.${ext}`, '')}"`,
        'echo "Rollback completed"',
      ].join('\n');

      scriptVerify = [
        '#!/bin/bash',
        `# Verify ${packageName || filename} is installed`,
        ext === 'deb'
          ? `dpkg -s "${packageName || filename.replace(`.${ext}`, '')}" 2>/dev/null | grep -q "Status: install ok installed"`
          : `rpm -q "${packageName || filename.replace(`.${ext}`, '')}" >/dev/null 2>&1`,
        'if [ $? -eq 0 ]; then echo "VERIFIED"; exit 0; fi',
        'echo "NOT FOUND"; exit 1',
      ].join('\n');

    } else if (os.includes('mac') || os.includes('darwin') || os === 'm') {
      if (ext === 'dmg') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `DMG="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$DMG" ] || { echo "DMG not found at $DMG"; exit 1; }',
          'MOUNT_DIR=$(hdiutil attach "$DMG" -nobrowse | tail -1 | awk \'{print $3}\')',
          'APP=$(find "$MOUNT_DIR" -name "*.app" -maxdepth 1 | head -1)',
          '[ -n "$APP" ] || { hdiutil detach "$MOUNT_DIR"; echo "No .app found in DMG"; exit 1; }',
          'cp -R "$APP" /Applications/',
          'hdiutil detach "$MOUNT_DIR"',
          `echo "${filename} installed to /Applications"`,
        ].join('\n');
      } else if (ext === 'zip') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `ZIP="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$ZIP" ] || { echo "ZIP not found at $ZIP"; exit 1; }',
          'unzip -o "$ZIP" -d /Applications/',
          `echo "${filename} installed to /Applications"`,
        ].join('\n');
      } else if (ext === 'pkg') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `PKG="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$PKG" ] || { echo "PKG not found at $PKG"; exit 1; }',
          'sudo installer -pkg "$PKG" -target /',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      } else {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `INSTALLER="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$INSTALLER" ] || { echo "Installer not found at $INSTALLER"; exit 1; }',
          'chmod +x "$INSTALLER" && "$INSTALLER"',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      }

      scriptRollback = [
        '#!/bin/bash',
        `# Rollback for ${packageName || filename}`,
        `APP_NAME="${packageName || filename.replace(`.${ext}`, '')}"`,
        'rm -rf "/Applications/${APP_NAME}.app" 2>/dev/null',
        'echo "Removed $APP_NAME from /Applications"',
      ].join('\n');

      scriptVerify = [
        '#!/bin/bash',
        `# Verify ${packageName || filename} is installed`,
        `APP_NAME="${packageName || filename.replace(`.${ext}`, '')}"`,
        'if [ -d "/Applications/${APP_NAME}.app" ]; then echo "VERIFIED"; exit 0; fi',
        'echo "NOT FOUND"; exit 1',
      ].join('\n');
    }
  }

  // ── Fallback: package-manager scripts when no MinIO file ──
  if (!scriptInstall && (os.includes('windows') || os === 'w')) {
    // Windows patches
    if (kbNumber) {
      const msuUrl = downloadUrl || '';
      scriptInstall = [
        '#!/usr/bin/env powershell',
        `# Auto-generated install script for ${kbNumber}`,
        `$KB = "${kbNumber}"`,
        '',
        '# Check if already installed',
        '$installed = Get-HotFix -Id $KB -ErrorAction SilentlyContinue',
        'if ($installed) { Write-Host "Patch $KB is already installed"; exit 0 }',
        '',
        msuUrl ? `$msuPath = "$env:TEMP\\$KB.msu"` : '',
        msuUrl ? `Invoke-WebRequest -Uri "${msuUrl}" -OutFile $msuPath -UseBasicParsing` : '',
        msuUrl ? `wusa.exe $msuPath /quiet /norestart` : `dism.exe /Online /Add-Package /PackageName:$KB /Quiet /NoRestart`,
        'if ($LASTEXITCODE -eq 3010) { Write-Host "Reboot required"; exit 0 }',
        'if ($LASTEXITCODE -ne 0) { Write-Error "Install failed with exit code $LASTEXITCODE"; exit 1 }',
        'Write-Host "Patch $KB installed successfully"',
      ].filter(Boolean).join('\n');

      scriptRollback = [
        '#!/usr/bin/env powershell',
        `# Auto-generated rollback script for ${kbNumber}`,
        `$KB = "${kbNumber}"`,
        `wusa.exe /uninstall /kb:$($KB -replace 'KB','') /quiet /norestart`,
        'if ($LASTEXITCODE -ne 0) { Write-Error "Rollback failed"; exit 1 }',
        'Write-Host "Patch $KB rolled back"',
      ].join('\n');

      scriptVerify = [
        '#!/usr/bin/env powershell',
        `# Auto-generated verify script for ${kbNumber}`,
        `$KB = "${kbNumber}"`,
        '$installed = Get-HotFix -Id $KB -ErrorAction SilentlyContinue',
        'if ($installed) { Write-Host "VERIFIED: $KB installed"; exit 0 }',
        'else { Write-Error "NOT FOUND: $KB"; exit 1 }',
      ].join('\n');
    } else if (packageName) {
      // Third-party Windows software (non-KB) — use winget/choco
      const cleanName = packageName.replace(/[^a-zA-Z0-9._+ -]/g, '');

      scriptInstall = [
        '#!/usr/bin/env powershell',
        `# Auto-generated upgrade script for ${cleanName}`,
        `$Package = "${cleanName}"`,
        '',
        '# Try winget first',
        'if (Get-Command winget -ErrorAction SilentlyContinue) {',
        '    winget upgrade --name $Package --silent --accept-package-agreements --accept-source-agreements',
        '    if ($LASTEXITCODE -eq 0) { Write-Host "Upgraded $Package via winget"; exit 0 }',
        '}',
        '',
        '# Fallback to chocolatey',
        'if (Get-Command choco -ErrorAction SilentlyContinue) {',
        '    choco upgrade $Package -y --no-progress',
        '    if ($LASTEXITCODE -eq 0) { Write-Host "Upgraded $Package via chocolatey"; exit 0 }',
        '}',
        '',
        'Write-Error "No package manager available to upgrade $Package"',
        'exit 1',
      ].join('\n');

      scriptRollback = [
        '#!/usr/bin/env powershell',
        `# Auto-generated rollback script for ${cleanName}`,
        `$Package = "${cleanName}"`,
        'Write-Host "Rollback for third-party packages requires previous version info"',
        'Write-Host "Use: winget install --name $Package --version <previous> or choco install $Package --version <previous>"',
        'exit 1',
      ].join('\n');

      scriptVerify = [
        '#!/usr/bin/env powershell',
        `# Auto-generated verify script for ${cleanName}`,
        `$Package = "${cleanName}"`,
        'if (Get-Command winget -ErrorAction SilentlyContinue) {',
        '    $list = winget list --name $Package 2>$null',
        '    if ($LASTEXITCODE -eq 0) { Write-Host "VERIFIED: $Package installed"; exit 0 }',
        '}',
        'Write-Error "NOT FOUND: $Package"',
        'exit 1',
      ].join('\n');
    }
  }
  if (!scriptInstall && (os.includes('linux') || os.includes('ubuntu') || os.includes('debian') || os.includes('rhel') || os.includes('centos') || os.includes('fedora') || os === 'l')) {
    // Linux patches (fallback — package manager)
    if (packageName) {
      const isDebian = os.includes('ubuntu') || os.includes('debian') || os === 'l' || os === 'linux';
      const isRhel = os.includes('rhel') || os.includes('centos') || os.includes('fedora') || os.includes('rocky') || os.includes('alma');
      const pkgManager = isRhel ? 'dnf' : 'apt-get';
      const cleanName = packageName.replace(/[^a-zA-Z0-9._-]/g, '');

      scriptInstall = [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated upgrade script for ${cleanName}`,
        '',
        isDebian ? 'export DEBIAN_FRONTEND=noninteractive' : '',
        isDebian ? `apt-get update -qq` : '',
        isDebian
          ? `apt-get install --only-upgrade -y ${cleanName}`
          : `${pkgManager} upgrade -y ${cleanName}`,
        `echo "Package ${cleanName} upgraded successfully"`,
      ].filter(Boolean).join('\n');

      scriptRollback = [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated rollback script for ${cleanName}`,
        `${pkgManager} remove -y ${cleanName}`,
        `echo "Package ${cleanName} removed"`,
      ].join('\n');

      scriptVerify = [
        '#!/bin/bash',
        `# Auto-generated verify script for ${cleanName}`,
        isDebian
          ? `dpkg -s ${cleanName} 2>/dev/null | grep -q "Status: install ok installed"`
          : `rpm -q ${cleanName} >/dev/null 2>&1`,
        'if [ $? -eq 0 ]; then echo "VERIFIED: ' + cleanName + ' installed"; exit 0; fi',
        'echo "NOT FOUND: ' + cleanName + '"; exit 1',
      ].join('\n');
    }
  }
  if (!scriptInstall && (os.includes('mac') || os.includes('darwin') || os === 'm')) {
    // macOS patches (fallback — brew/softwareupdate)
    if (packageName) {
      const cleanName = packageName.replace(/[^a-zA-Z0-9._-]/g, '');

      scriptInstall = [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated install script for ${cleanName}`,
        `if command -v brew &>/dev/null; then`,
        `  brew install ${cleanName} || brew upgrade ${cleanName}`,
        `else`,
        `  softwareupdate --install "${cleanName}" --no-scan`,
        `fi`,
        `echo "Package ${cleanName} installed successfully"`,
      ].join('\n');

      scriptRollback = [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated rollback script for ${cleanName}`,
        `if command -v brew &>/dev/null; then`,
        `  brew uninstall ${cleanName}`,
        `fi`,
        `echo "Package ${cleanName} removed"`,
      ].join('\n');

      scriptVerify = [
        '#!/bin/bash',
        `# Auto-generated verify script for ${cleanName}`,
        `if command -v brew &>/dev/null && brew list ${cleanName} &>/dev/null; then`,
        `  echo "VERIFIED: ${cleanName} installed"; exit 0`,
        `fi`,
        `echo "NOT FOUND: ${cleanName}"; exit 1`,
      ].join('\n');
    }
  }

  // If we couldn't generate scripts, skip
  if (!scriptInstall) return;

  // Bundle data shared between create and update
  const bundleData: Record<string, any> = {
    scriptInstall,
    scriptRollback,
    scriptVerify,
    scriptsIncluded: true,
  };

  // When we have a Hub MinIO file, set the bundleObjectKey so the deployment executor
  // can stream the installer via /v1/patches/:id/bundle/stream
  if (minioObjectKey) {
    bundleData.bundleObjectKey = minioObjectKey;
    bundleData.sourceUrl = minioObjectKey;
    bundleData.downloadStatus = 'completed';
  }

  if (patch.bundle) {
    await prisma.patchBundle.update({
      where: { id: patch.bundle.id },
      data: bundleData,
    });
  } else {
    await prisma.patchBundle.create({
      data: {
        patchId,
        ...bundleData,
        sourceUrl: bundleData.sourceUrl || patch.downloadUrl,
        downloadStatus: bundleData.downloadStatus || (patch.downloadUrl ? 'pending' : 'completed'),
        requiresRoot: true,
      },
    });
  }

  console.log(`[PatchBundle] Auto-generated ${minioObjectKey ? 'installer-aware' : 'inline'} scripts for patch ${patch.patchId || patch.id} (${os})`);
}

// ============================================
// Helper Functions
// ============================================

async function generatePatchId(os: string): Promise<string> {
  const osPrefix = os.charAt(0).toUpperCase();
  const count = await prisma.patch.count();
  return `ZPH-${osPrefix}-${(count + 1).toString().padStart(4, '0')}`;
}

async function generateDeploymentId(): Promise<string> {
  const count = await prisma.patchDeployment.count();
  return `DEP-${(count + 1).toString().padStart(4, '0')}`;
}

function transformPatch(patch: any) {
  return {
    id: patch.id,
    patchId: patch.patchId,
    title: patch.title,
    software: patch.software,
    description: patch.description,
    severity: patch.severity,
    category: patch.category,
    vendor: patch.vendor,
    product: patch.product,
    os: patch.os,
    osVersion: patch.osVersion,
    platform: patch.platform,
    architecture: patch.architecture,
    kbNumber: patch.kbNumber,
    bulletinId: patch.bulletinId,
    releaseDate: patch.releaseDate?.toISOString() || null,
    releasedOn: patch.releasedOn?.toISOString() || null,
    downloadedOn: patch.downloadedOn?.toISOString() || null,
    size: patch.size ? Number(patch.size) : null,
    sizeFormatted: patch.sizeFormatted,
    downloadUrl: patch.downloadUrl,
    referenceUrl: patch.referenceUrl,
    rebootRequired: patch.rebootRequired,
    supportUninstallation: patch.supportUninstallation,
    supportsRollback: patch.supportsRollback || false,
    patchType: patch.patchType || 'UPDATE',
    languagesSupported: patch.languagesSupported || [],
    tags: patch.tags || [],
    cveNumbers: patch.cveNumbers || [],
    source: patch.source,
    status: patch.status,
    downloadStatus: patch.downloadStatus,
    supersedes: patch.supersedes || [],
    supersededBy: patch.supersededBy || [],
    supersededAt: patch.supersededAt?.toISOString() || null,
    isSuperseded: !!patch.supersededAt, // Helper flag for UI
    operationalStatusSince: patch.operationalStatusSince?.toISOString() || null,
    endpoints: patch.endpoints,
    testStatus: patch.testStatus,
    testResult: patch.testResult,
    testedBy: patch.testedBy,
    testedAt: patch.testedAt?.toISOString() || null,
    testNotes: patch.testNotes,
    testEnvironment: patch.testEnvironment,
    approvalStatus: patch.approvalStatus,
    approvedBy: patch.approvedBy,
    approvedAt: patch.approvedAt?.toISOString() || null,
    rejectedBy: patch.rejectedBy,
    rejectedAt: patch.rejectedAt?.toISOString() || null,
    rejectionReason: patch.rejectionReason,
    rejectionNotes: patch.rejectionNotes,
    createdAt: patch.createdAt.toISOString(),
    updatedAt: patch.updatedAt.toISOString(),
    // Bundle info (hub-centric deployment)
    bundle: patch.bundle ? {
      id: patch.bundle.id,
      hasBundle: !!patch.bundle.bundleObjectKey,
      hasScripts: patch.bundle.scriptsIncluded,
      downloadStatus: patch.bundle.downloadStatus,
      bundleChecksum: patch.bundle.bundleChecksum,
    } : null,
  };
}

function transformDeployment(deployment: any) {
  return {
    id: deployment.id,
    name: deployment.name,
    deploymentId: deployment.deploymentId,
    description: deployment.description,
    type: deployment.type,
    configType: deployment.configType,
    scope: deployment.scope,
    status: deployment.status,
    stage: deployment.stage,
    pending: deployment.pending,
    succeeded: deployment.succeeded,
    failed: deployment.failed,
    targetGroups: deployment.targetGroups || [],
    scheduledAt: deployment.scheduledAt?.toISOString() || null,
    startedAt: deployment.startedAt?.toISOString() || null,
    completedAt: deployment.completedAt?.toISOString() || null,
    triggerType: deployment.triggerType || null,
    skipApprovalCheck: deployment.skipApprovalCheck || false,
    approvalOverrideBy: deployment.approvalOverrideBy || null,
    autoRollback: deployment.autoRollback || false,
    createdBy: deployment.createdBy,
    createdAt: deployment.createdAt.toISOString(),
    updatedAt: deployment.updatedAt.toISOString(),
    patches: deployment.patches?.map(transformPatch) || [],
    tasks: deployment.tasks?.map((task: any) => ({
      id: task.id,
      endpoint: {
        id: task.asset?.id || task.assetId,
        name: task.asset?.hostname || task.asset?.name || 'Unknown',
        os: task.asset?.osName || task.asset?.platform || 'Unknown',
        status: task.asset?.status || 'Unknown',
      },
      name: task.patchName || task.name || 'Unknown Patch',
      status: task.status,
      createdBy: deployment.createdBy || 'System',
      lastUpdated: task.updatedAt?.toISOString() || task.createdAt?.toISOString(),
      createdOn: task.createdAt?.toISOString(),
    })) || [],
  };
}

function transformPatchTest(test: any) {
  return {
    id: test.id,
    name: test.name,
    description: test.description,
    applicationType: test.applicationType,
    applications: test.applications || [],
    scope: test.scope,
    computers: test.computers || [],
    groups: test.groups || [],
    status: test.status,
    createdBy: test.createdBy,
    createdAt: test.createdAt.toISOString(),
    updatedAt: test.updatedAt.toISOString(),
  };
}

function transformZeroTouchConfig(config: any) {
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    applicationType: config.applicationType,
    applications: config.applications || [],
    scope: config.scope,
    computers: config.computers || [],
    groups: config.groups || [],
    autoDeploymentRules: config.autoDeploymentRules,
    status: config.status,
    lastTriggeredAt: config.lastTriggeredAt?.toISOString() || null,
    deploymentsCreated: config.deploymentsCreated || 0,
    createdBy: config.createdBy,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}
