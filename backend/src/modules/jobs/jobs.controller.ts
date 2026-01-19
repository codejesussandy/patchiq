import { Request, Response, NextFunction } from 'express';
import * as jobsService from './jobs.service';
import type {
  CreatePatchJobInput,
  PatchJobListQuery,
  CreateVulnerabilityJobInput,
  VulnerabilityJobListQuery,
  UpdateVulnerabilityDBSyncInput,
  CreateSoftwareCatalogInput,
  UpdateSoftwareCatalogInput,
  SoftwareCatalogListQuery,
  CreateSoftwareBundleInput,
  UpdateSoftwareBundleInput,
  SoftwareBundleListQuery,
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
    const query = req.query as unknown as PatchJobListQuery;
    const result = await jobsService.listPatchJobs(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPatchJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getPatchJobById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createPatchJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreatePatchJobInput;
    const result = await jobsService.createPatchJob(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deletePatchJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deletePatchJob(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Vulnerability Jobs Controllers
// ============================================

export async function listVulnerabilityJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as VulnerabilityJobListQuery;
    const result = await jobsService.listVulnerabilityJobs(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getVulnerabilityJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getVulnerabilityJobById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createVulnerabilityJob(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateVulnerabilityJobInput;
    const result = await jobsService.createVulnerabilityJob(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteVulnerabilityJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteVulnerabilityJob(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getVulnerabilityDBSync(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await jobsService.getVulnerabilityDBSync();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateVulnerabilityDBSync(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body as UpdateVulnerabilityDBSyncInput;
    const result = await jobsService.updateVulnerabilityDBSync(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function triggerVulnerabilityDBSync(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await jobsService.triggerVulnerabilityDBSync();
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Software Catalog Controllers
// ============================================

export async function listSoftwareCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as SoftwareCatalogListQuery;
    const result = await jobsService.listSoftwareCatalog(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getSoftwareCatalogById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createSoftwareCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateSoftwareCatalogInput;
    const result = await jobsService.createSoftwareCatalog(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateSoftwareCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateSoftwareCatalogInput;
    const result = await jobsService.updateSoftwareCatalog(id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteSoftwareCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteSoftwareCatalog(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Software Bundle Controllers
// ============================================

export async function listSoftwareBundles(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as SoftwareBundleListQuery;
    const result = await jobsService.listSoftwareBundles(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getSoftwareBundleById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createSoftwareBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateSoftwareBundleInput;
    const result = await jobsService.createSoftwareBundle(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateSoftwareBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateSoftwareBundleInput;
    const result = await jobsService.updateSoftwareBundle(id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteSoftwareBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteSoftwareBundle(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Software Deployment Controllers
// ============================================

export async function listSoftwareDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as SoftwareDeploymentListQuery;
    const result = await jobsService.listSoftwareDeployments(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getSoftwareDeploymentById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createSoftwareDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateSoftwareDeploymentInput;
    const result = await jobsService.createSoftwareDeployment(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareDeploymentTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getSoftwareDeploymentTasks(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteSoftwareDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteSoftwareDeployment(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Configuration Catalog Controllers
// ============================================

export async function listConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as ConfigCatalogListQuery;
    const result = await jobsService.listConfigCatalog(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getConfigCatalogById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateConfigCatalogInput;
    const result = await jobsService.createConfigCatalog(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateConfigCatalogInput;
    const result = await jobsService.updateConfigCatalog(id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteConfigCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteConfigCatalog(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Configuration Bundle Controllers
// ============================================

export async function listConfigBundles(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as ConfigBundleListQuery;
    const result = await jobsService.listConfigBundles(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getConfigBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getConfigBundleById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createConfigBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateConfigBundleInput;
    const result = await jobsService.createConfigBundle(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateConfigBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateConfigBundleInput;
    const result = await jobsService.updateConfigBundle(id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteConfigBundle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteConfigBundle(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Configuration Deployment Controllers
// ============================================

export async function listConfigDeployments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as ConfigDeploymentListQuery;
    const result = await jobsService.listConfigDeployments(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createConfigDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateConfigDeploymentInput;
    const result = await jobsService.createConfigDeployment(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getConfigDeploymentTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getConfigDeploymentTasks(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteConfigDeployment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteConfigDeployment(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Deployment Policy Controllers
// ============================================

export async function listDeploymentPolicies(req: Request, res: Response, next: NextFunction) {
  try {
    const query = req.query as unknown as DeploymentPolicyListQuery;
    const result = await jobsService.listDeploymentPolicies(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDeploymentPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.getDeploymentPolicyById(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function createDeploymentPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const data = req.body as CreateDeploymentPolicyInput;
    const result = await jobsService.createDeploymentPolicy(data, userId);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateDeploymentPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body as UpdateDeploymentPolicyInput;
    const result = await jobsService.updateDeploymentPolicy(id, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteDeploymentPolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await jobsService.deleteDeploymentPolicy(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
