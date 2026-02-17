# Phase 3 - Agent 20: Jobs & Policies Module - Quick Start Guide

## Quick Test Execution

### Prerequisites
```bash
# Services must be running
docker ps | grep patchiq  # Verify containers are up

# Or start services
make dev-services  # Start DB, Redis, MinIO
make dev-backend   # Terminal 1
make dev-frontend  # Terminal 2
```

### Run Tests
```bash
# Full test suite (21 tests, ~5.5 minutes)
cd frontend
npm run test -- e2e/phase3-agent20-jobs-policies.spec.ts

# With UI mode (interactive)
npm run test:ui -- e2e/phase3-agent20-jobs-policies.spec.ts

# Generate HTML report
npm run test -- e2e/phase3-agent20-jobs-policies.spec.ts --reporter=html
```

### View Results
```bash
# Screenshots
ls -lah frontend/screenshots/phase3-agent20/

# Test report (if generated)
npx playwright show-report

# Logs
tail -f /tmp/phase3-agent20-test-final.txt
```

---

## Quick Manual Testing

### Test 1: Create Vulnerability Scan Job (2 min)
1. Login: http://localhost:5173/login
   - Email: `admin@patchiq.io`
   - Password: `admin123`

2. Navigate: **Vulnerability > Vulnerability Jobs > Scan Jobs**

3. Click **Create** button

4. Fill form:
   - Job Name: `Test Scan 001`
   - Description: `Manual test scan`
   - Scope: `Global (All Endpoints)`
   - Scan Type: `Instant (Run now)`

5. Click **Scan** button

6. ✅ Verify: Success notification appears

7. ✅ Verify: Job appears in list with status

### Test 2: View Job History (1 min)
1. On Vulnerability Jobs page, observe table columns:
   - Job ID
   - Name
   - Status
   - Last Run
   - Next Run

2. ✅ Verify: Data populates correctly

3. Click on a job row

4. ✅ Verify: Detail modal opens (if implemented)

### Test 3: Tab Navigation (30 sec)
1. On Vulnerability Jobs page, click **DB Sync** tab

2. ✅ Verify: Page switches to DB sync configuration

3. Click **Scan Jobs** tab

4. ✅ Verify: Returns to jobs list

### Test 4: Patch Jobs Page (1 min)
1. Navigate: **Patches > Patch Jobs**

2. ✅ Verify: Table renders with data

3. ✅ Verify: Refresh button works

4. ✅ Verify: No console errors

### Test 5: Deployment Policies (1 min)
1. Navigate: **Settings > Deployment Policies**

2. ✅ Verify: Page loads (may show empty state)

3. ⚠️ Note: Create button may not be visible (known P2 issue)

---

## Quick Verification Checklist

### Core Functionality
- [ ] Vulnerability jobs page loads
- [ ] Can create instant scan job
- [ ] Job status indicators visible
- [ ] Job history columns populated
- [ ] Tab navigation works
- [ ] Patch jobs page loads
- [ ] Deployment policies page loads
- [ ] No error boundaries triggered

### Performance
- [ ] Pages load in <20 seconds
- [ ] Forms submit in <5 seconds
- [ ] No UI freezing or lag
- [ ] Tables render smoothly

### UX
- [ ] Refresh button functional
- [ ] Success notifications appear
- [ ] Empty states handled gracefully
- [ ] Responsive layout (if applicable)

---

## Known Issues (P2 - Non-Blocking)

1. **Search missing on vulnerability jobs page**
   - Workaround: Use browser find (Ctrl+F)

2. **Export button missing on vulnerability jobs page**
   - Workaround: Manual copy or API export

3. **Create button not visible on deployment policies**
   - Workaround: Create via API or check permissions

---

## Key Routes

| Page | URL | Status |
|------|-----|--------|
| Vulnerability Jobs | `/vulnerability/vulnerability-jobs/list` | ✅ Working |
| DB Sync | `/vulnerability/vulnerability-jobs/db-sync` | ✅ Working |
| Patch Jobs | `/patches/patch-jobs` | ✅ Working |
| Deployment Policies | `/settings/deployment-policies` | ⚠️ Empty State |

---

## Test Credentials

```
Admin User:
  Email: admin@patchiq.io
  Password: admin123

Demo User:
  Email: demo@patchiq.io
  Password: demo123
```

---

## Screenshots Reference

Generated screenshots show:
1. Deployment policies page (empty state)
2. Patch jobs overview and table
3. Vulnerability jobs page and table
4. Create scan job modal
5. Job creation success
6. Status indicators
7. DB sync configuration
8. Refresh functionality
9. Pagination controls
10. Tab navigation

**Location:** `frontend/screenshots/phase3-agent20/`

---

## API Testing (Alternative to UI)

### Create Vulnerability Scan Job
```bash
curl -X POST http://localhost:3000/api/v1/jobs/vulnerability \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "API Test Scan",
    "description": "Created via API",
    "scope": "GLOBAL",
    "scanType": "INSTANT"
  }'
```

### List Vulnerability Jobs
```bash
curl -X GET http://localhost:3000/api/v1/jobs/vulnerability \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Deployment Policy
```bash
curl -X POST http://localhost:3000/api/v1/deployment-policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Policy",
    "description": "Created via API",
    "type": "INSTANT",
    "supportedModule": "Patch",
    "relatedType": "Critical"
  }'
```

---

## Troubleshooting

### Tests Fail with "element not found"
**Cause:** Services not running or database not seeded
**Fix:**
```bash
make dev-fresh  # Reset and restart everything
```

### "Cannot login" error
**Cause:** Backend not running or database connection issue
**Fix:**
```bash
# Check backend logs
docker logs patchiq-backend

# Restart backend
make dev-backend
```

### Screenshots not generated
**Cause:** Directory permissions or disk space
**Fix:**
```bash
mkdir -p frontend/screenshots/phase3-agent20
chmod 755 frontend/screenshots/phase3-agent20
```

### Slow test execution
**Cause:** Resource constraints or network issues
**Fix:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000  # 60 seconds

# Run single test
npm run test -- e2e/phase3-agent20-jobs-policies.spec.ts:159
```

---

## Next Steps After Testing

1. **Review Test Report:** `PHASE3_AGENT20_JOBS_POLICIES_REPORT.md`
2. **Check Bug List:** `PHASE3_AGENT20_BUGS.md`
3. **Triage P2 Issues:** Address UX improvements if time permits
4. **Sign-off:** Mark module as validated if all P0/P1 clear

---

**Quick Start Guide**
**Version:** 1.0
**Last Updated:** February 17, 2026
