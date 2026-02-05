/**
 * Verify @patchiq/shared-types wiring works correctly.
 *
 * 1. Direct imports from the workspace package resolve.
 * 2. Re-exports through @shared/types resolve.
 * 3. Backend-internal types (common.ts, api.types.ts) still accessible.
 */

import type { Agent as DirectAgent, PatchSeverity as DirectPatchSeverity } from '@patchiq/shared-types';
import type {
  // Re-exported models
  Agent,
  Asset,
  Vulnerability,
  Patch,
  Job,
  PatchDeployment,
  SoftwareCatalog,
  ConfigCatalog,
  DeploymentPolicy,
  // Re-exported enums
  AgentStatus,
  DeploymentStage,
  PatchSeverity,
  VulnerabilitySeverity,
  JobStatus,
  // Backend-internal types (from common.ts)
  TokenPayload,
  PaginatedResponse,
  PaginationParams,
  // Backend-internal types (from api.types.ts)
  SuccessResponse,
  ErrorResponse,
  BulkOperationRequest,
  QueryParams,
} from '@shared/types';

describe('@patchiq/shared-types wiring', () => {
  describe('direct imports from @patchiq/shared-types', () => {
    it('resolves model interfaces', () => {
      // Type-level check: if this compiles, the import works.
      const stub: DirectAgent = {
        id: '1',
        machineId: 'm1',
        name: null,
        hostname: null,
        status: 'Connected',
        os: null,
        osVersion: null,
        architecture: null,
        agentVersion: null,
        ipAddress: null,
        macAddress: null,
        serialNumber: null,
        lastHeartbeat: null,
        registeredAt: '2024-01-01T00:00:00Z',
        capabilities: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        assetId: null,
      };
      expect(stub.id).toBe('1');
    });

    it('resolves enum types', () => {
      const severity: DirectPatchSeverity = 'CRITICAL';
      expect(severity).toBe('CRITICAL');
    });
  });

  describe('re-exports through @shared/types', () => {
    it('exposes model interfaces', () => {
      const agent: Agent = {
        id: '1',
        machineId: 'm1',
        name: null,
        hostname: null,
        status: 'Connected',
        os: null,
        osVersion: null,
        architecture: null,
        agentVersion: null,
        ipAddress: null,
        macAddress: null,
        serialNumber: null,
        lastHeartbeat: null,
        registeredAt: '2024-01-01T00:00:00Z',
        capabilities: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        assetId: null,
      };
      expect(agent.machineId).toBe('m1');

      const asset: Asset = {
        id: '2',
        name: 'Server-01',
        type: 'Server',
        status: 'In Use',
        serialNumber: null,
        assetTag: null,
        os: null,
        osVersion: null,
        ipAddress: null,
        macAddress: null,
        manufacturer: null,
        model: null,
        hostname: null,
        purchaseDate: null,
        warrantyExpiry: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        ownerId: null,
        ownerName: null,
        ownerEmail: null,
        ownerPhone: null,
        ownerDepartment: null,
        vendor: null,
        purchaseOrderNumber: null,
        amcCost: null,
        amcExpiryDate: null,
        amcVendor: null,
        endOfLife: null,
        endOfSupport: null,
        purchaseCost: null,
        currentValue: null,
        salvageValue: null,
        currency: null,
        depreciationType: null,
        depreciationRate: null,
        invoiceNumber: null,
        baseLocationId: null,
        installedLocationId: null,
        organizationId: null,
        locationId: null,
      };
      expect(asset.name).toBe('Server-01');
    });

    it('exposes enum types', () => {
      const status: AgentStatus = 'Connected';
      const stage: DeploymentStage = 'COMPLETED';
      const severity: PatchSeverity = 'CRITICAL';
      const vulnSev: VulnerabilitySeverity = 'HIGH';
      const jobStatus: JobStatus = 'running';

      expect(status).toBe('Connected');
      expect(stage).toBe('COMPLETED');
      expect(severity).toBe('CRITICAL');
      expect(vulnSev).toBe('HIGH');
      expect(jobStatus).toBe('running');
    });
  });

  describe('backend-internal types still accessible', () => {
    it('exposes TokenPayload from common.ts', () => {
      const payload: TokenPayload = {
        userId: 'u1',
        email: 'test@example.com',
        role: 'admin',
        type: 'access',
      };
      expect(payload.userId).toBe('u1');
    });

    it('exposes PaginatedResponse from common.ts (backend shape, no success field)', () => {
      const response: PaginatedResponse<string> = {
        data: ['a', 'b'],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      // Backend PaginatedResponse does NOT have a `success` field
      expect(response.data).toHaveLength(2);
      expect('success' in response).toBe(false);
    });

    it('exposes PaginationParams from common.ts', () => {
      const params: PaginationParams = { page: 1, limit: 25 };
      expect(params.page).toBe(1);
    });

    it('exposes SuccessResponse from api.types.ts', () => {
      const res: SuccessResponse<string> = { success: true, data: 'ok' };
      expect(res.success).toBe(true);
    });

    it('exposes ErrorResponse from api.types.ts (backend shape, flat error string)', () => {
      const res: ErrorResponse = {
        success: false,
        error: 'not_found',
        message: 'Resource not found',
      };
      expect(typeof res.error).toBe('string');
    });

    it('exposes BulkOperationRequest from api.types.ts', () => {
      const req: BulkOperationRequest = { ids: ['a', 'b'] };
      expect(req.ids).toHaveLength(2);
    });

    it('exposes QueryParams from api.types.ts', () => {
      const params: QueryParams = { page: 1, limit: 10, search: 'test' };
      expect(params.search).toBe('test');
    });
  });
});
