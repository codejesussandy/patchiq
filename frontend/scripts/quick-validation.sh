#!/bin/bash
set -e

echo "⚡ Running Quick Validation (Level 1)..."
echo ""

# 1. Code Quality (2 min)
echo "📋 Step 1: Code Quality Checks"
npm run lint
echo "✅ Linting passed"
echo ""

npm run type-check || npx tsc --noEmit
echo "✅ Type checking passed"
echo ""

# 2. Build Test (2 min)
echo "📋 Step 2: Build Test"
npm run build
echo "✅ Build successful"
echo ""

# 3. Quick stats
echo "📊 Quick Stats:"
echo "   - Bundle size: $(du -sh dist 2>/dev/null | cut -f1 || echo 'N/A')"
echo "   - TypeScript files: $(find src -name "*.ts" -o -name "*.tsx" | wc -l | tr -d ' ')"
echo "   - Components: $(find src/components -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')"
echo ""

echo "✅ Quick Validation Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Start dev server: npm run dev"
echo "   2. Manually test your changes"
echo "   3. Check browser console for errors"
echo "   4. For full validation, run: npm run validate:standard"
