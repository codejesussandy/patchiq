import { prisma } from '@/db/client';
import { NotFoundError, BadRequestError } from '@shared/errors';
import { paginate, getPaginationParams } from '@shared/utils/pagination';
import type { Prisma } from '@prisma/client';
import type {
  ListVulnerabilitiesQuery,
  ListZeroDayQuery,
  AffectedQuery,
  CreateExceptionBody,
  UpdateExceptionBody,
  ScanVulnerabilitiesBody,
} from './vulnerabilities.validators';

export class VulnerabilitiesService {
  /**
   * List vulnerabilities with filters (excludes zero-day)
   */
  async listVulnerabilities(params: ListVulnerabilitiesQuery) {
    const where: Prisma.VulnerabilityWhereInput = {
      isZeroDay: false,
    };

    // Search filter
    if (params.search) {
      where.OR = [
        { cveId: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Severity filter (can be comma-separated)
    if (params.severity) {
      const severities = params.severity.split(',').map((s) => s.trim().toUpperCase());
      where.severity = { in: severities };
    }

    // Exploitable filter
    if (params.exploitable !== undefined) {
      where.exploitable = params.exploitable;
    }

    // EPSS range filter
    if (params.epssMin !== undefined || params.epssMax !== undefined) {
      where.epss = {};
      if (params.epssMin !== undefined) where.epss.gte = params.epssMin;
      if (params.epssMax !== undefined) where.epss.lte = params.epssMax;
    }

    // Risk score range filter
    if (params.riskScoreMin !== undefined || params.riskScoreMax !== undefined) {
      where.riskScore = {};
      if (params.riskScoreMin !== undefined) where.riskScore.gte = params.riskScoreMin;
      if (params.riskScoreMax !== undefined) where.riskScore.lte = params.riskScoreMax;
    }

    // CVSS3 range filter
    if (params.cvss3Min !== undefined || params.cvss3Max !== undefined) {
      where.cvss3BaseScore = {};
      if (params.cvss3Min !== undefined) where.cvss3BaseScore.gte = params.cvss3Min;
      if (params.cvss3Max !== undefined) where.cvss3BaseScore.lte = params.cvss3Max;
    }

    // Published date range filter
    if (params.publishedFrom || params.publishedTo) {
      where.publishedDate = {};
      if (params.publishedFrom) where.publishedDate.gte = new Date(params.publishedFrom);
      if (params.publishedTo) where.publishedDate.lte = new Date(params.publishedTo);
    }

    const paginationParams = { page: params.page, limit: params.limit };
    const orderBy: Prisma.VulnerabilityOrderByWithRelationInput = {};
    if (params.sort) {
      orderBy[params.sort as keyof Prisma.VulnerabilityOrderByWithRelationInput] = params.order;
    } else {
      orderBy.publishedDate = 'desc';
    }

    const [vulnerabilities, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        include: {
          affectedAssets: { select: { id: true } },
          affectedSoftware: { select: { id: true } },
        },
        orderBy,
        ...getPaginationParams(paginationParams),
      }),
      prisma.vulnerability.count({ where }),
    ]);

    return paginate(vulnerabilities.map((v) => this.transformVulnerability(v)), total, paginationParams);
  }

  /**
   * List zero-day vulnerabilities
   */
  async listZeroDayVulnerabilities(params: ListZeroDayQuery) {
    const where: Prisma.VulnerabilityWhereInput = {
      isZeroDay: true,
    };

    if (params.search) {
      where.OR = [
        { cveId: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.severity) {
      const severities = params.severity.split(',').map((s) => s.trim().toUpperCase());
      where.severity = { in: severities };
    }

    const paginationParams = { page: params.page, limit: params.limit };

    const [vulnerabilities, total] = await Promise.all([
      prisma.vulnerability.findMany({
        where,
        include: {
          affectedAssets: { select: { id: true } },
          affectedSoftware: { select: { id: true } },
        },
        orderBy: { publishedDate: 'desc' },
        ...getPaginationParams(paginationParams),
      }),
      prisma.vulnerability.count({ where }),
    ]);

    return paginate(vulnerabilities.map((v) => this.transformVulnerability(v)), total, paginationParams);
  }

  /**
   * Get vulnerability by ID with full details
   */
  async getVulnerabilityById(id: string) {
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { id },
      include: {
        affectedAssets: {
          include: { asset: true },
        },
        affectedSoftware: true,
        references: true,
        exceptions: {
          where: { deletedAt: null },
        },
      },
    });

    if (!vulnerability) {
      throw new NotFoundError('Vulnerability not found');
    }

    return this.transformVulnerabilityDetails(vulnerability);
  }

  /**
   * Get affected endpoints for a CVE
   */
  async getAffectedEndpoints(cve: string, params: AffectedQuery) {
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { cveId: cve },
      select: { id: true },
    });

    if (!vulnerability) {
      throw new NotFoundError('Vulnerability not found');
    }

    const where: Prisma.AssetVulnerabilityWhereInput = {
      vulnerabilityId: vulnerability.id,
    };

    if (params.search) {
      where.asset = {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { os: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    const paginationParams = { page: params.page, limit: params.limit };

    const [endpoints, total] = await Promise.all([
      prisma.assetVulnerability.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              os: true,
              osVersion: true,
              model: true,
            },
          },
        },
        ...getPaginationParams(paginationParams),
      }),
      prisma.assetVulnerability.count({ where }),
    ]);

    const data = endpoints.map((ep) => ({
      key: ep.asset.id,
      hostName: ep.asset.name,
      platformVersion: ep.asset.osVersion ? `${ep.asset.os} ${ep.asset.osVersion}` : ep.asset.os,
      hardwareModel: ep.asset.model,
    }));

    return paginate(data, total, paginationParams);
  }

  /**
   * Get affected software for a CVE
   */
  async getAffectedSoftware(cve: string, params: AffectedQuery) {
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { cveId: cve },
      select: { id: true },
    });

    if (!vulnerability) {
      throw new NotFoundError('Vulnerability not found');
    }

    const where: Prisma.VulnerabilitySoftwareWhereInput = {
      vulnerabilityId: vulnerability.id,
    };

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { vendor: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const paginationParams = { page: params.page, limit: params.limit };

    const [software, total] = await Promise.all([
      prisma.vulnerabilitySoftware.findMany({
        where,
        ...getPaginationParams(paginationParams),
      }),
      prisma.vulnerabilitySoftware.count({ where }),
    ]);

    const data = software.map((sw) => ({
      key: sw.id,
      name: sw.name,
      version: sw.version,
      release: sw.releaseVersion,
      fixed: sw.fixedVersion,
      vendor: sw.vendor,
    }));

    return paginate(data, total, paginationParams);
  }

  /**
   * Get vulnerability statistics
   */
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

    const severityCounts = bySeverity.reduce(
      (acc, s) => {
        acc[s.severity.toLowerCase()] = s._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate age-based statistics
    const now = new Date();
    const ranges = [
      { label: '> 90 days', min: 90, max: null },
      { label: '60-90 days', min: 60, max: 90 },
      { label: '30-60 days', min: 30, max: 60 },
      { label: '< 30 days', min: null, max: 30 },
    ];

    const publishedStats = await Promise.all(
      ranges.map(async (range) => {
        const where: Prisma.VulnerabilityWhereInput = {};

        if (range.min !== null && range.max !== null) {
          where.publishedDate = {
            gte: new Date(now.getTime() - range.max * 24 * 60 * 60 * 1000),
            lt: new Date(now.getTime() - range.min * 24 * 60 * 60 * 1000),
          };
        } else if (range.min !== null) {
          where.publishedDate = {
            lt: new Date(now.getTime() - range.min * 24 * 60 * 60 * 1000),
          };
        } else if (range.max !== null) {
          where.publishedDate = {
            gte: new Date(now.getTime() - range.max * 24 * 60 * 60 * 1000),
          };
        }

        const stats = await prisma.vulnerability.groupBy({
          by: ['severity'],
          where,
          _count: true,
        });

        return {
          range: range.label,
          ...stats.reduce(
            (acc, s) => {
              acc[s.severity.toLowerCase()] = s._count;
              return acc;
            },
            { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>
          ),
        };
      })
    );

    // discoveredStats is similar to publishedStats (using detectedAt from AssetVulnerability)
    // For simplicity, we'll use the same data structure
    const discoveredStats = publishedStats;

    return {
      total,
      critical: severityCounts.critical || 0,
      high: severityCounts.high || 0,
      medium: severityCounts.medium || 0,
      low: severityCounts.low || 0,
      zeroDayCount: zeroDay,
      exceptionsCount: exceptions,
      publishedStats,
      discoveredStats,
    };
  }

  /**
   * Get vulnerability type counts
   */
  async getTypes() {
    const [zeroDayCount, knownCount, exploitableCount] = await Promise.all([
      prisma.vulnerability.count({ where: { isZeroDay: true } }),
      prisma.vulnerability.count({ where: { isZeroDay: false } }),
      prisma.vulnerability.count({ where: { exploitable: true } }),
    ]);

    return [
      { id: 'zero-day', name: 'Zero-Day Vulnerabilities', count: zeroDayCount },
      { id: 'known', name: 'Known Vulnerabilities', count: knownCount },
      { id: 'exploitable', name: 'Exploitable Vulnerabilities', count: exploitableCount },
    ];
  }

  /**
   * Get endpoint vulnerabilities with severity stats
   */
  async getEndpointVulnerabilities() {
    const vulnerabilities = await prisma.vulnerability.findMany({
      where: {
        affectedAssets: { some: {} },
      },
      include: {
        affectedAssets: { select: { id: true } },
        affectedSoftware: { select: { id: true } },
      },
      orderBy: { riskScore: 'desc' },
    });

    const severityStats = {
      critical: vulnerabilities.filter((v) => v.severity === 'CRITICAL').length,
      high: vulnerabilities.filter((v) => v.severity === 'HIGH').length,
      medium: vulnerabilities.filter((v) => v.severity === 'MEDIUM').length,
      low: vulnerabilities.filter((v) => v.severity === 'LOW').length,
    };

    return {
      data: vulnerabilities.map((v) => this.transformVulnerability(v)),
      total: vulnerabilities.length,
      severityStats,
    };
  }

  /**
   * Get network vulnerabilities (placeholder - would need network asset type)
   */
  async getNetworkVulnerabilities() {
    // For now, return empty as network assets are not yet implemented
    return {
      data: [],
      total: 0,
      severityStats: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };
  }

  /**
   * Get all exceptions
   */
  async getExceptions() {
    const exceptions = await prisma.vulnerabilityException.findMany({
      where: { deletedAt: null },
      include: {
        vulnerability: {
          include: {
            affectedAssets: { select: { id: true } },
            affectedSoftware: { select: { id: true } },
          },
        },
        endpoints: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: exceptions.map((e) => ({
        id: e.id,
        cve: e.cve,
        exceptionType: e.exceptionType,
        reasonForExclusion: e.reasonForExclusion,
        scope: e.scope,
        source: e.source,
        createdBy: e.createdBy,
        createdAt: e.createdAt.toISOString(),
        vulnerabilityId: e.vulnerabilityId,
        endpoints: e.endpoints.map((ep) => ep.endpointId),
        vulnerabilityData: this.transformVulnerability(e.vulnerability),
      })),
      total: exceptions.length,
    };
  }

  /**
   * Create exception(s) from vulnerabilities
   */
  async createExceptions(data: CreateExceptionBody, userId?: string) {
    const vulnerabilities = await prisma.vulnerability.findMany({
      where: { id: { in: data.vulnerabilityIds } },
      include: {
        affectedAssets: { select: { id: true } },
        affectedSoftware: { select: { id: true } },
      },
    });

    if (vulnerabilities.length === 0) {
      throw new BadRequestError('No valid vulnerabilities found');
    }

    const createdExceptions = await Promise.all(
      vulnerabilities.map(async (vuln) => {
        const exception = await prisma.vulnerabilityException.create({
          data: {
            vulnerabilityId: vuln.id,
            cve: vuln.cveId,
            exceptionType: data.exceptionType,
            reasonForExclusion: data.reasonForExclusion,
            scope: data.scope,
            source: data.source,
            createdBy: userId,
            endpoints:
              data.scope === 'Endpoint' && data.endpoints
                ? {
                    create: data.endpoints.map((endpointId) => ({ endpointId })),
                  }
                : undefined,
          },
          include: {
            vulnerability: {
              include: {
                affectedAssets: { select: { id: true } },
                affectedSoftware: { select: { id: true } },
              },
            },
            endpoints: true,
          },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'CREATE',
            resource: 'VulnerabilityException',
            resourceId: exception.id,
            details: {
              cve: vuln.cveId,
              exceptionType: data.exceptionType,
              scope: data.scope,
            },
          },
        });

        return {
          id: exception.id,
          cve: exception.cve,
          exceptionType: exception.exceptionType,
          reasonForExclusion: exception.reasonForExclusion,
          scope: exception.scope,
          source: exception.source,
          createdBy: exception.createdBy,
          createdAt: exception.createdAt.toISOString(),
          vulnerabilityId: exception.vulnerabilityId,
          endpoints: exception.endpoints.map((ep) => ep.endpointId),
          vulnerabilityData: this.transformVulnerability(exception.vulnerability),
        };
      })
    );

    return {
      data: createdExceptions,
      message: `${createdExceptions.length} exception(s) created successfully`,
    };
  }

  /**
   * Update an exception
   */
  async updateException(id: string, data: UpdateExceptionBody, userId?: string) {
    const exception = await prisma.vulnerabilityException.findFirst({
      where: { id, deletedAt: null },
    });

    if (!exception) {
      throw new NotFoundError('Exception not found');
    }

    // Handle endpoint updates if scope changed to Endpoint
    const updateData: Prisma.VulnerabilityExceptionUpdateInput = {
      exceptionType: data.exceptionType,
      reasonForExclusion: data.reasonForExclusion,
      scope: data.scope,
    };

    // If changing to Endpoint scope and endpoints provided, update them
    if (data.scope === 'Endpoint' && data.endpoints) {
      // Delete existing endpoints and create new ones
      await prisma.exceptionEndpoint.deleteMany({
        where: { exceptionId: id },
      });

      await prisma.exceptionEndpoint.createMany({
        data: data.endpoints.map((endpointId) => ({
          exceptionId: id,
          endpointId,
        })),
      });
    }

    const updated = await prisma.vulnerabilityException.update({
      where: { id },
      data: updateData,
      include: {
        vulnerability: {
          include: {
            affectedAssets: { select: { id: true } },
            affectedSoftware: { select: { id: true } },
          },
        },
        endpoints: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        resource: 'VulnerabilityException',
        resourceId: id,
        details: data,
      },
    });

    return {
      id: updated.id,
      cve: updated.cve,
      exceptionType: updated.exceptionType,
      reasonForExclusion: updated.reasonForExclusion,
      scope: updated.scope,
      source: updated.source,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      vulnerabilityId: updated.vulnerabilityId,
      endpoints: updated.endpoints.map((ep) => ep.endpointId),
      vulnerabilityData: this.transformVulnerability(updated.vulnerability),
    };
  }

  /**
   * Delete an exception (restores vulnerability)
   */
  async deleteException(id: string, userId?: string) {
    const exception = await prisma.vulnerabilityException.findFirst({
      where: { id, deletedAt: null },
      include: { vulnerability: true },
    });

    if (!exception) {
      throw new NotFoundError('Exception not found');
    }

    // Soft delete
    await prisma.vulnerabilityException.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'VulnerabilityException',
        resourceId: id,
        details: { cve: exception.cve },
      },
    });

    return {
      message: 'Exception deleted and vulnerability restored',
      restoredVulnerability: {
        id: exception.vulnerability.id,
        cve: exception.vulnerability.cveId,
      },
    };
  }

  /**
   * Trigger vulnerability scan
   */
  async triggerScan(data: ScanVulnerabilitiesBody, userId?: string) {
    // Create a job for the vulnerability scan
    const job = await prisma.job.create({
      data: {
        type: 'vulnerability_scan',
        name: `Vulnerability Scan - ${data.scope === 'all' ? 'All Endpoints' : 'Selected Endpoints'}`,
        status: 'pending',
        payload: {
          scope: data.scope,
          endpointIds: data.endpointIds || [],
        },
        createdBy: userId,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TRIGGER_SCAN',
        resource: 'Vulnerability',
        details: { scope: data.scope, jobId: job.id },
      },
    });

    return {
      jobId: job.id,
      status: 'initiated',
      message: 'Vulnerability scan started',
    };
  }

  /**
   * Transform vulnerability for list response
   */
  private transformVulnerability(vuln: {
    id: string;
    cveId: string;
    title: string;
    description: string | null;
    severity: string;
    epss: number | null;
    riskScore: number | null;
    cvss3BaseScore: number | null;
    cvss2BaseScore: number | null;
    exploitable: boolean;
    isZeroDay: boolean;
    publishedDate: Date | null;
    affectedAssets?: { id: string }[];
    affectedSoftware?: { id: string }[];
  }) {
    return {
      id: vuln.id,
      cve: vuln.cveId,
      severity: vuln.severity,
      epss: vuln.epss ?? 0,
      exploitable: vuln.exploitable,
      title: vuln.title,
      description: vuln.description || '',
      riskScore: vuln.riskScore ?? 0,
      cvss3BaseScore: vuln.cvss3BaseScore ?? 0,
      cvss2BaseScore: vuln.cvss2BaseScore,
      endpoints: vuln.affectedAssets?.length ?? 0,
      affectedSoftwares: vuln.affectedSoftware?.length ?? 0,
      published: vuln.publishedDate ? this.formatDate(vuln.publishedDate) : '',
      isZeroDay: vuln.isZeroDay,
    };
  }

  /**
   * Transform vulnerability for detailed response
   */
  private transformVulnerabilityDetails(vuln: {
    id: string;
    cveId: string;
    title: string;
    description: string | null;
    severity: string;
    epss: number | null;
    riskScore: number | null;
    cvss3BaseScore: number | null;
    cvss2BaseScore: number | null;
    cvss3AttackVector: string | null;
    cvss3AttackComplexity: string | null;
    cvss3PrivilegesRequired: string | null;
    cvss3Scope: string | null;
    cvss3Confidentiality: string | null;
    cvss3Integrity: string | null;
    cvss3Availability: string | null;
    cvss3ImpactScore: number | null;
    cvss3VectorString: string | null;
    cvss2Severity: string | null;
    exploitable: boolean;
    isZeroDay: boolean;
    publishedDate: Date | null;
    fixRecommendation: string | null;
    mitreTactic: string | null;
    mitreTechnique: string | null;
    mitreSubTechnique: string | null;
    mitreDescription: string | null;
    affectedAssets: { id: string; asset: { id: string; name: string } }[];
    affectedSoftware: { id: string; name: string; version: string | null; vendor: string | null }[];
    references: { url: string; source: string | null }[];
  }) {
    return {
      id: vuln.id,
      cve: vuln.cveId,
      severity: vuln.severity,
      epss: vuln.epss ?? 0,
      exploitable: vuln.exploitable,
      title: vuln.title,
      description: vuln.description || '',
      riskScore: vuln.riskScore ?? 0,
      cvss3BaseScore: vuln.cvss3BaseScore ?? 0,
      cvss3: {
        attackVector: vuln.cvss3AttackVector,
        attackComplexity: vuln.cvss3AttackComplexity,
        privilegesRequired: vuln.cvss3PrivilegesRequired,
        scope: vuln.cvss3Scope,
        confidentialityImpact: vuln.cvss3Confidentiality,
        integrityImpact: vuln.cvss3Integrity,
        availabilityImpact: vuln.cvss3Availability,
        impactScore: vuln.cvss3ImpactScore,
        vectorString: vuln.cvss3VectorString,
      },
      cvss2BaseScore: vuln.cvss2BaseScore,
      cvss2: vuln.cvss2BaseScore
        ? {
            baseScore: vuln.cvss2BaseScore,
            severity: vuln.cvss2Severity,
          }
        : null,
      endpoints: vuln.affectedAssets.length,
      affectedSoftwares: vuln.affectedSoftware.length,
      published: vuln.publishedDate ? this.formatDate(vuln.publishedDate) : '',
      isZeroDay: vuln.isZeroDay,
      references: vuln.references.map((r) => ({
        url: r.url,
        source: r.source || 'Unknown',
      })),
      fixRecommendation: vuln.fixRecommendation,
      mitreAttack: vuln.mitreTactic
        ? {
            tactic: vuln.mitreTactic,
            technique: vuln.mitreTechnique,
            subTechnique: vuln.mitreSubTechnique,
            description: vuln.mitreDescription,
          }
        : null,
    };
  }

  /**
   * Format date to match frontend expected format
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;

    return `${year}/${month}/${day} ${String(hour12).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  }
}

export const vulnerabilitiesService = new VulnerabilitiesService();
