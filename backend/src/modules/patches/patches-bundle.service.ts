import { v4 as uuidv4 } from 'uuid';
import { queueDownloadJob } from '@modules/patch-repository';
import { createLogger } from '@shared/services/logger';
import { prisma } from '@/db/client';

const logger = createLogger('patches');

// ============================================
// Auto-Download Helper
// ============================================

/**
 * Automatically queue a download job when a patch has a downloadUrl.
 * Creates a PatchDownloadJob record and queues it via BullMQ.
 */
export async function autoQueueDownload(patchId: string, downloadUrl: string, fileName: string) {
  const jobId = uuidv4();
  const targetPath = `patches/${patchId}/${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  // Create the PatchDownloadJob record
  await prisma.patchDownloadJob.create({
    data: {
      jobId,
      patchId,
      sourceUrl: downloadUrl,
      targetPath,
      fileName: fileName || 'patch-file',
      status: 'PENDING',
      priority: 50,
      maxRetries: 3,
    },
  });

  // Queue via BullMQ
  await queueDownloadJob({
    jobId,
    sourceUrl: downloadUrl,
    targetPath,
    fileName: fileName || 'patch-file',
    patchId,
    priority: 50,
  });

  // Update patch downloadStatus
  await prisma.patch.update({
    where: { id: patchId },
    data: { downloadStatus: 'PENDING' },
  });

  logger.info({ patchId, downloadUrl }, 'Queued download for patch');
}

// ============================================
// PatchBundle Auto-Generation
// ============================================

/**
 * Auto-generate a PatchBundle with inline install/rollback/verify scripts
 * when a patch has enough metadata (vendor, software, OS).
 * Does NOT upload anything to MinIO — just creates inline scripts for
 * the agent to execute via the hub_patch_install command type.
 */
export async function autoGeneratePatchBundle(patchId: string, minioObjectKey?: string | null): Promise<void> {
  const patch = await prisma.patch.findUnique({
    where: { id: patchId },
    include: { bundle: true },
  });

  if (!patch) return;

  // Skip if bundle already has a tar.gz upload (manually uploaded) — unless we're updating with a Hub MinIO key
  if (patch.bundle?.bundleObjectKey && !minioObjectKey) return;

  // Need at least OS + (kbNumber or software) to generate scripts
  const os = (patch.os || '').toLowerCase();
  const kbNumber = patch.kbNumber;
  const packageName = patch.software;
  const downloadUrl = patch.downloadUrl;

  if (!os || (!kbNumber && !packageName)) return;

  let scriptInstall: string | null = null;
  let scriptRollback: string | null = null;
  let scriptVerify: string | null = null;

  // ── Installer-aware scripts when we have a Hub MinIO file ──
  if (minioObjectKey) {
    const filename = minioObjectKey.split('/').pop() || minioObjectKey;
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (os.includes('windows') || os === 'w') {
      if (ext === 'msi') {
        scriptInstall = [
          '#!/usr/bin/env powershell',
          `# Installer-aware script for ${filename}`,
          `$Installer = "$env:PATCHIQ_DOWNLOAD_PATH"`,
          'if (-not (Test-Path $Installer)) { Write-Error "Installer not found at $Installer"; exit 1 }',
          'Write-Host "Running MSI installer: $Installer"',
          '& msiexec /i "$Installer" /quiet /norestart',
          '$exitCode = $LASTEXITCODE',
          'Write-Host "MSI exit code: $exitCode"',
          'if ($exitCode -eq 3010) { Write-Host "Reboot required"; exit 0 }',
          'if ($exitCode -ne 0) { Write-Error "Install failed (exit code $exitCode)"; exit 1 }',
          `Write-Host "${filename} installed successfully"`,
        ].join('\n');
      } else {
        scriptInstall = [
          '#!/usr/bin/env powershell',
          `# Installer-aware script for ${filename}`,
          `$Installer = "$env:PATCHIQ_DOWNLOAD_PATH"`,
          'if (-not (Test-Path $Installer)) { Write-Error "Installer not found at $Installer"; exit 1 }',
          'Write-Host "Running installer: $Installer"',
          '& $Installer /S',
          '$exitCode = $LASTEXITCODE',
          'Write-Host "Installer exit code: $exitCode"',
          'if ($exitCode -ne 0 -and $exitCode -ne $null) { Write-Error "Install failed (exit code $exitCode)"; exit 1 }',
          `Write-Host "${filename} installed successfully"`,
        ].join('\n');
      }

      scriptRollback = [
        '#!/usr/bin/env powershell',
        `# Rollback requires uninstalling ${packageName || filename}`,
        'Write-Host "Use Add/Remove Programs or the vendor uninstaller to rollback"',
        'exit 1',
      ].join('\n');

      scriptVerify = [
        '#!/usr/bin/env powershell',
        `# Verify ${packageName || filename} is installed`,
        `$Name = "${packageName || filename}"`,
        '$found = Get-WmiObject Win32_Product | Where-Object { $_.Name -like "*$Name*" }',
        'if ($found) { Write-Host "VERIFIED: $($found.Name) $($found.Version)"; exit 0 }',
        'Write-Error "NOT FOUND: $Name"; exit 1',
      ].join('\n');

    } else if (os.includes('linux') || os === 'l') {
      if (ext === 'deb') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          'export DEBIAN_FRONTEND=noninteractive',
          `INSTALLER="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$INSTALLER" ] || { echo "Installer not found at $INSTALLER"; exit 1; }',
          'dpkg -i "$INSTALLER" || apt-get install -f -y',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      } else if (ext === 'rpm') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `INSTALLER="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$INSTALLER" ] || { echo "Installer not found at $INSTALLER"; exit 1; }',
          'rpm -Uvh "$INSTALLER"',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      } else {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `INSTALLER="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$INSTALLER" ] || { echo "Installer not found at $INSTALLER"; exit 1; }',
          'chmod +x "$INSTALLER" && "$INSTALLER"',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      }

      scriptRollback = [
        '#!/bin/bash',
        `# Rollback for ${packageName || filename}`,
        ext === 'deb'
          ? `dpkg -r "${packageName || filename.replace(`.${ext}`, '')}"`
          : `rpm -e "${packageName || filename.replace(`.${ext}`, '')}"`,
        'echo "Rollback completed"',
      ].join('\n');

      scriptVerify = [
        '#!/bin/bash',
        `# Verify ${packageName || filename} is installed`,
        ext === 'deb'
          ? `dpkg -s "${packageName || filename.replace(`.${ext}`, '')}" 2>/dev/null | grep -q "Status: install ok installed"`
          : `rpm -q "${packageName || filename.replace(`.${ext}`, '')}" >/dev/null 2>&1`,
        'if [ $? -eq 0 ]; then echo "VERIFIED"; exit 0; fi',
        'echo "NOT FOUND"; exit 1',
      ].join('\n');

    } else if (os.includes('mac') || os.includes('darwin') || os === 'm') {
      if (ext === 'dmg') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `DMG="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$DMG" ] || { echo "DMG not found at $DMG"; exit 1; }',
          'MOUNT_DIR=$(hdiutil attach "$DMG" -nobrowse | tail -1 | awk \'{print $3}\')',
          'APP=$(find "$MOUNT_DIR" -name "*.app" -maxdepth 1 | head -1)',
          '[ -n "$APP" ] || { hdiutil detach "$MOUNT_DIR"; echo "No .app found in DMG"; exit 1; }',
          'cp -R "$APP" /Applications/',
          'hdiutil detach "$MOUNT_DIR"',
          `echo "${filename} installed to /Applications"`,
        ].join('\n');
      } else if (ext === 'zip') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `ZIP="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$ZIP" ] || { echo "ZIP not found at $ZIP"; exit 1; }',
          'unzip -o "$ZIP" -d /Applications/',
          `echo "${filename} installed to /Applications"`,
        ].join('\n');
      } else if (ext === 'pkg') {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `PKG="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$PKG" ] || { echo "PKG not found at $PKG"; exit 1; }',
          'sudo installer -pkg "$PKG" -target /',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      } else {
        scriptInstall = [
          '#!/bin/bash',
          'set -e',
          `# Installer-aware script for ${filename}`,
          `INSTALLER="$PATCHIQ_DOWNLOAD_PATH"`,
          '[ -f "$INSTALLER" ] || { echo "Installer not found at $INSTALLER"; exit 1; }',
          'chmod +x "$INSTALLER" && "$INSTALLER"',
          `echo "${filename} installed successfully"`,
        ].join('\n');
      }

      scriptRollback = [
        '#!/bin/bash',
        `# Rollback for ${packageName || filename}`,
        `APP_NAME="${packageName || filename.replace(`.${ext}`, '')}"`,
        'rm -rf "/Applications/${APP_NAME}.app" 2>/dev/null',
        'echo "Removed $APP_NAME from /Applications"',
      ].join('\n');

      scriptVerify = [
        '#!/bin/bash',
        `# Verify ${packageName || filename} is installed`,
        `APP_NAME="${packageName || filename.replace(`.${ext}`, '')}"`,
        'if [ -d "/Applications/${APP_NAME}.app" ]; then echo "VERIFIED"; exit 0; fi',
        'echo "NOT FOUND"; exit 1',
      ].join('\n');
    }
  }

  // ── Fallback: package-manager scripts when no MinIO file ──
  if (!scriptInstall && (os.includes('windows') || os === 'w')) {
    const isRealKB = kbNumber && /^KB\d+$/i.test(kbNumber.trim());
    if (isRealKB) {
      const msuUrl = downloadUrl || '';
      scriptInstall = [
        '#!/usr/bin/env powershell',
        `# Auto-generated install script for ${kbNumber}`,
        `$KB = "${kbNumber}"`,
        '',
        '# Check if already installed',
        '$installed = Get-HotFix -Id $KB -ErrorAction SilentlyContinue',
        'if ($installed) { Write-Host "Patch $KB is already installed"; exit 0 }',
        '',
        msuUrl ? `$msuPath = "$env:TEMP\\$KB.msu"` : '',
        msuUrl ? `Invoke-WebRequest -Uri "${msuUrl}" -OutFile $msuPath -UseBasicParsing` : '',
        msuUrl ? `wusa.exe $msuPath /quiet /norestart` : `dism.exe /Online /Add-Package /PackageName:$KB /Quiet /NoRestart`,
        'if ($LASTEXITCODE -eq 3010) { Write-Host "Reboot required"; exit 0 }',
        'if ($LASTEXITCODE -ne 0) { Write-Error "Install failed with exit code $LASTEXITCODE"; exit 1 }',
        'Write-Host "Patch $KB installed successfully"',
      ].filter(Boolean).join('\n');

      scriptRollback = [
        '#!/usr/bin/env powershell',
        `# Auto-generated rollback script for ${kbNumber}`,
        `$KB = "${kbNumber}"`,
        `wusa.exe /uninstall /kb:$($KB -replace 'KB','') /quiet /norestart`,
        'if ($LASTEXITCODE -ne 0) { Write-Error "Rollback failed"; exit 1 }',
        'Write-Host "Patch $KB rolled back"',
      ].join('\n');

      scriptVerify = [
        '#!/usr/bin/env powershell',
        `# Auto-generated verify script for ${kbNumber}`,
        `$KB = "${kbNumber}"`,
        '$installed = Get-HotFix -Id $KB -ErrorAction SilentlyContinue',
        'if ($installed) { Write-Host "VERIFIED: $KB installed"; exit 0 }',
        'else { Write-Error "NOT FOUND: $KB"; exit 1 }',
      ].join('\n');
    } else if (packageName) {
      const cleanName = packageName.replace(/[^a-zA-Z0-9._+ -]/g, '');

      scriptInstall = [
        '#!/usr/bin/env powershell',
        `# Auto-generated install/upgrade script for ${cleanName}`,
        `$Package = "${cleanName}"`,
        '',
        '# Try winget first',
        'if (Get-Command winget -ErrorAction SilentlyContinue) {',
        '    $output = winget upgrade --name $Package --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-String',
        '    if ($LASTEXITCODE -eq 0) { Write-Host "Upgraded $Package via winget"; exit 0 }',
        '    # "No available upgrade" means already at latest — treat as success',
        '    if ($output -match "No available upgrade|No newer package|already installed") { Write-Host "$Package is already up to date"; exit 0 }',
        '    # Try install if upgrade failed (package not yet installed)',
        '    winget install --name $Package --silent --accept-package-agreements --accept-source-agreements 2>&1 | Out-String',
        '    if ($LASTEXITCODE -eq 0) { Write-Host "Installed $Package via winget"; exit 0 }',
        '}',
        '',
        '# Fallback to chocolatey',
        'if (Get-Command choco -ErrorAction SilentlyContinue) {',
        '    choco upgrade $Package -y --no-progress',
        '    if ($LASTEXITCODE -eq 0) { Write-Host "Upgraded $Package via chocolatey"; exit 0 }',
        '}',
        '',
        'Write-Error "No package manager available to install $Package"',
        'exit 1',
      ].join('\n');

      scriptRollback = [
        '#!/usr/bin/env powershell',
        `# Auto-generated rollback script for ${cleanName}`,
        `$Package = "${cleanName}"`,
        'Write-Host "Rollback for third-party packages requires previous version info"',
        'Write-Host "Use: winget install --name $Package --version <previous> or choco install $Package --version <previous>"',
        'exit 1',
      ].join('\n');

      scriptVerify = [
        '#!/usr/bin/env powershell',
        `# Auto-generated verify script for ${cleanName}`,
        `$Package = "${cleanName}"`,
        'if (Get-Command winget -ErrorAction SilentlyContinue) {',
        '    $list = winget list --name $Package 2>$null',
        '    if ($LASTEXITCODE -eq 0) { Write-Host "VERIFIED: $Package installed"; exit 0 }',
        '}',
        'Write-Error "NOT FOUND: $Package"',
        'exit 1',
      ].join('\n');
    }
  }
  if (!scriptInstall && (os.includes('linux') || os.includes('ubuntu') || os.includes('debian') || os.includes('rhel') || os.includes('centos') || os.includes('fedora') || os === 'l')) {
    if (packageName) {
      const isDebian = os.includes('ubuntu') || os.includes('debian') || os === 'l' || os === 'linux';
      const isRhel = os.includes('rhel') || os.includes('centos') || os.includes('fedora') || os.includes('rocky') || os.includes('alma');
      const pkgManager = isRhel ? 'dnf' : 'apt-get';
      const cleanName = packageName.replace(/[^a-zA-Z0-9._-]/g, '');

      scriptInstall = [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated upgrade script for ${cleanName}`,
        '',
        isDebian ? 'export DEBIAN_FRONTEND=noninteractive' : '',
        isDebian ? `apt-get update -qq` : '',
        isDebian
          ? `apt-get install --only-upgrade -y ${cleanName}`
          : `${pkgManager} upgrade -y ${cleanName}`,
        `echo "Package ${cleanName} upgraded successfully"`,
      ].filter(Boolean).join('\n');

      scriptRollback = [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated rollback script for ${cleanName}`,
        `${pkgManager} remove -y ${cleanName}`,
        `echo "Package ${cleanName} removed"`,
      ].join('\n');

      scriptVerify = [
        '#!/bin/bash',
        `# Auto-generated verify script for ${cleanName}`,
        isDebian
          ? `dpkg -s ${cleanName} 2>/dev/null | grep -q "Status: install ok installed"`
          : `rpm -q ${cleanName} >/dev/null 2>&1`,
        'if [ $? -eq 0 ]; then echo "VERIFIED: ' + cleanName + ' installed"; exit 0; fi',
        'echo "NOT FOUND: ' + cleanName + '"; exit 1',
      ].join('\n');
    }
  }
  if (!scriptInstall && (os.includes('mac') || os.includes('darwin') || os === 'm')) {
    if (packageName) {
      const cleanName = packageName.replace(/[^a-zA-Z0-9._-]/g, '');

      scriptInstall = [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated install script for ${cleanName}`,
        `if command -v brew &>/dev/null; then`,
        `  brew install ${cleanName} || brew upgrade ${cleanName}`,
        `else`,
        `  softwareupdate --install "${cleanName}" --no-scan`,
        `fi`,
        `echo "Package ${cleanName} installed successfully"`,
      ].join('\n');

      scriptRollback = [
        '#!/bin/bash',
        'set -e',
        `# Auto-generated rollback script for ${cleanName}`,
        `if command -v brew &>/dev/null; then`,
        `  brew uninstall ${cleanName}`,
        `fi`,
        `echo "Package ${cleanName} removed"`,
      ].join('\n');

      scriptVerify = [
        '#!/bin/bash',
        `# Auto-generated verify script for ${cleanName}`,
        `if command -v brew &>/dev/null && brew list ${cleanName} &>/dev/null; then`,
        `  echo "VERIFIED: ${cleanName} installed"; exit 0`,
        `fi`,
        `echo "NOT FOUND: ${cleanName}"; exit 1`,
      ].join('\n');
    }
  }

  // If we couldn't generate scripts, skip
  if (!scriptInstall) return;

  // Bundle data shared between create and update
  const bundleData = {
    scriptInstall,
    scriptRollback,
    scriptVerify,
    scriptsIncluded: true,
    bundleObjectKey: undefined as string | undefined,
    sourceUrl: undefined as string | undefined,
    downloadStatus: undefined as string | undefined,
  };

  if (minioObjectKey) {
    bundleData.bundleObjectKey = minioObjectKey;
    bundleData.sourceUrl = minioObjectKey;
    bundleData.downloadStatus = 'COMPLETED';
  }

  if (patch.bundle) {
    await prisma.patchBundle.update({
      where: { id: patch.bundle.id },
      data: {
        scriptInstall: bundleData.scriptInstall,
        scriptRollback: bundleData.scriptRollback,
        scriptVerify: bundleData.scriptVerify,
        scriptsIncluded: bundleData.scriptsIncluded,
        ...(bundleData.bundleObjectKey && { bundleObjectKey: bundleData.bundleObjectKey }),
        ...(bundleData.sourceUrl && { sourceUrl: bundleData.sourceUrl }),
        ...(bundleData.downloadStatus && { downloadStatus: bundleData.downloadStatus }),
      },
    });
  } else {
    await prisma.patchBundle.create({
      data: {
        patchId,
        scriptInstall: bundleData.scriptInstall,
        scriptRollback: bundleData.scriptRollback,
        scriptVerify: bundleData.scriptVerify,
        scriptsIncluded: bundleData.scriptsIncluded,
        sourceUrl: bundleData.sourceUrl || patch.downloadUrl,
        downloadStatus: bundleData.downloadStatus || (patch.downloadUrl ? 'PENDING' : 'COMPLETED'),
        requiresRoot: true,
      },
    });
  }

  logger.info({ patchId: patch.patchId || patch.id, os, type: minioObjectKey ? 'installer-aware' : 'inline' }, 'PatchBundle auto-generated');
}
