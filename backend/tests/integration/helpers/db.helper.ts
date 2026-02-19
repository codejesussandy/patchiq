/**
 * Database helpers for integration tests
 *
 * Provides cleanup and factory functions.
 * Uses TEST- prefix on names to identify test-created data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_PREFIX = 'INTTEST-';

/**
 * Clean up test-created data across all tables.
 * Only removes records with the INTTEST- prefix in identifiable fields.
 * Runs deletes in correct order to respect foreign key constraints.
 */
async function cleanTestData() {
  // Delete in reverse dependency order
  await prisma.patchDeploymentTask.deleteMany({
    where: { deployment: { name: { startsWith: TEST_PREFIX } } },
  });
  await prisma.patchDeployment.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.softwareDeploymentTask.deleteMany({
    where: { deployment: { deploymentName: { startsWith: TEST_PREFIX } } },
  });
  await prisma.softwareDeployment.deleteMany({
    where: { deploymentName: { startsWith: TEST_PREFIX } },
  });
  await prisma.assetAlert.deleteMany({
    where: { alert: { startsWith: TEST_PREFIX } },
  });
  await prisma.notification.deleteMany({
    where: { title: { startsWith: TEST_PREFIX } },
  });
  await prisma.assetTag.deleteMany({
    where: { tag: { name: { startsWith: TEST_PREFIX } } },
  });
  await prisma.assetSoftware.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.assetVulnerability.deleteMany({
    where: { vulnerability: { title: { startsWith: TEST_PREFIX } } },
  });
  await prisma.patchVulnerability.deleteMany({
    where: { patch: { title: { startsWith: TEST_PREFIX } } },
  });
  await prisma.patchAffectedProduct.deleteMany({
    where: { patch: { title: { startsWith: TEST_PREFIX } } },
  });
  await prisma.patchBundle.deleteMany({
    where: { patch: { title: { startsWith: TEST_PREFIX } } },
  });
  await prisma.patch.deleteMany({
    where: { title: { startsWith: TEST_PREFIX } },
  });
  await prisma.vulnerability.deleteMany({
    where: { title: { startsWith: TEST_PREFIX } },
  });
  await prisma.agentCommand.deleteMany({
    where: { agent: { name: { startsWith: TEST_PREFIX } } },
  });
  await prisma.agentTelemetry.deleteMany({
    where: { agent: { name: { startsWith: TEST_PREFIX } } },
  });
  await prisma.agent.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.asset.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.tag.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.patchTest.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.zeroTouchConfig.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.job.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.patchJob.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.report.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.scheduledReport.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.iPRange.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.deviceCredential.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.softwarePackage.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.hubBundle.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.configCatalog.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.configBundle.deleteMany({
    where: { bundleName: { startsWith: TEST_PREFIX } },
  });
  await prisma.computerGroup.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.deploymentPolicy.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.category.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
}

/**
 * Generate a unique test name with prefix
 */
function testName(base: string) {
  return `${TEST_PREFIX}${base}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate a unique test ID
 */
function testId(base: string) {
  return `${TEST_PREFIX}${base}-${Date.now()}`;
}

export { prisma, cleanTestData, testName, testId, TEST_PREFIX };
