import type { Prisma } from '@prisma/client';
import { NotFoundError } from '@shared/errors';
import { createLogger } from '@shared/services/logger';
import type { PatchPrerequisites } from '@shared/services/patch-prerequisite.service';
import { typedJson } from '@shared/utils';
import { prisma } from '@/db/client';

const logger = createLogger('patches');

// ============================================
// Vulnerability Linking
// ============================================

/**
 * Update patchAvailable flag on vulnerabilities when a patch is created/updated.
 * This links patches to vulnerabilities via CVE numbers.
 */
export async function updateVulnerabilityPatchStatus(patchId: string, cveNumbers: string[], correlationSource: string = 'manual') {
  if (!cveNumbers || cveNumbers.length === 0) return;

  const result = await prisma.vulnerability.updateMany({
    where: { cveId: { in: cveNumbers } },
    data: { patchAvailable: true },
  });

  if (result.count > 0) {
    logger.info({ count: result.count, cveNumbers }, 'Marked vulnerabilities as patchAvailable');
  }

  // Create PatchVulnerability join records so "Related Patches" shows in CVE detail
  for (const cve of cveNumbers) {
    const existing = await prisma.patchVulnerability.findFirst({
      where: { patchId, cveNumber: cve },
    });
    if (!existing) {
      const vuln = await prisma.vulnerability.findUnique({
        where: { cveId: cve },
        select: { severity: true, description: true, publishedDate: true },
      });
      await prisma.patchVulnerability.create({
        data: {
          patchId,
          cveNumber: cve,
          severity: vuln?.severity || null,
          description: vuln?.description || null,
          publishedDate: vuln?.publishedDate || null,
          correlationSource,
        },
      });
    }
  }
}

/**
 * Revert patchAvailable flag when a patch is deleted.
 * Only reverts if no other patch covers the same CVE.
 */
export async function revertVulnerabilityPatchStatus(patchId: string, cveNumbers: string[]) {
  if (!cveNumbers || cveNumbers.length === 0) return;

  // Remove PatchVulnerability join records for this patch
  await prisma.patchVulnerability.deleteMany({
    where: { patchId, cveNumber: { in: cveNumbers } },
  });

  for (const cve of cveNumbers) {
    // Check if any other patch covers this CVE
    const otherPatch = await prisma.patch.findFirst({
      where: {
        cveNumbers: { has: cve },
        id: { not: patchId },
      },
    });

    if (!otherPatch) {
      // No other patch covers this CVE, set patchAvailable = false
      await prisma.vulnerability.updateMany({
        where: { cveId: cve },
        data: { patchAvailable: false },
      });
      logger.info({ cve }, 'Reverted patchAvailable to false for CVE');
    }
  }
}

// ============================================
// CVE Auto-Correlation
// ============================================

/**
 * Auto-correlate CVEs for a patch that has empty cveNumbers.
 * Searches our NVD database using 3 strategies:
 * 1. KB number in vulnerability descriptions/references
 * 2. Vendor+Product CPE match in VulnerabilitySoftware
 * 3. Software name match against VulnerabilitySoftware.cpeProduct
 */
export async function autoCorrelateCves(patchId: string): Promise<string[]> {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });
  if (!patch) return [];

  // Skip if patch already has CVE numbers
  if (patch.cveNumbers && patch.cveNumbers.length > 0) {
    return patch.cveNumbers;
  }

  const foundCves = new Set<string>();
  const correlationSources = new Map<string, string>();

  // Strategy 1: KB number search
  if (patch.kbNumber) {
    const kbVulns = await prisma.vulnerability.findMany({
      where: {
        OR: [
          { description: { contains: patch.kbNumber, mode: 'insensitive' } },
        ],
      },
      select: { cveId: true },
      take: 50,
    });

    const kbRefs = await prisma.vulnerabilityReference.findMany({
      where: { url: { contains: patch.kbNumber, mode: 'insensitive' } },
      select: { vulnerability: { select: { cveId: true } } },
      take: 50,
    });

    for (const v of kbVulns) {
      foundCves.add(v.cveId);
      correlationSources.set(v.cveId, 'auto-kb');
    }
    for (const r of kbRefs) {
      foundCves.add(r.vulnerability.cveId);
      correlationSources.set(r.vulnerability.cveId, 'auto-kb');
    }
  }

  // Strategy 2: Vendor + Product CPE match
  if (patch.vendor && patch.product) {
    const vulnSoftware = await prisma.vulnerabilitySoftware.findMany({
      where: {
        cpeVendor: patch.vendor,
        cpeProduct: patch.product,
      },
      select: { vulnerability: { select: { cveId: true } } },
      take: 100,
    });

    for (const vs of vulnSoftware) {
      if (!foundCves.has(vs.vulnerability.cveId)) {
        foundCves.add(vs.vulnerability.cveId);
        correlationSources.set(vs.vulnerability.cveId, 'auto-vendor');
      }
    }
  }

  // Strategy 3: Software name fallback (only if no matches yet)
  if (patch.software && foundCves.size === 0) {
    const normalizedName = patch.software
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^lib/, '');

    if (normalizedName.length >= 3) {
      const vulnSoftware = await prisma.vulnerabilitySoftware.findMany({
        where: {
          cpeProduct: { equals: normalizedName, mode: 'insensitive' },
        },
        select: { vulnerability: { select: { cveId: true } } },
        take: 50,
      });

      for (const vs of vulnSoftware) {
        if (!foundCves.has(vs.vulnerability.cveId)) {
          foundCves.add(vs.vulnerability.cveId);
          correlationSources.set(vs.vulnerability.cveId, 'auto-nvd');
        }
      }
    }
  }

  if (foundCves.size === 0) {
    return [];
  }

  const cveArray = Array.from(foundCves);
  logger.info({ patchId: patch.patchId || patch.id, cveCount: cveArray.length, sample: cveArray.slice(0, 5) }, 'CVE correlator found CVEs');

  // Update the patch with discovered CVEs
  await prisma.patch.update({
    where: { id: patchId },
    data: { cveNumbers: cveArray },
  });

  // Create PatchVulnerability records with correlation source
  for (const cve of cveArray) {
    const existing = await prisma.patchVulnerability.findFirst({
      where: { patchId, cveNumber: cve },
    });
    if (!existing) {
      const vuln = await prisma.vulnerability.findUnique({
        where: { cveId: cve },
        select: { severity: true, description: true, publishedDate: true },
      });
      await prisma.patchVulnerability.create({
        data: {
          patchId,
          cveNumber: cve,
          severity: vuln?.severity || null,
          description: vuln?.description || null,
          publishedDate: vuln?.publishedDate || null,
          correlationSource: correlationSources.get(cve) || 'auto-nvd',
        },
      });
    }
  }

  // Mark matching vulnerabilities as patchAvailable
  await prisma.vulnerability.updateMany({
    where: { cveId: { in: cveArray } },
    data: { patchAvailable: true },
  });

  // Direction B: Generate recommendations for existing vulnerable assets
  generateRecommendationsForPatchCves(patchId, cveArray).catch((err) => {
    logger.error({ err, patchId }, 'Direction B recommendation generation after auto-correlate failed');
  });

  return cveArray;
}

/**
 * Direction B: Generate AssetPatchRecommendations for all assets that have
 * open vulnerabilities matching the given CVE IDs.
 */
export async function generateRecommendationsForPatchCves(
  patchId: string,
  cveNumbers: string[],
): Promise<number> {
  if (!cveNumbers || cveNumbers.length === 0) return 0;

  const vulns = await prisma.vulnerability.findMany({
    where: { cveId: { in: cveNumbers } },
    select: { id: true, cveId: true, severity: true, cvss3BaseScore: true, epss: true },
  });

  if (vulns.length === 0) return 0;

  const vulnIds = vulns.map(v => v.id);

  const assetVulns = await prisma.assetVulnerability.findMany({
    where: {
      vulnerabilityId: { in: vulnIds },
      status: 'Open',
    },
    select: {
      assetId: true,
      vulnerabilityId: true,
    },
  });

  if (assetVulns.length === 0) return 0;

  const patch = await prisma.patch.findUnique({
    where: { id: patchId },
    select: { id: true, software: true, title: true, supersededBy: true },
  });

  if (!patch || (patch.supersededBy && patch.supersededBy.length > 0)) {
    return 0;
  }

  let created = 0;
  const vulnMap = new Map(vulns.map(v => [v.id, v]));

  for (const av of assetVulns) {
    const vuln = vulnMap.get(av.vulnerabilityId);
    if (!vuln) continue;

    const existing = await prisma.assetPatchRecommendation.findFirst({
      where: {
        assetId: av.assetId,
        vulnerabilityId: av.vulnerabilityId,
        patchId,
      },
    });

    if (!existing) {
      const riskScore = Math.min(
        Math.round(
          (vuln.cvss3BaseScore || 0) * 10 * 0.5 +
          (vuln.epss || 0) * 0.3 +
          ({ CRITICAL: 20, HIGH: 15, MEDIUM: 10, LOW: 5 }[vuln.severity] || 0)
        ),
        100,
      );

      await prisma.assetPatchRecommendation.create({
        data: {
          assetId: av.assetId,
          vulnerabilityId: av.vulnerabilityId,
          patchId,
          status: 'RECOMMENDED',
          severity: vuln.severity,
          cvssScore: vuln.cvss3BaseScore,
          epssScore: vuln.epss,
          riskScore,
          reason: `Auto-recommended: ${vuln.cveId} fix available via ${patch.title || patch.software || 'patch'}`,
          affectedSoftware: patch.software || patch.title || '',
        },
      });
      created++;
    }
  }

  if (created > 0) {
    logger.info({ patchId, created, cveCount: cveNumbers.length }, 'Direction B: Generated recommendations for existing vulnerable assets');
  }

  return created;
}

// ============================================
// Patch Applicability Helpers
// ============================================

/**
 * Determine if an asset needs a specific patch.
 */
export function determineApplicability(
  patch: {
    vendor: string | null;
    product: string | null;
    os: string | null;
    software: string | null;
    cveNumbers: string[];
    affectedProducts?: Array<{ softwareName: string; version: string | null; vendor: string | null; platform: string | null }>;
  },
  asset: {
    os: string | null;
    software: Array<{ name: string; version: string | null; vendor: string | null; cpeVendor: string | null; cpeProduct: string | null }>;
    vulnerabilities: Array<{ vulnerability: { cveId: string } }>;
  },
): 'missing' | 'not_applicable' {
  // Strategy 1: CVE-based matching
  if (patch.cveNumbers.length > 0) {
    const assetCveIds = new Set(asset.vulnerabilities.map(v => v.vulnerability.cveId));
    if (patch.cveNumbers.some(cve => assetCveIds.has(cve))) {
      return 'missing';
    }
  }

  // Strategy 2: AffectedProduct matching
  if (patch.affectedProducts && patch.affectedProducts.length > 0) {
    for (const affected of patch.affectedProducts) {
      for (const sw of asset.software) {
        const nameMatch =
          sw.name.toLowerCase().includes(affected.softwareName.toLowerCase()) ||
          affected.softwareName.toLowerCase().includes(sw.name.toLowerCase());
        const vendorMatch = !affected.vendor || !sw.vendor ||
          sw.vendor.toLowerCase().includes(affected.vendor.toLowerCase());
        if (nameMatch && vendorMatch) return 'missing';
      }
    }
  }

  // Strategy 3: CPE vendor/product matching
  if (patch.vendor && patch.product) {
    const pv = patch.vendor.toLowerCase();
    const pp = patch.product.toLowerCase();
    for (const sw of asset.software) {
      if (
        (sw.cpeVendor?.toLowerCase() === pv && sw.cpeProduct?.toLowerCase() === pp) ||
        (sw.vendor?.toLowerCase().includes(pv) && sw.name.toLowerCase().includes(pp))
      ) {
        return 'missing';
      }
    }
  }

  // Strategy 4: OS + software name matching
  if (patch.os && patch.software && asset.os) {
    const osMatch = asset.os.toLowerCase().includes(patch.os.toLowerCase());
    if (osMatch) {
      for (const sw of asset.software) {
        if (sw.name.toLowerCase().includes(patch.software.toLowerCase())) {
          return 'missing';
        }
      }
    }
  }

  return 'not_applicable';
}

/**
 * Check all patches for applicability against a specific asset.
 * Called after processInventory() to keep patch applicability up to date.
 */
export async function checkPatchApplicabilityForAsset(assetId: string): Promise<void> {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        software: true,
        vulnerabilities: { include: { vulnerability: true } },
      },
    });

    if (!asset) return;

    const patches = await prisma.patch.findMany({
      where: {
        OR: [
          { cveNumbers: { isEmpty: false } },
          { affectedProducts: { some: {} } },
        ],
      },
      include: { affectedProducts: true },
      take: 500,
    });

    const { patchPrerequisiteService } = await import('@shared/services/patch-prerequisite.service');

    let updated = 0;
    for (const patch of patches) {
      const prerequisites = typedJson<PatchPrerequisites>(patch.prerequisites);
      const prerequisiteCheck = await patchPrerequisiteService.checkPrerequisites(
        assetId,
        prerequisites
      );

      if (!prerequisiteCheck.applicable) {
        continue;
      }

      const applicability = determineApplicability(
        patch,
        { ...asset, vulnerabilities: asset.vulnerabilities || [] },
      );

      if (applicability === 'missing') {
        updated++;
      }
    }

    if (updated > 0) {
      logger.info({ updated, assetId }, 'Patch-asset applicability mappings updated');
    }
  } catch (err) {
    logger.error({ err, assetId }, 'Patch applicability check failed');
  }
}

export async function getVulnerabilities(patchId: string) {
  const patch = await prisma.patch.findUnique({ where: { id: patchId } });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const vulnerabilities = await prisma.patchVulnerability.findMany({
    where: { patchId },
  });

  return vulnerabilities.map((v) => ({
    id: v.id,
    cveNumber: v.cveNumber,
    severity: v.severity,
    description: v.description,
    publishedDate: v.publishedDate?.toISOString() || null,
  }));
}

export async function getEndpoints(patchId: string, organizationId?: string) {
  const patch = await prisma.patch.findUnique({
    where: { id: patchId },
    select: { id: true, cveNumbers: true, affectedProducts: true },
  });
  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const assetWhere: Prisma.AssetWhereInput = {};
  if (organizationId) {
    assetWhere.organizationId = organizationId;
  }

  if (patch.cveNumbers && patch.cveNumbers.length > 0) {
    assetWhere.vulnerabilities = {
      some: {
        vulnerability: { cveId: { in: patch.cveNumbers } },
      },
    };
  } else if (patch.affectedProducts && patch.affectedProducts.length > 0) {
    const productNames = patch.affectedProducts.map((p: { softwareName: string }) => p.softwareName).filter(Boolean);
    if (productNames.length > 0) {
      assetWhere.software = {
        some: {
          name: { in: productNames, mode: 'insensitive' },
        },
      };
    }
  }

  if (!assetWhere.vulnerabilities && !assetWhere.software) {
    return [];
  }

  const assets = await prisma.asset.findMany({
    where: assetWhere,
    select: { id: true, name: true, os: true, status: true, updatedAt: true },
  });

  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    os: a.os || 'Unknown',
    status: a.status,
    lastSeen: a.updatedAt.toISOString(),
  }));
}

export async function scanEndpoints(patchId: string, data: { scope: string; endpointIds: string[] }, organizationId?: string) {
  const patch = await prisma.patch.findUnique({
    where: { id: patchId },
    include: {
      affectedProducts: true,
      vulnerabilities: true,
    },
  });

  if (!patch) {
    throw new NotFoundError('Patch not found');
  }

  const assetWhere: Prisma.AssetWhereInput = { status: { not: 'RETIRED' } };

  if (organizationId) {
    assetWhere.organizationId = organizationId;
  }

  if (data.scope === 'SPECIFIC_GROUPS' && data.endpointIds.length > 0) {
    assetWhere.id = { in: data.endpointIds };
  }

  if (patch.os) {
    assetWhere.os = { contains: patch.os, mode: 'insensitive' };
  }

  const assets = await prisma.asset.findMany({
    where: assetWhere,
    include: {
      software: true,
      vulnerabilities: { include: { vulnerability: true } },
    },
  });

  let missingCount = 0;
  let notApplicableCount = 0;

  for (const asset of assets) {
    const applicability = determineApplicability(patch, asset);
    if (applicability === 'missing') {
      missingCount++;
    } else if (applicability === 'not_applicable') {
      notApplicableCount++;
    }
  }

  await prisma.patch.update({
    where: { id: patchId },
    data: { endpoints: missingCount },
  });

  return {
    message: 'Scan completed',
    patchId,
    scope: data.scope,
    assetsScanned: assets.length,
    missing: missingCount,
    notApplicable: notApplicableCount,
  };
}
