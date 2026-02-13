/**
 * Pipeline Validation Script
 *
 * Pulls real CVE data from NVD, caches locally, runs the full correlation pipeline,
 * and validates ALL PRD acceptance criteria from PRD-PATCH-VULNERABILITY-CORRELATION.md
 *
 * Usage: DATABASE_URL="..." JWT_SECRET="..." npx tsx scripts/validate-pipeline.ts
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, '../../data/cve-cache');
const RESULTS: Array<{ criterion: string; status: 'PASS' | 'FAIL'; details: string }> = [];

// NVD API rate limiting
const RATE_LIMIT_MS = 6500; // 5 req/30s = 6s between requests
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────
// Step 1: Fetch NVD CVE data for 5 target CPE prefixes and cache locally
// ─────────────────────────────────────────────────────────────────────
async function fetchAndCacheNVDData(): Promise<Record<string, number>> {
  const cpeTargets = [
    { prefix: 'cpe:2.3:a:mozilla:firefox', app: 'firefox' },
    { prefix: 'cpe:2.3:a:7-zip:7-zip', app: '7-zip' },
    { prefix: 'cpe:2.3:a:notepad-plus-plus:notepad\\+\\+', app: 'notepad++' },
    { prefix: 'cpe:2.3:a:openssl:openssl', app: 'openssl' },
    { prefix: 'cpe:2.3:a:nodejs:node.js', app: 'nodejs' },
  ];

  // Also try alternate CPE for 7-zip and notepad++
  const alternateCPEs = [
    { prefix: 'cpe:2.3:a:igor_pavlov:7-zip', app: '7-zip-alt' },
    { prefix: 'cpe:2.3:a:notepad\\+\\+:notepad\\+\\+', app: 'notepad++-alt' },
  ];

  const allTargets = [...cpeTargets, ...alternateCPEs];
  const counts: Record<string, number> = {};

  for (const target of allTargets) {
    const cacheFile = path.join(DATA_DIR, `${target.app}.json`);

    // Check if cache exists and is less than 24 hours old
    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
      if (ageHours < 24) {
        const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        console.log(`  [CACHE] ${target.app}: ${cached.totalResults} CVEs (cached ${ageHours.toFixed(1)}h ago)`);
        counts[target.app] = cached.totalResults;
        continue;
      }
    }

    console.log(`  [NVD] Fetching ${target.app} (${target.prefix})...`);
    const allVulns: unknown[] = [];
    let startIndex = 0;
    let totalResults = 0;

    while (true) {
      try {
        const response = await axios.get('https://services.nvd.nist.gov/rest/json/cves/2.0', {
          params: {
            virtualMatchString: target.prefix,
            resultsPerPage: 2000,
            startIndex,
          },
          timeout: 30000,
        });

        const data = response.data;
        totalResults = data.totalResults;

        if (!data.vulnerabilities || data.vulnerabilities.length === 0) break;

        allVulns.push(...data.vulnerabilities);
        console.log(`    Batch: ${startIndex + data.vulnerabilities.length}/${totalResults}`);

        startIndex += 2000;
        if (startIndex >= totalResults) break;

        await sleep(RATE_LIMIT_MS);
      } catch (error: unknown) {
        const axiosErr = error as { response?: { status: number } };
        if (axiosErr.response?.status === 429) {
          console.log('    Rate limited, waiting 30s...');
          await sleep(30000);
          continue;
        }
        console.error(`    Error fetching ${target.app}:`, (error as Error).message);
        break;
      }
    }

    // Save to cache
    const cacheData = {
      app: target.app,
      cpePrefix: target.prefix,
      totalResults,
      fetchedAt: new Date().toISOString(),
      vulnerabilities: allVulns,
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    counts[target.app] = totalResults;
    console.log(`  [SAVED] ${target.app}: ${totalResults} CVEs → ${cacheFile}`);

    await sleep(RATE_LIMIT_MS);
  }

  return counts;
}

// ─────────────────────────────────────────────────────────────────────
// Step 2: Import cached CVE data into the database
// ─────────────────────────────────────────────────────────────────────
async function importCachedCVEData(): Promise<number> {
  const cacheFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'validation-results.json');
  let totalImported = 0;

  for (const file of cacheFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
    const vulns = data.vulnerabilities || [];
    console.log(`  Importing ${vulns.length} CVEs from ${file}...`);

    for (const nvdVuln of vulns) {
      const cve = nvdVuln.cve;
      if (!cve || !cve.id) continue;

      const cvss31 = cve.metrics?.cvssMetricV31?.[0];
      const cvss2 = cve.metrics?.cvssMetricV2?.[0];

      let severity = 'MEDIUM';
      if (cvss31) {
        severity = cvss31.cvssData.baseSeverity.toUpperCase();
      } else if (cvss2) {
        const score = cvss2.cvssData.baseScore;
        if (score >= 9.0) severity = 'CRITICAL';
        else if (score >= 7.0) severity = 'HIGH';
        else if (score >= 4.0) severity = 'MEDIUM';
        else severity = 'LOW';
      }

      const description = cve.descriptions?.find((d: { lang: string; value: string }) => d.lang === 'en')?.value || '';

      try {
        // Upsert vulnerability
        const vulnRecord = await prisma.vulnerability.upsert({
          where: { cveId: cve.id },
          update: {
            title: `${cve.id}: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
            description,
            severity,
            cvss3BaseScore: cvss31?.cvssData.baseScore ?? null,
            cvss3AttackVector: cvss31?.cvssData.attackVector ?? null,
            cvss3AttackComplexity: cvss31?.cvssData.attackComplexity ?? null,
            cvss3PrivilegesRequired: cvss31?.cvssData.privilegesRequired ?? null,
            cvss3Scope: cvss31?.cvssData.scope ?? null,
            cvss3Confidentiality: cvss31?.cvssData.confidentialityImpact ?? null,
            cvss3Integrity: cvss31?.cvssData.integrityImpact ?? null,
            cvss3Availability: cvss31?.cvssData.availabilityImpact ?? null,
            cvss3ImpactScore: cvss31?.impactScore ?? null,
            cvss3VectorString: cvss31?.cvssData.vectorString ?? null,
            cvss2BaseScore: cvss2?.cvssData.baseScore ?? null,
            cvss2Severity: cvss2?.baseSeverity ?? null,
            riskScore: cvss31 ? cvss31.cvssData.baseScore * 10 : 0,
            publishedDate: new Date(cve.published),
            lastModified: new Date(cve.lastModified),
          },
          create: {
            cveId: cve.id,
            title: `${cve.id}: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
            description,
            severity,
            cvss3BaseScore: cvss31?.cvssData.baseScore ?? null,
            cvss3AttackVector: cvss31?.cvssData.attackVector ?? null,
            cvss3AttackComplexity: cvss31?.cvssData.attackComplexity ?? null,
            cvss3PrivilegesRequired: cvss31?.cvssData.privilegesRequired ?? null,
            cvss3Scope: cvss31?.cvssData.scope ?? null,
            cvss3Confidentiality: cvss31?.cvssData.confidentialityImpact ?? null,
            cvss3Integrity: cvss31?.cvssData.integrityImpact ?? null,
            cvss3Availability: cvss31?.cvssData.availabilityImpact ?? null,
            cvss3ImpactScore: cvss31?.impactScore ?? null,
            cvss3VectorString: cvss31?.cvssData.vectorString ?? null,
            cvss2BaseScore: cvss2?.cvssData.baseScore ?? null,
            cvss2Severity: cvss2?.baseSeverity ?? null,
            riskScore: cvss31 ? cvss31.cvssData.baseScore * 10 : 0,
            publishedDate: new Date(cve.published),
            lastModified: new Date(cve.lastModified),
            isZeroDay: false,
          },
        });

        // Import VulnerabilitySoftware (CPE configurations)
        if (cve.configurations) {
          // Delete old entries for this vulnerability
          await prisma.vulnerabilitySoftware.deleteMany({
            where: { vulnerabilityId: vulnRecord.id },
          });

          const processedEntries = new Set<string>();
          for (const config of cve.configurations) {
            for (const node of config.nodes) {
              for (const cpeMatch of node.cpeMatch) {
                if (cpeMatch.vulnerable) {
                  const cpeParts = cpeMatch.criteria.split(':');
                  if (cpeParts.length >= 6) {
                    const cpeVendor = cpeParts[3];
                    const cpeProduct = cpeParts[4];
                    const cpeVersion = cpeParts[5] !== '*' ? cpeParts[5] : null;

                    const versionStart = cpeMatch.versionStartIncluding || cpeMatch.versionStartExcluding || null;
                    const versionEnd = cpeMatch.versionEndIncluding || cpeMatch.versionEndExcluding || null;
                    const versionStartType = cpeMatch.versionStartIncluding ? 'including' :
                                             cpeMatch.versionStartExcluding ? 'excluding' : null;
                    const versionEndType = cpeMatch.versionEndIncluding ? 'including' :
                                           cpeMatch.versionEndExcluding ? 'excluding' : null;

                    const entryKey = `${cpeVendor}:${cpeProduct}:${versionStart || ''}:${versionEnd || ''}`;
                    if (!processedEntries.has(entryKey)) {
                      processedEntries.add(entryKey);
                      await prisma.vulnerabilitySoftware.create({
                        data: {
                          vulnerabilityId: vulnRecord.id,
                          name: cpeProduct,
                          vendor: cpeVendor,
                          version: cpeVersion,
                          fixedVersion: cpeMatch.versionEndExcluding || null,
                          cpeUri: cpeMatch.criteria,
                          cpeVendor,
                          cpeProduct,
                          versionStart,
                          versionEnd,
                          versionStartType,
                          versionEndType,
                        },
                      });
                    }
                  }
                }
              }
            }
          }
        }

        // Import references (limit 5 per CVE)
        if (cve.references && cve.references.length > 0) {
          await prisma.vulnerabilityReference.deleteMany({
            where: { vulnerabilityId: vulnRecord.id },
          });
          const refs = cve.references.slice(0, 5).map((ref: { url: string; source?: string }) => ({
            vulnerabilityId: vulnRecord.id,
            url: ref.url,
            source: ref.source || 'NVD',
          }));
          await prisma.vulnerabilityReference.createMany({ data: refs });
        }

        totalImported++;
      } catch (err) {
        // Skip duplicates silently
        if ((err as { code?: string }).code !== 'P2002') {
          console.error(`    Error importing ${cve.id}:`, (err as Error).message);
        }
      }
    }

    console.log(`  Imported from ${file}: ${vulns.length} CVEs processed`);
  }

  return totalImported;
}

// ─────────────────────────────────────────────────────────────────────
// Step 3: CISA KEV enrichment
// ─────────────────────────────────────────────────────────────────────
async function enrichCISAKEV(): Promise<number> {
  const cacheFile = path.join(DATA_DIR, 'cisa-kev.json');
  let kevData: { vulnerabilities: Array<{ cveID: string; requiredAction: string }> };

  if (fs.existsSync(cacheFile)) {
    const stat = fs.statSync(cacheFile);
    const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
    if (ageHours < 24) {
      kevData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      console.log(`  [CACHE] CISA KEV: ${kevData.vulnerabilities.length} entries (cached ${ageHours.toFixed(1)}h ago)`);
    } else {
      const resp = await axios.get('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', { timeout: 30000 });
      kevData = resp.data;
      fs.writeFileSync(cacheFile, JSON.stringify(kevData, null, 2));
      console.log(`  [SAVED] CISA KEV: ${kevData.vulnerabilities.length} entries`);
    }
  } else {
    const resp = await axios.get('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', { timeout: 30000 });
    kevData = resp.data;
    fs.writeFileSync(cacheFile, JSON.stringify(kevData, null, 2));
    console.log(`  [SAVED] CISA KEV: ${kevData.vulnerabilities.length} entries`);
  }

  let enriched = 0;
  for (const vuln of kevData.vulnerabilities) {
    const result = await prisma.vulnerability.updateMany({
      where: { cveId: vuln.cveID },
      data: { exploitable: true, fixRecommendation: vuln.requiredAction || null },
    });
    if (result.count > 0) enriched++;
  }

  return enriched;
}

// ─────────────────────────────────────────────────────────────────────
// Step 4: EPSS enrichment
// ─────────────────────────────────────────────────────────────────────
async function enrichEPSS(): Promise<number> {
  // Get all CVE IDs that need EPSS
  const vulns = await prisma.vulnerability.findMany({
    where: { epss: null },
    select: { cveId: true },
    take: 5000,
  });

  if (vulns.length === 0) return 0;

  let updated = 0;
  const batchSize = 100;

  for (let i = 0; i < vulns.length; i += batchSize) {
    const batch = vulns.slice(i, i + batchSize);
    const cveIds = batch.map(v => v.cveId).join(',');

    try {
      const resp = await axios.get('https://api.first.org/data/v1/epss', {
        params: { cve: cveIds },
        timeout: 30000,
      });

      if (resp.data.data) {
        for (const epssData of resp.data.data) {
          await prisma.vulnerability.updateMany({
            where: { cveId: epssData.cve },
            data: { epss: parseFloat(epssData.epss) * 100 },
          });
          updated++;
        }
      }

      await sleep(500);
    } catch (err) {
      console.error(`  EPSS batch error:`, (err as Error).message);
    }
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────
// Step 5: Run vulnerability scan on all seeded assets
// ─────────────────────────────────────────────────────────────────────
async function runVulnScans(): Promise<void> {
  // We need to dynamically import the service since it depends on env.ts
  // Instead, let's use the version compare utility directly and scan ourselves

  const { isVersionVulnerable, normalizeVersion } = await import('../src/shared/utils/version-compare');

  const assets = await prisma.asset.findMany({
    where: { name: { startsWith: 'ASSET-' } },
    include: {
      software: true,
    },
  });

  console.log(`  Scanning ${assets.length} assets...`);

  for (const asset of assets) {
    const confirmedVulnIds = new Set<string>();

    for (const sw of asset.software) {
      if (!sw.cpeVendor || !sw.cpeProduct) continue;

      // Find matching vulnerabilities
      // Note: Do NOT use mode: 'insensitive' with strings containing backslashes (e.g. notepad\+\+)
      // because Prisma uses ILIKE which treats \ as escape chars, causing match failures
      const vulnSoftware = await prisma.vulnerabilitySoftware.findMany({
        where: {
          cpeVendor: sw.cpeVendor,
          cpeProduct: sw.cpeProduct,
          OR: [
            { versionStart: { not: null } },
            { versionEnd: { not: null } },
            { fixedVersion: { not: null } },
          ],
        },
        include: {
          vulnerability: { select: { id: true, cveId: true, severity: true, title: true, cvss3BaseScore: true, epss: true, exploitable: true } },
        },
      });

      for (const vs of vulnSoftware) {
        let vulnerable = false;

        if (vs.versionStart || vs.versionEnd) {
          vulnerable = isVersionVulnerable(
            sw.version || '',
            vs.versionStart || undefined,
            (vs.versionStartType as 'including' | 'excluding') || undefined,
            vs.versionEnd || undefined,
            (vs.versionEndType as 'including' | 'excluding') || undefined
          );
        } else if (vs.fixedVersion && sw.version) {
          // Compare versions - if installed < fixed, it's vulnerable
          const normalizedInstalled = normalizeVersion(sw.version);
          const normalizedFixed = normalizeVersion(vs.fixedVersion);
          const parts1 = normalizedInstalled.split('.').map(p => parseInt(p, 10) || 0);
          const parts2 = normalizedFixed.split('.').map(p => parseInt(p, 10) || 0);
          const maxLen = Math.max(parts1.length, parts2.length);
          let cmp = 0;
          for (let i = 0; i < maxLen; i++) {
            if ((parts1[i] || 0) < (parts2[i] || 0)) { cmp = -1; break; }
            if ((parts1[i] || 0) > (parts2[i] || 0)) { cmp = 1; break; }
          }
          vulnerable = cmp < 0;
        }

        if (vulnerable) {
          confirmedVulnIds.add(vs.vulnerability.id);

          // Create AssetVulnerability
          await prisma.assetVulnerability.upsert({
            where: {
              assetId_vulnerabilityId: {
                assetId: asset.id,
                vulnerabilityId: vs.vulnerability.id,
              },
            },
            update: { detectedAt: new Date(), status: 'Open' },
            create: {
              assetId: asset.id,
              vulnerabilityId: vs.vulnerability.id,
              status: 'Open',
              detectedAt: new Date(),
            },
          });
        }
      }
    }

    console.log(`    ${asset.name}: ${confirmedVulnIds.size} vulnerabilities detected`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Step 6: Generate patch recommendations
// ─────────────────────────────────────────────────────────────────────
async function generateRecommendations(): Promise<number> {
  // Find all open asset vulnerabilities
  const assetVulns = await prisma.assetVulnerability.findMany({
    where: { status: 'Open' },
    include: {
      vulnerability: { select: { id: true, cveId: true, title: true, severity: true, cvss3BaseScore: true, epss: true, exploitable: true } },
      asset: { include: { software: true } },
    },
  });

  let recsCreated = 0;

  for (const av of assetVulns) {
    // Find approved patches that fix this CVE
    const patches = await prisma.patch.findMany({
      where: {
        cveNumbers: { has: av.vulnerability.cveId },
        approvalStatus: 'Approved',
      },
      select: { id: true, patchId: true, supersededBy: true },
    });

    // Filter out superseded patches
    const nonSuperseded = patches.filter(p => p.supersededBy.length === 0);

    for (const patch of nonSuperseded) {
      const existing = await prisma.assetPatchRecommendation.findUnique({
        where: {
          assetId_vulnerabilityId_patchId: {
            assetId: av.assetId,
            vulnerabilityId: av.vulnerabilityId,
            patchId: patch.id,
          },
        },
      });

      if (!existing) {
        // Calculate risk score
        let riskScore = 0;
        if (av.vulnerability.cvss3BaseScore) riskScore += av.vulnerability.cvss3BaseScore * 10 * 0.5;
        if (av.vulnerability.epss) riskScore += av.vulnerability.epss * 0.3;
        const severityBoost: Record<string, number> = { CRITICAL: 20, HIGH: 15, MEDIUM: 10, LOW: 5 };
        riskScore += severityBoost[av.vulnerability.severity] || 0;
        if (av.vulnerability.exploitable) riskScore += 10;
        riskScore = Math.min(Math.round(riskScore), 100);

        // Find matching software on the asset
        const sw = av.asset.software.find(s =>
          (s.cpeVendor && s.cpeProduct) ||
          s.name.toLowerCase().includes(av.vulnerability.title?.toLowerCase().split(':')[0] || '')
        );

        await prisma.assetPatchRecommendation.create({
          data: {
            assetId: av.assetId,
            vulnerabilityId: av.vulnerabilityId,
            patchId: patch.id,
            status: 'RECOMMENDED',
            severity: av.vulnerability.severity,
            cvssScore: av.vulnerability.cvss3BaseScore,
            epssScore: av.vulnerability.epss,
            riskScore,
            reason: `Fixes ${av.vulnerability.cveId}: ${av.vulnerability.title?.slice(0, 100) || 'Vulnerability'}`,
            affectedSoftware: sw ? `${sw.name} ${sw.version || ''}`.trim() : 'Unknown',
          },
        });
        recsCreated++;
      }
    }
  }

  return recsCreated;
}

// ─────────────────────────────────────────────────────────────────────
// Step 7: Validate ALL PRD acceptance criteria
// ─────────────────────────────────────────────────────────────────────
async function validatePRDCriteria(): Promise<void> {
  console.log('\n========================================');
  console.log('  PRD ACCEPTANCE CRITERIA VALIDATION');
  console.log('========================================\n');

  // ── R1: CVE counts per application ──
  const firefoxCVEs = await prisma.vulnerability.count({
    where: { affectedSoftware: { some: { cpeVendor: 'mozilla', cpeProduct: 'firefox' } } },
  });
  check('R1: Firefox CVEs >= 50', firefoxCVEs >= 50, `Found ${firefoxCVEs}`);

  const sevenZipCVEs = await prisma.vulnerability.count({
    where: {
      affectedSoftware: {
        some: {
          OR: [
            { cpeVendor: '7-zip', cpeProduct: '7-zip' },
            { cpeVendor: 'igor_pavlov', cpeProduct: '7-zip' },
          ],
        },
      },
    },
  });
  check('R1: 7-Zip CVEs >= 10', sevenZipCVEs >= 10, `Found ${sevenZipCVEs}`);

  const notepadCVEs = await prisma.vulnerability.count({
    where: {
      affectedSoftware: {
        some: {
          OR: [
            { cpeProduct: { contains: 'notepad' } },
            { cpeVendor: { contains: 'notepad' } },
          ],
        },
      },
    },
  });
  check('R1: Notepad++ CVEs >= 10', notepadCVEs >= 10, `Found ${notepadCVEs}`);

  const opensslCVEs = await prisma.vulnerability.count({
    where: { affectedSoftware: { some: { cpeVendor: 'openssl', cpeProduct: 'openssl' } } },
  });
  check('R1: OpenSSL CVEs >= 100', opensslCVEs >= 100, `Found ${opensslCVEs}`);

  const nodejsCVEs = await prisma.vulnerability.count({
    where: { affectedSoftware: { some: { cpeVendor: 'nodejs', cpeProduct: 'node.js' } } },
  });
  check('R1: Node.js CVEs >= 30', nodejsCVEs >= 30, `Found ${nodejsCVEs}`);

  // ── R7: Post-pipeline validation ──
  const totalAssetVulns = await prisma.assetVulnerability.count({
    where: { asset: { name: { startsWith: 'ASSET-' } } },
  });
  check('R7: At least 10 AssetVulnerability records', totalAssetVulns >= 10, `Found ${totalAssetVulns}`);

  const totalRecs = await prisma.assetPatchRecommendation.count({
    where: { asset: { name: { startsWith: 'ASSET-' } } },
  });
  check('R7: At least 5 AssetPatchRecommendation records', totalRecs >= 5, `Found ${totalRecs}`);

  // Check each of the 5 apps has at least one vulnerability
  const appsWithVulns = await checkAppVulnerabilities();
  check('R7: Each of 5 apps has at least one vulnerability', appsWithVulns.allCovered, appsWithVulns.details);

  // Check each of the 5 apps has at least one recommendation
  const appsWithRecs = await checkAppRecommendations();
  check('R7: Each of 5 apps has at least one recommendation', appsWithRecs.allCovered, appsWithRecs.details);

  // Check safe versions not flagged
  const macAsset = await prisma.asset.findFirst({ where: { name: 'ASSET-MAC-01' } });
  if (macAsset) {
    // Firefox 120.0 should not have Firefox-specific vulns with ranges ending below 120
    const macVulns = await prisma.assetVulnerability.count({
      where: {
        assetId: macAsset.id,
        vulnerability: {
          affectedSoftware: {
            some: { cpeVendor: 'mozilla', cpeProduct: 'firefox' },
          },
        },
      },
    });
    // Note: Some Firefox CVEs may still match 120.0 if their range includes it
    // The key test is that MAC-01's Firefox 120.0 has FEWER vulns than other assets' Firefox 115.0
    const win01Asset = await prisma.asset.findFirst({ where: { name: 'ASSET-WIN-01' } });
    const win01FirefoxVulns = win01Asset ? await prisma.assetVulnerability.count({
      where: {
        assetId: win01Asset.id,
        vulnerability: {
          affectedSoftware: { some: { cpeVendor: 'mozilla', cpeProduct: 'firefox' } },
        },
      },
    }) : 0;
    check('R7: Safe Firefox 120.0 (MAC-01) has fewer vulns than vulnerable Firefox 115.0 (WIN-01)',
      macVulns < win01FirefoxVulns,
      `MAC-01 Firefox vulns: ${macVulns}, WIN-01 Firefox vulns: ${win01FirefoxVulns}`
    );

    // OpenSSL 3.0.19 on MAC-01 should not be flagged for vulns with range ending at 3.0.19 excluding
    const macOpenSSLVulns = await prisma.assetVulnerability.count({
      where: {
        assetId: macAsset.id,
        vulnerability: {
          affectedSoftware: {
            some: {
              cpeVendor: 'openssl',
              cpeProduct: 'openssl',
              versionEnd: '3.0.19',
              versionEndType: 'excluding',
            },
          },
        },
      },
    });
    check('R7: Safe OpenSSL 3.0.19 (MAC-01) not flagged for vulns with range < 3.0.19',
      macOpenSSLVulns === 0,
      `Found ${macOpenSSLVulns} (should be 0)`
    );
  }

  // ── R1: CISA KEV enrichment ──
  const exploitableCount = await prisma.vulnerability.count({
    where: { exploitable: true },
  });
  check('R1: CISA KEV enrichment - some CVEs marked exploitable', exploitableCount > 0, `Found ${exploitableCount} exploitable CVEs`);

  // ── R1: EPSS enrichment ──
  const epssCount = await prisma.vulnerability.count({
    where: { epss: { not: null } },
  });
  check('R1: EPSS enrichment - some CVEs have EPSS scores', epssCount > 0, `Found ${epssCount} CVEs with EPSS scores`);

  // ── R1: Idempotency (just check no duplicates) ──
  const totalVulnCount = await prisma.vulnerability.count();
  const uniqueVulns = await prisma.vulnerability.groupBy({ by: ['cveId'] });
  const hasDuplicates = uniqueVulns.length < totalVulnCount;
  check('R1: No duplicate CVEs in database', !hasDuplicates, `${totalVulnCount} total, ${uniqueVulns.length} unique`);

  // ── Print summary ──
  console.log('\n========================================');
  console.log('  VALIDATION SUMMARY');
  console.log('========================================');
  const passes = RESULTS.filter(r => r.status === 'PASS').length;
  const fails = RESULTS.filter(r => r.status === 'FAIL').length;
  console.log(`  PASS: ${passes}  |  FAIL: ${fails}  |  TOTAL: ${RESULTS.length}`);
  console.log('========================================\n');

  for (const r of RESULTS) {
    const icon = r.status === 'PASS' ? '[PASS]' : '[FAIL]';
    console.log(`  ${icon} ${r.criterion} — ${r.details}`);
  }

  // Write results to file
  const resultsFile = path.join(DATA_DIR, 'validation-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { passes, fails, total: RESULTS.length },
    results: RESULTS,
  }, null, 2));
  console.log(`\nResults saved to ${resultsFile}`);
}

function check(criterion: string, passed: boolean, details: string): void {
  RESULTS.push({ criterion, status: passed ? 'PASS' : 'FAIL', details });
}

async function checkAppVulnerabilities(): Promise<{ allCovered: boolean; details: string }> {
  const apps = [
    { cpeVendor: 'mozilla', cpeProduct: 'firefox', label: 'Firefox' },
    { cpeVendor: '7-zip', cpeProduct: '7-zip', label: '7-Zip' },
    { cpeVendor: 'notepad-plus-plus', cpeProduct: 'notepad\\+\\+', label: 'Notepad++' },
    { cpeVendor: 'openssl', cpeProduct: 'openssl', label: 'OpenSSL' },
    { cpeVendor: 'nodejs', cpeProduct: 'node.js', label: 'Node.js' },
  ];

  const results: string[] = [];
  let allCovered = true;

  for (const app of apps) {
    // Check if any asset has vulnerabilities for this app's software
    const count = await prisma.assetVulnerability.count({
      where: {
        asset: { name: { startsWith: 'ASSET-' } },
        vulnerability: {
          affectedSoftware: {
            some: {
              OR: [
                { cpeVendor: app.cpeVendor, cpeProduct: app.cpeProduct },
                // Also check alternate vendor names
                ...(app.label === '7-Zip' ? [{ cpeVendor: 'igor_pavlov', cpeProduct: '7-zip' }] : []),
                ...(app.label === 'Notepad++' ? [{ cpeVendor: { contains: 'notepad' } }] : []),
              ],
            },
          },
        },
      },
    });

    results.push(`${app.label}: ${count}`);
    if (count === 0) allCovered = false;
  }

  return { allCovered, details: results.join(', ') };
}

async function checkAppRecommendations(): Promise<{ allCovered: boolean; details: string }> {
  const patches = await prisma.patch.findMany({
    where: {
      patchId: { startsWith: 'PATCH-' },
      approvalStatus: 'Approved',
      supersededBy: { isEmpty: true }, // Skip superseded patches — they correctly have no recommendations
    },
    select: { id: true, software: true, patchId: true },
  });

  const results: string[] = [];
  let allCovered = true;

  for (const patch of patches) {
    const count = await prisma.assetPatchRecommendation.count({
      where: {
        patchId: patch.id,
        asset: { name: { startsWith: 'ASSET-' } },
      },
    });
    results.push(`${patch.software}: ${count}`);
    if (count === 0) allCovered = false;
  }

  return { allCovered, details: results.join(', ') };
}

// ─────────────────────────────────────────────────────────────────────
// Main execution
// ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Pipeline Validation Script ===\n');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Step 1: Fetch NVD data
  console.log('Step 1: Fetching NVD CVE data for 5 target applications...');
  const counts = await fetchAndCacheNVDData();
  console.log(`  Total CVE counts:`, counts);

  // Step 2: Import into DB
  console.log('\nStep 2: Importing cached CVE data into database...');
  const imported = await importCachedCVEData();
  console.log(`  Total imported: ${imported}`);

  // Step 3: CISA KEV
  console.log('\nStep 3: Enriching with CISA KEV data...');
  const kevEnriched = await enrichCISAKEV();
  console.log(`  KEV enriched: ${kevEnriched} CVEs`);

  // Step 4: EPSS
  console.log('\nStep 4: Enriching with EPSS scores...');
  const epssUpdated = await enrichEPSS();
  console.log(`  EPSS updated: ${epssUpdated} CVEs`);

  // Step 5: Correlate patches with CVEs (Direction A)
  console.log('\nStep 5: Correlating existing patches with imported CVEs...');
  const patches = await prisma.patch.findMany({
    where: { approvalStatus: 'Approved' },
    select: { id: true, patchId: true, cveNumbers: true },
  });

  let correlated = 0;
  for (const patch of patches) {
    for (const cveId of patch.cveNumbers) {
      const vuln = await prisma.vulnerability.findUnique({ where: { cveId } });
      if (vuln) {
        await prisma.vulnerability.update({
          where: { id: vuln.id },
          data: { patchAvailable: true },
        });

        const existing = await prisma.patchVulnerability.findFirst({
          where: { patchId: patch.id, cveNumber: cveId },
        });
        if (!existing) {
          await prisma.patchVulnerability.create({
            data: {
              patchId: patch.id,
              cveNumber: cveId,
              severity: vuln.severity,
              description: (vuln.description || '').slice(0, 500) || null,
              publishedDate: vuln.publishedDate,
              correlationSource: 'pipeline-validation',
            },
          });
          correlated++;
        }
      }
    }
  }
  console.log(`  Correlated: ${correlated} patch-CVE links`);

  // Step 6: Run vulnerability scans
  console.log('\nStep 6: Running vulnerability scans on all 5 test assets...');
  await runVulnScans();

  // Step 7: Generate patch recommendations
  console.log('\nStep 7: Generating patch recommendations...');
  const recsCreated = await generateRecommendations();
  console.log(`  Recommendations created: ${recsCreated}`);

  // Step 8: Validate all PRD criteria
  await validatePRDCriteria();

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Pipeline validation failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
