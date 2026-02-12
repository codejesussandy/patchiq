import { Request, Response, NextFunction } from 'express';
import { AgentsService } from '@modules/agents/agents.service';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import { parsePaginationQuery } from '@shared/utils/pagination';
import * as assetsService from './assets.service';
import type { AssetQueryInput, SubCategoryListQueryInput, LifecycleQueryInput, TagQueryInput } from './assets.validators';
import { categoryCrudService } from './category-crud.service';
import { subCategoryCrudService } from './subcategory-crud.service';
import { tagCrudService } from './tag-crud.service';

const agentsService = new AgentsService();

// ============================================
// Categories Controllers (via BaseCrudService)
// ============================================

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await categoryCrudService.findMany();
    sendSuccess(res, result.data);
  } catch (error) {
    next(error);
  }
}

export async function getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoryCrudService.findById(req.params.id);
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoryCrudService.create(req.body);
    sendSuccess(res, category, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoryCrudService.update(req.params.id, req.body);
    sendSuccess(res, category);
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await categoryCrudService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ============================================
// SubCategories Controllers (via BaseCrudService)
// ============================================

export async function listSubCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { categoryId } = typedQuery<SubCategoryListQueryInput>(req);
    const subCategories = await subCategoryCrudService.listAll(categoryId);
    sendSuccess(res, subCategories);
  } catch (error) {
    next(error);
  }
}

export async function getSubCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subCategory = await subCategoryCrudService.findById(req.params.id);
    sendSuccess(res, subCategory);
  } catch (error) {
    next(error);
  }
}

export async function createSubCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subCategory = await subCategoryCrudService.create(req.body);
    sendSuccess(res, subCategory, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSubCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subCategory = await subCategoryCrudService.update(req.params.id, req.body);
    sendSuccess(res, subCategory);
  } catch (error) {
    next(error);
  }
}

export async function deleteSubCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await subCategoryCrudService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ============================================
// Tags Controllers (via BaseCrudService)
// ============================================

export async function listTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, page, limit } = typedQuery<TagQueryInput>(req);
    const result = await tagCrudService.findMany({ search, page: page || 1, limit: limit || 50 });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getTagById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tag = await tagCrudService.findById(req.params.id);
    sendSuccess(res, tag);
  } catch (error) {
    next(error);
  }
}

export async function createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tag = await tagCrudService.create(req.body);
    sendSuccess(res, tag, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tag = await tagCrudService.update(req.params.id, req.body);
    sendSuccess(res, tag);
  } catch (error) {
    next(error);
  }
}

export async function deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await tagCrudService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getPopularTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const tags = await assetsService.getPopularTags(limit);
    sendSuccess(res, tags);
  } catch (error) {
    next(error);
  }
}

export async function addTagsToAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tags = await assetsService.addTagsToAsset(req.params.id, req.body.tagIds, req.user?.id);
    sendSuccess(res, tags);
  } catch (error) {
    next(error);
  }
}

export async function removeTagFromAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assetsService.removeTagFromAsset(req.params.id, req.params.tagId, req.user?.id);
    sendSuccess(res, { message: 'Tag removed from asset' });
  } catch (error) {
    next(error);
  }
}

export async function bulkAssignTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user?.organizationId;
    const result = await assetsService.bulkAssignTags(req.body.assetIds, req.body.tagIds, orgId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function bulkRemoveTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user?.organizationId;
    const result = await assetsService.bulkRemoveTags(req.body.assetIds, req.body.tagIds, orgId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function searchTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = req.query.q as string;
    const result = await assetsService.searchTags(q);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getAssetsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user?.organizationId;
    const result = await assetsService.getAssetsByCategory(req.params.id, orgId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getAssetsBySubCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user?.organizationId;
    const result = await assetsService.getAssetsBySubCategory(req.params.id, orgId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getEndpointDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user?.organizationId;
    const result = await assetsService.getEndpointDetails(req.params.id, orgId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Assets Controllers
// ============================================

export async function listAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = typedQuery<AssetQueryInput>(req);
    const pagination = parsePaginationQuery(req.query);

    const result = await assetsService.listAssets({
      status: query.status,
      operationalStatus: query.operationalStatus,
      categoryId: query.categoryId,
      subCategoryId: query.subCategoryId,
      search: query.search,
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      order: pagination.order || 'desc',
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getAssetById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asset = await assetsService.getAssetById(req.params.id);
    sendSuccess(res, asset);
  } catch (error) {
    next(error);
  }
}

export async function getAssetFull(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get asset with all detail tabs
    const [asset, lifecycle, hardware, software, security, network, peripherals, telemetry, auditLog] =
      await Promise.all([
        assetsService.getAssetById(req.params.id),
        assetsService.getAssetLifeCycle(req.params.id).catch(() => null),
        assetsService.getAssetHardware(req.params.id).catch(() => null),
        assetsService.getAssetSoftware(req.params.id).catch(() => null),
        assetsService.getAssetSecurity(req.params.id).catch(() => null),
        assetsService.getAssetNetwork(req.params.id).catch(() => null),
        assetsService.getAssetPeripherals(req.params.id).catch(() => null),
        assetsService.getAssetTelemetry(req.params.id).catch(() => null),
        assetsService.getAssetAuditLog(req.params.id).catch(() => []),
      ]);

    sendSuccess(res, {
      ...asset,
      lifecycle,
      hardware,
      software,
      security,
      network,
      peripherals,
      telemetry,
      auditLog,
    });
  } catch (error) {
    next(error);
  }
}

export async function createAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asset = await assetsService.createAsset(req.body, req.user?.id);
    sendSuccess(res, asset, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asset = await assetsService.updateAsset(req.params.id, req.body, req.user?.id);
    sendSuccess(res, asset);
  } catch (error) {
    next(error);
  }
}

export async function deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assetsService.deleteAsset(req.params.id, req.user?.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function bulkDeleteAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await assetsService.bulkDeleteAssets(req.body.ids, req.user?.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Asset Detail Tabs Controllers
// ============================================

export async function getAssetLifeCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { method } = typedQuery<LifecycleQueryInput>(req);
    const lifecycle = await assetsService.getAssetLifeCycle(req.params.id, method);
    sendSuccess(res, lifecycle);
  } catch (error) {
    next(error);
  }
}

export async function getAssetHardware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hardware = await assetsService.getAssetHardware(req.params.id);
    sendSuccess(res, hardware || {});
  } catch (error) {
    next(error);
  }
}

export async function getAssetHardwareExpanded(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extended hardware info - for now returns same as basic hardware
    const hardware = await assetsService.getAssetHardware(req.params.id);
    sendSuccess(res, {
      collectedAt: new Date().toISOString(),
      ...hardware,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAssetSoftware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const software = await assetsService.getAssetSoftware(req.params.id);
    sendSuccess(res, software || { applications: [], services: [] });
  } catch (error) {
    next(error);
  }
}

export async function getAssetSecurity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const security = await assetsService.getAssetSecurity(req.params.id);
    sendSuccess(res, security || {});
  } catch (error) {
    next(error);
  }
}

export async function getAssetNetwork(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const network = await assetsService.getAssetNetwork(req.params.id);
    sendSuccess(res, network || { adapters: [] });
  } catch (error) {
    next(error);
  }
}

export async function getAssetPeripherals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const peripherals = await assetsService.getAssetPeripherals(req.params.id);
    sendSuccess(res, peripherals || { monitors: [], usbDevices: [], printers: [] });
  } catch (error) {
    next(error);
  }
}

export async function getAssetTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const telemetry = await assetsService.getAssetTelemetry(req.params.id);
    sendSuccess(res, telemetry || { timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
}

export async function getAssetTelemetryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const period = (req.query.period as 'hour' | 'day' | 'week') || 'day';
    const history = await assetsService.getAssetTelemetryHistory(req.params.id, period);
    sendSuccess(res, history);
  } catch (error) {
    next(error);
  }
}

export async function getAssetErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = await assetsService.getAssetErrors(req.params.id);
    sendSuccess(res, errors);
  } catch (error) {
    next(error);
  }
}

export async function getAssetAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auditLog = await assetsService.getAssetAuditLog(req.params.id);
    sendSuccess(res, auditLog);
  } catch (error) {
    next(error);
  }
}

export async function getAssetPatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patches = await assetsService.getAssetPatches(req.params.id);
    sendSuccess(res, patches);
  } catch (error) {
    next(error);
  }
}

export async function getAssetAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await assetsService.getAssetAlerts(req.params.id);
    sendSuccess(res, alerts);
  } catch (error) {
    next(error);
  }
}

export async function getAssetVulnerabilities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vulnerabilities = await assetsService.getAssetVulnerabilities(req.params.id);
    sendSuccess(res, vulnerabilities);
  } catch (error) {
    next(error);
  }
}

export async function getAssetDeployments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deployments = await assetsService.getAssetDeployments(req.params.id);
    sendSuccess(res, deployments);
  } catch (error) {
    next(error);
  }
}

export async function uploadAssetAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 400, 'BAD_REQUEST', 'No file provided');
      return;
    }
    const result = await assetsService.uploadAttachment(req.params.id, file, req.user?.id);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Software Inventory Controllers
// ============================================

export async function listSoftwareInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inventory = await assetsService.listSoftwareInventory();
    sendSuccess(res, inventory);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareInventoryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Individual software item details
    const inventory = await assetsService.listSoftwareInventory();
    const item = inventory.find((i) => i.id === req.params.id);
    if (!item) {
      sendError(res, 404, 'NOT_FOUND', 'Software not found');
      return;
    }
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
}

export async function importSoftwareInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 400, 'BAD_REQUEST', 'No file provided');
      return;
    }
    const result = await assetsService.importSoftwareInventory(file.buffer);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Software Licenses Controllers
// ============================================

export async function listSoftwareLicenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const licenses = await assetsService.listSoftwareLicenses();
    sendSuccess(res, licenses);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareLicenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.getSoftwareLicenseById(req.params.id);
    sendSuccess(res, license);
  } catch (error) {
    next(error);
  }
}

export async function createSoftwareLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.createSoftwareLicense(req.body);
    sendSuccess(res, license, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSoftwareLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.updateSoftwareLicense(req.params.id, req.body);
    sendSuccess(res, license);
  } catch (error) {
    next(error);
  }
}

export async function deleteSoftwareLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assetsService.deleteSoftwareLicense(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function importSoftwareLicenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 400, 'BAD_REQUEST', 'No file provided');
      return;
    }
    const result = await assetsService.importSoftwareLicenses(file.buffer);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// OS Licenses Controllers
// ============================================

export async function listOSLicenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const licenses = await assetsService.listOSLicenses();
    sendSuccess(res, licenses);
  } catch (error) {
    next(error);
  }
}

export async function getOSLicenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.getOSLicenseById(req.params.id);
    sendSuccess(res, license);
  } catch (error) {
    next(error);
  }
}

export async function createOSLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.createOSLicense(req.body);
    sendSuccess(res, license, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateOSLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.updateOSLicense(req.params.id, req.body);
    sendSuccess(res, license);
  } catch (error) {
    next(error);
  }
}

export async function deleteOSLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assetsService.deleteOSLicense(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function importOSLicenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 400, 'BAD_REQUEST', 'No file provided');
      return;
    }
    const result = await assetsService.importOSLicenses(file.buffer);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Trigger inventory refresh for an asset's agent
 * POST /v1/assets/:id/refresh
 */
export async function refreshAssetInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get the asset to find its agent
    const asset = await assetsService.getAssetById(req.params.id);

    if (!asset.agentId) {
      sendError(res, 400, 'BAD_REQUEST', 'Asset has no linked agent');
      return;
    }

    // Queue an inventory refresh command for the agent
    const result = await agentsService.queueInventoryRefresh(asset.agentId);

    sendSuccess(res, {
      message: 'Inventory refresh queued',
      commandId: result.id,
      status: result.status,
    });
  } catch (error) {
    next(error);
  }
}
