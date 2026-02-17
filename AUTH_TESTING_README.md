# Authentication Testing with Playwright

This document describes how to run automated authentication tests for PatchIQ using Playwright.

## Prerequisites

Before running the tests, ensure both services are running:

1. **Frontend** must be running on `http://localhost:5173`
   ```bash
   make dev-frontend
   # OR
   cd frontend && npm run dev
   ```

2. **Backend** must be running on `http://localhost:3000`
   ```bash
   make dev-backend
   # OR
   cd backend && npm run dev
   ```

3. **Database** must be seeded with test user
   ```bash
   make db-seed
   ```

   Test credentials:
   - Email: `admin@patchiq.io`
   - Password: `admin123`

## Quick Start

### Option 1: Use the automated script (Recommended)

```bash
./scripts/run-auth-tests.sh
```

This script will:
- Check if services are running
- Run all authentication test scenarios
- Capture screenshots
- Generate a test report at `AUTH_TEST_REPORT.md`

### Option 2: Run Playwright directly

```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts
```

View the HTML report:
```bash
cd frontend
npx playwright show-report playwright-report-auth
```

### Option 3: Run in UI mode (for debugging)

```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts --ui
```

## Test Scenarios

The test suite covers three critical authentication scenarios:

### 1. Valid Login
- Navigate to login page
- Fill in valid credentials (admin@patchiq.io / admin123)
- Click submit
- **Expected**: Redirect to `/dashboard`, user email visible, no console errors

### 2. Invalid Login
- Navigate to login page
- Fill in invalid credentials (admin@patchiq.io / wrongpassword)
- Click submit
- **Expected**: Error message displayed, stay on `/login`, 401 error in console

### 3. Session Persistence
- Log in with valid credentials
- Reload the page (F5)
- **Expected**: Still on `/dashboard`, not redirected to `/login`

## Test Artifacts

After running tests, you'll find:

- **Screenshots**: `screenshots/`
  - `login-form-filled.png` - Login form with credentials
  - `login-success.png` - Successful login (dashboard)
  - `login-invalid.png` - Failed login with error
  - `session-persist.png` - Dashboard after page reload

- **HTML Report**: `frontend/playwright-report-auth/index.html`
  - Detailed test results
  - Console logs
  - Network activity
  - Traces and videos

- **JSON Results**: `frontend/playwright-report-auth/results.json`
  - Machine-readable test results

- **Test Report**: `AUTH_TEST_REPORT.md`
  - Human-readable summary

## Troubleshooting

### Tests fail immediately
- Check if frontend is accessible: `curl http://localhost:5173`
- Check if backend is accessible: `curl http://localhost:3000/health`
- Ensure database is seeded: `make db-seed`

### Login page doesn't load
- Check frontend logs for errors
- Verify nginx configuration if using Docker
- Try accessing http://localhost:5173/login in a browser

### Valid login fails
- Verify test user exists in database
- Check backend logs for authentication errors
- Ensure JWT secret is configured correctly

### Session doesn't persist
- Check if cookies are being set properly
- Verify token storage mechanism (localStorage/sessionStorage)
- Check AuthContext implementation

## Development Tips

### Watch mode
Run tests in watch mode while developing:
```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts --watch
```

### Debug specific test
```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts --grep "Valid Login" --debug
```

### Update snapshots (if using visual regression)
```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts --update-snapshots
```

## Test Configuration

The test configuration is in `frontend/playwright-auth.config.ts`:

- **Base URL**: `http://localhost:5173`
- **Browser**: Chromium (Desktop Chrome)
- **Viewport**: 1920x1080
- **Timeout**: 60 seconds per test
- **Screenshots**: Enabled for all tests
- **Videos**: Enabled for all tests
- **Traces**: Enabled for debugging

## CI/CD Integration

To run these tests in CI/CD:

```bash
# Start services
make dev-services
make dev-backend &
make dev-frontend &

# Wait for services to be ready
sleep 30

# Run tests
./scripts/run-auth-tests.sh

# Tests will exit with non-zero code if they fail
```

## Adding More Tests

To add new authentication test scenarios:

1. Edit `frontend/tests/auth-flows.spec.ts`
2. Add new `test()` blocks within the `test.describe('Authentication Flows')` block
3. Follow the existing pattern:
   - Clear cookies before each test
   - Take screenshots at key points
   - Log console errors
   - Assert expected behavior

Example:
```typescript
test('Scenario 4 - Logout', async ({ page }) => {
  // Login first
  await page.goto('/login');
  // ... login code ...

  // Click logout
  await page.click('[data-testid="logout-button"]');

  // Verify redirect to login
  await page.waitForURL('**/login**');
  await page.screenshot({ path: 'screenshots/logout.png' });

  expect(page.url()).toContain('/login');
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Test Reporters](https://playwright.dev/docs/test-reporters)
