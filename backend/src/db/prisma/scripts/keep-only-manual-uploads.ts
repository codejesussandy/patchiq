#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Removing system packages...');
  
  const result = await prisma.softwarePackage.deleteMany({
    where: {
      packageId: { startsWith: 'SWP-' },
      displayName: {
        notIn: [
          'Google Chrome',
          'Mozilla Firefox',
          '7-Zip',
          'Visual Studio Code',
          'Git for Windows',
          'Notepad++',
          'VLC Media Player',
          'Slack',
          'TeamViewer'
        ]
      }
    }
  });
  
  console.log(`✓ Removed ${result.count} system packages`);
  
  const remaining = await prisma.softwarePackage.count();
  console.log(`✓ ${remaining} packages remaining (your uploads only)`);
  
  await prisma.$disconnect();
}

main();
