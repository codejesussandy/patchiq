# Phase 1 Agent 1: Authentication Testing Instructions

## Overview
This document provides complete instructions for testing all login scenarios using Playwright browser automation.

## Files Created

1. **Test Suite**: `/frontend/tests/auth-flows.spec.ts`
   - Comprehensive Playwright test covering all 3 scenarios
   - Automated screenshot capture
   - Console error tracking
   - Detailed logging

2. **Test Configuration**: `/frontend/playwright-auth.config.ts`
   - Custom Playwright config for port 5173
   - Enabled traces, screenshots, and videos
   - Optimized for authentication testing

3. **Test Runner Script**: `/scripts/run-auth-tests.sh`
   - Automated prerequisite checking
   - Test execution
   - Report generation

4. **Documentation**:
   - `/AUTH_TESTING_README.md` - Complete testing guide
   - `/PHASE1_AGENT1_INSTRUCTIONS.md` - This file

## Prerequisites

### 1. Start Backend
```bash
# Option 1: Using Make
make dev-backend

# Option 2: Direct command
cd backend && npm run dev
```

Backend should be running on: **http://localhost:3000**

### 2. Start Frontend
```bash
# Option 1: Using Make
make dev-frontend

# Option 2: Direct command
cd frontend && npm run dev
```

Frontend should be running on: **http://localhost:5173**

### 3. Ensure Database is Seeded
```bash
make db-seed
```

Test credentials:
- Email: `admin@patchiq.io`
- Password: `admin123`

### 4. Verify Services are Running
```bash
# Check frontend
curl http://localhost:5173

# Check backend
curl http://localhost:3000/health
```

## Running the Tests

### Method 1: Automated Script (Recommended)

```bash
./scripts/run-auth-tests.sh
```

This will:
- ✅ Check if services are running
- ✅ Create screenshot directory
- ✅ Run all test scenarios
- ✅ Capture screenshots at key points
- ✅ Generate test report

### Method 2: Direct Playwright Command

```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts
```

View HTML report:
```bash
cd frontend
npx playwright show-report playwright-report-auth
```

### Method 3: UI Mode (Interactive Debugging)

```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts --ui
```

This opens Playwright's UI where you can:
- Watch tests run in real-time
- Pause and step through tests
- Inspect DOM and network
- Debug failures

## Test Scenarios

### Scenario 1: Valid Login ✅
**Steps:**
1. Navigate to http://localhost:5173/login
2. Wait for page to load completely
3. Fill email field: `admin@patchiq.io`
4. Fill password field: `admin123`
5. Click "Log in" button
6. Wait for redirect to /dashboard

**Expected Results:**
- URL contains `/dashboard`
- User email visible in UI
- No unexpected console errors
- Screenshot saved: `screenshots/login-success.png`

### Scenario 2: Invalid Login ❌
**Steps:**
1. Navigate to http://localhost:5173/login
2. Fill email field: `admin@patchiq.io`
3. Fill password field: `wrongpassword`
4. Click "Log in" button
5. Wait for error message

**Expected Results:**
- Error message displays (Ant Design message component)
- Still on `/login` (no redirect)
- 401 error in console (expected)
- Screenshot saved: `screenshots/login-invalid.png`

### Scenario 3: Session Persistence 🔄
**Steps:**
1. Log in with valid credentials
2. Verify redirect to /dashboard
3. Refresh the page (F5)
4. Wait for page to reload

**Expected Results:**
- Still on `/dashboard` after refresh
- Not redirected to `/login`
- Session persists via localStorage token
- Screenshot saved: `screenshots/session-persist.png`

## Test Artifacts

After running tests, the following artifacts will be generated:

### Screenshots Directory
Location: `/screenshots/`

Files:
- `login-form-filled.png` - Login form with credentials filled
- `login-success.png` - Dashboard after successful login
- `login-invalid.png` - Login page with error message
- `session-persist.png` - Dashboard after page reload

### HTML Report
Location: `/frontend/playwright-report-auth/index.html`

To view:
```bash
cd frontend
npx playwright show-report playwright-report-auth
```

Contains:
- Test results for each scenario
- Console logs
- Network activity
- Screenshots and videos
- Execution traces

### JSON Results
Location: `/frontend/playwright-report-auth/results.json`

Machine-readable test results for CI/CD integration.

### Test Summary Report
Location: `/AUTH_TEST_REPORT.md`

Human-readable markdown report with:
- Overall status (PASS/FAIL)
- Individual scenario results
- Screenshot references
- Console error summary

## Interpreting Results

### Success Criteria

All three scenarios should PASS with:
- ✅ Valid login redirects to dashboard
- ✅ Invalid login shows error (no redirect)
- ✅ Session persists after reload
- ✅ Zero unexpected console errors

### Common Issues

#### Frontend not running
```
❌ ERROR: Frontend is not running on http://localhost:5173
```
**Solution**: Start frontend with `make dev-frontend`

#### Backend not running
```
⚠️ WARNING: Backend health check failed
```
**Solution**: Start backend with `make dev-backend`

#### Invalid credentials error
```
✗ Failed to redirect to dashboard
```
**Possible causes**:
- Database not seeded
- Backend authentication issue
- Network error

**Solution**:
1. Check backend logs
2. Run `make db-seed`
3. Verify user exists: `make db-studio`

#### Session doesn't persist
```
Redirected to login: true
```
**Possible causes**:
- Token not stored in localStorage
- Token expired
- AuthContext issue

**Solution**:
1. Check browser console for localStorage
2. Verify token expiration settings
3. Check AuthContext initialization

## Debugging Tests

### Run specific scenario
```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts --grep "Valid Login"
```

### Debug mode (step through)
```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts --grep "Valid Login" --debug
```

### View traces
```bash
cd frontend
npx playwright show-trace test-results/auth-flows-Scenario-1-Valid-Login-chromium/trace.zip
```

### Check console output
Console errors are logged during test execution. Check:
1. Test output in terminal
2. HTML report (Console tab)
3. Trace viewer (Console panel)

## Manual Verification

If you want to manually verify the scenarios:

### Manual Test: Valid Login
1. Open browser to http://localhost:5173/login
2. Enter: `admin@patchiq.io` / `admin123`
3. Click "Log in"
4. Should redirect to http://localhost:5173/dashboard
5. User email should appear somewhere in UI

### Manual Test: Invalid Login
1. Open browser to http://localhost:5173/login
2. Enter: `admin@patchiq.io` / `wrongpassword`
3. Click "Log in"
4. Should see error message (red notification)
5. Should stay on login page

### Manual Test: Session Persistence
1. Log in successfully (see Manual Test: Valid Login)
2. Press F5 to reload page
3. Should stay on dashboard (not redirect to login)

## Report Format

The test report follows this format:

```markdown
Test: Authentication Flows
Status: PASS/FAIL

Scenario 1 - Valid Login: PASS/FAIL
- Screenshot: screenshots/login-success.png
- Console errors: 0
- Notes: All assertions passed

Scenario 2 - Invalid Login: PASS/FAIL
- Screenshot: screenshots/login-invalid.png
- Error message shown: YES
- Notes: Expected 401 error in console

Scenario 3 - Session Persistence: PASS/FAIL
- Screenshot: screenshots/session-persist.png
- Session persists: YES
- Notes: Token found in localStorage

Overall: PASS
Bugs found: 0
```

## Next Steps

After running tests:

1. **Review Screenshots**
   ```bash
   ls -la /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots
   ```

2. **View HTML Report**
   ```bash
   cd frontend && npx playwright show-report playwright-report-auth
   ```

3. **Read Summary Report**
   ```bash
   cat AUTH_TEST_REPORT.md
   ```

4. **Check for Failures**
   - If any test fails, check the HTML report for details
   - Review screenshots for visual verification
   - Check console logs for errors
   - Debug using `--debug` or `--ui` mode

## CI/CD Integration

To integrate these tests into CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Start services
  run: |
    make dev-services
    make dev-backend &
    make dev-frontend &

- name: Wait for services
  run: sleep 30

- name: Run authentication tests
  run: ./scripts/run-auth-tests.sh

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: frontend/playwright-report-auth/
```

## Troubleshooting

### Playwright not installed
```bash
cd frontend
npx playwright install chromium
```

### Port conflicts
If services are on different ports, update:
- `/frontend/playwright-auth.config.ts` - `baseURL`
- Test credentials in `.env`

### Test timeout
Increase timeout in `playwright-auth.config.ts`:
```typescript
timeout: 120000, // 2 minutes
```

## Support

For issues or questions:
1. Check `AUTH_TESTING_README.md` for detailed guidance
2. Review Playwright documentation: https://playwright.dev
3. Check test logs in HTML report
4. Use `--debug` or `--ui` mode for interactive debugging

---

**Created**: 2026-02-16
**Last Updated**: 2026-02-16
**Version**: 1.0.0
