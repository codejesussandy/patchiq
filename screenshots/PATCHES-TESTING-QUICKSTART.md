# Patches Module Testing - Quick Start Guide

## Prerequisites

1. **Services Running**
   ```bash
   # Start all services
   make dev

   # Or start individually
   make dev-services    # Database, Redis, MinIO
   make dev-backend     # Express API
   make dev-frontend    # React UI
   ```

2. **Verify Services**
   ```bash
   # Frontend should be accessible
   curl http://localhost:5173

   # Backend should respond
   curl http://localhost:3000/v1/health
   ```

3. **Test Credentials**
   - Email: `admin@patchiq.io`
   - Password: `admin123`

---

## Running Tests

### Quick Test (Fastest - 5 seconds)
```bash
cd frontend
npx playwright test e2e/patches-quick-test.spec.ts --project=chromium
```

**What it does**: Verifies patches page loads and displays data

---

### Debug Test (Diagnostic - 30 seconds)
```bash
cd frontend
npx playwright test e2e/patches-debug.spec.ts --project=chromium
```

**What it does**: Maximum logging, useful for troubleshooting

---

### Final Test Suite (Comprehensive - 5 minutes)
```bash
cd frontend
npx playwright test e2e/patches-module-final.spec.ts --project=chromium --workers=1
```

**What it does**: All 7 test scenarios with screenshots

---

### All Patches Tests
```bash
cd frontend
npx playwright test e2e/patches-*.spec.ts --project=chromium
```

---

## Viewing Results

### HTML Report
```bash
cd frontend
npx playwright show-report
```

This opens an interactive HTML report in your browser.

### Screenshots
```bash
open /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/
```

### Test Results
```bash
# Summary
cat screenshots/PATCHES-TEST-SUMMARY.txt

# Full report
open screenshots/PATCHES-TESTING-FINAL-REPORT.md

# JSON data
cat screenshots/patches-test-results.json | jq
```

---

## Common Issues & Solutions

### Issue: "Cannot connect to browser"
**Solution**: Install Playwright browsers
```bash
cd frontend
npx playwright install chromium
```

### Issue: "Login timeout"
**Solution**: Increase timeout or check backend is running
```bash
# Check backend
docker logs patchiq_backend --tail 20

# Restart if needed
docker restart patchiq_backend
```

### Issue: "Page not found"
**Solution**: Verify frontend is running and accessible
```bash
curl http://localhost:5173/patches
# Should return HTML, not error
```

### Issue: "No patches displayed"
**Solution**: Run database seed
```bash
make db-seed
# Or
cd backend && npm run db:seed
```

---

## Test Files Location

All test files are in: `/frontend/e2e/`

```
e2e/
├── patches-comprehensive.spec.ts   (614 lines) - Full test suite
├── patches-module-final.spec.ts    (370 lines) - Refined suite
├── patches-debug.spec.ts           (102 lines) - Debug test
└── patches-quick-test.spec.ts      (54 lines)  - Quick verify ✅
```

---

## Playwright Configuration

Config file: `/frontend/playwright.config.ts`

Key settings:
- Base URL: `http://localhost:5173`
- Test directory: `./e2e`
- Browser: Chromium (Desktop Chrome)
- Timeout: 60 seconds per test
- Retries: 1 retry on failure
- Workers: 1 (sequential execution)

---

## Manual Testing Checklist

If you want to manually verify without automation:

1. **Navigate to Patches**
   - Go to http://localhost:5173
   - Login with admin@patchiq.io / admin123
   - Click "Patches" in navigation

2. **Verify List Display**
   - [ ] Table shows patches
   - [ ] Columns: Software, ID, Endpoints, OS, Severity
   - [ ] Pagination shows "1-10 of 14 items"
   - [ ] Severity badges have colors (Red=Critical, Orange=High, Yellow=Medium)

3. **Test Search**
   - [ ] Type in search box
   - [ ] Results filter as you type
   - [ ] Clear search resets list

4. **Test Filters**
   - [ ] Click "Filter" button
   - [ ] Select severity level
   - [ ] Click category (Windows/Mac/Linux) in sidebar
   - [ ] Results update accordingly

5. **Test Sorting**
   - [ ] Click column header
   - [ ] Table re-orders
   - [ ] Click again for reverse sort

6. **Test Detail View**
   - [ ] Click on a patch
   - [ ] Detail page shows
   - [ ] Information is complete

7. **Test Deploy**
   - [ ] On detail page, find Deploy button
   - [ ] Click Deploy
   - [ ] Modal or wizard opens

---

## Expected Test Results

### Quick Test Output
```
✅ Logged in
📍 Navigated to /patches
📸 Screenshot: patches-list-initial.png

📊 Page Info:
  URL: http://localhost:5173/patches
  Title: frontend
  Body length: 946 chars

🔍 Elements:
  Has table: true
  Table rows: 11
  Headings: ["All Patches"]

✅ Test completed successfully
  ✓  1 passed (5.1s)
```

### Expected Screenshots
1. `patches-list-initial.png` - Main patches list view

---

## Continuous Integration

To run tests in CI/CD pipeline:

```yaml
# .github/workflows/patches-tests.yml
- name: Run Patches Tests
  run: |
    cd frontend
    npx playwright test e2e/patches-*.spec.ts --reporter=json
```

---

## Performance Benchmarks

| Metric | Target | Typical |
|--------|--------|---------|
| Page Load | < 10s | ~4-5s |
| Time to Interactive | < 5s | ~3s |
| Table Render | < 3s | < 1s |

---

## Debugging Tips

### Enable Playwright UI Mode
```bash
cd frontend
npx playwright test e2e/patches-quick-test.spec.ts --ui
```

### Run in Headed Mode (See Browser)
```bash
cd frontend
npx playwright test e2e/patches-quick-test.spec.ts --headed
```

### Step Through Test
```bash
cd frontend
npx playwright test e2e/patches-quick-test.spec.ts --debug
```

### Trace Viewer (After Failure)
```bash
cd frontend
npx playwright show-trace test-results/.../trace.zip
```

---

## Contact & Support

- Test Suite Author: Claude Code
- Framework: Playwright 1.57.0
- Documentation: https://playwright.dev
- Project: PatchIQ Full Stack

---

## Quick Commands Cheat Sheet

```bash
# Start everything
make dev

# Run quick test
cd frontend && npx playwright test e2e/patches-quick-test.spec.ts

# View report
cd frontend && npx playwright show-report

# View screenshots
open screenshots/

# Check services
docker ps

# Backend logs
docker logs patchiq_backend

# Frontend logs
docker logs patchiq_frontend

# Restart service
docker restart patchiq_backend

# Run seed
make db-seed
```

---

**Last Updated**: February 16, 2026
**Version**: 1.0
