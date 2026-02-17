# GitHub Actions CI/CD Workflows

This directory contains the complete CI/CD pipeline for PatchIQ. All workflows are designed for parallel execution, fast failure, and comprehensive test coverage.

## 📋 Workflow Overview

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| **Frontend Tests** | PR/Push to frontend | Frontend testing pipeline | ~15-20 min |
| **Backend Tests** | PR/Push to backend | Backend testing pipeline | ~15-25 min |
| **Full Stack Tests** | PR/Push (main) | Complete integration testing | ~30-45 min |
| **PR Automation** | PR opened/updated | Auto-comment test results | ~5 min |
| **Type Safety** | PR/Push | TypeScript validation | ~5 min |

## 🚀 Frontend Tests Workflow

**File**: `frontend-tests.yml`

### Jobs

#### 1. Quick Validation (Fast Fail)
**Duration**: ~3-5 minutes
**Purpose**: Fail fast on code quality issues

- ESLint check (zero warnings enforced)
- TypeScript type check
- Build test
- Bundle size check (warns if > 3MB)

**Artifacts**:
- `frontend-build`: Build output for debugging

#### 2. Unit Tests
**Duration**: ~5-8 minutes
**Depends on**: Quick Validation
**Purpose**: Test component logic and utilities

- Runs Vitest unit tests with coverage
- Enforces 70% coverage threshold
- Generates coverage reports

**Artifacts**:
- `frontend-unit-coverage`: Coverage data (7 days)

#### 3. Integration Tests
**Duration**: ~5-8 minutes
**Depends on**: Quick Validation (parallel with Unit Tests)
**Purpose**: Test API integration with MSW

- Runs integration tests with mocked backend
- Tests React Query hooks
- Validates API contracts

**Artifacts**:
- `frontend-integration-results`: Test results (7 days)

#### 4. E2E Tests (Matrix)
**Duration**: ~15-20 minutes
**Depends on**: Unit + Integration Tests
**Purpose**: Browser testing across multiple engines

**Matrix Strategy**:
- `chromium`: Main browser
- `firefox`: Firefox compatibility
- `webkit`: Safari compatibility

**Services**:
- PostgreSQL 15
- Redis 7
- Full backend server

**Artifacts** (per browser):
- `playwright-report-{browser}`: HTML test report
- `playwright-screenshots-{browser}`: Screenshots on failure (7 days)

#### 5. Critical Path Tests
**Duration**: ~10-15 minutes
**Depends on**: Quick Validation
**Purpose**: Fast E2E subset for quick feedback

Runs:
- `scripts/critical-path-tests.sh`
- Core CRUD operations
- User management
- Asset management

#### 6. Security Tests
**Duration**: ~10-12 minutes
**Depends on**: Quick Validation
**Purpose**: Security and accessibility validation

Runs:
- `scripts/security-tests.sh`
- Form validation tests
- XSS protection tests
- Accessibility tests (a11y)

#### 7. Test Summary
**Depends on**: All previous jobs
**Purpose**: Aggregate results and fail if critical tests fail

- Generates markdown summary
- Posts to GitHub Step Summary
- Fails if unit/integration/E2E fails

## 🔧 Backend Tests Workflow

**File**: `backend-tests.yml`

### Jobs

#### 1. Quick Validation
**Duration**: ~3-5 minutes

- ESLint check
- TypeScript type check
- Verify zero `as any`, `as unknown as`, `@ts-ignore`
- Build test
- Prisma schema validation

#### 2. Unit Tests
**Duration**: ~5-10 minutes
**Coverage Threshold**: 80% (lines, functions, branches, statements)

**Artifacts**:
- `backend-unit-coverage`: Coverage reports (7 days)

#### 3. Integration Tests
**Duration**: ~8-12 minutes
**Services**: PostgreSQL, Redis

- Database integration tests
- Service layer tests
- Repository tests

**Artifacts**:
- `backend-integration-results`: Test results (7 days)

#### 4. E2E Tests
**Duration**: ~15-20 minutes
**Services**: PostgreSQL, Redis, MinIO

- API endpoint tests
- Full request/response validation
- Multi-step workflows

**Artifacts**:
- `backend-e2e-results`: Test results (7 days)

#### 5. Contract Tests
**Duration**: ~10-15 minutes
**Purpose**: Validate API contracts match Zod schemas

- Response shape validation
- Request validation
- Type safety checks

**Artifacts**:
- `backend-contract-results`: Test results (7 days)

#### 6. Migration Tests
**Duration**: ~5-8 minutes
**Purpose**: Validate database migrations

- Fresh migration test
- Schema validation
- Migration idempotency

#### 7. Performance Tests
**Duration**: ~15-20 minutes
**Only runs on**: `main` branch
**Purpose**: Performance benchmarks

- Large dataset tests
- Concurrent operation tests
- Query performance tests

**Artifacts**:
- `backend-performance-results`: Results (30 days)

#### 8. Test Summary
Aggregates all test results and fails if critical tests fail.

## 🌐 Full Stack Tests Workflow

**File**: `full-stack-tests.yml`

**Triggers**:
- PR/Push to `main` (when backend/frontend/shared changes)
- Manual dispatch via GitHub UI

### Jobs

#### 1. Full Infrastructure
**Duration**: ~25-35 minutes
**Services**: PostgreSQL, Redis, MinIO

- Starts complete backend + frontend
- Runs full Playwright E2E suite
- Tests file upload workflows
- Validates complete user workflows

**Artifacts**:
- `full-stack-test-results`: E2E results (7 days)
- `server-logs`: Server logs on failure (7 days)

#### 2. Database Scenarios
**Duration**: ~15-20 minutes
**Purpose**: Real database testing

Tests:
- Minimal dataset generation
- Standard dataset generation
- Transaction scenarios
- Concurrent database operations

#### 3. MinIO Upload Tests
**Duration**: ~12-18 minutes
**Purpose**: Real file storage testing

- Package upload tests
- Script upload tests
- File retrieval tests
- MinIO bucket verification

#### 4. Workflow Integration
**Duration**: ~15-20 minutes
**Purpose**: Complete deployment workflow testing

Runs: `npm run test:e2e:workflow`
- End-to-end deployment scenarios
- Multi-step job workflows
- Agent registration → asset discovery → patch deployment

#### 5. Test Summary
Aggregates full stack results.

## 🤖 PR Automation Workflow

**File**: `pr-automation.yml`

**Triggers**: PR opened, synchronized, or reopened

### Jobs

#### 1. PR Comment
Posts comprehensive test results as PR comment:

**Includes**:
- Frontend coverage table with badges
- Backend coverage table with badges
- Bundle size analysis
- Test status summary
- Links to detailed reports

**Features**:
- Updates existing comment (no spam)
- Color-coded coverage badges
- Bundle size change tracking

#### 2. Status Checks
Waits for required workflows and blocks merge if they fail.

#### 3. Performance Metrics
Analyzes frontend bundle:
- Total bundle size
- JavaScript size
- CSS size
- Warns if bundle > 3MB

#### 4. Code Quality Summary
Counts:
- TypeScript files
- Test files
- Lines of code
- Test coverage

#### 5. Auto-label PR
Automatically labels PRs based on changed files:
- `backend`: Backend changes
- `frontend`: Frontend changes
- `shared`: Shared types changes
- `agent`: Agent changes
- `tests`: Test file changes
- `documentation`: Markdown changes

## 📊 Status Badges

Add these to your README.md:

```markdown
[![Frontend Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/frontend-tests.yml)
[![Backend Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/backend-tests.yml)
[![Full Stack Tests](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/full-stack-tests.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/full-stack-tests.yml)
[![Type Safety](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/type-safety.yml/badge.svg)](https://github.com/YOUR_ORG/PatchIQ/actions/workflows/type-safety.yml)
```

Replace `YOUR_ORG` with your GitHub organization/username.

## 🐛 Debugging Failed Workflows

### Frontend Test Failures

#### Quick Validation Failed

**Lint errors**:
```bash
cd frontend
npm run lint
npm run lint:fix  # Auto-fix
```

**Type errors**:
```bash
cd frontend
npm run type-check
```

**Build errors**:
```bash
cd frontend
npm run build
```

#### Unit Test Failures

**Run locally**:
```bash
cd frontend
npm run test:unit
npm run test:unit -- --watch  # Watch mode
npm run test:unit -- path/to/test.test.ts  # Single test
```

**Coverage below threshold**:
- Add tests for uncovered code
- Check `frontend/coverage/lcov-report/index.html` for details

#### E2E Test Failures

**Run locally**:
```bash
# Start backend first
cd backend && npm run dev

# In another terminal
cd frontend
npm test  # Runs Playwright
npm run test:debug  # Debug mode
npm run test:ui  # UI mode
```

**View test report**:
```bash
cd frontend
npm run test:report
```

**Artifacts**:
- Download `playwright-report-{browser}` from workflow
- Download `playwright-screenshots-{browser}` for failure screenshots

### Backend Test Failures

#### Quick Validation Failed

**Lint errors**:
```bash
cd backend
npm run lint
npm run lint:fix
```

**Type escape hatches found**:
Search and fix all instances of:
- `as any`
- `as unknown as`
- `@ts-ignore`

#### Unit Test Failures

**Run locally**:
```bash
cd backend
npm run test:unit
npm run test:unit -- --watch
npm run test:unit -- path/to/test.test.ts
```

#### Integration Test Failures

**Run locally**:
```bash
# Start services
make dev-services  # PostgreSQL + Redis

# Run tests
cd backend
npm run test:integration
```

#### E2E Test Failures

**Run locally**:
```bash
# Start full stack
make dev

# Run E2E tests
cd backend
npm run test:e2e
npm run test:e2e:auth  # Specific module
```

#### Contract Test Failures

**Issue**: API response doesn't match Zod schema

**Fix**:
1. Check `backend/tests/contract/schemas/`
2. Update schema or fix API response
3. Ensure types in `shared/types/api.ts` match

### Full Stack Test Failures

#### Infrastructure Startup Issues

**Database not ready**:
- Check PostgreSQL health checks
- Increase timeout in workflow

**Backend not starting**:
- Check DATABASE_URL is correct
- Check Redis connection
- View server logs artifact

**MinIO not ready**:
- Check MinIO health endpoint
- Verify bucket creation step

**Run locally**:
```bash
make dev-fresh  # Fresh start with reset
```

## 🎯 Coverage Requirements

| Component | Lines | Branches | Functions | Statements |
|-----------|-------|----------|-----------|------------|
| **Frontend** | 70% | 70% | 70% | 70% |
| **Backend** | 80% | 80% | 80% | 80% |

Frontend configured in: `frontend/vitest.config.ts`
Backend configured in: `backend/jest.config.js`

## ⚡ Performance Optimization

### Caching Strategy

All workflows use npm caching:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: |
      frontend/package-lock.json
      backend/package-lock.json
      shared/package-lock.json
```

### Playwright Browser Caching

Browsers are cached automatically by `@playwright/test`.

### Parallel Execution

**Frontend**: Unit and Integration tests run in parallel
**Backend**: Unit and Integration tests run in parallel
**E2E**: Matrix strategy runs browsers in parallel

### Timeout Configuration

| Job Type | Timeout |
|----------|---------|
| Quick Validation | 10 min |
| Unit Tests | 15 min |
| Integration Tests | 20 min |
| E2E Tests | 30 min |
| Full Stack | 45 min |

## 🔄 Workflow Concurrency

Each workflow uses concurrency groups to cancel old runs:

```yaml
concurrency:
  group: frontend-${{ github.ref }}
  cancel-in-progress: true
```

This saves CI minutes when pushing multiple commits quickly.

## 📝 Test Execution Time Breakdown

### Frontend Tests (Total: ~20 minutes)

```
Quick Validation:     3 min  ━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░
Unit Tests:           5 min          ━━━━━━━━━━━━━━━━━━━━░░░░░░
Integration Tests:    5 min          ━━━━━━━━━━━━━━━━━━━━░░░░░░
E2E (Chromium):       7 min                  ━━━━━━━━━━━━━━━━━━━━━━
E2E (Firefox):        7 min                  ━━━━━━━━━━━━━━━━━━━━━━
E2E (WebKit):         7 min                  ━━━━━━━━━━━━━━━━━━━━━━
Critical Path:       10 min          ━━━━━━━━━━━━━━━━━━━━━━━━━━━
Security Tests:      10 min          ━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Actual wall time**: ~15-20 min (due to parallel execution)

### Backend Tests (Total: ~25 minutes)

```
Quick Validation:     3 min  ━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░
Unit Tests:           8 min          ━━━━━━━━━━━━━━━━━━━━━━━━░░
Integration Tests:   10 min          ━━━━━━━━━━━━━━━━━━━━━━━━━━━
E2E Tests:           15 min                  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Contract Tests:      10 min          ━━━━━━━━━━━━━━━━━━━━━━━━━━━
Migration Tests:      5 min          ━━━━━━━━━━━━━━━━━░░░░░░░░░░
Performance Tests:   20 min                          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Actual wall time**: ~20-25 min (due to parallel execution)

### Full Stack Tests (Total: ~45 minutes)

```
Full Infrastructure: 30 min  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Database Scenarios:  20 min          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░
MinIO Upload Tests:  15 min          ━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░
Workflow Tests:      20 min          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░
```

**Actual wall time**: ~30-35 min (due to parallel execution)

## 🔐 Secrets Configuration

No secrets required for public repositories.

For private repositories with additional integrations:

```bash
# GitHub Settings → Secrets and variables → Actions

# Optional: Codecov integration
CODECOV_TOKEN=<your-token>

# Optional: Slack notifications
SLACK_WEBHOOK_URL=<webhook-url>

# Optional: Performance monitoring
DATADOG_API_KEY=<api-key>
```

## 📦 Artifacts Retention

| Artifact Type | Retention |
|---------------|-----------|
| Coverage Reports | 7 days |
| Test Results | 7 days |
| Build Artifacts | 1 day |
| Performance Results | 30 days |
| Failure Screenshots | 7 days |
| Server Logs | 7 days |

## 🚦 Branch Protection Rules

Recommended branch protection for `main`:

1. **Require status checks**:
   - `Quick Validation (frontend)`
   - `Unit Tests (frontend)`
   - `Integration Tests (frontend)`
   - `Quick Validation (backend)`
   - `Unit Tests (backend)`
   - `Integration Tests (backend)`

2. **Require branches to be up to date**: Yes

3. **Require linear history**: Optional

4. **Require deployments to succeed**: Optional

## 🎨 Customization

### Adjust Coverage Thresholds

**Frontend** (`frontend/vitest.config.ts`):
```typescript
coverage: {
  lines: 70,      // Adjust here
  functions: 70,
  branches: 70,
  statements: 70,
}
```

**Backend** (`backend/jest.config.js`):
```javascript
coverageThreshold: {
  global: {
    branches: 80,   // Adjust here
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Add Slack Notifications

Add to any workflow:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
    payload: |
      {
        "text": "❌ Tests failed on ${{ github.ref }}"
      }
```

### Add Codecov Integration

Add to coverage jobs:

```yaml
- name: Upload to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/coverage-final.json
    flags: frontend
    fail_ci_if_error: true
```

## 🔍 Monitoring

### View Workflow Runs

GitHub UI: `Actions` tab → Select workflow → View runs

### Download Artifacts

1. Go to workflow run
2. Scroll to "Artifacts" section
3. Click artifact name to download

### View Test Reports

**Frontend Playwright**:
1. Download `playwright-report-chromium`
2. Extract and open `index.html`

**Backend Jest**:
1. Download coverage artifact
2. Open `lcov-report/index.html`

## 🆘 Support

**Issues with workflows**:
1. Check this README
2. Review workflow logs
3. Run tests locally
4. Open GitHub issue with:
   - Workflow name
   - Run ID
   - Error message
   - Local reproduction steps

**Performance issues**:
- Check workflow run times in Actions tab
- Review timeout configurations
- Consider splitting large test suites

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)
- [Jest Documentation](https://jestjs.io)

---

**Last Updated**: 2026-02-17
**Maintained by**: PatchIQ DevOps Team
