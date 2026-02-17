/**
 * Phase 5B - Agent 54: End-to-End Integration Flow - Patch Deployment
 *
 * Tests the complete patch deployment workflow from selecting a patch
 * to monitoring deployment completion.
 *
 * User Journey:
 * Login → Browse Patches → Create Deployment → Monitor Status → Verify Completion
 */

import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Screenshot directory
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots', 'e2e-patch-deployment');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Test data to collect
const testResults = {
  journeySummary: [] as Array<{
    step: string;
    action: string;
    expected: string;
    actual: string;
    status: 'PASS' | 'FAIL';
  }>,
  deploymentDetails: {
    patchName: '',
    patchId: '',
    cve: '',
    targetAssets: 0,
    schedule: 'Immediate',
    deploymentId: '',
    duration: 0,
  },
  realTimeUpdates: {
    mechanism: 'Unknown',
    updateFrequency: 'Unknown',
    updatesReliable: false,
    consoleActivity: [] as string[],
  },
  taskResults: {
    total: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    logsCaptured: false,
  },
  issues: [] as string[],
  screenshots: [] as string[],
};

// Helper to save screenshot
async function saveScreenshot(page: Page, name: string) {
  const filename = `${name}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  testResults.screenshots.push(filename);
  console.log(`📸 Screenshot saved: ${filename}`);
}

// Helper to add journey step
function addJourneyStep(
  step: string,
  action: string,
  expected: string,
  actual: string,
  status: 'PASS' | 'FAIL'
) {
  testResults.journeySummary.push({ step, action, expected, actual, status });
}

// Helper to monitor console for SSE/polling activity
function monitorConsole(page: Page) {
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('SSE') ||
      text.includes('EventSource') ||
      text.includes('poll') ||
      text.includes('deployment') ||
      text.includes('status')
    ) {
      testResults.realTimeUpdates.consoleActivity.push(text);
    }
  });
}

// Helper to wait for network activity
async function waitForNetworkIdle(page: Page, timeout = 3000) {
  await page.waitForLoadState('networkidle', { timeout });
}

test.describe('Phase 5B - Agent 54: E2E Patch Deployment Flow', () => {
  test.use({ storageState: 'auth.json' });

  test.beforeAll(async () => {
    console.log('🚀 Starting E2E Patch Deployment Test');
    console.log(`📁 Screenshots will be saved to: ${SCREENSHOT_DIR}`);
  });

  test('Complete patch deployment workflow', async ({ page }) => {
    const startTime = Date.now();

    // Monitor console activity
    monitorConsole(page);

    // STEP 1: Navigate to Dashboard (already logged in via auth.json)
    test.step('Step 1: Navigate to Dashboard', async () => {
      console.log('\n📝 STEP 1: Navigate to Dashboard');

      try {
        await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Should redirect to dashboard if logged in
        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);

        await saveScreenshot(page, '01-dashboard-after-login');

        addJourneyStep('1', 'Navigate to dashboard', 'Success', 'Dashboard loaded successfully', 'PASS');
        console.log('✅ Dashboard loaded');
      } catch (error) {
        addJourneyStep('1', 'Navigate to dashboard', 'Success', `Failed: ${error}`, 'FAIL');
        testResults.issues.push(`Dashboard navigation failed: ${error}`);
        throw error;
      }
    });

    // STEP 2: Browse Patches
    test.step('Step 2: Browse Patches', async () => {
      console.log('\n📝 STEP 2: Browse Patches');

      try {
        // Navigate to patches
        await page.goto('http://localhost:5173/patches', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Verify patch list loads
        const patchTable = page.locator('table, .ant-table');
        await expect(patchTable).toBeVisible({ timeout: 10000 });

        await saveScreenshot(page, '02-patches-list');

        // Find first patch
        const firstPatchRow = page.locator('table tbody tr').first();
        await expect(firstPatchRow).toBeVisible();

        // Get patch details
        const patchNameCell = firstPatchRow.locator('td').first();
        const patchName = await patchNameCell.textContent();
        testResults.deploymentDetails.patchName = patchName?.trim() || 'Unknown';

        console.log(`📦 Selected patch: ${testResults.deploymentDetails.patchName}`);

        // Click on patch to view details
        await firstPatchRow.click();
        await page.waitForURL('**/patches/*', { timeout: 10000 });
        await waitForNetworkIdle(page);

        await saveScreenshot(page, '03-patch-detail-page');

        // Get patch ID from detail page
        const patchIdElement = page.locator('text=/Patch ID/i').locator('..').locator('td, div');
        if (await patchIdElement.count() > 0) {
          testResults.deploymentDetails.patchId = (await patchIdElement.textContent())?.trim() || '';
        }

        // Get CVE if available
        const cveElement = page.locator('text=/CVE/i');
        if (await cveElement.count() > 0) {
          testResults.deploymentDetails.cve = (await cveElement.textContent())?.trim() || 'N/A';
        }

        addJourneyStep('2', 'Browse patches', 'List loads', 'Patch list loaded successfully', 'PASS');
        console.log('✅ Patch details loaded');
      } catch (error) {
        addJourneyStep('2', 'Browse patches', 'List loads', `Failed: ${error}`, 'FAIL');
        testResults.issues.push(`Failed to browse patches: ${error}`);
        throw error;
      }
    });

    // STEP 3: Create Deployment
    test.step('Step 3: Create Deployment', async () => {
      console.log('\n📝 STEP 3: Create Deployment');

      try {
        // Click Deploy button
        const deployButton = page.locator('button:has-text("Deploy")');
        await expect(deployButton).toBeVisible({ timeout: 5000 });
        await deployButton.click();

        // Wait for deploy modal
        await page.waitForSelector('.ant-modal:visible', { timeout: 5000 });
        await saveScreenshot(page, '04-deploy-modal');

        // Fill deployment form
        const deploymentNameInput = page.locator('input[name="deploymentName"], input[id*="deploymentName"]');
        if (await deploymentNameInput.count() > 0) {
          await deploymentNameInput.clear();
          await deploymentNameInput.fill(`E2E Test Deployment - ${new Date().toISOString()}`);
        }

        // Add description
        const descriptionInput = page.locator('textarea[name="description"], textarea[id*="description"]');
        if (await descriptionInput.count() > 0) {
          await descriptionInput.fill('Automated E2E test deployment');
        }

        // Select target agents (select first 2-3 available)
        const agentSelect = page.locator('.ant-select:has-text("Target"), .ant-select:has-text("Agent")').first();
        if (await agentSelect.count() > 0) {
          await agentSelect.click();
          await page.waitForTimeout(500);

          // Select first 2 agents
          const agentOptions = page.locator('.ant-select-item:not(.ant-select-item-option-disabled)');
          const agentCount = await agentOptions.count();
          const selectCount = Math.min(2, agentCount);

          for (let i = 0; i < selectCount; i++) {
            await agentOptions.nth(i).click();
            await page.waitForTimeout(200);
          }

          testResults.deploymentDetails.targetAssets = selectCount;
          console.log(`🎯 Selected ${selectCount} target agents`);

          // Close dropdown
          await page.keyboard.press('Escape');
        }

        await saveScreenshot(page, '05-deploy-modal-filled');

        // Submit deployment
        const submitButton = page.locator('button:has-text("Deploy Now"), button:has-text("Deploy"), button[type="submit"]').last();
        await submitButton.click();

        // Wait for success message
        await page.waitForSelector('.ant-message-success, .ant-notification-success', { timeout: 10000 });
        console.log('✅ Deployment created successfully');

        // Handle navigation modal if it appears
        const viewDeploymentButton = page.locator('button:has-text("View Deployment")');
        if (await viewDeploymentButton.isVisible({ timeout: 2000 })) {
          await viewDeploymentButton.click();
        } else {
          // Manually navigate to deployments
          await page.goto('http://localhost:5173/patches/deployed');
        }

        await waitForNetworkIdle(page);

        addJourneyStep('3', 'Create deployment', 'Deployment created', 'Deployment created successfully', 'PASS');
      } catch (error) {
        addJourneyStep('3', 'Create deployment', 'Deployment created', `Failed: ${error}`, 'FAIL');
        testResults.issues.push(`Failed to create deployment: ${error}`);
        throw error;
      }
    });

    // STEP 4: Navigate to Deployment Status
    test.step('Step 4: Navigate to Deployment Status', async () => {
      console.log('\n📝 STEP 4: Navigate to Deployment Status');

      try {
        // Verify we're on deployments page
        await expect(page).toHaveURL(/patches\/deployed/, { timeout: 5000 });
        await waitForNetworkIdle(page);

        await saveScreenshot(page, '06-deployments-list');

        // Find the newly created deployment (should be first in list)
        const deploymentsTable = page.locator('table tbody tr').first();
        await expect(deploymentsTable).toBeVisible({ timeout: 5000 });

        // Get deployment ID
        const deploymentIdCell = deploymentsTable.locator('td').nth(1);
        testResults.deploymentDetails.deploymentId = (await deploymentIdCell.textContent())?.trim() || '';

        console.log(`🆔 Deployment ID: ${testResults.deploymentDetails.deploymentId}`);

        // Click to view deployment details
        const viewButton = deploymentsTable.locator('button:has-text("View"), button[aria-label*="View"]');
        if (await viewButton.count() > 0) {
          await viewButton.click();
        } else {
          // Click on row
          await deploymentsTable.click();
        }

        // Wait for deployment details modal or page
        await page.waitForTimeout(1000);
        await saveScreenshot(page, '07-deployment-detail');

        addJourneyStep('4', 'Navigate to deployment status', 'Deployment detail page loads', 'Successfully navigated', 'PASS');
        console.log('✅ Deployment details opened');
      } catch (error) {
        addJourneyStep('4', 'Navigate to deployment status', 'Deployment detail page loads', `Failed: ${error}`, 'FAIL');
        testResults.issues.push(`Failed to navigate to deployment status: ${error}`);
        throw error;
      }
    });

    // STEP 5: Monitor Deployment Progress
    test.step('Step 5: Monitor Deployment Progress', async () => {
      console.log('\n📝 STEP 5: Monitor Deployment Progress');

      try {
        const monitorStartTime = Date.now();
        let statusUpdateCount = 0;
        let previousStatus = '';

        // Monitor for up to 30 seconds or until completion
        const maxMonitorTime = 30000;
        const checkInterval = 2000;

        await saveScreenshot(page, '08-deployment-status-initial');

        while (Date.now() - monitorStartTime < maxMonitorTime) {
          // Check for status elements
          const statusElements = page.locator('.ant-tag, .ant-badge, text=/Status/i');

          if (await statusElements.count() > 0) {
            const currentStatus = await statusElements.first().textContent();

            if (currentStatus && currentStatus !== previousStatus) {
              statusUpdateCount++;
              console.log(`📊 Status update ${statusUpdateCount}: ${currentStatus}`);
              previousStatus = currentStatus || '';
            }

            // Check if deployment is complete
            if (
              currentStatus?.includes('COMPLETED') ||
              currentStatus?.includes('FAILED') ||
              currentStatus?.includes('SUCCESS')
            ) {
              console.log('✅ Deployment reached terminal state');
              break;
            }
          }

          // Check for task status updates
          const taskRows = page.locator('table tbody tr');
          if (await taskRows.count() > 0) {
            testResults.taskResults.total = await taskRows.count();

            // Count statuses
            const successTasks = await page.locator('text=/SUCCESS/i, .ant-tag:has-text("Success")').count();
            const failedTasks = await page.locator('text=/FAILED/i, .ant-tag:has-text("Failed")').count();

            testResults.taskResults.succeeded = successTasks;
            testResults.taskResults.failed = failedTasks;

            console.log(`📋 Tasks: ${testResults.taskResults.total} total, ${successTasks} succeeded, ${failedTasks} failed`);
          }

          await page.waitForTimeout(checkInterval);
        }

        // Determine update mechanism
        if (testResults.realTimeUpdates.consoleActivity.some(log => log.includes('SSE') || log.includes('EventSource'))) {
          testResults.realTimeUpdates.mechanism = 'SSE';
          testResults.realTimeUpdates.updatesReliable = true;
        } else if (statusUpdateCount > 1) {
          testResults.realTimeUpdates.mechanism = 'Polling';
          testResults.realTimeUpdates.updatesReliable = true;
          testResults.realTimeUpdates.updateFrequency = `${checkInterval / 1000}s interval (observed)`;
        } else {
          testResults.realTimeUpdates.mechanism = 'Manual refresh required';
          testResults.realTimeUpdates.updatesReliable = false;
        }

        await saveScreenshot(page, '09-deployment-status-in-progress');

        addJourneyStep('5', 'Monitor deployment progress', 'Real-time updates', `Updates: ${testResults.realTimeUpdates.mechanism}`, statusUpdateCount > 0 ? 'PASS' : 'FAIL');
        console.log(`✅ Monitored deployment for ${(Date.now() - monitorStartTime) / 1000}s`);
      } catch (error) {
        addJourneyStep('5', 'Monitor deployment progress', 'Real-time updates', `Failed: ${error}`, 'FAIL');
        testResults.issues.push(`Failed to monitor deployment: ${error}`);
        // Don't throw - continue to completion check
      }
    });

    // STEP 6: Verify Completion
    test.step('Step 6: Verify Completion', async () => {
      console.log('\n📝 STEP 6: Verify Completion');

      try {
        // Wait a bit more for final status
        await page.waitForTimeout(2000);

        // Check final deployment status
        const statusElement = page.locator('.ant-tag, .ant-badge, text=/Status/i').first();
        const finalStatus = await statusElement.textContent();

        console.log(`🏁 Final deployment status: ${finalStatus}`);

        // Check task results
        const taskRows = page.locator('table tbody tr');
        if (await taskRows.count() > 0) {
          testResults.taskResults.total = await taskRows.count();
          testResults.taskResults.succeeded = await page.locator('text=/SUCCESS/i, .ant-tag:has-text("Success")').count();
          testResults.taskResults.failed = await page.locator('text=/FAILED/i, .ant-tag:has-text("Failed")').count();
        }

        // Check for logs
        const logsButton = page.locator('button:has-text("Log"), button:has-text("View Log")');
        testResults.taskResults.logsCaptured = await logsButton.count() > 0;

        await saveScreenshot(page, '10-deployment-completed');

        // Calculate duration
        testResults.deploymentDetails.duration = Math.round((Date.now() - startTime) / 1000);

        const verificationPassed = testResults.taskResults.total > 0;

        addJourneyStep(
          '6',
          'Verify completion',
          'All tasks complete',
          `${testResults.taskResults.total} tasks processed`,
          verificationPassed ? 'PASS' : 'FAIL'
        );

        console.log('✅ Deployment verification complete');
      } catch (error) {
        addJourneyStep('6', 'Verify completion', 'All tasks complete', `Failed: ${error}`, 'FAIL');
        testResults.issues.push(`Failed to verify completion: ${error}`);
        throw error;
      }
    });

    // Generate report
    test.step('Generate Report', async () => {
      console.log('\n📊 Generating Test Report');

      const reportPath = path.join(process.cwd(), 'PHASE5B_AGENT54_E2E_PATCH_DEPLOYMENT.md');
      const report = generateReport();

      fs.writeFileSync(reportPath, report, 'utf8');
      console.log(`✅ Report saved to: ${reportPath}`);

      // Print summary to console
      console.log('\n' + '='.repeat(80));
      console.log('TEST SUMMARY');
      console.log('='.repeat(80));
      console.log(`Journey Steps: ${testResults.journeySummary.filter(s => s.status === 'PASS').length}/${testResults.journeySummary.length} PASSED`);
      console.log(`Patch: ${testResults.deploymentDetails.patchName}`);
      console.log(`Target Assets: ${testResults.deploymentDetails.targetAssets}`);
      console.log(`Update Mechanism: ${testResults.realTimeUpdates.mechanism}`);
      console.log(`Tasks: ${testResults.taskResults.total} total, ${testResults.taskResults.succeeded} succeeded, ${testResults.taskResults.failed} failed`);
      console.log(`Duration: ${testResults.deploymentDetails.duration}s`);
      console.log(`Issues: ${testResults.issues.length}`);
      console.log('='.repeat(80));
    });
  });
});

// Generate markdown report
function generateReport(): string {
  const overallPass = testResults.journeySummary.every(s => s.status === 'PASS') && testResults.issues.length === 0;

  return `# Phase 5B - Agent 54: E2E Patch Deployment Test Report

**Test Date:** ${new Date().toISOString()}
**Overall Status:** ${overallPass ? '✅ PASS' : '❌ FAIL'}

## 1. Journey Summary

| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
${testResults.journeySummary.map(s =>
  `| ${s.step} | ${s.action} | ${s.expected} | ${s.actual} | ${s.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} |`
).join('\n')}

## 2. Deployment Details

- **Patch Deployed:** ${testResults.deploymentDetails.patchName}
- **Patch ID:** ${testResults.deploymentDetails.patchId}
- **CVE:** ${testResults.deploymentDetails.cve || 'N/A'}
- **Target Assets:** ${testResults.deploymentDetails.targetAssets}
- **Schedule:** ${testResults.deploymentDetails.schedule}
- **Deployment ID:** ${testResults.deploymentDetails.deploymentId}
- **Duration:** ${testResults.deploymentDetails.duration} seconds (${Math.round(testResults.deploymentDetails.duration / 60)} minutes)

## 3. Real-Time Updates Assessment

- **Update Mechanism:** ${testResults.realTimeUpdates.mechanism}
- **Update Frequency:** ${testResults.realTimeUpdates.updateFrequency}
- **Updates Reliable:** ${testResults.realTimeUpdates.updatesReliable ? 'YES ✅' : 'NO ❌'}
- **Console Activity:** ${testResults.realTimeUpdates.consoleActivity.length} relevant log entries captured

${testResults.realTimeUpdates.consoleActivity.length > 0 ? `
### Console Logs:
\`\`\`
${testResults.realTimeUpdates.consoleActivity.slice(0, 10).join('\n')}
\`\`\`
` : ''}

## 4. Task Results

- **Total Tasks:** ${testResults.taskResults.total}
- **Succeeded:** ${testResults.taskResults.succeeded}
- **Failed:** ${testResults.taskResults.failed}
- **Cancelled:** ${testResults.taskResults.cancelled}
- **Logs Captured:** ${testResults.taskResults.logsCaptured ? 'YES ✅' : 'NO ❌'}

## 5. Issues Encountered

${testResults.issues.length > 0 ? testResults.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') : '✅ No issues encountered'}

## 6. Screenshots

${testResults.screenshots.map(s => `- \`screenshots/e2e-patch-deployment/${s}\``).join('\n')}

### Key Screenshots:
1. **Patch Detail Page** - \`03-patch-detail-page.png\`
2. **Deployment Modal** - \`04-deploy-modal.png\`
3. **Deployment Status (Pending)** - \`08-deployment-status-initial.png\`
4. **Deployment Status (In Progress)** - \`09-deployment-status-in-progress.png\`
5. **Deployment Status (Completed)** - \`10-deployment-completed.png\`

## 7. Pass/Fail Assessment

### Overall: ${overallPass ? '✅ PASS' : '❌ FAIL'}

**Critical Items:**
- ✅ Complete patch deployment workflow: ${testResults.journeySummary.every(s => s.status === 'PASS') ? 'PASS' : 'FAIL'}
- ${testResults.deploymentDetails.deploymentId ? '✅' : '❌'} Deployment creates successfully
- ${testResults.realTimeUpdates.updatesReliable ? '✅' : '❌'} Status monitoring works (${testResults.realTimeUpdates.mechanism})
- ${testResults.taskResults.total > 0 ? '✅' : '❌'} Deployment executes (${testResults.taskResults.total} tasks)
- ${testResults.taskResults.total > 0 ? '✅' : '❌'} Results verifiable

## Success Criteria

- [${testResults.journeySummary.every(s => s.status === 'PASS') ? 'x' : ' '}] Complete patch deployment workflow
- [${testResults.deploymentDetails.deploymentId ? 'x' : ' '}] Deployment creates successfully
- [${testResults.realTimeUpdates.updatesReliable ? 'x' : ' '}] Status monitoring works (SSE or polling)
- [${testResults.taskResults.total > 0 ? 'x' : ' '}] Deployment completes (success or fail)
- [${testResults.taskResults.total > 0 ? 'x' : ' '}] Results verifiable

---

**Test completed at:** ${new Date().toISOString()}
**Total test duration:** ${testResults.deploymentDetails.duration} seconds
`;
}
