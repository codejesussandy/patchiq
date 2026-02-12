/**
 * Seed script to populate Patch records for software already downloaded in MinIO.
 *
 * For each software we create up to 3 version entries:
 *   - Latest (current)   → status: Published, approvalStatus: Approved
 *   - N-1 (previous)     → status: Published, approvalStatus: Approved  (rollback target)
 *   - N-2 (old)          → status: Superseded, approvalStatus: Approved
 *
 * Run:  npx tsx src/db/prisma/seed-patches.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── helpers ───────────────────────────────────────────────────────────

function patchId(prefix: string, idx: number): string {
  return `${prefix}-${idx.toString().padStart(4, '0')}`;
}

interface PatchSeed {
  patchId: string;
  title: string;
  software: string;
  description: string;
  severity: string;
  category: string;
  vendor: string;
  product: string;
  os: string;
  platform: string;
  architecture: string;
  kbNumber: string;
  bulletinId: string;
  publishedAt: Date;
  referenceUrl: string;
  downloadUrl: string;
  rebootRequired: boolean;
  supportUninstallation: boolean;
  languagesSupported: string[];
  tags: string[];
  cveNumbers: string[];
  status: string;
  downloadStatus: string;
  supersedes: string[];
  supersededBy: string[];
  testStatus: string;
  approvalStatus: string;
  endpoints: number;
}

// ─── software definitions ──────────────────────────────────────────────

interface VersionDef {
  version: string;
  publishedAt: string;   // YYYY-MM-DD
  cves?: string[];
  description?: string;
}

interface SoftwareDef {
  name: string;
  vendor: string;
  product: string;
  category: string;
  os: string;            // Windows | MacOS | Linux
  platform: string;
  architecture: string;
  rebootRequired: boolean;
  supportUninstallation: boolean;
  tags: string[];
  referenceUrl: string;
  bulletinPrefix: string;
  versions: VersionDef[];  // [latest, n-1, n-2]
}

const SOFTWARE: SoftwareDef[] = [
  // ── Node.js ─────────────────────────────────────────────
  {
    name: 'Node.js',
    vendor: 'OpenJS Foundation',
    product: 'Node.js',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'JavaScript'],
    referenceUrl: 'https://nodejs.org/en/download/',
    bulletinPrefix: 'NODEJS',
    versions: [
      { version: '22.12.0', publishedAt: '2024-12-03', cves: ['CVE-2024-22019', 'CVE-2024-22025'], description: 'Node.js 22.12.0 LTS (Jod) - security and bug fix update' },
      { version: '22.11.0', publishedAt: '2024-10-29', cves: ['CVE-2024-22018'], description: 'Node.js 22.11.0 LTS - first LTS release of v22 line' },
      { version: '20.18.0', publishedAt: '2024-10-03', cves: [], description: 'Node.js 20.18.0 LTS (Iron) - maintenance update' },
    ],
  },
  {
    name: 'Node.js',
    vendor: 'OpenJS Foundation',
    product: 'Node.js',
    category: 'Application Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'JavaScript'],
    referenceUrl: 'https://nodejs.org/en/download/',
    bulletinPrefix: 'NODEJS-MAC',
    versions: [
      { version: '22.12.0', publishedAt: '2024-12-03', cves: ['CVE-2024-22019'], description: 'Node.js 22.12.0 LTS for macOS' },
      { version: '22.11.0', publishedAt: '2024-10-29', cves: [], description: 'Node.js 22.11.0 LTS for macOS' },
    ],
  },
  {
    name: 'Node.js',
    vendor: 'OpenJS Foundation',
    product: 'Node.js',
    category: 'Application Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'JavaScript'],
    referenceUrl: 'https://nodejs.org/en/download/',
    bulletinPrefix: 'NODEJS-LNX',
    versions: [
      { version: '22.12.0', publishedAt: '2024-12-03', cves: ['CVE-2024-22019'], description: 'Node.js 22.12.0 LTS for Linux' },
      { version: '22.11.0', publishedAt: '2024-10-29', cves: [], description: 'Node.js 22.11.0 LTS for Linux' },
    ],
  },

  // ── Go ──────────────────────────────────────────────────
  {
    name: 'Go',
    vendor: 'Google',
    product: 'Go',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'Golang'],
    referenceUrl: 'https://go.dev/dl/',
    bulletinPrefix: 'GO',
    versions: [
      { version: '1.23.4', publishedAt: '2024-12-03', cves: ['CVE-2024-45337', 'CVE-2024-45338'], description: 'Go 1.23.4 - security patch for crypto/ssh and html/template' },
      { version: '1.23.3', publishedAt: '2024-11-06', cves: ['CVE-2024-34155'], description: 'Go 1.23.3 - bug fix release' },
      { version: '1.22.10', publishedAt: '2024-12-03', cves: ['CVE-2024-45337'], description: 'Go 1.22.10 - security backport for older branch' },
    ],
  },
  {
    name: 'Go',
    vendor: 'Google',
    product: 'Go',
    category: 'Application Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'Golang'],
    referenceUrl: 'https://go.dev/dl/',
    bulletinPrefix: 'GO-MAC',
    versions: [
      { version: '1.23.4', publishedAt: '2024-12-03', cves: ['CVE-2024-45337'], description: 'Go 1.23.4 for macOS' },
      { version: '1.23.3', publishedAt: '2024-11-06', cves: [], description: 'Go 1.23.3 for macOS' },
    ],
  },
  {
    name: 'Go',
    vendor: 'Google',
    product: 'Go',
    category: 'Application Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'Golang'],
    referenceUrl: 'https://go.dev/dl/',
    bulletinPrefix: 'GO-LNX',
    versions: [
      { version: '1.23.4', publishedAt: '2024-12-03', cves: ['CVE-2024-45337'], description: 'Go 1.23.4 for Linux' },
      { version: '1.23.3', publishedAt: '2024-11-06', cves: [], description: 'Go 1.23.3 for Linux' },
    ],
  },

  // ── Python ──────────────────────────────────────────────
  {
    name: 'Python',
    vendor: 'Python Software Foundation',
    product: 'Python',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'Python'],
    referenceUrl: 'https://www.python.org/downloads/',
    bulletinPrefix: 'PYTHON',
    versions: [
      { version: '3.13.1', publishedAt: '2024-12-03', cves: ['CVE-2024-12254'], description: 'Python 3.13.1 - security fix for asyncio and ssl modules' },
      { version: '3.13.0', publishedAt: '2024-10-07', cves: [], description: 'Python 3.13.0 - major release with free-threaded mode' },
      { version: '3.12.8', publishedAt: '2024-12-03', cves: ['CVE-2024-12254'], description: 'Python 3.12.8 - security backport' },
    ],
  },
  {
    name: 'Python',
    vendor: 'Python Software Foundation',
    product: 'Python',
    category: 'Application Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: 'Universal',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'Python'],
    referenceUrl: 'https://www.python.org/downloads/',
    bulletinPrefix: 'PYTHON-MAC',
    versions: [
      { version: '3.13.1', publishedAt: '2024-12-03', cves: ['CVE-2024-12254'], description: 'Python 3.13.1 for macOS' },
      { version: '3.13.0', publishedAt: '2024-10-07', cves: [], description: 'Python 3.13.0 for macOS' },
    ],
  },

  // ── Eclipse Temurin JDK ─────────────────────────────────
  {
    name: 'Eclipse Temurin JDK 21',
    vendor: 'Eclipse Foundation',
    product: 'Temurin JDK',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'Java', 'JDK'],
    referenceUrl: 'https://adoptium.net/temurin/releases/',
    bulletinPrefix: 'TEMURIN',
    versions: [
      { version: '21.0.5+11', publishedAt: '2024-10-15', cves: ['CVE-2024-21217', 'CVE-2024-21235'], description: 'Eclipse Temurin JDK 21.0.5 - October 2024 CPU' },
      { version: '21.0.4+7', publishedAt: '2024-07-16', cves: ['CVE-2024-21131', 'CVE-2024-21138'], description: 'Eclipse Temurin JDK 21.0.4 - July 2024 CPU' },
      { version: '21.0.3+9', publishedAt: '2024-04-16', cves: ['CVE-2024-21011', 'CVE-2024-21068'], description: 'Eclipse Temurin JDK 21.0.3 - April 2024 CPU' },
    ],
  },
  {
    name: 'Eclipse Temurin JDK 21',
    vendor: 'Eclipse Foundation',
    product: 'Temurin JDK',
    category: 'Application Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'Java', 'JDK'],
    referenceUrl: 'https://adoptium.net/temurin/releases/',
    bulletinPrefix: 'TEMURIN-MAC',
    versions: [
      { version: '21.0.5+11', publishedAt: '2024-10-15', cves: ['CVE-2024-21217'], description: 'Eclipse Temurin JDK 21.0.5 for macOS' },
      { version: '21.0.4+7', publishedAt: '2024-07-16', cves: ['CVE-2024-21131'], description: 'Eclipse Temurin JDK 21.0.4 for macOS' },
    ],
  },
  {
    name: 'Eclipse Temurin JDK 21',
    vendor: 'Eclipse Foundation',
    product: 'Temurin JDK',
    category: 'Application Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Runtime', 'Java', 'JDK'],
    referenceUrl: 'https://adoptium.net/temurin/releases/',
    bulletinPrefix: 'TEMURIN-LNX',
    versions: [
      { version: '21.0.5+11', publishedAt: '2024-10-15', cves: ['CVE-2024-21217'], description: 'Eclipse Temurin JDK 21.0.5 for Linux' },
      { version: '21.0.4+7', publishedAt: '2024-07-16', cves: ['CVE-2024-21131'], description: 'Eclipse Temurin JDK 21.0.4 for Linux' },
    ],
  },

  // ── Google Chrome ───────────────────────────────────────
  {
    name: 'Google Chrome',
    vendor: 'Google',
    product: 'Chrome',
    category: 'Security Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Browser', 'Chrome'],
    referenceUrl: 'https://chromereleases.googleblog.com/',
    bulletinPrefix: 'CHROME',
    versions: [
      { version: '131.0.6778.86', publishedAt: '2024-12-03', cves: ['CVE-2024-12053', 'CVE-2024-12054'], description: 'Chrome 131 stable channel update - security fixes' },
      { version: '130.0.6723.117', publishedAt: '2024-11-12', cves: ['CVE-2024-11110', 'CVE-2024-11111'], description: 'Chrome 130 stable channel update' },
      { version: '129.0.6668.100', publishedAt: '2024-10-08', cves: ['CVE-2024-9602', 'CVE-2024-9603'], description: 'Chrome 129 security update' },
    ],
  },
  {
    name: 'Google Chrome',
    vendor: 'Google',
    product: 'Chrome',
    category: 'Security Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: 'Universal',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Browser', 'Chrome'],
    referenceUrl: 'https://chromereleases.googleblog.com/',
    bulletinPrefix: 'CHROME-MAC',
    versions: [
      { version: '131.0.6778.86', publishedAt: '2024-12-03', cves: ['CVE-2024-12053'], description: 'Chrome 131 for macOS - security update' },
      { version: '130.0.6723.117', publishedAt: '2024-11-12', cves: ['CVE-2024-11110'], description: 'Chrome 130 for macOS' },
    ],
  },

  // ── Mozilla Firefox ─────────────────────────────────────
  {
    name: 'Mozilla Firefox',
    vendor: 'Mozilla',
    product: 'Firefox',
    category: 'Security Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Browser', 'Firefox'],
    referenceUrl: 'https://www.mozilla.org/en-US/firefox/releases/',
    bulletinPrefix: 'FIREFOX',
    versions: [
      { version: '133.0', publishedAt: '2024-11-26', cves: ['CVE-2024-11691', 'CVE-2024-11692', 'CVE-2024-11694'], description: 'Firefox 133.0 - multiple security fixes' },
      { version: '132.0.2', publishedAt: '2024-11-14', cves: ['CVE-2024-11159'], description: 'Firefox 132.0.2 - plaintext email leak fix' },
      { version: '131.0.3', publishedAt: '2024-10-09', cves: ['CVE-2024-9680'], description: 'Firefox 131.0.3 - critical use-after-free in Animation' },
    ],
  },
  {
    name: 'Mozilla Firefox',
    vendor: 'Mozilla',
    product: 'Firefox',
    category: 'Security Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: 'Universal',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Browser', 'Firefox'],
    referenceUrl: 'https://www.mozilla.org/en-US/firefox/releases/',
    bulletinPrefix: 'FIREFOX-MAC',
    versions: [
      { version: '133.0', publishedAt: '2024-11-26', cves: ['CVE-2024-11691'], description: 'Firefox 133.0 for macOS' },
      { version: '132.0.2', publishedAt: '2024-11-14', cves: ['CVE-2024-11159'], description: 'Firefox 132.0.2 for macOS' },
    ],
  },
  {
    name: 'Mozilla Firefox',
    vendor: 'Mozilla',
    product: 'Firefox',
    category: 'Security Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Browser', 'Firefox'],
    referenceUrl: 'https://www.mozilla.org/en-US/firefox/releases/',
    bulletinPrefix: 'FIREFOX-LNX',
    versions: [
      { version: '133.0', publishedAt: '2024-11-26', cves: ['CVE-2024-11691'], description: 'Firefox 133.0 for Linux' },
      { version: '132.0.2', publishedAt: '2024-11-14', cves: [], description: 'Firefox 132.0.2 for Linux' },
    ],
  },

  // ── Git for Windows ─────────────────────────────────────
  {
    name: 'Git for Windows',
    vendor: 'Git',
    product: 'Git',
    category: 'Security Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Development', 'Git'],
    referenceUrl: 'https://github.com/git-for-windows/git/releases',
    bulletinPrefix: 'GIT',
    versions: [
      { version: '2.47.1', publishedAt: '2024-11-25', cves: ['CVE-2024-50349', 'CVE-2024-52006'], description: 'Git 2.47.1 - credential leak and newline injection fixes' },
      { version: '2.47.0', publishedAt: '2024-10-07', cves: [], description: 'Git 2.47.0 - incremental multi-pack indexes' },
      { version: '2.46.2', publishedAt: '2024-09-12', cves: ['CVE-2024-32002'], description: 'Git 2.46.2 - symlink handling security fix' },
    ],
  },

  // ── 7-Zip ───────────────────────────────────────────────
  {
    name: '7-Zip',
    vendor: '7-Zip',
    product: '7-Zip',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Utility', 'Compression'],
    referenceUrl: 'https://www.7-zip.org/',
    bulletinPrefix: '7ZIP',
    versions: [
      { version: '24.09', publishedAt: '2024-11-29', cves: ['CVE-2024-11477'], description: '7-Zip 24.09 - Zstandard decompression integer underflow fix' },
      { version: '24.08', publishedAt: '2024-09-01', cves: [], description: '7-Zip 24.08 - performance improvements' },
      { version: '24.07', publishedAt: '2024-06-19', cves: [], description: '7-Zip 24.07 - ARM64 support improvements' },
    ],
  },

  // ── Notepad++ ───────────────────────────────────────────
  {
    name: 'Notepad++',
    vendor: 'Notepad++',
    product: 'Notepad++',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Utility', 'Editor'],
    referenceUrl: 'https://notepad-plus-plus.org/downloads/',
    bulletinPrefix: 'NPP',
    versions: [
      { version: '8.7.1', publishedAt: '2024-11-18', cves: [], description: 'Notepad++ 8.7.1 - bug fix release for plugin compatibility' },
      { version: '8.7', publishedAt: '2024-10-28', cves: ['CVE-2023-40031', 'CVE-2023-40036'], description: 'Notepad++ 8.7 - security and feature update' },
      { version: '8.6.9', publishedAt: '2024-08-24', cves: [], description: 'Notepad++ 8.6.9 - maintenance release' },
    ],
  },

  // ── VLC ─────────────────────────────────────────────────
  {
    name: 'VLC Media Player',
    vendor: 'VideoLAN',
    product: 'VLC',
    category: 'Security Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Utility', 'Media'],
    referenceUrl: 'https://www.videolan.org/vlc/releases/',
    bulletinPrefix: 'VLC',
    versions: [
      { version: '3.0.21', publishedAt: '2024-06-10', cves: ['CVE-2024-46461'], description: 'VLC 3.0.21 - integer overflow fix in MMS module' },
      { version: '3.0.20', publishedAt: '2023-11-13', cves: ['CVE-2023-47360'], description: 'VLC 3.0.20 - security and stability update' },
      { version: '3.0.19', publishedAt: '2023-09-21', cves: [], description: 'VLC 3.0.19 - bug fix release' },
    ],
  },
  {
    name: 'VLC Media Player',
    vendor: 'VideoLAN',
    product: 'VLC',
    category: 'Security Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: 'Universal',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Utility', 'Media'],
    referenceUrl: 'https://www.videolan.org/vlc/releases/',
    bulletinPrefix: 'VLC-MAC',
    versions: [
      { version: '3.0.21', publishedAt: '2024-06-10', cves: ['CVE-2024-46461'], description: 'VLC 3.0.21 for macOS' },
      { version: '3.0.20', publishedAt: '2023-11-13', cves: [], description: 'VLC 3.0.20 for macOS' },
    ],
  },

  // ── FileZilla ───────────────────────────────────────────
  {
    name: 'FileZilla Client',
    vendor: 'FileZilla Project',
    product: 'FileZilla',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Utility', 'FTP'],
    referenceUrl: 'https://filezilla-project.org/download.php',
    bulletinPrefix: 'FILEZILLA',
    versions: [
      { version: '3.68.1', publishedAt: '2024-11-18', cves: [], description: 'FileZilla 3.68.1 - TLS 1.3 performance improvements' },
      { version: '3.67.1', publishedAt: '2024-09-22', cves: ['CVE-2024-31497'], description: 'FileZilla 3.67.1 - PuTTY ECDSA nonce bias fix' },
      { version: '3.67.0', publishedAt: '2024-08-01', cves: [], description: 'FileZilla 3.67.0 - UI improvements' },
    ],
  },

  // ── Docker Desktop ──────────────────────────────────────
  {
    name: 'Docker Desktop',
    vendor: 'Docker',
    product: 'Docker Desktop',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: true,
    supportUninstallation: true,
    tags: ['Development', 'Container'],
    referenceUrl: 'https://docs.docker.com/desktop/release-notes/',
    bulletinPrefix: 'DOCKER',
    versions: [
      { version: '4.36.0', publishedAt: '2024-11-18', cves: ['CVE-2024-9348'], description: 'Docker Desktop 4.36.0 - Docker Engine 27.3.1 with security fixes' },
      { version: '4.35.1', publishedAt: '2024-10-24', cves: [], description: 'Docker Desktop 4.35.1 - bug fix release' },
      { version: '4.34.3', publishedAt: '2024-09-26', cves: ['CVE-2024-41110'], description: 'Docker Desktop 4.34.3 - AuthZ bypass fix' },
    ],
  },
  {
    name: 'Docker Desktop',
    vendor: 'Docker',
    product: 'Docker Desktop',
    category: 'Application Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: 'Universal',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Development', 'Container'],
    referenceUrl: 'https://docs.docker.com/desktop/release-notes/',
    bulletinPrefix: 'DOCKER-MAC',
    versions: [
      { version: '4.36.0', publishedAt: '2024-11-18', cves: ['CVE-2024-9348'], description: 'Docker Desktop 4.36.0 for macOS' },
      { version: '4.35.1', publishedAt: '2024-10-24', cves: [], description: 'Docker Desktop 4.35.1 for macOS' },
    ],
  },

  // ── Discord ─────────────────────────────────────────────
  {
    name: 'Discord',
    vendor: 'Discord',
    product: 'Discord',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Communication'],
    referenceUrl: 'https://discord.com/download',
    bulletinPrefix: 'DISCORD',
    versions: [
      { version: '1.0.9168', publishedAt: '2024-12-01', cves: [], description: 'Discord Desktop latest stable - performance improvements' },
      { version: '1.0.9163', publishedAt: '2024-11-15', cves: [], description: 'Discord Desktop - bug fixes' },
      { version: '1.0.9155', publishedAt: '2024-10-20', cves: ['CVE-2024-10806'], description: 'Discord Desktop - Electron security update' },
    ],
  },

  // ── AnyDesk ─────────────────────────────────────────────
  {
    name: 'AnyDesk',
    vendor: 'AnyDesk',
    product: 'AnyDesk',
    category: 'Security Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Utility', 'Remote Desktop'],
    referenceUrl: 'https://anydesk.com/en/downloads',
    bulletinPrefix: 'ANYDESK',
    versions: [
      { version: '9.0.1', publishedAt: '2024-11-20', cves: [], description: 'AnyDesk 9.0.1 - stability improvements and bug fixes' },
      { version: '8.1.0', publishedAt: '2024-07-15', cves: ['CVE-2024-12754'], description: 'AnyDesk 8.1.0 - local privilege escalation fix' },
      { version: '8.0.10', publishedAt: '2024-02-05', cves: ['CVE-2024-52940'], description: 'AnyDesk 8.0.10 - code signing certificate breach response' },
    ],
  },
  {
    name: 'AnyDesk',
    vendor: 'AnyDesk',
    product: 'AnyDesk',
    category: 'Security Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: 'Universal',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Utility', 'Remote Desktop'],
    referenceUrl: 'https://anydesk.com/en/downloads',
    bulletinPrefix: 'ANYDESK-MAC',
    versions: [
      { version: '9.0.1', publishedAt: '2024-11-20', cves: [], description: 'AnyDesk 9.0.1 for macOS' },
      { version: '8.1.0', publishedAt: '2024-07-15', cves: [], description: 'AnyDesk 8.1.0 for macOS' },
    ],
  },

  // ── Postman ─────────────────────────────────────────────
  {
    name: 'Postman',
    vendor: 'Postman',
    product: 'Postman',
    category: 'Application Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Development', 'API'],
    referenceUrl: 'https://www.postman.com/downloads/',
    bulletinPrefix: 'POSTMAN',
    versions: [
      { version: '11.22.0', publishedAt: '2024-12-01', cves: [], description: 'Postman 11.22.0 - AI assistant improvements, gRPC enhancements' },
      { version: '11.20.0', publishedAt: '2024-11-10', cves: [], description: 'Postman 11.20.0 - collection runner improvements' },
      { version: '11.18.0', publishedAt: '2024-10-15', cves: [], description: 'Postman 11.18.0 - Electron update' },
    ],
  },
  {
    name: 'Postman',
    vendor: 'Postman',
    product: 'Postman',
    category: 'Application Updates',
    os: 'MACOS',
    platform: 'MACOS',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Development', 'API'],
    referenceUrl: 'https://www.postman.com/downloads/',
    bulletinPrefix: 'POSTMAN-MAC',
    versions: [
      { version: '11.22.0', publishedAt: '2024-12-01', cves: [], description: 'Postman 11.22.0 for macOS' },
      { version: '11.20.0', publishedAt: '2024-11-10', cves: [], description: 'Postman 11.20.0 for macOS' },
    ],
  },

  // ── Malwarebytes ────────────────────────────────────────
  {
    name: 'Malwarebytes',
    vendor: 'Malwarebytes',
    product: 'Malwarebytes',
    category: 'Security Updates',
    os: 'WINDOWS',
    platform: 'WINDOWS',
    architecture: '64 BIT',
    rebootRequired: true,
    supportUninstallation: true,
    tags: ['Security', 'Antivirus'],
    referenceUrl: 'https://www.malwarebytes.com/mwb-download',
    bulletinPrefix: 'MWBYTES',
    versions: [
      { version: '5.1.6.110', publishedAt: '2024-11-28', cves: [], description: 'Malwarebytes 5.1.6 - engine and definition updates' },
      { version: '5.1.5.98', publishedAt: '2024-10-30', cves: [], description: 'Malwarebytes 5.1.5 - scan performance improvements' },
      { version: '5.1.3.76', publishedAt: '2024-09-15', cves: [], description: 'Malwarebytes 5.1.3 - real-time protection enhancements' },
    ],
  },

  // ── VirtualBox ──────────────────────────────────────────
  // (Not in MinIO downloads but in whitelist - skip for now since no file)

  // ── WinRAR ──────────────────────────────────────────────
  // (Not found in MinIO but in category doc - skip)

  // ── Slack (Hub bundle exists) ───────────────────────────
  {
    name: 'Slack',
    vendor: 'Salesforce',
    product: 'Slack',
    category: 'Application Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Communication', 'Enterprise'],
    referenceUrl: 'https://slack.com/downloads',
    bulletinPrefix: 'SLACK-LNX',
    versions: [
      { version: '4.36.140', publishedAt: '2024-11-20', cves: [], description: 'Slack 4.36.140 - Electron 30.x update, bug fixes' },
      { version: '4.35.131', publishedAt: '2024-10-10', cves: ['CVE-2024-38428'], description: 'Slack 4.35.131 - URL parsing vulnerability fix' },
      { version: '4.34.121', publishedAt: '2024-08-20', cves: [], description: 'Slack 4.34.121 - performance improvements' },
    ],
  },

  // ── Zoom (Hub bundle exists) ────────────────────────────
  {
    name: 'Zoom',
    vendor: 'Zoom Video Communications',
    product: 'Zoom Workplace',
    category: 'Security Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Communication', 'Enterprise'],
    referenceUrl: 'https://zoom.us/download',
    bulletinPrefix: 'ZOOM-LNX',
    versions: [
      { version: '6.2.6', publishedAt: '2024-11-12', cves: ['CVE-2024-45421', 'CVE-2024-45422'], description: 'Zoom 6.2.6 - buffer overflow and input validation fixes' },
      { version: '6.1.6', publishedAt: '2024-09-10', cves: ['CVE-2024-39825'], description: 'Zoom 6.1.6 - heap buffer overflow in Zoom Workplace' },
      { version: '6.0.12', publishedAt: '2024-07-09', cves: ['CVE-2024-39818'], description: 'Zoom 6.0.12 - improper authentication fix' },
    ],
  },

  // ── VS Code (Hub bundle exists) ─────────────────────────
  {
    name: 'Visual Studio Code',
    vendor: 'Microsoft',
    product: 'VS Code',
    category: 'Application Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Development', 'Editor'],
    referenceUrl: 'https://code.visualstudio.com/updates',
    bulletinPrefix: 'VSCODE-LNX',
    versions: [
      { version: '1.96.0', publishedAt: '2024-12-04', cves: [], description: 'VS Code 1.96 - Copilot improvements, multi-file edit support' },
      { version: '1.95.3', publishedAt: '2024-11-13', cves: ['CVE-2024-49050'], description: 'VS Code 1.95.3 - remote code execution fix in extensions' },
      { version: '1.94.2', publishedAt: '2024-10-09', cves: [], description: 'VS Code 1.94.2 - stability fixes' },
    ],
  },

  // ── Nginx (Hub bundle exists) ───────────────────────────
  {
    name: 'Nginx',
    vendor: 'Nginx Inc',
    product: 'Nginx',
    category: 'Security Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: true,
    tags: ['Server', 'Web Server'],
    referenceUrl: 'https://nginx.org/en/CHANGES',
    bulletinPrefix: 'NGINX-LNX',
    versions: [
      { version: '1.24.0', publishedAt: '2023-04-11', cves: [], description: 'Nginx 1.24.0 stable - latest stable branch release' },
      { version: '1.22.1', publishedAt: '2022-10-19', cves: ['CVE-2022-41741', 'CVE-2022-41742'], description: 'Nginx 1.22.1 - mp4 module buffer overread fixes' },
      { version: '1.22.0', publishedAt: '2022-05-24', cves: [], description: 'Nginx 1.22.0 stable - initial stable release' },
    ],
  },

  // ── OpenSSL (Hub bundle exists) ─────────────────────────
  {
    name: 'OpenSSL',
    vendor: 'OpenSSL',
    product: 'OpenSSL',
    category: 'Critical Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: true,
    supportUninstallation: false,
    tags: ['Security', 'Library', 'TLS'],
    referenceUrl: 'https://www.openssl.org/news/vulnerabilities.html',
    bulletinPrefix: 'OPENSSL-LNX',
    versions: [
      { version: '3.0.15', publishedAt: '2024-09-03', cves: ['CVE-2024-6119'], description: 'OpenSSL 3.0.15 - possible denial of service in X.509 name checks' },
      { version: '3.0.14', publishedAt: '2024-06-04', cves: ['CVE-2024-4741', 'CVE-2024-4603'], description: 'OpenSSL 3.0.14 - use-after-free and excessive DSA key checks' },
      { version: '3.0.13', publishedAt: '2024-01-30', cves: ['CVE-2024-0727', 'CVE-2023-6237'], description: 'OpenSSL 3.0.13 - NULL dereference in PKCS12 parsing' },
    ],
  },

  // ── curl (Hub bundle exists) ────────────────────────────
  {
    name: 'curl',
    vendor: 'curl',
    product: 'curl',
    category: 'Security Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: false,
    tags: ['Utility', 'Library', 'Networking'],
    referenceUrl: 'https://curl.se/docs/security.html',
    bulletinPrefix: 'CURL-LNX',
    versions: [
      { version: '8.11.1', publishedAt: '2024-12-04', cves: ['CVE-2024-11053'], description: 'curl 8.11.1 - netrc password leak to wrong server' },
      { version: '8.10.1', publishedAt: '2024-09-18', cves: ['CVE-2024-8096'], description: 'curl 8.10.1 - OCSP stapling bypass with GnuTLS' },
      { version: '8.9.1', publishedAt: '2024-07-31', cves: ['CVE-2024-7264'], description: 'curl 8.9.1 - ASN.1 date parser overread' },
    ],
  },

  // ── sudo (Hub bundle exists) ────────────────────────────
  {
    name: 'sudo',
    vendor: 'sudo',
    product: 'sudo',
    category: 'Critical Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: false,
    supportUninstallation: false,
    tags: ['Security', 'System'],
    referenceUrl: 'https://www.sudo.ws/releases/',
    bulletinPrefix: 'SUDO-LNX',
    versions: [
      { version: '1.9.16p2', publishedAt: '2024-11-04', cves: ['CVE-2024-10573'], description: 'sudo 1.9.16p2 - environment variable handling fix' },
      { version: '1.9.15p5', publishedAt: '2024-06-01', cves: ['CVE-2024-31969'], description: 'sudo 1.9.15p5 - privilege escalation fix' },
      { version: '1.9.15p2', publishedAt: '2024-01-29', cves: [], description: 'sudo 1.9.15p2 - bug fix release' },
    ],
  },

  // ── Linux Kernel (Hub bundle exists) ────────────────────
  {
    name: 'Linux Kernel',
    vendor: 'Linux',
    product: 'Kernel',
    category: 'Critical Updates',
    os: 'LINUX',
    platform: 'LINUX',
    architecture: '64 BIT',
    rebootRequired: true,
    supportUninstallation: false,
    tags: ['OS', 'Kernel'],
    referenceUrl: 'https://www.kernel.org/',
    bulletinPrefix: 'KERNEL-LNX',
    versions: [
      { version: '6.8.0-50', publishedAt: '2024-11-19', cves: ['CVE-2024-50264', 'CVE-2024-50265'], description: 'Linux Kernel 6.8.0-50 - USB and netfilter security fixes' },
      { version: '6.8.0-48', publishedAt: '2024-10-22', cves: ['CVE-2024-47176', 'CVE-2024-47177'], description: 'Linux Kernel 6.8.0-48 - CUPS and eBPF fixes' },
      { version: '6.8.0-45', publishedAt: '2024-09-12', cves: ['CVE-2024-36971'], description: 'Linux Kernel 6.8.0-45 - net route use-after-free fix' },
    ],
  },
];

// ─── main seed logic ───────────────────────────────────────────────────

async function main() {
  console.log('Seeding patches from downloaded software inventory...\n');

  let counter = 0;
  let created = 0;

  for (const sw of SOFTWARE) {
    for (let vi = 0; vi < sw.versions.length; vi++) {
      counter++;
      const v = sw.versions[vi];
      const isLatest = vi === 0;
      const isNMinus1 = vi === 1;
      // vi >= 2 → old/superseded

      const pid = patchId(sw.bulletinPrefix, counter);

      // Determine supersession relationships
      const supersedes = vi < sw.versions.length - 1
        ? [patchId(sw.bulletinPrefix, counter + 1)]
        : [];
      const supersededBy = vi > 0
        ? [patchId(sw.bulletinPrefix, counter - 1)]
        : [];

      const severity = v.cves && v.cves.length > 0
        ? (v.cves.length >= 3 ? 'CRITICAL' : v.cves.length >= 2 ? 'High' : 'Medium')
        : 'Low';

      const data: PatchSeed = {
        patchId: pid,
        title: `${sw.name} ${v.version}`,
        software: `${sw.name} ${v.version}`,
        description: v.description || `${sw.name} version ${v.version} update`,
        severity,
        category: sw.category,
        vendor: sw.vendor,
        product: sw.product,
        os: sw.os,
        platform: sw.platform,
        architecture: sw.architecture,
        kbNumber: pid,
        bulletinId: `${sw.bulletinPrefix}-${v.version.replace(/[^a-zA-Z0-9]/g, '-')}`,
        publishedAt: new Date(v.publishedAt),
        referenceUrl: sw.referenceUrl,
        downloadUrl: '',  // MinIO URLs are generated dynamically
        rebootRequired: sw.rebootRequired,
        supportUninstallation: sw.supportUninstallation,
        languagesSupported: ['English'],
        tags: sw.tags,
        cveNumbers: v.cves || [],
        status: isLatest ? 'Published' : (isNMinus1 ? 'Published' : 'Superseded'),
        downloadStatus: 'Downloaded',
        supersedes,
        supersededBy,
        testStatus: isLatest ? 'NOT_TESTED' : 'TESTED',
        approvalStatus: isLatest ? 'PENDING' : 'APPROVED',
        endpoints: Math.floor(Math.random() * 40) + 5,
      };

      try {
        await prisma.patch.create({ data: {
          patchId: data.patchId,
          title: data.title,
          software: data.software,
          description: data.description,
          severity: data.severity,
          category: data.category,
          vendor: data.vendor,
          product: data.product,
          os: data.os,
          platform: data.platform,
          architecture: data.architecture,
          kbNumber: data.kbNumber,
          bulletinId: data.bulletinId,
          publishedAt: data.publishedAt,
          referenceUrl: data.referenceUrl,
          downloadUrl: data.downloadUrl,
          rebootRequired: data.rebootRequired,
          supportUninstallation: data.supportUninstallation,
          languagesSupported: data.languagesSupported,
          tags: data.tags,
          cveNumbers: data.cveNumbers,
          status: data.status,
          downloadStatus: data.downloadStatus,
          supersedes: data.supersedes,
          supersededBy: data.supersededBy,
          testStatus: data.testStatus,
          approvalStatus: data.approvalStatus,
          endpoints: data.endpoints,
          operationalStatusSince: data.publishedAt,
        }});
        created++;
        const tag = isLatest ? '[LATEST]' : (isNMinus1 ? '[N-1]   ' : '[N-2]   ');
        console.log(`  ${tag} ${data.software.padEnd(40)} ${data.os.padEnd(8)} ${data.severity.padEnd(10)} ${(data.cveNumbers.length ? data.cveNumbers.join(', ') : '-')}`);
      } catch (err) {
        const prismaErr = err as { code?: string; message?: string };
        if (prismaErr.code === 'P2002') {
          console.log(`  [SKIP]  ${pid} already exists`);
        } else {
          console.error(`  [ERROR] ${pid}: ${prismaErr.message}`);
        }
      }
    }
  }

  console.log(`\nDone. Created ${created} patch records from ${SOFTWARE.length} software entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
