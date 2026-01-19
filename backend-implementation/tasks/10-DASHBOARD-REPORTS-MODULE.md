# Task 10: Dashboard & Reports Module

## Overview
Implement dashboard widgets, statistics, and report generation with multiple export formats.

**Priority:** P1 - Important Feature
**Dependencies:** Tasks 03-07
**Estimated Complexity:** Medium-High
**Parallel:** Yes (with Tasks 08, 09)

---

## Reference Documents

| Document | Path | Purpose |
|----------|------|---------|
| Implementation Guide | `backend-debt/DASHBOARD-REPORTS-IMPLEMENTATION.md` | Specification |

---

## Endpoints to Implement

```
# Dashboard
GET    /v1/dashboard                 - All dashboard data
GET    /v1/dashboard/stats           - Statistics overview
GET    /v1/dashboard/patches         - Patch distribution
GET    /v1/dashboard/vulnerabilities - Vulnerability trends
GET    /v1/dashboard/assets          - Asset status
GET    /v1/dashboard/agents          - Agent connectivity
GET    /v1/dashboard/compliance      - Compliance metrics
GET    /v1/dashboard/recent-activity - Recent activity feed

# Reports
GET    /v1/reports                   - List reports
POST   /v1/reports                   - Create report
GET    /v1/reports/:id               - Get report details
GET    /v1/reports/:id/download      - Download report file
DELETE /v1/reports/:id               - Delete report

# Report Schedules
GET    /v1/reports/schedules         - List schedules
POST   /v1/reports/schedules         - Create schedule
PUT    /v1/reports/schedules/:id     - Update schedule
DELETE /v1/reports/schedules/:id     - Delete schedule

# Report Templates
GET    /v1/reports/templates         - List available templates
```

---

## Dashboard Data Models

### Dashboard Overview

```typescript
interface DashboardData {
  stats: {
    totalEndpoints: number;
    connectedEndpoints: number;
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    totalPatches: number;
    missingPatches: number;
    complianceScore: number;
  };
  patchDistribution: {
    severity: string;
    count: number;
    percentage: number;
  }[];
  vulnerabilityTrends: {
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }[];
  assetStatus: {
    status: string;
    count: number;
  }[];
  osDistribution: {
    os: string;
    count: number;
  }[];
  topVulnerabilities: {
    cveId: string;
    title: string;
    cvssScore: number;
    affectedEndpoints: number;
  }[];
  recentActivity: {
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }[];
}
```

### Report

```typescript
interface Report {
  id: string;
  name: string;
  description?: string;
  type: 'Patch' | 'Asset' | 'Vulnerability' | 'Compliance' | 'Audit' | 'Custom';
  format: 'PDF' | 'CSV' | 'Excel';
  filters?: Record<string, any>;
  columns?: string[];
  scheduleId?: string;
  generatedAt?: string;
  filePath?: string;
  createdBy: string;
  createdAt: string;
}
```

---

## Service Implementation

**src/modules/dashboard/dashboard.service.ts:**
```typescript
import { prisma } from '@/db/client';

export class DashboardService {
  async getDashboardData() {
    const [
      stats,
      patchDistribution,
      assetStatus,
      osDistribution,
      topVulnerabilities,
      recentActivity,
    ] = await Promise.all([
      this.getStats(),
      this.getPatchDistribution(),
      this.getAssetStatus(),
      this.getOsDistribution(),
      this.getTopVulnerabilities(),
      this.getRecentActivity(),
    ]);

    return {
      stats,
      patchDistribution,
      assetStatus,
      osDistribution,
      topVulnerabilities,
      recentActivity,
    };
  }

  async getStats() {
    const [
      totalEndpoints,
      connectedAgents,
      totalVulnerabilities,
      criticalVulnerabilities,
      totalPatches,
      missingPatchStatus,
    ] = await Promise.all([
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.agent.count({ where: { status: 'Connected' } }),
      prisma.vulnerability.count(),
      prisma.vulnerability.count({ where: { severity: 'CRITICAL' } }),
      prisma.patch.count(),
      prisma.assetPatchStatus.count({ where: { status: 'Missing' } }),
    ]);

    // Calculate compliance score
    const totalPatchStatus = await prisma.assetPatchStatus.count();
    const installedPatches = await prisma.assetPatchStatus.count({
      where: { status: 'Installed' }
    });
    const complianceScore = totalPatchStatus > 0
      ? Math.round((installedPatches / totalPatchStatus) * 100)
      : 100;

    return {
      totalEndpoints,
      connectedEndpoints: connectedAgents,
      totalVulnerabilities,
      criticalVulnerabilities,
      totalPatches,
      missingPatches: missingPatchStatus,
      complianceScore,
    };
  }

  async getPatchDistribution() {
    const distribution = await prisma.patch.groupBy({
      by: ['severity'],
      _count: true,
    });

    const total = distribution.reduce((acc, d) => acc + d._count, 0);

    return distribution.map((d) => ({
      severity: d.severity,
      count: d._count,
      percentage: total > 0 ? Math.round((d._count / total) * 100) : 0,
    }));
  }

  async getAssetStatus() {
    const status = await prisma.asset.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: true,
    });

    return status.map((s) => ({
      status: s.status,
      count: s._count,
    }));
  }

  async getOsDistribution() {
    const distribution = await prisma.agent.groupBy({
      by: ['os'],
      _count: true,
    });

    return distribution.map((d) => ({
      os: d.os,
      count: d._count,
    }));
  }

  async getTopVulnerabilities(limit: number = 10) {
    const vulnerabilities = await prisma.vulnerability.findMany({
      orderBy: [
        { severity: 'desc' },
        { cvssScore: 'desc' },
      ],
      take: limit,
      include: {
        affectedAssets: { select: { id: true } },
      },
    });

    return vulnerabilities.map((v) => ({
      cveId: v.cveId,
      title: v.title,
      severity: v.severity,
      cvssScore: v.cvssScore ? Number(v.cvssScore) : null,
      affectedEndpoints: v.affectedAssets.length,
    }));
  }

  async getRecentActivity(limit: number = 20) {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { name: true, email: true } } },
    });

    return logs.map((log) => ({
      type: log.action,
      description: this.formatActivityDescription(log),
      timestamp: log.createdAt.toISOString(),
      user: log.user?.name || log.user?.email,
    }));
  }

  async getVulnerabilityTrends(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get vulnerability discovery counts by date
    const trends = await prisma.$queryRaw`
      SELECT
        DATE(av.discovered_at) as date,
        v.severity,
        COUNT(*) as count
      FROM asset_vulnerabilities av
      JOIN vulnerabilities v ON av.vulnerability_id = v.id
      WHERE av.discovered_at >= ${startDate}
      GROUP BY DATE(av.discovered_at), v.severity
      ORDER BY date
    ` as any[];

    // Transform to chart-friendly format
    const dateMap = new Map<string, Record<string, number>>();
    trends.forEach((t) => {
      const dateStr = t.date.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { critical: 0, high: 0, medium: 0, low: 0 });
      }
      const entry = dateMap.get(dateStr)!;
      entry[t.severity.toLowerCase()] = Number(t.count);
    });

    return Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  }

  private formatActivityDescription(log: any): string {
    const entityType = log.entityType || log.module;
    switch (log.action) {
      case 'CREATE':
        return `Created ${entityType} ${log.entityId}`;
      case 'UPDATE':
        return `Updated ${entityType} ${log.entityId}`;
      case 'DELETE':
        return `Deleted ${entityType} ${log.entityId}`;
      case 'LOGIN':
        return 'User logged in';
      case 'LOGOUT':
        return 'User logged out';
      default:
        return `${log.action} on ${entityType}`;
    }
  }
}
```

**src/modules/reports/reports.service.ts:**
```typescript
import { prisma } from '@/db/client';
import { NotFoundError } from '@shared/errors/httpErrors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import * as fs from 'fs';
import * as path from 'path';

export class ReportsService {
  private reportsDir = process.env.REPORTS_DIR || '/tmp/reports';

  async listReports(params: { type?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.type) where.type = params.type;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: { schedule: true },
        orderBy: { createdAt: 'desc' },
        ...getPaginationParams(params),
      }),
      prisma.report.count({ where }),
    ]);

    return paginate(reports, total, params);
  }

  async createReport(data: any, userId: string) {
    const report = await prisma.report.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        format: data.format,
        filters: data.filters,
        columns: data.columns || [],
        scheduleId: data.scheduleId,
        createdBy: userId,
      },
    });

    // Generate report asynchronously
    this.generateReport(report.id, data).catch(console.error);

    return report;
  }

  async getReportById(id: string) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: { schedule: true },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    return report;
  }

  async downloadReport(id: string) {
    const report = await this.getReportById(id);

    if (!report.filePath) {
      throw new NotFoundError('Report file not generated yet');
    }

    const fullPath = path.join(this.reportsDir, report.filePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Report file not found');
    }

    return {
      path: fullPath,
      filename: `${report.name}.${report.format.toLowerCase()}`,
      contentType: this.getContentType(report.format),
    };
  }

  private async generateReport(reportId: string, data: any) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return;

    try {
      let filePath: string;

      switch (report.format) {
        case 'CSV':
          filePath = await this.generateCsvReport(report);
          break;
        case 'Excel':
          filePath = await this.generateExcelReport(report);
          break;
        case 'PDF':
          filePath = await this.generatePdfReport(report);
          break;
        default:
          throw new Error(`Unsupported format: ${report.format}`);
      }

      await prisma.report.update({
        where: { id: reportId },
        data: {
          filePath,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Failed to generate report ${reportId}:`, error);
    }
  }

  private async generateCsvReport(report: any): Promise<string> {
    // Get report data based on type
    const data = await this.getReportData(report);

    // Generate CSV
    const headers = report.columns?.length > 0
      ? report.columns
      : Object.keys(data[0] || {});

    const rows = data.map((row: any) =>
      headers.map((h: string) => JSON.stringify(row[h] ?? '')).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    const filename = `${report.id}.csv`;
    const filePath = path.join(this.reportsDir, filename);

    fs.mkdirSync(this.reportsDir, { recursive: true });
    fs.writeFileSync(filePath, csv);

    return filename;
  }

  private async generateExcelReport(report: any): Promise<string> {
    // TODO: Implement Excel generation using xlsx library
    // For now, generate CSV
    return this.generateCsvReport(report);
  }

  private async generatePdfReport(report: any): Promise<string> {
    // TODO: Implement PDF generation using pdfkit or puppeteer
    // This is a placeholder
    const filename = `${report.id}.pdf`;
    return filename;
  }

  private async getReportData(report: any): Promise<any[]> {
    const filters = report.filters || {};

    switch (report.type) {
      case 'Patch':
        return prisma.patch.findMany({
          where: filters,
          take: 1000,
        });
      case 'Asset':
        return prisma.asset.findMany({
          where: { ...filters, deletedAt: null },
          take: 1000,
        });
      case 'Vulnerability':
        return prisma.vulnerability.findMany({
          where: filters,
          take: 1000,
        });
      case 'Audit':
        return prisma.auditLog.findMany({
          where: filters,
          take: 1000,
          include: { user: { select: { name: true, email: true } } },
        });
      default:
        return [];
    }
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'CSV':
        return 'text/csv';
      case 'Excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'PDF':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  // ==================== Schedules ====================

  async listSchedules(params: { page: number; limit: number }) {
    const [schedules, total] = await Promise.all([
      prisma.reportSchedule.findMany({
        include: { reports: true },
        ...getPaginationParams(params),
      }),
      prisma.reportSchedule.count(),
    ]);

    return paginate(schedules, total, params);
  }

  async createSchedule(data: any, userId: string) {
    return prisma.reportSchedule.create({
      data: {
        name: data.name,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time,
        recipients: data.recipients || [],
        enabled: data.enabled ?? true,
        createdBy: userId,
      },
    });
  }
}
```

---

## TDD Test Scenarios

```typescript
describe('Dashboard API', () => {
  it('should return dashboard stats', async () => {
    const response = await request(app)
      .get('/v1/dashboard/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalEndpoints');
    expect(response.body).toHaveProperty('complianceScore');
  });

  it('should return vulnerability trends', async () => {
    const response = await request(app)
      .get('/v1/dashboard/vulnerabilities')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('Reports API', () => {
  it('should create report', async () => {
    const response = await request(app)
      .post('/v1/reports')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Monthly Patch Report',
        type: 'Patch',
        format: 'CSV',
      });

    expect(response.status).toBe(201);
  });

  it('should download generated report', async () => {
    const response = await request(app)
      .get(`/v1/reports/${reportId}/download`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/csv');
  });
});
```

---

## Verification Checklist

- [ ] Dashboard stats calculated correctly
- [ ] Patch distribution by severity works
- [ ] Vulnerability trends over time works
- [ ] OS distribution shows all platforms
- [ ] Top vulnerabilities sorted by severity/CVSS
- [ ] Recent activity shows audit log
- [ ] Report creation triggers generation
- [ ] CSV export works
- [ ] Report download returns correct content-type
- [ ] Report schedules CRUD works
