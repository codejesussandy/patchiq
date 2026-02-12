/**
 * Backfill CPE Version Ranges
 *
 * This script re-fetches CVE data from NVD to populate version range fields
 * that were not captured by the original sync.
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-cpe-version-ranges.ts [--limit N] [--batch-size N]
 *
 * Options:
 *   --limit N       Maximum number of CVEs to process (default: 1000)
 *   --batch-size N  CVEs to fetch per NVD request (default: 100)
 */

import axios from 'axios';
import { env } from '../config/env';
import { prisma } from '../db/client';

interface NVDCVEResponse {
  resultsPerPage: number;
  startIndex: number;
  totalResults: number;
  vulnerabilities: Array<{
    cve: {
      id: string;
      configurations?: Array<{
        nodes: Array<{
          operator: string;
          negate: boolean;
          cpeMatch: Array<{
            vulnerable: boolean;
            criteria: string;
            versionStartIncluding?: string;
            versionStartExcluding?: string;
            versionEndExcluding?: string;
            versionEndIncluding?: string;
          }>;
        }>;
      }>;
    };
  }>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCVEFromNVD(cveId: string): Promise<NVDCVEResponse | null> {
  const nvdClient = axios.create({
    baseURL: env.NVD_API_URL,
    timeout: 30000,
    headers: {
      Accept: 'application/json',
      ...(env.NIST_NVD_API_KEY && { apiKey: env.NIST_NVD_API_KEY }),
    },
  });

  try {
    const response = await nvdClient.get<NVDCVEResponse>('', {
      params: { cveId },
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch ${cveId}:`, (error as Error).message);
    return null;
  }
}

async function updateVulnerabilitySoftware(
  cveId: string,
  configurations: NVDCVEResponse['vulnerabilities'][0]['cve']['configurations']
): Promise<number> {
  if (!configurations) return 0;

  const vulnRecord = await prisma.vulnerability.findUnique({
    where: { cveId },
    select: { id: true },
  });

  if (!vulnRecord) return 0;

  let updated = 0;

  for (const config of configurations) {
    for (const node of config.nodes) {
      for (const cpeMatch of node.cpeMatch) {
        if (cpeMatch.vulnerable) {
          const cpeParts = cpeMatch.criteria.split(':');
          if (cpeParts.length >= 6) {
            const cpeVendor = cpeParts[3];
            const cpeProduct = cpeParts[4];

            const versionStart =
              cpeMatch.versionStartIncluding || cpeMatch.versionStartExcluding || null;
            const versionEnd =
              cpeMatch.versionEndIncluding || cpeMatch.versionEndExcluding || null;
            const versionStartType = cpeMatch.versionStartIncluding
              ? 'including'
              : cpeMatch.versionStartExcluding
                ? 'excluding'
                : null;
            const versionEndType = cpeMatch.versionEndIncluding
              ? 'including'
              : cpeMatch.versionEndExcluding
                ? 'excluding'
                : null;

            // Update existing records that match this vendor:product
            const result = await prisma.vulnerabilitySoftware.updateMany({
              where: {
                vulnerabilityId: vulnRecord.id,
                cpeVendor,
                cpeProduct,
              },
              data: {
                cpeUri: cpeMatch.criteria,
                versionStart,
                versionEnd,
                versionStartType,
                versionEndType,
              },
            });

            updated += result.count;
          }
        }
      }
    }
  }

  return updated;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.indexOf('--limit');
  const batchArg = args.indexOf('--batch-size');

  const limit = limitArg >= 0 ? parseInt(args[limitArg + 1], 10) : 1000;
  const batchSize = batchArg >= 0 ? parseInt(args[batchArg + 1], 10) : 100;

  console.log('=== CPE Version Range Backfill ===');
  console.log(`Limit: ${limit}, Batch Size: ${batchSize}`);
  console.log('');

  // Find CVEs that have VulnerabilitySoftware without version ranges
  const cvesToProcess = await prisma.vulnerability.findMany({
    where: {
      affectedSoftware: {
        some: {
          cpeUri: null, // No CPE URI means not yet backfilled
        },
      },
    },
    select: { cveId: true },
    take: limit,
  });

  console.log(`Found ${cvesToProcess.length} CVEs to process`);

  let processed = 0;
  let totalUpdated = 0;
  const delay = env.NIST_NVD_API_KEY ? 600 : 6000; // Rate limiting

  for (const vuln of cvesToProcess) {
    processed++;

    const nvdData = await fetchCVEFromNVD(vuln.cveId);
    if (nvdData && nvdData.vulnerabilities && nvdData.vulnerabilities.length > 0) {
      const configs = nvdData.vulnerabilities[0].cve.configurations;
      const updated = await updateVulnerabilitySoftware(vuln.cveId, configs);
      totalUpdated += updated;

      if (processed % 10 === 0) {
        console.log(`Progress: ${processed}/${cvesToProcess.length} CVEs, ${totalUpdated} records updated`);
      }
    }

    // Rate limiting
    await sleep(delay);
  }

  console.log('');
  console.log('=== Backfill Complete ===');
  console.log(`Processed: ${processed} CVEs`);
  console.log(`Updated: ${totalUpdated} VulnerabilitySoftware records`);

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
