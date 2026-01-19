# Task 07: Vulnerabilities Module

## Overview
Implement vulnerability management including CVE tracking, zero-day detection, exceptions, and statistics.

**Priority:** P0 - Core Feature
**Dependencies:** Tasks 01, 02, 03
**Estimated Complexity:** High
**Parallel:** Yes (with Tasks 04, 05, 06)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| API Spec | `backend-debt/vulnerability-api.yaml` | OpenAPI specification |
| Implementation Guide | `backend-debt/VULNERABILITY-IMPLEMENTATION.md` | TDD scenarios |
| NIST NVD | `external-deps/nist-nvd.md` | External CVE data source |

---

## Endpoints to Implement

```
# Core
GET    /v1/vulnerabilities           - List vulnerabilities (filtered)
GET    /v1/vulnerabilities/zero-day  - Zero-day vulnerabilities
GET    /v1/vulnerabilities/:cve      - CVE details
GET    /v1/vulnerabilities/:cve/endpoints  - Affected endpoints
GET    /v1/vulnerabilities/:cve/software   - Affected software

# Scanning
POST   /v1/vulnerabilities/scan      - Trigger vulnerability scan

# Statistics
GET    /v1/vulnerabilities/stats     - Overall statistics
GET    /v1/vulnerabilities/types     - Vulnerability type counts
GET    /v1/vulnerabilities/endpoints - Stats by endpoint
GET    /v1/vulnerabilities/network   - Network vulnerabilities

# Exceptions
POST   /v1/vulnerabilities/:cve/exceptions     - Create exception
PUT    /v1/vulnerabilities/:cve/exceptions/:id - Update exception
DELETE /v1/vulnerabilities/:cve/exceptions/:id - Delete exception
POST   /v1/vulnerabilities/:cve/exceptions/:id/restore - Restore exception
```

---

## Key Data Models

### Vulnerability

```typescript
interface Vulnerability {
  id: string;
  cveId: string;              // CVE-2024-12345
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssScore?: number;
  cvssVector?: string;
  epssScore?: number;         // Exploit Prediction Scoring System
  exploitable: boolean;
  isZeroDay: boolean;
  publishedDate?: string;
  lastModified?: string;
  attackVector?: string;
  attackComplexity?: string;
  cweId?: string;
  mitreAttackId?: string;
}
```

### Vulnerability Exception

```typescript
interface VulnerabilityException {
  id: string;
  vulnerabilityId: string;
  scope: 'Global' | 'Group' | 'Endpoint';
  scopeIds: string[];
  reason: 'Acceptable Risk' | 'Not Applicable';
  justification?: string;
  createdBy: string;
  approvedBy?: string;
  expiresAt?: string;
  deletedAt?: string;
}
```

### Vulnerability Stats

```typescript
interface VulnerabilityStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  zeroDayCount: number;
  exceptionsCount: number;
  publishedStats: {
    range: string;          // "> 90 days", "60-90 days", etc.
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
  discoveredStats: {
    range: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
}
```

---

## Service Implementation

**src/modules/vulnerabilities/vulnerabilities.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError, BadRequestError } from '@shared/errors/httpErrors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';

export class VulnerabilitiesService {
  async listVulnerabilities(params: {
    severity?: string;
    exploitable?: boolean;
    isZeroDay?: boolean;
    minCvss?: number;
    maxCvss?: number;
    search?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};

    if (params.severity) where.severity = params.severity;
    if (params.exploitable !== undefined) where.exploitable = params.exploitable;
    if (params.isZeroDay !== undefined) where.isZeroDay = params.isZeroDay;
    if (params.minCvss || params.maxCvss) {
      where.cvssScore = {};
      if (params.minCvss) where.cvssScore.gte = params.minCvss;
      if (params.maxCvss) where.cvssScore.lte = params.maxCvss;
    }
    if (params.search) {
      where.OR = [
        { cveId: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [vulnerabilities, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        include: {
          affectedAssets: { select: { id: true } },
          patches: { include: { patch: true } },
        },
        ...getPaginationParams(params),
      }),
      prisma.vulnerability.count({ where }),
    ]);

    return paginate(
      vulnerabilities.map(this.transformVulnerability),
      total,
      params
    );
  }

  async getZeroDayVulnerabilities(params: { page: number; limit: number }) {
    const where = { isZeroDay: true };

    const [vulnerabilities, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        include: {
          affectedAssets: { select: { id: true } },
        },
        orderBy: { publishedDate: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.vulnerability.count({ where }),
    ]);

    return paginate(
      vulnerabilities.map(this.transformVulnerability),
      total,
      params
    );
  }

  async getVulnerabilityByCve(cveId: string) {
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { cveId },
      include: {
        references: true,
        affectedAssets: {
          include: { asset: true },
        },
        affectedSoftware: true,
        patches: { include: { patch: true } },
        exceptions: {
          where: { deletedAt: null },
        },
      },
    });

    if (!vulnerability) {
      throw new NotFoundError('Vulnerability not found');
    }

    return {
      ...this.transformVulnerability(vulnerability),
      references: vulnerability.references.map((r) => ({
        source: r.source,
        url: r.url,
      })),
      affectedEndpoints: vulnerability.affectedAssets.length,
      affectedSoftware: vulnerability.affectedSoftware.map((s) => ({
        name: s.name,
        vendor: s.vendor,
        version: s.version,
        versionRange: s.versionStart && s.versionEnd
          ? `${s.versionStart} - ${s.versionEnd}`
          : null,
      })),
      patches: vulnerability.patches.map((p) => ({
        patchId: p.patch.patchId,
        title: p.patch.title,
        severity: p.patch.severity,
      })),
      exceptions: vulnerability.exceptions.map((e) => ({
        id: e.id,
        scope: e.scope,
        reason: e.reason,
        justification: e.justification,
        expiresAt: e.expiresAt?.toISOString(),
      })),
    };
  }

  async getAffectedEndpoints(cveId: string) {
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { cveId },
      include: {
        affectedAssets: {
          include: {
            asset: {
              include: {
                agents: { take: 1 },
              },
            },
          },
        },
      },
    });

    if (!vulnerability) {
      throw new NotFoundError('Vulnerability not found');
    }

    return vulnerability.affectedAssets.map((aa) => ({
      id: aa.asset.id,
      name: aa.asset.name,
      status: aa.status,
      discoveredAt: aa.discoveredAt.toISOString(),
      mitigatedAt: aa.mitigatedAt?.toISOString(),
      agentStatus: aa.asset.agents[0]?.status || 'Unknown',
    }));
  }

  async getStats() {
    const [total, bySeverity, zeroDay, exceptions] = await Promise.all([
      prisma.vulnerability.count(),
      prisma.vulnerability.groupBy({
        by: ['severity'],
        _count: true,
      }),
      prisma.vulnerability.count({ where: { isZeroDay: true } }),
      prisma.vulnerabilityException.count({ where: { deletedAt: null } }),
    ]);

    const severityCounts = bySeverity.reduce((acc, s) => {
      acc[s.severity.toLowerCase()] = s._count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate age-based statistics
    const now = new Date();
    const ranges = [
      { label: '> 90 days', days: 90, condition: 'gt' },
      { label: '60-90 days', min: 60, max: 90 },
      { label: '30-60 days', min: 30, max: 60 },
      { label: '< 30 days', days: 30, condition: 'lt' },
    ];

    const publishedStats = await Promise.all(
      ranges.map(async (range) => {
        const where: any = { publishedDate: {} };
        if (range.condition === 'gt') {
          where.publishedDate.lt = new Date(now.getTime() - range.days! * 24 * 60 * 60 * 1000);
        } else if (range.condition === 'lt') {
          where.publishedDate.gte = new Date(now.getTime() - range.days! * 24 * 60 * 60 * 1000);
        } else if (range.min && range.max) {
          where.publishedDate = {
            gte: new Date(now.getTime() - range.max * 24 * 60 * 60 * 1000),
            lt: new Date(now.getTime() - range.min * 24 * 60 * 60 * 1000),
          };
        }

        const stats = await prisma.vulnerability.groupBy({
          by: ['severity'],
          where,
          _count: true,
        });

        return {
          range: range.label,
          ...stats.reduce((acc, s) => {
            acc[s.severity.toLowerCase()] = s._count;
            return acc;
          }, { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>),
        };
      })
    );

    return {
      total,
      critical: severityCounts.critical || 0,
      high: severityCounts.high || 0,
      medium: severityCounts.medium || 0,
      low: severityCounts.low || 0,
      zeroDayCount: zeroDay,
      exceptionsCount: exceptions,
      publishedStats,
    };
  }

  async createException(cveId: string, userId: string, data: {
    scope: string;
    scopeIds?: string[];
    reason: string;
    justification?: string;
    expiresAt?: string;
  }) {
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { cveId },
    });

    if (!vulnerability) {
      throw new NotFoundError('Vulnerability not found');
    }

    const exception = await prisma.vulnerabilityException.create({
      data: {
        vulnerabilityId: vulnerability.id,
        scope: data.scope,
        scopeIds: data.scopeIds || [],
        reason: data.reason,
        justification: data.justification,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE_EXCEPTION',
        module: 'vulnerabilities',
        entityId: exception.id,
        entityType: 'VulnerabilityException',
        newValue: data,
      },
    });

    return exception;
  }

  async deleteException(cveId: string, exceptionId: string, userId: string) {
    const exception = await prisma.vulnerabilityException.findFirst({
      where: {
        id: exceptionId,
        vulnerability: { cveId },
        deletedAt: null,
      },
    });

    if (!exception) {
      throw new NotFoundError('Exception not found');
    }

    await prisma.vulnerabilityException.update({
      where: { id: exceptionId },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE_EXCEPTION',
        module: 'vulnerabilities',
        entityId: exceptionId,
        entityType: 'VulnerabilityException',
      },
    });
  }

  async restoreException(cveId: string, exceptionId: string, userId: string) {
    const exception = await prisma.vulnerabilityException.findFirst({
      where: {
        id: exceptionId,
        vulnerability: { cveId },
        deletedAt: { not: null },
      },
    });

    if (!exception) {
      throw new NotFoundError('Deleted exception not found');
    }

    await prisma.vulnerabilityException.update({
      where: { id: exceptionId },
      data: { deletedAt: null },
    });
  }

  private transformVulnerability(vuln: any) {
    return {
      id: vuln.id,
      cveId: vuln.cveId,
      title: vuln.title,
      description: vuln.description,
      severity: vuln.severity,
      cvssScore: vuln.cvssScore ? Number(vuln.cvssScore) : null,
      cvssVector: vuln.cvssVector,
      epssScore: vuln.epssScore ? Number(vuln.epssScore) : null,
      exploitable: vuln.exploitable,
      isZeroDay: vuln.isZeroDay,
      publishedDate: vuln.publishedDate?.toISOString(),
      lastModified: vuln.lastModified?.toISOString(),
      attackVector: vuln.attackVector,
      attackComplexity: vuln.attackComplexity,
      cweId: vuln.cweId,
      mitreAttackId: vuln.mitreAttackId,
      affectedEndpoints: vuln.affectedAssets?.length || 0,
    };
  }
}
```

---

## TDD Test Scenarios

```typescript
describe('Vulnerabilities API', () => {
  describe('GET /v1/vulnerabilities', () => {
    it('should return paginated vulnerabilities', async () => {
      const response = await request(app)
        .get('/v1/vulnerabilities')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/v1/vulnerabilities?severity=CRITICAL')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((vuln: any) => {
        expect(vuln.severity).toBe('CRITICAL');
      });
    });

    it('should filter by CVSS score range', async () => {
      const response = await request(app)
        .get('/v1/vulnerabilities?minCvss=7.0&maxCvss=9.0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((vuln: any) => {
        expect(vuln.cvssScore).toBeGreaterThanOrEqual(7.0);
        expect(vuln.cvssScore).toBeLessThanOrEqual(9.0);
      });
    });
  });

  describe('GET /v1/vulnerabilities/zero-day', () => {
    it('should return only zero-day vulnerabilities', async () => {
      const response = await request(app)
        .get('/v1/vulnerabilities/zero-day')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((vuln: any) => {
        expect(vuln.isZeroDay).toBe(true);
      });
    });
  });

  describe('GET /v1/vulnerabilities/stats', () => {
    it('should return statistics with age breakdown', async () => {
      const response = await request(app)
        .get('/v1/vulnerabilities/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('critical');
      expect(response.body).toHaveProperty('zeroDayCount');
      expect(response.body).toHaveProperty('publishedStats');
    });
  });

  describe('Exception Management', () => {
    it('should create exception', async () => {
      const response = await request(app)
        .post('/v1/vulnerabilities/CVE-2024-12345/exceptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scope: 'Global',
          reason: 'Acceptable Risk',
          justification: 'Mitigated by network segmentation',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should soft-delete exception', async () => {
      const response = await request(app)
        .delete(`/v1/vulnerabilities/CVE-2024-12345/exceptions/${exceptionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should restore deleted exception', async () => {
      const response = await request(app)
        .post(`/v1/vulnerabilities/CVE-2024-12345/exceptions/${exceptionId}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});
```

---

## Verification Checklist

- [ ] GET /v1/vulnerabilities returns filtered list
- [ ] GET /v1/vulnerabilities/zero-day returns only zero-days
- [ ] GET /v1/vulnerabilities/:cve returns full details
- [ ] GET /v1/vulnerabilities/:cve/endpoints returns affected assets
- [ ] GET /v1/vulnerabilities/stats returns age breakdown
- [ ] Exception CRUD works correctly
- [ ] Soft delete/restore for exceptions works
- [ ] Audit logs created for exception changes
- [ ] CVSS score filtering works
- [ ] EPSS score is included where available
