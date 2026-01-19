# Task 05: Assets Module

## Overview
Implement comprehensive asset management including CRUD, hardware details, software inventory, security posture, and telemetry.

**Priority:** P0 - Core Feature
**Dependencies:** Tasks 01, 02, 03
**Estimated Complexity:** High
**Parallel:** Yes (with Tasks 04, 06, 07)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| API Spec | `backend-debt/assets-api.yaml` | OpenAPI specification |
| Implementation Guide | `backend-debt/ASSETS-IMPLEMENTATION.md` | TDD scenarios, data models |
| Agent Schemas | `../agent-dev/contracts/schemas/*.json` | Data schemas from agent |
| Frontend Service | `frontend/src/services/asset.service.ts` | API calls |
| MSW Handlers | `frontend/src/mocks/handlers/asset.handlers.ts` | Expected responses |

---

## Endpoints to Implement

```
# Core CRUD
GET    /v1/assets                    - List assets (paginated, filtered)
POST   /v1/assets                    - Create asset
GET    /v1/assets/:id                - Get asset details
PUT    /v1/assets/:id                - Update asset
DELETE /v1/assets/:id                - Delete asset

# Categories & Tags
GET    /v1/assets/categories         - List categories
POST   /v1/assets/categories         - Create category
GET    /v1/assets/sub-categories     - List sub-categories
POST   /v1/assets/sub-categories     - Create sub-category
GET    /v1/assets/tags               - List tags
POST   /v1/assets/:id/tags           - Add tags to asset
DELETE /v1/assets/:id/tags/:tagId    - Remove tag from asset

# Asset Details
GET    /v1/assets/:id/lifecycle      - Lifecycle/depreciation info
GET    /v1/assets/:id/hardware       - Hardware details (BIOS, CPU, RAM, etc.)
GET    /v1/assets/:id/software       - Software (OS, apps, services)
GET    /v1/assets/:id/security       - Security posture
GET    /v1/assets/:id/network        - Network configuration
GET    /v1/assets/:id/peripherals    - Connected devices
GET    /v1/assets/:id/telemetry      - Performance metrics
GET    /v1/assets/:id/errors         - Collection errors
GET    /v1/assets/:id/audit          - Audit log
GET    /v1/assets/:id/vulnerabilities - Vulnerabilities affecting asset
GET    /v1/assets/:id/patches        - Patch status

# Bulk Operations
POST   /v1/assets/import             - Import from CSV/Excel
POST   /v1/assets/export             - Export to CSV
POST   /v1/assets/bulk-delete        - Bulk delete
POST   /v1/assets/bulk-update        - Bulk update tags/category

# Software Inventory (separate section)
GET    /v1/assets/software-inventory - All software across assets
GET    /v1/assets/software-licenses  - Software licenses
POST   /v1/assets/software-licenses  - Add license
```

---

## Module Structure

```
src/modules/assets/
├── assets.controller.ts        # Main asset handlers
├── assets.service.ts           # Asset business logic
├── assets.routes.ts            # Route definitions
├── assets.validators.ts        # Zod schemas
├── assets.types.ts             # TypeScript types
├── categories.controller.ts    # Categories handlers
├── categories.service.ts       # Categories logic
├── hardware.service.ts         # Hardware details
├── software.service.ts         # Software inventory
├── security.service.ts         # Security posture
└── __tests__/
    ├── assets.integration.test.ts
    └── assets.service.test.ts
```

---

## Key Implementation Details

### Asset Model (from ASSETS-IMPLEMENTATION.md)

```typescript
interface Asset {
  id: string;
  name: string;
  status: 'In Use' | 'Available' | 'Under Maintenance' | 'Retired';
  categoryId?: string;
  subCategoryId?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  purchasePrice?: number;
  vendor?: string;
  assetTag?: string;
  loggedInUser?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Hardware Submodel

```typescript
interface AssetHardware {
  system: {
    manufacturer: string;
    model: string;
    serialNumber: string;
  };
  bios: {
    vendor: string;
    version: string;
    secureBoot: boolean;
    tpmEnabled: boolean;
  };
  cpu: {
    name: string;
    cores: number;
    threads: number;
    speed: number;
    architecture: string;
  };
  memory: {
    total: number;
    slots: number;
    modules: Array<{
      slot: string;
      type: string;
      size: number;
      speed: number;
      manufacturer: string;
    }>;
  };
  storage: Array<{
    name: string;
    type: string;
    capacity: number;
    freeSpace: number;
    smartStatus: string;
  }>;
  graphics: {
    name: string;
    vram: number;
    resolution: string;
  };
  battery?: {
    health: number;
    cycles: number;
    chargeLevel: number;
  };
}
```

### Service Implementation Highlights

**src/modules/assets/assets.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError } from '@shared/errors/httpErrors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';

export class AssetsService {
  async listAssets(params: {
    status?: string;
    categoryId?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};

    if (params.status) where.status = params.status;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { serialNumber: { contains: params.search, mode: 'insensitive' } },
        { assetTag: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: true,
          subCategory: true,
          tags: { include: { tag: true } },
          agents: { take: 1 },
        },
        ...getPaginationParams(params),
      }),
      prisma.asset.count({ where }),
    ]);

    return paginate(
      assets.map(this.transformAsset),
      total,
      params
    );
  }

  async getAssetById(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        tags: { include: { tag: true } },
        agents: true,
        hardware: {
          include: {
            storages: true,
            memoryModules: true,
            networkAdapters: true,
          },
        },
        security: true,
      },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    return this.transformAsset(asset);
  }

  async getAssetHardware(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        hardware: {
          include: {
            storages: true,
            memoryModules: true,
            networkAdapters: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    const hw = asset.hardware;
    if (!hw) {
      return null;
    }

    return {
      system: {
        manufacturer: hw.manufacturer,
        model: hw.model,
        serialNumber: hw.serialNumber,
      },
      bios: {
        vendor: hw.biosVendor,
        version: hw.biosVersion,
        secureBoot: hw.secureBoot,
        tpmEnabled: hw.tpmEnabled,
      },
      cpu: {
        name: hw.cpuName,
        cores: hw.cpuCores,
        threads: hw.cpuThreads,
        speed: hw.cpuSpeed,
        architecture: hw.architecture,
      },
      memory: {
        total: hw.totalMemory,
        slots: hw.memorySlots,
        modules: hw.memoryModules.map((m) => ({
          slot: m.slot,
          type: m.type,
          size: Number(m.size),
          speed: m.speed,
          manufacturer: m.manufacturer,
        })),
      },
      storage: hw.storages.map((s) => ({
        name: s.name,
        type: s.type,
        capacity: Number(s.capacity),
        freeSpace: s.freeSpace ? Number(s.freeSpace) : null,
        smartStatus: s.smartStatus,
      })),
      graphics: {
        name: hw.gpuName,
        vram: hw.gpuVram ? Number(hw.gpuVram) : null,
      },
      battery: hw.batteryHealth ? {
        health: hw.batteryHealth,
        cycles: hw.batteryCycles,
      } : null,
    };
  }

  async getAssetSoftware(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { software: true },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    const apps = asset.software.filter((s) => s.type === 'Application');
    const services = asset.software.filter((s) => s.type === 'Service');
    const os = asset.software.find((s) => s.type === 'OS');

    return {
      operatingSystem: os ? {
        name: os.name,
        version: os.version,
      } : null,
      applications: apps.map((a) => ({
        name: a.name,
        version: a.version,
        vendor: a.vendor,
        installDate: a.installDate?.toISOString(),
        size: a.size ? Number(a.size) : null,
      })),
      services: services.map((s) => ({
        name: s.name,
        version: s.version,
        isSystem: s.isSystem,
      })),
    };
  }

  async getAssetSecurity(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { security: true },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    const sec = asset.security;
    if (!sec) {
      return null;
    }

    return {
      encryption: {
        status: sec.encryptionStatus,
        type: sec.encryptionType,
      },
      firewall: {
        enabled: sec.firewallEnabled,
        product: sec.firewallProduct,
      },
      antivirus: {
        product: sec.antivirusProduct,
        enabled: sec.antivirusEnabled,
        lastUpdated: sec.antivirusUpdated?.toISOString(),
      },
      compliance: {
        score: sec.complianceScore,
        secureBootEnabled: sec.secureBootEnabled,
        uacEnabled: sec.uacEnabled,
      },
      lastScanDate: sec.lastScanDate?.toISOString(),
    };
  }

  async getAssetTelemetry(id: string, hours: number = 24) {
    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const telemetry = await prisma.assetTelemetry.findMany({
      where: {
        assetId: id,
        collectedAt: { gte: since },
      },
      orderBy: { collectedAt: 'desc' },
      take: 100,
    });

    return telemetry.map((t) => ({
      timestamp: t.collectedAt.toISOString(),
      cpu: t.cpuUsage ? Number(t.cpuUsage) : null,
      memory: t.memoryUsage ? Number(t.memoryUsage) : null,
      disk: t.diskUsage ? Number(t.diskUsage) : null,
      networkIn: t.networkIn ? Number(t.networkIn) : null,
      networkOut: t.networkOut ? Number(t.networkOut) : null,
    }));
  }

  async createAsset(data: any) {
    const asset = await prisma.asset.create({
      data: {
        name: data.name,
        status: data.status || 'Available',
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        purchasePrice: data.purchasePrice,
        vendor: data.vendor,
        assetTag: data.assetTag,
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    return this.transformAsset(asset);
  }

  async updateAsset(id: string, data: any) {
    const existing = await prisma.asset.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Asset not found');
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name: data.name,
        status: data.status,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        purchasePrice: data.purchasePrice,
        vendor: data.vendor,
        assetTag: data.assetTag,
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    return this.transformAsset(asset);
  }

  async deleteAsset(id: string) {
    const existing = await prisma.asset.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('Asset not found');
    }

    // Soft delete
    await prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private transformAsset(asset: any) {
    return {
      id: asset.id,
      name: asset.name,
      status: asset.status,
      category: asset.category?.name,
      categoryId: asset.categoryId,
      subCategory: asset.subCategory?.name,
      subCategoryId: asset.subCategoryId,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serialNumber: asset.serialNumber,
      purchaseDate: asset.purchaseDate?.toISOString(),
      warrantyExpiry: asset.warrantyExpiry?.toISOString(),
      purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : null,
      vendor: asset.vendor,
      assetTag: asset.assetTag,
      loggedInUser: asset.loggedInUser,
      lastSeen: asset.lastSeen?.toISOString(),
      tags: asset.tags?.map((t: any) => t.tag.name) || [],
      agentStatus: asset.agents?.[0]?.status || null,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }
}
```

---

## TDD Test Scenarios

```typescript
describe('Assets API', () => {
  describe('GET /v1/assets', () => {
    it('should return paginated list of assets', async () => {
      const response = await request(app)
        .get('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/v1/assets?status=In%20Use')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((asset: any) => {
        expect(asset.status).toBe('In Use');
      });
    });

    it('should search by name', async () => {
      const response = await request(app)
        .get('/v1/assets?search=MacBook')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /v1/assets/:id/hardware', () => {
    it('should return hardware details', async () => {
      const response = await request(app)
        .get(`/v1/assets/${testAssetId}/hardware`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('storage');
    });
  });

  describe('POST /v1/assets', () => {
    it('should create new asset', async () => {
      const response = await request(app)
        .post('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Test Asset',
          status: 'Available',
          manufacturer: 'Apple',
          model: 'MacBook Pro',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Test Asset');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
```

---

## Verification Checklist

- [ ] GET /v1/assets returns paginated list
- [ ] GET /v1/assets filters work (status, category, search)
- [ ] GET /v1/assets/:id returns full asset details
- [ ] POST /v1/assets creates asset
- [ ] PUT /v1/assets/:id updates asset
- [ ] DELETE /v1/assets/:id soft-deletes asset
- [ ] GET /v1/assets/:id/hardware returns hardware details
- [ ] GET /v1/assets/:id/software returns software list
- [ ] GET /v1/assets/:id/security returns security posture
- [ ] GET /v1/assets/:id/telemetry returns metrics
- [ ] Categories CRUD works
- [ ] Tags can be added/removed from assets
- [ ] Asset-agent linking is reflected
- [ ] CSV import/export works

---

## Next Task
After completing this task, proceed to:
- **Task 06: Patches Module**
- **Task 07: Vulnerabilities Module**
