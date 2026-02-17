#!/bin/bash
set -e

echo "🧪 Running Critical Path Tests..."
echo ""

# Phase 1: Core CRUD
echo "📦 Phase 1: Core CRUD Operations"
npm test -- e2e/phase1-agent5-assets.spec.ts
npm test -- e2e/phase1-agent7-vulnerabilities-final.spec.ts
npm test -- e2e/patches-module-final.spec.ts
npm test -- e2e/user-management.spec.ts
echo "✅ Phase 1 Complete"
echo ""

# Phase 2: Deployments
echo "🚀 Phase 2: Deployments & Recommendations"
npm test -- e2e/phase2-agent9-patch-deployments.spec.ts
npm test -- e2e/phase2-agent10-patch-recommendations.spec.ts
echo "✅ Phase 2 Complete"
echo ""

# Phase 3: Advanced Features
echo "🔍 Phase 3: Advanced Features"
npm test -- e2e/phase3-agents16-18-discovery.spec.ts
npm test -- e2e/phase3-agent21-notifications-sse.spec.ts
echo "✅ Phase 3 Complete"
echo ""

# Phase 4: Security & UX
echo "🔒 Phase 4: Security & UX"
npm test -- e2e/phase4-agent31-form-validation.spec.ts
npm test -- e2e/phase4-agent30-empty-states.spec.ts
npm test -- e2e/phase4-agent33-console-audit.spec.ts
echo "✅ Phase 4 Complete"
echo ""

echo "🎉 All Critical Path Tests Complete!"
