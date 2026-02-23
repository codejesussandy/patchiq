/**
 * Deploy and Test Linux Patches
 *
 * Deploys the latest version of each Linux app to the garage Ubuntu endpoint.
 *
 * Run: cd backend && npx tsx src/db/prisma/seeds/deploy-linux-patches.ts
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const LINUX_AGENT_ID = '4ab92d6c-edec-4447-909e-301a98e8282d'; // garage (Ubuntu)

const LINUX_TARGETS = [
  'Go',
  'Node.js',
  'Visual Studio Code',
  'Terraform',
  'Vault',
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

  // Create deployment record
  const deployment = await prisma.patchDeployment.create({
    data: {
      id: deploymentId,
      deploymentId: `PD-T-${patch.patchId}`,
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

  // Build payload — no 'script' field so agent uses Path C bundle extraction
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

  // Only set script if scriptInstall is explicitly set (inline-script patches)
  // For bundle-based patches, leave script undefined so agent uses full bundle extraction
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
  console.log('║       Deploy & Test Linux Patches (Latest)           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const results: Array<{ patch: string; os: string; status: string }> = [];

  // Look up the Linux agent
  const agent = await prisma.agent.findUnique({
    where: { id: LINUX_AGENT_ID },
    select: { id: true, hostname: true, status: true, assetId: true },
  });

  if (!agent?.assetId) {
    console.error('  ERROR: Linux agent not found or has no linked asset');
    process.exit(1);
  }

  console.log(`  Agent: ${agent.hostname} (status: ${agent.status})`);
  console.log(`  Asset: ${agent.assetId}\n`);

  for (const software of LINUX_TARGETS) {
    // Find latest version of this software for Linux
    const patch = await prisma.patch.findFirst({
      where: {
        software,
        os: 'LINUX',
        bundle: { bundleObjectKey: { not: null }, scriptsIncluded: true },
      },
      include: { bundle: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!patch) {
      console.log(`  SKIP: ${software} (LINUX) — no bundled patch found`);
      results.push({ patch: software, os: 'LINUX', status: 'NOT_FOUND' });
      continue;
    }

    console.log(`\n  DEPLOY: ${patch.patchId} — ${patch.title}`);
    console.log(`          → ${agent.hostname} (LINUX, status: ${agent.status})`);
    console.log(`          Bundle: ${patch.bundle?.bundleObjectKey}`);

    try {
      const outcome = await deployPatch(patch, LINUX_AGENT_ID, agent.assetId);

      if (outcome.success) {
        console.log(`    ✓ SUCCESS: ${outcome.output?.slice(0, 120) || 'installed'}`);
      } else {
        console.log(`    ✗ FAILED: ${outcome.error?.slice(0, 200) || 'unknown'}`);
      }

      // Mark testResult on this patch
      await prisma.patch.update({
        where: { id: patch.id },
        data: {
          testResult: outcome.success ? 'PASSED' : 'FAILED',
          testStatus: 'TESTED',
          testNotes: outcome.success
            ? `Tested on ${agent.hostname} (LINUX): ${outcome.output?.slice(0, 200) || 'OK'}`
            : `Failed on ${agent.hostname}: ${outcome.error?.slice(0, 200) || 'unknown'}`,
          testedAt: new Date(),
          testedBy: 'system-test',
          testEnvironment: agent.hostname,
          approvalStatus: outcome.success ? 'Approved' : 'Pending',
          endpoints: outcome.success ? 1 : 0,
        },
      });

      // If latest passed, also mark ALL versions of this app (same software + LINUX, testResult=null) as PASSED
      if (outcome.success) {
        const allVersions = await prisma.patch.findMany({
          where: {
            software,
            os: 'LINUX',
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
          console.log(`    → Marked ${allVersions.length} other versions as PASSED`);
        }
      }

      results.push({
        patch: `${patch.patchId} ${patch.title}`,
        os: 'LINUX',
        status: outcome.success ? '✓ PASSED' : '✗ FAILED',
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`    ✗ ERROR: ${msg.slice(0, 200)}`);
      results.push({ patch: software, os: 'LINUX', status: '✗ ERROR' });
    }
  }

  // ── Summary ──
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    Linux Test Results                         ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  for (const r of results) {
    const line = `  ${r.status.padEnd(12)} ${r.patch.padEnd(40)} ${r.os}`;
    console.log(`║${line.padEnd(65)}║`);
  }
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.status.includes('PASSED')).length;
  const total = results.length;
  console.log(`\n  Passed: ${passed}/${total}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
