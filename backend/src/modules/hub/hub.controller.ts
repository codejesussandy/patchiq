/**
 * Hub Controller
 * API endpoints for the software package repository (Hub)
 */

import { Request, Response, NextFunction } from 'express';
import { hubService } from './hub.service';

export class HubController {
  /**
   * Create a new package
   * POST /v1/hub/packages
   */
  async createPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hubService.createPackage(req.body, req.user?.id);
      res.status(201).json({ success: true, data: result });
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
        res.status(400).json({ success: false, error: 'No file provided' });
        return;
      }

      const result = await hubService.uploadPackageFile(
        packageId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.json({
        success: true,
        data: {
          objectKey: result.objectKey,
          checksum: result.checksum,
          size: result.size.toString(),
        },
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
      res.json({ success: true, data: result });
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
      res.json({ success: true, data: result });
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
      res.json({ success: true, message: 'Package deleted' });
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
      const filters = {
        platform: req.query.platform as string | undefined,
        category: req.query.category as string | undefined,
        vendor: req.query.vendor as string | undefined,
        search: req.query.search as string | undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await hubService.listPackages(filters);
      res.json({ success: true, ...result });
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
      res.json({ success: true, data: result });
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
      res.status(201).json({ success: true, data: result });
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
      res.json({ success: true, data: result });
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
      const platform = req.query.platform as string | undefined;
      const result = await hubService.listBundles(platform);
      res.json({ success: true, data: result });
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
      res.json({ success: true, message: 'Bundle deleted' });
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
      res.json({
        success: true,
        data: {
          ...result,
          totalSize: result.totalSize.toString(),
        },
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
        res.status(400).json({ success: false, error: 'No file provided. Upload a .tar.gz bundle.' });
        return;
      }

      const result = await hubService.uploadPackageBundle(
        req.file.buffer,
        req.file.originalname,
        req.user?.id
      );

      res.status(201).json({
        success: true,
        data: result,
        message: `Package bundle uploaded successfully. Scripts found: ${result.scriptsFound.join(', ')}`,
      });
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
      res.status(201).json({ success: true, data: result });
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
      res.json({ success: true, data: result });
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
      const { packageId, operationType } = req.params;

      const validOps = ['install', 'update', 'rollback', 'uninstall'];
      if (!validOps.includes(operationType)) {
        res.status(400).json({
          success: false,
          error: `Invalid operation type. Must be one of: ${validOps.join(', ')}`,
        });
        return;
      }

      const result = await hubService.getExecutionPayload(
        packageId,
        operationType as 'install' | 'update' | 'rollback' | 'uninstall'
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const hubController = new HubController();
