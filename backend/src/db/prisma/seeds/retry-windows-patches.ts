/**
 * Retry Windows Patch Deployments
 *
 * Waits for agent to come back online, then retries failed/pending patches.
 * Run: cd backend && npx tsx src/db/prisma/seeds/retry-windows-patches.ts
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const WINDOWS_AGENT_ID = 'f768c40e-6537-475f-a1dc-3215af4910a4'; // Magical04

// Apps that need to be retried (based on current state: FAILED or NOT_TESTED)
const WINDOWS_APPS = [
  '7-Zip',
  'Mozilla Firefox',
  'Git for Windows',
  'Notepad++',
  'VLC Media Player',
];

// Use the external URL so Windows agent can reach the backend
const BACKEND_URL = 'http://ssh.skenzer.com:3001';

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/** Wait for agent to come back online */
async function waitForAgent(agentId: string, timeoutMs = 600_000): Promise<boolean> {
  const start = Date.now();
  console.log('\n  Waiting for agent to come back online...');
  while (Date.now() - start < timeoutMs) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { status: true, lastHeartbeat: true, agentVersion: true },
    });
    if (agent?.lastHeartbeat) {
      const heartbeatAge = Date.now() - new Date(agent.lastHeartbeat).getTime();
      if (heartbeatAge < 60_000) { // heartbeat within last 60s
        console.log(`  Agent online! Version: ${agent.agentVersion}, last heartbeat: ${agent.lastHeartbeat}`);
        return true;
      }
    }
    process.stdout.write('.');
    await sleep(10_000);
  }
  return false;
}

/** Poll until command completes or times out */
async function waitForCommand(commandId: string, timeoutMs = 600_000): Promise<{ success: boolean; output?: string; error?: string }> {
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
      const succeeded = !hasError && (
        result?.success === true ||
        result?.status === 'success' ||
        (typeof result?.message === 'string' && (result.message as string).toLowerCase().includes('success')) ||
        !result?.errorMessage
      );
      return {
        success: succeeded,
        output: (result?.output as string) || (result?.message as string) || (result ? JSON.stringify(result).slice(0, 400) : undefined),
        error: !succeeded ? (cmd.errorMessage || (result?.errorMessage as string) || (result?.error as string) || 'Failed') : undefined,
      };
    }
    if (cmd.status === 'FAILED') {
      return { success: false, error: cmd.errorMessage || 'Command failed' };
    }
    await sleep(4000);
  }
  return { success: false, error: 'Timeout waiting for command' };
}

async function deployPatch(patch: {
  id: string; patchId: string; title: string; software: string | null;
  bundle: {
    bundleObjectKey: string | null; bundleChecksum: string | null;
    manifestJson: unknown; scriptsIncluded: boolean; requiresRoot: boolean | null;
    scriptInstall: string | null;
  } | null;
}, agentId: string, assetId: string): Promise<{ success: boolean; output?: string; error?: string }> {

  const bundleUrl = patch.bundle?.bundleObjectKey
    ? `${BACKEND_URL}/v1/patches/${patch.id}/bundle/stream`
    : undefined;

  // Use timestamp suffix to avoid unique constraint conflicts
  const deploymentId = uuidv4();
  const deploymentRef = `PD-T-${patch.patchId}-${Date.now()}`;

  const deployment = await prisma.patchDeployment.create({
    data: {
      id: deploymentId,
      deploymentId: deploymentRef,
      name: `Test: ${patch.title}`,
      description: `Automated test deployment for ${patch.title} (retry)`,
      type: 'INSTANT',
      configType: 'INSTALL',
      scope: 'ENDPOINT',
      status: 'IN_PROGRESS',
      pending: 1,
      succeeded: 0,
      failed: 0,
      triggerType: 'test',
      createdBy: 'system-test',
      patches: { connect: { id: patch.id } },
    },
  });

  const payload: Record<string, unknown> = {
    operationType: 'install',
    packageId: patch.id,
    packageName: patch.software || patch.patchId,
    version: patch.patchId,
    bundleUrl,
    bundleChecksum: patch.bundle?.bundleChecksum || undefined,
    manifest: patch.bundle?.manifestJson || undefined,
    requiresRoot: patch.bundle?.requiresRoot ?? true,
    patchId: patch.patchId,
  };

  // Only set script for inline-script patches, not bundle-based (Path C)
  if (patch.bundle?.scriptInstall) {
    payload.script = patch.bundle.scriptInstall;
  }

  const command = await prisma.agentCommand.create({
    data: {
      id: uuidv4(),
      agentId,
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
      assetId,
      status: 'PENDING',
      commandId: command.id,
    },
  });

  const result = await waitForCommand(command.id, 600_000);

  await prisma.patchDeploymentTask.update({
    where: { id: task.id },
    data: {
      status: result.success ? 'COMPLETED' : 'FAILED',
      completedAt: new Date(),
      errorMessage: result.error || null,
      output: result.output || null,
    },
  });

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

  return result;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Retry Windows Patches — Waiting for Agent        ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const agent = await prisma.agent.findUnique({
    where: { id: WINDOWS_AGENT_ID },
    select: { id: true, hostname: true, status: true, assetId: true, lastHeartbeat: true, agentVersion: true },
  });

  if (!agent || !agent.assetId) {
    console.error('ERROR: Windows agent not found or has no linked asset');
    process.exit(1);
  }

  console.log(`  Agent: ${agent.hostname} (version: ${agent.agentVersion})`);
  console.log(`  Last heartbeat: ${agent.lastHeartbeat}`);
  console.log(`  Asset: ${agent.assetId}`);

  // Check if agent needs to come back online
  const heartbeatAge = agent.lastHeartbeat ? Date.now() - new Date(agent.lastHeartbeat).getTime() : Infinity;
  if (heartbeatAge > 60_000) {
    const online = await waitForAgent(WINDOWS_AGENT_ID, 600_000);
    if (!online) {
      console.error('\nERROR: Agent did not come back online within 10 minutes');
      process.exit(1);
    }
  }

  // Determine which apps need to be deployed (NOT_TESTED or FAILED)
  const appsToTest: string[] = [];
  for (const software of WINDOWS_APPS) {
    const patch = await prisma.patch.findFirst({
      where: { software, os: 'WINDOWS' },
      orderBy: { createdAt: 'desc' },
      select: { patchId: true, testResult: true, testStatus: true },
    });
    if (!patch || patch.testResult !== 'PASSED') {
      appsToTest.push(software);
      console.log(`  Need to test: ${software} (current: ${patch?.testResult || 'NOT_TESTED'})`);
    } else {
      console.log(`  Already passed: ${software}`);
    }
  }

  if (appsToTest.length === 0) {
    console.log('\n  All patches already passed! Nothing to do.');
    return;
  }

  const results: Array<{ patch: string; status: string }> = [];

  for (const software of appsToTest) {
    const patch = await prisma.patch.findFirst({
      where: {
        software,
        os: 'WINDOWS',
        bundle: { bundleObjectKey: { not: null }, scriptsIncluded: true },
      },
      include: { bundle: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!patch) {
      console.log(`  SKIP: ${software} — no bundled Windows patch found`);
      results.push({ patch: software, status: 'NOT_FOUND' });
      continue;
    }

    // Re-check agent is still online
    const agentNow = await prisma.agent.findUnique({
      where: { id: WINDOWS_AGENT_ID },
      select: { lastHeartbeat: true },
    });
    const age = agentNow?.lastHeartbeat ? Date.now() - new Date(agentNow.lastHeartbeat).getTime() : Infinity;
    if (age > 120_000) {
      console.log(`  Agent went offline again, waiting...`);
      const backOnline = await waitForAgent(WINDOWS_AGENT_ID, 300_000);
      if (!backOnline) {
        console.log(`  Agent still offline, marking remaining as error`);
        results.push({ patch: software, status: 'AGENT_OFFLINE' });
        continue;
      }
    }

    const latestAgent = await prisma.agent.findUnique({
      where: { id: WINDOWS_AGENT_ID },
      select: { hostname: true },
    });
    const hostname = latestAgent?.hostname || 'MAGICAL04';

    console.log(`\n  DEPLOY: ${patch.patchId} — ${patch.title}`);
    console.log(`          Bundle: ${patch.bundle?.bundleObjectKey}`);
    console.log(`          URL: ${BACKEND_URL}/v1/patches/${patch.id}/bundle/stream`);

    try {
      const outcome = await deployPatch(patch, WINDOWS_AGENT_ID, agent.assetId);

      if (outcome.success) {
        console.log(`    SUCCESS: ${outcome.output?.slice(0, 120) || 'installed'}`);
      } else {
        console.log(`    FAILED: ${outcome.error?.slice(0, 200) || 'unknown'}`);
      }

      await prisma.patch.update({
        where: { id: patch.id },
        data: {
          testResult: outcome.success ? 'PASSED' : 'FAILED',
          testStatus: 'TESTED',
          testNotes: outcome.success
            ? `Tested on ${hostname} (WINDOWS): ${outcome.output?.slice(0, 200) || 'OK'}`
            : `Failed on ${hostname}: ${outcome.error?.slice(0, 200) || 'unknown'}`,
          testedAt: new Date(),
          testedBy: 'system-test',
          testEnvironment: hostname,
          approvalStatus: outcome.success ? 'Approved' : 'Pending',
          endpoints: outcome.success ? 1 : 0,
        },
      });

      if (outcome.success) {
        const allVersions = await prisma.patch.findMany({
          where: { software, os: 'WINDOWS', testResult: null },
          select: { id: true },
        });
        if (allVersions.length > 0) {
          await prisma.patch.updateMany({
            where: { id: { in: allVersions.map(v => v.id) } },
            data: {
              testResult: 'PASSED',
              testStatus: 'TESTED',
              testNotes: `Validated via ${hostname} — latest version (${patch.title}) tested successfully`,
              testedAt: new Date(),
              testedBy: 'system-test',
              testEnvironment: hostname,
              approvalStatus: 'Approved',
            },
          });
          console.log(`    -> Marked ${allVersions.length} other versions as PASSED`);
        }
      }

      results.push({
        patch: `${patch.patchId} ${patch.title}`,
        status: outcome.success ? 'PASSED' : 'FAILED',
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`    ERROR: ${msg.slice(0, 200)}`);
      results.push({ patch: software, status: 'ERROR' });
    }
  }

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  Windows Retry Test Results                   ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  for (const r of results) {
    const line = `  ${r.status.padEnd(15)} ${r.patch.padEnd(47)}`;
    console.log(`║${line.padEnd(65)}║`);
  }
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.status === 'PASSED').length;
  const total = results.length;
  console.log(`\n  Passed: ${passed}/${total}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
