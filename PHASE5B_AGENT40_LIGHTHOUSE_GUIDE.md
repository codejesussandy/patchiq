# Phase 5B - Agent 40: Lighthouse Performance Audit Guide

## Overview

This guide provides instructions for running comprehensive Lighthouse performance audits on all major PatchIQ pages.

## Prerequisites

1. **Services Running**
   ```bash
   make dev
   # OR
   make dev-services  # Infrastructure only
   make dev-backend   # In separate terminal
   make dev-frontend  # In separate terminal
   ```

2. **Lighthouse CLI Installed**
   ```bash
   npm install -g lighthouse
   ```

3. **Verify Services**
   ```bash
   curl http://localhost:5173  # Frontend should respond
   curl http://localhost:3000/api/health  # Backend should respond
   ```

## Running the Audit

### Option 1: Automated Full Audit (Recommended)

Run all pages with 3 iterations each for accuracy:

```bash
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2
./scripts/lighthouse-audit.sh
```

This will:
- Check if services are running
- Audit 6 major pages
- Run 3 iterations per page for statistical accuracy
- Save JSON and HTML reports to `lighthouse-reports/`
- Take approximately 10-15 minutes

### Option 2: Single Page Quick Audit

For testing or quick checks:

```bash
./scripts/lighthouse-single.sh dashboard http://localhost:5173/dashboard
./scripts/lighthouse-single.sh assets http://localhost:5173/assets
```

### Option 3: Manual Chrome DevTools Audit

1. Open Chrome/Edge in Incognito mode (to avoid extension interference)
2. Navigate to the page (e.g., http://localhost:5173/dashboard)
3. Open DevTools (F12 or Cmd+Option+I)
4. Go to "Lighthouse" tab
5. Select "Performance" category
6. Click "Analyze page load"
7. Repeat 2-3 times for each page

## Analyzing Results

### Generate Comprehensive Report

After running audits:

```bash
node scripts/analyze-lighthouse.js
```

This will:
- Parse all JSON reports in `lighthouse-reports/`
- Calculate averages and aggregates
- Identify cross-page bottlenecks
- Generate optimization recommendations
- Output to `PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md`

### View Individual Reports

HTML reports are saved in `lighthouse-reports/`:

```bash
# Open all reports
open lighthouse-reports/*.html

# Open specific page
open lighthouse-reports/dashboard-final.html
```

## Pages to Audit

1. **Dashboard** - `http://localhost:5173/dashboard`
   - Main landing page
   - Critical for first impression
   - Multiple widgets and charts

2. **Assets List** - `http://localhost:5173/assets`
   - Data-heavy table view
   - Pagination and filtering
   - Representative of list pages

3. **Patches List** - `http://localhost:5173/patches`
   - Similar to assets list
   - Different data model
   - Complex filtering

4. **Patch Details** - `http://localhost:5173/patches/:id`
   - Detail view with tabs
   - Multiple API calls
   - Rich content rendering

5. **Vulnerabilities** - `http://localhost:5173/vulnerability/vulnerabilities`
   - Security-critical page
   - Complex data relationships
   - Severity indicators

6. **Settings/Users** - `http://localhost:5173/settings/user-management/users`
   - Admin interface
   - Form-heavy interactions
   - Role-based access

## Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Performance Score | ≥ 85 | < 70 is critical |
| First Contentful Paint (FCP) | < 1.8s | > 3.0s is critical |
| Largest Contentful Paint (LCP) | < 2.5s | > 4.0s is critical |
| Time to Interactive (TTI) | < 3.8s | > 7.3s is critical |
| Total Blocking Time (TBT) | < 200ms | > 600ms is critical |
| Cumulative Layout Shift (CLS) | < 0.1 | > 0.25 is critical |

## Understanding the Metrics

### Performance Score (0-100)
- Weighted average of all performance metrics
- Target: ≥ 85 (Good), 50-84 (Needs Improvement), < 50 (Poor)

### First Contentful Paint (FCP)
- Time until first text/image is painted
- Measures perceived loading speed
- Quick wins: reduce server response time, eliminate render-blocking resources

### Largest Contentful Paint (LCP)
- Time until largest content element is painted
- Core Web Vital
- Quick wins: optimize images, prioritize critical resources

### Time to Interactive (TTI)
- Time until page is fully interactive
- Long tasks block main thread
- Quick wins: code splitting, defer non-critical JavaScript

### Total Blocking Time (TBT)
- Sum of blocking time of all long tasks
- Measures main thread congestion
- Quick wins: reduce JavaScript execution time

### Cumulative Layout Shift (CLS)
- Visual stability score
- Core Web Vital
- Quick wins: set explicit dimensions on images/iframes

## Common Issues and Quick Fixes

### Large JavaScript Bundles
**Problem:** Vendor chunks > 500KB
**Fix:**
```javascript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-antd': ['antd', '@ant-design/icons'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-charts': ['recharts'],
      },
    },
  },
},
```

### Unused JavaScript
**Problem:** Large amount of unused code
**Fix:**
- Tree-shake unused exports
- Lazy load routes with React.lazy()
- Remove unused dependencies

### Render-Blocking Resources
**Problem:** CSS/JS blocks first paint
**Fix:**
- Inline critical CSS
- Defer non-critical CSS
- Use async/defer for scripts

### Unoptimized Images
**Problem:** Large image file sizes
**Fix:**
- Convert to WebP
- Add width/height attributes
- Implement lazy loading

### No Text Compression
**Problem:** Text resources not compressed
**Fix:**
- Enable gzip/brotli in nginx
- Verify compression headers

## Troubleshooting

### Lighthouse Fails to Run

**Error:** "Cannot connect to Chrome"
```bash
# Install Chrome/Chromium
brew install --cask google-chrome

# Or use system Chrome
lighthouse --chrome-flags="--no-sandbox" <url>
```

**Error:** "Port 5173 not accessible"
```bash
# Check if frontend is running
lsof -i :5173

# Start frontend
cd frontend && npm run dev
```

### Services Not Running

```bash
# Check Docker
docker ps

# Start services
make dev

# Or manually
make dev-services
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2
```

### No Reports Generated

```bash
# Check output directory
ls -la lighthouse-reports/

# Run with verbose logging
lighthouse <url> --verbose
```

## Best Practices

1. **Consistent Environment**
   - Run audits in incognito/private mode
   - Disable browser extensions
   - Use same network conditions

2. **Multiple Runs**
   - Run 3-5 times per page
   - Take average or median
   - Discard outliers

3. **Realistic Conditions**
   - Test with production build (`npm run build && npm run preview`)
   - Test with typical data volume
   - Test with realistic network throttling

4. **Document Baseline**
   - Save initial audit results
   - Track improvements over time
   - Set performance budgets

## Output Files

### Generated Reports

```
lighthouse-reports/
├── dashboard-run1.report.html
├── dashboard-run1.report.json
├── dashboard-run2.report.html
├── dashboard-run2.report.json
├── dashboard-run3.report.html
├── dashboard-run3.report.json
├── dashboard-final.html          # Best run
├── dashboard-final.json
├── assets-final.html
├── assets-final.json
├── patches-final.html
├── patches-final.json
├── patch-details-final.html
├── patch-details-final.json
├── vulnerabilities-final.html
├── vulnerabilities-final.json
├── settings-final.html
└── settings-final.json
```

### Analysis Report

```
PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md  # Comprehensive analysis
```

## Next Steps After Audit

1. **Review Report**
   - Read `PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md`
   - Identify critical issues (performance < 70)
   - Prioritize quick wins

2. **Implement Fixes**
   - Start with quick wins (< 1 hour each)
   - Test impact with single-page audits
   - Move to medium/long-term improvements

3. **Re-audit**
   - Run full audit after changes
   - Compare before/after scores
   - Document improvements

4. **Set Up Monitoring**
   - Integrate Lighthouse CI
   - Set performance budgets
   - Track Core Web Vitals in production

## Example Workflow

```bash
# 1. Start services
make dev

# 2. Run full audit
./scripts/lighthouse-audit.sh

# 3. Generate report
node scripts/analyze-lighthouse.js

# 4. Review results
cat PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md

# 5. Open HTML reports
open lighthouse-reports/*-final.html

# 6. Implement fixes
# ... make code changes ...

# 7. Quick re-test
./scripts/lighthouse-single.sh dashboard http://localhost:5173/dashboard

# 8. Full re-audit
./scripts/lighthouse-audit.sh

# 9. Compare results
node scripts/analyze-lighthouse.js
```

## Additional Resources

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Performance Budgets](https://web.dev/performance-budgets-101/)
- [Vite Performance Optimization](https://vitejs.dev/guide/performance.html)
- [React Performance](https://react.dev/learn/render-and-commit#optimizing-performance)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Lighthouse documentation
3. Consult frontend team
4. Review CLAUDE.md for project-specific guidelines

---

**Created by:** Claude Sonnet 4.5
**Date:** 2026-02-17
**Phase:** 5B - Performance Optimization
**Agent:** 40 - Lighthouse Performance Audit
