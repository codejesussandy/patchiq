/**
 * Central type exports for PatchIQ backend
 *
 * This file re-exports all type definitions for easy importing across the codebase.
 *
 * Usage:
 * ```typescript
 * import {
 *   CpeResolution,
 *   VulnerabilityMatch,
 *   AssetPatchRecommendation
 * } from '@/types';
 * ```
 */

// Patch correlation types
export * from './patch-correlation';

// Re-export commonly used types for convenience
export type {
  // CPE Resolution
  AgentSoftware,
  CpeResolution,
  CpeMapping,
  UnmatchedSoftware,
  ICpeMappingService,

  // Vulnerability Detection
  Vulnerability,
  VulnerabilityReference,
  VulnerabilitySoftware,
  AssetVulnerability,
  VulnerabilityMatch,
  ICveDatabaseService,

  // Asset Software
  AssetSoftware,
  Asset,

  // Patch Management
  Patch,
  PatchBundle,
  AssetPatchRecommendation,
  IAssetPatchRecommendationService,

  // Deployment
  PatchDeployment,
  PatchDeploymentTask,
  Agent,
  AgentCommand,

  // Enums & Status Types
  VulnerabilitySeverity,
  AssetVulnerabilityStatus,
  RecommendationStatus,
  PatchApprovalStatus,
  PatchTestStatus,
  DeploymentTaskStatus,
  CpeResolutionSource,
  Platform,
  VersionBoundaryType,

  // Configuration
  VulnerabilityDBSyncConfig,
  ZeroTouchConfig,

  // API Types
  PaginatedResponse,
  ApiError,
  ApiSuccess,
} from './patch-correlation';
