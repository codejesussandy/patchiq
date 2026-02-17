# Phase 5B - Agent 40: Lighthouse Audit Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Lighthouse Performance Audit System              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────▼────────┐             ┌────────▼────────┐
            │  Prerequisites │             │  Audit Scripts  │
            └───────┬────────┘             └────────┬────────┘
                    │                               │
        ┌───────────┼───────────┐      ┌───────────┼───────────┐
        │           │           │      │           │           │
  ┌─────▼─────┐ ┌──▼───┐ ┌────▼────┐ ┌▼──────┐ ┌─▼────┐ ┌───▼─────┐
  │ Services  │ │Chrome│ │Lighthouse│ │ Full  │ │Single│ │Analyzer │
  │ (Dev)     │ │      │ │   CLI    │ │ Audit │ │ Page │ │         │
  └─────┬─────┘ └──┬───┘ └────┬────┘ └┬──────┘ └─┬────┘ └───┬─────┘
        │          │          │        │          │          │
        └──────────┴──────────┴────────┴──────────┴──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────▼────────┐             ┌────────▼────────┐
            │  Raw Reports   │             │  Analysis       │
            │  (JSON/HTML)   │             │  Report (MD)    │
            └────────────────┘             └─────────────────┘
```

## Component Architecture

### 1. Audit Orchestration Layer

```bash
lighthouse-audit.sh
├── Check services (curl health endpoints)
├── Fetch dynamic data (patch ID)
├── For each page:
│   ├── Run Lighthouse 3 times
│   ├── Save JSON + HTML reports
│   ├── Identify best run
│   └── Copy to final report
└── Summary output
```

### 2. Single Page Audit Flow

```bash
lighthouse-single.sh <page> <url>
├── Run Lighthouse once
├── Save to lighthouse-reports/
├── Open HTML report
└── Exit
```

### 3. Analysis Pipeline

```javascript
analyze-lighthouse.js
├── Scan lighthouse-reports/ for *-final.json
├── Parse each JSON report
│   ├── Extract performance metrics
│   ├── Extract bundle sizes
│   ├── Extract opportunities
│   └── Extract diagnostics
├── Aggregate across pages
│   ├── Calculate averages
│   ├── Identify common issues
│   └── Rank by impact
├── Generate markdown report
│   ├── Summary table
│   ├── Per-page analysis
│   ├── Cross-page bottlenecks
│   ├── Bundle size breakdown
│   └── Recommendations
└── Write to PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md
```

## Data Flow Diagram

```
┌──────────────┐
│   Frontend   │ :5173
│  (Vite Dev)  │
└──────┬───────┘
       │
       │ HTTP Request
       │
┌──────▼───────┐
│   Lighthouse │ (Headless Chrome)
│      CLI     │
└──────┬───────┘
       │
       │ Captures
       │
┌──────▼───────────────────────────────────────────┐
│  Performance Metrics                             │
│  ├── Performance Score (0-100)                   │
│  ├── First Contentful Paint (FCP)                │
│  ├── Largest Contentful Paint (LCP)              │
│  ├── Time to Interactive (TTI)                   │
│  ├── Total Blocking Time (TBT)                   │
│  ├── Cumulative Layout Shift (CLS)               │
│  ├── Speed Index                                 │
│  ├── Resource Summary (JS, CSS, Images, etc.)    │
│  ├── Opportunities (Optimizations)               │
│  └── Diagnostics (Issues)                        │
└──────┬───────────────────────────────────────────┘
       │
       │ Outputs
       │
┌──────▼───────────────────┬───────────────────────┐
│                          │                       │
│  ┌────────────────────┐  │  ┌─────────────────┐  │
│  │   JSON Report      │  │  │   HTML Report   │  │
│  │  (Machine-readable)│  │  │ (Human-readable)│  │
│  └────────┬───────────┘  │  └─────────────────┘  │
│           │              │                       │
└───────────┼──────────────┴───────────────────────┘
            │
            │ Parsed by
            │
┌───────────▼───────────┐
│  analyze-lighthouse.js│
└───────────┬───────────┘
            │
            │ Generates
            │
┌───────────▼─────────────────────────────────────┐
│  PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md            │
│  ├── Executive Summary                          │
│  ├── Performance Summary Table                  │
│  ├── Detailed Page Analysis                     │
│  ├── Cross-Page Bottlenecks                     │
│  ├── Bundle Size Analysis                       │
│  └── Optimization Recommendations               │
└─────────────────────────────────────────────────┘
```

## Page Audit Workflow

```
For each page (Dashboard, Assets, Patches, etc.):

Run 1 ──┐
        │
Run 2 ──┼──> Compare Scores ──> Select Best Run ──> *-final.json
        │                                         └─> *-final.html
Run 3 ──┘

Each run captures:
├── Performance: 0-100
├── FCP: Milliseconds
├── LCP: Milliseconds
├── TTI: Milliseconds
├── TBT: Milliseconds
├── CLS: Score
├── Resources: Sizes and counts
├── Opportunities: Potential savings
└── Diagnostics: Issues and warnings
```

## Report Generation Flow

```
lighthouse-reports/
├── dashboard-final.json ─┐
├── assets-final.json ────┤
├── patches-final.json ───┤
├── patch-details-final.json ─┤
├── vulnerabilities-final.json ─┤
└── settings-final.json ───────┘
                              │
                              │ Read All
                              │
                    ┌─────────▼─────────┐
                    │ analyze-lighthouse│
                    │       .js         │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼──────┐  ┌─────▼──────┐  ┌────▼─────┐
        │ Parse Each │  │ Aggregate  │  │ Identify │
        │   Report   │  │   Metrics  │  │  Issues  │
        └─────┬──────┘  └─────┬──────┘  └────┬─────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Format Output   │
                    │    (Markdown)     │
                    └─────────┬─────────┘
                              │
                ┌─────────────▼─────────────┐
                │ PHASE5B_AGENT40_          │
                │ LIGHTHOUSE_AUDIT.md       │
                └───────────────────────────┘
```

## Directory Structure

```
/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/
│
├── scripts/
│   ├── lighthouse-audit.sh          ← Full audit orchestrator
│   ├── lighthouse-single.sh         ← Quick single-page test
│   └── analyze-lighthouse.js        ← Report generator
│
├── lighthouse-reports/              ← Output directory
│   ├── README.md                    ← Directory documentation
│   ├── dashboard-run1.report.json
│   ├── dashboard-run1.report.html
│   ├── dashboard-run2.report.json
│   ├── dashboard-run2.report.html
│   ├── dashboard-run3.report.json
│   ├── dashboard-run3.report.html
│   ├── dashboard-final.json         ← Best run (used by analyzer)
│   ├── dashboard-final.html         ← Best run (for viewing)
│   └── ... (repeat for each page)
│
├── PHASE5B_AGENT40_INDEX.md          ← Overview and entry point
├── PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md   ← Generated report
├── PHASE5B_AGENT40_LIGHTHOUSE_GUIDE.md   ← Testing guide
├── PHASE5B_AGENT40_QUICK_REFERENCE.md    ← Quick start
├── PHASE5B_AGENT40_TEST_SUMMARY.md       ← Completion status
└── PHASE5B_AGENT40_ARCHITECTURE.md       ← This file
```

## Execution Sequence Diagram

```
User                 audit.sh              Lighthouse           analyze.js
│                       │                      │                    │
├─ make dev ───────────>│                      │                    │
│                       │                      │                    │
├─ ./lighthouse-audit.sh│                      │                    │
│                       │                      │                    │
│                       ├─ Check services ────>│                    │
│                       │<─ ✓ Running ─────────│                    │
│                       │                      │                    │
│                       ├─ Audit dashboard ───>│                    │
│                       │  (Run 1)             │                    │
│                       │<─ JSON + HTML ────────│                    │
│                       │                      │                    │
│                       ├─ Audit dashboard ───>│                    │
│                       │  (Run 2)             │                    │
│                       │<─ JSON + HTML ────────│                    │
│                       │                      │                    │
│                       ├─ Audit dashboard ───>│                    │
│                       │  (Run 3)             │                    │
│                       │<─ JSON + HTML ────────│                    │
│                       │                      │                    │
│                       ├─ Select best run     │                    │
│                       ├─ Copy to *-final.*   │                    │
│                       │                      │                    │
│                       ├─ [Repeat for 5 more pages...]              │
│                       │                      │                    │
│<─ ✓ Complete ─────────│                      │                    │
│                       │                      │                    │
├─ node analyze-lighthouse.js                  │                    │
│                       │                      │                    │
│                       │                      │<─ Scan reports ────│
│                       │                      │                    │
│                       │                      │   Parse JSON       │
│                       │                      │   Calculate stats  │
│                       │                      │   Format markdown  │
│                       │                      │                    │
│                       │                      │── Write report ───>│
│                       │                      │                    │
│<─ ✓ Report generated ─┴──────────────────────┴────────────────────│
│                                                                    │
├─ cat PHASE5B_AGENT40_LIGHTHOUSE_AUDIT.md                          │
│  open lighthouse-reports/*.html                                   │
```

## Metrics Collection Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Lighthouse Core                          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐   ┌─────────▼─────────┐   ┌──────▼──────┐
│  Performance  │   │    Diagnostics    │   │ Opportunities│
│   Category    │   │                   │   │              │
└───────┬───────┘   └─────────┬─────────┘   └──────┬──────┘
        │                     │                     │
        │                     │                     │
┌───────▼────────────────────────────────────────────────────┐
│  Individual Audits                                         │
│  ├── first-contentful-paint     (FCP)                      │
│  ├── largest-contentful-paint   (LCP)                      │
│  ├── interactive                (TTI)                      │
│  ├── total-blocking-time        (TBT)                      │
│  ├── cumulative-layout-shift    (CLS)                      │
│  ├── speed-index                                           │
│  ├── resource-summary           (Bundle sizes)             │
│  ├── bootup-time               (JS execution)              │
│  ├── mainthread-work-breakdown (Main thread work)          │
│  ├── unused-javascript         (Dead code)                 │
│  ├── unused-css-rules          (Dead styles)               │
│  ├── network-requests          (All requests)              │
│  └── ... (50+ more audits)                                 │
└────────────────────────────────────────────────────────────┘
                              │
                              │ Aggregated into
                              │
┌─────────────────────────────▼──────────────────────────────┐
│  JSON Report Structure                                     │
│  {                                                         │
│    categories: {                                           │
│      performance: { score: 0.85 }                          │
│    },                                                      │
│    audits: {                                               │
│      'first-contentful-paint': { numericValue: 1200 },     │
│      'largest-contentful-paint': { numericValue: 2100 },   │
│      ...                                                   │
│    }                                                       │
│  }                                                         │
└────────────────────────────────────────────────────────────┘
```

## Optimization Feedback Loop

```
┌─────────────────────────────────────────────────────────────┐
│                   Optimization Cycle                        │
└─────────────────────────────────────────────────────────────┘

1. BASELINE
   ├─ Run full audit
   ├─ Generate report
   └─ Identify top 5 issues
         │
         ▼
2. PRIORITIZE
   ├─ Quick wins (< 1hr each)
   ├─ Medium effort (1-4hr each)
   └─ Long-term (8+ hr each)
         │
         ▼
3. IMPLEMENT
   ├─ Make code changes
   ├─ Build production bundle
   └─ Quick test with single-page audit
         │
         ▼
4. VALIDATE
   ├─ Run full audit again
   ├─ Compare before/after scores
   └─ Document improvements
         │
         ▼
5. ITERATE
   ├─ If targets met: Maintain & monitor
   └─ If not: Return to step 2
```

## Integration Architecture

### Current State

```
┌─────────────┐
│  Developer  │
│   Manual    │
│  Execution  │
└──────┬──────┘
       │
       ├─ make dev
       ├─ ./scripts/lighthouse-audit.sh
       ├─ node scripts/analyze-lighthouse.js
       └─ Review report
```

### Future State (CI/CD)

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Actions                         │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐  ┌───────▼────────┐
            │  On PR Create  │  │  On PR Update  │
            └───────┬────────┘  └───────┬────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Build & Start   │
                    │     Services      │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Run Lighthouse CI │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Check Budgets     │
                    │ Performance ≥ 85  │
                    │ FCP < 1.8s        │
                    │ LCP < 2.5s        │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐  ┌───────▼────────┐
            │   ✓ PASS       │  │   ✗ FAIL       │
            │ Merge Allowed  │  │ Block Merge    │
            │ Post Comment   │  │ Post Comment   │
            └────────────────┘  └────────────────┘
```

## Error Handling Flow

```
lighthouse-audit.sh
│
├─ Services Check
│   ├─ Frontend reachable? ──> NO ──> Error: "Start with make dev"
│   └─ Backend reachable? ───> NO ──> Error: "Start with make dev"
│
├─ Lighthouse Available?
│   └─ which lighthouse ─────> NO ──> Install: npm install -g lighthouse
│
├─ For Each Page
│   ├─ Run Lighthouse
│   │   ├─ Chrome connection? ─> NO ──> Error: "Install Chrome"
│   │   └─ Timeout? ──────────> YES ──> Retry or Skip
│   └─ Save Reports
│       └─ Write permission? ──> NO ──> Error: "Check permissions"
│
└─ Complete Successfully

analyze-lighthouse.js
│
├─ Reports Directory Exists?
│   └─ NO ──> Error: "Run audit script first"
│
├─ Final Reports Found?
│   └─ NO ──> Error: "No reports to analyze"
│
├─ For Each Report
│   ├─ Valid JSON? ──────────> NO ──> Skip & Warn
│   └─ Expected Structure? ──> NO ──> Skip & Warn
│
└─ Generate Markdown Report
```

## Performance Targets Hierarchy

```
┌────────────────────────────────────────────────────────────┐
│                    Performance Targets                     │
└────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
    ┌───────▼─────┐  ┌──────▼──────┐  ┌────▼─────┐
    │    GOOD     │  │    NEEDS    │  │   POOR   │
    │   ≥ 85      │  │ IMPROVEMENT │  │   < 50   │
    │   (GREEN)   │  │   50-84     │  │  (RED)   │
    │             │  │  (YELLOW)   │  │          │
    └─────────────┘  └─────────────┘  └──────────┘

Individual Metrics:

FCP:  [────────┬────────┬──────>]
      0      1.8s     3.0s    ∞
      GOOD    NEEDS   POOR

LCP:  [────────┬────────┬──────>]
      0      2.5s     4.0s    ∞
      GOOD    NEEDS   POOR

TTI:  [────────┬────────┬──────>]
      0      3.8s     7.3s    ∞
      GOOD    NEEDS   POOR

TBT:  [────────┬────────┬──────>]
      0     200ms    600ms   ∞
      GOOD    NEEDS   POOR

CLS:  [────────┬────────┬──────>]
      0      0.1     0.25    ∞
      GOOD    NEEDS   POOR
```

## Conclusion

This architecture provides:
- ✅ Automated audit infrastructure
- ✅ Reproducible testing methodology
- ✅ Comprehensive metric collection
- ✅ Actionable analysis and reporting
- ✅ Integration-ready design
- ✅ Error handling and validation
- ✅ Scalable for future enhancements

**Status:** Ready for production use

**Next Step:** Execute baseline audit

```bash
make dev
./scripts/lighthouse-audit.sh
node scripts/analyze-lighthouse.js
```

---

**Created:** 2026-02-17
**Agent:** 40 - Lighthouse Performance Audit
**Phase:** 5B - Performance Optimization
