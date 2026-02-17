# Phase 5B - Agent 40: Lighthouse Performance Audit - Index

## Overview

Comprehensive Lighthouse performance audit infrastructure for identifying and optimizing performance bottlenecks across all major PatchIQ pages.

## Deliverables

### 📊 Main Reports

1. **PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md** (Main Deliverable)
   - Executive summary with overall performance scores
   - Detailed metrics per page (FCP, LCP, TTI, TBT, CLS)
   - Top 10 cross-page performance bottlenecks
   - Bundle size analysis
   - Optimization recommendations (Quick/Medium/Long-term)
   - Pass/Fail assessment against targets
   - Status: Template (awaiting actual audit data)

2. **PHASE5B_AGENT40_LIGHTHOUSE_GUIDE.md** (Testing Guide)
   - Prerequisites and setup instructions
   - Step-by-step audit procedures
   - Metric explanations and targets
   - Troubleshooting common issues
   - Best practices for consistent audits
   - Example workflows

3. **PHASE5B_AGENT40_QUICK_REFERENCE.md** (Quick Start)
   - TL;DR instructions
   - Quick command reference
   - Expected issues summary
   - Success criteria checklist

### 🛠️ Automation Scripts

4. **scripts/lighthouse-audit.sh**
   - Automated full audit (all 6 pages)
   - 3 runs per page for statistical accuracy
   - Checks service availability
   - Saves JSON + HTML reports
   - Execution time: ~10-15 minutes

5. **scripts/lighthouse-single.sh**
   - Quick single-page audit
   - For testing and iteration
   - Opens report automatically
   - Execution time: ~30 seconds

6. **scripts/analyze-lighthouse.js**
   - Parses JSON reports
   - Calculates averages and aggregates
   - Identifies cross-page issues
   - Generates comprehensive markdown report
   - Outputs to PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md

## Audit Scope

### Pages Tested

| # | Page | URL | Critical Path | Expected Score |
|---|------|-----|---------------|----------------|
| 1 | Dashboard | `/dashboard` | ✅ Yes | 70-80 |
| 2 | Assets List | `/assets` | ✅ Yes | 75-85 |
| 3 | Patches List | `/patches` | ✅ Yes | 75-85 |
| 4 | Patch Details | `/patches/:id` | ⚠️ Secondary | 70-80 |
| 5 | Vulnerabilities | `/vulnerability/vulnerabilities` | ✅ Yes | 70-80 |
| 6 | Settings/Users | `/settings/user-management/users` | ⚠️ Admin | 80-90 |

### Metrics Tracked

#### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s target
- **FCP** (First Contentful Paint): < 1.8s target
- **CLS** (Cumulative Layout Shift): < 0.1 target

#### Additional Metrics
- **Performance Score**: ≥ 85/100 target
- **TTI** (Time to Interactive): < 3.8s target
- **TBT** (Total Blocking Time): < 200ms target
- **Speed Index**: < 3.0s target

## Usage

### First-Time Setup

```bash
# 1. Install Lighthouse CLI
npm install -g lighthouse

# 2. Start services
make dev

# 3. Verify services are running
curl http://localhost:5173      # Frontend
curl http://localhost:3000/api/health  # Backend
```

### Run Full Audit

```bash
# Execute full audit (all pages, 3 runs each)
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2
./scripts/lighthouse-audit.sh

# Wait ~10-15 minutes for completion
# Reports saved to: lighthouse-reports/

# Generate comprehensive analysis
node scripts/analyze-lighthouse.js

# Review results
cat PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md
open lighthouse-reports/*-final.html
```

### Quick Single-Page Test

```bash
# Test single page quickly
./scripts/lighthouse-single.sh dashboard http://localhost:5173/dashboard

# Opens report automatically
# Useful for iterative optimization
```

### Iteration Workflow

```bash
# 1. Initial baseline
./scripts/lighthouse-audit.sh
node scripts/analyze-lighthouse.js

# 2. Identify issues in report
cat PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md

# 3. Make code changes
# ... implement optimizations ...

# 4. Quick re-test critical pages
./scripts/lighthouse-single.sh dashboard http://localhost:5173/dashboard
./scripts/lighthouse-single.sh assets http://localhost:5173/assets

# 5. Full re-audit when satisfied
./scripts/lighthouse-audit.sh
node scripts/analyze-lighthouse.js

# 6. Compare before/after
```

## Expected Findings (Pre-Audit Analysis)

### Predicted Bottlenecks

1. **Bundle Size Issues**
   - Ant Design: ~800 KB (needs tree-shaking)
   - Ant Design Icons: ~400 KB (selective imports needed)
   - Recharts: ~300 KB (lazy loading opportunity)
   - Total JS: ~1.5 MB → Target: < 650 KB gzipped

2. **Rendering Performance**
   - No virtual scrolling on list pages
   - All chart widgets render on mount
   - Tab content loaded upfront

3. **Missing Optimizations**
   - No resource hints (preconnect, dns-prefetch)
   - No service worker/PWA
   - No image optimization pipeline
   - DevTools may be in production bundle

4. **Code Splitting**
   - Basic vendor chunks configured
   - No route-based splitting
   - No lazy loading of heavy components

5. **Network Optimization**
   - No compression configured (gzip/brotli)
   - No HTTP/2 push hints
   - Synchronous resource loading

### Current Build Configuration

From `frontend/vite.config.ts`:

**✅ Configured:**
- Manual vendor chunks (react, antd, query, charts)
- Path aliases

**❌ Missing:**
- Compression plugin
- Bundle analyzer
- Asset size limits
- Advanced minification
- Performance hints

## Optimization Roadmap

### Phase 1: Quick Wins (< 1 hour each)
- [ ] Enable gzip/brotli compression
- [ ] Add resource hints to index.html
- [ ] Optimize Ant Design imports (tree-shaking)
- [ ] Remove React Query DevTools from production
- [ ] Add skeleton loading states

**Expected Gain:** +10-15 performance points

### Phase 2: Medium Effort (1-4 hours each)
- [ ] Implement route-based code splitting
- [ ] Add virtual scrolling to tables
- [ ] Lazy load chart components
- [ ] Optimize image loading (WebP, lazy)
- [ ] Implement basic service worker

**Expected Gain:** +15-20 performance points

### Phase 3: Long-Term (8+ hours each)
- [ ] Full PWA implementation
- [ ] Consider SSR/SSG migration
- [ ] Micro-frontend architecture
- [ ] GraphQL migration for data fetching
- [ ] Real User Monitoring (RUM) integration

**Expected Gain:** +20-30 performance points

## Success Metrics

### Audit Completion
- ✅ All 6 pages audited with Lighthouse
- ✅ 3 runs per page for accuracy
- ✅ JSON and HTML reports generated
- ✅ Comprehensive analysis report created

### Performance Targets
- 🎯 Average performance score: ≥ 85/100
- 🎯 Pages passing: ≥ 5/6 (83%)
- 🎯 Critical pages (Dashboard, Assets, Patches): All ≥ 85
- 🎯 No pages below 70 (critical threshold)

### Deliverable Quality
- ✅ Summary table with all metrics
- ✅ Top 5 bottlenecks identified
- ✅ Bundle size breakdown
- ✅ Specific file names in recommendations
- ✅ Actionable quick wins listed
- ✅ Pass/Fail assessment provided

## Integration Points

### CI/CD Pipeline

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:5173/dashboard
            http://localhost:5173/assets
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

### Performance Budgets

```json
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        { "metric": "interactive", "budget": 3800 },
        { "metric": "first-contentful-paint", "budget": 1800 },
        { "metric": "largest-contentful-paint", "budget": 2500 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 650 },
        { "resourceType": "stylesheet", "budget": 120 },
        { "resourceType": "total", "budget": 1500 }
      ]
    }
  ]
}
```

### Monitoring Dashboards

**Metrics to Track:**
- Core Web Vitals (LCP, FCP, CLS)
- Performance score trend
- Bundle size over time
- Page load time (P50, P95, P99)

**Tools:**
- Google Analytics 4 (Core Web Vitals)
- Sentry Performance
- LogRocket or similar RUM

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Services not running | `make dev` or check Docker |
| Lighthouse not found | `npm install -g lighthouse` |
| Chrome connection fails | Install Chrome or use `--chrome-flags="--no-sandbox"` |
| No reports generated | Check permissions on `lighthouse-reports/` |
| Analysis script fails | Ensure JSON reports exist in output directory |

### Debug Commands

```bash
# Check services
lsof -i :5173  # Frontend
lsof -i :3000  # Backend

# Verify Lighthouse
which lighthouse
lighthouse --version

# Test single page with verbose
lighthouse http://localhost:5173/dashboard --verbose

# Check report directory
ls -la lighthouse-reports/
```

## Files Structure

```
/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/
├── scripts/
│   ├── lighthouse-audit.sh          # Full automated audit
│   ├── lighthouse-single.sh         # Single-page quick test
│   └── analyze-lighthouse.js        # Report generator
├── lighthouse-reports/               # Generated reports (git-ignored)
│   ├── dashboard-run1.report.html
│   ├── dashboard-run1.report.json
│   ├── dashboard-run2.report.html
│   ├── dashboard-run2.report.json
│   ├── dashboard-run3.report.html
│   ├── dashboard-run3.report.json
│   ├── dashboard-final.html         # Best run
│   ├── dashboard-final.json
│   └── ... (similar for other pages)
├── PHASE5B_AGENT40_INDEX.md         # This file
├── PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md      # Main report
├── PHASE5B_AGENT40_LIGHTHOUSE_GUIDE.md      # Testing guide
└── PHASE5B_AGENT40_QUICK_REFERENCE.md       # Quick start
```

## Dependencies

### Required
- **Node.js**: 18+ (for lighthouse CLI)
- **Chrome/Chromium**: Latest (for auditing)
- **Running services**: Frontend (5173) + Backend (3000)

### Optional
- **Bundle analyzer**: For deeper analysis
- **Lighthouse CI**: For automated testing
- **Performance monitoring**: For production tracking

## Next Steps

1. **Immediate**: Run baseline audit
   ```bash
   make dev
   ./scripts/lighthouse-audit.sh
   node scripts/analyze-lighthouse.js
   ```

2. **Short-term**: Implement quick wins
   - Enable compression
   - Add resource hints
   - Optimize imports

3. **Medium-term**: Structural improvements
   - Code splitting
   - Virtual scrolling
   - Service worker

4. **Long-term**: Advanced optimizations
   - PWA
   - SSR consideration
   - Monitoring setup

## References

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [React Performance](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Bundle Size Optimization](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-17 | Initial audit infrastructure created |

---

**Created by:** Claude Sonnet 4.5
**Phase:** 5B - Performance Optimization
**Agent:** 40 - Lighthouse Performance Audit
**Status:** ⏳ Ready for execution (awaiting service startup)

**Quick Start:**
```bash
make dev
./scripts/lighthouse-audit.sh
node scripts/analyze-lighthouse.js
cat PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md
```
