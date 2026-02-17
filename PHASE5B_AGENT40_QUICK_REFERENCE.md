# Phase 5B - Agent 40: Quick Reference

## TL;DR

Run comprehensive Lighthouse performance audits on all major PatchIQ pages to identify bottlenecks and optimization opportunities.

## Quick Start

```bash
# 1. Start services
make dev

# 2. Run audit (10-15 minutes)
./scripts/lighthouse-audit.sh

# 3. Generate report
node scripts/analyze-lighthouse.js

# 4. Review results
cat PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md
open lighthouse-reports/*.html
```

## Files Delivered

1. **`/scripts/lighthouse-audit.sh`**
   - Full automated audit for all 6 pages
   - 3 runs per page for accuracy
   - ~10-15 minutes execution time

2. **`/scripts/lighthouse-single.sh`**
   - Quick single-page audit
   - For testing and quick checks
   - Usage: `./scripts/lighthouse-single.sh <page> <url>`

3. **`/scripts/analyze-lighthouse.js`**
   - Parses JSON reports
   - Generates comprehensive analysis
   - Outputs to PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md

4. **`PHASE5B_AGENT40_LIGHTHOUSE_GUIDE.md`**
   - Comprehensive testing guide
   - Troubleshooting tips
   - Best practices

5. **`PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md`**
   - Main deliverable (template until audit runs)
   - Performance metrics and analysis
   - Optimization recommendations

## Pages Audited

1. Dashboard - `http://localhost:5173/dashboard`
2. Assets List - `http://localhost:5173/assets`
3. Patches List - `http://localhost:5173/patches`
4. Patch Details - `http://localhost:5173/patches/:id`
5. Vulnerabilities - `http://localhost:5173/vulnerability/vulnerabilities`
6. Settings/Users - `http://localhost:5173/settings/user-management/users`

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Performance | ≥ 85 | < 70 |
| FCP | < 1.8s | > 3.0s |
| LCP | < 2.5s | > 4.0s |
| TTI | < 3.8s | > 7.3s |
| TBT | < 200ms | > 600ms |
| CLS | < 0.1 | > 0.25 |

## Expected Issues (Before Audit)

Based on codebase analysis:

1. **Large Ant Design Bundle** (~800 KB)
2. **Unoptimized Chart Rendering** (Dashboard)
3. **No Virtual Scrolling** (List pages)
4. **Missing Resource Hints**
5. **No Service Worker/PWA**

## Quick Wins (Post-Audit)

1. Enable gzip/brotli compression
2. Add resource hints (preconnect)
3. Optimize Ant Design imports
4. Remove DevTools from production
5. Implement skeleton loading

## Success Criteria

- ✅ All 6 pages audited
- ✅ 3 runs per page (statistical accuracy)
- ✅ Performance scores documented
- ✅ Bottlenecks identified with file names
- ✅ Actionable recommendations provided
- ✅ Report ready for review

## Current Status

⏳ **Awaiting Execution**

Services must be running to perform audit. Template report created with expected performance characteristics.

## Next Actions

1. Start services: `make dev`
2. Run audit: `./scripts/lighthouse-audit.sh`
3. Generate report: `node scripts/analyze-lighthouse.js`
4. Review and prioritize optimizations
5. Implement quick wins
6. Re-audit to measure improvements

## Troubleshooting

**Services not running?**
```bash
docker ps  # Check containers
make dev   # Start all services
```

**Lighthouse not installed?**
```bash
npm install -g lighthouse
```

**Can't access frontend?**
```bash
curl http://localhost:5173
# Should return HTML
```

## Integration with CI/CD

After baseline audit, consider:

1. **Lighthouse CI GitHub Action**
   - Automated audits on PRs
   - Performance budgets
   - Trend tracking

2. **Performance Budgets**
   - JS bundle < 650 KB (gzipped)
   - CSS bundle < 120 KB (gzipped)
   - Performance score ≥ 85

3. **Real User Monitoring**
   - Track Core Web Vitals
   - Production performance
   - User experience metrics

## Related Documentation

- `PHASE5B_AGENT40_LIGHTHOUSE_GUIDE.md` - Detailed guide
- `PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md` - Main report
- `frontend/vite.config.ts` - Build configuration
- `frontend/package.json` - Dependencies

---

**Created:** 2026-02-17
**Agent:** 40 - Lighthouse Performance Audit
**Status:** Ready for execution
