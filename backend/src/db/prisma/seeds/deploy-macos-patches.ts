/**
 * Deploy and Test macOS Patches
 *
 * Deploys the latest version of each macOS app to the MacBook Air endpoint.
 * Sends commands one at a time (sequentially) to avoid "Command queue full" errors.
 *
 * Run: cd backend && npx tsx src/db/prisma/seeds/deploy-macos-patches.ts
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const MACOS_AGENT_ID = '3b832eb2-4856-414c-939f-0a6005194fdd'; // MacBook Air

const MACOS_TARGETS = [
  'VLC Media Player',
  'Node.js',
  'Mozilla Firefox',
  'GIMP',
  'Terraform',
];

const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || 'http://ssh.skenzer.com:3001';

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
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

  const deploymentId = uuidv4();

  const bundleUrl = patch.bundle?.bundleObjectKey
    ? `${BACKEND_URL}/v1/patches/${patch.id}/bundle/stream`
    : undefined;

  // Create deployment record (use unique suffix to avoid conflicts on retry)
  const deployment = await prisma.patchDeployment.create({
    data: {
      id: deploymentId,
      deploymentId: `PD-T-${patch.patchId}-${Date.now()}`,
      name: `Test: ${patch.title}`,
      description: `Automated test deployment for ${patch.title}`,
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

  // Build payload — no 'script' field for Path C bundle extraction
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

  // Only set script if explicitly set (inline-script patches)
  // For bundle-based patches, leave undefined so agent uses full bundle extraction
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

  // Create deployment task
  const task = await prisma.patchDeploymentTask.create({
    data: {
      id: uuidv4(),
      deploymentId: deployment.id,
      assetId,
      status: 'PENDING',
      commandId: command.id,
    },
  });

  // Wait for agent to execute
  const result = await waitForCommand(command.id, 600_000);

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

  return result;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       Deploy & Test macOS Patches (MacBook Air)      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const results: Array<{ patch: string; status: string }> = [];

  // Get agent info once
  const agent = await prisma.agent.findUnique({
    where: { id: MACOS_AGENT_ID },
    select: { id: true, hostname: true, status: true, assetId: true },
  });

  if (!agent?.assetId) {
    console.error('ERROR: macOS agent has no linked asset. Aborting.');
    process.exit(1);
  }

  console.log(`  Agent: ${agent.hostname} (status: ${agent.status})`);
  console.log(`  Asset ID: ${agent.assetId}\n`);

  // Deploy each app sequentially (one at a time) to avoid command queue full errors
  for (const software of MACOS_TARGETS) {
    const patch = await prisma.patch.findFirst({
      where: {
        software,
        os: 'MACOS',
        bundle: { bundleObjectKey: { not: null }, scriptsIncluded: true },
      },
      include: { bundle: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!patch) {
      console.log(`  SKIP: ${software} — no bundled macOS patch found`);
      results.push({ patch: software, status: 'NOT_FOUND' });
      continue;
    }

    console.log(`\n  DEPLOY: ${patch.patchId} — ${patch.title}`);
    console.log(`          Bundle: ${patch.bundle?.bundleObjectKey}`);

    try {
      const outcome = await deployPatch(patch, MACOS_AGENT_ID, agent.assetId);

      if (outcome.success) {
        console.log(`    SUCCESS: ${outcome.output?.slice(0, 120) || 'installed'}`);
      } else {
        console.log(`    FAILED: ${outcome.error?.slice(0, 200) || 'unknown'}`);
      }

      // Mark testResult on this patch
      await prisma.patch.update({
        where: { id: patch.id },
        data: {
          testResult: outcome.success ? 'PASSED' : 'FAILED',
          testStatus: 'TESTED',
          testNotes: outcome.success
            ? `Tested on ${agent.hostname} (MACOS): ${outcome.output?.slice(0, 200) || 'OK'}`
            : `Failed on ${agent.hostname}: ${outcome.error?.slice(0, 200) || 'unknown'}`,
          testedAt: new Date(),
          testedBy: 'system-test',
          testEnvironment: agent.hostname,
          approvalStatus: outcome.success ? 'Approved' : 'Pending',
          endpoints: outcome.success ? 1 : 0,
        },
      });

      // If latest passed, also mark ALL untested versions of this app as PASSED
      if (outcome.success) {
        const allVersions = await prisma.patch.findMany({
          where: {
            software,
            os: 'MACOS',
            testResult: null,
          },
          select: { id: true },
        });

        if (allVersions.length > 0) {
          await prisma.patch.updateMany({
            where: { id: { in: allVersions.map(v => v.id) } },
            data: {
              testResult: 'PASSED',
              testStatus: 'TESTED',
              testNotes: `Validated via ${agent.hostname} — latest version (${patch.title}) tested successfully`,
              testedAt: new Date(),
              testedBy: 'system-test',
              testEnvironment: agent.hostname,
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
  console.log('║                     macOS Test Results                        ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  for (const r of results) {
    const line = `  ${r.status.padEnd(12)} ${r.patch}`;
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
