# Quick Start: Dashboard Test Execution

## Prerequisites Check

```bash
# 1. Check if Docker is running
docker --version

# 2. Check if services are up
curl http://localhost:5173        # Frontend (should return 200)
curl http://localhost:3000/api/health  # Backend (should return 200)
```

## Start Services (if not running)

```bash
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2

# Option 1: Full stack with Docker
make dev

# Option 2: Manual start (3 terminals)
# Terminal 1:
make dev-services

# Terminal 2:
make dev-backend

# Terminal 3:
make dev-frontend
```

## Run Dashboard Test

### Method 1: Standalone Script (Recommended)

```bash
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2

# Run test
node test-dashboard-standalone.mjs

# View results
open screenshots/dashboard-test-report.txt
open screenshots/dashboard-stats.png
open screenshots/dashboard-vulnerabilities.png
open screenshots/vulnerability-detail.png
```

### Method 2: Playwright Test Suite

```bash
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/frontend

# Run tests
npx playwright test e2e/dashboard-detailed.spec.ts --config=playwright.config.test.ts

# View HTML report
npx playwright show-report
```

### Method 3: Existing Dashboard Tests

```bash
cd /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/frontend

# Run existing tests (uses port 5001)
npx playwright test e2e/dashboard.spec.ts
```

## Expected Results

### Success Output

```
═══════════════════════════════════════════════════════════
Test: Dashboard
Status: PASS
═══════════════════════════════════════════════════════════

Page Load Time: 1523ms (Target: < 3000ms)
✓ PASS

Stats Cards Present: 4/4
✓ PASS

Top Vulnerabilities Section: PRESENT

Navigation Test: PASS

Screenshots:
  - /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/dashboard-stats.png
  - /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/dashboard-vulnerabilities.png
  - /Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/vulnerability-detail.png

Console Errors: 0
  None

═══════════════════════════════════════════════════════════
Overall: PASS
Bugs found: 0
═══════════════════════════════════════════════════════════
```

## Troubleshooting

### Error: "Frontend not accessible"
- Ensure Docker is running: `docker ps`
- Start services: `make dev`
- Wait 30 seconds for services to initialize

### Error: "Login failed"
- Check backend is running: `curl http://localhost:3000/api/health`
- Verify database is seeded: `make db-seed`
- Check credentials: admin@patchiq.io / admin123

### Error: "Port already in use"
- Stop other instances: `make down`
- Check port usage: `lsof -i :5173`
- Use different ports or kill conflicting processes

## Test Credentials

- **Email:** admin@patchiq.io
- **Password:** admin123

## Output Files

All test artifacts are saved to:
```
/Users/shandesh/src/VS-code/PatchIQ/full-dev-sandy-v2/screenshots/
├── dashboard-stats.png
├── dashboard-vulnerabilities.png
├── vulnerability-detail.png
└── dashboard-test-report.txt
```
