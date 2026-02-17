# Lighthouse Reports Directory

This directory contains generated Lighthouse performance audit reports.

## Structure

After running `./scripts/lighthouse-audit.sh`, this directory will contain:

```
lighthouse-reports/
├── dashboard-run1.report.html
├── dashboard-run1.report.json
├── dashboard-run2.report.html
├── dashboard-run2.report.json
├── dashboard-run3.report.html
├── dashboard-run3.report.json
├── dashboard-final.html          # Best of 3 runs
├── dashboard-final.json
├── assets-run1.report.html
├── assets-run1.report.json
├── assets-run2.report.html
├── assets-run2.report.json
├── assets-run3.report.html
├── assets-run3.report.json
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

## File Types

- **`.report.html`**: Interactive HTML report (open in browser)
- **`.report.json`**: Raw JSON data (used by analyze-lighthouse.js)
- **`*-final.*`**: Best run out of 3 iterations

## Viewing Reports

```bash
# Open all final reports
open lighthouse-reports/*-final.html

# Open specific page
open lighthouse-reports/dashboard-final.html

# Or use any browser
google-chrome lighthouse-reports/dashboard-final.html
firefox lighthouse-reports/dashboard-final.html
```

## Git Ignore

This directory is git-ignored to avoid committing large binary files. Only the README is tracked.

## Regenerating Reports

```bash
# Full audit (all pages)
./scripts/lighthouse-audit.sh

# Single page
./scripts/lighthouse-single.sh dashboard http://localhost:5173/dashboard

# Analyze and generate markdown report
node scripts/analyze-lighthouse.js
```

## Retention

Reports are overwritten on each audit run. Archive important baseline reports before re-running if you need to compare versions.

```bash
# Archive current reports
tar -czf lighthouse-reports-$(date +%Y%m%d).tar.gz lighthouse-reports/

# Or rename
mv lighthouse-reports lighthouse-reports-baseline
mkdir lighthouse-reports
```

---

**Note:** This directory starts empty. Run the audit scripts to populate it.
