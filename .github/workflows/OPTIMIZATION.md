# CI/CD Performance Optimization Guide

This guide provides strategies to optimize GitHub Actions workflow performance, reduce execution time, and minimize CI costs.

## 📊 Current Performance Baseline

### Workflow Execution Times

| Workflow | Current Time | Optimized Target | Savings |
|----------|--------------|------------------|---------|
| Frontend Tests | 15-20 min | 10-12 min | 25-40% |
| Backend Tests | 20-25 min | 12-15 min | 30-40% |
| Full Stack Tests | 30-35 min | 20-25 min | 25-30% |
| Type Safety | 5 min | 3 min | 40% |

**Total monthly CI time** (100 PRs): ~80-100 hours
**Target after optimization**: ~50-60 hours

## 🚀 Optimization Strategies

### 1. Dependency Caching

#### Current Implementation

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: |
      frontend/package-lock.json
      backend/package-lock.json
```

#### Advanced Caching

```yaml
- name: Cache dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      frontend/node_modules
      backend/node_modules
      shared/node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-

- name: Install dependencies
  run: |
    cd shared && npm ci --prefer-offline
    cd ../backend && npm ci --prefer-offline
    cd ../frontend && npm ci --prefer-offline
```

**Savings**: 2-3 minutes per run

### 2. Playwright Browser Caching

#### Optimized Browser Installation

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('frontend/package-lock.json') }}

- name: Install Playwright browsers
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: cd frontend && npx playwright install --with-deps chromium

- name: Install system dependencies only
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: cd frontend && npx playwright install-deps chromium
```

**Savings**: 1-2 minutes per run

### 3. Build Artifact Reuse

#### Share Build Between Jobs

```yaml
build:
  name: Build Application
  runs-on: ubuntu-latest
  outputs:
    cache-key: ${{ steps.build-cache.outputs.cache-key }}
  steps:
    - uses: actions/checkout@v4
    - name: Build frontend
      run: cd frontend && npm ci && npm run build

    - name: Upload build
      uses: actions/upload-artifact@v4
      with:
        name: frontend-build
        path: frontend/dist
        retention-days: 1

e2e-tests:
  needs: build
  steps:
    - name: Download build
      uses: actions/download-artifact@v4
      with:
        name: frontend-build
        path: frontend/dist

    - name: Serve pre-built app
      run: npx serve -s frontend/dist -p 5173 &
```

**Savings**: 1-2 minutes per dependent job

### 4. Conditional Job Execution

#### Path-Based Filtering

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'frontend/**'
              - 'shared/**'
            backend:
              - 'backend/**'
              - 'shared/**'

  frontend-tests:
    needs: detect-changes
    if: needs.detect-changes.outputs.frontend == 'true'
    # ... rest of job

  backend-tests:
    needs: detect-changes
    if: needs.detect-changes.outputs.backend == 'true'
    # ... rest of job
```

**Savings**: Skip unnecessary jobs, 50% reduction on single-component PRs

### 5. Matrix Strategy Optimization

#### Smart Browser Selection

```yaml
e2e-tests:
  strategy:
    fail-fast: false
    matrix:
      # Run all browsers only on main branch
      browser: ${{ github.ref == 'refs/heads/main' && fromJSON('["chromium", "firefox", "webkit"]') || fromJSON('["chromium"]') }}
```

**Savings**: 66% on PR branches (only run chromium)

### 6. Test Sharding

#### Playwright Sharding

```yaml
e2e-tests:
  strategy:
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - name: Run tests
      run: npx playwright test --shard=${{ matrix.shard }}/4
```

**Savings**: 50-60% wall time (parallel execution)

#### Jest Sharding

```yaml
backend-tests:
  strategy:
    matrix:
      shard: [1, 2, 3]
  steps:
    - name: Run tests
      run: npm test -- --shard=${{ matrix.shard }}/3
```

**Savings**: 40-50% wall time

### 7. Database Optimization

#### Shared Database Container

Instead of creating DB per job, reuse across test suites:

```yaml
services:
  postgres:
    image: postgres:15-alpine  # Alpine is 50% smaller
    env:
      POSTGRES_DB: patchiq
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      # Performance tuning
      POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c max_connections=200"
    options: >-
      --health-cmd "pg_isready -U postgres"
      --health-interval 5s  # Faster health checks
      --health-timeout 3s
      --health-retries 3
```

**Savings**: 30-60 seconds per job

### 8. Parallel Job Execution

#### Maximize Parallelism

```yaml
jobs:
  # These can run in parallel
  frontend-lint:
    # ...
  frontend-typecheck:
    # ...
  frontend-unit:
    # ...

  # Only critical path needs sequencing
  frontend-e2e:
    needs: [frontend-lint, frontend-typecheck]
```

**Savings**: Reduce wall time by 40-50%

### 9. Skip Redundant Checks

#### Use Workflow Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Already implemented. **Savings**: Cancel old runs on force push

### 10. Optimize Docker Images

#### Use Smaller Base Images

```yaml
services:
  postgres:
    image: postgres:15-alpine  # Instead of postgres:15
  redis:
    image: redis:7-alpine      # Instead of redis:7
```

**Savings**: 30-60 seconds per job (faster pull)

## 📈 Advanced Optimizations

### 1. Remote Caching with Turborepo

If you convert to monorepo with Turborepo:

```yaml
- name: Setup Turborepo cache
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-

- name: Build with Turbo
  run: npx turbo run build --cache-dir=.turbo
```

**Savings**: 60-80% on incremental builds

### 2. Test Result Caching

Skip tests for unchanged code:

```yaml
- name: Get changed files
  id: changed-files
  uses: tj-actions/changed-files@v41
  with:
    files: |
      frontend/src/**/*.{ts,tsx}

- name: Run tests
  if: steps.changed-files.outputs.any_changed == 'true'
  run: npm test
```

**Savings**: Skip entire job if no relevant changes

### 3. Incremental TypeScript Compilation

Enable TypeScript incremental builds:

```yaml
- name: Cache TypeScript build
  uses: actions/cache@v4
  with:
    path: |
      frontend/tsconfig.tsbuildinfo
      backend/tsconfig.tsbuildinfo
    key: ${{ runner.os }}-tsc-${{ hashFiles('**/tsconfig.json') }}

- name: Type check
  run: tsc --incremental
```

**Savings**: 30-40% on type checking

### 4. Parallelized Linting

Use ESLint cache:

```yaml
- name: Cache ESLint
  uses: actions/cache@v4
  with:
    path: |
      frontend/.eslintcache
      backend/.eslintcache
    key: ${{ runner.os }}-eslint-${{ hashFiles('**/.eslintrc.js') }}

- name: Lint
  run: npm run lint -- --cache
```

**Savings**: 20-30% on linting

### 5. Selective E2E Tests

Run critical path on every commit, full suite on merge:

```yaml
e2e-tests:
  steps:
    - name: Run critical path tests
      if: github.event_name == 'pull_request'
      run: npm test -- --grep @critical

    - name: Run full test suite
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      run: npm test
```

**Savings**: 50-70% on PRs

## 🎯 Optimized Workflow Example

Here's a fully optimized frontend workflow:

```yaml
name: Frontend Tests (Optimized)

on:
  pull_request:
    paths: ['frontend/**', 'shared/**']

concurrency:
  group: frontend-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      src: ${{ steps.filter.outputs.src }}
      tests: ${{ steps.filter.outputs.tests }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            src:
              - 'frontend/src/**'
            tests:
              - 'frontend/**/*.test.ts'

  quick-checks:
    runs-on: ubuntu-latest
    needs: changes
    if: needs.changes.outputs.src == 'true'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: |
            frontend/node_modules
            shared/node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

      - run: cd shared && npm ci --prefer-offline
      - run: cd frontend && npm ci --prefer-offline

      - name: Parallel checks
        run: |
          npm run lint &
          npm run type-check &
          wait

  unit-tests:
    runs-on: ubuntu-latest
    needs: [changes, quick-checks]
    if: needs.changes.outputs.tests == 'true'
    strategy:
      matrix:
        shard: [1, 2]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Restore node_modules
        uses: actions/cache@v4
        with:
          path: frontend/node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

      - run: npm test -- --shard=${{ matrix.shard }}/2

  e2e-critical:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4

      - name: Cache Playwright
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}

      - run: npx playwright test --grep @critical
```

**Result**: 15 min → 8 min (47% improvement)

## 💰 Cost Analysis

### GitHub Actions Pricing (Public repos are free)

For private repos on Team plan:
- Linux runners: $0.008/min
- Current cost: ~100 PRs × 20 min × $0.008 = **$16/month**
- Optimized cost: ~100 PRs × 12 min × $0.008 = **$9.60/month**
- **Savings**: $6.40/month (40%)

For self-hosted runners:
- **Savings**: 40% less compute time = 40% less infrastructure cost

## 📋 Optimization Checklist

- [ ] Enable dependency caching (npm, Playwright browsers)
- [ ] Implement path-based job filtering
- [ ] Add concurrency cancellation
- [ ] Cache TypeScript build info
- [ ] Cache ESLint results
- [ ] Use Alpine Docker images for services
- [ ] Implement test sharding
- [ ] Share build artifacts between jobs
- [ ] Run minimal browser set on PRs
- [ ] Use incremental builds where possible
- [ ] Add parallel execution for independent tasks
- [ ] Optimize database startup time
- [ ] Implement selective test execution
- [ ] Use fail-fast strategy for quick feedback
- [ ] Set appropriate timeouts

## 🔍 Monitoring & Metrics

### Track These Metrics

1. **Average workflow duration**
   - Frontend: Target < 12 min
   - Backend: Target < 15 min
   - Full Stack: Target < 25 min

2. **Cache hit rate**
   - Target: > 80%
   - Track: node_modules, Playwright, TypeScript

3. **Job parallelization**
   - Target: Max 3 jobs in critical path

4. **Artifact sizes**
   - Keep under 100MB per artifact

### GitHub Actions Analytics

View in GitHub:
1. Go to repository → Actions
2. Click workflow name
3. View "Duration" chart over time
4. Track improvements

## 🚨 Common Pitfalls

### 1. Over-caching
**Problem**: Cache grows too large, slower to download than install
**Solution**: Be selective, cache only heavy dependencies

### 2. Cache invalidation
**Problem**: Stale cache causes test failures
**Solution**: Include relevant files in cache key

### 3. Too much parallelization
**Problem**: Runner limit exceeded, jobs queued
**Solution**: GitHub Actions has 20 concurrent jobs limit (free tier)

### 4. Artifact retention
**Problem**: Artifacts stored too long, storage costs increase
**Solution**: Use 1-7 day retention, not 90 days

### 5. Matrix explosion
**Problem**: Too many matrix combinations
**Solution**: Use conditional matrices based on branch/event

## 🎓 Best Practices

1. **Cache early, cache often**
   - node_modules
   - Build outputs
   - Test results
   - Browser binaries

2. **Fail fast**
   - Run quick checks first
   - Type check before building
   - Lint before testing

3. **Parallelize aggressively**
   - Independent jobs run parallel
   - Use matrix for similar jobs
   - Shard large test suites

4. **Minimize dependencies**
   - Install only what's needed per job
   - Use `--prefer-offline`
   - Consider `npm ci --omit=dev` for non-test jobs

5. **Optimize Docker**
   - Use Alpine images
   - Tune health check intervals
   - Set appropriate resource limits

6. **Smart triggering**
   - Path filters
   - Skip CI label
   - Scheduled vs on-demand

## 📚 Resources

- [GitHub Actions Best Practices](https://docs.github.com/en/actions/learn-github-actions/best-practices)
- [Playwright Sharding](https://playwright.dev/docs/test-sharding)
- [Jest Shard](https://jestjs.io/docs/cli#--shard)
- [Actions Cache](https://github.com/actions/cache)
- [Turborepo](https://turbo.build/repo)

## 🔄 Implementation Plan

### Week 1: Quick Wins
- [ ] Enable all caching (npm, Playwright)
- [ ] Add concurrency cancellation
- [ ] Use Alpine images

**Expected savings**: 15-20%

### Week 2: Path Filtering
- [ ] Implement change detection
- [ ] Conditional job execution
- [ ] Skip unchanged components

**Expected savings**: 25-35%

### Week 3: Parallelization
- [ ] Test sharding (2-4 shards)
- [ ] Parallel lint/typecheck
- [ ] Matrix optimization

**Expected savings**: 40-50%

### Week 4: Advanced
- [ ] Build artifact reuse
- [ ] Incremental compilation
- [ ] Selective test execution

**Expected savings**: 50-60%

---

**Target**: 50-60% reduction in CI time
**Timeline**: 4 weeks
**Effort**: 2-3 days of engineering time
