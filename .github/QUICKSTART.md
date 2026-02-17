# CI/CD Pipeline Quick Start Guide

Get your CI/CD pipeline running in 5 minutes.

## ⚡ TL;DR

```bash
# 1. Validate workflows
bash .github/workflows/validate-workflows.sh

# 2. Commit and push
git add .github/
git commit -m "feat: add comprehensive CI/CD pipeline"
git push

# 3. Create a PR to see it in action
git checkout -b test/ci-pipeline
git commit --allow-empty -m "test: verify CI pipeline"
git push -u origin test/ci-pipeline

# 4. Open GitHub and watch the workflows run!
```

## 📋 Step-by-Step Setup

### Step 1: Verify Everything is Ready

```bash
# Run validation script
bash .github/workflows/validate-workflows.sh

# Should show: ✅ All validations passed!
```

### Step 2: Commit the Workflows

```bash
# Add all workflow files
git add .github/

# Commit with descriptive message
git commit -m "feat: add comprehensive CI/CD pipeline

- Frontend tests (unit, integration, E2E)
- Backend tests (unit, integration, E2E, contract)
- Full stack integration tests
- PR automation with coverage reporting
- Comprehensive documentation"

# Push to your branch
git push
```

### Step 3: Set Up Branch Protection (Optional but Recommended)

1. Go to GitHub → Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select these status checks:
     - `Quick Validation (frontend)`
     - `Quick Validation (backend)`
     - `Unit Tests (frontend)`
     - `Unit Tests (backend)`

### Step 4: Create a Test PR

```bash
# Create a test branch
git checkout -b test/ci-pipeline

# Make a small change (or empty commit)
git commit --allow-empty -m "test: verify CI/CD pipeline"

# Push and create PR
git push -u origin test/ci-pipeline

# On GitHub: Create Pull Request
```

### Step 5: Watch the Magic Happen

On your PR, you'll see:

1. **Workflows start automatically** (check Actions tab)
2. **Status checks appear** on PR
3. **Automated comment posted** with:
   - Coverage report
   - Test results
   - Bundle size
4. **Automatic labels** added based on changes

## 🎯 What to Expect

### First Run (No Cache)
- Frontend Tests: ~20-25 minutes
- Backend Tests: ~25-30 minutes
- Full Stack: ~40-45 minutes (only on main)

### Subsequent Runs (With Cache)
- Frontend Tests: ~15 minutes
- Backend Tests: ~20 minutes
- Full Stack: ~30 minutes

### Artifacts Available
- Coverage reports (HTML + JSON)
- Playwright test reports
- Screenshots on failure
- Test result summaries

## 🐛 Troubleshooting

### Workflows Don't Run

**Check:**
- Are workflows in `.github/workflows/` directory?
- Is the file extension `.yml` (not `.yaml`)?
- Did you push to a branch that triggers the workflow?

**Solution:**
```bash
# Verify files are committed
git ls-files .github/workflows/

# Should show all .yml files
```

### Tests Fail on First Run

**Common causes:**
1. Services not ready (PostgreSQL, Redis)
2. Dependencies not installed
3. Environment variables missing

**Solution:**
- Check workflow logs in Actions tab
- Look for red ❌ steps
- Read error messages
- Compare with local test runs

### Timeouts

**If jobs timeout:**
1. Check `timeout-minutes` in workflow
2. Review service health checks
3. Check if tests are hanging

**Quick fix:**
- Increase timeout in workflow file
- Optimize slow tests

### Coverage Below Threshold

**Error:** `Coverage X% is below Y% threshold`

**Solution:**
```bash
# Run coverage locally
cd frontend && npm run test:unit:coverage
cd backend && npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html

# Add tests for uncovered code
```

## 📊 Understanding the Workflow

### When Workflows Run

| Trigger | Workflows That Run |
|---------|-------------------|
| PR opened/updated (frontend changes) | Frontend Tests, Type Safety |
| PR opened/updated (backend changes) | Backend Tests, Type Safety |
| PR opened/updated (both) | Both pipelines, Type Safety |
| Push to `main` | All workflows including Full Stack |
| Manual trigger | Any workflow (via Actions UI) |

### Job Dependencies

```
Frontend Tests:
  Quick Validation
    ↓
  Unit Tests ←→ Integration Tests (parallel)
    ↓
  E2E Tests (matrix: 3 browsers in parallel)
    ↓
  Test Summary

Backend Tests:
  Quick Validation
    ↓
  Unit Tests ←→ Integration Tests ←→ Contract Tests (parallel)
    ↓
  E2E Tests
    ↓
  Test Summary
```

## 🎨 Customization

### Adjust Coverage Thresholds

**Frontend** (`frontend/vitest.config.ts`):
```typescript
coverage: {
  lines: 70,    // Change this
  functions: 70,
  branches: 70,
  statements: 70,
}
```

**Backend** (`backend/jest.config.js`):
```javascript
coverageThreshold: {
  global: {
    lines: 80,    // Change this
    functions: 80,
    branches: 80,
    statements: 80
  }
}
```

### Change Browser Matrix

Edit `frontend-tests.yml`:
```yaml
matrix:
  # Only run chromium on PRs
  browser: ${{ github.ref == 'refs/heads/main' && fromJSON('["chromium", "firefox", "webkit"]') || fromJSON('["chromium"]') }}
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

## 📚 Next Steps

### Immediate
1. ✅ Review this guide
2. ✅ Run validation script
3. ✅ Commit workflows
4. ✅ Create test PR
5. ✅ Verify workflows run

### This Week
1. [ ] Add status badges to README
2. [ ] Set up branch protection
3. [ ] Monitor workflow performance
4. [ ] Review test artifacts

### This Month
1. [ ] Implement optimizations (OPTIMIZATION.md)
2. [ ] Set up Codecov (optional)
3. [ ] Create custom dashboards
4. [ ] Train team on CI/CD usage

## 📖 Documentation

| File | Purpose | Read if... |
|------|---------|-----------|
| `QUICKSTART.md` | This file | You want to get started quickly |
| `README.md` | Complete docs | You need detailed information |
| `OPTIMIZATION.md` | Performance | Workflows are too slow |
| `ESTIMATED_TIMES.md` | Time analysis | You want to understand timing |
| `IMPLEMENTATION_SUMMARY.md` | Overview | You want the big picture |
| `BADGES.md` | Status badges | You want to add badges to README |

## 🆘 Getting Help

1. **Check documentation first**
   - Read relevant .md file from table above
   - Search for error message in docs

2. **Run validation script**
   ```bash
   bash .github/workflows/validate-workflows.sh
   ```

3. **Review workflow logs**
   - GitHub → Actions → Click workflow → Click failed job

4. **Test locally**
   ```bash
   # Frontend tests
   cd frontend && npm test

   # Backend tests
   cd backend && npm test

   # Full stack
   make dev
   ```

5. **Common issues**
   - Timeouts → Increase timeout or optimize tests
   - Coverage fails → Add more tests
   - Services not ready → Check health checks
   - Build fails → Check dependencies

## ✅ Success Checklist

After setup, verify:

- [ ] Workflows appear in Actions tab
- [ ] At least one workflow has run successfully
- [ ] PR comments are posting automatically
- [ ] Coverage reports are generated
- [ ] Test artifacts are downloadable
- [ ] Branch protection is configured (optional)
- [ ] Team knows how to use CI/CD
- [ ] Documentation is accessible

## 🎉 You're Done!

Your CI/CD pipeline is now active. Every PR will:
- Run all relevant tests automatically
- Report coverage and test results
- Block merge if tests fail
- Generate downloadable artifacts
- Post automated comments with results

**Total setup time**: 5-10 minutes
**Time saved per PR**: Manual testing eliminated
**Quality improvement**: Automated coverage enforcement

Happy coding! 🚀

---

**Need help?** Check `.github/workflows/README.md` for detailed documentation.
