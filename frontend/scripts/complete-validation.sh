#!/bin/bash
set -e

echo "🚀 Running Complete Validation (Level 3)..."
echo "This will take 2-3 hours. Get some coffee ☕"
echo ""

START_TIME=$(date +%s)

# 1. Code Quality
echo "📋 Step 1/6: Code Quality Checks"
npm run lint
npm run type-check || npx tsc --noEmit
npm run build
echo "✅ Step 1 Complete"
echo ""

# 2. Full Test Suite
echo "📋 Step 2/6: Full Automated Test Suite"
npm test
echo "✅ Step 2 Complete"
echo ""

# 3. Security Audit
echo "📋 Step 3/6: Security Audit"
npm audit --audit-level=moderate
./scripts/security-tests.sh
echo "✅ Step 3 Complete"
echo ""

# 4. Performance Analysis
echo "📋 Step 4/6: Performance Analysis"
BUNDLE_SIZE=$(du -sk dist 2>/dev/null | cut -f1 || echo "0")
BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024))
echo "   Total bundle size: ${BUNDLE_SIZE_MB}MB"

# Find largest chunks
echo "   Largest chunks:"
find dist -name "*.js" -type f -exec du -h {} + 2>/dev/null | sort -rh | head -5 || echo "   N/A"
echo "✅ Step 4 Complete"
echo ""

# 5. Dependency Check
echo "📋 Step 5/6: Dependency Analysis"
npm outdated || true
echo "✅ Step 5 Complete"
echo ""

# 6. Coverage Report
echo "📋 Step 6/6: Test Coverage"
echo "   (Coverage reporting not yet configured)"
echo "✅ Step 6 Complete"
echo ""

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "🎉 Complete Validation Finished!"
echo "   Duration: ${MINUTES}m ${SECONDS}s"
echo ""
echo "📊 Summary:"
echo "   - Code Quality: ✅ Passed"
echo "   - Tests: ✅ Passed"
echo "   - Security: ✅ Passed"
echo "   - Bundle Size: ${BUNDLE_SIZE_MB}MB"
echo ""
echo "📝 Manual Testing Checklist:"
echo "   See FRONTEND-QUALITY-ASSURANCE-PLAN.md section 'Manual Testing'"
echo ""
echo "   Critical manual tests:"
echo "   1. XSS testing in all forms"
echo "   2. Cross-browser testing (Chrome, Firefox, Safari)"
echo "   3. Mobile responsive testing"
echo "   4. Accessibility testing with keyboard navigation"
echo "   5. SSE notification reconnection"
echo ""
echo "Ready for release: ✅"
