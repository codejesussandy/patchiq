/**
 * Deployment Executor Service — Thin orchestrator delegating to sub-services.
 * Preserves the original public API so consumers need zero changes.
 */

import { deploymentExecutorSoftwareService } from './deployment-executor-software.service';
import { deploymentExecutorPatchService } from './deployment-executor-patch.service';
import { deploymentExecutorStatusService } from './deployment-executor-status.service';
import type {
  CreateSoftwareDeploymentOptions,
  CreatePatchDeploymentOptions,
  CreateConfigDeploymentOptions,
  DeploymentCreationResult,
  TaskStatusUpdate,
} from './deployment-executor.types';

class DeploymentExecutorService {
  // --- Software Deployments ---
  createSoftwareDeployment(options: CreateSoftwareDeploymentOptions): Promise<DeploymentCreationResult> {
    return deploymentExecutorSoftwareService.createSoftwareDeployment(options);
  }

  getSoftwareDeploymentStatus(deploymentId: string) {
    return deploymentExecutorSoftwareService.getSoftwareDeploymentStatus(deploymentId);
  }

  cancelSoftwareDeployment(deploymentId: string): Promise<void> {
    return deploymentExecutorSoftwareService.cancelSoftwareDeployment(deploymentId);
  }

  triggerRollback(deploymentId: string, taskId: string, options?: { force?: boolean }): Promise<{ commandId: string; status: string }> {
    return deploymentExecutorSoftwareService.triggerRollback(deploymentId, taskId, options);
  }

  // --- Config Deployments ---
  createConfigDeployment(options: CreateConfigDeploymentOptions): Promise<DeploymentCreationResult> {
    return deploymentExecutorSoftwareService.createConfigDeployment(options);
  }

  getConfigDeploymentStatus(deploymentId: string) {
    return deploymentExecutorSoftwareService.getConfigDeploymentStatus(deploymentId);
  }

  // --- Patch Deployments ---
  createPatchDeployment(options: CreatePatchDeploymentOptions): Promise<DeploymentCreationResult> {
    return deploymentExecutorPatchService.createPatchDeployment(options);
  }

  getPatchDeploymentStatus(deploymentId: string) {
    return deploymentExecutorPatchService.getPatchDeploymentStatus(deploymentId);
  }

  listPatchDeployments() {
    return deploymentExecutorPatchService.listPatchDeployments();
  }

  cancelPatchDeployment(deploymentId: string): Promise<void> {
    return deploymentExecutorPatchService.cancelPatchDeployment(deploymentId);
  }

  retryPatchDeployment(deploymentId: string): Promise<DeploymentCreationResult> {
    return deploymentExecutorPatchService.retryPatchDeployment(deploymentId);
  }

  // --- Status Processing ---
  processCommandResult(update: TaskStatusUpdate): Promise<void> {
    return deploymentExecutorStatusService.processCommandResult(update);
  }

  checkPatchDeploymentCompletion(deploymentId: string): Promise<void> {
    return deploymentExecutorStatusService.checkPatchDeploymentCompletion(deploymentId);
  }

  processTaskFailure(taskId: string): Promise<{ action: 'retry' | 'rollback' | 'final_failure' }> {
    return deploymentExecutorStatusService.processTaskFailure(taskId);
  }
}

export const deploymentExecutorService = new DeploymentExecutorService();
