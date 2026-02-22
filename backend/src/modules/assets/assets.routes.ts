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

/**
 * @openapi
 * /v1/categories:
 *   get:
 *     summary: List all categories
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/categories', checkPermission('assets', 'view'), controller.listCategories);

/**
 * @openapi
 * /v1/categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/categories/:id', checkPermission('assets', 'view'), validateParams(categoryIdParamSchema), controller.getCategoryById);

/**
 * @openapi
 * /v1/categories:
 *   post:
 *     summary: Create a new category
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/categories', checkPermission('assets', 'add'), validateBody(categoryCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.CATEGORY }), controller.createCategory);

/**
 * @openapi
 * /v1/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/categories/:id', checkPermission('assets', 'edit'), validateParams(categoryIdParamSchema), validateBody(categoryUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.CATEGORY, getResourceId: (req) => req.params.id }), controller.updateCategory);

/**
 * @openapi
 * /v1/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       204:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/categories/:id', checkPermission('assets', 'delete'), validateParams(categoryIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.CATEGORY, getResourceId: (req) => req.params.id }), controller.deleteCategory);

/**
 * @openapi
 * /v1/categories/{id}/assets:
 *   get:
 *     summary: List assets belonging to a category
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Paginated list of assets in the category
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       404:
 *         description: Category not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/categories/:id/assets', checkPermission('assets', 'view'), validateParams(categoryIdParamSchema), controller.getAssetsByCategory);

// ============================================
// SubCategories Routes
// ============================================

/**
 * @openapi
 * /v1/subcategories:
 *   get:
 *     summary: List all subcategories
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by parent category ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of subcategories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/subcategories', checkPermission('assets', 'view'), validateQuery(subCategoryListQuerySchema), controller.listSubCategories);

/**
 * @openapi
 * /v1/subcategories/{id}:
 *   get:
 *     summary: Get a subcategory by ID
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: SubCategory ID
 *     responses:
 *       200:
 *         description: SubCategory details
 *       404:
 *         description: SubCategory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/subcategories/:id', checkPermission('assets', 'view'), validateParams(subCategoryIdParamSchema), controller.getSubCategoryById);

/**
 * @openapi
 * /v1/subcategories:
 *   post:
 *     summary: Create a new subcategory
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: SubCategory created
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/subcategories', checkPermission('assets', 'add'), validateBody(subCategoryCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.SUBCATEGORY }), controller.createSubCategory);

/**
 * @openapi
 * /v1/subcategories/{id}:
 *   put:
 *     summary: Update a subcategory
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: SubCategory ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: SubCategory updated
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: SubCategory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/subcategories/:id', checkPermission('assets', 'edit'), validateParams(subCategoryIdParamSchema), validateBody(subCategoryUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.SUBCATEGORY, getResourceId: (req) => req.params.id }), controller.updateSubCategory);

/**
 * @openapi
 * /v1/subcategories/{id}:
 *   delete:
 *     summary: Delete a subcategory
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: SubCategory ID
 *     responses:
 *       204:
 *         description: SubCategory deleted
 *       404:
 *         description: SubCategory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/subcategories/:id', checkPermission('assets', 'delete'), validateParams(subCategoryIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.SUBCATEGORY, getResourceId: (req) => req.params.id }), controller.deleteSubCategory);

/**
 * @openapi
 * /v1/subcategories/{id}/assets:
 *   get:
 *     summary: List assets belonging to a subcategory
 *     tags:
 *       - Categories
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: SubCategory ID
 *     responses:
 *       200:
 *         description: Paginated list of assets in the subcategory
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       404:
 *         description: SubCategory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/subcategories/:id/assets', checkPermission('assets', 'view'), validateParams(subCategoryIdParamSchema), controller.getAssetsBySubCategory);

// ============================================
// Tags Routes
// ============================================

/**
 * @openapi
 * /v1/tags:
 *   get:
 *     summary: List all tags
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Paginated list of tags
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tags', checkPermission('assets', 'view'), validateQuery(tagQuerySchema), controller.listTags);

/**
 * @openapi
 * /v1/tags/popular:
 *   get:
 *     summary: Get popular tags
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of popular tags to return
 *     responses:
 *       200:
 *         description: List of popular tags
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tags/popular', checkPermission('assets', 'view'), validateQuery(popularTagsQuerySchema), controller.getPopularTags);

/**
 * @openapi
 * /v1/tags/search:
 *   get:
 *     summary: Search tags by name
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max results to return
 *     responses:
 *       200:
 *         description: Matching tags
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tags/search', checkPermission('assets', 'view'), validateQuery(tagSearchQuerySchema), controller.searchTags);

/**
 * @openapi
 * /v1/tags/{id}:
 *   get:
 *     summary: Get a tag by ID
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Tag details
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/tags/:id', checkPermission('assets', 'view'), validateParams(tagIdParamSchema), controller.getTagById);

/**
 * @openapi
 * /v1/tags:
 *   post:
 *     summary: Create a new tag
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tag created
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/tags', checkPermission('assets', 'add'), validateBody(tagCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.TAG }), controller.createTag);

/**
 * @openapi
 * /v1/tags/{id}:
 *   put:
 *     summary: Update a tag
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag updated
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/tags/:id', checkPermission('assets', 'edit'), validateParams(tagIdParamSchema), validateBody(tagUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.TAG, getResourceId: (req) => req.params.id }), controller.updateTag);

/**
 * @openapi
 * /v1/tags/{id}:
 *   delete:
 *     summary: Delete a tag
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     responses:
 *       204:
 *         description: Tag deleted
 *       404:
 *         description: Tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/tags/:id', checkPermission('assets', 'delete'), validateParams(tagIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.TAG, getResourceId: (req) => req.params.id }), controller.deleteTag);

// Bulk tag operations

/**
 * @openapi
 * /v1/assets/bulk-tags:
 *   post:
 *     summary: Bulk assign tags to assets
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetIds
 *               - tagIds
 *             properties:
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags assigned to assets
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/assets/bulk-tags', checkPermission('assets', 'edit'), validateBody(bulkAssignTagsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.TAG }), controller.bulkAssignTags);

/**
 * @openapi
 * /v1/tags/bulk-assign:
 *   post:
 *     summary: Bulk assign tags to assets
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetIds
 *               - tagIds
 *             properties:
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags assigned to assets
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/tags/bulk-assign', checkPermission('assets', 'edit'), validateBody(bulkAssignTagsSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.TAG }), controller.bulkAssignTags);

/**
 * @openapi
 * /v1/tags/bulk-remove:
 *   post:
 *     summary: Bulk remove tags from assets
 *     tags:
 *       - Tags
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetIds
 *               - tagIds
 *             properties:
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags removed from assets
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/tags/bulk-remove', checkPermission('assets', 'edit'), validateBody(bulkRemoveTagsSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.TAG }), controller.bulkRemoveTags);

// ============================================
// Assets Routes
// ============================================

/**
 * @openapi
 * /v1/endpoints/{id}:
 *   get:
 *     summary: Get endpoint details for an asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Endpoint details
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/endpoints/:id', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getEndpointDetails);

/**
 * @openapi
 * /v1/assets:
 *   get:
 *     summary: List all assets
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: subCategoryId
 *         schema:
 *           type: string
 *         description: Filter by subcategory ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by asset status
 *     responses:
 *       200:
 *         description: Paginated list of assets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets', checkPermission('assets', 'view'), validateQuery(assetQuerySchema), controller.listAssets);

/**
 * @openapi
 * /v1/assets:
 *   post:
 *     summary: Create a new asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               subCategoryId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asset created
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/assets', checkPermission('assets', 'add'), validateBody(assetCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.ASSET }), controller.createAsset);

/**
 * @openapi
 * /v1/assets/bulk:
 *   post:
 *     summary: Bulk delete assets
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Assets deleted
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/assets/bulk', checkPermission('assets', 'delete'), validateBody(bulkDeleteSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ASSET }), controller.bulkDeleteAssets);

// Asset by ID routes

/**
 * @openapi
 * /v1/assets/{id}:
 *   get:
 *     summary: Get an asset by ID
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset details
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetById);

/**
 * @openapi
 * /v1/assets/{id}/full:
 *   get:
 *     summary: Get full asset details including all related data
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Full asset details
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/full', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetFull);

/**
 * @openapi
 * /v1/assets/{id}:
 *   put:
 *     summary: Update an asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               subCategoryId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asset updated
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/assets/:id', checkPermission('assets', 'edit'), validateParams(assetIdParamSchema), validateBody(assetUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.ASSET, getResourceId: (req) => req.params.id }), controller.updateAsset);

/**
 * @openapi
 * /v1/assets/{id}:
 *   delete:
 *     summary: Delete an asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       204:
 *         description: Asset deleted
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/assets/:id', checkPermission('assets', 'delete'), validateParams(assetIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.ASSET, getResourceId: (req) => req.params.id }), controller.deleteAsset);

// Asset detail tabs

/**
 * @openapi
 * /v1/assets/{id}/lifecycle:
 *   get:
 *     summary: Get asset lifecycle information
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Time period for lifecycle data
 *     responses:
 *       200:
 *         description: Asset lifecycle data
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/lifecycle', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), validateQuery(lifecycleQuerySchema), controller.getAssetLifeCycle);

/**
 * @openapi
 * /v1/assets/{id}/hardware:
 *   get:
 *     summary: Get asset hardware information
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset hardware data
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/hardware', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetHardware);

/**
 * @openapi
 * /v1/assets/{id}/hardware/expanded:
 *   get:
 *     summary: Get expanded asset hardware information
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Expanded asset hardware data
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/hardware/expanded', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetHardwareExpanded);

/**
 * @openapi
 * /v1/assets/{id}/software:
 *   get:
 *     summary: Get asset software inventory
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset software data
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/software', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetSoftware);

/**
 * @openapi
 * /v1/assets/{id}/security:
 *   get:
 *     summary: Get asset security information
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset security data
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/security', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetSecurity);

/**
 * @openapi
 * /v1/assets/{id}/network:
 *   get:
 *     summary: Get asset network information
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset network data
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/network', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetNetwork);

/**
 * @openapi
 * /v1/assets/{id}/peripherals:
 *   get:
 *     summary: Get asset peripherals information
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset peripherals data
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/peripherals', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetPeripherals);

/**
 * @openapi
 * /v1/assets/{id}/telemetry:
 *   get:
 *     summary: Get asset telemetry data
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset telemetry data
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/telemetry', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetTelemetry);

/**
 * @openapi
 * /v1/assets/{id}/telemetry/history:
 *   get:
 *     summary: Get asset telemetry history
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date/time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date/time
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *         description: Aggregation interval
 *     responses:
 *       200:
 *         description: Asset telemetry history
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/telemetry/history', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), validateQuery(telemetryHistoryQuerySchema), controller.getAssetTelemetryHistory);

/**
 * @openapi
 * /v1/assets/{id}/errors:
 *   get:
 *     summary: Get asset error logs
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset error logs
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/errors', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetErrors);

/**
 * @openapi
 * /v1/assets/{id}/audit-log:
 *   get:
 *     summary: Get asset audit log
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset audit log entries
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/audit-log', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetAuditLog);

/**
 * @openapi
 * /v1/assets/{id}/alerts:
 *   get:
 *     summary: Get asset alerts
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset alerts
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/alerts', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetAlerts);

/**
 * @openapi
 * /v1/assets/{id}/patches:
 *   get:
 *     summary: Get asset patch history
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset patch history
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/patches', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetPatches);

/**
 * @openapi
 * /v1/assets/{id}/patch-recommendations:
 *   get:
 *     summary: Get patch recommendations for an asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset patch recommendations
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/patch-recommendations', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), async (req, res) => {
  const { listAssetRecommendations } = await import('@modules/patches/asset-patch-recommendation.controller');
  return listAssetRecommendations(req, res);
});

/**
 * @openapi
 * /v1/assets/{id}/vulnerabilities:
 *   get:
 *     summary: Get asset vulnerabilities
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset vulnerabilities
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/vulnerabilities', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetVulnerabilities);

/**
 * @openapi
 * /v1/assets/{id}/deployments:
 *   get:
 *     summary: Get asset deployments
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset deployments
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/assets/:id/deployments', checkPermission('assets', 'view'), validateParams(assetIdParamSchema), controller.getAssetDeployments);

/**
 * @openapi
 * /v1/assets/{id}/attachments:
 *   post:
 *     summary: Upload an attachment to an asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Attachment uploaded
 *       400:
 *         description: Invalid file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/assets/:id/attachments', checkPermission('assets', 'edit'), validateParams(assetIdParamSchema), upload.single('file'), audit({ action: AuditAction.UPLOAD, resource: AuditResource.ASSET, getResourceId: (req) => req.params.id }), controller.uploadAssetAttachment);

// Force inventory refresh

/**
 * @openapi
 * /v1/assets/{id}/refresh:
 *   post:
 *     summary: Force an inventory refresh for an asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Inventory refresh triggered
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/assets/:id/refresh', checkPermission('assets', 'edit'), validateParams(assetIdParamSchema), audit({ action: AuditAction.REFRESH, resource: AuditResource.ASSET, getResourceId: (req) => req.params.id }), controller.refreshAssetInventory);

// Asset tags management

/**
 * @openapi
 * /v1/assets/{id}/tags:
 *   post:
 *     summary: Add tags to an asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagIds
 *             properties:
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags added to asset
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Asset not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/assets/:id/tags', checkPermission('assets', 'edit'), validateParams(assetIdParamSchema), validateBody(addTagsToAssetSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.TAG, getResourceId: (req) => req.params.id }), controller.addTagsToAsset);

/**
 * @openapi
 * /v1/assets/{id}/tags/{tagId}:
 *   delete:
 *     summary: Remove a tag from an asset
 *     tags:
 *       - Assets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID to remove
 *     responses:
 *       204:
 *         description: Tag removed from asset
 *       404:
 *         description: Asset or tag not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/assets/:id/tags/:tagId', checkPermission('assets', 'delete'), validateParams(assetTagParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.TAG, getResourceId: (req) => req.params.tagId }), controller.removeTagFromAsset);

// ============================================
// Software Inventory Routes
// ============================================

/**
 * @openapi
 * /v1/software-inventory:
 *   get:
 *     summary: List all software inventory items
 *     tags:
 *       - Software Inventory
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of software inventory items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/software-inventory', checkPermission('assets', 'view'), controller.listSoftwareInventory);

/**
 * @openapi
 * /v1/software-inventory/{id}:
 *   get:
 *     summary: Get a software inventory item by ID
 *     tags:
 *       - Software Inventory
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Software inventory item ID
 *     responses:
 *       200:
 *         description: Software inventory item details
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/software-inventory/:id', checkPermission('assets', 'view'), controller.getSoftwareInventoryItem);

/**
 * @openapi
 * /v1/software-inventory/import:
 *   post:
 *     summary: Import software inventory from a file
 *     tags:
 *       - Software Inventory
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV or Excel file to import
 *     responses:
 *       200:
 *         description: Software inventory imported
 *       400:
 *         description: Invalid file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/software-inventory/import', checkPermission('assets', 'add'), upload.single('file'), audit({ action: AuditAction.IMPORT, resource: AuditResource.SOFTWARE_INVENTORY }), controller.importSoftwareInventory);

// ============================================
// Software Licenses Routes
// ============================================

/**
 * @openapi
 * /v1/software-licenses:
 *   get:
 *     summary: List all software licenses
 *     tags:
 *       - Software Licenses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of software licenses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/software-licenses', checkPermission('assets', 'view'), controller.listSoftwareLicenses);

/**
 * @openapi
 * /v1/software-licenses/{id}:
 *   get:
 *     summary: Get a software license by ID
 *     tags:
 *       - Software Licenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Software license ID
 *     responses:
 *       200:
 *         description: Software license details
 *       404:
 *         description: License not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/software-licenses/:id', checkPermission('assets', 'view'), validateParams(softwareLicenseIdParamSchema), controller.getSoftwareLicenseById);

/**
 * @openapi
 * /v1/software-licenses:
 *   post:
 *     summary: Create a new software license
 *     tags:
 *       - Software Licenses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               vendor:
 *                 type: string
 *               licenseKey:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               seats:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Software license created
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/software-licenses', checkPermission('assets', 'add'), validateBody(softwareLicenseCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.SOFTWARE_LICENSE }), controller.createSoftwareLicense);

/**
 * @openapi
 * /v1/software-licenses/{id}:
 *   put:
 *     summary: Update a software license
 *     tags:
 *       - Software Licenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Software license ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               vendor:
 *                 type: string
 *               licenseKey:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               seats:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Software license updated
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: License not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/software-licenses/:id', checkPermission('assets', 'edit'), validateParams(softwareLicenseIdParamSchema), validateBody(softwareLicenseUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.SOFTWARE_LICENSE, getResourceId: (req) => req.params.id }), controller.updateSoftwareLicense);

/**
 * @openapi
 * /v1/software-licenses/{id}:
 *   delete:
 *     summary: Delete a software license
 *     tags:
 *       - Software Licenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Software license ID
 *     responses:
 *       204:
 *         description: Software license deleted
 *       404:
 *         description: License not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/software-licenses/:id', checkPermission('assets', 'delete'), validateParams(softwareLicenseIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.SOFTWARE_LICENSE, getResourceId: (req) => req.params.id }), controller.deleteSoftwareLicense);

/**
 * @openapi
 * /v1/software-licenses/import:
 *   post:
 *     summary: Import software licenses from a file
 *     tags:
 *       - Software Licenses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV or Excel file to import
 *     responses:
 *       200:
 *         description: Software licenses imported
 *       400:
 *         description: Invalid file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/software-licenses/import', checkPermission('assets', 'add'), upload.single('file'), audit({ action: AuditAction.IMPORT, resource: AuditResource.SOFTWARE_LICENSE }), controller.importSoftwareLicenses);

// ============================================
// OS Licenses Routes
// ============================================

/**
 * @openapi
 * /v1/os-licenses:
 *   get:
 *     summary: List all OS licenses
 *     tags:
 *       - OS Licenses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of OS licenses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/os-licenses', checkPermission('assets', 'view'), controller.listOSLicenses);

/**
 * @openapi
 * /v1/os-licenses/{id}:
 *   get:
 *     summary: Get an OS license by ID
 *     tags:
 *       - OS Licenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: OS license ID
 *     responses:
 *       200:
 *         description: OS license details
 *       404:
 *         description: License not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/os-licenses/:id', checkPermission('assets', 'view'), validateParams(osLicenseIdParamSchema), controller.getOSLicenseById);

/**
 * @openapi
 * /v1/os-licenses:
 *   post:
 *     summary: Create a new OS license
 *     tags:
 *       - OS Licenses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               vendor:
 *                 type: string
 *               licenseKey:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               seats:
 *                 type: integer
 *     responses:
 *       201:
 *         description: OS license created
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/os-licenses', checkPermission('assets', 'add'), validateBody(osLicenseCreateSchema), audit({ action: AuditAction.CREATE, resource: AuditResource.OS_LICENSE }), controller.createOSLicense);

/**
 * @openapi
 * /v1/os-licenses/{id}:
 *   put:
 *     summary: Update an OS license
 *     tags:
 *       - OS Licenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: OS license ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               vendor:
 *                 type: string
 *               licenseKey:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               seats:
 *                 type: integer
 *     responses:
 *       200:
 *         description: OS license updated
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: License not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/os-licenses/:id', checkPermission('assets', 'edit'), validateParams(osLicenseIdParamSchema), validateBody(osLicenseUpdateSchema), audit({ action: AuditAction.UPDATE, resource: AuditResource.OS_LICENSE, getResourceId: (req) => req.params.id }), controller.updateOSLicense);

/**
 * @openapi
 * /v1/os-licenses/{id}:
 *   delete:
 *     summary: Delete an OS license
 *     tags:
 *       - OS Licenses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: OS license ID
 *     responses:
 *       204:
 *         description: OS license deleted
 *       404:
 *         description: License not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/os-licenses/:id', checkPermission('assets', 'delete'), validateParams(osLicenseIdParamSchema), audit({ action: AuditAction.DELETE, resource: AuditResource.OS_LICENSE, getResourceId: (req) => req.params.id }), controller.deleteOSLicense);

/**
 * @openapi
 * /v1/os-licenses/import:
 *   post:
 *     summary: Import OS licenses from a file
 *     tags:
 *       - OS Licenses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV or Excel file to import
 *     responses:
 *       200:
 *         description: OS licenses imported
 *       400:
 *         description: Invalid file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/os-licenses/import', checkPermission('assets', 'add'), upload.single('file'), audit({ action: AuditAction.IMPORT, resource: AuditResource.OS_LICENSE }), controller.importOSLicenses);

export default router;
