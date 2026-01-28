import { Request, Response, NextFunction } from 'express';
import * as assetsService from './assets.service';
import { AgentsService } from '@modules/agents/agents.service';
import { parsePaginationQuery } from '@shared/utils/pagination';

const agentsService = new AgentsService();

// ============================================
// Categories Controllers
// ============================================

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await assetsService.listCategories();
    res.json(categories);
  } catch (error) {
    next(error);
  }
}

export async function getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await assetsService.getCategoryById(req.params.id);
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await assetsService.createCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await assetsService.updateCategory(req.params.id, req.body);
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assetsService.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ============================================
// SubCategories Controllers
// ============================================

export async function listSubCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const subCategories = await assetsService.listSubCategories(categoryId);
    res.json(subCategories);
  } catch (error) {
    next(error);
  }
}

export async function getSubCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subCategory = await assetsService.getSubCategoryById(req.params.id);
    res.json(subCategory);
  } catch (error) {
    next(error);
  }
}

export async function createSubCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subCategory = await assetsService.createSubCategory(req.body);
    res.status(201).json(subCategory);
  } catch (error) {
    next(error);
  }
}

export async function updateSubCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const subCategory = await assetsService.updateSubCategory(req.params.id, req.body);
    res.json(subCategory);
  } catch (error) {
    next(error);
  }
}

export async function deleteSubCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assetsService.deleteSubCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ============================================
// Tags Controllers
// ============================================

export async function listTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await assetsService.listTags({
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTagById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tag = await assetsService.getTagById(req.params.id);
    res.json(tag);
  } catch (error) {
    next(error);
  }
}

export async function createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tag = await assetsService.createTag(req.body);
    res.status(201).json(tag);
  } catch (error) {
    next(error);
  }
}

export async function updateTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tag = await assetsService.updateTag(req.params.id, req.body);
    res.json(tag);
  } catch (error) {
    next(error);
  }
}

export async function deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assetsService.deleteTag(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getPopularTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const tags = await assetsService.getPopularTags(limit);
    res.json(tags);
  } catch (error) {
    next(error);
  }
}

export async function addTagsToAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tags = await assetsService.addTagsToAsset(req.params.id, req.body.tagIds, req.user?.id);
    res.json(tags);
  } catch (error) {
    next(error);
  }
}

export async function removeTagFromAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assetsService.removeTagFromAsset(req.params.id, req.params.tagId, req.user?.id);
    res.status(200).json({ message: 'Tag removed from asset' });
  } catch (error) {
    next(error);
  }
}

export async function bulkAssignTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await assetsService.bulkAssignTags(req.body.assetIds, req.body.tagIds);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Assets Controllers
// ============================================

export async function listAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filters = {
      status: req.query.status as any,
      operationalStatus: req.query.operationalStatus as any,
      categoryId: req.query.categoryId as string | undefined,
      subCategoryId: req.query.subCategoryId as string | undefined,
      search: req.query.search as string | undefined,
    };

    const result = await assetsService.listAssets({
      ...filters,
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      order: pagination.order || 'desc',
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAssetById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asset = await assetsService.getAssetById(req.params.id);
    res.json(asset);
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

    res.json({
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
    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
}

export async function updateAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asset = await assetsService.updateAsset(req.params.id, req.body, req.user?.id);
    res.json(asset);
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
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================
// Asset Detail Tabs Controllers
// ============================================

export async function getAssetLifeCycle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const method = req.query.method as string | undefined;
    const lifecycle = await assetsService.getAssetLifeCycle(req.params.id, method);
    res.json(lifecycle);
  } catch (error) {
    next(error);
  }
}

export async function getAssetHardware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hardware = await assetsService.getAssetHardware(req.params.id);
    res.json(hardware || {});
  } catch (error) {
    next(error);
  }
}

export async function getAssetHardwareExpanded(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extended hardware info - for now returns same as basic hardware
    const hardware = await assetsService.getAssetHardware(req.params.id);
    res.json({
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
    res.json(software || { applications: [], services: [] });
  } catch (error) {
    next(error);
  }
}

export async function getAssetSecurity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const security = await assetsService.getAssetSecurity(req.params.id);
    res.json(security || {});
  } catch (error) {
    next(error);
  }
}

export async function getAssetNetwork(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const network = await assetsService.getAssetNetwork(req.params.id);
    res.json(network || { adapters: [] });
  } catch (error) {
    next(error);
  }
}

export async function getAssetPeripherals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const peripherals = await assetsService.getAssetPeripherals(req.params.id);
    res.json(peripherals || { monitors: [], usbDevices: [], printers: [] });
  } catch (error) {
    next(error);
  }
}

export async function getAssetTelemetry(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const telemetry = await assetsService.getAssetTelemetry(req.params.id);
    res.json(telemetry || { timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
}

export async function getAssetTelemetryHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const period = (req.query.period as 'hour' | 'day' | 'week') || 'day';
    const history = await assetsService.getAssetTelemetryHistory(req.params.id, period);
    res.json(history);
  } catch (error) {
    next(error);
  }
}

export async function getAssetErrors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = await assetsService.getAssetErrors(req.params.id);
    res.json(errors);
  } catch (error) {
    next(error);
  }
}

export async function getAssetAuditLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auditLog = await assetsService.getAssetAuditLog(req.params.id);
    res.json(auditLog);
  } catch (error) {
    next(error);
  }
}

export async function getAssetPatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // This would be implemented with Patches module integration
    // For now return empty array
    res.json({ data: [], summary: { total: 0, installed: 0, missing: 0, failed: 0, pending: 0 } });
  } catch (error) {
    next(error);
  }
}

export async function getAssetVulnerabilities(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const vulnerabilities = await assetsService.getAssetVulnerabilities(req.params.id);
    res.json(vulnerabilities);
  } catch (error) {
    next(error);
  }
}

export async function getAssetDeployments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // This would be implemented with Patches module integration
    // For now return empty array
    res.json({ data: [] });
  } catch (error) {
    next(error);
  }
}

export async function uploadAssetAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // File upload handling would be implemented here
    res.status(201).json({ success: true });
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
    res.json(inventory);
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
      res.status(404).json({ error: 'Software not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function importSoftwareInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // File import handling would be implemented here
    res.status(201).json({ success: true, imported: 0 });
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
    res.json(licenses);
  } catch (error) {
    next(error);
  }
}

export async function getSoftwareLicenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.getSoftwareLicenseById(req.params.id);
    res.json(license);
  } catch (error) {
    next(error);
  }
}

export async function createSoftwareLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.createSoftwareLicense(req.body);
    res.status(201).json(license);
  } catch (error) {
    next(error);
  }
}

export async function updateSoftwareLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.updateSoftwareLicense(req.params.id, req.body);
    res.json(license);
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
    // File import handling would be implemented here
    res.status(201).json({ success: true, imported: 0 });
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
    res.json(licenses);
  } catch (error) {
    next(error);
  }
}

export async function getOSLicenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.getOSLicenseById(req.params.id);
    res.json(license);
  } catch (error) {
    next(error);
  }
}

export async function createOSLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.createOSLicense(req.body);
    res.status(201).json(license);
  } catch (error) {
    next(error);
  }
}

export async function updateOSLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const license = await assetsService.updateOSLicense(req.params.id, req.body);
    res.json(license);
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
    // File import handling would be implemented here
    res.status(201).json({ success: true, imported: 0 });
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
      res.status(400).json({ error: 'Asset has no linked agent' });
      return;
    }

    // Queue an inventory refresh command for the agent
    const result = await agentsService.queueInventoryRefresh(asset.agentId);

    res.json({
      message: 'Inventory refresh queued',
      commandId: result.id,
      status: result.status,
    });
  } catch (error) {
    next(error);
  }
}
