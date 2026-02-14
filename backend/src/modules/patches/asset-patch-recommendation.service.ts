/**
 * Asset Patch Recommendation Service
 *
 * Manages patch recommendations for assets based on detected vulnerabilities.
 * Computes recommendations during vulnerability scans and tracks the full lifecycle:
 * recommended → accepted → rejected → deployed → verified → failed
 */

import type { AssetPatchRecommendation, Prisma } from '@prisma/client';
import { prisma } from '@/db/client';

/**
 * Query parameters for listing recommendations
 */
export interface ListRecommendationsParams {
  assetId?: string;
  patchId?: string;
  status?: string;
  severity?: string[];
  sortBy?: 'riskScore' | 'severity' | 'recommendedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalRecommendations: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalAssets: number;
  topVulnerabilities: Array<{
    cveId: string;
    affectedAssets: number;
    severity: string;
  }>;
}

/**
 * Asset Patch Recommendation Service
 */
class AssetPatchRecommendationService {
  /**
   * Create recommendations for a vulnerability detected on an asset
   *
   * Finds all approved patches that fix this vulnerability and creates
   * recommendations if they don't already exist.
   *
   * @param assetId - Asset ID
   * @param vulnerabilityId - Vulnerability ID
   * @param software - Software information
   */
  async createRecommendationsForVulnerability(
    assetId: string,
    vulnerabilityId: string,
    software: { name: string; version: string | null }
  ): Promise<AssetPatchRecommendation[]> {
    // Get vulnerability details for scoring
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { id: vulnerabilityId },
      select: {
        id: true,
        cveId: true,
        title: true,
        severity: true,
        cvss3BaseScore: true,
        epss: true,
        exploitable: true,
      },
    });

    if (!vulnerability) {
      return [];
    }

    // Find approved patches that fix this CVE
    const fixingPatches = await prisma.patch.findMany({
      where: {
        cveNumbers: { has: vulnerability.cveId },
        approvalStatus: 'Approved',
      },
      select: { id: true, patchId: true, supersededBy: true },
    });

    // Filter out superseded patches — only recommend the latest non-superseded patch(es)
    const nonSupersededPatches = fixingPatches.filter(
      (patch) => patch.supersededBy.length === 0
    );

    const created: AssetPatchRecommendation[] = [];

    for (const patch of nonSupersededPatches) {
      // Check if recommendation already exists
      const existing = await prisma.assetPatchRecommendation.findUnique({
        where: {
          assetId_vulnerabilityId_patchId: {
            assetId,
            vulnerabilityId,
            patchId: patch.id,
          },
        },
      });

      if (!existing) {
        const riskScore = this.calculateRiskScore(vulnerability);

        const recommendation = await prisma.assetPatchRecommendation.create({
          data: {
            assetId,
            vulnerabilityId,
            patchId: patch.id,
            status: 'RECOMMENDED',
            severity: vulnerability.severity,
            cvssScore: vulnerability.cvss3BaseScore,
            epssScore: vulnerability.epss,
            riskScore,
            reason: `Fixes ${vulnerability.cveId}: ${vulnerability.title?.slice(0, 100) || 'Vulnerability'}`,
            affectedSoftware: `${software.name} ${software.version || ''}`.trim(),
          },
        });

        created.push(recommendation);
      }
    }

    return created;
  }

  /**
   * List recommendations with filtering and pagination
   *
   * @param params - Query parameters
   * @returns Paginated list of recommendations with total count
   */
  async listRecommendations(
    params: ListRecommendationsParams
  ): Promise<{ data: AssetPatchRecommendation[]; total: number }> {
    const {
      assetId,
      patchId,
      status,
      severity,
      sortBy = 'riskScore',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = params;

    const where: Prisma.AssetPatchRecommendationWhereInput = {};

    if (assetId) where.assetId = assetId;
    if (patchId) where.patchId = patchId;
    if (status) where.status = status;
    if (severity && severity.length > 0) {
      where.severity = { in: severity };
    }

    const orderBy: Prisma.AssetPatchRecommendationOrderByWithRelationInput = {};
    if (sortBy === 'riskScore') {
      orderBy.riskScore = sortOrder;
    } else if (sortBy === 'severity') {
      orderBy.severity = sortOrder;
    } else if (sortBy === 'recommendedAt') {
      orderBy.recommendedAt = sortOrder;
    }

    const [data, total] = await Promise.all([
      prisma.assetPatchRecommendation.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              os: true,
              hostname: true,
            },
          },
          vulnerability: {
            select: {
              id: true,
              cveId: true,
              title: true,
              severity: true,
              cvss3BaseScore: true,
            },
          },
          patch: {
            select: {
              id: true,
              patchId: true,
              title: true,
              severity: true,
            },
          },
        },
      }),
      prisma.assetPatchRecommendation.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get a single recommendation with full details
   *
   * @param id - Recommendation ID
   */
  async getRecommendation(id: string): Promise<AssetPatchRecommendation | null> {
    return prisma.assetPatchRecommendation.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            agent: true,
          },
        },
        vulnerability: {
          include: {
            references: true,
          },
        },
        patch: {
          include: {
            bundle: true,
          },
        },
        deploymentTask: true,
      },
    });
  }

  /**
   * Accept a recommendation
   *
   * @param id - Recommendation ID
   * @param reason - Optional reason for acceptance
   */
  async acceptRecommendation(
    id: string,
    reason?: string
  ): Promise<AssetPatchRecommendation> {
    return prisma.assetPatchRecommendation.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        reason: reason || undefined,
      },
    });
  }

  /**
   * Reject a recommendation
   *
   * @param id - Recommendation ID
   * @param reason - Reason for rejection (required)
   */
  async rejectRecommendation(
    id: string,
    reason: string
  ): Promise<AssetPatchRecommendation> {
    return prisma.assetPatchRecommendation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  /**
   * Mark recommendation as deployed
   *
   * @param id - Recommendation ID
   * @param deploymentTaskId - Deployment task ID
   */
  async deployRecommendation(
    id: string,
    deploymentTaskId: string
  ): Promise<AssetPatchRecommendation> {
    return prisma.assetPatchRecommendation.update({
      where: { id },
      data: {
        status: 'DEPLOYED',
        deployedAt: new Date(),
        deploymentTaskId,
      },
    });
  }

  /**
   * Mark recommendation as verified (patch successfully applied)
   *
   * @param id - Recommendation ID
   */
  async verifyRecommendation(id: string): Promise<AssetPatchRecommendation> {
    return prisma.assetPatchRecommendation.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Mark recommendation as failed
   *
   * @param id - Recommendation ID
   * @param reason - Failure reason
   */
  async failRecommendation(
    id: string,
    reason: string
  ): Promise<AssetPatchRecommendation> {
    return prisma.assetPatchRecommendation.update({
      where: { id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        failureReason: reason,
      },
    });
  }

  /**
   * Get dashboard statistics for an organization
   *
   * @param organizationId - Organization ID
   */
  async getDashboardStats(organizationId: string): Promise<DashboardStats> {
    // Get all recommendations for assets in this organization
    const recommendations = await prisma.assetPatchRecommendation.findMany({
      where: {
        asset: {
          organizationId,
        },
      },
      include: {
        vulnerability: {
          select: {
            cveId: true,
            severity: true,
          },
        },
      },
    });

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const vulnCounts = new Map<string, { cveId: string; count: number; severity: string }>();

    for (const rec of recommendations) {
      // Count by status
      byStatus[rec.status] = (byStatus[rec.status] || 0) + 1;

      // Count by severity
      bySeverity[rec.severity] = (bySeverity[rec.severity] || 0) + 1;

      // Track vulnerability occurrences
      const existing = vulnCounts.get(rec.vulnerabilityId);
      if (existing) {
        existing.count++;
      } else {
        vulnCounts.set(rec.vulnerabilityId, {
          cveId: rec.vulnerability.cveId,
          count: 1,
          severity: rec.vulnerability.severity,
        });
      }
    }

    // Get unique assets with critical recommendations
    const criticalAssets = await prisma.assetPatchRecommendation.groupBy({
      by: ['assetId'],
      where: {
        asset: {
          organizationId,
        },
        severity: 'CRITICAL',
        status: { in: ['RECOMMENDED', 'ACCEPTED'] },
      },
    });

    // Get top 5 vulnerabilities by affected asset count
    const topVulns = Array.from(vulnCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(v => ({
        cveId: v.cveId,
        affectedAssets: v.count,
        severity: v.severity,
      }));

    return {
      totalRecommendations: recommendations.length,
      byStatus,
      bySeverity,
      criticalAssets: criticalAssets.length,
      topVulnerabilities: topVulns,
    };
  }

  /**
   * Calculate risk score for a vulnerability
   *
   * Formula:
   * - CVSS * 10 * 0.5 (50% weight)
   * - EPSS * 0.3 (30% weight)
   * - Severity boost (20% weight): CRITICAL=20, HIGH=15, MEDIUM=10, LOW=5
   * - +10 bonus if exploitable
   * - Capped at 100
   *
   * @param vulnerability - Vulnerability data
   * @returns Risk score (0-100)
   */
  private calculateRiskScore(vulnerability: {
    cvss3BaseScore: number | null;
    epss: number | null;
    severity: string;
    exploitable: boolean;
  }): number {
    let score = 0;

    // CVSS component (50% weight, max 50 points)
    if (vulnerability.cvss3BaseScore) {
      score += vulnerability.cvss3BaseScore * 10 * 0.5;
    }

    // EPSS component (30% weight, max 30 points)
    if (vulnerability.epss) {
      score += vulnerability.epss * 0.3;
    }

    // Severity boost (20% weight, max 20 points)
    const severityBoost: Record<string, number> = {
      CRITICAL: 20,
      HIGH: 15,
      MEDIUM: 10,
      LOW: 5,
    };
    score += severityBoost[vulnerability.severity] || 0;

    // Exploitability bonus (+10 points)
    if (vulnerability.exploitable) {
      score += 10;
    }

    // Cap at 100
    return Math.min(Math.round(score), 100);
  }

  /**
   * Link an existing deployment task to a recommendation
   *
   * Used by the deployment executor to track which recommendations
   * are being addressed by a deployment.
   *
   * @param assetId - Asset ID
   * @param patchId - Patch ID
   * @param deploymentTaskId - Deployment task ID
   */
  async linkDeploymentTask(
    assetId: string,
    patchId: string,
    deploymentTaskId: string
  ): Promise<AssetPatchRecommendation | null> {
    // Find recommendations for this asset/patch combination
    const recommendation = await prisma.assetPatchRecommendation.findFirst({
      where: {
        assetId,
        patchId,
        status: { in: ['RECOMMENDED', 'ACCEPTED'] },
      },
    });

    if (recommendation) {
      return this.deployRecommendation(recommendation.id, deploymentTaskId);
    }

    return null;
  }

  /**
   * Update recommendation status based on deployment task status
   *
   * Called by deployment executor when task status changes.
   *
   * @param deploymentTaskId - Deployment task ID
   * @param taskStatus - New task status
   * @param errorMessage - Optional error message if failed
   */
  async updateFromDeploymentTask(
    deploymentTaskId: string,
    taskStatus: string,
    errorMessage?: string
  ): Promise<void> {
    const recommendation = await prisma.assetPatchRecommendation.findFirst({
      where: { deploymentTaskId },
    });

    if (!recommendation) {
      return;
    }

    if (taskStatus === 'COMPLETED') {
      await this.verifyRecommendation(recommendation.id);
    } else if (taskStatus === 'FAILED') {
      await this.failRecommendation(
        recommendation.id,
        errorMessage || 'Deployment failed'
      );
    }
  }

  /**
   * Bulk accept recommendations
   *
   * Only updates recommendations that are currently in RECOMMENDED status.
   *
   * @param ids - Recommendation IDs to accept
   * @param reason - Optional reason for acceptance
   * @returns Count of accepted and skipped recommendations
   */
  async bulkAcceptRecommendations(
    ids: string[],
    reason?: string
  ): Promise<{ accepted: number; skipped: number }> {
    const result = await prisma.assetPatchRecommendation.updateMany({
      where: {
        id: { in: ids },
        status: 'RECOMMENDED',
      },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        ...(reason ? { reason } : {}),
      },
    });

    return { accepted: result.count, skipped: ids.length - result.count };
  }

  /**
   * Bulk reject recommendations
   *
   * Only updates recommendations that are currently in RECOMMENDED status.
   *
   * @param ids - Recommendation IDs to reject
   * @param reason - Reason for rejection (required)
   * @returns Count of rejected and skipped recommendations
   */
  async bulkRejectRecommendations(
    ids: string[],
    reason: string
  ): Promise<{ rejected: number; skipped: number }> {
    const result = await prisma.assetPatchRecommendation.updateMany({
      where: {
        id: { in: ids },
        status: 'RECOMMENDED',
      },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return { rejected: result.count, skipped: ids.length - result.count };
  }

  /**
   * Bulk deploy recommendations
   *
   * Groups recommendations by agent and creates one deployment per agent.
   * Only processes recommendations in ACCEPTED status with an associated agent.
   *
   * @param ids - Recommendation IDs to deploy
   * @returns Count of deployed/skipped recommendations and deployment IDs
   */
  async bulkDeployRecommendations(
    ids: string[]
  ): Promise<{ deployed: number; skipped: number; deployments: string[] }> {
    // Fetch all accepted recommendations with asset→agent and patch relations
    const recommendations = await prisma.assetPatchRecommendation.findMany({
      where: {
        id: { in: ids },
        status: 'ACCEPTED',
      },
      include: {
        asset: {
          include: { agent: true },
        },
        patch: {
          select: { id: true, title: true },
        },
      },
    });

    // Filter recommendations that have an agent
    const deployable = recommendations.filter((r) => r.asset?.agent?.id);
    const skipped = ids.length - deployable.length;

    if (deployable.length === 0) {
      return { deployed: 0, skipped: ids.length, deployments: [] };
    }

    // Group by agentId — one deployment per agent with multiple patches
    const agentGroups = new Map<string, typeof deployable>();
    for (const rec of deployable) {
      const agentId = rec.asset.agent!.id;
      const group = agentGroups.get(agentId) || [];
      group.push(rec);
      agentGroups.set(agentId, group);
    }

    // Import deployment services dynamically to avoid circular dependencies
    const { deploymentExecutorService } = await import(
      '@modules/deployments/deployment-executor.service'
    );

    const deploymentIds: string[] = [];
    let deployed = 0;

    for (const [agentId, recs] of agentGroups) {
      // Deduplicate patches for this agent
      const uniquePatches = [...new Map(recs.map((r) => [r.patchId, r.patch])).values()];
      const assetName = recs[0].asset.name;

      const deployment = await deploymentExecutorService.createPatchDeployment({
        name: `Bulk deploy ${uniquePatches.length} patch(es) to ${assetName}`,
        patches: uniquePatches.map((p) => ({ id: p.id })),
        targetAgentIds: [agentId],
        triggerType: 'manual',
      });

      if (deployment?.deploymentId) {
        deploymentIds.push(deployment.deploymentId);

        // Update all recommendations in this group to DEPLOYED
        await prisma.assetPatchRecommendation.updateMany({
          where: { id: { in: recs.map((r) => r.id) } },
          data: {
            status: 'DEPLOYED',
            deployedAt: new Date(),
          },
        });

        deployed += recs.length;
      }
    }

    return { deployed, skipped, deployments: deploymentIds };
  }

  /**
   * Bulk create recommendations from a list of asset-vulnerability pairs
   *
   * Useful for batch processing during vulnerability scans.
   *
   * @param items - List of asset-vulnerability-software tuples
   */
  async createRecommendationsBulk(
    items: Array<{
      assetId: string;
      vulnerabilityId: string;
      software: { name: string; version: string | null };
    }>
  ): Promise<number> {
    let count = 0;

    for (const item of items) {
      const created = await this.createRecommendationsForVulnerability(
        item.assetId,
        item.vulnerabilityId,
        item.software
      );
      count += created.length;
    }

    return count;
  }
}

// Export singleton instance
export const assetPatchRecommendationService = new AssetPatchRecommendationService();
