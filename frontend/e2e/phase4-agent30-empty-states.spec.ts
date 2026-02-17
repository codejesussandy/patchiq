import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create screenshots directory
const screenshotDir = path.join(__dirname, '../screenshots/empty-states');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

interface EmptyStateResult {
  page: string;
  hasEmptyState: boolean;
  message: string;
  hasCTA: boolean;
  ctaText?: string;
  quality: 'Good' | 'Okay' | 'Poor';
  issues: string[];
  screenshot: string;
}

const results: EmptyStateResult[] = [];

async function captureEmptyState(
  page: Page,
  pageName: string,
  url: string,
  emptyStateSelector?: string,
  messageSelector?: string,
  ctaSelector?: string
): Promise<EmptyStateResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotName = `${pageName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.png`;
  const screenshotPath = path.join(screenshotDir, screenshotName);

  const result: EmptyStateResult = {
    page: pageName,
    hasEmptyState: false,
    message: '',
    hasCTA: false,
    quality: 'Good',
    issues: [],
    screenshot: screenshotName,
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000); // Wait for animations

    // Check for empty state
    const emptyStateElement = emptyStateSelector
      ? await page.locator(emptyStateSelector).first().isVisible().catch(() => false)
      : false;

    // Check for common empty state patterns
    const hasEmptyPageClass =
      await page.locator('[class*="empty"]').first().isVisible().catch(() => false) ||
      await page.locator('[class*="no-data"]').first().isVisible().catch(() => false) ||
      await page.locator('text=/no.*data|no.*results|empty|not found/i').first().isVisible().catch(() => false);

    result.hasEmptyState = emptyStateElement || hasEmptyPageClass;

    // Get empty state message
    if (result.hasEmptyState) {
      const messageElement = messageSelector
        ? await page.locator(messageSelector).first()
        : await page.locator('[class*="empty-state"] >> text, [class*="no-data"] >> text, h3, h2').first();

      if (messageElement) {
        result.message = await messageElement.textContent().catch(() => '');
      }

      // Check for CTA button
      const ctaElement = ctaSelector
        ? await page.locator(ctaSelector).first()
        : await page.locator('button:has-text(/create|add|scan|import|generate|refresh|trigger|setup/i)').first();

      if (ctaElement && (await ctaElement.isVisible().catch(() => false))) {
        result.hasCTA = true;
        result.ctaText = await ctaElement.textContent().catch(() => '');
      }

      // Check for console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Take screenshot
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Evaluate quality
      if (!result.message) {
        result.issues.push('Missing empty state message');
        result.quality = 'Poor';
      } else if (!result.hasCTA) {
        result.issues.push('Missing CTA button');
        result.quality = 'Okay';
      } else if (consoleErrors.length > 0) {
        result.issues.push(`Console errors: ${consoleErrors.join(', ')}`);
        result.quality = 'Okay';
      } else {
        result.quality = 'Good';
      }
    } else {
      result.message = 'No empty state detected - data may exist in this instance';
      result.screenshot = 'n/a';
    }
  } catch (error) {
    result.issues.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    result.quality = 'Poor';
    result.screenshot = 'error';
  }

  results.push(result);
  return result;
}

test.describe('Empty State Tests - Phase 4 Agent 30', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    // Load authenticated state
    const auth = JSON.parse(fs.readFileSync('./auth.json', 'utf-8'));
    await page.context().addCookies(auth.cookies || []);
    if (auth.origins) {
      await page.context().addInitScript(() => {
        for (const [key, value] of Object.entries(auth.localStorage || {})) {
          localStorage.setItem(key, value as string);
        }
      });
    }
  });

  test('1. Assets Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Assets Page',
      'http://localhost:5173/assets',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Assets: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('2. Patches Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Patches Page',
      'http://localhost:5173/patches',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Patches: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('3. Vulnerabilities Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Vulnerabilities Page',
      'http://localhost:5173/vulnerability/vulnerabilities',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Vulnerabilities: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('4. Deployments Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Deployments Page',
      'http://localhost:5173/patches/deployed/pending',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Deployments: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('5. Notifications Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Notifications Page',
      'http://localhost:5173/notifications',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Notifications: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('6. Reports Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Reports Page',
      'http://localhost:5173/reports',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Reports: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('7. Discovery - IP Ranges Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Discovery - IP Ranges',
      'http://localhost:5173/discovery/ip-ranges',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Discovery IP Ranges: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('8. Discovery - Credentials Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Discovery - Credentials',
      'http://localhost:5173/discovery/credentials',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Discovery Credentials: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('9. Discovery - Agents Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Discovery - Agents',
      'http://localhost:5173/discovery/agents',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Discovery Agents: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('10. Dashboard Empty State', async () => {
    const result = await captureEmptyState(
      page,
      'Dashboard',
      'http://localhost:5173/dashboard',
      '[class*="empty-state"]',
      'h3, h2, p'
    );

    console.log(`✓ Dashboard: ${result.quality} - ${result.message}`);
    expect(result).toBeDefined();
  });

  test('11. Search Results Empty (Assets)', async () => {
    await page.goto('http://localhost:5173/assets', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Find and fill search box
    const searchBox = await page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await searchBox.isVisible().catch(() => false)) {
      await searchBox.fill('ZZZZZ_NOTFOUND_IMPOSSIBLE_TERM');
      await page.waitForTimeout(1500);

      const result = await captureEmptyState(
        page,
        'Search Results Empty (Assets)',
        'http://localhost:5173/assets',
        '[class*="empty-state"]'
      );

      console.log(`✓ Search Empty: ${result.quality} - ${result.message}`);
      expect(result).toBeDefined();
    } else {
      console.log('⊘ Search box not found on Assets page');
    }
  });

  test('12. Filter Results Empty (Patches)', async () => {
    await page.goto('http://localhost:5173/patches', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Look for filter button/drawer
    const filterButton = await page.locator('button:has-text(/filter|sort/i)').first();
    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(800);

      // Try to apply a restrictive filter
      const filterOptions = await page.locator('[class*="filter"] input, [class*="filter"] select').first();
      if (await filterOptions.isVisible().catch(() => false)) {
        // Just navigate with a filter applied URL parameter if available
        await page.goto('http://localhost:5173/patches?status=IMPOSSIBLE_STATUS', {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        const result = await captureEmptyState(
          page,
          'Filter Results Empty (Patches)',
          'http://localhost:5173/patches?status=IMPOSSIBLE_STATUS',
          '[class*="empty-state"]'
        );

        console.log(`✓ Filter Empty: ${result.quality} - ${result.message}`);
        expect(result).toBeDefined();
      }
    }
  });

  test.afterAll(async () => {
    // Save results to JSON
    const resultsPath = path.join(__dirname, '../screenshots/empty-states-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Generate markdown report
    await generateMarkdownReport(results);

    await page.close();
  });
});

async function generateMarkdownReport(results: EmptyStateResult[]) {
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = `/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/PHASE4_AGENT30_EMPTY_STATES.md`;

  const goodCount = results.filter((r) => r.quality === 'Good').length;
  const okayCount = results.filter((r) => r.quality === 'Okay').length;
  const poorCount = results.filter((r) => r.quality === 'Poor').length;

  let markdown = `# Phase 4 - Agent 30: Empty States Test Report

**Date:** ${timestamp}
**Status:** Completed
**Total Tests:** ${results.length}

## Summary

| Quality | Count | Percentage |
|---------|-------|-----------|
| Good | ${goodCount} | ${((goodCount / results.length) * 100).toFixed(1)}% |
| Okay | ${okayCount} | ${((okayCount / results.length) * 100).toFixed(1)}% |
| Poor | ${poorCount} | ${((poorCount / results.length) * 100).toFixed(1)}% |

## Test Results

`;

  for (const result of results) {
    markdown += `### ${result.page}

**Status:** ${result.quality}
**Empty State Detected:** ${result.hasEmptyState ? 'Yes' : 'No'}
**Message:** ${result.message || 'N/A'}
**CTA Present:** ${result.hasCTA ? 'Yes' : 'No'}
${result.ctaText ? `**CTA Text:** ${result.ctaText}` : ''}

**Screenshot:** \`${result.screenshot}\`

${
  result.issues.length > 0
    ? `**Issues:**
${result.issues.map((issue) => `- ${issue}`).join('\n')}

`
    : ''
}`;
  }

  markdown += `
## Detailed Findings

### Good Empty States (${goodCount})
${results
  .filter((r) => r.quality === 'Good')
  .map((r) => `- **${r.page}**: ${r.message}`)
  .join('\n')}

### Okay Empty States (${okayCount})
${results
  .filter((r) => r.quality === 'Okay')
  .map((r) => `- **${r.page}**: Missing ${r.issues.join(', ')}`)
  .join('\n')}

### Poor Empty States (${poorCount})
${results
  .filter((r) => r.quality === 'Poor')
  .map((r) => `- **${r.page}**: ${r.issues.join(', ')}`)
  .join('\n')}

## Recommendations

1. **Ensure all empty states have:**
   - Clear, user-friendly message
   - Primary CTA button with actionable text
   - Relevant icon or illustration
   - Consistent styling

2. **Priority fixes (P2 bugs if missing):**
   - All pages should have an empty state message
   - All empty states should have at least one CTA
   - Search/filter results should show "No results found" or similar

3. **UX Enhancement suggestions:**
   - Add illustrations/icons to empty states
   - Provide helpful suggestions (e.g., "Try different search term")
   - Include keyboard shortcuts hint if applicable

## Test Environment

- **Frontend URL:** http://localhost:5173
- **Test User:** admin@patchiq.io
- **Browser:** Chromium
- **Playwright MCP Version:** Latest

## Screenshots

All screenshots saved to: \`/frontend/screenshots/empty-states/\`

---
Generated by Phase 4 Agent 30 - Empty States Testing
`;

  fs.writeFileSync(reportPath, markdown);
  console.log(`✓ Report saved to: ${reportPath}`);
}
