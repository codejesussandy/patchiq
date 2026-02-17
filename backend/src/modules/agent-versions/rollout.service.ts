/**
 * Agent Version Rollout Service
 *
 * Implements phased rollout logic for agent updates.
 * Supports canary, beta, and production deployment groups
 * with percentage-based rollouts.
 */

import crypto from 'crypto';

export type DeploymentGroup = 'canary' | 'beta' | 'production';

export interface RolloutConfig {
  targetVersion: string;
  deploymentGroup: DeploymentGroup;
  rolloutPercentage: number; // 0-100
  downloadUrl: string;
  checksum: string;
  platform: string;
  architecture: string;
}

export interface RolloutDecision {
  latestVersion: string;
  shouldUpdate: boolean;
  rolloutGroup: DeploymentGroup;
  rolloutPercentage: number;
  downloadUrl?: string;
  checksum?: string;
  reason: string;
}

export class RolloutService {
  /**
   * Determines if an agent should update based on rollout configuration
   *
   * Uses consistent hash-based bucketing to ensure:
   * - Same agent always gets same decision (deterministic)
   * - Agents evenly distributed across buckets (uniform)
   * - No coordination needed between agents (independent)
   */
  public shouldUpdate(agentId: string, currentVersion: string, config: RolloutConfig): RolloutDecision {
    const decision: RolloutDecision = {
      latestVersion: config.targetVersion,
      shouldUpdate: false,
      rolloutGroup: config.deploymentGroup,
      rolloutPercentage: config.rolloutPercentage,
      reason: '',
    };

    // Already on latest version
    if (currentVersion === config.targetVersion) {
      decision.reason = 'already on target version';
      return decision;
    }

    // Rollout percentage is 0 - no updates
    if (config.rolloutPercentage <= 0) {
      decision.reason = `rollout paused for ${config.deploymentGroup} group`;
      return decision;
    }

    // Rollout percentage is 100 - everyone updates
    if (config.rolloutPercentage >= 100) {
      decision.shouldUpdate = true;
      decision.downloadUrl = config.downloadUrl;
      decision.checksum = config.checksum;
      decision.reason = `full rollout for ${config.deploymentGroup} group`;
      return decision;
    }

    // Hash-based bucketing
    const bucket = this.hashAgentToBucket(agentId);
    const shouldUpdate = bucket < config.rolloutPercentage;

    if (shouldUpdate) {
      decision.shouldUpdate = true;
      decision.downloadUrl = config.downloadUrl;
      decision.checksum = config.checksum;
      decision.reason = `in ${config.rolloutPercentage}% rollout (bucket ${bucket})`;
    } else {
      decision.reason = `not in ${config.rolloutPercentage}% rollout (bucket ${bucket})`;
    }

    return decision;
  }

  /**
   * Maps an agent ID to a bucket from 0-99
   *
   * Uses SHA256 hash for:
   * - Consistent assignment (same agent -> same bucket)
   * - Uniform distribution (agents evenly spread)
   * - Cryptographic randomness (no bias)
   */
  private hashAgentToBucket(agentId: string): number {
    // Hash the agent ID
    const hash = crypto.createHash('sha256').update(agentId).digest();

    // Take first 4 bytes and convert to integer
    const hashInt = hash.readUInt32BE(0);

    // Mod 100 to get bucket 0-99
    return hashInt % 100;
  }

  /**
   * Get rollout configuration for a deployment group
   *
   * In production, this would query the database for active rollout config.
   * For now, this is a placeholder that returns default configuration.
   */
  public async getRolloutConfig(
    _deploymentGroup: DeploymentGroup,
    _platform: string,
    _architecture: string
  ): Promise<RolloutConfig | null> {
    // TODO: Query database for active rollout configuration
    // For now, return null (no active rollout)

    // Example configuration (commented out):
    // return {
    //   targetVersion: '1.2.0',
    //   deploymentGroup,
    //   rolloutPercentage: 100,
    //   downloadUrl: `https://updates.patchiq.io/agent/${platform}/${architecture}/patchiq-agent`,
    //   checksum: 'sha256:abc123...',
    //   platform,
    //   architecture,
    // };

    return null;
  }

  /**
   * Validates deployment group
   */
  public isValidDeploymentGroup(group: string): group is DeploymentGroup {
    return ['canary', 'beta', 'production'].includes(group);
  }

  /**
   * Calculates expected number of agents in rollout
   */
  public calculateRolloutSize(totalAgents: number, rolloutPercentage: number): number {
    if (rolloutPercentage <= 0) return 0;
    if (rolloutPercentage >= 100) return totalAgents;
    return Math.floor((totalAgents * rolloutPercentage) / 100);
  }

  /**
   * Tests hash distribution uniformity
   *
   * Useful for debugging/testing to verify that agents are evenly distributed
   * across buckets.
   */
  public testHashDistribution(agentIds: string[]): Map<number, number> {
    const distribution = new Map<number, number>();

    for (const agentId of agentIds) {
      const bucket = this.hashAgentToBucket(agentId);
      distribution.set(bucket, (distribution.get(bucket) || 0) + 1);
    }

    return distribution;
  }

  /**
   * Logs rollout statistics
   */
  public logRolloutStats(
    totalAgents: number,
    selectedAgents: number,
    rolloutPercentage: number
  ): void {
    const actualPercentage = totalAgents > 0
      ? (selectedAgents / totalAgents) * 100
      : 0;

    // Use dynamic import to avoid circular dependency issues
    import('@shared/services/logger').then(({ createLogger }) => {
      const logger = createLogger('rollout');
      logger.info({
        totalAgents,
        selectedAgents,
        targetPercentage: rolloutPercentage,
        actualPercentage: actualPercentage.toFixed(2),
      }, 'Rollout Statistics');
    }).catch(() => {
      // Fallback to console if logger fails
    });
  }
}

// Export singleton instance
export const rolloutService = new RolloutService();
