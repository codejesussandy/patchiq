import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '@middleware/auth';
import { audit, AuditAction, AuditResource } from '@middleware/audit';
import { checkPermission } from '@middleware/rbac';
import { validateBody, validateParams, validateQuery } from '@middleware/validation';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
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
  bulkRemoveTagsSchema,
  tagSearchQuerySchema,
  assetCreateSchema,
  assetUpdateSchema,
  assetIdParamSchema,
  assetQuerySchema,
  bulkDeleteSchema,
  subCategoryListQuerySchema,
  lifecycleQuerySchema,
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
router.get('/categories', checkPermission('assets', 'view'), controller.listCategories);
router.get('/categories/:id', checkPermission('assets', 'view'), validateParams(categoryIdParamSchema), controller.getCategoryById);
router.post('/categories', checkPermission('assets', 'add'), validateBody(categoryCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.CATEGORY }), controller.createCategory);
router.put('/categories/:id', checkPermission('assets', 'edit'), validateParams(categoryIdParamSchema), validateBody(categoryUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.CATEGORY, getResourceId: (req) => req.params.id }), controller.updateCategory);
router.delete('/categories/:id', checkPermission('assets', 'delete'), validateParams(categoryIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.CATEGORY, getResourceId: (req) => req.params.id }), controller.deleteCategory);
router.get('/categories/:id/assets', checkPermission('assets', 'view'), validateParams(categoryIdParamSchema), controller.getAssetsByCategory);

// ============================================
// SubCategories Routes
// ============================================
router.get('/subcategories', checkPermission('assets', 'view'), validateQuery(subCategoryListQuerySchema), controller.listSubCategories);
router.get('/subcategories/:id', checkPermission('assets', 'view'), validateParams(subCategoryIdParamSchema), controller.getSubCategoryById);
router.post('/subcategories', checkPermission('assets', 'add'), validateBody(subCategoryCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.SUBCATEGORY }), controller.createSubCategory);
router.put('/subcategories/:id', checkPermission('assets', 'edit'), validateParams(subCategoryIdParamSchema), validateBody(subCategoryUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.SUBCATEGORY, getResourceId: (req) => req.params.id }), controller.updateSubCategory);
router.delete('/subcategories/:id', checkPermission('assets', 'delete'), validateParams(subCategoryIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.SUBCATEGORY, getResourceId: (req) => req.params.id }), controller.deleteSubCategory);
router.get('/subcategories/:id/assets', checkPermission('assets', 'view'), validateParams(subCategoryIdParamSchema), controller.getAssetsBySubCategory);

// ============================================
// Tags Routes
// ============================================
router.get('/tags', checkPermission('assets', 'view'), validateQuery(tagQuerySchema), controller.listTags);
router.get('/tags/popular', checkPermission('assets', 'view'), validateQuery(popularTagsQuerySchema), controller.getPopularTags);
router.get('/tags/search', checkPermission('assets', 'view'), validateQuery(tagSearchQuerySchema), controller.searchTags);
router.get('/tags/:id', checkPermission('assets', 'view'), validateParams(tagIdParamSchema), controller.getTagById);
router.post('/tags', checkPermission('assets', 'add'), validateBody(tagCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.TAG }), controller.createTag);
router.put('/tags/:id', checkPermission('assets', 'edit'), validateParams(tagIdParamSchema), validateBody(tagUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.TAG, getResourceId: (req) => req.params.id }), controller.updateTag);
router.delete('/tags/:id', checkPermission('assets', 'delete'), validateParams(tagIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.TAG, getResourceId: (req) => req.params.id }), controller.deleteTag);

// Bulk tag operations
router.post('/assets/bulk-tags', checkPermission('assets', 'edit'), validateBody(bulkAssignTagsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.TAG }), controller.bulkAssignTags);
router.post('/tags/bulk-assign', checkPermission('assets', 'edit'), validateBody(bulkAssignTagsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.TAG }), controller.bulkAssignTags);
router.post('/tags/bulk-remove', checkPermission('assets', 'edit'), validateBody(bulkRemoveTagsSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.TAG }), controller.bulkRemoveTags);

// ============================================
// Assets Routes
// ============================================
router.get('/endpoints/:id', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getEndpointDetails);
router.get('/assets', checkPermission('assets', 'view'), validateQuery(assetQuerySchema), controller.listAssets);
router.post('/assets', checkPermission('assets', 'add'), validateBody(assetCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ASSET }), controller.createAsset);
router.post('/assets/bulk', checkPermission('assets', 'delete'), validateBody(bulkDeleteSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ASSET }), controller.bulkDeleteAssets);

// Asset by ID routes
router.get('/assets/:id', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetById);
router.get('/assets/:id/full', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetFull);
router.put('/assets/:id', checkPermission('assets', 'edit'), validateParams(assetIdParamSchema), validateBody(assetUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ASSET, getResourceId: (req) => req.params.id }), controller.updateAsset);
router.delete('/assets/:id', checkPermission('assets', 'delete'), validateParams(assetIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ASSET, getResourceId: (req) => req.params.id }), controller.deleteAsset);

// Asset detail tabs
router.get('/assets/:id/lifecycle', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), validateQuery(lifecycleQuerySchema), controller.getAssetLifeCycle);
router.get('/assets/:id/hardware', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetHardware);
router.get('/assets/:id/hardware/expanded', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetHardwareExpanded);
router.get('/assets/:id/software', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetSoftware);
router.get('/assets/:id/security', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetSecurity);
router.get('/assets/:id/network', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetNetwork);
router.get('/assets/:id/peripherals', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetPeripherals);
router.get('/assets/:id/telemetry', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetTelemetry);
router.get('/assets/:id/telemetry/history', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), validateQuery(telemetryHistoryQuerySchema), controller.getAssetTelemetryHistory);
router.get('/assets/:id/errors', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetErrors);
router.get('/assets/:id/audit-log', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetAuditLog);
router.get('/assets/:id/alerts', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetAlerts);
router.get('/assets/:id/patches', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetPatches);
router.get('/assets/:id/patch-recommendations', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), async (req, res) => {
  const { listAssetRecommendations } = await import('@modules/patches/asset-patch-recommendation.controller');
  return listAssetRecommendations(req, res);
});
router.get('/assets/:id/vulnerabilities', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetVulnerabilities);
router.get('/assets/:id/deployments', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetDeployments);
router.post('/assets/:id/attachments', checkPermission('assets', 'edit'), validateParams(assetIdParamSchema), upload.single('file'), audit({ action: AuditAction.UPLOAD, resource: AuditResource.ASSET, getResourceId: (req) => req.params.id }), controller.uploadAssetAttachment);

// Force inventory refresh
router.post('/assets/:id/refresh', checkPermission('assets', 'edit'), validateParams(assetIdParamSchema), audit({ action: AuditAction.REFRESH, resource: AuditResource.ASSET, getResourceId: (req) => req.params.id }), controller.refreshAssetInventory);

// Asset tags management
router.post('/assets/:id/tags', checkPermission('assets', 'edit'), validateParams(assetIdParamSchema), validateBody(addTagsToAssetSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.TAG, getResourceId: (req) => req.params.id }), controller.addTagsToAsset);
router.delete('/assets/:id/tags/:tagId', checkPermission('assets', 'delete'), validateParams(assetTagParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.TAG, getResourceId: (req) => req.params.tagId }), controller.removeTagFromAsset);

// ============================================
// Software Inventory Routes
// ============================================
router.get('/software-inventory', checkPermission('assets', 'view'), controller.listSoftwareInventory);
router.get('/software-inventory/:id', checkPermission('assets', 'view'), controller.getSoftwareInventoryItem);
router.post('/software-inventory/import', checkPermission('assets', 'add'), upload.single('file'), audit({ action: AuditAction.IMPORT, resource: AuditResource.SOFTWARE_INVENTORY }), controller.importSoftwareInventory);

// ============================================
// Software Licenses Routes
// ============================================
router.get('/software-licenses', checkPermission('assets', 'view'), controller.listSoftwareLicenses);
router.get('/software-licenses/:id', checkPermission('assets', 'view'), validateParams(softwareLicenseIdParamSchema), controller.getSoftwareLicenseById);
router.post('/software-licenses', checkPermission('assets', 'add'), validateBody(softwareLicenseCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.SOFTWARE_LICENSE }), controller.createSoftwareLicense);
router.put('/software-licenses/:id', checkPermission('assets', 'edit'), validateParams(softwareLicenseIdParamSchema), validateBody(softwareLicenseUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.SOFTWARE_LICENSE, getResourceId: (req) => req.params.id }), controller.updateSoftwareLicense);
router.delete('/software-licenses/:id', checkPermission('assets', 'delete'), validateParams(softwareLicenseIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.SOFTWARE_LICENSE, getResourceId: (req) => req.params.id }), controller.deleteSoftwareLicense);
router.post('/software-licenses/import', checkPermission('assets', 'add'), upload.single('file'), audit({ action: AuditAction.IMPORT, resource: AuditResource.SOFTWARE_LICENSE }), controller.importSoftwareLicenses);

// ============================================
// OS Licenses Routes
// ============================================
router.get('/os-licenses', checkPermission('assets', 'view'), controller.listOSLicenses);
router.get('/os-licenses/:id', checkPermission('assets', 'view'), validateParams(osLicenseIdParamSchema), controller.getOSLicenseById);
router.post('/os-licenses', checkPermission('assets', 'add'), validateBody(osLicenseCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.OS_LICENSE }), controller.createOSLicense);
router.put('/os-licenses/:id', checkPermission('assets', 'edit'), validateParams(osLicenseIdParamSchema), validateBody(osLicenseUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.OS_LICENSE, getResourceId: (req) => req.params.id }), controller.updateOSLicense);
router.delete('/os-licenses/:id', checkPermission('assets', 'delete'), validateParams(osLicenseIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.OS_LICENSE, getResourceId: (req) => req.params.id }), controller.deleteOSLicense);
router.post('/os-licenses/import', checkPermission('assets', 'add'), upload.single('file'), audit({ action: AuditAction.IMPORT, resource: AuditResource.OS_LICENSE }), controller.importOSLicenses);

export default router;
