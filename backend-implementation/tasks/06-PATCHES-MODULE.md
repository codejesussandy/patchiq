# Task 06: Patches Module

## Overview
Implement patch management including CRUD, test/approve workflow, deployments, and zero-touch configuration.

**Priority:** P0 - Core Feature
**Dependencies:** Tasks 01, 02, 03, 05
**Estimated Complexity:** High
**Parallel:** Yes (with Tasks 04, 05, 07)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| API Spec | `backend-debt/patches-api.yaml` | OpenAPI specification |
| Implementation Guide | `backend-debt/PATCHES-IMPLEMENTATION.md` | TDD scenarios |
| Gaps Analysis | `backend-debt/GAPS-ANALYSIS.md` | Test/approve workflow |

---

## Endpoints to Implement

```
# Core CRUD
GET    /v1/patches                   - List patches (filtered, paginated)
POST   /v1/patches                   - Create patch
GET    /v1/patches/:id               - Get patch details
PUT    /v1/patches/:id               - Update patch
DELETE /v1/patches/:id               - Delete patch

# Patch Details
GET    /v1/patches/:id/affected-products   - Affected products
GET    /v1/patches/:id/file-details        - File details
GET    /v1/patches/:id/endpoints           - Affected endpoints
GET    /v1/patches/:id/vulnerabilities     - Related CVEs

# Test & Approve Workflow
GET    /v1/patches/test-approve      - List patches pending test/approval
POST   /v1/patches/:id/test          - Mark patch as tested
POST   /v1/patches/:id/approve       - Approve patch for deployment
POST   /v1/patches/:id/reject        - Reject patch

# Deployments
GET    /v1/patches/deployed          - Deployment history
POST   /v1/patches/deployed          - Create deployment
GET    /v1/patches/deployed/:id      - Deployment details
GET    /v1/patches/deployed/:id/tasks - Deployment tasks per endpoint
DELETE /v1/patches/deployed/:id      - Cancel deployment

# Zero Touch
GET    /v1/patches/zero-touch        - Get zero-touch config
PUT    /v1/patches/zero-touch        - Update zero-touch config
POST   /v1/patches/zero-touch/deploy - Trigger zero-touch deployment

# Actions
POST   /v1/patches/scan              - Trigger patch scan on endpoints
```

---

## Key Data Models

### Patch

```typescript
interface Patch {
  id: string;
  patchId: string;              // KB5034441
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'High' | 'Medium' | 'Low' | 'UNSPECIFIED';
  releaseDate: string;
  vendor?: string;
  os?: string;
  osVersion?: string;
  architecture?: string;
  category?: string;            // Security, Feature, Cumulative
  downloadUrl?: string;
  fileSize?: number;
  rebootRequired: boolean;
  supersedes?: string;          // Patch ID this supersedes
  supersededBy?: string;        // Patch ID that supersedes this

  // Test/Approve workflow
  testStatus?: 'pending' | 'passed' | 'failed';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  testedBy?: string;
  testedAt?: string;
  testNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}
```

### Deployment

```typescript
interface Deployment {
  id: string;
  name: string;
  description?: string;
  type: 'SCHEDULE' | 'INSTANT';
  configType: 'INSTALL' | 'ROLLBACK';
  scope: 'Global' | 'Group' | 'Endpoint';
  endpoints: string[];
  patchIds: string[];
  deploymentPolicy?: string;
  retryCount: number;
  batchSize?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
}
```

### Zero Touch Config

```typescript
interface ZeroTouchConfig {
  enabled: boolean;
  scheduleTime: string;         // "14:00:00"
  targetGroups: string[];
  severityFilter: string[];     // ['Critical', 'High']
  autoReboot: boolean;
  rebootDelay: number;          // minutes
  excludedPatches: string[];
  maintenanceWindow?: {
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
  };
}
```

---

## Service Implementation

**src/modules/patches/patches.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError, BadRequestError } from '@shared/errors/httpErrors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';

export class PatchesService {
  async listPatches(params: {
    severity?: string;
    os?: string;
    category?: string;
    testStatus?: string;
    approvalStatus?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};

    if (params.severity) where.severity = params.severity;
    if (params.os) where.os = params.os;
    if (params.category) where.category = params.category;
    if (params.testStatus) where.testStatus = params.testStatus;
    if (params.approvalStatus) where.approvalStatus = params.approvalStatus;
    if (params.search) {
      where.OR = [
        { patchId: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [patches, total] = await Promise.all([
      prisma.patch.findMany({
        where,
        include: {
          vulnerabilities: { include: { vulnerability: true } },
        },
        ...getPaginationParams(params),
      }),
      prisma.patch.count({ where }),
    ]);

    return paginate(patches.map(this.transformPatch), total, params);
  }

  async getPatchById(id: string) {
    const patch = await prisma.patch.findUnique({
      where: { id },
      include: {
        affectedProducts: true,
        fileDetails: true,
        vulnerabilities: { include: { vulnerability: true } },
      },
    });

    if (!patch) {
      throw new NotFoundError('Patch not found');
    }

    return this.transformPatch(patch);
  }

  async testPatch(id: string, userId: string, input: { status: 'passed' | 'failed'; notes?: string }) {
    const patch = await prisma.patch.findUnique({ where: { id } });

    if (!patch) {
      throw new NotFoundError('Patch not found');
    }

    const updated = await prisma.patch.update({
      where: { id },
      data: {
        testStatus: input.status,
        testedBy: userId,
        testedAt: new Date(),
        testNotes: input.notes,
        // If failed, also set approval to rejected
        approvalStatus: input.status === 'failed' ? 'rejected' : patch.approvalStatus,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TEST_PATCH',
        module: 'patches',
        entityId: id,
        entityType: 'Patch',
        newValue: { testStatus: input.status, notes: input.notes },
      },
    });

    return this.transformPatch(updated);
  }

  async approvePatch(id: string, userId: string) {
    const patch = await prisma.patch.findUnique({ where: { id } });

    if (!patch) {
      throw new NotFoundError('Patch not found');
    }

    if (patch.testStatus !== 'passed') {
      throw new BadRequestError('Patch must be tested before approval');
    }

    const updated = await prisma.patch.update({
      where: { id },
      data: {
        approvalStatus: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPROVE_PATCH',
        module: 'patches',
        entityId: id,
        entityType: 'Patch',
      },
    });

    return this.transformPatch(updated);
  }

  async rejectPatch(id: string, userId: string, reason: string) {
    const patch = await prisma.patch.findUnique({ where: { id } });

    if (!patch) {
      throw new NotFoundError('Patch not found');
    }

    const updated = await prisma.patch.update({
      where: { id },
      data: {
        approvalStatus: 'rejected',
        rejectionReason: reason,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REJECT_PATCH',
        module: 'patches',
        entityId: id,
        entityType: 'Patch',
        newValue: { reason },
      },
    });

    return this.transformPatch(updated);
  }

  async createDeployment(data: any, userId: string) {
    const deployment = await prisma.deployment.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        configType: data.configType,
        scope: data.scope,
        endpoints: data.endpoints || [],
        deploymentPolicy: data.deploymentPolicy,
        retryCount: data.retryCount || 3,
        batchSize: data.batchSize,
        status: data.type === 'SCHEDULE' ? 'PENDING' : 'IN_PROGRESS',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdBy: userId,
        patches: {
          create: data.patchIds.map((patchId: string) => ({ patchId })),
        },
      },
      include: {
        patches: { include: { patch: true } },
      },
    });

    // Create tasks for each endpoint
    if (data.type === 'INSTANT') {
      const endpoints = data.endpoints || [];
      await prisma.deploymentTask.createMany({
        data: endpoints.map((endpoint: string) => ({
          deploymentId: deployment.id,
          endpointId: endpoint,
          endpointName: endpoint, // Would normally resolve to actual name
          status: 'PENDING',
        })),
      });

      // TODO: Queue actual deployment job
    }

    return deployment;
  }

  async getZeroTouchConfig() {
    const config = await prisma.zeroTouchConfig.findFirst();

    if (!config) {
      // Return default config
      return {
        enabled: false,
        scheduleTime: '14:00:00',
        targetGroups: [],
        severityFilter: ['Critical', 'High'],
        autoReboot: false,
        rebootDelay: 30,
        excludedPatches: [],
      };
    }

    return config;
  }

  async updateZeroTouchConfig(data: any) {
    const existing = await prisma.zeroTouchConfig.findFirst();

    if (existing) {
      return prisma.zeroTouchConfig.update({
        where: { id: existing.id },
        data: {
          enabled: data.enabled,
          scheduleTime: data.scheduleTime,
          targetGroups: data.targetGroups,
          severityFilter: data.severityFilter,
          autoReboot: data.autoReboot,
          rebootDelay: data.rebootDelay,
          excludedPatches: data.excludedPatches,
        },
      });
    }

    return prisma.zeroTouchConfig.create({ data });
  }

  private transformPatch(patch: any) {
    return {
      id: patch.id,
      patchId: patch.patchId,
      title: patch.title,
      description: patch.description,
      severity: patch.severity,
      releaseDate: patch.releaseDate?.toISOString(),
      vendor: patch.vendor,
      os: patch.os,
      osVersion: patch.osVersion,
      architecture: patch.architecture,
      category: patch.category,
      downloadUrl: patch.downloadUrl,
      fileSize: patch.fileSize ? Number(patch.fileSize) : null,
      rebootRequired: patch.rebootRequired,
      supersedes: patch.supersedes,
      supersededBy: patch.supersededBy,
      testStatus: patch.testStatus,
      approvalStatus: patch.approvalStatus,
      testedBy: patch.testedBy,
      testedAt: patch.testedAt?.toISOString(),
      testNotes: patch.testNotes,
      approvedBy: patch.approvedBy,
      approvedAt: patch.approvedAt?.toISOString(),
      rejectionReason: patch.rejectionReason,
      vulnerabilityCount: patch.vulnerabilities?.length || 0,
      createdAt: patch.createdAt.toISOString(),
      updatedAt: patch.updatedAt.toISOString(),
    };
  }
}
```

---

## TDD Test Scenarios

```typescript
describe('Patches API', () => {
  describe('Test & Approve Workflow', () => {
    it('should mark patch as tested', async () => {
      const response = await request(app)
        .post(`/v1/patches/${testPatchId}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'passed',
          notes: 'Tested on 5 machines, no issues',
        });

      expect(response.status).toBe(200);
      expect(response.body.testStatus).toBe('passed');
      expect(response.body.testedBy).toBeDefined();
    });

    it('should approve tested patch', async () => {
      const response = await request(app)
        .post(`/v1/patches/${testedPatchId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.approvalStatus).toBe('approved');
    });

    it('should reject untested patch for approval', async () => {
      const response = await request(app)
        .post(`/v1/patches/${untestedPatchId}/approve`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('tested before approval');
    });

    it('should reject patch with reason', async () => {
      const response = await request(app)
        .post(`/v1/patches/${testPatchId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Causes system instability',
        });

      expect(response.status).toBe(200);
      expect(response.body.approvalStatus).toBe('rejected');
    });
  });

  describe('Deployments', () => {
    it('should create instant deployment', async () => {
      const response = await request(app)
        .post('/v1/patches/deployed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Critical Patch Deployment',
          type: 'INSTANT',
          configType: 'INSTALL',
          scope: 'Endpoint',
          endpoints: ['endpoint-1', 'endpoint-2'],
          patchIds: [testPatchId],
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('IN_PROGRESS');
    });
  });
});
```

---

## Verification Checklist

- [ ] GET /v1/patches returns paginated, filtered list
- [ ] GET /v1/patches/:id returns full patch details
- [ ] POST /v1/patches/:id/test marks patch as tested
- [ ] POST /v1/patches/:id/approve requires test first
- [ ] POST /v1/patches/:id/reject captures reason
- [ ] Deployments create tasks for each endpoint
- [ ] Zero-touch config CRUD works
- [ ] Audit logs created for all actions
- [ ] Severity filtering works correctly
