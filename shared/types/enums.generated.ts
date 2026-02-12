/**
 * Auto-generated enum types from Prisma schema — DO NOT EDIT MANUALLY
 * Source: backend/src/db/prisma/schema.prisma
 *
 * Convention: ALL values use UPPERCASE_SNAKE_CASE.
 */

export type AgentCommandStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type PatchBundleDownloadStatus = 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';

export type PatchDeploymentType = 'INSTANT' | 'SCHEDULED';

export type PatchDeploymentConfigType = 'INSTALL' | 'ROLLBACK' | 'VERIFY';

export type PatchDeploymentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type AssetPatchRecommendationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SoftwareDeploymentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ConfigDeploymentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
