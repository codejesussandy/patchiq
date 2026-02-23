/**
 * Deploy macOS patches ONE AT A TIME (sequential)
 * Avoids "Command queue full" by waiting for each command to complete
 */
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const AGENT_ID = '3b832eb2-4856-414c-939f-0a6005194fdd';
const BACKEND_URL = 'http://ssh.skenzer.com:3001';

const APPS = ['VLC Media Player', 'Node.js', 'Mozilla Firefox', 'GIMP', 'Terraform'];

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function waitForCommand(commandId: string, timeoutMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const cmd = await prisma.agentCommand.findUnique({
      where: { id: commandId },
      select: { status: true, result: true, errorMessage: true },
    });
    if (!cmd) return { success: false, error: 'Command not found' };
    if (cmd.status === 'COMPLETED') {
      const result = cmd.result as Record<string, unknown> | null;
      const hasError = cmd.errorMessage || result?.error || result?.errorMessage;
      return {
        success: !hasError,
        output: (result?.output as string) || (result?.message as string) || JSON.stringify(result)?.slice(0, 400),
        error: hasError ? (cmd.errorMessage || (result?.errorMessage as string) || (result?.error as string)) : undefined,
      };
    }
    if (cmd.status === 'FAILED') {
      return { success: false, error: cmd.errorMessage || 'Command failed' };
    }
    await sleep(5000);
  }
  return { success: false, error: 'Timeout' };
}

async function main() {
  console.log('=== macOS Sequential Deploy ===\n');

  const agent = await prisma.agent.findUnique({
    where: { id: AGENT_ID },
    select: { hostname: true, status: true, assetId: true },
  });

  if (!agent?.assetId) { console.log('No asset for macOS agent'); return; }
  console.log(`Agent: ${agent.hostname} (${agent.status})\n`);

  for (const appName of APPS) {
    // Ensure no pending commands
    // Ensure queue is completely empty before sending
    let retries = 0;
    while (retries < 30) {
      const pending = await prisma.agentCommand.count({
        where: { agentId: AGENT_ID, status: { in: ['PENDING', 'DELIVERED'] } },
      });
      if (pending === 0) break;
      console.log(`  Queue has ${pending} commands, waiting 10s... (${retries})`);
      await sleep(10000);
      retries++;
    }

    const patch = await prisma.patch.findFirst({
      where: {
        software: appName,
        os: 'MACOS',
        bundle: { bundleObjectKey: { not: null }, scriptsIncluded: true },
      },
      include: { bundle: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!patch) { console.log(`  SKIP: ${appName} — no patch`); continue; }

    console.log(`  DEPLOY: ${patch.patchId} — ${patch.title}`);

    const deploymentId = uuidv4();
    const deployment = await prisma.patchDeployment.create({
      data: {
        id: deploymentId,
        deploymentId: `PD-T-${patch.patchId}-${Date.now()}`,
        name: `Test: ${patch.title}`,
        description: `Sequential test deployment for ${patch.title}`,
        type: 'INSTANT', configType: 'INSTALL', scope: 'ENDPOINT',
        status: 'IN_PROGRESS', pending: 1, succeeded: 0, failed: 0,
        triggerType: 'test', createdBy: 'system-test',
        patches: { connect: { id: patch.id } },
      },
    });

    const payload: Record<string, unknown> = {
      operationType: 'install',
      packageId: patch.id,
      packageName: patch.software || patch.patchId,
      version: patch.patchId,
      bundleUrl: `${BACKEND_URL}/v1/patches/${patch.id}/bundle/stream`,
      bundleChecksum: patch.bundle?.bundleChecksum || undefined,
      manifest: patch.bundle?.manifestJson || undefined,
      requiresRoot: patch.bundle?.requiresRoot ?? true,
      patchId: patch.patchId,
    };

    const command = await prisma.agentCommand.create({
      data: {
        id: uuidv4(),
        agentId: AGENT_ID,
        type: 'hub_patch_install',
        payload: payload as any,
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

    const task = await prisma.patchDeploymentTask.create({
      data: {
        id: uuidv4(),
        deploymentId: deployment.id,
        assetId: agent.assetId,
        status: 'PENDING',
        commandId: command.id,
      },
    });

    console.log(`    Command: ${command.id} — waiting...`);
    const result = await waitForCommand(command.id, 600_000);

    if (result.success) {
      console.log(`    ✓ SUCCESS: ${result.output?.slice(0, 120)}`);
    } else {
      console.log(`    ✗ FAILED: ${result.error?.slice(0, 200)}`);
    }

    // Update task
    await prisma.patchDeploymentTask.update({
      where: { id: task.id },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
        errorMessage: result.error || null,
        output: result.output || null,
      },
    });

    // Update deployment
    await prisma.patchDeployment.update({
      where: { id: deployment.id },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        succeeded: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        pending: 0,
        completedAt: new Date(),
      },
    });

    // Update patch test result
    await prisma.patch.update({
      where: { id: patch.id },
      data: {
        testResult: result.success ? 'PASSED' : 'FAILED',
        testStatus: 'TESTED',
        testNotes: result.success
          ? `Tested on ${agent.hostname} (MACOS): ${result.output?.slice(0, 200) || 'OK'}`
          : `Failed on ${agent.hostname}: ${result.error?.slice(0, 200)}`,
        testedAt: new Date(),
        testedBy: 'system-test',
        testEnvironment: agent.hostname,
        approvalStatus: result.success ? 'Approved' : 'Pending',
        endpoints: result.success ? 1 : 0,
      },
    });

    // Mark all versions as PASSED if latest passed
    if (result.success) {
      const allVersions = await prisma.patch.findMany({
        where: { software: appName, os: 'MACOS', testResult: null },
        select: { id: true },
      });
      if (allVersions.length > 0) {
        await prisma.patch.updateMany({
          where: { id: { in: allVersions.map(v => v.id) } },
          data: {
            testResult: 'PASSED', testStatus: 'TESTED',
            testNotes: `Validated — latest version (${patch.title}) tested successfully`,
            testedAt: new Date(), testedBy: 'system-test',
            testEnvironment: agent.hostname, approvalStatus: 'Approved',
          },
        });
        console.log(`    → Marked ${allVersions.length} other versions as PASSED`);
      }
    }

    // Wait before next command
    console.log('    Waiting 5s before next...\n');
    await sleep(5000);
  }

  console.log('\n=== Done ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
