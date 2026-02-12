/**
 * Calculate real-time agent status based on lastHeartbeat age.
 *
 * Instead of relying on the stale `status` field in the database
 * (which is only set to 'Connected' on heartbeat and never updated to 'Disconnected'),
 * this function computes status on-demand from the lastHeartbeat timestamp.
 *
 * Agent heartbeats every 60s. After 3 missed heartbeats (180s), consider offline.
 */

const OFFLINE_THRESHOLD_SECONDS = 180; // 3 minutes (3 missed heartbeats)

export function calculateAgentStatus(
  agent: { lastHeartbeat: Date | null; status: string } | null | undefined
): 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING' {
  if (!agent) return 'DISCONNECTED';

  // Never received a heartbeat
  if (!agent.lastHeartbeat) return 'PENDING';

  const now = new Date();
  const lastHeartbeatTime = new Date(agent.lastHeartbeat);
  const timeSinceHeartbeat = (now.getTime() - lastHeartbeatTime.getTime()) / 1000;

  // If heartbeat is stale, agent is disconnected
  if (timeSinceHeartbeat > OFFLINE_THRESHOLD_SECONDS) {
    return 'DISCONNECTED';
  }

  // If database status is 'ERROR', respect that (agent reported an error)
  if (agent.status === 'ERROR') {
    return 'ERROR';
  }

  return 'CONNECTED';
}
