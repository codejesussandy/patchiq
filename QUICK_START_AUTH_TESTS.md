# Quick Start: Authentication Tests

## 1-Minute Setup

```bash
# Start services (if not running)
./scripts/start-services-for-tests.sh

# Run authentication tests
./scripts/run-auth-tests.sh

# View results
ls -la screenshots/
cat AUTH_TEST_REPORT.md
```

## What Gets Tested

✅ **Valid Login** - admin@patchiq.io logs in successfully
✅ **Invalid Login** - Wrong password shows error
✅ **Session Persistence** - Session survives page reload

## Test Output

- **Screenshots**: `screenshots/*.png`
- **HTML Report**: `frontend/playwright-report-auth/index.html`
- **Summary**: `AUTH_TEST_REPORT.md`

## View HTML Report

```bash
cd frontend && npx playwright show-report playwright-report-auth
```

## Debug Mode

```bash
cd frontend
npx playwright test --config=playwright-auth.config.ts --ui
```

## Prerequisites

- ✅ Frontend on http://localhost:5173
- ✅ Backend on http://localhost:3000
- ✅ Database seeded with admin user

## Clean Up

```bash
./scripts/stop-services.sh
```

## Need Help?

📖 Read: `AUTH_TESTING_README.md`
📋 Full details: `PHASE1_AGENT1_INSTRUCTIONS.md`
📊 Implementation: `PHASE1_AGENT1_SUMMARY.md`

---

**Test Credentials**: admin@patchiq.io / admin123
