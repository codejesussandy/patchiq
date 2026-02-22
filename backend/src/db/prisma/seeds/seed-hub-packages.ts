/**
 * seed-hub-packages.ts — Create SoftwarePackage records for the Software Hub
 *
 * Creates metadata-only records so packages appear in the Hub UI.
 * Files can be uploaded to MinIO later via the Hub upload feature.
 *
 * Can be run standalone:
 *   cd backend && npx tsx src/db/prisma/seeds/seed-hub-packages.ts
 *
 * Also called from the main seed.ts.
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface PackageDef {
  name: string;
  displayName: string;
  version: string;
  vendor: string;
  category: string;
  platform: string;
  architecture: string;
  installSource: string;
  minioKey: string;
  fileName: string;
  downloadUrl: string;
  description: string;
  tags: string[];
  silentInstall: boolean;
  installCommand?: string;
  installArgs?: string;
  fileSize?: bigint;
}

const BUCKET = 'patches';

const PACKAGES: PackageDef[] = [
  // ── 7-Zip (Windows) ──
  {
    name: '7-zip', displayName: '7-Zip', version: '24.09', vendor: '7-Zip', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/7-zip/7-zip/24.09/7z2409-x64.exe', fileName: '7z2409-x64.exe',
    downloadUrl: 'https://www.7-zip.org/a/7z2409-x64.exe',
    description: 'Free and open-source file archiver with high compression ratio',
    tags: ['archiver', 'compression', 'utility'], silentInstall: true,
    installCommand: '7z2409-x64.exe', installArgs: '/S',
    fileSize: BigInt(1572864),

  },
  {
    name: '7-zip', displayName: '7-Zip', version: '24.08', vendor: '7-Zip', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/7-zip/7-zip/24.08/7z2408-x64.exe', fileName: '7z2408-x64.exe',
    downloadUrl: 'https://www.7-zip.org/a/7z2408-x64.exe',
    description: 'Free and open-source file archiver with high compression ratio',
    tags: ['archiver', 'compression', 'utility'], silentInstall: true,
    installCommand: '7z2408-x64.exe', installArgs: '/S',
    fileSize: BigInt(1560000),

  },
  {
    name: '7-zip', displayName: '7-Zip', version: '24.07', vendor: '7-Zip', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/7-zip/7-zip/24.07/7z2407-x64.exe', fileName: '7z2407-x64.exe',
    downloadUrl: 'https://www.7-zip.org/a/7z2407-x64.exe',
    description: 'Free and open-source file archiver with high compression ratio',
    tags: ['archiver', 'compression', 'utility'], silentInstall: true,
    installCommand: '7z2407-x64.exe', installArgs: '/S',
    fileSize: BigInt(1548000),

  },

  // ── Notepad++ (Windows) ──
  {
    name: 'notepad-plus-plus', displayName: 'Notepad++', version: '8.7.1', vendor: 'Notepad++', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/notepad-/notepad-/8.7.1/npp.8.7.1.Installer.x64.exe', fileName: 'npp.8.7.1.Installer.x64.exe',
    downloadUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7.1/npp.8.7.1.Installer.x64.exe',
    description: 'Free source code editor and Notepad replacement for Windows',
    tags: ['editor', 'text-editor', 'developer-tools'], silentInstall: true,
    installCommand: 'npp.8.7.1.Installer.x64.exe', installArgs: '/S',
    fileSize: BigInt(4800000),

  },
  {
    name: 'notepad-plus-plus', displayName: 'Notepad++', version: '8.7', vendor: 'Notepad++', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/notepad-/notepad-/8.7/npp.8.7.Installer.x64.exe', fileName: 'npp.8.7.Installer.x64.exe',
    downloadUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7/npp.8.7.Installer.x64.exe',
    description: 'Free source code editor and Notepad replacement for Windows',
    tags: ['editor', 'text-editor', 'developer-tools'], silentInstall: true,
    installCommand: 'npp.8.7.Installer.x64.exe', installArgs: '/S',
    fileSize: BigInt(4750000),

  },
  {
    name: 'notepad-plus-plus', displayName: 'Notepad++', version: '8.6.9', vendor: 'Notepad++', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/notepad-/notepad-/8.6.9/npp.8.6.9.Installer.x64.exe', fileName: 'npp.8.6.9.Installer.x64.exe',
    downloadUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.6.9/npp.8.6.9.Installer.x64.exe',
    description: 'Free source code editor and Notepad replacement for Windows',
    tags: ['editor', 'text-editor', 'developer-tools'], silentInstall: true,
    installCommand: 'npp.8.6.9.Installer.x64.exe', installArgs: '/S',
    fileSize: BigInt(4700000),

  },

  // ── VLC (Windows) ──
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.21', vendor: 'VideoLAN', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/videolan/vlc/3.0.21/vlc-3.0.21-win64.exe', fileName: 'vlc-3.0.21-win64.exe',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.21/win64/vlc-3.0.21-win64.exe',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: true,
    installCommand: 'vlc-3.0.21-win64.exe', installArgs: '/S',
    fileSize: BigInt(42000000),

  },
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.20', vendor: 'VideoLAN', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/videolan/vlc/3.0.20/vlc-3.0.20-win64.exe', fileName: 'vlc-3.0.20-win64.exe',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.20/win64/vlc-3.0.20-win64.exe',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: true,
    installCommand: 'vlc-3.0.20-win64.exe', installArgs: '/S',
    fileSize: BigInt(41500000),

  },
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.19', vendor: 'VideoLAN', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/videolan/vlc/3.0.19/vlc-3.0.19-win64.exe', fileName: 'vlc-3.0.19-win64.exe',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.19/win64/vlc-3.0.19-win64.exe',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: true,
    installCommand: 'vlc-3.0.19-win64.exe', installArgs: '/S',
    fileSize: BigInt(41000000),

  },

  // ── VLC (macOS) ──
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.21', vendor: 'VideoLAN', category: 'utility',
    platform: 'macos', architecture: 'universal', installSource: 'dmg',
    minioKey: 'macos/videolan/vlc/3.0.21/vlc-3.0.21-universal.dmg', fileName: 'vlc-3.0.21-universal.dmg',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.21/macosx/vlc-3.0.21-universal.dmg',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: false,
    fileSize: BigInt(55000000),

  },
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.20', vendor: 'VideoLAN', category: 'utility',
    platform: 'macos', architecture: 'universal', installSource: 'dmg',
    minioKey: 'macos/videolan/vlc/3.0.20/vlc-3.0.20-universal.dmg', fileName: 'vlc-3.0.20-universal.dmg',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.20/macosx/vlc-3.0.20-universal.dmg',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: false,
    fileSize: BigInt(54500000),

  },
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.19', vendor: 'VideoLAN', category: 'utility',
    platform: 'macos', architecture: 'universal', installSource: 'dmg',
    minioKey: 'macos/videolan/vlc/3.0.19/vlc-3.0.19-universal.dmg', fileName: 'vlc-3.0.19-universal.dmg',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.19/macosx/vlc-3.0.19-universal.dmg',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: false,
    fileSize: BigInt(54000000),

  },

  // ── Node.js (Windows) ──
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.12.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'windows', architecture: 'x64', installSource: 'msi',
    minioKey: 'windows/nodejs/nodejs/22.12.0/node-v22.12.0-x64.msi', fileName: 'node-v22.12.0-x64.msi',
    downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    installCommand: 'msiexec', installArgs: '/i node-v22.12.0-x64.msi /quiet /norestart',
    fileSize: BigInt(30000000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.11.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'windows', architecture: 'x64', installSource: 'msi',
    minioKey: 'windows/nodejs/nodejs/22.11.0/node-v22.11.0-x64.msi', fileName: 'node-v22.11.0-x64.msi',
    downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    installCommand: 'msiexec', installArgs: '/i node-v22.11.0-x64.msi /quiet /norestart',
    fileSize: BigInt(29500000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '20.18.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'windows', architecture: 'x64', installSource: 'msi',
    minioKey: 'windows/nodejs/nodejs/20.18.0/node-v20.18.0-x64.msi', fileName: 'node-v20.18.0-x64.msi',
    downloadUrl: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    installCommand: 'msiexec', installArgs: '/i node-v20.18.0-x64.msi /quiet /norestart',
    fileSize: BigInt(28000000),

  },

  // ── Node.js (macOS) ──
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.12.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'macos', architecture: 'x64', installSource: 'pkg',
    minioKey: 'macos/nodejs/nodejs/22.12.0/node-v22.12.0.pkg', fileName: 'node-v22.12.0.pkg',
    downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0.pkg',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(32000000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.11.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'macos', architecture: 'x64', installSource: 'pkg',
    minioKey: 'macos/nodejs/nodejs/22.11.0/node-v22.11.0.pkg', fileName: 'node-v22.11.0.pkg',
    downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0.pkg',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(31500000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '20.18.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'macos', architecture: 'x64', installSource: 'pkg',
    minioKey: 'macos/nodejs/nodejs/20.18.0/node-v20.18.0.pkg', fileName: 'node-v20.18.0.pkg',
    downloadUrl: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0.pkg',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(30000000),

  },

  // ── Node.js (Linux) ──
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.12.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'linux', architecture: 'x64', installSource: 'url',
    minioKey: 'linux/nodejs/nodejs/22.12.0/node-v22.12.0-linux-x64.tar.xz', fileName: 'node-v22.12.0-linux-x64.tar.xz',
    downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(25000000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.11.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'linux', architecture: 'x64', installSource: 'url',
    minioKey: 'linux/nodejs/nodejs/22.11.0/node-v22.11.0-linux-x64.tar.xz', fileName: 'node-v22.11.0-linux-x64.tar.xz',
    downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(24500000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '20.18.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'linux', architecture: 'x64', installSource: 'url',
    minioKey: 'linux/nodejs/nodejs/20.18.0/node-v20.18.0-linux-x64.tar.xz', fileName: 'node-v20.18.0-linux-x64.tar.xz',
    downloadUrl: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(23000000),

  },

  // ── Git for Windows ──
  {
    name: 'git', displayName: 'Git for Windows', version: '2.47.1', vendor: 'Git', category: 'developer-tools',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/git/git/2.47.1/Git-2.47.1-64-bit.exe', fileName: 'Git-2.47.1-64-bit.exe',
    downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe',
    description: 'Distributed version control system for Windows',
    tags: ['vcs', 'git', 'developer-tools'], silentInstall: true,
    installCommand: 'Git-2.47.1-64-bit.exe', installArgs: '/VERYSILENT /NORESTART',
    fileSize: BigInt(65000000),

  },
  {
    name: 'git', displayName: 'Git for Windows', version: '2.47.0', vendor: 'Git', category: 'developer-tools',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/git/git/2.47.0/Git-2.47.0-64-bit.exe', fileName: 'Git-2.47.0-64-bit.exe',
    downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.47.0.windows.1/Git-2.47.0-64-bit.exe',
    description: 'Distributed version control system for Windows',
    tags: ['vcs', 'git', 'developer-tools'], silentInstall: true,
    installCommand: 'Git-2.47.0-64-bit.exe', installArgs: '/VERYSILENT /NORESTART',
    fileSize: BigInt(64500000),

  },
  {
    name: 'git', displayName: 'Git for Windows', version: '2.46.2', vendor: 'Git', category: 'developer-tools',
    platform: 'windows', architecture: 'x64', installSource: 'exe',
    minioKey: 'windows/git/git/2.46.2/Git-2.46.2-64-bit.exe', fileName: 'Git-2.46.2-64-bit.exe',
    downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.46.2.windows.1/Git-2.46.2-64-bit.exe',
    description: 'Distributed version control system for Windows',
    tags: ['vcs', 'git', 'developer-tools'], silentInstall: true,
    installCommand: 'Git-2.46.2-64-bit.exe', installArgs: '/VERYSILENT /NORESTART',
    fileSize: BigInt(64000000),

  },
];

export async function seedHubPackages(prismaClient?: PrismaClient): Promise<number> {
  const prisma = prismaClient || new PrismaClient();
  const shouldDisconnect = !prismaClient;

  console.log('\n=== Hub Package Seeder ===');
  console.log(`Packages to seed: ${PACKAGES.length}`);

  // Clear existing hub packages first
  const existing = await prisma.softwarePackage.count();
  if (existing > 0) {
    console.log(`Clearing ${existing} existing SoftwarePackage records...`);
    await prisma.hubBundleItem.deleteMany({});
    await prisma.hubBundle.deleteMany({});
    await prisma.softwarePackage.deleteMany({});
    console.log('Cleared.');
  }

  let created = 0;

  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    const idx = `[${i + 1}/${PACKAGES.length}]`;
    const packageId = `SWP-${uuidv4().slice(0, 8).toUpperCase()}`;

    await prisma.softwarePackage.create({
      data: {
        packageId,
        name: pkg.name,
        displayName: pkg.displayName,
        version: pkg.version,
        vendor: pkg.vendor,
        category: pkg.category,
        platform: pkg.platform,
        architecture: pkg.architecture,
        installSource: pkg.installSource,
        installCommand: pkg.installCommand || null,
        installArgs: pkg.installArgs || null,
        silentInstall: pkg.silentInstall,
        requiresReboot: false,
        downloadUrl: pkg.downloadUrl,
        description: pkg.description,
        tags: pkg.tags,
        // minioObjectKey is set only when files are actually uploaded to MinIO
        minioObjectKey: null,
        minioBucket: BUCKET,
        fileName: pkg.fileName,
        fileSize: pkg.fileSize || BigInt(0),
        isActive: true,
        isVerified: true,
      },
    });

    const sizeMB = (Number(pkg.fileSize || 0) / 1024 / 1024).toFixed(1);
    console.log(`${idx} [OK] ${pkg.displayName} ${pkg.version} (${pkg.platform}) — ${sizeMB} MB — ${packageId}`);
    created++;
  }

  console.log(`\n=== Hub Summary: Created ${created}/${PACKAGES.length} packages ===`);

  if (shouldDisconnect) {
    await prisma.$disconnect();
  }

  return created;
}

// Allow standalone execution
if (require.main === module) {
  seedHubPackages().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
