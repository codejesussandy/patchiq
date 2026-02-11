/**
 * Catalog Sync Service
 * Downloads software from vendor CDNs and adds them to the Hub as packages
 */

import { prisma } from '@/db/client';
import { SOFTWARE_CATALOG, type SoftwareTemplate } from './catalog';
import { fetchLatestVersion, type VendorFetchResult } from './vendor-fetchers';
import { hubService } from '@modules/hub/hub.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as tar from 'tar';

export interface SyncResult {
  templateId: string;
  name: string;
  version: string;
  os: string;
  status: 'created' | 'exists' | 'failed' | 'skipped';
  packageId?: string;
  error?: string;
  downloadSize?: number;
}

export interface SyncOptions {
  templateIds?: string[];
  os?: string;
  arch?: string;
  force?: boolean; // re-download even if version exists
}

function generateInstallScript(
  tmpl: SoftwareTemplate,
  result: VendorFetchResult,
  targetOs: string
): string {
  const fileName = result.fileName || 'installer';
  const ext = path.extname(fileName).toLowerCase();
  const lowerOs = targetOs.toLowerCase();

  if (lowerOs === 'windows') {
    // Common preamble: resolve installer from env var or fallback to files/ directory
    const winPreamble = [
      '#!/usr/bin/env powershell',
      `# Auto-generated install script for ${tmpl.name} ${result.latestVersion}`,
      '$ErrorActionPreference = "Stop"',
      '$Installer = $env:PATCHIQ_DOWNLOAD_PATH',
      '# Fallback: find installer in sibling files/ directory if env var is empty',
      'if (-not $Installer -or -not (Test-Path $Installer)) {',
      '    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition',
      '    $FilesDir = Join-Path (Split-Path -Parent $ScriptDir) "files"',
      '    if (Test-Path $FilesDir) {',
      '        $Installer = (Get-ChildItem $FilesDir -File | Select-Object -First 1).FullName',
      '    }',
      '}',
      'if (-not $Installer -or -not (Test-Path $Installer)) { Write-Error "Installer not found"; exit 1 }',
      'Write-Host "Installer: $Installer"',
    ];

    if (ext === '.msi') {
      return [
        ...winPreamble,
        '',
        'Write-Host "Installing ' + tmpl.name + ' ' + result.latestVersion + '..."',
        'Start-Process msiexec -ArgumentList "/i", "`"$Installer`"", "/quiet", "/norestart" -Wait -NoNewWindow',
        'if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {',
        '    Write-Error "Installation failed with exit code $LASTEXITCODE"',
        '    exit 1',
        '}',
        'if ($LASTEXITCODE -eq 3010) { Write-Host "Reboot required" }',
        `Write-Host "${tmpl.name} ${result.latestVersion} installed successfully"`,
      ].join('\n');
    }
    // .exe installer
    return [
      ...winPreamble,
      '',
      'Write-Host "Installing ' + tmpl.name + ' ' + result.latestVersion + '..."',
      'Start-Process -FilePath $Installer -ArgumentList "/S", "/silent", "/quiet", "/VERYSILENT", "/NORESTART" -Wait -NoNewWindow',
      'if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {',
      '    Write-Error "Installation failed with exit code $LASTEXITCODE"',
      '    exit 1',
      '}',
      `Write-Host "${tmpl.name} ${result.latestVersion} installed successfully"`,
    ].join('\n');
  }

  if (lowerOs === 'macos') {
    // Common bash preamble: resolve installer from env var or fallback to files/ directory
    const bashFallback = 'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"\nFILES_DIR="$(dirname "$SCRIPT_DIR")/files"\nif [ -z "$PATCHIQ_DOWNLOAD_PATH" ] || [ ! -f "$PATCHIQ_DOWNLOAD_PATH" ]; then\n  if [ -d "$FILES_DIR" ]; then\n    PATCHIQ_DOWNLOAD_PATH="$(ls "$FILES_DIR"/* 2>/dev/null | head -1)"\n  fi\nfi';

    if (ext === '.dmg') {
      return [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated install script for ${tmpl.name} ${result.latestVersion}`,
        bashFallback,
        'DMG="$PATCHIQ_DOWNLOAD_PATH"',
        '[ ! -f "$DMG" ] && echo "Installer not found: $DMG" && exit 1',
        '',
        `echo "Installing ${tmpl.name} ${result.latestVersion}..."`,
        'MOUNT_DIR=$(hdiutil attach "$DMG" -nobrowse 2>/dev/null | tail -1 | awk \'{print $3}\')',
        'APP=$(find "$MOUNT_DIR" -maxdepth 1 -name "*.app" | head -1)',
        '[ -z "$APP" ] && echo "No .app found in DMG" && hdiutil detach "$MOUNT_DIR" && exit 1',
        'cp -R "$APP" /Applications/',
        'hdiutil detach "$MOUNT_DIR"',
        `echo "${tmpl.name} ${result.latestVersion} installed successfully"`,
      ].join('\n');
    }
    if (ext === '.pkg') {
      return [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated install script for ${tmpl.name} ${result.latestVersion}`,
        bashFallback,
        'PKG="$PATCHIQ_DOWNLOAD_PATH"',
        '[ ! -f "$PKG" ] && echo "Installer not found: $PKG" && exit 1',
        `echo "Installing ${tmpl.name} ${result.latestVersion}..."`,
        'sudo installer -pkg "$PKG" -target /',
        `echo "${tmpl.name} ${result.latestVersion} installed successfully"`,
      ].join('\n');
    }
  }

  // Linux (.deb, .rpm, .tar.gz, etc.)
  const bashFallbackLinux = 'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"\nFILES_DIR="$(dirname "$SCRIPT_DIR")/files"\nif [ -z "$PATCHIQ_DOWNLOAD_PATH" ] || [ ! -f "$PATCHIQ_DOWNLOAD_PATH" ]; then\n  if [ -d "$FILES_DIR" ]; then\n    PATCHIQ_DOWNLOAD_PATH="$(ls "$FILES_DIR"/* 2>/dev/null | head -1)"\n  fi\nfi';

  if (ext === '.deb') {
    return [
      '#!/bin/bash',
      'set -e',
      `# Auto-generated install script for ${tmpl.name} ${result.latestVersion}`,
      bashFallbackLinux,
      'DEB="$PATCHIQ_DOWNLOAD_PATH"',
      '[ ! -f "$DEB" ] && echo "Installer not found: $DEB" && exit 1',
      `echo "Installing ${tmpl.name} ${result.latestVersion}..."`,
      'sudo dpkg -i "$DEB" || sudo apt-get install -f -y',
      `echo "${tmpl.name} ${result.latestVersion} installed successfully"`,
    ].join('\n');
  }

  if (ext === '.rpm') {
    return [
      '#!/bin/bash',
      'set -e',
      `# Auto-generated install script for ${tmpl.name} ${result.latestVersion}`,
      bashFallbackLinux,
      'RPM="$PATCHIQ_DOWNLOAD_PATH"',
      '[ ! -f "$RPM" ] && echo "Installer not found: $RPM" && exit 1',
      `echo "Installing ${tmpl.name} ${result.latestVersion}..."`,
      'sudo rpm -Uvh "$RPM"',
      `echo "${tmpl.name} ${result.latestVersion} installed successfully"`,
    ].join('\n');
  }

  // Generic tarball / binary
  return [
    lowerOs === 'windows' ? '#!/usr/bin/env powershell' : '#!/bin/bash',
    lowerOs === 'windows' ? '$ErrorActionPreference = "Stop"' : 'set -e',
    `# Auto-generated install script for ${tmpl.name} ${result.latestVersion}`,
    lowerOs === 'windows'
      ? `Write-Host "Installing ${tmpl.name} ${result.latestVersion}..."`
      : `echo "Installing ${tmpl.name} ${result.latestVersion}..."`,
    lowerOs === 'windows'
      ? `Write-Host "Manual installation may be required for ${fileName}"`
      : `echo "Manual installation may be required for ${fileName}"`,
  ].join('\n');
}

function generateUninstallScript(
  tmpl: SoftwareTemplate,
  targetOs: string
): string {
  const lowerOs = targetOs.toLowerCase();
  const name = tmpl.name;

  if (lowerOs === 'windows') {
    return [
      '#!/usr/bin/env powershell',
      '$ErrorActionPreference = "Stop"',
      `Write-Host "Uninstalling ${name}..."`,
      `$result = winget uninstall --name "${name}" --silent 2>&1 | Out-String`,
      'if ($LASTEXITCODE -eq 0) {',
      `    Write-Host "${name} uninstalled successfully"`,
      '    exit 0',
      '}',
      `Write-Error "Failed to uninstall ${name}"`,
      'exit 1',
    ].join('\n');
  }

  if (lowerOs === 'macos') {
    return [
      '#!/bin/bash',
      'set -e',
      `echo "Uninstalling ${name}..."`,
      `APP="/Applications/${name}.app"`,
      '[ -d "$APP" ] && rm -rf "$APP" && echo "Removed $APP"',
      `echo "${name} uninstalled"`,
    ].join('\n');
  }

  // Linux
  return [
    '#!/bin/bash',
    'set -e',
    `echo "Uninstalling ${name}..."`,
    `sudo apt-get remove -y "${tmpl.product.toLowerCase()}" 2>/dev/null || sudo rpm -e "${tmpl.product.toLowerCase()}" 2>/dev/null || true`,
    `echo "${name} uninstalled"`,
  ].join('\n');
}

async function downloadFile(url: string): Promise<{ buffer: Buffer; contentLength: number }> {
  console.log(`[CatalogSync] Downloading: ${url}`);
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'PatchIQ/1.0' },
    signal: AbortSignal.timeout(300000), // 5 min timeout for large files
    redirect: 'follow',
  });

  if (!resp.ok) {
    throw new Error(`Download failed: HTTP ${resp.status} from ${url}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`[CatalogSync] Downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
  return { buffer, contentLength: buffer.length };
}

function createBundle(
  tmpl: SoftwareTemplate,
  result: VendorFetchResult,
  targetOs: string,
  installerBuffer: Buffer,
  installerFileName: string
): Buffer {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchiq-sync-'));
  const bundleDir = path.join(tempDir, 'bundle');

  try {
    // Create directory structure
    fs.mkdirSync(path.join(bundleDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(bundleDir, 'files'), { recursive: true });

    // Write installer binary
    fs.writeFileSync(path.join(bundleDir, 'files', installerFileName), installerBuffer);

    // Write install script
    const installScript = generateInstallScript(tmpl, result, targetOs);
    const scriptExt = targetOs.toLowerCase() === 'windows' ? 'ps1' : 'sh';
    fs.writeFileSync(path.join(bundleDir, 'scripts', `install.${scriptExt}`), installScript);

    // Write uninstall script
    const uninstallScript = generateUninstallScript(tmpl, targetOs);
    fs.writeFileSync(path.join(bundleDir, 'scripts', `uninstall.${scriptExt}`), uninstallScript);

    // Write manifest.json
    const manifest = {
      name: tmpl.product.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      displayName: tmpl.name,
      version: result.latestVersion,
      vendor: tmpl.vendor,
      category: tmpl.hubCategory || 'utility',
      platform: targetOs.toLowerCase() === 'macos' ? 'macos' : targetOs.toLowerCase(),
      architecture: result.architecture || 'x64',
      description: `${tmpl.name} ${result.latestVersion} for ${targetOs}`,
      requiresRoot: targetOs.toLowerCase() !== 'windows',
      requiresReboot: false,
      files: [
        {
          name: installerFileName,
          size: installerBuffer.length,
        },
      ],
      scripts: {
        install: `scripts/install.${scriptExt}`,
        uninstall: `scripts/uninstall.${scriptExt}`,
      },
    };
    fs.writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // Create tar.gz
    const tarFile = path.join(tempDir, 'bundle.tar.gz');
    // Use sync tar creation
    tar.create(
      {
        gzip: true,
        file: tarFile,
        cwd: bundleDir,
        sync: true,
      },
      fs.readdirSync(bundleDir)
    );

    return fs.readFileSync(tarFile);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function syncSingleTemplate(
  tmpl: SoftwareTemplate,
  targetOs: string,
  arch: string = 'x64',
  force: boolean = false,
  createdBy?: string
): Promise<SyncResult> {
  const baseResult: SyncResult = {
    templateId: tmpl.id,
    name: tmpl.name,
    version: '',
    os: targetOs,
    status: 'failed',
  };

  try {
    // 1. Fetch latest version info from vendor API
    console.log(`[CatalogSync] Fetching latest version for ${tmpl.name} (${targetOs})...`);
    const vendorResult = await fetchLatestVersion(tmpl, targetOs, arch);
    baseResult.version = vendorResult.latestVersion;

    // If version is "latest", use a date-based version so we can still download
    if (vendorResult.latestVersion === 'latest') {
      vendorResult.latestVersion = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      baseResult.version = vendorResult.latestVersion;
    }

    // 2. Check if this version already exists in Hub
    if (!force) {
      const existing = await prisma.softwarePackage.findFirst({
        where: {
          name: { contains: tmpl.product.toLowerCase().replace(/[^a-z0-9]/g, '-'), mode: 'insensitive' },
          version: vendorResult.latestVersion,
          platform: targetOs.toLowerCase() === 'macos' ? 'macos' : targetOs.toLowerCase(),
        },
      });
      if (existing) {
        baseResult.status = 'exists';
        baseResult.packageId = existing.packageId;
        return baseResult;
      }
    }

    // 3. Download the binary from vendor CDN
    if (!vendorResult.downloadUrl) {
      baseResult.status = 'failed';
      baseResult.error = 'No download URL available';
      return baseResult;
    }

    const { buffer: installerBuffer, contentLength } = await downloadFile(vendorResult.downloadUrl);
    baseResult.downloadSize = contentLength;

    const fileName = vendorResult.fileName || `installer${path.extname(vendorResult.downloadUrl) || '.exe'}`;

    // 4. Create tar.gz bundle with manifest + scripts + binary
    console.log(`[CatalogSync] Creating bundle for ${tmpl.name} ${vendorResult.latestVersion}...`);
    const bundleBuffer = createBundle(tmpl, vendorResult, targetOs, installerBuffer, fileName);

    // 5. Upload via Hub's existing uploadPackageBundle
    console.log(`[CatalogSync] Uploading bundle (${(bundleBuffer.length / 1024 / 1024).toFixed(1)} MB) to Hub...`);
    const uploadResult = await hubService.uploadPackageBundle(bundleBuffer, 'bundle.tar.gz', createdBy);

    baseResult.status = 'created';
    baseResult.packageId = uploadResult.packageId;
    console.log(`[CatalogSync] Created Hub package ${uploadResult.packageId} for ${tmpl.name} ${vendorResult.latestVersion}`);

    return baseResult;
  } catch (error: any) {
    baseResult.status = 'failed';
    baseResult.error = error.message;
    console.error(`[CatalogSync] Failed for ${tmpl.name}: ${error.message}`);
    return baseResult;
  }
}

export async function syncFromCatalog(options: SyncOptions = {}): Promise<SyncResult[]> {
  const {
    templateIds,
    os: targetOs = 'Windows',
    arch = 'x64',
    force = false,
  } = options;

  const templatesToSync = templateIds
    ? SOFTWARE_CATALOG.filter((t) => templateIds.includes(t.id))
    : SOFTWARE_CATALOG;

  // Filter to templates that support the target OS
  const compatible = templatesToSync.filter((t) =>
    t.supportedOs.some((o) => o.toLowerCase() === targetOs.toLowerCase())
  );

  console.log(`[CatalogSync] Syncing ${compatible.length} templates for ${targetOs} ${arch}...`);

  const results: SyncResult[] = [];

  // Process sequentially to avoid overwhelming vendor CDNs
  for (const tmpl of compatible) {
    const result = await syncSingleTemplate(tmpl, targetOs, arch, force);
    results.push(result);
  }

  const created = results.filter((r) => r.status === 'created').length;
  const exists = results.filter((r) => r.status === 'exists').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  console.log(`[CatalogSync] Done: ${created} created, ${exists} already exist, ${skipped} skipped, ${failed} failed`);

  return results;
}
