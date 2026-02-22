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
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/7-zip/7-zip/24.09/7z2409-x64.exe', fileName: '7z2409-x64.exe',
    downloadUrl: 'https://www.7-zip.org/a/7z2409-x64.exe',
    description: 'Free and open-source file archiver with high compression ratio',
    tags: ['archiver', 'compression', 'utility'], silentInstall: true,
    installCommand: '7z2409-x64.exe', installArgs: '/S',
    fileSize: BigInt(1572864),

  },
  {
    name: '7-zip', displayName: '7-Zip', version: '24.08', vendor: '7-Zip', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/7-zip/7-zip/24.08/7z2408-x64.exe', fileName: '7z2408-x64.exe',
    downloadUrl: 'https://www.7-zip.org/a/7z2408-x64.exe',
    description: 'Free and open-source file archiver with high compression ratio',
    tags: ['archiver', 'compression', 'utility'], silentInstall: true,
    installCommand: '7z2408-x64.exe', installArgs: '/S',
    fileSize: BigInt(1560000),

  },
  {
    name: '7-zip', displayName: '7-Zip', version: '24.07', vendor: '7-Zip', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
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
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/notepad-/notepad-/8.7.1/npp.8.7.1.Installer.x64.exe', fileName: 'npp.8.7.1.Installer.x64.exe',
    downloadUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7.1/npp.8.7.1.Installer.x64.exe',
    description: 'Free source code editor and Notepad replacement for Windows',
    tags: ['editor', 'text-editor', 'developer-tools'], silentInstall: true,
    installCommand: 'npp.8.7.1.Installer.x64.exe', installArgs: '/S',
    fileSize: BigInt(4800000),

  },
  {
    name: 'notepad-plus-plus', displayName: 'Notepad++', version: '8.7', vendor: 'Notepad++', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/notepad-/notepad-/8.7/npp.8.7.Installer.x64.exe', fileName: 'npp.8.7.Installer.x64.exe',
    downloadUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7/npp.8.7.Installer.x64.exe',
    description: 'Free source code editor and Notepad replacement for Windows',
    tags: ['editor', 'text-editor', 'developer-tools'], silentInstall: true,
    installCommand: 'npp.8.7.Installer.x64.exe', installArgs: '/S',
    fileSize: BigInt(4750000),

  },
  {
    name: 'notepad-plus-plus', displayName: 'Notepad++', version: '8.6.9', vendor: 'Notepad++', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
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
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/videolan/vlc/3.0.21/vlc-3.0.21-win64.exe', fileName: 'vlc-3.0.21-win64.exe',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.21/win64/vlc-3.0.21-win64.exe',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: true,
    installCommand: 'vlc-3.0.21-win64.exe', installArgs: '/S',
    fileSize: BigInt(42000000),

  },
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.20', vendor: 'VideoLAN', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/videolan/vlc/3.0.20/vlc-3.0.20-win64.exe', fileName: 'vlc-3.0.20-win64.exe',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.20/win64/vlc-3.0.20-win64.exe',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: true,
    installCommand: 'vlc-3.0.20-win64.exe', installArgs: '/S',
    fileSize: BigInt(41500000),

  },
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.19', vendor: 'VideoLAN', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
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
    platform: 'macos', architecture: 'universal', installSource: 'bundle',
    minioKey: 'macos/videolan/vlc/3.0.21/vlc-3.0.21-universal.dmg', fileName: 'vlc-3.0.21-universal.dmg',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.21/macosx/vlc-3.0.21-universal.dmg',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: false,
    fileSize: BigInt(55000000),

  },
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.20', vendor: 'VideoLAN', category: 'utility',
    platform: 'macos', architecture: 'universal', installSource: 'bundle',
    minioKey: 'macos/videolan/vlc/3.0.20/vlc-3.0.20-universal.dmg', fileName: 'vlc-3.0.20-universal.dmg',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.20/macosx/vlc-3.0.20-universal.dmg',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: false,
    fileSize: BigInt(54500000),

  },
  {
    name: 'vlc', displayName: 'VLC Media Player', version: '3.0.19', vendor: 'VideoLAN', category: 'utility',
    platform: 'macos', architecture: 'universal', installSource: 'bundle',
    minioKey: 'macos/videolan/vlc/3.0.19/vlc-3.0.19-universal.dmg', fileName: 'vlc-3.0.19-universal.dmg',
    downloadUrl: 'https://get.videolan.org/vlc/3.0.19/macosx/vlc-3.0.19-universal.dmg',
    description: 'Free and open-source cross-platform multimedia player',
    tags: ['media', 'video', 'audio', 'player'], silentInstall: false,
    fileSize: BigInt(54000000),

  },

  // ── Node.js (Windows) ──
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.12.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/nodejs/nodejs/22.12.0/node-v22.12.0-x64.msi', fileName: 'node-v22.12.0-x64.msi',
    downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    installCommand: 'msiexec', installArgs: '/i node-v22.12.0-x64.msi /quiet /norestart',
    fileSize: BigInt(30000000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.11.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/nodejs/nodejs/22.11.0/node-v22.11.0-x64.msi', fileName: 'node-v22.11.0-x64.msi',
    downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    installCommand: 'msiexec', installArgs: '/i node-v22.11.0-x64.msi /quiet /norestart',
    fileSize: BigInt(29500000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '20.18.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
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
    platform: 'macos', architecture: 'x64', installSource: 'bundle',
    minioKey: 'macos/nodejs/nodejs/22.12.0/node-v22.12.0.pkg', fileName: 'node-v22.12.0.pkg',
    downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0.pkg',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(32000000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.11.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'macos', architecture: 'x64', installSource: 'bundle',
    minioKey: 'macos/nodejs/nodejs/22.11.0/node-v22.11.0.pkg', fileName: 'node-v22.11.0.pkg',
    downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0.pkg',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(31500000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '20.18.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'macos', architecture: 'x64', installSource: 'bundle',
    minioKey: 'macos/nodejs/nodejs/20.18.0/node-v20.18.0.pkg', fileName: 'node-v20.18.0.pkg',
    downloadUrl: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0.pkg',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(30000000),

  },

  // ── Node.js (Linux) ──
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.12.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'linux', architecture: 'x64', installSource: 'bundle',
    minioKey: 'linux/nodejs/nodejs/22.12.0/node-v22.12.0-linux-x64.tar.xz', fileName: 'node-v22.12.0-linux-x64.tar.xz',
    downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(25000000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '22.11.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'linux', architecture: 'x64', installSource: 'bundle',
    minioKey: 'linux/nodejs/nodejs/22.11.0/node-v22.11.0-linux-x64.tar.xz', fileName: 'node-v22.11.0-linux-x64.tar.xz',
    downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(24500000),

  },
  {
    name: 'nodejs', displayName: 'Node.js', version: '20.18.0', vendor: 'OpenJS Foundation', category: 'runtime',
    platform: 'linux', architecture: 'x64', installSource: 'bundle',
    minioKey: 'linux/nodejs/nodejs/20.18.0/node-v20.18.0-linux-x64.tar.xz', fileName: 'node-v20.18.0-linux-x64.tar.xz',
    downloadUrl: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz',
    description: 'JavaScript runtime built on Chrome\'s V8 engine',
    tags: ['runtime', 'javascript', 'developer-tools', 'nodejs'], silentInstall: true,
    fileSize: BigInt(23000000),

  },

  // ── Git for Windows ──
  {
    name: 'git', displayName: 'Git for Windows', version: '2.47.1', vendor: 'Git', category: 'developer-tools',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/git/git/2.47.1/Git-2.47.1-64-bit.exe', fileName: 'Git-2.47.1-64-bit.exe',
    downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe',
    description: 'Distributed version control system for Windows',
    tags: ['vcs', 'git', 'developer-tools'], silentInstall: true,
    installCommand: 'Git-2.47.1-64-bit.exe', installArgs: '/VERYSILENT /NORESTART',
    fileSize: BigInt(65000000),

  },
  {
    name: 'git', displayName: 'Git for Windows', version: '2.47.0', vendor: 'Git', category: 'developer-tools',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/git/git/2.47.0/Git-2.47.0-64-bit.exe', fileName: 'Git-2.47.0-64-bit.exe',
    downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.47.0.windows.1/Git-2.47.0-64-bit.exe',
    description: 'Distributed version control system for Windows',
    tags: ['vcs', 'git', 'developer-tools'], silentInstall: true,
    installCommand: 'Git-2.47.0-64-bit.exe', installArgs: '/VERYSILENT /NORESTART',
    fileSize: BigInt(64500000),

  },
  {
    name: 'git', displayName: 'Git for Windows', version: '2.46.2', vendor: 'Git', category: 'developer-tools',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/git/git/2.46.2/Git-2.46.2-64-bit.exe', fileName: 'Git-2.46.2-64-bit.exe',
    downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.46.2.windows.1/Git-2.46.2-64-bit.exe',
    description: 'Distributed version control system for Windows',
    tags: ['vcs', 'git', 'developer-tools'], silentInstall: true,
    installCommand: 'Git-2.46.2-64-bit.exe', installArgs: '/VERYSILENT /NORESTART',
    fileSize: BigInt(64000000),

  },

  // ── Mozilla Firefox (Windows) ──
  {
    name: 'firefox', displayName: 'Mozilla Firefox', version: '134.0', vendor: 'Mozilla', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/mozilla/firefox/134.0/Firefox Setup 134.0.exe', fileName: 'Firefox Setup 134.0.exe',
    downloadUrl: 'https://ftp.mozilla.org/pub/firefox/releases/134.0/win64/en-US/Firefox%20Setup%20134.0.exe',
    description: 'Free and open-source web browser by Mozilla',
    tags: ['browser', 'web', 'utility'], silentInstall: true,
    installCommand: 'Firefox Setup 134.0.exe', installArgs: '/S',
    fileSize: BigInt(63000000),

  },
  {
    name: 'firefox', displayName: 'Mozilla Firefox', version: '133.0', vendor: 'Mozilla', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/mozilla/firefox/133.0/Firefox Setup 133.0.exe', fileName: 'Firefox Setup 133.0.exe',
    downloadUrl: 'https://ftp.mozilla.org/pub/firefox/releases/133.0/win64/en-US/Firefox%20Setup%20133.0.exe',
    description: 'Free and open-source web browser by Mozilla',
    tags: ['browser', 'web', 'utility'], silentInstall: true,
    installCommand: 'Firefox Setup 133.0.exe', installArgs: '/S',
    fileSize: BigInt(62500000),

  },
  {
    name: 'firefox', displayName: 'Mozilla Firefox', version: '132.0', vendor: 'Mozilla', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/mozilla/firefox/132.0/Firefox Setup 132.0.exe', fileName: 'Firefox Setup 132.0.exe',
    downloadUrl: 'https://ftp.mozilla.org/pub/firefox/releases/132.0/win64/en-US/Firefox%20Setup%20132.0.exe',
    description: 'Free and open-source web browser by Mozilla',
    tags: ['browser', 'web', 'utility'], silentInstall: true,
    installCommand: 'Firefox Setup 132.0.exe', installArgs: '/S',
    fileSize: BigInt(62000000),

  },

  // ── Google Chrome (Windows) ──
  {
    name: 'google-chrome', displayName: 'Google Chrome', version: '131.0.6778.86', vendor: 'Google', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/google/google-chrome/131.0.6778.86/googlechromestandaloneenterprise64.msi', fileName: 'googlechromestandaloneenterprise64.msi',
    downloadUrl: 'https://dl.google.com/dl/chrome/install/googlechromestandaloneenterprise64.msi',
    description: 'Fast, secure web browser by Google',
    tags: ['browser', 'web', 'utility'], silentInstall: true,
    installCommand: 'msiexec', installArgs: '/i googlechromestandaloneenterprise64.msi /quiet /norestart',
    fileSize: BigInt(100000000),

  },

  // ── PuTTY (Windows) ──
  {
    name: 'putty', displayName: 'PuTTY', version: '0.82', vendor: 'Simon Tatham', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/simon-tatham/putty/0.82/putty-64bit-0.82-installer.msi', fileName: 'putty-64bit-0.82-installer.msi',
    downloadUrl: 'https://the.earth.li/~sgtatham/putty/0.82/w64/putty-64bit-0.82-installer.msi',
    description: 'Free SSH and telnet client for Windows',
    tags: ['ssh', 'telnet', 'networking', 'utility'], silentInstall: true,
    installCommand: 'msiexec', installArgs: '/i putty-64bit-0.82-installer.msi /quiet /norestart',
    fileSize: BigInt(4200000),

  },

  // ── WinSCP (Windows) ──
  {
    name: 'winscp', displayName: 'WinSCP', version: '6.3.6', vendor: 'Martin Prikryl', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/martin-prikryl/winscp/6.3.6/WinSCP-6.3.6-Setup.exe', fileName: 'WinSCP-6.3.6-Setup.exe',
    downloadUrl: 'https://winscp.net/download/WinSCP-6.3.6-Setup.exe',
    description: 'Free SFTP, SCP, S3 and FTP client for Windows',
    tags: ['sftp', 'scp', 'ftp', 'file-transfer', 'utility'], silentInstall: true,
    installCommand: 'WinSCP-6.3.6-Setup.exe', installArgs: '/VERYSILENT /NORESTART',
    fileSize: BigInt(12000000),

  },

  // ── FileZilla (Windows) ──
  {
    name: 'filezilla', displayName: 'FileZilla', version: '3.68.1', vendor: 'FileZilla Project', category: 'utility',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/filezilla/filezilla/3.68.1/FileZilla_3.68.1_win64-setup.exe', fileName: 'FileZilla_3.68.1_win64-setup.exe',
    downloadUrl: 'https://download.filezilla-project.org/client/FileZilla_3.68.1_win64-setup.exe',
    description: 'Free cross-platform FTP, FTPS and SFTP client',
    tags: ['ftp', 'sftp', 'file-transfer', 'utility'], silentInstall: true,
    installCommand: 'FileZilla_3.68.1_win64-setup.exe', installArgs: '/S',
    fileSize: BigInt(12500000),

  },

  // ── KeePass (Windows) ──
  {
    name: 'keepass', displayName: 'KeePass', version: '2.57.1', vendor: 'Dominik Reichl', category: 'security',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/dominik-reichl/keepass/2.57.1/KeePass-2.57.1.msi', fileName: 'KeePass-2.57.1.msi',
    downloadUrl: 'https://sourceforge.net/projects/keepass/files/KeePass%202.x/2.57.1/KeePass-2.57.1.msi/download',
    description: 'Free, open-source, lightweight password manager',
    tags: ['password-manager', 'security', 'encryption'], silentInstall: true,
    installCommand: 'msiexec', installArgs: '/i KeePass-2.57.1.msi /quiet /norestart',
    fileSize: BigInt(4000000),

  },

  // ── Python (Windows) ──
  {
    name: 'python', displayName: 'Python', version: '3.12.8', vendor: 'Python Software Foundation', category: 'runtime',
    platform: 'windows', architecture: 'x64', installSource: 'bundle',
    minioKey: 'windows/python/python/3.12.8/python-3.12.8-amd64.exe', fileName: 'python-3.12.8-amd64.exe',
    downloadUrl: 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe',
    description: 'Popular high-level programming language',
    tags: ['runtime', 'python', 'developer-tools', 'programming-language'], silentInstall: true,
    installCommand: 'python-3.12.8-amd64.exe', installArgs: '/quiet InstallAllUsers=1 PrependPath=1',
    fileSize: BigInt(25000000),

  },

  // ── Mozilla Firefox (macOS) ──
  {
    name: 'firefox', displayName: 'Mozilla Firefox', version: '134.0', vendor: 'Mozilla', category: 'utility',
    platform: 'macos', architecture: 'x64', installSource: 'bundle',
    minioKey: 'macos/mozilla/firefox/134.0/Firefox 134.0.dmg', fileName: 'Firefox 134.0.dmg',
    downloadUrl: 'https://ftp.mozilla.org/pub/firefox/releases/134.0/mac/en-US/Firefox%20134.0.dmg',
    description: 'Free and open-source web browser by Mozilla',
    tags: ['browser', 'web', 'utility'], silentInstall: false,
    fileSize: BigInt(135000000),

  },

  // ── GIMP (macOS) ──
  {
    name: 'gimp', displayName: 'GIMP', version: '2.10.38', vendor: 'GIMP Team', category: 'utility',
    platform: 'macos', architecture: 'x64', installSource: 'bundle',
    minioKey: 'macos/gimp-team/gimp/2.10.38/gimp-2.10.38-x86_64.dmg', fileName: 'gimp-2.10.38-x86_64.dmg',
    downloadUrl: 'https://download.gimp.org/gimp/v2.10/osx/gimp-2.10.38-x86_64.dmg',
    description: 'Free and open-source raster graphics editor',
    tags: ['graphics', 'image-editor', 'design', 'utility'], silentInstall: false,
    fileSize: BigInt(250000000),

  },

  // ── Go (Linux) ──
  {
    name: 'golang', displayName: 'Go', version: '1.23.4', vendor: 'Google', category: 'runtime',
    platform: 'linux', architecture: 'x64', installSource: 'bundle',
    minioKey: 'linux/google/golang/1.23.4/go1.23.4.linux-amd64.tar.gz', fileName: 'go1.23.4.linux-amd64.tar.gz',
    downloadUrl: 'https://go.dev/dl/go1.23.4.linux-amd64.tar.gz',
    description: 'Open-source programming language by Google',
    tags: ['runtime', 'golang', 'developer-tools', 'programming-language'], silentInstall: true,
    fileSize: BigInt(70000000),

  },

  // ── VS Code (Linux) ──
  {
    name: 'vscode', displayName: 'Visual Studio Code', version: '1.96.2', vendor: 'Microsoft', category: 'developer-tools',
    platform: 'linux', architecture: 'x64', installSource: 'bundle',
    minioKey: 'linux/microsoft/vscode/1.96.2/code_1.96.2_amd64.deb', fileName: 'code_1.96.2_amd64.deb',
    downloadUrl: 'https://update.code.visualstudio.com/1.96.2/linux-deb-x64/stable',
    description: 'Free source-code editor by Microsoft',
    tags: ['editor', 'ide', 'developer-tools'], silentInstall: true,
    fileSize: BigInt(95000000),

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
