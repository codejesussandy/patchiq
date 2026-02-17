#!/bin/bash

# Script to run authentication tests using Playwright
# Prerequisites: Frontend at :5173 and Backend at :3000 must be running

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
SCREENSHOT_DIR="$PROJECT_ROOT/screenshots"
REPORT_FILE="$PROJECT_ROOT/AUTH_TEST_REPORT.md"

echo "=================================="
echo "Authentication Test Runner"
echo "=================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "❌ ERROR: Frontend is not running on http://localhost:5173"
    echo "Please start frontend with: make dev-frontend"
    exit 1
fi
echo "✓ Frontend is running on http://localhost:5173"

if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "⚠️  WARNING: Backend health check failed at http://localhost:3000"
    echo "Continuing anyway, but tests may fail if backend is not running"
else
    echo "✓ Backend is running on http://localhost:3000"
fi

# Ensure screenshot directory exists
mkdir -p "$SCREENSHOT_DIR"
echo "✓ Screenshot directory ready: $SCREENSHOT_DIR"
echo ""

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Run Playwright tests
echo "Running Playwright authentication tests..."
echo ""
npx playwright test --config=playwright-auth.config.ts

# Check test results
TEST_EXIT_CODE=$?

echo ""
echo "=================================="
echo "Test Execution Complete"
echo "=================================="
echo ""

# Generate report
echo "Generating test report..."

cat > "$REPORT_FILE" << 'EOF'
# Authentication Test Report

**Test Suite**: Authentication Flows
**Date**: $(date +"%Y-%m-%d %H:%M:%S")
**Environment**:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Test Credentials: admin@patchiq.io / admin123

---

EOF

# Check if tests passed or failed
if [ $TEST_EXIT_CODE -eq 0 ]; then
    cat >> "$REPORT_FILE" << 'EOF'
## Overall Status: ✅ PASS

All authentication test scenarios passed successfully.

EOF
else
    cat >> "$REPORT_FILE" << 'EOF'
## Overall Status: ❌ FAIL

One or more authentication test scenarios failed. See details below.

EOF
fi

# Add test scenario results
cat >> "$REPORT_FILE" << 'EOF'

## Test Scenarios

### Scenario 1 - Valid Login
**Status**: Check Playwright report for details
- **Test**: User can log in with valid credentials
- **Expected**: Redirect to /dashboard
- **Screenshot**: `screenshots/login-success.png`
- **Notes**: Verify user email appears in UI and no unexpected console errors

### Scenario 2 - Invalid Login
**Status**: Check Playwright report for details
- **Test**: Invalid credentials show error message
- **Expected**: Error message displayed, no redirect
- **Screenshot**: `screenshots/login-invalid.png`
- **Notes**: Should see 401 error in console (expected)

### Scenario 3 - Session Persistence
**Status**: Check Playwright report for details
- **Test**: Session persists after page reload
- **Expected**: User remains on /dashboard after refresh
- **Screenshot**: `screenshots/session-persist.png`
- **Notes**: No redirect to login page

---

## Screenshots

All test screenshots are saved in: `screenshots/`

EOF

# List screenshots
if [ -d "$SCREENSHOT_DIR" ] && [ "$(ls -A $SCREENSHOT_DIR)" ]; then
    echo "" >> "$REPORT_FILE"
    echo "### Captured Screenshots:" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    for screenshot in "$SCREENSHOT_DIR"/*.png; do
        if [ -f "$screenshot" ]; then
            filename=$(basename "$screenshot")
            echo "- \`$filename\`" >> "$REPORT_FILE"
        fi
    done
fi

# Add report locations
cat >> "$REPORT_FILE" << EOF

---

## Test Artifacts

- **HTML Report**: \`frontend/playwright-report-auth/index.html\`
- **JSON Results**: \`frontend/playwright-report-auth/results.json\`
- **Screenshots**: \`screenshots/\`
- **Videos**: \`frontend/test-results/\` (on failure)

To view the HTML report:
\`\`\`bash
cd frontend && npx playwright show-report playwright-report-auth
\`\`\`

---

## Console Output

Check Playwright report for detailed console logs from each test scenario.

EOF

echo ""
echo "✓ Test report generated: $REPORT_FILE"
echo ""
echo "View screenshots: ls -la $SCREENSHOT_DIR"
echo "View HTML report: cd frontend && npx playwright show-report playwright-report-auth"
echo ""

# Exit with test exit code
exit $TEST_EXIT_CODE
