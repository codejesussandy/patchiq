#!/usr/bin/env node

/**
 * Phase 5B - Agent 40: Lighthouse Report Analyzer
 * Parses Lighthouse JSON reports and generates comprehensive analysis
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '../lighthouse-reports');
const OUTPUT_FILE = path.join(__dirname, '../PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md');

// Performance targets
const TARGETS = {
  performance: 85,
  fcp: 1.8,
  lcp: 2.5,
  tti: 3.8,
  tbt: 200,
  cls: 0.1,
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function parseReport(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const audits = data.audits;
    const categories = data.categories;

    return {
      performance: Math.round(categories.performance.score * 100),
      fcp: audits['first-contentful-paint'].numericValue / 1000,
      lcp: audits['largest-contentful-paint'].numericValue / 1000,
      tti: audits['interactive'].numericValue / 1000,
      tbt: audits['total-blocking-time'].numericValue,
      cls: audits['cumulative-layout-shift'].numericValue,
      speedIndex: audits['speed-index'].numericValue / 1000,

      // Bundle sizes
      totalByteWeight: audits['total-byte-weight']?.numericValue || 0,

      // Detailed metrics
      bootupTime: audits['bootup-time']?.numericValue || 0,
      mainThreadWork: audits['mainthread-work-breakdown']?.numericValue || 0,

      // Opportunities (sorted by savings)
      opportunities: Object.entries(audits)
        .filter(([key, audit]) => audit.details?.type === 'opportunity')
        .map(([key, audit]) => ({
          id: key,
          title: audit.title,
          savings: audit.numericValue / 1000,
          savingsBytes: audit.details?.overallSavingsBytes || 0,
          items: audit.details?.items || [],
        }))
        .sort((a, b) => b.savings - a.savings)
        .slice(0, 10),

      // Diagnostics
      diagnostics: Object.entries(audits)
        .filter(([key, audit]) =>
          audit.details?.type === 'table' &&
          audit.score !== null &&
          audit.score < 1
        )
        .map(([key, audit]) => ({
          id: key,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          items: audit.details?.items || [],
        })),

      // Resource summary
      resourceSummary: audits['resource-summary']?.details?.items || [],

      // Network requests
      networkRequests: audits['network-requests']?.details?.items || [],

      // JavaScript execution
      bootupTimeItems: audits['bootup-time']?.details?.items || [],

      // Unused JavaScript
      unusedJavascript: audits['unused-javascript']?.details?.items || [],

      // Unused CSS
      unusedCss: audits['unused-css-rules']?.details?.items || [],
    };
  } catch (error) {
    console.error(`${colors.red}Error parsing ${filePath}:${colors.reset}`, error.message);
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(seconds) {
  return seconds.toFixed(2) + 's';
}

function getStatus(value, target, inverse = false) {
  const passes = inverse ? value <= target : value >= target;
  return passes ? 'PASS ✓' : 'FAIL ✗';
}

function generateReport(pageReports) {
  let markdown = `# Phase 5B - Agent 40: Lighthouse Performance Audit

**Generated:** ${new Date().toISOString()}
**Auditor:** Claude Sonnet 4.5
**Pages Audited:** ${Object.keys(pageReports).length}

## Executive Summary

`;

  // Calculate overall statistics
  const scores = Object.values(pageReports).map(r => r.performance);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  const overallPass = avgScore >= TARGETS.performance;

  markdown += `**Overall Performance:** ${avgScore}/100 (Min: ${minScore}, Max: ${maxScore})  \n`;
  markdown += `**Status:** ${overallPass ? '✅ PASS' : '❌ FAIL'} (Target: ≥${TARGETS.performance})  \n`;
  markdown += `**Pages Passing:** ${scores.filter(s => s >= TARGETS.performance).length}/${scores.length}  \n\n`;

  // Summary table
  markdown += `## Performance Summary\n\n`;
  markdown += `| Page | Performance | FCP | LCP | TTI | TBT | CLS | Status |\n`;
  markdown += `|------|-------------|-----|-----|-----|-----|-----|--------|\n`;

  for (const [pageName, report] of Object.entries(pageReports)) {
    const perfStatus = report.performance >= TARGETS.performance ? '✓' : '✗';
    markdown += `| ${pageName} | ${report.performance}/100 | ${formatTime(report.fcp)} | ${formatTime(report.lcp)} | ${formatTime(report.tti)} | ${Math.round(report.tbt)}ms | ${report.cls.toFixed(3)} | ${perfStatus} |\n`;
  }

  markdown += `\n**Targets:** Performance ≥${TARGETS.performance}, FCP <${TARGETS.fcp}s, LCP <${TARGETS.lcp}s, TTI <${TARGETS.tti}s, TBT <${TARGETS.tbt}ms, CLS <${TARGETS.cls}\n\n`;

  // Detailed metrics per page
  markdown += `## Detailed Page Analysis\n\n`;

  for (const [pageName, report] of Object.entries(pageReports)) {
    markdown += `### ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}\n\n`;

    markdown += `**Core Metrics:**\n`;
    markdown += `- Performance Score: **${report.performance}/100** - ${getStatus(report.performance, TARGETS.performance)}\n`;
    markdown += `- First Contentful Paint: **${formatTime(report.fcp)}** - ${getStatus(report.fcp, TARGETS.fcp, true)}\n`;
    markdown += `- Largest Contentful Paint: **${formatTime(report.lcp)}** - ${getStatus(report.lcp, TARGETS.lcp, true)}\n`;
    markdown += `- Time to Interactive: **${formatTime(report.tti)}** - ${getStatus(report.tti, TARGETS.tti, true)}\n`;
    markdown += `- Total Blocking Time: **${Math.round(report.tbt)}ms** - ${getStatus(report.tbt, TARGETS.tbt, true)}\n`;
    markdown += `- Cumulative Layout Shift: **${report.cls.toFixed(3)}** - ${getStatus(report.cls, TARGETS.cls, true)}\n`;
    markdown += `- Speed Index: **${formatTime(report.speedIndex)}**\n\n`;

    // Resource summary
    if (report.resourceSummary.length > 0) {
      markdown += `**Resource Summary:**\n\n`;
      markdown += `| Type | Requests | Transfer Size |\n`;
      markdown += `|------|----------|---------------|\n`;

      for (const resource of report.resourceSummary) {
        markdown += `| ${resource.resourceType} | ${resource.requestCount} | ${formatBytes(resource.transferSize)} |\n`;
      }
      markdown += `\n`;
    }

    // Top opportunities
    if (report.opportunities.length > 0) {
      markdown += `**Top Optimization Opportunities:**\n\n`;

      for (let i = 0; i < Math.min(5, report.opportunities.length); i++) {
        const opp = report.opportunities[i];
        markdown += `${i + 1}. **${opp.title}** - Potential savings: ${formatTime(opp.savings)} (${formatBytes(opp.savingsBytes)})\n`;

        if (opp.items.length > 0) {
          for (let j = 0; j < Math.min(3, opp.items.length); j++) {
            const item = opp.items[j];
            const url = item.url || item.source || 'N/A';
            const fileName = url.split('/').pop().substring(0, 50);
            markdown += `   - ${fileName}\n`;
          }
          if (opp.items.length > 3) {
            markdown += `   - ...and ${opp.items.length - 3} more\n`;
          }
        }
      }
      markdown += `\n`;
    }

    // Unused JavaScript
    if (report.unusedJavascript.length > 0) {
      const totalWasted = report.unusedJavascript.reduce((sum, item) => sum + (item.wastedBytes || 0), 0);
      markdown += `**Unused JavaScript:** ${formatBytes(totalWasted)} across ${report.unusedJavascript.length} files\n\n`;
    }

    // Unused CSS
    if (report.unusedCss.length > 0) {
      const totalWasted = report.unusedCss.reduce((sum, item) => sum + (item.wastedBytes || 0), 0);
      markdown += `**Unused CSS:** ${formatBytes(totalWasted)} across ${report.unusedCss.length} files\n\n`;
    }

    markdown += `---\n\n`;
  }

  // Aggregate analysis
  markdown += `## Cross-Page Performance Bottlenecks\n\n`;

  // Collect all opportunities across pages
  const allOpportunities = {};
  for (const [pageName, report] of Object.entries(pageReports)) {
    for (const opp of report.opportunities) {
      if (!allOpportunities[opp.id]) {
        allOpportunities[opp.id] = {
          title: opp.title,
          pages: [],
          totalSavings: 0,
          totalBytes: 0,
        };
      }
      allOpportunities[opp.id].pages.push(pageName);
      allOpportunities[opp.id].totalSavings += opp.savings;
      allOpportunities[opp.id].totalBytes += opp.savingsBytes;
    }
  }

  const sortedOpportunities = Object.entries(allOpportunities)
    .sort(([, a], [, b]) => b.totalSavings - a.totalSavings)
    .slice(0, 10);

  markdown += `### Top 10 Performance Issues (Across All Pages)\n\n`;

  for (let i = 0; i < sortedOpportunities.length; i++) {
    const [id, opp] = sortedOpportunities[i];
    markdown += `${i + 1}. **${opp.title}**\n`;
    markdown += `   - Impact: ${formatTime(opp.totalSavings)} potential savings (${formatBytes(opp.totalBytes)})\n`;
    markdown += `   - Affects: ${opp.pages.join(', ')}\n\n`;
  }

  // Bundle size analysis
  markdown += `## Bundle Size Analysis\n\n`;

  const bundleSizes = {};
  for (const [pageName, report] of Object.entries(pageReports)) {
    const jsResources = report.resourceSummary.find(r => r.resourceType === 'script');
    const cssResources = report.resourceSummary.find(r => r.resourceType === 'stylesheet');

    bundleSizes[pageName] = {
      js: jsResources ? jsResources.transferSize : 0,
      css: cssResources ? cssResources.transferSize : 0,
      total: report.totalByteWeight,
    };
  }

  markdown += `| Page | JavaScript | CSS | Total |\n`;
  markdown += `|------|------------|-----|-------|\n`;

  for (const [pageName, sizes] of Object.entries(bundleSizes)) {
    markdown += `| ${pageName} | ${formatBytes(sizes.js)} | ${formatBytes(sizes.css)} | ${formatBytes(sizes.total)} |\n`;
  }

  markdown += `\n`;

  // Calculate averages
  const avgJs = Object.values(bundleSizes).reduce((sum, s) => sum + s.js, 0) / Object.keys(bundleSizes).length;
  const avgCss = Object.values(bundleSizes).reduce((sum, s) => sum + s.css, 0) / Object.keys(bundleSizes).length;
  const avgTotal = Object.values(bundleSizes).reduce((sum, s) => sum + s.total, 0) / Object.keys(bundleSizes).length;

  markdown += `**Average Bundle Sizes:**\n`;
  markdown += `- JavaScript: ${formatBytes(avgJs)}\n`;
  markdown += `- CSS: ${formatBytes(avgCss)}\n`;
  markdown += `- Total Page Weight: ${formatBytes(avgTotal)}\n\n`;

  // Optimization recommendations
  markdown += `## Optimization Recommendations\n\n`;

  markdown += `### Quick Wins (< 1 hour each)\n\n`;
  markdown += `1. **Enable Text Compression**\n`;
  markdown += `   - Configure gzip/brotli compression for text resources\n`;
  markdown += `   - Potential savings: 50-70% on text-based assets\n\n`;

  markdown += `2. **Add Cache Headers**\n`;
  markdown += `   - Set long-term cache headers for static assets\n`;
  markdown += `   - Use versioned filenames for cache busting\n\n`;

  markdown += `3. **Optimize Images**\n`;
  markdown += `   - Convert images to WebP format\n`;
  markdown += `   - Implement lazy loading for below-fold images\n\n`;

  markdown += `4. **Preconnect to Required Origins**\n`;
  markdown += `   - Add \`<link rel="preconnect">\` for external domains\n`;
  markdown += `   - Reduces DNS lookup and connection time\n\n`;

  markdown += `### Medium Effort (1-4 hours)\n\n`;
  markdown += `1. **Code Splitting**\n`;
  markdown += `   - Implement route-based code splitting\n`;
  markdown += `   - Split large vendor bundles\n`;
  markdown += `   - Current Vite config has basic chunking, can be optimized further\n\n`;

  markdown += `2. **Remove Unused Code**\n`;
  markdown += `   - Tree-shake unused exports\n`;
  markdown += `   - Remove unused dependencies\n`;
  markdown += `   - Consider lighter alternatives for heavy libraries\n\n`;

  markdown += `3. **Optimize Third-Party Scripts**\n`;
  markdown += `   - Defer non-critical third-party scripts\n`;
  markdown += `   - Use facade pattern for heavy widgets\n\n`;

  markdown += `4. **Reduce JavaScript Execution Time**\n`;
  markdown += `   - Profile and optimize hot paths\n`;
  markdown += `   - Use Web Workers for heavy computations\n`;
  markdown += `   - Implement virtualization for long lists\n\n`;

  markdown += `### Long-Term Improvements\n\n`;
  markdown += `1. **Implement Progressive Web App (PWA)**\n`;
  markdown += `   - Add service worker for offline support\n`;
  markdown += `   - Cache API responses intelligently\n`;
  markdown += `   - Reduce network dependency\n\n`;

  markdown += `2. **Server-Side Rendering (SSR) / Static Generation**\n`;
  markdown += `   - Consider Next.js or Remix migration\n`;
  markdown += `   - Improve initial paint times\n`;
  markdown += `   - Better SEO and performance\n\n`;

  markdown += `3. **Optimize Critical Rendering Path**\n`;
  markdown += `   - Inline critical CSS\n`;
  markdown += `   - Defer non-critical styles\n`;
  markdown += `   - Optimize font loading strategy\n\n`;

  markdown += `4. **Implement Performance Monitoring**\n`;
  markdown += `   - Set up Real User Monitoring (RUM)\n`;
  markdown += `   - Track Core Web Vitals in production\n`;
  markdown += `   - Create performance budgets\n\n`;

  // Final assessment
  markdown += `## Final Assessment\n\n`;

  const passingPages = scores.filter(s => s >= TARGETS.performance).length;
  const totalPages = scores.length;

  markdown += `**Overall Status:** ${overallPass ? '✅ **PASS**' : '❌ **FAIL**'}\n\n`;
  markdown += `- Average Performance Score: **${avgScore}/100** (Target: ≥${TARGETS.performance})\n`;
  markdown += `- Pages Passing: **${passingPages}/${totalPages}** (${Math.round(passingPages/totalPages*100)}%)\n`;
  markdown += `- Performance Range: ${minScore}-${maxScore}\n\n`;

  if (overallPass) {
    markdown += `The application meets performance targets overall, but there are still opportunities for optimization.\n\n`;
  } else {
    markdown += `The application needs performance optimization work to meet targets. Focus on the recommendations above.\n\n`;
  }

  markdown += `**Key Focus Areas:**\n`;

  if (sortedOpportunities.length > 0) {
    for (let i = 0; i < Math.min(3, sortedOpportunities.length); i++) {
      const [id, opp] = sortedOpportunities[i];
      markdown += `${i + 1}. ${opp.title} (potential ${formatTime(opp.totalSavings)} savings)\n`;
    }
  }

  markdown += `\n---\n\n`;
  markdown += `**Report generated by:** Claude Sonnet 4.5  \n`;
  markdown += `**Lighthouse Version:** Latest  \n`;
  markdown += `**Audit Date:** ${new Date().toLocaleDateString()}  \n`;
  markdown += `**Raw Reports:** See \`lighthouse-reports/\` directory for detailed HTML reports\n`;

  return markdown;
}

// Main execution
async function main() {
  console.log(`${colors.blue}${colors.bright}Phase 5B - Agent 40: Lighthouse Report Analyzer${colors.reset}\n`);

  if (!fs.existsSync(REPORTS_DIR)) {
    console.error(`${colors.red}Error: Reports directory not found: ${REPORTS_DIR}${colors.reset}`);
    console.log(`${colors.yellow}Please run the audit script first: ./scripts/lighthouse-audit.sh${colors.reset}`);
    process.exit(1);
  }

  // Find all final JSON reports
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('-final.json'));

  if (files.length === 0) {
    console.error(`${colors.red}Error: No final reports found in ${REPORTS_DIR}${colors.reset}`);
    console.log(`${colors.yellow}Please run the audit script first: ./scripts/lighthouse-audit.sh${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}Found ${files.length} reports${colors.reset}\n`);

  const pageReports = {};

  for (const file of files) {
    const pageName = file.replace('-final.json', '');
    console.log(`${colors.yellow}Analyzing: ${pageName}${colors.reset}`);

    const report = parseReport(path.join(REPORTS_DIR, file));
    if (report) {
      pageReports[pageName] = report;
      console.log(`  Performance: ${colors.bright}${report.performance}/100${colors.reset}`);
    }
  }

  console.log(`\n${colors.blue}Generating comprehensive report...${colors.reset}`);
  const markdown = generateReport(pageReports);

  fs.writeFileSync(OUTPUT_FILE, markdown);

  console.log(`\n${colors.green}${colors.bright}✓ Report generated successfully!${colors.reset}`);
  console.log(`${colors.blue}Output: ${OUTPUT_FILE}${colors.reset}\n`);
}

main().catch(error => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});
