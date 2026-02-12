import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@shared/services/logger';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import * as patchesService from './patches.service';

const logger = createLogger('patches-controller');
import type {
  PatchListQuery,
  CreatePatchInput,
  UpdatePatchInput,
  TestPatchInput,
  RejectPatchInput,
  CreateDeploymentInput,
  DeploymentListQuery,
  CreatePatchTestInput,
  CreateZeroTouchConfigInput,
  UpdateZeroTouchConfigInput,
  CreatePatchDeploymentFromUIInput,
} from './patches.validator';

// Inline types for validated query params (schemas defined in patches.validator.ts)
import type { z } from 'zod';
import type { testApproveQuerySchema, patchTestListQuerySchema, zeroTouchConfigListQuerySchema } from './patches.validator';
type TestApproveQuery = z.infer<typeof testApproveQuerySchema>;
type PatchTestListQuery = z.infer<typeof patchTestListQuerySchema>;
type ZeroTouchConfigListQuery = z.infer<typeof zeroTouchConfigListQuerySchema>;

// ============================================
// Patches CRUD
// ============================================

export async function listPatches(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<PatchListQuery>(req);
    const result = await patchesService.listPatches(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getPatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getPatchById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function streamPatchBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const bundle = await patchesService.getPatchBundleByPatchId(id);
    if (!bundle?.bundleObjectKey) {
      sendError(res, 404, 'NOT_FOUND', 'No downloadable bundle for this patch');
      return;
    }

    const { minioStorage } = await import('@shared/services/minio.service');
    const stream = await minioStorage.downloadStream(bundle.bundleObjectKey);

    const filename = bundle.bundleObjectKey.split('/').pop() || 'patch-bundle';
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const contentTypes: Record<string, string> = {
      exe: 'application/x-msdownload',
      msi: 'application/x-msi',
      deb: 'application/x-debian-package',
      rpm: 'application/x-rpm',
      dmg: 'application/x-apple-diskimage',
      pkg: 'application/x-newton-compatible-pkg',
      zip: 'application/zip',
      gz: 'application/gzip',
    };

    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function discoverPatches(req: Request, res: Response, next: NextFunction) {
  try {
    const { cveDatabase } = await import('@shared/services/cve-database.service');
    const patchesCreated = await cveDatabase.generatePatchSuggestions();

    // Re-resolve asset_software with null CPE in background (picks up new seed mappings)
    const { cpeMappingService } = await import('@shared/services/cpe-mapping.service');
    cpeMappingService.reResolveNullCpe().then(n => {
      if (n > 0) logger.info({ recordsUpdated: n }, 'Background CPE re-resolution completed');
    }).catch(() => { /* background task, ignore errors */ });

    sendSuccess(res, {
      patchesCreated,
      message: patchesCreated > 0
        ? `Created ${patchesCreated} new patches from Hub software`
        : 'No new patches needed — all Hub software already has patches or no matching CVEs found',
    });
  } catch (error) {
    next(error);
  }
}

export async function createPatch(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body as CreatePatchInput;
    const result = await patchesService.createPatch(data);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function updatePatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdatePatchInput;
    const result = await patchesService.updatePatch(id, data);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function deletePatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await patchesService.deletePatch(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ============================================
// Supersedence Management
// ============================================

export async function getSupersededPatches(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getSupersededPatches(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getSupersedingPatches(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getSupersedingPatches(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function supersedePatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, targetId } = req.params;
    const result = await patchesService.supersedePatch(targetId, id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function removeSupersedence(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, targetId } = req.params;
    const result = await patchesService.removeSupersedence(targetId, id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Patch Related Data
// ============================================

export async function getAffectedProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getAffectedProducts(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function addAffectedProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.addAffectedProduct(id, req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function removeAffectedProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, productId } = req.params;
    const result = await patchesService.removeAffectedProduct(id, productId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getVulnerabilities(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getVulnerabilities(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Scan Endpoints & Endpoints
// ============================================

export async function scanEndpoints(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId;
    const result = await patchesService.scanEndpoints(id, req.body, orgId);
    sendSuccess(res, {
      scannedCount: result.assetsScanned,
      missingCount: result.missing,
      notApplicableCount: result.notApplicable,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEndpoints(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = req.user!.organizationId;
    const result = await patchesService.getEndpoints(id, orgId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Test & Approve Workflow
// ============================================

export async function getPatchesPendingTestApproval(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<TestApproveQuery>(req);
    const result = await patchesService.getPatchesPendingTestApproval({
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function testPatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const data = req.body as TestPatchInput;
    const result = await patchesService.testPatch(id, userId, data);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function approvePatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const result = await patchesService.approvePatch(id, userId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function rejectPatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const data = req.body as RejectPatchInput;
    const result = await patchesService.rejectPatch(id, userId, data);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Deployments
// ============================================

export async function listDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<DeploymentListQuery>(req);
    const result = await patchesService.listDeployments(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getDeploymentById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateDeploymentInput;
    const result = await patchesService.createDeployment(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await patchesService.deleteDeployment(id, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function updateDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, scheduledAt } = req.body;
    const result = await patchesService.updateDeployment(id, { name, scheduledAt });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function cancelDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const result = await patchesService.cancelDeployment(id, userId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getDeploymentPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getDeploymentPreview(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function executeDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const result = await patchesService.executeDeployment(id, userId);
    sendSuccess(res, result, 202);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Patch Deployment from UI
// ============================================

export async function createPatchDeploymentFromUI(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreatePatchDeploymentFromUIInput;
    const result = await patchesService.createPatchDeploymentFromUI(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Patch Tests
// ============================================

export async function listPatchTests(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<PatchTestListQuery>(req);
    const result = await patchesService.listPatchTests({
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getPatchTest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getPatchTestById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createPatchTest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreatePatchTestInput;
    const result = await patchesService.createPatchTest(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function approvePatchTest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const result = await patchesService.approvePatchTest(id, userId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function deletePatchTest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await patchesService.deletePatchTest(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ============================================
// Zero Touch Configs
// ============================================

export async function listZeroTouchConfigs(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<ZeroTouchConfigListQuery>(req);
    const result = await patchesService.listZeroTouchConfigs({
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getZeroTouchConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getZeroTouchConfigById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createZeroTouchConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateZeroTouchConfigInput;
    const result = await patchesService.createZeroTouchConfig(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateZeroTouchConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateZeroTouchConfigInput;
    const result = await patchesService.updateZeroTouchConfig(id, data);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function deleteZeroTouchConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await patchesService.deleteZeroTouchConfig(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
