/**
 * Deployment Controller
 * API endpoints for creating and managing software/patch deployments
 */

import { Request, Response, NextFunction } from 'express';
import { deploymentExecutorService } from './deployment-executor.service';
import { CreateSoftwareDeploymentOptions, CreatePatchDeploymentOptions } from './deployment-executor.types';

export class DeploymentController {
  /**
   * Create a new software deployment
   * POST /v1/deployments/software
   */
  async createSoftwareDeployment(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        description,
        deploymentType,
        type, // Frontend sends 'type', accept both
        targetAgentIds,
        package: packageInfo,
        retryCount,
      } = req.body;

      // Accept both 'deploymentType' and 'type' for compatibility
      const resolvedType = deploymentType || type || 'install';

      const options: CreateSoftwareDeploymentOptions = {
        name,
        description,
        deploymentType: resolvedType,
        targetAgentIds,
        package: packageInfo,
        retryCount,
        createdBy: req.user?.id,
      };

      const result = await deploymentExecutorService.createSoftwareDeployment(options);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new patch deployment
   * POST /v1/deployments/patch
   */
  async createPatchDeployment(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        description,
        targetAgentIds,
        patches,
        retryCount,
      } = req.body;

      const options: CreatePatchDeploymentOptions = {
        name,
        description,
        targetAgentIds,
        patches,
        retryCount,
        createdBy: req.user?.id,
      };

      const result = await deploymentExecutorService.createPatchDeployment(options);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get software deployment status
   * GET /v1/deployments/software/:deploymentId
   */
  async getSoftwareDeploymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { deploymentId } = req.params;

      const status = await deploymentExecutorService.getSoftwareDeploymentStatus(deploymentId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a software deployment
   * POST /v1/deployments/software/:deploymentId/cancel
   */
  async cancelSoftwareDeployment(req: Request, res: Response, next: NextFunction) {
    try {
      const { deploymentId } = req.params;

      await deploymentExecutorService.cancelSoftwareDeployment(deploymentId);

      res.json({
        success: true,
        message: 'Deployment cancelled',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all software deployments
   * GET /v1/deployments/software
   */
  async listSoftwareDeployments(req: Request, res: Response, next: NextFunction) {
    try {
      const { prisma } = await import('@/db/client');

      const deployments = await prisma.softwareDeployment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      });

      res.json({
        success: true,
        data: deployments.map(d => ({
          id: d.id,
          deploymentId: d.deploymentId,
          name: d.deploymentName,
          description: d.description,
          type: d.deploymentType,
          stage: d.stage,
          pending: d.pending,
          succeeded: d.succeeded,
          failed: d.failed,
          total: d._count.tasks,
          progress: d._count.tasks > 0
            ? Math.round(((d.succeeded + d.failed) / d._count.tasks) * 100)
            : 0,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger rollback for a deployment task
   * POST /v1/deployments/software/:deploymentId/tasks/:taskId/rollback
   */
  async triggerRollback(req: Request, res: Response, next: NextFunction) {
    try {
      const { deploymentId, taskId } = req.params;
      const { force } = req.body;

      const result = await deploymentExecutorService.triggerRollback(deploymentId, taskId, { force });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const deploymentController = new DeploymentController();
