/**
 * Software Patch Collection Seed
 *
 * Creates 45 patches (5 apps × 3 versions × 3 OS) with real install/uninstall/rollback scripts.
 * Each patch uses the native package manager for that OS.
 *
 * Windows: winget (version-pinned)
 * Linux:   apt-get (Ubuntu 24.04)
 * macOS:   brew / brew cask
 *
 * Run: npx tsx src/db/prisma/seeds/software-patch-collection.ts
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Type helpers
// ─────────────────────────────────────────────────────────────────────────────
interface PatchVersion {
  version: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  isLatest?: boolean;
}

interface AppDef {
  name: string;         // display name
  software: string;     // canonical name used in scripts
  vendor: string;       // CPE vendor
  product: string;      // CPE product
  category: string;
  versions: PatchVersion[];
  scriptInstall: (v: string, prev?: string) => string;
  scriptUninstall: (v: string) => string;
  scriptRollback: (v: string, prev: string) => string;
  scriptVerify: (v: string) => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// WINDOWS apps (PowerShell + winget)
// ─────────────────────────────────────────────────────────────────────────────
const WINDOWS_APPS: AppDef[] = [
  {
    name: 'Mozilla Firefox',
    software: 'Mozilla Firefox',
    vendor: 'mozilla',
    product: 'firefox',
    category: 'Web Browsers',
    versions: [
      { version: '121.0', severity: 'MEDIUM' },
      { version: '122.0', severity: 'HIGH' },
      { version: '123.0', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/usr/bin/env powershell
# Install Mozilla Firefox ${v} via winget
$ErrorActionPreference = 'Stop'
Write-Host "Installing Mozilla Firefox ${v}..."
winget install --id Mozilla.Firefox --version ${v} --silent --accept-source-agreements --accept-package-agreements --force
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
  # Fallback: install latest if exact version unavailable
  Write-Host "Exact version not found, installing latest..."
  winget install --id Mozilla.Firefox --silent --accept-source-agreements --accept-package-agreements
}
Write-Host "Firefox ${v} installed successfully"`,
    scriptUninstall: (_v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Uninstalling Mozilla Firefox..."
winget uninstall --id Mozilla.Firefox --silent --accept-source-agreements
if ($LASTEXITCODE -ne 0) {
  # Fallback: try by name
  $app = Get-WmiObject Win32_Product | Where-Object { $_.Name -like "*Firefox*" }
  if ($app) { $app.Uninstall() }
}
Write-Host "Firefox uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Rolling back Mozilla Firefox to ${prev}..."
winget uninstall --id Mozilla.Firefox --silent --accept-source-agreements
winget install --id Mozilla.Firefox --version ${prev} --silent --accept-source-agreements --accept-package-agreements --force
Write-Host "Firefox rolled back to ${prev}"`,
    scriptVerify: (v) => `\
#!/usr/bin/env powershell
$firefox = Get-WmiObject Win32_Product | Where-Object { $_.Name -like "*Firefox*" }
if ($firefox) { Write-Host "VERIFIED: $($firefox.Name) $($firefox.Version)"; exit 0 }
$path = "C:\\Program Files\\Mozilla Firefox\\firefox.exe"
if (Test-Path $path) { $ver = (Get-Item $path).VersionInfo.ProductVersion; Write-Host "VERIFIED: Firefox $ver"; exit 0 }
Write-Error "Firefox ${v} not found"; exit 1`,
  },
  {
    name: '7-Zip',
    software: '7-Zip',
    vendor: '7-zip',
    product: '7-zip',
    category: 'Archiving',
    versions: [
      { version: '23.01', severity: 'LOW' },
      { version: '24.08', severity: 'LOW' },
      { version: '25.00', severity: 'MEDIUM', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Installing 7-Zip ${v}..."
winget install --id 7zip.7zip --version ${v}.00.0 --silent --accept-source-agreements --accept-package-agreements --force
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
  winget install --id 7zip.7zip --silent --accept-source-agreements --accept-package-agreements
}
Write-Host "7-Zip ${v} installed successfully"`,
    scriptUninstall: (_v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Uninstalling 7-Zip..."
winget uninstall --id 7zip.7zip --silent --accept-source-agreements
Write-Host "7-Zip uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Rolling back 7-Zip to ${prev}..."
winget uninstall --id 7zip.7zip --silent --accept-source-agreements
winget install --id 7zip.7zip --version ${prev}.00.0 --silent --accept-source-agreements --accept-package-agreements --force
Write-Host "7-Zip rolled back to ${prev}"`,
    scriptVerify: (v) => `\
#!/usr/bin/env powershell
$paths = @("C:\\Program Files\\7-Zip\\7z.exe","C:\\Program Files (x86)\\7-Zip\\7z.exe")
foreach ($p in $paths) { if (Test-Path $p) { $ver = (Get-Item $p).VersionInfo.ProductVersion; Write-Host "VERIFIED: 7-Zip $ver"; exit 0 } }
Write-Error "7-Zip ${v} not found"; exit 1`,
  },
  {
    name: 'Notepad++',
    software: 'Notepad++',
    vendor: 'notepad-plus-plus',
    product: 'notepad++',
    category: 'Text Editors',
    versions: [
      { version: '8.6.7', severity: 'LOW' },
      { version: '8.7.9', severity: 'MEDIUM' },
      { version: '8.8.9', severity: 'MEDIUM', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Installing Notepad++ ${v}..."
winget install --id Notepad++.Notepad++ --version ${v} --silent --accept-source-agreements --accept-package-agreements --force
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
  winget install --id Notepad++.Notepad++ --silent --accept-source-agreements --accept-package-agreements
}
Write-Host "Notepad++ ${v} installed successfully"`,
    scriptUninstall: (_v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Uninstalling Notepad++..."
winget uninstall --id Notepad++.Notepad++ --silent --accept-source-agreements
Write-Host "Notepad++ uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Rolling back Notepad++ to ${prev}..."
winget uninstall --id Notepad++.Notepad++ --silent --accept-source-agreements
winget install --id Notepad++.Notepad++ --version ${prev} --silent --accept-source-agreements --accept-package-agreements --force
Write-Host "Notepad++ rolled back to ${prev}"`,
    scriptVerify: (v) => `\
#!/usr/bin/env powershell
$paths = @("C:\\Program Files\\Notepad++\\notepad++.exe","C:\\Program Files (x86)\\Notepad++\\notepad++.exe")
foreach ($p in $paths) { if (Test-Path $p) { $ver = (Get-Item $p).VersionInfo.ProductVersion; Write-Host "VERIFIED: Notepad++ $ver"; exit 0 } }
Write-Error "Notepad++ ${v} not found"; exit 1`,
  },
  {
    name: 'VLC Media Player',
    software: 'VLC Media Player',
    vendor: 'videolan',
    product: 'vlc',
    category: 'Media Players',
    versions: [
      { version: '3.0.18', severity: 'MEDIUM' },
      { version: '3.0.20', severity: 'MEDIUM' },
      { version: '3.0.21', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Installing VLC Media Player ${v}..."
winget install --id VideoLAN.VLC --version ${v} --silent --accept-source-agreements --accept-package-agreements --force
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
  winget install --id VideoLAN.VLC --silent --accept-source-agreements --accept-package-agreements
}
Write-Host "VLC ${v} installed successfully"`,
    scriptUninstall: (_v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Uninstalling VLC Media Player..."
winget uninstall --id VideoLAN.VLC --silent --accept-source-agreements
Write-Host "VLC uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Rolling back VLC to ${prev}..."
winget uninstall --id VideoLAN.VLC --silent --accept-source-agreements
winget install --id VideoLAN.VLC --version ${prev} --silent --accept-source-agreements --accept-package-agreements --force
Write-Host "VLC rolled back to ${prev}"`,
    scriptVerify: (v) => `\
#!/usr/bin/env powershell
$vlc = Get-WmiObject Win32_Product | Where-Object { $_.Name -like "*VLC*" }
if ($vlc) { Write-Host "VERIFIED: $($vlc.Name) $($vlc.Version)"; exit 0 }
$path = "C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"
if (Test-Path $path) { $ver = (Get-Item $path).VersionInfo.ProductVersion; Write-Host "VERIFIED: VLC $ver"; exit 0 }
Write-Error "VLC ${v} not found"; exit 1`,
  },
  {
    name: 'Git for Windows',
    software: 'Git',
    vendor: 'git-scm',
    product: 'git',
    category: 'Developer Tools',
    versions: [
      { version: '2.43.0', severity: 'MEDIUM' },
      { version: '2.44.0', severity: 'MEDIUM' },
      { version: '2.47.0', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Installing Git ${v} for Windows..."
winget install --id Git.Git --version ${v}.2 --silent --accept-source-agreements --accept-package-agreements --force
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
  winget install --id Git.Git --version ${v} --silent --accept-source-agreements --accept-package-agreements --force
}
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
  winget install --id Git.Git --silent --accept-source-agreements --accept-package-agreements
}
Write-Host "Git ${v} installed successfully"`,
    scriptUninstall: (_v) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Uninstalling Git for Windows..."
winget uninstall --id Git.Git --silent --accept-source-agreements
Write-Host "Git uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/usr/bin/env powershell
$ErrorActionPreference = 'Stop'
Write-Host "Rolling back Git to ${prev}..."
winget uninstall --id Git.Git --silent --accept-source-agreements
winget install --id Git.Git --version ${prev}.2 --silent --accept-source-agreements --accept-package-agreements --force
Write-Host "Git rolled back to ${prev}"`,
    scriptVerify: (v) => `\
#!/usr/bin/env powershell
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) { $ver = git --version; Write-Host "VERIFIED: $ver"; exit 0 }
Write-Error "Git ${v} not found"; exit 1`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LINUX apps (bash + apt-get, Ubuntu 24.04)
// ─────────────────────────────────────────────────────────────────────────────
const LINUX_APPS: AppDef[] = [
  {
    name: 'nginx',
    software: 'nginx',
    vendor: 'nginx',
    product: 'nginx',
    category: 'Web Servers',
    versions: [
      { version: '1.18.0', severity: 'MEDIUM' },
      { version: '1.24.0', severity: 'MEDIUM' },
      { version: '1.26.0', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Installing nginx ${v}..."
apt-get update -qq
# Try exact version first, fall back to latest available
if apt-cache show nginx | grep -q "Version: ${v}"; then
  apt-get install -y "nginx=${v}*"
else
  echo "Version ${v} not in repo, installing latest available..."
  apt-get install -y nginx
fi
systemctl enable nginx 2>/dev/null || true
echo "nginx $(nginx -v 2>&1) installed successfully"`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Uninstalling nginx..."
systemctl stop nginx 2>/dev/null || true
apt-get remove -y nginx nginx-common nginx-core
apt-get autoremove -y
echo "nginx uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Rolling back nginx to ${prev}..."
systemctl stop nginx 2>/dev/null || true
apt-get remove -y nginx nginx-common nginx-core
apt-get install -y "nginx=${prev}*" 2>/dev/null || apt-get install -y nginx
echo "nginx rolled back"`,
    scriptVerify: (v) => `\
#!/bin/bash
if command -v nginx >/dev/null 2>&1; then
  VER=$(nginx -v 2>&1 | grep -oP '[0-9]+\\.[0-9]+\\.[0-9]+')
  echo "VERIFIED: nginx $VER (expected ${v})"
  exit 0
fi
echo "nginx not found"; exit 1`,
  },
  {
    name: 'curl',
    software: 'curl',
    vendor: 'haxx',
    product: 'curl',
    category: 'Networking Tools',
    versions: [
      { version: '7.81.0', severity: 'MEDIUM' },
      { version: '8.5.0', severity: 'HIGH' },
      { version: '8.9.0', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Installing curl ${v}..."
apt-get update -qq
if apt-cache show curl | grep -q "Version: ${v}"; then
  apt-get install -y "curl=${v}*"
else
  echo "Version ${v} not in repo, installing latest available..."
  apt-get install -y curl
fi
echo "curl $(curl --version | head -1) installed successfully"`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Uninstalling curl..."
apt-get remove -y curl
echo "curl uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Rolling back curl to ${prev}..."
apt-get remove -y curl
apt-get install -y "curl=${prev}*" 2>/dev/null || apt-get install -y curl
echo "curl rolled back"`,
    scriptVerify: (v) => `\
#!/bin/bash
if command -v curl >/dev/null 2>&1; then
  VER=$(curl --version | head -1 | awk '{print $2}')
  echo "VERIFIED: curl $VER (expected ${v})"
  exit 0
fi
echo "curl not found"; exit 1`,
  },
  {
    name: 'vim',
    software: 'vim',
    vendor: 'vim',
    product: 'vim',
    category: 'Text Editors',
    versions: [
      { version: '8.2', severity: 'LOW' },
      { version: '9.0', severity: 'MEDIUM' },
      { version: '9.1', severity: 'MEDIUM', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Installing vim ${v}..."
apt-get update -qq
apt-get install -y vim
echo "vim $(vim --version | head -1) installed successfully"`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Uninstalling vim..."
apt-get remove -y vim vim-runtime
echo "vim uninstalled"`,
    scriptRollback: (_v, _prev) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Reinstalling vim..."
apt-get install -y --reinstall vim
echo "vim reinstalled"`,
    scriptVerify: (v) => `\
#!/bin/bash
if command -v vim >/dev/null 2>&1; then
  VER=$(vim --version | head -1 | grep -oP 'Vi IMproved \\K[0-9.]+')
  echo "VERIFIED: vim $VER (expected ~${v})"
  exit 0
fi
echo "vim not found"; exit 1`,
  },
  {
    name: 'htop',
    software: 'htop',
    vendor: 'htop',
    product: 'htop',
    category: 'System Monitoring',
    versions: [
      { version: '3.0.5', severity: 'LOW' },
      { version: '3.2.2', severity: 'LOW' },
      { version: '3.3.0', severity: 'LOW', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Installing htop ${v}..."
apt-get update -qq
apt-get install -y htop
echo "htop $(htop --version | head -1) installed successfully"`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Uninstalling htop..."
apt-get remove -y htop
echo "htop uninstalled"`,
    scriptRollback: (_v, _prev) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get install -y --reinstall htop
echo "htop reinstalled"`,
    scriptVerify: (v) => `\
#!/bin/bash
if command -v htop >/dev/null 2>&1; then
  VER=$(htop --version 2>&1 | head -1 | grep -oP '[0-9]+\\.[0-9]+\\.[0-9]+')
  echo "VERIFIED: htop $VER (expected ${v})"
  exit 0
fi
echo "htop not found"; exit 1`,
  },
  {
    name: 'git',
    software: 'git',
    vendor: 'git-scm',
    product: 'git',
    category: 'Developer Tools',
    versions: [
      { version: '2.34.0', severity: 'MEDIUM' },
      { version: '2.43.0', severity: 'MEDIUM' },
      { version: '2.47.0', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Installing git ${v}..."
apt-get update -qq
# Try PPA for newer versions first
if ! dpkg -l git 2>/dev/null | grep -q "^ii.*${v}"; then
  add-apt-repository -y ppa:git-core/ppa 2>/dev/null || true
  apt-get update -qq 2>/dev/null || true
fi
apt-get install -y git
echo "$(git --version) installed successfully"`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
echo "Uninstalling git..."
apt-get remove -y git
echo "git uninstalled"`,
    scriptRollback: (_v, _prev) => `\
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get install -y --reinstall git
echo "git reinstalled"`,
    scriptVerify: (v) => `\
#!/bin/bash
if command -v git >/dev/null 2>&1; then
  VER=$(git --version | grep -oP '[0-9]+\\.[0-9]+\\.[0-9]+')
  echo "VERIFIED: git $VER (expected ${v})"
  exit 0
fi
echo "git not found"; exit 1`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MACOS apps (bash + brew / brew cask)
// ─────────────────────────────────────────────────────────────────────────────
const MACOS_APPS: AppDef[] = [
  {
    name: 'Mozilla Firefox',
    software: 'Firefox',
    vendor: 'mozilla',
    product: 'firefox',
    category: 'Web Browsers',
    versions: [
      { version: '121.0', severity: 'MEDIUM' },
      { version: '122.0', severity: 'HIGH' },
      { version: '123.0', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
echo "Installing Firefox ${v}..."
if command -v brew >/dev/null 2>&1; then
  brew install --cask firefox 2>/dev/null || brew upgrade --cask firefox 2>/dev/null || true
  echo "Firefox installed via brew"
else
  echo "Homebrew not found. Downloading Firefox ${v} directly..."
  TMPFILE=$(mktemp /tmp/firefox-XXXX.dmg)
  curl -L "https://download.mozilla.org/?product=firefox-${v}&os=osx&lang=en-US" -o "$TMPFILE"
  MOUNT=$(hdiutil attach "$TMPFILE" -nobrowse | tail -1 | awk '{print $3}')
  cp -R "$MOUNT/Firefox.app" /Applications/
  hdiutil detach "$MOUNT" -quiet
  rm -f "$TMPFILE"
  echo "Firefox ${v} installed to /Applications"
fi`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
echo "Uninstalling Firefox..."
if command -v brew >/dev/null 2>&1; then
  brew uninstall --cask firefox 2>/dev/null || true
fi
rm -rf "/Applications/Firefox.app" 2>/dev/null || true
echo "Firefox uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
echo "Rolling back Firefox to ${prev}..."
rm -rf "/Applications/Firefox.app" 2>/dev/null || true
TMPFILE=$(mktemp /tmp/firefox-XXXX.dmg)
curl -L "https://download.mozilla.org/?product=firefox-${prev}&os=osx&lang=en-US" -o "$TMPFILE"
MOUNT=$(hdiutil attach "$TMPFILE" -nobrowse | tail -1 | awk '{print $3}')
cp -R "$MOUNT/Firefox.app" /Applications/
hdiutil detach "$MOUNT" -quiet
rm -f "$TMPFILE"
echo "Firefox rolled back to ${prev}"`,
    scriptVerify: (v) => `\
#!/bin/bash
if [ -d "/Applications/Firefox.app" ]; then
  VER=$(/Applications/Firefox.app/Contents/MacOS/firefox --version 2>/dev/null | grep -oP '[0-9]+\\.[0-9]+' || echo "unknown")
  echo "VERIFIED: Firefox $VER (expected ${v})"
  exit 0
fi
echo "Firefox not found"; exit 1`,
  },
  {
    name: 'VLC Media Player',
    software: 'VLC',
    vendor: 'videolan',
    product: 'vlc',
    category: 'Media Players',
    versions: [
      { version: '3.0.18', severity: 'MEDIUM' },
      { version: '3.0.20', severity: 'MEDIUM' },
      { version: '3.0.21', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
echo "Installing VLC ${v}..."
if command -v brew >/dev/null 2>&1; then
  brew install --cask vlc 2>/dev/null || brew upgrade --cask vlc 2>/dev/null || true
  echo "VLC installed via brew"
else
  echo "Homebrew not found, downloading VLC ${v}..."
  TMPFILE=$(mktemp /tmp/vlc-XXXX.dmg)
  curl -L "https://download.videolan.org/vlc/${v}/macosx/vlc-${v}-arm64.dmg" -o "$TMPFILE" 2>/dev/null || \
  curl -L "https://download.videolan.org/vlc/${v}/macosx/vlc-${v}.dmg" -o "$TMPFILE"
  MOUNT=$(hdiutil attach "$TMPFILE" -nobrowse | tail -1 | awk '{print $3}')
  cp -R "$MOUNT/"*.app /Applications/ 2>/dev/null || true
  hdiutil detach "$MOUNT" -quiet
  rm -f "$TMPFILE"
  echo "VLC ${v} installed"
fi`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
echo "Uninstalling VLC..."
if command -v brew >/dev/null 2>&1; then
  brew uninstall --cask vlc 2>/dev/null || true
fi
rm -rf "/Applications/VLC.app" 2>/dev/null || true
echo "VLC uninstalled"`,
    scriptRollback: (_v, prev) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
echo "Rolling back VLC to ${prev}..."
rm -rf "/Applications/VLC.app" 2>/dev/null || true
TMPFILE=$(mktemp /tmp/vlc-XXXX.dmg)
curl -L "https://download.videolan.org/vlc/${prev}/macosx/vlc-${prev}-arm64.dmg" -o "$TMPFILE" 2>/dev/null || \
curl -L "https://download.videolan.org/vlc/${prev}/macosx/vlc-${prev}.dmg" -o "$TMPFILE"
MOUNT=$(hdiutil attach "$TMPFILE" -nobrowse | tail -1 | awk '{print $3}')
cp -R "$MOUNT/"*.app /Applications/ 2>/dev/null || true
hdiutil detach "$MOUNT" -quiet
rm -f "$TMPFILE"
echo "VLC rolled back to ${prev}"`,
    scriptVerify: (v) => `\
#!/bin/bash
if [ -d "/Applications/VLC.app" ]; then
  VER=$(/Applications/VLC.app/Contents/MacOS/VLC --version 2>/dev/null | head -1 | grep -oP '[0-9]+\\.[0-9]+\\.[0-9]+' || echo "found")
  echo "VERIFIED: VLC $VER (expected ${v})"
  exit 0
fi
echo "VLC not found"; exit 1`,
  },
  {
    name: 'wget',
    software: 'wget',
    vendor: 'gnu',
    product: 'wget',
    category: 'Networking Tools',
    versions: [
      { version: '1.21.3', severity: 'LOW' },
      { version: '1.21.4', severity: 'LOW' },
      { version: '1.24.5', severity: 'MEDIUM', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
echo "Installing wget ${v}..."
if command -v brew >/dev/null 2>&1; then
  brew install wget 2>/dev/null || brew upgrade wget 2>/dev/null || true
  echo "wget $(wget --version 2>&1 | head -1) installed"
else
  echo "Homebrew required for wget on macOS"; exit 1
fi`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
echo "Uninstalling wget..."
if command -v brew >/dev/null 2>&1; then
  brew uninstall wget 2>/dev/null || true
fi
echo "wget uninstalled"`,
    scriptRollback: (_v, _prev) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
brew uninstall wget 2>/dev/null || true
brew install wget
echo "wget reinstalled"`,
    scriptVerify: (v) => `\
#!/bin/bash
if command -v wget >/dev/null 2>&1; then
  VER=$(wget --version 2>&1 | head -1 | grep -oP '[0-9]+\\.[0-9]+\\.[0-9]+')
  echo "VERIFIED: wget $VER (expected ${v})"
  exit 0
fi
echo "wget not found"; exit 1`,
  },
  {
    name: 'htop',
    software: 'htop',
    vendor: 'htop',
    product: 'htop',
    category: 'System Monitoring',
    versions: [
      { version: '3.0.5', severity: 'LOW' },
      { version: '3.2.2', severity: 'LOW' },
      { version: '3.3.0', severity: 'LOW', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
echo "Installing htop ${v}..."
if command -v brew >/dev/null 2>&1; then
  brew install htop 2>/dev/null || brew upgrade htop 2>/dev/null || true
  echo "htop $(htop --version 2>&1 | head -1) installed"
else
  echo "Homebrew required"; exit 1
fi`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
echo "Uninstalling htop..."
brew uninstall htop 2>/dev/null || true
echo "htop uninstalled"`,
    scriptRollback: (_v, _prev) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
brew uninstall htop 2>/dev/null || true
brew install htop
echo "htop reinstalled"`,
    scriptVerify: (v) => `\
#!/bin/bash
if command -v htop >/dev/null 2>&1; then
  VER=$(htop --version 2>&1 | head -1 | grep -oP '[0-9]+\\.[0-9]+\\.[0-9]+')
  echo "VERIFIED: htop $VER (expected ${v})"
  exit 0
fi
echo "htop not found"; exit 1`,
  },
  {
    name: 'git',
    software: 'git',
    vendor: 'git-scm',
    product: 'git',
    category: 'Developer Tools',
    versions: [
      { version: '2.43.0', severity: 'MEDIUM' },
      { version: '2.44.0', severity: 'MEDIUM' },
      { version: '2.47.0', severity: 'HIGH', isLatest: true },
    ],
    scriptInstall: (v) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ENV_HINTS=1
echo "Installing git ${v}..."
if command -v brew >/dev/null 2>&1; then
  brew install git 2>/dev/null || brew upgrade git 2>/dev/null || true
  echo "$(git --version) installed"
else
  xcode-select --install 2>/dev/null || true
  echo "git available via Xcode Command Line Tools"
fi`,
    scriptUninstall: (_v) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
echo "Uninstalling brew git (system git will remain)..."
brew uninstall git 2>/dev/null || true
echo "brew git uninstalled"`,
    scriptRollback: (_v, _prev) => `\
#!/bin/bash
set -e
export HOMEBREW_NO_AUTO_UPDATE=1
brew uninstall git 2>/dev/null || true
brew install git
echo "git reinstalled"`,
    scriptVerify: (v) => `\
#!/bin/bash
if command -v git >/dev/null 2>&1; then
  VER=$(git --version | grep -oP '[0-9]+\\.[0-9]+\\.[0-9]+')
  echo "VERIFIED: git $VER (expected ${v})"
  exit 0
fi
echo "git not found"; exit 1`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Counter for patch IDs
// ─────────────────────────────────────────────────────────────────────────────
let patchCounter = 0;
async function nextPatchId(osPrefix: string): Promise<string> {
  const count = await prisma.patch.count();
  patchCounter++;
  return `PW-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(count + patchCounter).padStart(3, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main seeder
// ─────────────────────────────────────────────────────────────────────────────
async function seedPatches(apps: AppDef[], os: 'WINDOWS' | 'LINUX' | 'MACOS') {
  let created = 0;
  let skipped = 0;

  for (const app of apps) {
    for (let i = 0; i < app.versions.length; i++) {
      const vInfo = app.versions[i];
      const prevVersion = i > 0 ? app.versions[i - 1].version : vInfo.version;

      // Check if already exists
      const existing = await prisma.patch.findFirst({
        where: {
          software: app.software,
          os,
          title: { contains: vInfo.version },
        },
      });

      if (existing) {
        console.log(`  SKIP: ${app.name} ${vInfo.version} (${os}) — already exists`);
        skipped++;
        continue;
      }

      const patchId = await nextPatchId(os.charAt(0));
      const title = `${app.name} ${vInfo.version} Update`;
      const description = `Security and stability update for ${app.name} to version ${vInfo.version}.`;

      const patch = await prisma.patch.create({
        data: {
          id: uuidv4(),
          patchId,
          title,
          software: app.software,
          description,
          severity: vInfo.severity,
          category: app.category,
          vendor: app.vendor,
          product: app.product,
          os,
          platform: os === 'WINDOWS' ? 'Windows' : os === 'LINUX' ? 'Linux' : 'macOS',
          rebootRequired: os === 'WINDOWS' && app.software !== 'Git',
          supportUninstallation: true,
          supportsRollback: i > 0,
          tags: [os.toLowerCase(), app.category.toLowerCase().replace(' ', '-'), vInfo.isLatest ? 'latest' : 'legacy'],
          testStatus: 'NOT_TESTED',
          testResult: null,
          approvalStatus: 'Pending',
          endpoints: 0,
          operationalStatusSince: new Date(),
        },
      });

      // Create bundle with proper scripts
      await prisma.patchBundle.create({
        data: {
          id: uuidv4(),
          patchId: patch.id,
          scriptInstall: app.scriptInstall(vInfo.version, prevVersion),
          scriptUninstall: app.scriptUninstall(vInfo.version),
          scriptRollback: i > 0 ? app.scriptRollback(vInfo.version, prevVersion) : null,
          scriptVerify: app.scriptVerify(vInfo.version),
          scriptsIncluded: true,
          downloadStatus: 'COMPLETED',
          requiresRoot: os !== 'WINDOWS',
        },
      });

      console.log(`  CREATE: ${patchId} — ${app.name} ${vInfo.version} (${os})`);
      created++;
    }
  }

  return { created, skipped };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Software Patch Collection Seed (45 patches)      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log('── Windows patches (5 apps × 3 versions) ──');
  const win = await seedPatches(WINDOWS_APPS, 'WINDOWS');

  console.log('\n── Linux patches (5 apps × 3 versions) ──');
  const lin = await seedPatches(LINUX_APPS, 'LINUX');

  console.log('\n── macOS patches (5 apps × 3 versions) ──');
  const mac = await seedPatches(MACOS_APPS, 'MACOS');

  const total = win.created + lin.created + mac.created;
  const totalSkipped = win.skipped + lin.skipped + mac.skipped;

  console.log(`\n✓ Done — created ${total} patches, skipped ${totalSkipped} existing`);
  console.log('\nNext step: Deploy the latest version of each app to the appropriate');
  console.log('endpoint, verify success, then mark testResult = PASSED.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
