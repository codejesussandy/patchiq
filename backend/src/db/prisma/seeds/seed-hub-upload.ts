/**
 * seed-hub-upload.ts — Download installer files and upload them to MinIO
 *
 * Reads SoftwarePackage records from DB, downloads each file from its
 * downloadUrl (vendor site), uploads to MinIO at the minioObjectKey path,
 * and updates DB with fileSize and checksum.
 *
 * Run standalone:
 *   cd backend && npx tsx src/db/prisma/seeds/seed-hub-upload.ts
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { Readable } from 'stream';

const prisma = new PrismaClient();

// MinIO client setup (matches minio.service.ts config)
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'patches';
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';

async function getMinioClient() {
  const { Client } = await import('minio');
  return new Client({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: MINIO_USE_SSL,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  });
}

/**
 * Download a file from a URL, following redirects (up to 5 hops)
 */
function downloadFile(url: string, maxRedirects = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, { headers: { 'User-Agent': 'PatchIQ/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
        return resolve(downloadFile(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('\n=== Hub Package File Uploader ===');
  console.log(`MinIO: ${MINIO_ENDPOINT}:${MINIO_PORT} bucket=${MINIO_BUCKET}`);

  const minio = await getMinioClient();

  // Ensure bucket exists
  const exists = await minio.bucketExists(MINIO_BUCKET);
  if (!exists) {
    await minio.makeBucket(MINIO_BUCKET);
    console.log(`Created bucket: ${MINIO_BUCKET}`);
  }

  // Get all packages that have a minioObjectKey and downloadUrl but no checksum yet
  const packages = await prisma.softwarePackage.findMany({
    where: {
      minioObjectKey: { not: null },
      downloadUrl: { not: null },
    },
    orderBy: [{ name: 'asc' }, { version: 'asc' }],
  });

  console.log(`Found ${packages.length} packages to process\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const idx = `[${i + 1}/${packages.length}]`;
    const label = `${pkg.displayName} ${pkg.version} (${pkg.platform})`;

    if (!pkg.minioObjectKey || !pkg.downloadUrl) {
      console.log(`${idx} [SKIP] ${label} — no objectKey or downloadUrl`);
      skipped++;
      continue;
    }

    // Check if file already exists in MinIO
    try {
      await minio.statObject(MINIO_BUCKET, pkg.minioObjectKey);
      // File already exists, check if we need to update DB
      if (pkg.checksum) {
        console.log(`${idx} [EXISTS] ${label} — already in MinIO with checksum`);
        skipped++;
        continue;
      }
      console.log(`${idx} [EXISTS] ${label} — in MinIO but no checksum, will update DB`);
    } catch {
      // File doesn't exist, will download and upload
    }

    try {
      console.log(`${idx} [DOWNLOAD] ${label} from ${pkg.downloadUrl}...`);
      const fileBuffer = await downloadFile(pkg.downloadUrl);
      const fileSize = BigInt(fileBuffer.length);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
      console.log(`${idx} [UPLOAD] ${label} — ${sizeMB} MB → ${pkg.minioObjectKey}`);

      // Upload to MinIO
      const stream = Readable.from(fileBuffer);
      await minio.putObject(MINIO_BUCKET, pkg.minioObjectKey, stream, fileBuffer.length, {
        'Content-Type': 'application/octet-stream',
        'x-package-id': pkg.packageId,
        'x-checksum-sha256': checksum,
      });

      // Update DB with file size and checksum
      await prisma.softwarePackage.update({
        where: { id: pkg.id },
        data: {
          fileSize,
          checksum,
          checksumType: 'sha256',
        },
      });

      console.log(`${idx} [OK] ${label} — sha256:${checksum.slice(0, 16)}...`);
      uploaded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${idx} [FAIL] ${label} — ${msg}`);
      failed++;
    }
  }

  console.log(`\n=== Upload Summary ===`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Total:    ${packages.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
