# Task 08: Jobs Module

## Overview
Implement job management for patches, software, configurations, and vulnerability scans with deployment tracking.

**Priority:** P1 - Important Feature
**Dependencies:** Tasks 03-07
**Estimated Complexity:** High
**Parallel:** Yes (with Tasks 09, 10)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Implementation Guide | `backend-debt/JOBS-IMPLEMENTATION.md` | Full specification |
| Gaps Analysis | `backend-debt/GAPS-ANALYSIS.md` | Additional job types |

---

## Endpoints to Implement

```
# Patch Jobs
GET    /v1/jobs/patch                - List patch jobs
POST   /v1/jobs/patch                - Create patch job
GET    /v1/jobs/patch/:id            - Get patch job details
DELETE /v1/jobs/patch/:id            - Delete patch job

# Vulnerability Jobs
GET    /v1/jobs/vulnerability        - List vulnerability scan jobs
POST   /v1/jobs/vulnerability        - Create vulnerability scan job
GET    /v1/jobs/vulnerability/:id    - Get scan job details
DELETE /v1/jobs/vulnerability/:id    - Delete scan job
GET    /v1/jobs/vulnerability/db-sync - Get CVE database sync config
PUT    /v1/jobs/vulnerability/db-sync - Update sync config
POST   /v1/jobs/vulnerability/db-sync/now - Trigger immediate sync

# Software Jobs
GET    /v1/jobs/software/catalog     - List software catalog
POST   /v1/jobs/software/catalog     - Add software to catalog
GET    /v1/jobs/software/catalog/:id - Get software details
PUT    /v1/jobs/software/catalog/:id - Update software
DELETE /v1/jobs/software/catalog/:id - Delete software
GET    /v1/jobs/software/bundles     - List software bundles
POST   /v1/jobs/software/bundles     - Create bundle
GET    /v1/jobs/software/bundles/:id - Get bundle details
PUT    /v1/jobs/software/bundles/:id - Update bundle
DELETE /v1/jobs/software/bundles/:id - Delete bundle
GET    /v1/jobs/software/deployed    - List software deployments
POST   /v1/jobs/software/deployed    - Create deployment
GET    /v1/jobs/software/deployed/:id - Get deployment status
GET    /v1/jobs/software/deployed/:id/tasks - Get deployment tasks
DELETE /v1/jobs/software/deployed/:id - Cancel deployment

# Configuration Jobs (similar structure to software)
GET    /v1/jobs/config/catalog       - List config catalog
POST   /v1/jobs/config/catalog       - Add configuration
GET    /v1/jobs/config/bundles       - List config bundles
POST   /v1/jobs/config/bundles       - Create bundle
GET    /v1/jobs/config/deployed      - List config deployments
POST   /v1/jobs/config/deployed      - Create deployment
GET    /v1/jobs/config/deployed/:id/tasks - Get deployment tasks

# Deployment Policies
GET    /v1/jobs/policies             - List deployment policies
POST   /v1/jobs/policies             - Create policy
PUT    /v1/jobs/policies/:id         - Update policy
DELETE /v1/jobs/policies/:id         - Delete policy
```

---

## Key Data Models

### Software Catalog Item

```typescript
interface SoftwareCatalogItem {
  id: string;
  deploymentId: string;           // SWP-017
  applicationName: string;
  description: string;
  tags: string[];
  os: 'Windows' | 'Mac' | 'Linux';
  version: string;
  applicationLocationType: 'Local Directory' | 'Network Share' | 'URL';
  installationCommand?: string;
  uninstallationCommand?: string;
  upgradeCommand?: string;
  iconUrl?: string;
  selfService: boolean;
  architecture: 'x64' | 'x86' | 'ARM64';
  applicationType: 'MSI' | 'EXE' | 'APPLICATION' | 'ZIP';
  applicationFileUrl?: string;
  createdBy: string;
  createdOn: string;
}
```

### Software Deployment

```typescript
interface SoftwareDeployment {
  id: string;
  deploymentId: string;           // ADR-007
  deploymentName: string;
  description: string;
  deploymentType: 'install' | 'uninstall' | 'upgrade';
  selectionType: 'application' | 'bundle';
  selectedItems: string[];
  scope: 'all' | 'windows' | 'mac' | 'linux';
  endpoints: string[];
  deploymentPolicy: string;
  retryCount: number;
  notifyTo: 'admin' | 'user';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'INSTALLED' | 'FAILED';
  pending: number;
  succeeded: number;
  failed: number;
  createdBy: string;
  createdOn: string;
}
```

### Vulnerability DB Sync

```typescript
interface VulnerabilityDBSync {
  scanJobInterval: number;        // hours
  scanJobUnit: 'Hour' | 'Day' | 'Week';
  databaseSyncTime: string;       // "02:00:00"
  lastSync?: string;
  totalCVE: number;
}
```

---

## Service Implementation

**src/modules/jobs/jobs.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError } from '@shared/errors/httpErrors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';

export class JobsService {
  // ==================== Patch Jobs ====================

  async listPatchJobs(params: { status?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.status) where.status = params.status;

    const [jobs, total] = await Promise.all([
      prisma.patchJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.patchJob.count({ where }),
    ]);

    return paginate(jobs, total, params);
  }

  async createPatchJob(data: any, userId: string) {
    const job = await prisma.patchJob.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        configType: data.configType,
        scope: data.scope,
        endpoints: data.endpoints || [],
        patches: data.patches || [],
        deploymentPolicy: data.deploymentPolicy,
        retryCount: data.retryCount || 3,
        batchSize: data.batchSize,
        status: data.type === 'SCHEDULE' ? 'SCHEDULED' : 'RUNNING',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdBy: userId,
      },
    });

    // TODO: Queue job for execution
    return job;
  }

  // ==================== Vulnerability Jobs ====================

  async listVulnerabilityJobs(params: { status?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.status) where.status = params.status;

    const [jobs, total] = await Promise.all([
      prisma.vulnerabilityJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.vulnerabilityJob.count({ where }),
    ]);

    return paginate(jobs, total, params);
  }

  async createVulnerabilityJob(data: any, userId: string) {
    const job = await prisma.vulnerabilityJob.create({
      data: {
        name: data.name,
        description: data.description,
        scope: data.scope,
        endpoints: data.endpoints || [],
        scanType: data.scanType,
        recurrence: data.recurrence,
        status: data.scanType === 'scheduled' ? 'SCHEDULED' : 'RUNNING',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        nextRun: data.scheduledAt ? new Date(data.scheduledAt) : null,
        createdBy: userId,
      },
    });

    return job;
  }

  async getVulnerabilityDbSync() {
    const sync = await prisma.vulnerabilityDbSync.findFirst();

    if (!sync) {
      return {
        scanJobInterval: 24,
        scanJobUnit: 'Hour',
        databaseSyncTime: '02:00:00',
        lastSync: null,
        totalCVE: 0,
      };
    }

    return sync;
  }

  async updateVulnerabilityDbSync(data: any) {
    const existing = await prisma.vulnerabilityDbSync.findFirst();

    if (existing) {
      return prisma.vulnerabilityDbSync.update({
        where: { id: existing.id },
        data: {
          scanJobInterval: data.scanJobInterval,
          scanJobUnit: data.scanJobUnit,
          databaseSyncTime: data.databaseSyncTime,
        },
      });
    }

    return prisma.vulnerabilityDbSync.create({ data });
  }

  async triggerVulnerabilityDbSync() {
    // TODO: Queue NIST NVD sync job
    // This would call the NIST NVD API to fetch latest CVEs
    const sync = await prisma.vulnerabilityDbSync.findFirst();
    if (sync) {
      await prisma.vulnerabilityDbSync.update({
        where: { id: sync.id },
        data: { lastSync: new Date() },
      });
    }
    return { message: 'CVE database sync started' };
  }

  // ==================== Software Jobs ====================

  async listSoftwareCatalog(params: { os?: string; search?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.os) where.os = params.os;
    if (params.search) {
      where.applicationName = { contains: params.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.softwareCatalog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.softwareCatalog.count({ where }),
    ]);

    return paginate(items, total, params);
  }

  async createSoftwareCatalogItem(data: any, userId: string) {
    // Generate deployment ID
    const count = await prisma.softwareCatalog.count();
    const deploymentId = `SWP-${String(count + 1).padStart(3, '0')}`;

    return prisma.softwareCatalog.create({
      data: {
        deploymentId,
        applicationName: data.applicationName,
        description: data.description,
        tags: data.tags || [],
        os: data.os,
        version: data.version,
        applicationLocationType: data.applicationLocationType,
        installationCommand: data.installationCommand,
        uninstallationCommand: data.uninstallationCommand,
        upgradeCommand: data.upgradeCommand,
        iconUrl: data.iconUrl,
        selfService: data.selfService || false,
        architecture: data.architecture,
        applicationType: data.applicationType,
        applicationFileUrl: data.applicationFileUrl,
        createdBy: userId,
      },
    });
  }

  async listSoftwareBundles(params: { page: number; limit: number }) {
    const [bundles, total] = await Promise.all([
      prisma.softwareBundle.findMany({
        include: { items: { include: { software: true } } },
        ...getPaginationParams(params),
      }),
      prisma.softwareBundle.count(),
    ]);

    return paginate(bundles, total, params);
  }

  async createSoftwareBundle(data: any, userId: string) {
    const count = await prisma.softwareBundle.count();
    const bundleId = `BND-${String(count + 1).padStart(3, '0')}`;

    return prisma.softwareBundle.create({
      data: {
        bundleId,
        bundleName: data.bundleName,
        os: data.os,
        description: data.description,
        createdBy: userId,
        items: {
          create: data.applications.map((softwareId: string) => ({ softwareId })),
        },
      },
      include: { items: { include: { software: true } } },
    });
  }

  async createSoftwareDeployment(data: any, userId: string) {
    const count = await prisma.softwareDeployment.count();
    const deploymentId = `ADR-${String(count + 1).padStart(3, '0')}`;

    const deployment = await prisma.softwareDeployment.create({
      data: {
        deploymentId,
        deploymentName: data.deploymentName,
        description: data.description,
        deploymentType: data.deploymentType,
        selectionType: data.selectionType,
        selectedItems: data.selectedItems,
        scope: data.scope,
        endpoints: data.endpoints || [],
        deploymentPolicy: data.deploymentPolicy,
        retryCount: data.retryCount || 3,
        notifyTo: data.notifyTo || 'admin',
        status: 'IN_PROGRESS',
        pending: data.endpoints?.length || 0,
        createdBy: userId,
      },
    });

    // TODO: Queue deployment execution
    return deployment;
  }

  async getSoftwareDeploymentTasks(deploymentId: string) {
    // This would return per-endpoint task status
    // For now, returning mock structure
    return [];
  }
}
```

---

## TDD Test Scenarios

```typescript
describe('Jobs API', () => {
  describe('Patch Jobs', () => {
    it('should create instant patch job', async () => {
      const response = await request(app)
        .post('/v1/jobs/patch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Critical Patch Job',
          type: 'INSTANT',
          configType: 'INSTALL',
          scope: 'Endpoint',
          endpoints: ['endpoint-1'],
          patches: ['patch-1'],
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('RUNNING');
    });

    it('should create scheduled patch job', async () => {
      const response = await request(app)
        .post('/v1/jobs/patch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Scheduled Patch Job',
          type: 'SCHEDULE',
          configType: 'INSTALL',
          scope: 'Global',
          scheduledAt: '2024-12-01T14:00:00Z',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('SCHEDULED');
    });
  });

  describe('Software Catalog', () => {
    it('should add software to catalog', async () => {
      const response = await request(app)
        .post('/v1/jobs/software/catalog')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          applicationName: 'Google Chrome',
          os: 'Windows',
          version: '120.0.0',
          architecture: 'x64',
          applicationType: 'MSI',
          applicationLocationType: 'URL',
          installationCommand: 'msiexec /i chrome.msi /quiet',
        });

      expect(response.status).toBe(201);
      expect(response.body.deploymentId).toMatch(/^SWP-\d{3}$/);
    });
  });

  describe('Vulnerability DB Sync', () => {
    it('should update sync configuration', async () => {
      const response = await request(app)
        .put('/v1/jobs/vulnerability/db-sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scanJobInterval: 12,
          scanJobUnit: 'Hour',
          databaseSyncTime: '03:00:00',
        });

      expect(response.status).toBe(200);
    });

    it('should trigger immediate sync', async () => {
      const response = await request(app)
        .post('/v1/jobs/vulnerability/db-sync/now')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('started');
    });
  });
});
```

---

## Verification Checklist

- [ ] Patch jobs CRUD works
- [ ] Scheduled vs instant job status correct
- [ ] Vulnerability scan jobs work
- [ ] DB sync configuration works
- [ ] Software catalog CRUD works
- [ ] Software bundles work
- [ ] Software deployments create tasks
- [ ] Config jobs work (similar to software)
- [ ] Deployment policies CRUD works
- [ ] Auto-generated IDs (SWP-001, ADR-001, etc.)
