import { Request, Response, NextFunction } from 'express';
import * as patchesService from './patches.service';
import type {
  PatchListQuery,
  CreatePatchInput,
  UpdatePatchInput,
  TestPatchInput,
  RejectPatchInput,
  ScanEndpointsInput,
  CreateDeploymentInput,
  DeploymentListQuery,
  CreatePatchTestInput,
  CreateZeroTouchConfigInput,
  UpdateZeroTouchConfigInput,
} from './patches.validator';

// ============================================
// Patches CRUD
// ============================================

export async function listPatches(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as PatchListQuery;
    const result = await patchesService.listPatches(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getPatchById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createPatch(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body as CreatePatchInput;
    const result = await patchesService.createPatch(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updatePatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdatePatchInput;
    const result = await patchesService.updatePatch(id, data);
    res.json(result);
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
// Patch Related Data
// ============================================

export async function getAffectedProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getAffectedProducts(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getFileDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getFileDetails(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getVulnerabilities(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getVulnerabilities(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getEndpoints(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getEndpoints(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function scanEndpoints(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as ScanEndpointsInput;
    const result = await patchesService.scanEndpoints(id, data);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Test & Approve Workflow
// ============================================

export async function getPatchesPendingTestApproval(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await patchesService.getPatchesPendingTestApproval({
      status: status as string | undefined,
      page: Number(page),
      limit: Number(limit),
    });
    res.json(result);
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
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function approvePatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const result = await patchesService.approvePatch(id, userId);
    res.json(result);
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
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Deployments
// ============================================

export async function listDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as DeploymentListQuery;
    const result = await patchesService.listDeployments(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getDeploymentById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateDeploymentInput;
    const result = await patchesService.createDeployment(data, userId);
    res.status(201).json(result);
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

export async function getDeploymentPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getDeploymentPreview(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function executeDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const result = await patchesService.executeDeployment(id, userId);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Patch Tests
// ============================================

export async function listPatchTests(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await patchesService.listPatchTests({
      page: Number(page),
      limit: Number(limit),
      status: status as string | undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPatchTest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getPatchTestById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createPatchTest(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreatePatchTestInput;
    const result = await patchesService.createPatchTest(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function approvePatchTest(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const result = await patchesService.approvePatchTest(id, userId);
    res.json(result);
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
    const { page = 1, limit = 20, status } = req.query;
    const result = await patchesService.listZeroTouchConfigs({
      page: Number(page),
      limit: Number(limit),
      status: status as string | undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getZeroTouchConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await patchesService.getZeroTouchConfigById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createZeroTouchConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateZeroTouchConfigInput;
    const result = await patchesService.createZeroTouchConfig(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateZeroTouchConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateZeroTouchConfigInput;
    const result = await patchesService.updateZeroTouchConfig(id, data);
    res.json(result);
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
