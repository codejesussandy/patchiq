/**
 * Hub Controller
 * API endpoints for the software package repository (Hub)
 */

import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError, typedQuery } from '@shared/utils';
import { hubService } from './hub.service';
import type { ListPackagesQuery, ListBundlesQuery } from './hub.validators';

export class HubController {
  /**
   * Create a new package
   * POST /v1/hub/packages
   */
  async createPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hubService.createPackage(req.body, req.user?.id);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload a file for a package
   * POST /v1/hub/packages/:packageId/upload
   */
  async uploadPackageFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;

      if (!req.file) {
        sendError(res, 400, 'BAD_REQUEST', 'No file provided');
        return;
      }

      const result = await hubService.uploadPackageFile(
        packageId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      sendSuccess(res, {
        objectKey: result.objectKey,
        checksum: result.checksum,
        size: result.size.toString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a package by ID
   * GET /v1/hub/packages/:packageId
   */
  async getPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;
      const result = await hubService.getPackage(packageId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a package
   * PUT /v1/hub/packages/:packageId
   */
  async updatePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;
      const result = await hubService.updatePackage(packageId, req.body);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a package
   * DELETE /v1/hub/packages/:packageId
   */
  async deletePackage(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;
      await hubService.deletePackage(packageId);
      sendSuccess(res, { message: 'Package deleted' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List packages grouped by name + platform
   * GET /v1/hub/packages/grouped
   */
  async listPackagesGrouped(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = typedQuery<ListPackagesQuery>(req);
      const result = await hubService.listPackagesGrouped(filters);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List packages
   * GET /v1/hub/packages
   */
  async listPackages(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = typedQuery<ListPackagesQuery>(req);
      const result = await hubService.listPackages(filters);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get package download URL
   * GET /v1/hub/packages/:packageId/download-url
   */
  async getPackageDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;
      const result = await hubService.getPackageDownloadUrl(packageId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a bundle
   * POST /v1/hub/bundles
   */
  async createBundle(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hubService.createBundle(req.body, req.user?.id);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a bundle
   * GET /v1/hub/bundles/:bundleId
   */
  async getBundle(req: Request, res: Response, next: NextFunction) {
    try {
      const { bundleId } = req.params;
      const result = await hubService.getBundle(bundleId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List bundles
   * GET /v1/hub/bundles
   */
  async listBundles(req: Request, res: Response, next: NextFunction) {
    try {
      const { platform } = typedQuery<ListBundlesQuery>(req);
      const result = await hubService.listBundles(platform);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a bundle
   * DELETE /v1/hub/bundles/:bundleId
   */
  async deleteBundle(req: Request, res: Response, next: NextFunction) {
    try {
      const { bundleId } = req.params;
      await hubService.deleteBundle(bundleId);
      sendSuccess(res, { message: 'Bundle deleted' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get hub statistics
   * GET /v1/hub/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hubService.getStats();
      sendSuccess(res, {
        ...result,
        totalSize: result.totalSize.toString(),
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Script Bundle Endpoints
  // ============================================

  /**
   * Upload a package bundle (.tar.gz with scripts and manifest)
   * POST /v1/hub/packages/upload-bundle
   */
  async uploadPackageBundle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        sendError(res, 400, 'BAD_REQUEST', 'No file provided. Upload a .tar.gz bundle.');
        return;
      }

      const result = await hubService.uploadPackageBundle(
        req.file.buffer,
        req.file.originalname,
        req.user?.id
      );

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a package with inline scripts (no bundle file)
   * POST /v1/hub/packages/with-scripts
   */
  async createPackageWithScripts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hubService.createPackageWithScripts(req.body, req.user?.id);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bundle download info (for agent deployment)
   * GET /v1/hub/packages/:packageId/bundle
   */
  async getBundleDownloadInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;
      const result = await hubService.getBundleDownloadInfo(packageId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Proxy download bundle directly (for agents that can't access MinIO)
   * GET /v1/hub/packages/:packageId/bundle/download
   */
  async downloadBundle(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId } = req.params;
      const stream = await hubService.getBundleStream(packageId);

      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${packageId}-bundle.tar.gz"`);

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get execution payload for agent
   * GET /v1/hub/packages/:packageId/execution-payload/:operationType
   */
  async getExecutionPayload(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId, operationType } = req.params as { packageId: string; operationType: 'install' | 'update' | 'rollback' | 'uninstall' };

      const result = await hubService.getExecutionPayload(packageId, operationType);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const hubController = new HubController();
