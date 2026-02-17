#!/usr/bin/env node

/**
 * Desktop Layout Analysis Script
 * Analyzes layout scaling and whitespace for 1920px and 2560px viewports
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const VIEWPORT_CONFIGS = {
  '1920px': { width: 1920, height: 1080 },
  '2560px': { width: 2560, height: 1440 },
};

const PAGES_TO_TEST = [
  { url: '/dashboard', name: 'Dashboard', file: 'dashboard' },
  { url: '/assets', name: 'Assets', file: 'assets' },
  { url: '/patches', name: 'Patches', file: 'patches' },
  { url: '/vulnerability/vulnerabilities', name: 'Vulnerabilities', file: 'vulnerabilities' },
  { url: '/settings/user-management/users', name: 'UserManagement', file: 'user-management' },
];

const BASE_URL = 'http://localhost:5173';

// Ensure screenshot directories exist
function ensureDirectories() {
  const dirs = [
    'screenshots/desktop-1920px',
    'screenshots/desktop-2560px',
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Wait for page to load and stabilize
async function waitForPageReady(page) {
  await page.waitForLoadState('networkidle').catch(() => {
    // Continue even if networkidle times out
  });
  await page.waitForTimeout(1500);
}

// Analyze layout metrics
async function analyzeLayoutMetrics(page) {
  return page.evaluate(() => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Find main content container
    const mainContainer = document.querySelector('[class*="layout-content"]') ||
                          document.querySelector('main') ||
                          document.querySelector('[role="main"]');

    const body = document.body;
    const tables = document.querySelectorAll('table');
    const cards = document.querySelectorAll('[class*="card"]');
    const rows = document.querySelectorAll('[class*="row"]');

    const getElementMetrics = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        maxWidth: style.maxWidth,
        padding: style.padding,
        margin: style.margin,
      };
    };

    // Calculate unused space
    const bodyWidth = body.offsetWidth;
    const contentPadding = (bodyWidth - (mainContainer?.offsetWidth || bodyWidth)) / 2;

    // Get table metrics
    const tableMetrics = Array.from(tables).map(table => ({
      width: table.offsetWidth,
      maxWidth: window.getComputedStyle(table).maxWidth,
    }));

    // Get card grid info
    const cardWidths = Array.from(cards)
      .slice(0, 5)
      .map(card => card.offsetWidth);

    return {
      viewport,
      bodyWidth: Math.round(bodyWidth),
      mainContainerWidth: mainContainer ? Math.round(mainContainer.offsetWidth) : null,
      mainContainerMaxWidth: mainContainer ? window.getComputedStyle(mainContainer).maxWidth : null,
      contentPadding: Math.round(contentPadding),
      unusedWidthPercentage: mainContainer ?
        (((bodyWidth - mainContainer.offsetWidth) / bodyWidth) * 100).toFixed(1) :
        0,
      tableCount: tables.length,
      tableMetrics,
      cardCount: cards.length,
      cardWidths: cardWidths.length > 0 ? cardWidths : null,
      rowCount: rows.length,
      hasFluidContent: mainContainer ? mainContainer.offsetWidth === bodyWidth : false,
    };
  });
}

// Take screenshots at both resolutions
async function captureScreenshots(page, pageName) {
  const results = {};

  for (const [viewport, config] of Object.entries(VIEWPORT_CONFIGS)) {
    await page.setViewportSize(config);
    await page.waitForTimeout(500);

    const fileName = `screenshots/desktop-${viewport}/${pageName}.png`;
    await page.screenshot({ path: fileName, fullPage: true });
    console.log(`  ✓ Captured ${fileName}`);

    results[viewport] = fileName;
  }

  return results;
}

// Main execution
async function main() {
  console.log('\n=== Phase 5B Agent 45: Desktop Layout Testing ===\n');

  ensureDirectories();

  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Load auth state if available
  try {
    const authFile = './auth.json';
    if (fs.existsSync(authFile)) {
      const authState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      context.addInitRoute('**/*', route => {
        route.continue();
      });
      await context.addCookies(authState.cookies || []);
      console.log('✓ Loaded authentication state\n');
    }
  } catch (err) {
    console.log('⚠ Could not load auth state, will test public pages only\n');
  }

  const page = await context.newPage();

  const analysisResults = {
    timestamp: new Date().toISOString(),
    pages: {},
    summary: {},
  };

  // Test each page
  for (const pageInfo of PAGES_TO_TEST) {
    console.log(`\nAnalyzing: ${pageInfo.name}`);
    console.log('═'.repeat(50));

    try {
      await page.goto(`${BASE_URL}${pageInfo.url}`);
      await waitForPageReady(page);

      const screenshots = await captureScreenshots(page, pageInfo.file);

      // Analyze at each viewport
      const metricsData = {};
      for (const [viewport, config] of Object.entries(VIEWPORT_CONFIGS)) {
        await page.setViewportSize(config);
        await page.waitForTimeout(500);

        const metrics = await analyzeLayoutMetrics(page);
        metricsData[viewport] = metrics;

        console.log(`\n  ${viewport}:`);
        console.log(`    Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
        console.log(`    Content width: ${metrics.mainContainerWidth}px`);
        console.log(`    Content max-width: ${metrics.mainContainerMaxWidth}`);
        console.log(`    Body width: ${metrics.bodyWidth}px`);
        console.log(`    Unused width: ${metrics.unusedWidthPercentage}%`);
        console.log(`    Has fluid content: ${metrics.hasFluidContent}`);
        console.log(`    Tables: ${metrics.tableCount}`);
        console.log(`    Cards: ${metrics.cardCount}`);
      }

      // Calculate scaling
      const width1920 = metricsData['1920px'].mainContainerWidth || metricsData['1920px'].bodyWidth;
      const width2560 = metricsData['2560px'].mainContainerWidth || metricsData['2560px'].bodyWidth;
      const scalingPercent = ((width2560 - width1920) / width1920 * 100).toFixed(1);
      const scalingType = Math.abs(parseFloat(scalingPercent)) > 20 ? 'Fluid' : 'Constrained';

      analysisResults.pages[pageInfo.name] = {
        url: pageInfo.url,
        screenshots,
        metrics: metricsData,
        scaling: {
          percentageIncrease: parseFloat(scalingPercent),
          type: scalingType,
        },
      };

      console.log(`\n  Scaling from 1920px to 2560px: ${scalingPercent}% (${scalingType})`);
    } catch (error) {
      console.error(`  ✗ Error analyzing ${pageInfo.name}:`, error.message);
    }
  }

  // Generate summary
  console.log('\n\n=== Summary ===\n');

  let goodWhitespaceCount = 0;
  let excessiveWhitespaceCount = 0;
  let fluidLayoutCount = 0;
  let constrainedLayoutCount = 0;

  for (const [pageName, pageData] of Object.entries(analysisResults.pages)) {
    const metrics2560 = pageData.metrics['2560px'];

    // Assess whitespace
    const unusedPercent = parseFloat(metrics2560.unusedWidthPercentage);
    const whitespaceStatus = unusedPercent > 20 ? 'Excessive' : 'Good';

    if (whitespaceStatus === 'Good') goodWhitespaceCount++;
    else excessiveWhitespaceCount++;

    if (pageData.scaling.type === 'Fluid') fluidLayoutCount++;
    else constrainedLayoutCount++;

    console.log(`${pageName}:`);
    console.log(`  Whitespace: ${whitespaceStatus} (${unusedPercent}% unused)`);
    console.log(`  Scaling: ${pageData.scaling.type} (${pageData.scaling.percentageIncrease}%)`);
  }

  analysisResults.summary = {
    totalPages: PAGES_TO_TEST.length,
    whitespaceAssessment: {
      good: goodWhitespaceCount,
      excessive: excessiveWhitespaceCount,
    },
    scalingAssessment: {
      fluid: fluidLayoutCount,
      constrained: constrainedLayoutCount,
    },
  };

  // Save results to JSON
  const resultsPath = 'screenshots/desktop-layout-analysis.json';
  fs.writeFileSync(resultsPath, JSON.stringify(analysisResults, null, 2));
  console.log(`\n✓ Analysis results saved to ${resultsPath}`);

  await browser.close();
  console.log('\n✓ Analysis complete\n');
}

main().catch(console.error);
