import { prisma } from '@/db/client';
import type { Prisma } from '@prisma/client';
import type {
  DashboardData,
  DashboardStats,
  SankeyLink,
  DistributionItem,
  VulnerabilityByDate,
  VulnerabilityByDateTable,
  TopVulnerabilities,
  TopVulnerability,
  PatchCompliance,
  RecentActivity,
  AlertSeverityByPlatform,
  DayWiseVulnerability,
  AlertSeverityByModule,
  ChartData,
  ChartQueryParams,
} from './dashboard.types';

// Severity colors for charts
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ff4d4f',
  HIGH: '#fa8c16',
  MEDIUM: '#faad14',
  LOW: '#52c41a',
};

// OS colors for pie charts
const OS_COLORS: Record<string, string> = {
  'Windows 10': '#5B8FF9',
  'Windows 11': '#5D7092',
  'Windows Server': '#6395F9',
  'Ubuntu 20.04': '#F6BD16',
  'Ubuntu 22.04': '#E8684A',
  'macOS Ventura': '#9270CA',
  'macOS Sonoma': '#78D3F8',
  CentOS: '#5AD8A6',
  RHEL: '#FF9845',
  Debian: '#A6757D',
  default: '#B6E3F5',
};

export class DashboardService {
  /**
   * Get complete dashboard data (all widgets)
   */
  async getDashboardData(): Promise<DashboardData> {
    const [
      stats,
      vulnerabilityClassification,
      endpointDistribution,
      vulnerabilityByPublishedDate,
      vulnerabilityByDiscoveredDate,
      vulnerabilityByPublishedDateTable,
      topVulnerabilities,
      patchCompliance,
      recentActivity,
      expiredCertificates,
      maliciousProcessesByPlatform,
      totalSoftwareByPlatform,
      riskScoreByEndpoints,
      alertCountBySeverity,
      alertSeverityCountByPlatform,
      dayWiseVulnerabilityDetection,
      alertSeverityCountByModule,
    ] = await Promise.all([
      this.getStats(),
      this.getVulnerabilityClassification(),
      this.getEndpointDistribution(),
      this.getVulnerabilityByPublishedDate(),
      this.getVulnerabilityByDiscoveredDate(),
      this.getVulnerabilityByPublishedDateTable(),
      this.getTopVulnerabilities(),
      this.getPatchCompliance(),
      this.getRecentActivity(),
      this.getExpiredCertificates(),
      this.getMaliciousProcessesByPlatform(),
      this.getTotalSoftwareByPlatform(),
      this.getRiskScoreByEndpoints(),
      this.getAlertCountBySeverity(),
      this.getAlertSeverityCountByPlatform(),
      this.getDayWiseVulnerabilityDetection(),
      this.getAlertSeverityCountByModule(),
    ]);

    return {
      stats,
      vulnerabilityClassification,
      endpointDistribution,
      vulnerabilityByPublishedDate,
      vulnerabilityByDiscoveredDate,
      vulnerabilityByPublishedDateTable,
      topVulnerabilities,
      patchCompliance,
      recentActivity,
      expiredCertificates,
      maliciousProcessesByPlatform,
      totalSoftwareByPlatform,
      riskScoreByEndpoints,
      alertCountBySeverity,
      alertSeverityCountByPlatform,
      dayWiseVulnerabilityDetection,
      alertSeverityCountByModule,
    };
  }

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const [
      totalEndpoints,
      windowsEndpoints,
      linuxEndpoints,
      macEndpoints,
      totalAgents,
      vulnerabilityCounts,
      unmitigatedVulnerabilities,
    ] = await Promise.all([
      // Total assets/endpoints
      prisma.asset.count(),
      // Windows endpoints
      prisma.asset.count({
        where: {
          OR: [
            { os: { contains: 'Windows', mode: 'insensitive' } },
          ],
        },
      }),
      // Linux endpoints
      prisma.asset.count({
        where: {
          OR: [
            { os: { contains: 'Linux', mode: 'insensitive' } },
            { os: { contains: 'Ubuntu', mode: 'insensitive' } },
            { os: { contains: 'CentOS', mode: 'insensitive' } },
            { os: { contains: 'RHEL', mode: 'insensitive' } },
            { os: { contains: 'Debian', mode: 'insensitive' } },
          ],
        },
      }),
      // Mac endpoints
      prisma.asset.count({
        where: {
          os: { contains: 'mac', mode: 'insensitive' },
        },
      }),
      // Total agents
      prisma.agent.count(),
      // Vulnerability counts by severity
      prisma.vulnerability.groupBy({
        by: ['severity'],
        _count: true,
      }),
      // Unmitigated vulnerabilities (those with no resolution)
      prisma.assetVulnerability.count({
        where: { status: { not: 'Resolved' } },
      }),
    ]);

    // Calculate data loss endpoints (endpoints with high/critical vulnerabilities)
    const dataLossEndpoints = await prisma.asset.count({
      where: {
        vulnerabilities: {
          some: {
            vulnerability: {
              severity: { in: ['CRITICAL', 'HIGH'] },
            },
          },
        },
      },
    });

    // Map severity counts
    const severityCounts = vulnerabilityCounts.reduce(
      (acc, item) => {
        acc[item.severity.toLowerCase()] = item._count;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>
    );

    const totalVulnerabilities = Object.values(severityCounts).reduce((a, b) => a + b, 0);

    return {
      totalEndpoints,
      dataLossEndpoints,
      windowsEndpoints,
      linuxEndpoints,
      macEndpoints,
      totalAgents,
      totalVulnerabilities,
      unmitigatedVulnerabilities,
      criticalVulnerabilities: severityCounts.critical || 0,
      highVulnerabilities: severityCounts.high || 0,
      mediumVulnerabilities: severityCounts.medium || 0,
      lowVulnerabilities: severityCounts.low || 0,
    };
  }

  /**
   * Get vulnerability classification for Sankey chart
   */
  async getVulnerabilityClassification(): Promise<SankeyLink[]> {
    // Group vulnerabilities by severity and MITRE tactic
    const classifications = await prisma.vulnerability.groupBy({
      by: ['severity', 'mitreTactic'],
      where: {
        mitreTactic: { not: null },
      },
      _count: true,
    });

    return classifications
      .filter((c) => c.mitreTactic)
      .map((c) => ({
        source: this.normalizeSeverity(c.severity) as 'Critical' | 'High' | 'Medium' | 'Low',
        target: c.mitreTactic!,
        value: c._count,
      }));
  }

  /**
   * Get endpoint OS distribution for pie chart
   */
  async getEndpointDistribution(): Promise<DistributionItem[]> {
    const distribution = await prisma.asset.groupBy({
      by: ['os'],
      where: { os: { not: null } },
      _count: true,
    });

    return distribution.map((d) => ({
      name: d.os || 'Unknown',
      value: d._count,
      color: this.getOsColor(d.os || ''),
    }));
  }

  /**
   * Get vulnerability counts by published date ranges
   */
  async getVulnerabilityByPublishedDate(): Promise<VulnerabilityByDate[]> {
    const now = new Date();
    const ranges = [
      { label: '< 30 days', maxDays: 30 },
      { label: '30-60 days', minDays: 30, maxDays: 60 },
      { label: '60-90 days', minDays: 60, maxDays: 90 },
      { label: '90-180 days', minDays: 90, maxDays: 180 },
      { label: '> 180 days', minDays: 180 },
    ];

    const results = await Promise.all(
      ranges.map(async (range) => {
        const where: Prisma.VulnerabilityWhereInput = {};

        if (range.maxDays && !range.minDays) {
          where.publishedDate = {
            gte: new Date(now.getTime() - range.maxDays * 24 * 60 * 60 * 1000),
          };
        } else if (range.minDays && !range.maxDays) {
          where.publishedDate = {
            lt: new Date(now.getTime() - range.minDays * 24 * 60 * 60 * 1000),
          };
        } else if (range.minDays && range.maxDays) {
          where.publishedDate = {
            gte: new Date(now.getTime() - range.maxDays * 24 * 60 * 60 * 1000),
            lt: new Date(now.getTime() - range.minDays * 24 * 60 * 60 * 1000),
          };
        }

        const counts = await prisma.vulnerability.groupBy({
          by: ['severity'],
          where,
          _count: true,
        });

        const severityMap = counts.reduce(
          (acc, c) => {
            acc[c.severity.toLowerCase()] = c._count;
            return acc;
          },
          { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>
        );

        return {
          date: range.label,
          critical: severityMap.critical,
          high: severityMap.high,
          medium: severityMap.medium,
          low: severityMap.low,
        };
      })
    );

    return results;
  }

  /**
   * Get vulnerability counts by discovered date ranges
   */
  async getVulnerabilityByDiscoveredDate(): Promise<VulnerabilityByDate[]> {
    const now = new Date();
    const ranges = [
      { label: '< 30 days', maxDays: 30 },
      { label: '30-60 days', minDays: 30, maxDays: 60 },
      { label: '60-90 days', minDays: 60, maxDays: 90 },
      { label: '> 90 days', minDays: 90 },
    ];

    const results = await Promise.all(
      ranges.map(async (range) => {
        const where: Prisma.AssetVulnerabilityWhereInput = {};

        if (range.maxDays && !range.minDays) {
          where.detectedAt = {
            gte: new Date(now.getTime() - range.maxDays * 24 * 60 * 60 * 1000),
          };
        } else if (range.minDays && !range.maxDays) {
          where.detectedAt = {
            lt: new Date(now.getTime() - range.minDays * 24 * 60 * 60 * 1000),
          };
        } else if (range.minDays && range.maxDays) {
          where.detectedAt = {
            gte: new Date(now.getTime() - range.maxDays * 24 * 60 * 60 * 1000),
            lt: new Date(now.getTime() - range.minDays * 24 * 60 * 60 * 1000),
          };
        }

        // Get vulnerabilities with their severity
        const assetVulns = await prisma.assetVulnerability.findMany({
          where,
          include: {
            vulnerability: { select: { severity: true } },
          },
        });

        const severityMap = assetVulns.reduce(
          (acc, av) => {
            const severity = av.vulnerability.severity.toLowerCase();
            acc[severity] = (acc[severity] || 0) + 1;
            return acc;
          },
          { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>
        );

        return {
          date: range.label,
          critical: severityMap.critical,
          high: severityMap.high,
          medium: severityMap.medium,
          low: severityMap.low,
        };
      })
    );

    return results;
  }

  /**
   * Get vulnerability severity table by date range
   */
  async getVulnerabilityByPublishedDateTable(): Promise<VulnerabilityByDateTable[]> {
    return this.getVulnerabilityByPublishedDate().then((data) =>
      data.map((d) => ({
        dateRange: d.date,
        critical: d.critical,
        high: d.high,
        medium: d.medium,
        low: d.low,
      }))
    );
  }

  /**
   * Get top vulnerabilities by CVSS and EPSS
   */
  async getTopVulnerabilities(limit: number = 10): Promise<TopVulnerabilities> {
    const [byCVSS, byEPSS] = await Promise.all([
      // Top by CVSS score
      prisma.vulnerability.findMany({
        where: { cvss3BaseScore: { not: null } },
        orderBy: { cvss3BaseScore: 'desc' },
        take: limit,
        include: {
          affectedAssets: { select: { id: true } },
        },
      }),
      // Top by EPSS score
      prisma.vulnerability.findMany({
        where: { epss: { not: null } },
        orderBy: { epss: 'desc' },
        take: limit,
        include: {
          affectedAssets: { select: { id: true } },
        },
      }),
    ]);

    const mapToTopVuln = (v: {
      cveId: string;
      cvss3BaseScore: number | null;
      epss: number | null;
      severity: string;
      title: string;
      affectedAssets: { id: string }[];
    }): TopVulnerability => ({
      cve: v.cveId,
      score: v.cvss3BaseScore ?? v.epss ?? 0,
      affectedEndpoints: v.affectedAssets.length,
      severity: v.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
      description: v.title,
    });

    return {
      byCVSS: byCVSS.map(mapToTopVuln),
      byEPSS: byEPSS.map((v) => ({
        ...mapToTopVuln(v),
        score: v.epss ?? 0,
      })),
    };
  }

  /**
   * Get patch compliance summary
   */
  async getPatchCompliance(): Promise<PatchCompliance> {
    const [compliant, nonCompliant, pending] = await Promise.all([
      // Assets with all patches applied
      prisma.asset.count({
        where: {
          patchTasks: {
            every: {
              status: 'completed',
            },
          },
        },
      }),
      // Assets with failed patches
      prisma.asset.count({
        where: {
          patchTasks: {
            some: {
              status: 'failed',
            },
          },
        },
      }),
      // Assets with pending patches
      prisma.asset.count({
        where: {
          patchTasks: {
            some: {
              status: 'pending',
            },
          },
        },
      }),
    ]);

    return { compliant, nonCompliant, pending };
  }

  /**
   * Get recent activity summary
   */
  async getRecentActivity(): Promise<RecentActivity> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [patchesDeployed, patchesFailed, endpointsScanned, lastScan] = await Promise.all([
      // Patches deployed in last 24 hours
      prisma.patchDeploymentTask.count({
        where: {
          status: 'completed',
          completedAt: { gte: oneDayAgo },
        },
      }),
      // Patches failed in last 24 hours
      prisma.patchDeploymentTask.count({
        where: {
          status: 'failed',
          completedAt: { gte: oneDayAgo },
        },
      }),
      // Endpoints scanned (based on jobs)
      prisma.job.count({
        where: {
          type: 'vulnerability_scan',
          status: 'completed',
          completedAt: { gte: oneDayAgo },
        },
      }),
      // Last scan time
      prisma.job.findFirst({
        where: {
          type: 'vulnerability_scan',
          status: 'completed',
        },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
    ]);

    return {
      patchesDeployed,
      patchesFailed,
      endpointsScanned,
      lastScanTime: lastScan?.completedAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Get expired certificates by platform (placeholder - needs certificate data)
   */
  async getExpiredCertificates(): Promise<DistributionItem[]> {
    // This would need a certificates table in a real implementation
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get malicious processes by platform (placeholder - needs process monitoring data)
   */
  async getMaliciousProcessesByPlatform(): Promise<DistributionItem[]> {
    // This would need a processes/security alerts table
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get total software count by platform
   */
  async getTotalSoftwareByPlatform(): Promise<DistributionItem[]> {
    const result = await prisma.asset.findMany({
      where: { os: { not: null } },
      select: {
        os: true,
        software: { select: { id: true } },
      },
    });

    const platformCounts = result.reduce(
      (acc, asset) => {
        const os = this.normalizeOS(asset.os || '');
        acc[os] = (acc[os] || 0) + asset.software.length;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(platformCounts).map(([name, value]) => ({
      name,
      value,
    }));
  }

  /**
   * Get risk score by endpoints
   */
  async getRiskScoreByEndpoints(limit: number = 10): Promise<DistributionItem[]> {
    // Calculate risk score based on vulnerabilities
    const assets = await prisma.asset.findMany({
      take: limit,
      include: {
        vulnerabilities: {
          include: {
            vulnerability: { select: { severity: true, riskScore: true } },
          },
        },
      },
    });

    return assets.map((asset) => {
      // Calculate aggregate risk score
      const vulnScores = asset.vulnerabilities.map((av) => {
        const severity = av.vulnerability.severity;
        // Weight by severity
        const weight =
          severity === 'CRITICAL' ? 10 : severity === 'HIGH' ? 7 : severity === 'MEDIUM' ? 4 : 1;
        return av.vulnerability.riskScore || weight;
      });

      const avgScore =
        vulnScores.length > 0
          ? Math.min(10, vulnScores.reduce((a, b) => a + b, 0) / vulnScores.length)
          : 0;

      return {
        name: asset.name,
        value: Math.round(avgScore * 10) / 10,
      };
    });
  }

  /**
   * Get alert count by severity
   */
  async getAlertCountBySeverity(): Promise<{ severity: string; count: number }[]> {
    const counts = await prisma.vulnerability.groupBy({
      by: ['severity'],
      _count: true,
    });

    return counts.map((c) => ({
      severity: this.normalizeSeverity(c.severity),
      count: c._count,
    }));
  }

  /**
   * Get alert severity count by platform
   */
  async getAlertSeverityCountByPlatform(): Promise<AlertSeverityByPlatform[]> {
    const assets = await prisma.asset.findMany({
      where: { os: { not: null } },
      select: {
        os: true,
        vulnerabilities: {
          include: {
            vulnerability: { select: { severity: true } },
          },
        },
      },
    });

    const platformStats: Record<string, AlertSeverityByPlatform> = {};

    assets.forEach((asset) => {
      const platform = asset.os || 'Unknown';
      if (!platformStats[platform]) {
        platformStats[platform] = { platform, critical: 0, high: 0, medium: 0, low: 0 };
      }

      asset.vulnerabilities.forEach((av) => {
        const severity = av.vulnerability.severity.toLowerCase();
        if (severity === 'critical') platformStats[platform].critical++;
        else if (severity === 'high') platformStats[platform].high++;
        else if (severity === 'medium') platformStats[platform].medium++;
        else if (severity === 'low') platformStats[platform].low++;
      });
    });

    return Object.values(platformStats);
  }

  /**
   * Get day-wise vulnerability detection
   */
  async getDayWiseVulnerabilityDetection(): Promise<DayWiseVulnerability[]> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ];

    const detections = await prisma.assetVulnerability.findMany({
      where: { detectedAt: { gte: oneWeekAgo } },
      select: { detectedAt: true },
    });

    const dayCounts = detections.reduce(
      (acc, d) => {
        const dayIndex = d.detectedAt.getDay();
        const day = days[dayIndex];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return days.slice(1).concat(days[0]).map((day) => ({
      day: day as DayWiseVulnerability['day'],
      count: dayCounts[day] || 0,
    }));
  }

  /**
   * Get alert severity count by module
   */
  async getAlertSeverityCountByModule(): Promise<AlertSeverityByModule[]> {
    // Group by software/product
    const vulns = await prisma.vulnerability.findMany({
      include: {
        affectedSoftware: { select: { name: true } },
      },
    });

    const moduleStats: Record<string, AlertSeverityByModule> = {};

    vulns.forEach((vuln) => {
      vuln.affectedSoftware.forEach((sw) => {
        const module = sw.name;
        if (!moduleStats[module]) {
          moduleStats[module] = { module, critical: 0, high: 0, medium: 0 };
        }

        const severity = vuln.severity.toLowerCase();
        if (severity === 'critical') moduleStats[module].critical++;
        else if (severity === 'high') moduleStats[module].high++;
        else if (severity === 'medium') moduleStats[module].medium++;
      });
    });

    // Return top 10 by total count
    return Object.values(moduleStats)
      .sort((a, b) => b.critical + b.high + b.medium - (a.critical + a.high + a.medium))
      .slice(0, 10);
  }

  /**
   * Get patch distribution chart data
   */
  async getPatchChartData(params: ChartQueryParams): Promise<ChartData> {
    const groupBy = params.groupBy || 'severity';

    let data: { label: string; count: number }[] = [];

    switch (groupBy) {
      case 'severity':
        const bySeverity = await prisma.patch.groupBy({
          by: ['severity'],
          _count: true,
        });
        data = bySeverity.map((s) => ({
          label: s.severity,
          count: s._count,
        }));
        break;

      case 'os':
        const byOs = await prisma.patch.groupBy({
          by: ['os'],
          where: { os: { not: null } },
          _count: true,
        });
        data = byOs.map((o) => ({
          label: o.os || 'Unknown',
          count: o._count,
        }));
        break;

      case 'status':
        const byStatus = await prisma.patch.groupBy({
          by: ['approvalStatus'],
          _count: true,
        });
        data = byStatus.map((s) => ({
          label: s.approvalStatus,
          count: s._count,
        }));
        break;
    }

    return {
      labels: data.map((d) => d.label),
      data: data.map((d) => d.count),
      colors: data.map((d) => SEVERITY_COLORS[d.label] || OS_COLORS.default),
    };
  }

  /**
   * Get asset status chart data
   */
  async getAssetChartData(): Promise<ChartData> {
    const byStatus = await prisma.asset.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      labels: byStatus.map((s) => s.status),
      data: byStatus.map((s) => s._count),
      colors: byStatus.map(() => '#5B8FF9'),
    };
  }

  /**
   * Get vulnerability trends chart data
   */
  async getVulnerabilityChartData(): Promise<ChartData> {
    const bySeverity = await prisma.vulnerability.groupBy({
      by: ['severity'],
      _count: true,
    });

    return {
      labels: bySeverity.map((s) => s.severity),
      data: bySeverity.map((s) => s._count),
      colors: bySeverity.map((s) => SEVERITY_COLORS[s.severity] || OS_COLORS.default),
    };
  }

  /**
   * Get agent connectivity data
   */
  async getAgentConnectivity(): Promise<{ status: string; count: number }[]> {
    const result = await prisma.agent.groupBy({
      by: ['status'],
      _count: true,
    });

    return result.map((r) => ({
      status: r.status,
      count: r._count,
    }));
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivityFeed(limit: number = 20): Promise<
    {
      type: string;
      description: string;
      timestamp: string;
      user?: string;
    }[]
  > {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { user: { select: { name: true, email: true } } },
    });

    return logs.map((log) => ({
      type: log.action,
      description: this.formatActivityDescription(log),
      timestamp: log.timestamp.toISOString(),
      user: log.user?.name || log.user?.email,
    }));
  }

  // ==================== Helper Methods ====================

  private normalizeSeverity(severity: string): string {
    const normalized = severity.toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private normalizeOS(os: string): string {
    const lower = os.toLowerCase();
    if (lower.includes('windows')) return 'Windows';
    if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('centos')) {
      return 'Linux';
    }
    if (lower.includes('mac')) return 'macOS';
    return 'Other';
  }

  private getOsColor(os: string): string {
    for (const [key, color] of Object.entries(OS_COLORS)) {
      if (os.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }
    return OS_COLORS.default;
  }

  private formatActivityDescription(log: {
    action: string;
    resource: string;
    resourceId: string | null;
  }): string {
    switch (log.action) {
      case 'CREATE':
        return `Created ${log.resource} ${log.resourceId || ''}`;
      case 'UPDATE':
        return `Updated ${log.resource} ${log.resourceId || ''}`;
      case 'DELETE':
        return `Deleted ${log.resource} ${log.resourceId || ''}`;
      case 'LOGIN':
        return 'User logged in';
      case 'LOGOUT':
        return 'User logged out';
      default:
        return `${log.action} on ${log.resource}`;
    }
  }
}

export const dashboardService = new DashboardService();
