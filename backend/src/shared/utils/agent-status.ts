/**
 * Calculate real-time agent status based on lastHeartbeat age.
 *
 * Instead of relying on the stale `status` field in the database
 * (which is only set to 'Connected' on heartbeat and never updated to 'Disconnected'),
 * this function computes status on-demand from the lastHeartbeat timestamp.
 *
 * @param offlineThresholdSeconds - Configurable threshold; defaults to 180s (3 missed heartbeats).
 *   When using server settings, this is derived from endpointOnlineStatusTimeoutHours.
 */

const DEFAULT_OFFLINE_THRESHOLD_SECONDS = 180; // 3 minutes (3 missed heartbeats)

export function calculateAgentStatus(
  agent: { lastHeartbeat: Date | null; status: string } | null | undefined,
  offlineThresholdSeconds: number = DEFAULT_OFFLINE_THRESHOLD_SECONDS
): 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING' {
  if (!agent) return 'DISCONNECTED';

  // Never received a heartbeat
  if (!agent.lastHeartbeat) return 'PENDING';

  const now = new Date();
  const lastHeartbeatTime = new Date(agent.lastHeartbeat);
  const timeSinceHeartbeat = (now.getTime() - lastHeartbeatTime.getTime()) / 1000;

  // If heartbeat is stale, agent is disconnected
  if (timeSinceHeartbeat > offlineThresholdSeconds) {
    return 'DISCONNECTED';
  }

  // If database status is 'ERROR', respect that (agent reported an error)
  if (agent.status === 'ERROR') {
    return 'ERROR';
  }

  return 'CONNECTED';
}
