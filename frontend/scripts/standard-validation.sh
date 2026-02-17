#!/bin/bash
set -e

echo "🎯 Running Standard Validation (Level 2)..."
echo ""

# 1. Code Quality (5 min)
echo "📋 Step 1: Code Quality Checks"
npm run lint
npm run type-check || npx tsc --noEmit
npm run build
echo "✅ Code quality checks passed"
echo ""

# 2. Critical Path Tests (15 min)
echo "📋 Step 2: Critical Path Tests"
echo "Running core CRUD tests..."
npm test -- e2e/phase1-agent5-assets.spec.ts
npm test -- e2e/phase1-agent7-vulnerabilities-final.spec.ts
npm test -- e2e/patches-module-final.spec.ts
npm test -- e2e/user-management.spec.ts
echo "✅ Critical path tests passed"
echo ""

# 3. Security Tests (10 min)
echo "📋 Step 3: Security Tests"
npm test -- e2e/phase4-agent31-form-validation.spec.ts
npm test -- e2e/phase4-agent33-console-audit.spec.ts
echo "✅ Security tests passed"
echo ""

# 4. Bundle Size Check
echo "📋 Step 4: Bundle Analysis"
BUNDLE_SIZE=$(du -sk dist 2>/dev/null | cut -f1 || echo "0")
BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024))
echo "   Bundle size: ${BUNDLE_SIZE_MB}MB"
if [ $BUNDLE_SIZE_MB -gt 2 ]; then
  echo "   ⚠️  WARNING: Bundle size exceeds 2MB!"
else
  echo "   ✅ Bundle size acceptable"
fi
echo ""

echo "✅ Standard Validation Complete!"
echo ""
echo "📝 Manual Testing Required:"
echo "   1. Test your changes in Chrome and Firefox"
echo "   2. Check browser console for errors (F12)"
echo "   3. Test on mobile viewport (DevTools responsive mode)"
echo "   4. Verify XSS protection in forms"
echo ""
echo "For complete validation, run: npm run validate:complete"
