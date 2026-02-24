/**
 * generate-package-scripts.ts — Shared script generation for Hub software packages
 *
 * Generates platform-appropriate install/update/uninstall scripts based on
 * installer type (nsis, inno, msi, dmg, pkg, deb, tarxz, targz, zip, python).
 *
 * Used by:
 *   - seed-hub-packages.ts (inline scripts in DB at seed time)
 *   - add-missing-packages.ts (inline scripts for additional packages)
 *   - build-hub-bundles.ts (scripts inside bundle.tar.gz)
 */

export interface ScriptSet {
  install: { name: string; content: string };
  update: { name: string; content: string };
  uninstall: { name: string; content: string };
}

export interface PackageScriptInput {
  name: string;
  displayName: string;
  version: string;
  platform: string;
  installSource?: string;
  installArgs: string | null;
  fileName: string;
}

function getScriptExtension(platform: string): string {
  return platform === 'windows' ? '.ps1' : '.sh';
}

/**
 * Determine the original installer type from fileName and installArgs,
 * since installSource is now 'bundle' for all packages.
 */
export function detectInstallerType(pkg: { platform: string; fileName: string; installArgs: string | null }): string {
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

export function generateScripts(pkg: PackageScriptInput): ScriptSet {
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

  // ── Windows MSI (Node.js, Chrome, PuTTY, KeePass) ──
  if (pkg.platform === 'windows' && installerType === 'msi') {
    const installScript = `# Install ${pkg.displayName} ${pkg.version} (MSI silent)
$p = Start-Process -FilePath msiexec -ArgumentList '/i',"$env:PATCHIQ_DOWNLOAD_PATH",'/quiet','/norestart' -Wait -PassThru -NoNewWindow
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

  // ── Windows Python exe — exe with /quiet InstallAllUsers=1 PrependPath=1 ──
  if (pkg.platform === 'windows' && installerType === 'python') {
    const installScript = `# Install ${pkg.displayName} ${pkg.version} (Python silent)
$p = Start-Process -FilePath "$env:PATCHIQ_DOWNLOAD_PATH" -ArgumentList '/quiet','InstallAllUsers=1','PrependPath=1' -Wait -PassThru -NoNewWindow
exit $p.ExitCode
`;
    const uninstallScript = `# Uninstall ${pkg.displayName} (Python)
$p = Start-Process -FilePath "$env:PATCHIQ_DOWNLOAD_PATH" -ArgumentList '/uninstall','/quiet' -Wait -PassThru -NoNewWindow
exit $p.ExitCode
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

  // ── Linux .deb (VS Code) ──
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

  // ── Linux tar.gz (Go) ──
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

  // ── macOS DMG (VLC, Firefox, GIMP) ──
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

  // ── Linux/macOS ZIP (Terraform, Vault — single binary) ──
  if ((pkg.platform === 'linux' || pkg.platform === 'macos') && installerType === 'zip') {
    const binName = pkg.name;
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

  // Fallback — should not happen with current seed data
  throw new Error(`No script template for ${pkg.platform}/${installerType} (${pkg.displayName} - ${pkg.fileName})`);
}
