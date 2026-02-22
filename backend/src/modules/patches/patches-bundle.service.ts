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

  // No fallback — all patches must have a MinIO bundle or manually uploaded scripts.
  // Package manager scripts (winget, brew, apt, choco, etc.) are intentionally removed.

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
