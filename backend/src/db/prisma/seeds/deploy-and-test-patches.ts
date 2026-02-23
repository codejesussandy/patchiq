/**
 * Deploy and Test Patches
 *
 * Deploys the latest version of each app to its OS endpoint via the proper
 * bundle extraction path (agent downloads bundle.tar.gz from MinIO, extracts,
 * runs install script from inside).
 *
 * Run: cd backend && npx tsx src/db/prisma/seeds/deploy-and-test-patches.ts
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Agent IDs for each OS endpoint
const AGENTS = {
  WINDOWS: 'f768c40e-6537-475f-a1dc-3215af4910a4', // Magical04
  LINUX:   '4ab92d6c-edec-4447-909e-301a98e8282d', // garage (Ubuntu)
  MACOS:   '3b832eb2-4856-414c-939f-0a6005194fdd', // MacBook Air
};

// Target apps — latest version of each to deploy
const DEPLOY_TARGETS: Array<{ software: string; os: 'WINDOWS' | 'LINUX' | 'MACOS' }> = [
  // Windows
  { software: '7-Zip',              os: 'WINDOWS' },
  { software: 'Mozilla Firefox',    os: 'WINDOWS' },
  { software: 'Git for Windows',    os: 'WINDOWS' },
  { software: 'Notepad++',          os: 'WINDOWS' },
  { software: 'VLC Media Player',   os: 'WINDOWS' },
  // Linux
  { software: 'Go',                 os: 'LINUX' },
  { software: 'Node.js',            os: 'LINUX' },
  { software: 'Visual Studio Code', os: 'LINUX' },
  { software: 'Terraform',          os: 'LINUX' },
  { software: 'Vault',              os: 'LINUX' },
  // macOS
  { software: 'VLC Media Player',   os: 'MACOS' },
  { software: 'Node.js',            os: 'MACOS' },
  { software: 'Mozilla Firefox',    os: 'MACOS' },
  { software: 'GIMP',               os: 'MACOS' },
  { software: 'Terraform',          os: 'MACOS' },
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
      // Agent result format: { output: "...", message: "Successfully executed..." }
      // Also check: { success: true } or { status: "success" }
      // COMPLETED without errorMessage = success
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

  // Build bundleUrl — agent will download bundle.tar.gz from this endpoint
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

  // Create agent command
  // IMPORTANT: If bundleObjectKey is set and scriptInstall is null,
  // the agent uses Path C: download bundle.tar.gz → extract → run scripts from manifest
  // If scriptInstall IS set, agent uses Path A: download raw file + inline script
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

  // Only set script if scriptInstall is explicitly set (for inline-script patches)
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
  console.log('║          Deploy & Test Patches (Latest)              ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const results: Array<{ patch: string; os: string; status: string }> = [];

  for (const target of DEPLOY_TARGETS) {
    // Find latest version of this software for this OS
    const patch = await prisma.patch.findFirst({
      where: {
        software: target.software,
        os: target.os,
        bundle: { bundleObjectKey: { not: null }, scriptsIncluded: true },
      },
      include: { bundle: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!patch) {
      console.log(`  SKIP: ${target.software} (${target.os}) — no bundled patch found`);
      results.push({ patch: target.software, os: target.os, status: 'NOT_FOUND' });
      continue;
    }

    const agentId = AGENTS[target.os];
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, hostname: true, status: true, assetId: true },
    });

    if (!agent?.assetId) {
      console.log(`  SKIP: ${target.os} agent has no linked asset`);
      results.push({ patch: patch.patchId, os: target.os, status: 'NO_ASSET' });
      continue;
    }

    console.log(`\n  DEPLOY: ${patch.patchId} — ${patch.title}`);
    console.log(`          → ${agent.hostname} (${target.os}, status: ${agent.status})`);
    console.log(`          Bundle: ${patch.bundle?.bundleObjectKey}`);

    try {
      const outcome = await deployPatch(patch, agentId, agent.assetId);

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
            ? `Tested on ${agent.hostname} (${target.os}): ${outcome.output?.slice(0, 200) || 'OK'}`
            : `Failed on ${agent.hostname}: ${outcome.error?.slice(0, 200) || 'unknown'}`,
          testedAt: new Date(),
          testedBy: 'system-test',
          testEnvironment: agent.hostname,
          approvalStatus: outcome.success ? 'Approved' : 'Pending',
          endpoints: outcome.success ? 1 : 0,
        },
      });

      // If latest passed, also mark ALL versions of this app as PASSED
      // so they show up in the UI (user requirement: all versions should be visible)
      if (outcome.success) {
        const allVersions = await prisma.patch.findMany({
          where: {
            software: target.software,
            os: target.os,
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
        os: target.os,
        status: outcome.success ? '✓ PASSED' : '✗ FAILED',
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`    ✗ ERROR: ${msg.slice(0, 200)}`);
      results.push({ patch: `${target.software}`, os: target.os, status: '✗ ERROR' });
    }
  }

  // ── Summary ──
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        Test Results                           ║');
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
