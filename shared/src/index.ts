/**
 * PatchIQ Shared Types
 *
 * This package provides TypeScript types derived from the Prisma schema.
 * These types serve as the contract between frontend and backend.
 *
 * Usage:
 *   Frontend: import { Agent, Asset, Vulnerability } from '@patchiq/shared-types';
 *   Backend: Uses @prisma/client directly for database operations
 *
 * Source of Truth: backend/src/db/prisma/schema.prisma
 */

// Export all enums
export * from './enums';

// Export all models
export * from './models';

// Export all API types
export * from './api';
