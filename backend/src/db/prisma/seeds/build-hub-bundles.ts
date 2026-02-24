/**
 * build-hub-bundles.ts — Download installers, generate scripts, and build bundle.tar.gz for each hub package
 *
 * Reads SoftwarePackage records from the database, downloads their installers,
 * generates platform-appropriate install/update/uninstall scripts, creates a
 * manifest.json, packages everything into bundle.tar.gz, uploads to MinIO,
 * and updates the DB record.
 *
 * Usage:
 *   cd backend && npx tsx src/db/prisma/seeds/build-hub-bundles.ts [--force] [--no-cache]
 *
 *   --force     Rebuild bundles even for packages that already have bundleObjectKey set
 *   --no-cache  Skip local cache and download fresh installers
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as tar from 'tar';
import { Client as MinioClient } from 'minio';
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

const FORCE = process.argv.includes('--force');
const NO_CACHE = process.argv.includes('--no-cache');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const LOCAL_CACHE_DIR = path.resolve(__dirname, '../../../../hub-bundles-cache');

// ─── Script templates ──────────────────────────────────────────────────────
// Shared script generation — imported from generate-package-scripts.ts
import { generateScripts, detectInstallerType, type ScriptSet } from './generate-package-scripts';

// ─── Helpers ───────────────────────────────────────────────────────────────

async function downloadFile(url: string, destPath: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`    Downloading (attempt ${attempt}/${MAX_RETRIES})...`);
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(arrayBuffer));

      const sizeMB = (fs.statSync(destPath).size / 1024 / 1024).toFixed(1);
      console.log(`    Downloaded ${sizeMB} MB`);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_RETRIES) {
        throw new Error(`Download failed after ${MAX_RETRIES} attempts: ${msg}`);
      }
      console.log(`    Attempt ${attempt} failed (${msg}), retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

function sha256File(filePath: string): string {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

// ─── Cache helpers ─────────────────────────────────────────────────────────

function getCachePath(platform: string, name: string, version: string, fileName: string): string {
  return path.join(LOCAL_CACHE_DIR, platform, name, version, fileName);
}

function readFromCache(cachePath: string): boolean {
  if (NO_CACHE) return false;
  return fs.existsSync(cachePath);
}

function writeToCache(cachePath: string, sourcePath: string): void {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.copyFileSync(sourcePath, cachePath);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function buildHubBundles(): Promise<void> {
  const prisma = new PrismaClient();
  const minio = new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });

  // Ensure bucket exists
  const bucketExists = await minio.bucketExists(MINIO_BUCKET);
  if (!bucketExists) {
    await minio.makeBucket(MINIO_BUCKET, 'us-east-1');
    console.log(`Created MinIO bucket: ${MINIO_BUCKET}`);
  }

  try {
    // Query all SoftwarePackage records
    const whereClause = FORCE ? {} : { bundleObjectKey: null };
    const packages = await prisma.softwarePackage.findMany({
      where: whereClause,
      orderBy: [{ platform: 'asc' }, { vendor: 'asc' }, { name: 'asc' }, { version: 'desc' }],
    });

    console.log('\n=== Hub Bundle Builder ===');
    console.log(`Packages to process: ${packages.length}${FORCE ? ' (--force)' : ' (skipping already-bundled)'}`);

    if (packages.length === 0) {
      console.log('Nothing to do.');
      return;
    }

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const idx = `[${i + 1}/${packages.length}]`;
      const label = `${pkg.displayName} ${pkg.version} (${pkg.platform})`;

      console.log(`\n${idx} ${label}`);

      if (!pkg.downloadUrl) {
        console.log('    SKIP: No downloadUrl');
        skipped++;
        continue;
      }

      // Create temp working directory
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchiq-bundle-'));
      const bundleDir = path.join(tmpDir, 'bundle');
      const filesDir = path.join(bundleDir, 'files');
      const scriptsDir = path.join(bundleDir, 'scripts');
      fs.mkdirSync(filesDir, { recursive: true });
      fs.mkdirSync(scriptsDir, { recursive: true });

      try {
        if (!pkg.fileName) {
          console.log('    SKIP: No fileName');
          skipped++;
          continue;
        }

        // 1. Download installer (or use cache)
        const installerPath = path.join(filesDir, pkg.fileName);
        const installerCachePath = getCachePath(pkg.platform, pkg.name, pkg.version, pkg.fileName);

        if (readFromCache(installerCachePath)) {
          console.log(`    Using cached installer: ${installerCachePath}`);
          fs.copyFileSync(installerCachePath, installerPath);
        } else {
          await downloadFile(pkg.downloadUrl, installerPath);
          writeToCache(installerCachePath, installerPath);
          console.log(`    Cached installer to: ${installerCachePath}`);
        }

        // 2. Generate scripts
        const scripts = generateScripts({
          name: pkg.name,
          displayName: pkg.displayName,
          version: pkg.version,
          platform: pkg.platform,
          installSource: pkg.installSource,
          installArgs: pkg.installArgs,
          fileName: pkg.fileName!,
        });

        fs.writeFileSync(path.join(scriptsDir, scripts.install.name), scripts.install.content, { mode: 0o755 });
        fs.writeFileSync(path.join(scriptsDir, scripts.update.name), scripts.update.content, { mode: 0o755 });
        fs.writeFileSync(path.join(scriptsDir, scripts.uninstall.name), scripts.uninstall.content, { mode: 0o755 });

        // 3. Create manifest.json
        const requiresRoot = pkg.platform === 'linux' || pkg.platform === 'macos';
        const manifest = {
          name: pkg.name,
          displayName: pkg.displayName,
          version: pkg.version,
          vendor: pkg.vendor,
          platform: pkg.platform,
          architecture: pkg.architecture,
          category: pkg.category,
          description: pkg.description,
          requiresReboot: false,
          requiresRoot,
          scripts: {
            install: `scripts/${scripts.install.name}`,
            update: `scripts/${scripts.update.name}`,
            uninstall: `scripts/${scripts.uninstall.name}`,
          },
          files: [`files/${pkg.fileName}`],
        };

        fs.writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        // 4. Create bundle.tar.gz
        const bundleTarPath = path.join(tmpDir, 'bundle.tar.gz');
        await tar.create(
          {
            gzip: true,
            file: bundleTarPath,
            cwd: tmpDir,
          },
          ['bundle']
        );

        const bundleStats = fs.statSync(bundleTarPath);
        const bundleChecksum = sha256File(bundleTarPath);
        const bundleSizeMB = (bundleStats.size / 1024 / 1024).toFixed(1);
        console.log(`    Bundle: ${bundleSizeMB} MB, SHA256: ${bundleChecksum.slice(0, 16)}...`);

        // 4b. Cache the bundle
        const bundleCachePath = getCachePath(pkg.platform, pkg.name, pkg.version, 'bundle.tar.gz');
        writeToCache(bundleCachePath, bundleTarPath);
        console.log(`    Cached bundle to: ${bundleCachePath}`);

        // 5. Upload to MinIO
        const sanitize = (s: string) =>
          s.toLowerCase().replace(/[^a-z0-9-_.]/g, '-').replace(/-+/g, '-');

        const objectKey = `packages/${pkg.platform}/${sanitize(pkg.vendor || 'unknown')}/${sanitize(pkg.name)}/${sanitize(pkg.version)}/bundle.tar.gz`;

        await minio.fPutObject(MINIO_BUCKET, objectKey, bundleTarPath, {
          'Content-Type': 'application/gzip',
        });
        console.log(`    Uploaded: ${MINIO_BUCKET}/${objectKey}`);

        // 6. Update DB
        await prisma.softwarePackage.update({
          where: { id: pkg.id },
          data: {
            bundleObjectKey: objectKey,
            bundleChecksum,
            bundleSize: BigInt(bundleStats.size),
            manifestJson: manifest as any,
            scriptsIncluded: true,
          },
        });
        console.log(`    DB updated`);

        success++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    FAILED: ${msg}`);
        failed++;
      } finally {
        // Clean up temp dir
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    console.log(`\n=== Bundle Build Summary ===`);
    console.log(`  Success: ${success}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Total:   ${packages.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Entry point ───────────────────────────────────────────────────────────

buildHubBundles().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
