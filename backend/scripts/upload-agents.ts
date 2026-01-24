/**
 * Script to upload agent binaries to MinIO and seed the AgentVersion table
 * Run with: npx ts-node -r tsconfig-paths/register scripts/upload-agents.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Client as MinioClient } from 'minio';

const prisma = new PrismaClient();

// MinIO configuration - matches docker-compose.yml
const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'patchiq_admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'patchiq_secret_key',
};

const AGENTS_BUCKET = 'agents';
const AGENT_VERSION = '1.0.0';

// Agent binary configurations
const agentBinaries = [
  {
    platform: 'Linux',
    architecture: 'amd64',
    fileName: 'patchiq-agent-linux-amd64',
    objectKey: 'linux/amd64/patchiq-agent',
  },
  {
    platform: 'Linux',
    architecture: 'arm64',
    fileName: 'patchiq-agent-linux-arm64',
    objectKey: 'linux/arm64/patchiq-agent',
  },
  {
    platform: 'Mac',
    architecture: 'amd64',
    fileName: 'patchiq-agent-darwin-amd64',
    objectKey: 'darwin/amd64/patchiq-agent',
  },
  {
    platform: 'Mac',
    architecture: 'arm64',
    fileName: 'patchiq-agent-darwin-arm64',
    objectKey: 'darwin/arm64/patchiq-agent',
  },
  {
    platform: 'Windows',
    architecture: 'amd64',
    fileName: 'patchiq-agent-windows-amd64.exe',
    objectKey: 'windows/amd64/patchiq-agent.exe',
  },
];

async function main() {
  console.log('Agent Upload Script');
  console.log('===================\n');

  // Connect to MinIO
  const minio = new MinioClient(minioConfig);
  console.log(`Connecting to MinIO at ${minioConfig.endPoint}:${minioConfig.port}...`);

  // Ensure bucket exists
  const bucketExists = await minio.bucketExists(AGENTS_BUCKET);
  if (!bucketExists) {
    await minio.makeBucket(AGENTS_BUCKET, 'us-east-1');
    console.log(`Created bucket: ${AGENTS_BUCKET}`);
  } else {
    console.log(`Bucket exists: ${AGENTS_BUCKET}`);
  }

  // Find agent dist directory
  const distDir = path.join(__dirname, '../../agent/dist');

  if (!fs.existsSync(distDir)) {
    console.error(`\nAgent dist directory not found: ${distDir}`);
    console.error('Please build agents first with:');
    console.error('  cd ../agent && GOOS=linux GOARCH=amd64 go build -o dist/patchiq-agent-linux-amd64 ./cmd/agent');
    process.exit(1);
  }

  console.log(`\nUploading agents from: ${distDir}\n`);

  for (const agent of agentBinaries) {
    const filePath = path.join(distDir, agent.fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${agent.fileName} - file not found`);
      continue;
    }

    // Read file and calculate checksum
    const fileBuffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileSize = fileBuffer.length;

    console.log(`📦 Uploading ${agent.fileName}...`);
    console.log(`   Platform: ${agent.platform}/${agent.architecture}`);
    console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Checksum: ${checksum.substring(0, 16)}...`);

    // Upload to MinIO
    await minio.putObject(AGENTS_BUCKET, agent.objectKey, fileBuffer, fileSize, {
      'Content-Type': 'application/octet-stream',
      'x-amz-checksum-sha256': checksum,
    });

    // Upsert in database
    await prisma.agentVersion.upsert({
      where: {
        platform_architecture_version: {
          platform: agent.platform,
          architecture: agent.architecture,
          version: AGENT_VERSION,
        },
      },
      update: {
        filePath: agent.objectKey,
        fileSize: BigInt(fileSize),
        checksum,
        lastUpdatedAt: new Date(),
      },
      create: {
        platform: agent.platform,
        architecture: agent.architecture,
        version: AGENT_VERSION,
        filePath: agent.objectKey,
        fileSize: BigInt(fileSize),
        checksum,
        lastUpdatedAt: new Date(),
      },
    });

    console.log(`   ✅ Uploaded and registered\n`);
  }

  // List all registered versions
  console.log('\n=== Registered Agent Versions ===');
  const versions = await prisma.agentVersion.findMany({
    orderBy: [{ platform: 'asc' }, { architecture: 'asc' }],
  });

  for (const v of versions) {
    console.log(`- ${v.platform}/${v.architecture} v${v.version} (${v.filePath})`);
  }

  console.log('\n✅ Agent upload complete!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
