import type { Prisma } from '@prisma/client';
import { NotFoundError } from '@shared/errors';
import { getPaginationParams, paginate } from '@shared/utils/pagination';
import { prisma } from '@/db/client';

import { transformPatchTest } from './patches.helpers';
import type { CreatePatchTestInput } from './patches.validator';

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
      status: 'PENDING',
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
      status: 'APPROVED',
    },
  });

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
