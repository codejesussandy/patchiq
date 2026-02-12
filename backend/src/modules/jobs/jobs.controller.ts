import { Request, Response, NextFunction } from 'express';
import { sendSuccess, typedQuery } from '@shared/utils';
import { deploymentPolicyCrudService } from './deployment-policy-crud.service';
import * as jobsService from './jobs.service';
import type {
  CreatePatchJobInput,
  PatchJobListQuery,
  CreateVulnerabilityJobInput,
  VulnerabilityJobListQuery,
  UpdateVulnerabilityDBSyncInput,
  CreateSoftwareDeploymentInput,
  SoftwareDeploymentListQuery,
  CreateConfigCatalogInput,
  UpdateConfigCatalogInput,
  ConfigCatalogListQuery,
  CreateConfigBundleInput,
  UpdateConfigBundleInput,
  ConfigBundleListQuery,
  CreateConfigDeploymentInput,
  ConfigDeploymentListQuery,
  CreateDeploymentPolicyInput,
  UpdateDeploymentPolicyInput,
  DeploymentPolicyListQuery,
} from './jobs.validators';

// ============================================
// Patch Jobs Controllers
// ============================================

export async function listPatchJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<PatchJobListQuery>(req);
    const result = await jobsService.listPatchJobs(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getPatchJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getPatchJobById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createPatchJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreatePatchJobInput;
    const result = await jobsService.createPatchJob(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function deletePatchJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deletePatchJob(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Vulnerability Jobs Controllers
// ============================================

export async function listVulnerabilityJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<VulnerabilityJobListQuery>(req);
    const result = await jobsService.listVulnerabilityJobs(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getVulnerabilityJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getVulnerabilityJobById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createVulnerabilityJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateVulnerabilityJobInput;
    const result = await jobsService.createVulnerabilityJob(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteVulnerabilityJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteVulnerabilityJob(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getVulnerabilityDBSync(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await jobsService.getVulnerabilityDBSync();
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function updateVulnerabilityDBSync(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body as UpdateVulnerabilityDBSyncInput;
    const result = await jobsService.updateVulnerabilityDBSync(data);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function triggerVulnerabilityDBSync(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await jobsService.triggerVulnerabilityDBSync();
    sendSuccess(res, result, 202);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Software Deployment Controllers
// ============================================

export async function listSoftwareDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<SoftwareDeploymentListQuery>(req);
    const result = await jobsService.listSoftwareDeployments(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getSoftwareDeploymentById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createSoftwareDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateSoftwareDeploymentInput;
    const result = await jobsService.createSoftwareDeployment(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareDeploymentTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getSoftwareDeploymentTasks(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function deleteSoftwareDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteSoftwareDeployment(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Configuration Catalog Controllers
// ============================================

export async function listConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<ConfigCatalogListQuery>(req);
    const result = await jobsService.listConfigCatalog(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getConfigCatalogById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateConfigCatalogInput;
    const result = await jobsService.createConfigCatalog(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateConfigCatalogInput;
    const result = await jobsService.updateConfigCatalog(id, data);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function deleteConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteConfigCatalog(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Configuration Bundle Controllers
// ============================================

export async function listConfigBundles(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<ConfigBundleListQuery>(req);
    const result = await jobsService.listConfigBundles(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getConfigBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getConfigBundleById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createConfigBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateConfigBundleInput;
    const result = await jobsService.createConfigBundle(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateConfigBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateConfigBundleInput;
    const result = await jobsService.updateConfigBundle(id, data);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function deleteConfigBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteConfigBundle(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Configuration Deployment Controllers
// ============================================

export async function listConfigDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<ConfigDeploymentListQuery>(req);
    const result = await jobsService.listConfigDeployments(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createConfigDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateConfigDeploymentInput;
    const result = await jobsService.createConfigDeployment(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getConfigDeploymentTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getConfigDeploymentTasks(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function deleteConfigDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteConfigDeployment(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Deployment Policy Controllers (via BaseCrudService)
// ============================================

export async function listDeploymentPolicies(req: Request, res: Response, next: NextFunction) {
  try {
    const query = typedQuery<DeploymentPolicyListQuery>(req);
    const result = await deploymentPolicyCrudService.listPaginated(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getDeploymentPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await deploymentPolicyCrudService.findById(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createDeploymentPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateDeploymentPolicyInput;
    const result = await deploymentPolicyCrudService.createWithUser(data, userId);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateDeploymentPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateDeploymentPolicyInput;
    const result = await deploymentPolicyCrudService.updateByIdOrPolicyId(id, data);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function deleteDeploymentPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await deploymentPolicyCrudService.deleteByIdOrPolicyId(id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
