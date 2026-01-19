import { prisma } from '@db/client';

/**
 * E2E Test Teardown
 * Cleans up test data after E2E test runs
 */
export async function globalTeardown(): Promise<void> {
  try {
    // Clean up test-specific data (preserves seeded data)
    await prisma.$transaction([
      // Delete E2E test-created records by pattern matching
      prisma.auditLog.deleteMany({
        where: { description: { contains: 'E2E-TEST' } },
      }),
      prisma.refreshToken.deleteMany({
        where: {
          user: { email: { contains: 'e2e-test' } },
        },
      }),
      prisma.agent.deleteMany({
        where: { machineId: { startsWith: 'E2E-TEST' } },
      }),
      prisma.asset.deleteMany({
        where: { name: { startsWith: 'E2E-Test' } },
      }),
    ]);

    console.log('E2E test data cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up E2E test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
