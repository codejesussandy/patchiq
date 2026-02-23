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

interface ScriptSet {
  install: { name: string; content: string };
  update: { name: string; content: string };
  uninstall: { name: string; content: string };
}

function getScriptExtension(platform: string): string {
  return platform === 'windows' ? '.ps1' : '.sh';
}

/**
 * Determine the original installer type from fileName and installArgs,
 * since installSource is now 'bundle' for all packages.
 */
function detectInstallerType(pkg: { platform: string; fileName: string; installArgs: string | null }): string {
  const fn = pkg.fileName.toLowerCase();
  if (pkg.platform === 'windows') {
    if (fn.endsWith('.msi')) return 'msi';
    if (fn.endsWith('.exe') && pkg.installArgs?.includes('/VERYSILENT')) return 'inno';
    if (fn.endsWith('.exe') && pkg.installArgs?.includes('InstallAllUsers')) return 'python';
    if (fn.endsWith('.exe')) return 'nsis';
  }
  if (pkg.platform === 'macos') {
    if (fn.endsWith('.dmg')) return 'dmg';
    if (fn.endsWith('.pkg')) return 'pkg';
    if (fn.endsWith('.zip')) return 'zip';
  }
  if (pkg.platform === 'linux') {
    if (fn.endsWith('.deb')) return 'deb';
    if (fn.endsWith('.tar.gz')) return 'targz';
    if (fn.endsWith('.tar.xz')) return 'tarxz';
    if (fn.endsWith('.zip')) return 'zip';
  }
  return 'unknown';
}

function generateScripts(pkg: {
  name: string;
  displayName: string;
  version: string;
  platform: string;
  installSource: string;
  installArgs: string | null;
  fileName: string;
}): ScriptSet {
  const ext = getScriptExtension(pkg.platform);
  const installerType = detectInstallerType(pkg);

  // ── Windows NSIS (7-Zip, Notepad++, VLC) — exe with /S ──
  if (pkg.platform === 'windows' && installerType === 'nsis') {
    const installScript = `# Install ${pkg.displayName} ${pkg.version} (NSIS silent)
$ErrorActionPreference = 'Stop'
$p = Start-Process -FilePath "$env:PATCHIQ_DOWNLOAD_PATH" -ArgumentList '/S' -Wait -PassThru -NoNewWindow
if ($p.ExitCode -ne 0) { exit $p.ExitCode }
`;
    const uninstallScript = `# Uninstall ${pkg.displayName} (NSIS)
$ErrorActionPreference = 'Stop'
$app = Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
                         "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -match '${pkg.displayName.replace(/[+]/g, '\\$&')}' } |
        Select-Object -First 1

if (-not $app) {
    Write-Error "${pkg.displayName} not found in registry"
    exit 1
}

$uninstallCmd = $app.UninstallString
$uninstallExe = ($uninstallCmd -split '"')[1]
if (-not $uninstallExe) { $uninstallExe = $uninstallCmd.Split(' ')[0] }
$p = Start-Process -FilePath $uninstallExe -ArgumentList '/S' -Wait -PassThru -NoNewWindow
if ($p.ExitCode -ne 0) { exit $p.ExitCode }
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── Windows Inno Setup (Git) — exe with /VERYSILENT ──
  if (pkg.platform === 'windows' && installerType === 'inno') {
    const installScript = `# Install ${pkg.displayName} ${pkg.version} (Inno Setup silent)
$ErrorActionPreference = 'Stop'
$p = Start-Process -FilePath "$env:PATCHIQ_DOWNLOAD_PATH" -ArgumentList '/VERYSILENT','/NORESTART' -Wait -PassThru -NoNewWindow
if ($p.ExitCode -ne 0) { exit $p.ExitCode }
`;
    const uninstallScript = `# Uninstall ${pkg.displayName} (Inno Setup)
$ErrorActionPreference = 'Stop'
$app = Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
                         "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -match '${pkg.displayName.replace(/[+]/g, '\\$&')}' } |
        Select-Object -First 1

if (-not $app) {
    Write-Error "${pkg.displayName} not found in registry"
    exit 1
}

$uninstallCmd = $app.UninstallString
$uninstallExe = ($uninstallCmd -split '"')[1]
if (-not $uninstallExe) { $uninstallExe = $uninstallCmd.Split(' ')[0] }
$p = Start-Process -FilePath $uninstallExe -ArgumentList '/VERYSILENT','/NORESTART' -Wait -PassThru -NoNewWindow
if ($p.ExitCode -ne 0) { exit $p.ExitCode }
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── Windows MSI (Node.js) ──
  if (pkg.platform === 'windows' && installerType === 'msi') {
    const installScript = `# Install ${pkg.displayName} ${pkg.version} (MSI silent)
$p = Start-Process -FilePath msiexec -ArgumentList '/i',"$env:PATCHIQ_DOWNLOAD_PATH",'/quiet','/norestart' -Wait -PassThru
exit $p.ExitCode
`;
    const uninstallScript = `# Uninstall ${pkg.displayName} (MSI)
$product = Get-WmiObject Win32_Product | Where-Object { $_.Name -match '${pkg.displayName}' } | Select-Object -First 1
if (-not $product) {
    Write-Error "${pkg.displayName} not found"
    exit 1
}
$product.Uninstall() | Out-Null
exit $LASTEXITCODE
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── Linux tar.xz (Node.js) ──
  if (pkg.platform === 'linux' && installerType === 'tarxz') {
    const dirName = pkg.fileName.replace('.tar.xz', '');
    const installScript = `#!/bin/bash
# Install ${pkg.displayName} ${pkg.version} (tar.xz extraction)
set -euo pipefail

INSTALL_DIR="/usr/local/lib/nodejs"
ARCHIVE="$PATCHIQ_DOWNLOAD_PATH"

mkdir -p "$INSTALL_DIR"
tar -xJf "$ARCHIVE" -C "$INSTALL_DIR"

# Create symlinks
ln -sf "$INSTALL_DIR/${dirName}/bin/node" /usr/local/bin/node
ln -sf "$INSTALL_DIR/${dirName}/bin/npm"  /usr/local/bin/npm
ln -sf "$INSTALL_DIR/${dirName}/bin/npx"  /usr/local/bin/npx

echo "${pkg.displayName} ${pkg.version} installed successfully"
`;
    const uninstallScript = `#!/bin/bash
# Uninstall ${pkg.displayName} ${pkg.version}
set -euo pipefail

INSTALL_DIR="/usr/local/lib/nodejs/${dirName}"

rm -f /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx
rm -rf "$INSTALL_DIR"

echo "${pkg.displayName} ${pkg.version} uninstalled successfully"
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── macOS DMG (VLC, Firefox, GIMP, etc.) ──
  if (pkg.platform === 'macos' && installerType === 'dmg') {
    const installScript = `#!/bin/bash
# Install ${pkg.displayName} ${pkg.version} (DMG)
set -euo pipefail

DMG_PATH="$PATCHIQ_DOWNLOAD_PATH"
MOUNT_POINT=$(mktemp -d)

hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_POINT" -nobrowse -quiet

# Find and copy .app bundle to /Applications
APP=$(find "$MOUNT_POINT" -name "*.app" -maxdepth 1 | head -1)
if [ -z "$APP" ]; then
  echo "No .app found in DMG"
  hdiutil detach "$MOUNT_POINT" -quiet
  exit 1
fi

APP_NAME=$(basename "$APP")
rm -rf "/Applications/$APP_NAME" 2>/dev/null || true
cp -R "$APP" /Applications/
hdiutil detach "$MOUNT_POINT" -quiet

echo "${pkg.displayName} ${pkg.version} installed to /Applications/$APP_NAME"
`;
    // Determine the .app name from the package name
    const appNameMap: Record<string, string> = {
      vlc: 'VLC.app', firefox: 'Firefox.app', gimp: 'GIMP-2.10.app',
    };
    const appName = appNameMap[pkg.name] || `${pkg.displayName}.app`;

    const uninstallScript = `#!/bin/bash
# Uninstall ${pkg.displayName}
set -euo pipefail

rm -rf "/Applications/${appName}"

echo "${pkg.displayName} uninstalled successfully"
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── Linux/macOS ZIP (Terraform, Vault — single binary) ──
  if ((pkg.platform === 'linux' || pkg.platform === 'macos') && installerType === 'zip') {
    const binName = pkg.name; // terraform, vault, etc.
    const installScript = `#!/bin/bash
# Install ${pkg.displayName} ${pkg.version} (zip binary)
set -euo pipefail

ARCHIVE="$PATCHIQ_DOWNLOAD_PATH"
TMPDIR=$(mktemp -d)

unzip -o "$ARCHIVE" -d "$TMPDIR"
install -m 0755 "$TMPDIR/${binName}" /usr/local/bin/${binName}
rm -rf "$TMPDIR"

echo "${pkg.displayName} ${pkg.version} installed to /usr/local/bin/${binName}"
`;
    const uninstallScript = `#!/bin/bash
# Uninstall ${pkg.displayName}
set -euo pipefail

rm -f /usr/local/bin/${binName}

echo "${pkg.displayName} uninstalled successfully"
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── macOS PKG (Node.js) ──
  if (pkg.platform === 'macos' && installerType === 'pkg') {
    const installScript = `#!/bin/bash
# Install ${pkg.displayName} ${pkg.version} (PKG)
set -euo pipefail

installer -pkg "$PATCHIQ_DOWNLOAD_PATH" -target /

echo "${pkg.displayName} ${pkg.version} installed successfully"
`;
    const uninstallScript = `#!/bin/bash
# Uninstall ${pkg.displayName} ${pkg.version}
set -euo pipefail

rm -f /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx
rm -rf /usr/local/lib/node_modules

echo "${pkg.displayName} uninstalled successfully"
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── Windows Python exe — exe with /quiet InstallAllUsers=1 PrependPath=1 ──
  if (pkg.platform === 'windows' && installerType === 'python') {
    const installScript = `# Install ${pkg.displayName} ${pkg.version} (Python silent)
$p = Start-Process -FilePath "$env:PATCHIQ_DOWNLOAD_PATH" -ArgumentList '/quiet','InstallAllUsers=1','PrependPath=1' -Wait -PassThru
exit $p.ExitCode
`;
    const uninstallScript = `# Uninstall ${pkg.displayName} (Python)
$p = Start-Process -FilePath "$env:PATCHIQ_DOWNLOAD_PATH" -ArgumentList '/uninstall','/quiet' -Wait -PassThru
exit $p.ExitCode
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── Linux .deb ──
  if (pkg.platform === 'linux' && installerType === 'deb') {
    const pkgName = pkg.name;
    const installScript = `#!/bin/bash
# Install ${pkg.displayName} ${pkg.version} (deb)
set -euo pipefail

dpkg -i "$PATCHIQ_DOWNLOAD_PATH"

echo "${pkg.displayName} ${pkg.version} installed successfully"
`;
    const uninstallScript = `#!/bin/bash
# Uninstall ${pkg.displayName} (deb)
set -euo pipefail

dpkg -r ${pkgName}

echo "${pkg.displayName} uninstalled successfully"
`;
    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // ── Linux tar.gz ──
  if (pkg.platform === 'linux' && installerType === 'targz') {
    const dirName = pkg.fileName.replace('.tar.gz', '');
    const isGo = pkg.name.toLowerCase() === 'go' || pkg.name.toLowerCase() === 'golang';
    const installDir = isGo ? '/usr/local' : `/opt/${pkg.name}`;

    const installScript = isGo
      ? `#!/bin/bash
# Install ${pkg.displayName} ${pkg.version} (tar.gz)
set -euo pipefail

rm -rf /usr/local/go
tar -xzf "$PATCHIQ_DOWNLOAD_PATH" -C /usr/local

ln -sf /usr/local/go/bin/go /usr/local/bin/go
ln -sf /usr/local/go/bin/gofmt /usr/local/bin/gofmt

echo "${pkg.displayName} ${pkg.version} installed successfully"
`
      : `#!/bin/bash
# Install ${pkg.displayName} ${pkg.version} (tar.gz)
set -euo pipefail

mkdir -p "${installDir}"
tar -xzf "$PATCHIQ_DOWNLOAD_PATH" -C "${installDir}"

echo "${pkg.displayName} ${pkg.version} installed successfully"
`;

    const uninstallScript = isGo
      ? `#!/bin/bash
# Uninstall ${pkg.displayName} ${pkg.version}
set -euo pipefail

rm -f /usr/local/bin/go /usr/local/bin/gofmt
rm -rf /usr/local/go

echo "${pkg.displayName} uninstalled successfully"
`
      : `#!/bin/bash
# Uninstall ${pkg.displayName} ${pkg.version}
set -euo pipefail

rm -rf "${installDir}"

echo "${pkg.displayName} uninstalled successfully"
`;

    return {
      install: { name: `install${ext}`, content: installScript },
      update: { name: `update${ext}`, content: installScript },
      uninstall: { name: `uninstall${ext}`, content: uninstallScript },
    };
  }

  // Fallback — should not happen with current seed data
  throw new Error(`No script template for ${pkg.platform}/${installerType} (${pkg.displayName} - ${pkg.fileName})`);
}

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
          fileName: pkg.fileName,
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

        const objectKey = `packages/${pkg.platform}/${sanitize(pkg.vendor)}/${sanitize(pkg.name)}/${sanitize(pkg.version)}/bundle.tar.gz`;

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
