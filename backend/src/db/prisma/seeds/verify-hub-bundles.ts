/**
 * verify-hub-bundles.ts — Verify integrity of uploaded hub bundles
 *
 * Downloads each bundle from MinIO, extracts it, and validates:
 *   - manifest.json exists and is valid
 *   - All referenced scripts and files exist
 *   - Scripts have proper shebang/header lines
 *   - Scripts reference PATCHIQ_DOWNLOAD_PATH
 *
 * Optionally runs Linux install scripts in Docker containers.
 *
 * Usage:
 *   cd backend && npx tsx src/db/prisma/seeds/verify-hub-bundles.ts [--docker]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as tar from 'tar';
import { Client as MinioClient } from 'minio';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// ─── Config ────────────────────────────────────────────────────────────────

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '3008', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'patchiq_admin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'patchiq_secret_key';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'patches';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';

const DOCKER_TEST = process.argv.includes('--docker');

// ─── Types ─────────────────────────────────────────────────────────────────

interface Manifest {
  name: string;
  displayName: string;
  version: string;
  vendor: string;
  platform: string;
  scripts: Record<string, string>;
  files: string[];
  [key: string]: unknown;
}

interface VerifyResult {
  name: string;
  version: string;
  platform: string;
  manifestOk: boolean;
  scriptsOk: boolean;
  dockerResult: string;
  errors: string[];
}

// ─── Validation helpers ────────────────────────────────────────────────────

function validateManifest(bundleDir: string): { ok: boolean; manifest: Manifest | null; errors: string[] } {
  const manifestPath = path.join(bundleDir, 'manifest.json');
  const errors: string[] = [];

  if (!fs.existsSync(manifestPath)) {
    return { ok: false, manifest: null, errors: ['manifest.json not found'] };
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    return { ok: false, manifest: null, errors: ['manifest.json is not valid JSON'] };
  }

  if (!manifest.scripts || typeof manifest.scripts !== 'object') {
    errors.push('manifest.scripts missing or not an object');
  }
  if (!Array.isArray(manifest.files)) {
    errors.push('manifest.files missing or not an array');
  }

  return { ok: errors.length === 0, manifest, errors };
}

function validateScripts(bundleDir: string, manifest: Manifest): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [action, scriptPath] of Object.entries(manifest.scripts)) {
    const fullPath = path.join(bundleDir, scriptPath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Script ${action} not found: ${scriptPath}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    // Check shebang / header
    if (scriptPath.endsWith('.sh')) {
      if (!content.startsWith('#!/bin/bash')) {
        errors.push(`Script ${action} (${scriptPath}) missing #!/bin/bash shebang`);
      }
    } else if (scriptPath.endsWith('.ps1')) {
      // PowerShell scripts: accept # comment header as valid
      if (!content.startsWith('#')) {
        errors.push(`Script ${action} (${scriptPath}) missing PowerShell comment header`);
      }
    }

    // Check for PATCHIQ_DOWNLOAD_PATH reference
    if (!content.includes('PATCHIQ_DOWNLOAD_PATH')) {
      // Uninstall scripts may not reference the download path
      if (action !== 'uninstall') {
        errors.push(`Script ${action} (${scriptPath}) does not reference PATCHIQ_DOWNLOAD_PATH`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function validateFiles(bundleDir: string, manifest: Manifest): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const filePath of manifest.files) {
    const fullPath = path.join(bundleDir, filePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`File not found: ${filePath}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function runDockerTest(bundleDir: string, manifest: Manifest): string {
  const installScriptPath = manifest.scripts.install;
  if (!installScriptPath) return 'no install script';

  const firstFile = manifest.files[0];
  if (!firstFile) return 'no files';

  if (manifest.platform === 'linux') {
    // Full install test in Ubuntu container
    const script = `apt-get update -qq && apt-get install -y -qq xz-utils tar gzip dpkg > /dev/null 2>&1; export PATCHIQ_DOWNLOAD_PATH="/bundle/${firstFile}" && bash "/bundle/${installScriptPath}"`;
    try {
      execSync(`docker run --rm -v "${bundleDir}:/bundle:ro" ubuntu:22.04 bash -c '${script.replace(/'/g, "'\\''")}'`, { timeout: 120_000, stdio: 'pipe' });
      return 'PASS';
    } catch (err: unknown) {
      const exitCode = (err as any)?.status ?? 'unknown';
      return `FAIL (exit ${exitCode})`;
    }
  }

  if (manifest.platform === 'windows') {
    // PowerShell syntax validation in pwsh container (can't run actual installers)
    const psCmd = `$tokens = $null; $errors = $null; $null = [System.Management.Automation.Language.Parser]::ParseFile("/bundle/${installScriptPath}", [ref]$tokens, [ref]$errors); if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 } else { Write-Host "Syntax OK"; exit 0 }`;
    try {
      execSync(`docker run --rm -v "${bundleDir}:/bundle:ro" mcr.microsoft.com/powershell:lts-ubuntu-22.04 pwsh -NoProfile -Command '${psCmd.replace(/'/g, "'\\''")}'`, { timeout: 60_000, stdio: 'pipe' });
      return 'SYNTAX OK';
    } catch (err: unknown) {
      const exitCode = (err as any)?.status ?? 'unknown';
      return `SYNTAX FAIL (${exitCode})`;
    }
  }

  if (manifest.platform === 'macos') {
    // Bash syntax check only (can't run macOS in Docker)
    try {
      execSync(`docker run --rm -v "${bundleDir}:/bundle:ro" ubuntu:22.04 bash -n "/bundle/${installScriptPath}"`, { timeout: 30_000, stdio: 'pipe' });
      return 'SYNTAX OK';
    } catch (err: unknown) {
      const exitCode = (err as any)?.status ?? 'unknown';
      return `SYNTAX FAIL (${exitCode})`;
    }
  }

  return 'N/A';
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function verifyHubBundles(): Promise<void> {
  const prisma = new PrismaClient();
  const minio = new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });

  try {
    const packages = await prisma.softwarePackage.findMany({
      where: { bundleObjectKey: { not: null } },
      orderBy: [{ platform: 'asc' }, { vendor: 'asc' }, { name: 'asc' }, { version: 'desc' }],
    });

    console.log('\n=== Hub Bundle Verifier ===');
    console.log(`Packages with bundles: ${packages.length}`);
    if (DOCKER_TEST) console.log('Docker testing: ENABLED');
    console.log('');

    if (packages.length === 0) {
      console.log('No bundled packages found.');
      return;
    }

    const results: VerifyResult[] = [];

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const idx = `[${i + 1}/${packages.length}]`;
      const label = `${pkg.displayName} ${pkg.version} (${pkg.platform})`;
      console.log(`${idx} Verifying ${label}...`);

      const result: VerifyResult = {
        name: pkg.displayName,
        version: pkg.version,
        platform: pkg.platform,
        manifestOk: false,
        scriptsOk: false,
        dockerResult: 'skipped',
        errors: [],
      };

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchiq-verify-'));

      try {
        // Download bundle from MinIO
        const bundleTarPath = path.join(tmpDir, 'bundle.tar.gz');
        await minio.fGetObject(MINIO_BUCKET, pkg.bundleObjectKey!, bundleTarPath);

        // Extract
        await tar.extract({ file: bundleTarPath, cwd: tmpDir });

        const bundleDir = path.join(tmpDir, 'bundle');
        if (!fs.existsSync(bundleDir)) {
          result.errors.push('Extracted archive does not contain a "bundle" directory');
          results.push(result);
          continue;
        }

        // Validate manifest
        const manifestResult = validateManifest(bundleDir);
        result.manifestOk = manifestResult.ok;
        result.errors.push(...manifestResult.errors);

        if (manifestResult.manifest) {
          // Validate scripts
          const scriptsResult = validateScripts(bundleDir, manifestResult.manifest);
          result.scriptsOk = scriptsResult.ok;
          result.errors.push(...scriptsResult.errors);

          // Validate files
          const filesResult = validateFiles(bundleDir, manifestResult.manifest);
          if (!filesResult.ok) {
            result.scriptsOk = false;
            result.errors.push(...filesResult.errors);
          }

          // Docker test
          if (DOCKER_TEST) {
            result.dockerResult = runDockerTest(bundleDir, manifestResult.manifest);
          }
        }

        results.push(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Download/extract failed: ${msg}`);
        results.push(result);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    // Print summary table
    console.log('\n=== Verification Summary ===\n');

    const colWidths = { name: 25, version: 12, platform: 10, manifest: 10, scripts: 10, docker: 18 };
    const header = [
      'Package'.padEnd(colWidths.name),
      'Version'.padEnd(colWidths.version),
      'Platform'.padEnd(colWidths.platform),
      'Manifest'.padEnd(colWidths.manifest),
      'Scripts'.padEnd(colWidths.scripts),
      'Docker'.padEnd(colWidths.docker),
    ].join(' | ');

    const separator = '-'.repeat(header.length);
    console.log(header);
    console.log(separator);

    let passCount = 0;
    let failCount = 0;

    for (const r of results) {
      const manifestStatus = r.manifestOk ? 'OK' : 'FAIL';
      const scriptsStatus = r.scriptsOk ? 'OK' : 'FAIL';
      const allOk = r.manifestOk && r.scriptsOk && ['PASS', 'SYNTAX OK', 'skipped', 'N/A'].includes(r.dockerResult);

      if (allOk) passCount++;
      else failCount++;

      const row = [
        r.name.slice(0, colWidths.name).padEnd(colWidths.name),
        r.version.slice(0, colWidths.version).padEnd(colWidths.version),
        r.platform.padEnd(colWidths.platform),
        manifestStatus.padEnd(colWidths.manifest),
        scriptsStatus.padEnd(colWidths.scripts),
        r.dockerResult.padEnd(colWidths.docker),
      ].join(' | ');

      console.log(row);

      if (r.errors.length > 0) {
        for (const err of r.errors) {
          console.log(`  -> ${err}`);
        }
      }
    }

    console.log(separator);
    console.log(`\nTotal: ${results.length}  |  Pass: ${passCount}  |  Fail: ${failCount}`);

    if (failCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Entry point ───────────────────────────────────────────────────────────

verifyHubBundles().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
