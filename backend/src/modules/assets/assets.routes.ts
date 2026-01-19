import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { validateBody, validateParams, validateQuery } from '@middleware/validation';
import * as controller from './assets.controller';
import {
  categoryCreateSchema,
  categoryUpdateSchema,
  categoryIdParamSchema,
  subCategoryCreateSchema,
  subCategoryUpdateSchema,
  subCategoryIdParamSchema,
  tagCreateSchema,
  tagUpdateSchema,
  tagIdParamSchema,
  tagQuerySchema,
  popularTagsQuerySchema,
  addTagsToAssetSchema,
  assetTagParamSchema,
  bulkAssignTagsSchema,
  assetCreateSchema,
  assetUpdateSchema,
  assetIdParamSchema,
  assetQuerySchema,
  bulkDeleteSchema,
  softwareLicenseCreateSchema,
  softwareLicenseUpdateSchema,
  softwareLicenseIdParamSchema,
  osLicenseCreateSchema,
  osLicenseUpdateSchema,
  osLicenseIdParamSchema,
  telemetryHistoryQuerySchema,
} from './assets.validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// Categories Routes
// ============================================
router.get('/categories', controller.listCategories);
router.get('/categories/:id', validateParams(categoryIdParamSchema), controller.getCategoryById);
router.post('/categories', validateBody(categoryCreateSchema), controller.createCategory);
router.put('/categories/:id', validateParams(categoryIdParamSchema), validateBody(categoryUpdateSchema), controller.updateCategory);
router.delete('/categories/:id', validateParams(categoryIdParamSchema), controller.deleteCategory);

// ============================================
// SubCategories Routes
// ============================================
router.get('/subcategories', controller.listSubCategories);
router.get('/subcategories/:id', validateParams(subCategoryIdParamSchema), controller.getSubCategoryById);
router.post('/subcategories', validateBody(subCategoryCreateSchema), controller.createSubCategory);
router.put('/subcategories/:id', validateParams(subCategoryIdParamSchema), validateBody(subCategoryUpdateSchema), controller.updateSubCategory);
router.delete('/subcategories/:id', validateParams(subCategoryIdParamSchema), controller.deleteSubCategory);

// ============================================
// Tags Routes
// ============================================
router.get('/tags', validateQuery(tagQuerySchema), controller.listTags);
router.get('/tags/popular', validateQuery(popularTagsQuerySchema), controller.getPopularTags);
router.get('/tags/:id', validateParams(tagIdParamSchema), controller.getTagById);
router.post('/tags', validateBody(tagCreateSchema), controller.createTag);
router.put('/tags/:id', validateParams(tagIdParamSchema), validateBody(tagUpdateSchema), controller.updateTag);
router.delete('/tags/:id', validateParams(tagIdParamSchema), controller.deleteTag);

// Bulk tag operations
router.post('/assets/bulk-tags', validateBody(bulkAssignTagsSchema), controller.bulkAssignTags);

// ============================================
// Assets Routes
// ============================================
router.get('/assets', validateQuery(assetQuerySchema), controller.listAssets);
router.post('/assets', validateBody(assetCreateSchema), controller.createAsset);
router.post('/assets/bulk', validateBody(bulkDeleteSchema), controller.bulkDeleteAssets);

// Asset by ID routes
router.get('/assets/:id', validateParams(assetIdParamSchema), controller.getAssetById);
router.get('/assets/:id/full', validateParams(assetIdParamSchema), controller.getAssetFull);
router.put('/assets/:id', validateParams(assetIdParamSchema), validateBody(assetUpdateSchema), controller.updateAsset);
router.delete('/assets/:id', validateParams(assetIdParamSchema), controller.deleteAsset);

// Asset detail tabs
router.get('/assets/:id/lifecycle', validateParams(assetIdParamSchema), controller.getAssetLifeCycle);
router.get('/assets/:id/hardware', validateParams(assetIdParamSchema), controller.getAssetHardware);
router.get('/assets/:id/hardware/expanded', validateParams(assetIdParamSchema), controller.getAssetHardwareExpanded);
router.get('/assets/:id/software', validateParams(assetIdParamSchema), controller.getAssetSoftware);
router.get('/assets/:id/security', validateParams(assetIdParamSchema), controller.getAssetSecurity);
router.get('/assets/:id/network', validateParams(assetIdParamSchema), controller.getAssetNetwork);
router.get('/assets/:id/peripherals', validateParams(assetIdParamSchema), controller.getAssetPeripherals);
router.get('/assets/:id/telemetry', validateParams(assetIdParamSchema), controller.getAssetTelemetry);
router.get('/assets/:id/telemetry/history', validateParams(assetIdParamSchema), validateQuery(telemetryHistoryQuerySchema), controller.getAssetTelemetryHistory);
router.get('/assets/:id/errors', validateParams(assetIdParamSchema), controller.getAssetErrors);
router.get('/assets/:id/audit-log', validateParams(assetIdParamSchema), controller.getAssetAuditLog);
router.get('/assets/:id/patches', validateParams(assetIdParamSchema), controller.getAssetPatches);
router.get('/assets/:id/deployments', validateParams(assetIdParamSchema), controller.getAssetDeployments);
router.post('/assets/:id/attachments', validateParams(assetIdParamSchema), controller.uploadAssetAttachment);

// Asset tags management
router.post('/assets/:id/tags', validateParams(assetIdParamSchema), validateBody(addTagsToAssetSchema), controller.addTagsToAsset);
router.delete('/assets/:id/tags/:tagId', validateParams(assetTagParamSchema), controller.removeTagFromAsset);

// ============================================
// Software Inventory Routes
// ============================================
router.get('/software-inventory', controller.listSoftwareInventory);
router.get('/software-inventory/:id', controller.getSoftwareInventoryItem);
router.post('/software-inventory/import', controller.importSoftwareInventory);

// ============================================
// Software Licenses Routes
// ============================================
router.get('/software-licenses', controller.listSoftwareLicenses);
router.get('/software-licenses/:id', validateParams(softwareLicenseIdParamSchema), controller.getSoftwareLicenseById);
router.post('/software-licenses', validateBody(softwareLicenseCreateSchema), controller.createSoftwareLicense);
router.put('/software-licenses/:id', validateParams(softwareLicenseIdParamSchema), validateBody(softwareLicenseUpdateSchema), controller.updateSoftwareLicense);
router.delete('/software-licenses/:id', validateParams(softwareLicenseIdParamSchema), controller.deleteSoftwareLicense);
router.post('/software-licenses/import', controller.importSoftwareLicenses);

// ============================================
// OS Licenses Routes
// ============================================
router.get('/os-licenses', controller.listOSLicenses);
router.get('/os-licenses/:id', validateParams(osLicenseIdParamSchema), controller.getOSLicenseById);
router.post('/os-licenses', validateBody(osLicenseCreateSchema), controller.createOSLicense);
router.put('/os-licenses/:id', validateParams(osLicenseIdParamSchema), validateBody(osLicenseUpdateSchema), controller.updateOSLicense);
router.delete('/os-licenses/:id', validateParams(osLicenseIdParamSchema), controller.deleteOSLicense);
router.post('/os-licenses/import', controller.importOSLicenses);

export default router;
