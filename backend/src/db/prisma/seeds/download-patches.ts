/**
 * download-patches.ts — Download real patch binaries and upload to MinIO
 *
 * Downloads installers for 6 target apps (latest + N-1 + N-2) from official
 * sources, then uploads them to MinIO at the keys the PatchBundle records expect.
 *
 * Skips files already present in MinIO.
 *
 * Usage:
 *   cd backend && npx tsx src/db/prisma/seeds/download-patches.ts
 */

import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import * as Minio from 'minio';

// ─── MinIO Client ─────────────────────────────────────────────────────

const mc = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '5001'),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'patchiq_admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'patchiq_secret_key',
});

const BUCKET = process.env.MINIO_BUCKET || 'patches';
const TEMP_DIR = '/tmp/patchiq-downloads';

// ─── Download Manifest ────────────────────────────────────────────────

interface DownloadEntry {
  minioKey: string;
  downloadUrl: string;
  fileName: string;
  app: string;
  version: string;
}

const DOWNLOADS: DownloadEntry[] = [
  // ── 7-Zip (Windows) ──────────────────────────────────────
  // 24.09 — already in MinIO
  { app: '7-Zip', version: '24.09', fileName: '7z2409-x64.exe', minioKey: 'windows/7-zip/7-zip/24.09/7z2409-x64.exe', downloadUrl: 'https://www.7-zip.org/a/7z2409-x64.exe' },
  // 24.08
  { app: '7-Zip', version: '24.08', fileName: '7z2408-x64.exe', minioKey: 'windows/7-zip/7-zip/24.08/7z2408-x64.exe', downloadUrl: 'https://www.7-zip.org/a/7z2408-x64.exe' },
  // 24.07
  { app: '7-Zip', version: '24.07', fileName: '7z2407-x64.exe', minioKey: 'windows/7-zip/7-zip/24.07/7z2407-x64.exe', downloadUrl: 'https://www.7-zip.org/a/7z2407-x64.exe' },

  // ── Notepad++ (Windows) ──────────────────────────────────
  // 8.7.1 — already in MinIO
  { app: 'Notepad++', version: '8.7.1', fileName: 'npp.8.7.1.Installer.x64.exe', minioKey: 'windows/notepad-/notepad-/8.7.1/npp.8.7.1.Installer.x64.exe', downloadUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7.1/npp.8.7.1.Installer.x64.exe' },
  // 8.7
  { app: 'Notepad++', version: '8.7', fileName: 'npp.8.7.Installer.x64.exe', minioKey: 'windows/notepad-/notepad-/8.7/npp.8.7.Installer.x64.exe', downloadUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7/npp.8.7.Installer.x64.exe' },
  // 8.6.9
  { app: 'Notepad++', version: '8.6.9', fileName: 'npp.8.6.9.Installer.x64.exe', minioKey: 'windows/notepad-/notepad-/8.6.9/npp.8.6.9.Installer.x64.exe', downloadUrl: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.6.9/npp.8.6.9.Installer.x64.exe' },

  // ── FileZilla (Windows) ──────────────────────────────────
  // 3.68.1 — already in MinIO
  { app: 'FileZilla', version: '3.68.1', fileName: 'FileZilla_3.68.1_win64-setup.exe', minioKey: 'windows/filezilla/filezilla/3.68.1/FileZilla_3.68.1_win64-setup.exe', downloadUrl: 'https://download.filezilla-project.org/client/FileZilla_3.68.1_win64-setup.exe' },
  // 3.67.1
  { app: 'FileZilla', version: '3.67.1', fileName: 'FileZilla_3.67.1_win64-setup.exe', minioKey: 'windows/filezilla/filezilla/3.67.1/FileZilla_3.67.1_win64-setup.exe', downloadUrl: 'https://download.filezilla-project.org/client/FileZilla_3.67.1_win64-setup.exe' },
  // 3.67.0
  { app: 'FileZilla', version: '3.67.0', fileName: 'FileZilla_3.67.0_win64-setup.exe', minioKey: 'windows/filezilla/filezilla/3.67.0/FileZilla_3.67.0_win64-setup.exe', downloadUrl: 'https://download.filezilla-project.org/client/FileZilla_3.67.0_win64-setup.exe' },

  // ── VLC (Windows) ────────────────────────────────────────
  // 3.0.21 — already in MinIO
  { app: 'VLC', version: '3.0.21-win', fileName: 'vlc-3.0.21-win64.exe', minioKey: 'windows/videolan/vlc/3.0.21/vlc-3.0.21-win64.exe', downloadUrl: 'https://get.videolan.org/vlc/3.0.21/win64/vlc-3.0.21-win64.exe' },
  // 3.0.20
  { app: 'VLC', version: '3.0.20-win', fileName: 'vlc-3.0.20-win64.exe', minioKey: 'windows/videolan/vlc/3.0.20/vlc-3.0.20-win64.exe', downloadUrl: 'https://get.videolan.org/vlc/3.0.20/win64/vlc-3.0.20-win64.exe' },
  // 3.0.19
  { app: 'VLC', version: '3.0.19-win', fileName: 'vlc-3.0.19-win64.exe', minioKey: 'windows/videolan/vlc/3.0.19/vlc-3.0.19-win64.exe', downloadUrl: 'https://get.videolan.org/vlc/3.0.19/win64/vlc-3.0.19-win64.exe' },
  // VLC macOS
  { app: 'VLC', version: '3.0.21-mac', fileName: 'vlc-3.0.21-universal.dmg', minioKey: 'macos/videolan/vlc/3.0.21/vlc-3.0.21-universal.dmg', downloadUrl: 'https://get.videolan.org/vlc/3.0.21/macosx/vlc-3.0.21-universal.dmg' },
  { app: 'VLC', version: '3.0.20-mac', fileName: 'vlc-3.0.20-universal.dmg', minioKey: 'macos/videolan/vlc/3.0.20/vlc-3.0.20-universal.dmg', downloadUrl: 'https://get.videolan.org/vlc/3.0.20/macosx/vlc-3.0.20-universal.dmg' },
  { app: 'VLC', version: '3.0.19-mac', fileName: 'vlc-3.0.19-universal.dmg', minioKey: 'macos/videolan/vlc/3.0.19/vlc-3.0.19-universal.dmg', downloadUrl: 'https://get.videolan.org/vlc/3.0.19/macosx/vlc-3.0.19-universal.dmg' },

  // ── Node.js (Windows + macOS + Linux) ────────────────────
  // 22.12.0 — already in MinIO
  { app: 'Node.js', version: '22.12.0-win', fileName: 'node-v22.12.0-x64.msi', minioKey: 'windows/nodejs/nodejs/22.12.0/node-v22.12.0-x64.msi', downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0-x64.msi' },
  { app: 'Node.js', version: '22.12.0-mac', fileName: 'node-v22.12.0.pkg', minioKey: 'macos/nodejs/nodejs/22.12.0/node-v22.12.0.pkg', downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0.pkg' },
  { app: 'Node.js', version: '22.12.0-linux', fileName: 'node-v22.12.0-linux-x64.tar.xz', minioKey: 'linux/nodejs/nodejs/22.12.0/node-v22.12.0-linux-x64.tar.xz', downloadUrl: 'https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz' },
  // 22.11.0
  { app: 'Node.js', version: '22.11.0-win', fileName: 'node-v22.11.0-x64.msi', minioKey: 'windows/nodejs/nodejs/22.11.0/node-v22.11.0-x64.msi', downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi' },
  { app: 'Node.js', version: '22.11.0-mac', fileName: 'node-v22.11.0.pkg', minioKey: 'macos/nodejs/nodejs/22.11.0/node-v22.11.0.pkg', downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0.pkg' },
  { app: 'Node.js', version: '22.11.0-linux', fileName: 'node-v22.11.0-linux-x64.tar.xz', minioKey: 'linux/nodejs/nodejs/22.11.0/node-v22.11.0-linux-x64.tar.xz', downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-linux-x64.tar.xz' },
  // 20.18.0
  { app: 'Node.js', version: '20.18.0-win', fileName: 'node-v20.18.0-x64.msi', minioKey: 'windows/nodejs/nodejs/20.18.0/node-v20.18.0-x64.msi', downloadUrl: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' },
  { app: 'Node.js', version: '20.18.0-mac', fileName: 'node-v20.18.0.pkg', minioKey: 'macos/nodejs/nodejs/20.18.0/node-v20.18.0.pkg', downloadUrl: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0.pkg' },
  { app: 'Node.js', version: '20.18.0-linux', fileName: 'node-v20.18.0-linux-x64.tar.xz', minioKey: 'linux/nodejs/nodejs/20.18.0/node-v20.18.0-linux-x64.tar.xz', downloadUrl: 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz' },

  // ── Git for Windows ──────────────────────────────────────
  // 2.47.1 — already in MinIO
  { app: 'Git', version: '2.47.1', fileName: 'Git-2.47.1-64-bit.exe', minioKey: 'windows/git/git/2.47.1/Git-2.47.1-64-bit.exe', downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' },
  // 2.47.0
  { app: 'Git', version: '2.47.0', fileName: 'Git-2.47.0-64-bit.exe', minioKey: 'windows/git/git/2.47.0/Git-2.47.0-64-bit.exe', downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.47.0.windows.1/Git-2.47.0-64-bit.exe' },
  // 2.46.2
  { app: 'Git', version: '2.46.2', fileName: 'Git-2.46.2-64-bit.exe', minioKey: 'windows/git/git/2.46.2/Git-2.46.2-64-bit.exe', downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.46.2.windows.1/Git-2.46.2-64-bit.exe' },
];

// ─── Download helpers ─────────────────────────────────────────────────

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(dest);
    const proto = url.startsWith('https') ? https : http;

    const doRequest = (requestUrl: string, redirectCount: number) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      proto.get(requestUrl, { headers: { 'User-Agent': 'PatchIQ/1.0' } }, (response) => {
        // Follow redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          let redirectUrl = response.headers.location;
          if (redirectUrl.startsWith('/')) {
            const parsed = new URL(requestUrl);
            redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
          }
          response.resume(); // consume response
          // Use https for redirect if needed
          const redirectProto = redirectUrl.startsWith('https') ? https : http;
          redirectProto.get(redirectUrl, { headers: { 'User-Agent': 'PatchIQ/1.0' } }, (res2) => {
            if (res2.statusCode && res2.statusCode >= 300 && res2.statusCode < 400 && res2.headers.location) {
              res2.resume();
              doRequest(res2.headers.location, redirectCount + 2);
              return;
            }
            if (res2.statusCode !== 200) {
              res2.resume();
              reject(new Error(`HTTP ${res2.statusCode} from redirect`));
              return;
            }
            res2.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
          }).on('error', (e) => { fs.unlinkSync(dest); reject(e); });
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
      }).on('error', (e) => {
        fs.unlinkSync(dest);
        reject(e);
      });
    };

    doRequest(url, 0);
  });
}

async function existsInMinio(key: string): Promise<boolean> {
  try {
    await mc.statObject(BUCKET, key);
    return true;
  } catch {
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Patch File Downloader ===');
  console.log(`MinIO: localhost:5001 bucket=${BUCKET}`);
  console.log(`Downloads: ${DOWNLOADS.length} files\n`);

  // Ensure temp dir
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  let skipped = 0;
  let downloaded = 0;
  let failed = 0;

  for (let i = 0; i < DOWNLOADS.length; i++) {
    const entry = DOWNLOADS[i];
    const idx = `[${i + 1}/${DOWNLOADS.length}]`;

    // Check if already in MinIO
    if (await existsInMinio(entry.minioKey)) {
      console.log(`${idx} [SKIP] ${entry.app} ${entry.version} — already in MinIO`);
      skipped++;
      continue;
    }

    // Download
    const tempFile = path.join(TEMP_DIR, entry.fileName);
    console.log(`${idx} [DOWN] ${entry.app} ${entry.version} — ${entry.downloadUrl}`);

    try {
      await downloadFile(entry.downloadUrl, tempFile);
      const stats = fs.statSync(tempFile);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      console.log(`       Downloaded ${sizeMB} MB`);

      // Upload to MinIO
      console.log(`       Uploading to ${entry.minioKey}`);
      await mc.fPutObject(BUCKET, entry.minioKey, tempFile);
      console.log(`       [OK] Uploaded`);
      downloaded++;

      // Cleanup temp file
      fs.unlinkSync(tempFile);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`       [FAIL] ${message}`);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Downloaded & uploaded: ${downloaded}`);
  console.log(`  Already in MinIO:     ${skipped}`);
  console.log(`  Failed:               ${failed}`);
  console.log(`  Total:                ${DOWNLOADS.length}`);

  // Cleanup temp dir
  try { fs.rmdirSync(TEMP_DIR); } catch { /* may not be empty */ }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
