import type { Prisma } from '@prisma/client';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import { createLogger } from '@shared/services/logger';
import { prisma } from '@/db/client';

import { transformPatch } from './patches.helpers';
import { evaluateZeroTouchRules } from './patches-zero-touch.service';
import type { TestPatchInput, RejectPatchInput } from './patches.validator';

const logger = createLogger('patches');

// ============================================
// Test & Approve Workflow
// ============================================

export async function getPatchesPendingTestApproval(params: { status?: string; page: number; limit: number }) {
  const where: Prisma.PatchWhereInput = {};

  if (params.status === 'PENDING_TEST') {
    where.testStatus = 'NOT_TESTED';
  } else if (params.status === 'PENDING_APPROVAL') {
    where.testStatus = 'TESTED';
    where.approvalStatus = 'PENDING';
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

  const testStatus = data.status === 'PASSED' ? 'TESTED' : 'TEST_FAILED';

  const updated = await prisma.patch.update({
    where: { id },
    data: {
      testStatus,
      testResult: data.status,
      testedBy: userId,
      testedAt: new Date(),
      testNotes: data.notes,
      testEnvironment: data.testEnvironment,
      ...(data.status === 'FAILED' && {
        approvalStatus: 'REJECTED',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: 'TEST_FAILED',
      }),
    },
  });

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

  if (patch.testStatus !== 'TESTED') {
    throw new BadRequestError('Patch must be tested before approval');
  }

  if (patch.testResult === 'FAILED') {
    throw new BadRequestError('Cannot approve patch with failed test result');
  }

  const updated = await prisma.patch.update({
    where: { id },
    data: {
      approvalStatus: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'APPROVE_PATCH',
      resource: 'patches',
      resourceId: id,
    },
  });

  evaluateZeroTouchRules(id).catch((err) => {
    logger.error({ err, patchId: id }, 'Zero-touch evaluation failed');
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
      approvalStatus: 'REJECTED',
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectionReason: data.reason,
      rejectionNotes: data.notes,
    },
  });

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
