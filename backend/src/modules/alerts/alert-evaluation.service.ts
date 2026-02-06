import { prisma } from '@/db/client';
import { notificationsService } from '@/modules/notifications/notifications.service';

interface AlertCondition {
  attribute: string;
  condition: string; // operator: >=, <=, >, <, ==, !=, equals, not_equals
  value: string;
}

interface AlertConfigCached {
  id: string;
  type: string;
  enabled: boolean;
  config: {
    name?: string;
    module?: string;
    severity?: string;
    conditions?: AlertCondition[];
  };
}

// In-memory cache for enabled alert configs
let cachedConfigs: AlertConfigCached[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds

async function loadEnabledConfigs(): Promise<AlertConfigCached[]> {
  const now = Date.now();
  if (cachedConfigs.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfigs;
  }

  const rows = await prisma.alertConfig.findMany({
    where: { enabled: true },
  });

  cachedConfigs = rows.map((r) => ({
    id: r.id,
    type: r.type,
    enabled: r.enabled,
    config: (r.config ?? {}) as AlertConfigCached['config'],
  }));
  cacheTimestamp = now;
  return cachedConfigs;
}

/**
 * Map attribute names used in UI conditions to telemetry data keys
 */
function resolveAttributeValue(
  attribute: string,
  telemetry: Record<string, unknown>,
): unknown {
  const key = attribute.toLowerCase().trim();
  if (key === 'cpu usage' || key === 'cpu') return telemetry.cpuUsage;
  if (key === 'memory usage' || key === 'memory') return telemetry.memoryUsage;
  if (key === 'disk usage' || key === 'disk' || key === 'disk space') return telemetry.diskUsage;
  if (key === 'pending reboot' || key === 'reboot status') return telemetry.pendingReboot;
  if (key === 'firewall status' || key === 'firewall') return telemetry.firewallEnabled;
  if (key === 'antivirus status' || key === 'antivirus') return telemetry.antivirusInstalled;
  return undefined;
}

function evaluateCondition(actual: unknown, operator: string, expected: string): boolean {
  if (actual === undefined || actual === null) return false;

  // Boolean conditions (firewall, antivirus, pending reboot)
  if (typeof actual === 'boolean') {
    const expectedBool =
      expected.toLowerCase() === 'true' ||
      expected.toLowerCase() === 'enabled' ||
      expected.toLowerCase() === 'yes' ||
      expected === '1';
    const op = operator.toLowerCase().trim();
    if (op === '==' || op === 'equals' || op === '=' || op === 'is') return actual === expectedBool;
    if (op === '!=' || op === 'not_equals' || op === 'is not') return actual !== expectedBool;
    return false;
  }

  // Numeric conditions (cpu, memory, disk)
  const numActual = typeof actual === 'number' ? actual : parseFloat(String(actual));
  const numExpected = parseFloat(expected);

  if (!isNaN(numActual) && !isNaN(numExpected)) {
    const op = operator.trim();
    if (op === '>=' || op === 'greater than or equal') return numActual >= numExpected;
    if (op === '<=' || op === 'less than or equal') return numActual <= numExpected;
    if (op === '>' || op === 'greater than') return numActual > numExpected;
    if (op === '<' || op === 'less than') return numActual < numExpected;
    if (op === '==' || op === '=' || op === 'equals') return numActual === numExpected;
    if (op === '!=' || op === 'not_equals') return numActual !== numExpected;
  }

  // String fallback
  const strActual = String(actual).toLowerCase();
  const strExpected = expected.toLowerCase();
  const op = operator.toLowerCase().trim();
  if (op === '==' || op === '=' || op === 'equals' || op === 'is') return strActual === strExpected;
  if (op === '!=' || op === 'not_equals' || op === 'is not') return strActual !== strExpected;
  if (op === 'contains') return strActual.includes(strExpected);

  return false;
}

/**
 * Evaluate a single AlertConfig against provided data for an asset.
 * Creates or resolves AssetAlerts as needed.
 */
async function evaluateConfig(
  assetId: string,
  config: AlertConfigCached,
  data: Record<string, unknown>,
): Promise<void> {
  const conditions = config.config.conditions;
  if (!conditions || conditions.length === 0) return;

  // All conditions must match (AND logic)
  const allMet = conditions.every((c) => {
    const actual = resolveAttributeValue(c.attribute, data);
    return evaluateCondition(actual, c.condition, c.value);
  });

  // Find existing open alert for this asset + config
  const existingAlert = await prisma.assetAlert.findFirst({
    where: {
      assetId,
      alertConfigId: config.id,
      status: 'Open',
    },
  });

  if (allMet && !existingAlert) {
    // Create new alert
    const condDesc = conditions
      .map((c) => `${c.attribute} ${c.condition} ${c.value}`)
      .join(', ');
    await prisma.assetAlert.create({
      data: {
        assetId,
        alertConfigId: config.id,
        alert: config.config.name || config.type,
        severity: config.config.severity || 'WARNING',
        module: config.config.module || 'System',
        attribute: conditions[0]?.attribute || '',
        value: String(resolveAttributeValue(conditions[0]?.attribute || '', data) ?? ''),
        message: `Condition met: ${condDesc}`,
        status: 'Open',
      },
    });

    // Notify admins about the new alert
    const severity = config.config.severity || 'WARNING';
    const notifType = severity === 'CRITICAL' ? 'error' : severity === 'WARNING' ? 'warning' : 'info';
    notificationsService.broadcast({
      title: config.config.name || config.type,
      message: `Condition met: ${condDesc}`,
      type: notifType as 'error' | 'warning' | 'info',
      category: 'alert',
      dedupKey: `alert-${config.id}-${assetId}`,
      link: `/assets/${assetId}`,
    }).catch(() => {});
  } else if (!allMet && existingAlert) {
    // Auto-resolve
    await prisma.assetAlert.update({
      where: { id: existingAlert.id },
      data: {
        status: 'Resolved',
        resolvedAt: new Date(),
      },
    });

    // Notify admins about the resolved alert
    notificationsService.broadcast({
      title: `Alert Resolved: ${config.config.name || config.type}`,
      message: `Alert conditions are no longer met`,
      type: 'success',
      category: 'alert',
      link: `/assets/${assetId}`,
    }).catch(() => {});
  }
}

/**
 * Evaluate telemetry-based alerts (CPU, Memory, Disk, Pending Reboot).
 * Called from processHeartbeat and processTelemetry.
 */
export async function evaluateAlertsForAsset(
  assetId: string,
  telemetry: { cpuUsage?: number; memoryUsage?: number; diskUsage?: number; pendingReboot?: boolean },
): Promise<void> {
  const configs = await loadEnabledConfigs();
  const data: Record<string, unknown> = {
    cpuUsage: telemetry.cpuUsage,
    memoryUsage: telemetry.memoryUsage,
    diskUsage: telemetry.diskUsage,
    pendingReboot: telemetry.pendingReboot,
  };

  for (const config of configs) {
    await evaluateConfig(assetId, config, data);
  }
}

/**
 * Evaluate security-based alerts (Firewall, Antivirus).
 * Called from processInventory after security data upsert.
 */
export async function evaluateSecurityAlertsForAsset(
  assetId: string,
  security: { firewallEnabled?: boolean; antivirusInstalled?: boolean },
): Promise<void> {
  const configs = await loadEnabledConfigs();
  const data: Record<string, unknown> = {
    firewallEnabled: security.firewallEnabled,
    antivirusInstalled: security.antivirusInstalled,
  };

  for (const config of configs) {
    await evaluateConfig(assetId, config, data);
  }
}
