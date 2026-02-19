import { NotFoundError } from '@shared/errors';
import { prisma } from '@/db/client';
import type { AssetAlertResponse } from './assets.types';
import { resolveAssetId } from './assets-helpers';

// ============================================
// Asset Alerts Service
// ============================================

export async function getAssetAlerts(id: string): Promise<{ data: AssetAlertResponse[]; summary: { total: number; critical: number; warning: number; info: number; clear: number; open: number; resolved: number } }> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const alerts = await prisma.assetAlert.findMany({
    where: { assetId: uuid },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    total: alerts.length,
    critical: 0,
    warning: 0,
    info: 0,
    clear: 0,
    open: 0,
    resolved: 0,
  };

  const data: AssetAlertResponse[] = alerts.map((a) => {
    const sev = a.severity.toUpperCase();
    if (sev === 'CRITICAL') summary.critical++;
    else if (sev === 'WARNING') summary.warning++;
    else if (sev === 'INFO') summary.info++;
    else if (sev === 'CLEAR') summary.clear++;

    if (a.status === 'Open') summary.open++;
    else if (a.status === 'Resolved') summary.resolved++;

    return {
      id: a.id,
      alert: a.alert,
      severity: a.severity,
      module: a.module,
      attribute: a.attribute,
      value: a.value,
      message: a.message,
      status: a.status,
      createdOn: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() || null,
    };
  });

  return { data, summary };
}

// ============================================
// Asset Vulnerabilities Service
// ============================================

export async function getAssetVulnerabilities(id: string) {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Get vulnerabilities linked to this asset through the AssetVulnerability relation
  const assetVulnerabilities = await prisma.assetVulnerability.findMany({
    where: { assetId: uuid },
    include: {
      vulnerability: {
        include: {
          affectedSoftware: { select: { id: true } },
        },
      },
    },
    orderBy: { detectedAt: 'desc' },
  });

  // Calculate summary stats
  const summary = {
    total: assetVulnerabilities.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    open: 0,
    resolved: 0,
  };

  const data = assetVulnerabilities.map((av) => {
    const vuln = av.vulnerability;

    // Update summary counts
    const severity = vuln.severity.toLowerCase();
    if (severity === 'critical') summary.critical++;
    else if (severity === 'high') summary.high++;
    else if (severity === 'medium') summary.medium++;
    else if (severity === 'low') summary.low++;

    if (av.status === 'Open') summary.open++;
    else if (av.status === 'Resolved') summary.resolved++;

    return {
      id: av.id,
      cveId: vuln.cveId,
      title: vuln.title || vuln.cveId,
      description: vuln.description || '',
      severity: vuln.severity,
      cvssScore: vuln.cvss3BaseScore ?? vuln.cvss2BaseScore ?? 0,
      epss: vuln.epss ?? 0,
      exploitable: vuln.exploitable,
      riskScore: vuln.riskScore ?? 0,
      status: av.status,
      detectedAt: av.detectedAt.toISOString(),
      resolvedAt: av.resolvedAt?.toISOString() || null,
      publishedDate: vuln.publishedDate?.toISOString() || null,
      affectedSoftwareCount: vuln.affectedSoftware?.length ?? 0,
    };
  });

  return { data, summary };
}

// ============================================
// Asset Patches Service
// ============================================

export async function getAssetPatches(id: string): Promise<{
  data: Array<{
    id: string;
    patchId: string;
    name: string;
    severity: string;
    status: 'INSTALLED' | 'MISSING' | 'PENDING' | 'FAILED';
    kbNumber?: string;
    publishedAt?: string;
    deploymentId?: string;
    deploymentName?: string;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
  }>;
  summary: {
    total: number;
    installed: number;
    missing: number;
    failed: number;
    pending: number;
    criticalMissing: number;
    securityMissing: number;
    lastScanDate: string | null;
    compliancePercent: number;
  };
}> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    include: { agent: true },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Get all patch deployment tasks for this asset with their deployment and patches
  const patchTasks = await prisma.patchDeploymentTask.findMany({
    where: { assetId: uuid },
    include: {
      deployment: {
        include: {
          patches: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  // Map task status to patch status
  const mapStatus = (taskStatus: string): 'INSTALLED' | 'MISSING' | 'PENDING' | 'FAILED' => {
    switch (taskStatus) {
      case 'COMPLETED':
        return 'INSTALLED';
      case 'FAILED':
        return 'FAILED';
      case 'IN_PROGRESS':
        return 'PENDING';
      case 'PENDING':
      default:
        return 'PENDING';
    }
  };

  // Flatten patches from all deployments with their status
  const patchesMap = new Map<string, {
    id: string;
    patchId: string;
    name: string;
    severity: string;
    status: 'INSTALLED' | 'MISSING' | 'PENDING' | 'FAILED';
    kbNumber?: string;
    publishedAt?: string;
    deploymentId?: string;
    deploymentName?: string;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
  }>();

  for (const task of patchTasks) {
    const deployment = task.deployment;
    const taskStatus = mapStatus(task.status);

    for (const patch of deployment.patches) {
      // Only keep the most recent status for each patch
      const existing = patchesMap.get(patch.id);
      if (!existing || (task.completedAt && (!existing.completedAt || task.completedAt > new Date(existing.completedAt)))) {
        patchesMap.set(patch.id, {
          id: task.id,
          patchId: patch.patchId,
          name: patch.title,
          severity: patch.severity?.toUpperCase() || 'UNSPECIFIED',
          status: taskStatus,
          kbNumber: patch.kbNumber || undefined,
          publishedAt: patch.publishedAt?.toISOString() || undefined,
          deploymentId: deployment.id,
          deploymentName: deployment.name,
          startedAt: task.startedAt?.toISOString() || undefined,
          completedAt: task.completedAt?.toISOString() || undefined,
          errorMessage: task.errorMessage || undefined,
        });
      }
    }
  }

  // Build set of installed software CPE pairs for this asset
  const installedSoftware = await prisma.assetSoftware.findMany({
    where: { assetId: id, cpeVendor: { not: null }, cpeProduct: { not: null } },
    select: { cpeVendor: true, cpeProduct: true },
  });
  const installedCpeKeys = new Set(
    installedSoftware.map(s => `${s.cpeVendor!.toLowerCase()}::${s.cpeProduct!.toLowerCase()}`),
  );

  // Determine which OS values match this asset
  const assetOs = (asset.os || '').toLowerCase();
  const matchingOsValues: string[] = [];
  if (assetOs.includes('windows')) matchingOsValues.push('Windows');
  if (assetOs.includes('mac') || assetOs.includes('darwin')) matchingOsValues.push('MacOS');
  if (assetOs.includes('ubuntu')) matchingOsValues.push('Ubuntu', 'Linux');
  else if (assetOs.includes('linux') || assetOs.includes('rhel') || assetOs.includes('centos') || assetOs.includes('debian') || assetOs.includes('fedora') || assetOs.includes('suse')) matchingOsValues.push('Linux');

  const deployedPatchIds = Array.from(patchesMap.keys());
  const notInDeployed = deployedPatchIds.length > 0 ? { id: { notIn: deployedPatchIds } } : {};

  // Category 1: Patches WITH vendor+product — only include if asset has matching installed software
  const vendorProductPatches = await prisma.patch.findMany({
    where: {
      vendor: { not: null },
      product: { not: null },
      ...notInDeployed,
    },
    select: {
      id: true, patchId: true, title: true, severity: true, kbNumber: true, publishedAt: true,
      vendor: true, product: true, os: true,
    },
  });

  const softwareMatchedPatches = vendorProductPatches.filter(patch => {
    const patchKey = `${patch.vendor!.toLowerCase()}::${patch.product!.toLowerCase()}`;
    if (!installedCpeKeys.has(patchKey)) return false;
    // Also verify OS compatibility — skip wrong-platform patches even if software name matches
    if (patch.os && matchingOsValues.length > 0 && !matchingOsValues.includes(patch.os)) return false;
    return true;
  });

  // Category 2: Patches WITHOUT vendor+product but WITH os set (legacy/manual patches)
  // Only include if OS matches — no more os=NULL cross-platform catch-all
  const legacyOsPatches = matchingOsValues.length > 0 ? await prisma.patch.findMany({
    where: {
      OR: [{ vendor: null }, { product: null }],
      os: { in: matchingOsValues },
      ...notInDeployed,
    },
    select: {
      id: true, patchId: true, title: true, severity: true, kbNumber: true, publishedAt: true,
    },
  }) : [];

  // Add undeployed applicable patches as "Missing"
  for (const patch of [...softwareMatchedPatches, ...legacyOsPatches]) {
    if (!patchesMap.has(patch.id)) {
      patchesMap.set(patch.id, {
        id: patch.id,
        patchId: patch.patchId,
        name: patch.title,
        severity: patch.severity?.toUpperCase() || 'UNSPECIFIED',
        status: 'MISSING',
        kbNumber: patch.kbNumber || undefined,
        publishedAt: patch.publishedAt?.toISOString() || undefined,
      });
    }
  }

  const data = Array.from(patchesMap.values());

  // Calculate summary
  const summary = {
    total: data.length,
    installed: 0,
    missing: 0,
    failed: 0,
    pending: 0,
    criticalMissing: 0,
    securityMissing: 0,
    lastScanDate: null as string | null,
    compliancePercent: 0,
  };

  for (const patch of data) {
    switch (patch.status) {
      case 'INSTALLED':
        summary.installed++;
        break;
      case 'FAILED':
        summary.failed++;
        break;
      case 'PENDING':
        summary.pending++;
        break;
      case 'MISSING':
        summary.missing++;
        break;
    }

    // Count critical/security missing
    if (patch.status !== 'INSTALLED') {
      if (patch.severity === 'CRITICAL') {
        summary.criticalMissing++;
      }
      if (patch.severity === 'HIGH' || patch.severity === 'CRITICAL') {
        summary.securityMissing++;
      }
    }
  }

  // Get last scan date from agent telemetry
  if (asset.agent) {
    const lastTelemetry = await prisma.agentTelemetry.findFirst({
      where: { agentId: asset.agent.id },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    if (lastTelemetry) {
      summary.lastScanDate = lastTelemetry.timestamp.toISOString();
    }
  }

  // Calculate compliance percentage
  summary.compliancePercent = summary.total > 0
    ? Math.round((summary.installed / summary.total) * 100)
    : 100;

  return { data, summary };
}

// ============================================
// Asset Deployments Service
// ============================================

export async function getAssetDeployments(id: string): Promise<{
  data: Array<{
    id: string;
    deploymentId: string;
    deploymentName: string;
    patchId?: string;
    patchName?: string;
    softwareName?: string;
    type: 'PATCH' | 'SOFTWARE';
    date: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
    errorMessage?: string;
  }>;
}> {
  const uuid = await resolveAssetId(id);
  const asset = await prisma.asset.findUnique({
    where: { id: uuid },
    include: { agent: true },
  });

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  const deployments: Array<{
    id: string;
    deploymentId: string;
    deploymentName: string;
    patchId?: string;
    patchName?: string;
    softwareName?: string;
    type: 'PATCH' | 'SOFTWARE';
    date: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS';
    errorMessage?: string;
  }> = [];

  // Get patch deployment tasks for this asset
  const patchTasks = await prisma.patchDeploymentTask.findMany({
    where: { assetId: uuid },
    include: {
      deployment: {
        include: {
          patches: { take: 1 }, // Get first patch for naming
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  });

  // Map task status to deployment status
  const mapDeploymentStatus = (taskStatus: string): 'SUCCESS' | 'FAILED' | 'PENDING' | 'IN_PROGRESS' => {
    switch (taskStatus.toUpperCase()) {
      case 'COMPLETED':
        return 'SUCCESS';
      case 'FAILED':
        return 'FAILED';
      case 'IN_PROGRESS':
        return 'IN_PROGRESS';
      case 'PENDING':
      default:
        return 'PENDING';
    }
  };

  for (const task of patchTasks) {
    const patch = task.deployment.patches[0];
    deployments.push({
      id: task.id,
      deploymentId: task.deployment.id,
      deploymentName: task.deployment.name,
      patchId: patch?.patchId,
      patchName: patch?.title || task.deployment.name,
      type: 'PATCH',
      date: (task.completedAt || task.startedAt || task.deployment.createdAt).toISOString(),
      status: mapDeploymentStatus(task.status),
      errorMessage: task.errorMessage || undefined,
    });
  }

  // Get software deployment tasks for this asset
  // Query by assetId directly, or fall back to agentId for older records
  const softwareTasksWhere: { OR: Array<{ assetId?: string; agentId?: string }> } = {
    OR: [{ assetId: id }],
  };
  if (asset.agent) {
    softwareTasksWhere.OR.push({ agentId: asset.agent.id });
  }

  const softwareTasks = await prisma.softwareDeploymentTask.findMany({
    where: softwareTasksWhere,
    include: {
      deployment: true,
    },
    orderBy: { completedAt: 'desc' },
  });

  // Track seen task IDs to avoid duplicates (same task might match both conditions)
  const seenTaskIds = new Set(deployments.map(d => d.id));

  for (const task of softwareTasks) {
    if (seenTaskIds.has(task.id)) continue;
    seenTaskIds.add(task.id);

    deployments.push({
      id: task.id,
      deploymentId: task.deployment.id,
      deploymentName: task.deployment.deploymentName,
      softwareName: task.packageName,
      type: 'SOFTWARE',
      date: (task.completedAt || task.startedAt || task.createdAt).toISOString(),
      status: mapDeploymentStatus(task.status),
      errorMessage: task.errorMessage || undefined,
    });
  }

  // Sort by date descending
  deployments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { data: deployments };
}
