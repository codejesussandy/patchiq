#!/bin/bash
set -e

echo "🔒 Running Security Tests..."
echo ""

# 1. Automated security tests
echo "📋 Step 1: Automated Security Tests"
npm test -- e2e/phase4-agent31-form-validation.spec.ts
echo "✅ Automated tests passed"
echo ""

# 2. Dependency audit
echo "📋 Step 2: Dependency Audit"
npm audit --audit-level=moderate
echo "✅ Dependency audit complete"
echo ""

# 3. Check for sensitive data
echo "📋 Step 3: Checking for Hardcoded Secrets"
echo "Searching for potential secrets in code..."

PASSWORDS=$(grep -r "password.*=" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "placeholder" | grep -v "type=\"password\"" | grep -v "// " || true)
if [ -n "$PASSWORDS" ]; then
  echo "⚠️  WARNING: Found potential hardcoded passwords:"
  echo "$PASSWORDS"
else
  echo "✅ No hardcoded passwords found"
fi

API_KEYS=$(grep -r "apiKey.*=" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// " || true)
if [ -n "$API_KEYS" ]; then
  echo "⚠️  WARNING: Found potential API keys:"
  echo "$API_KEYS"
else
  echo "✅ No hardcoded API keys found"
fi

SECRETS=$(grep -r "secret.*=" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// " || true)
if [ -n "$SECRETS" ]; then
  echo "⚠️  WARNING: Found potential secrets:"
  echo "$SECRETS"
else
  echo "✅ No hardcoded secrets found"
fi

echo ""

# 4. Check for console.log (should be zero in production)
echo "📋 Step 4: Checking for Console Statements"
CONSOLE_COUNT=$(grep -r "console\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// eslint" | grep -v "//" | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo "⚠️  WARNING: Found $CONSOLE_COUNT console statements:"
  grep -r "console\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// eslint" | grep -v "//" || true
else
  echo "✅ No console statements found"
fi

echo ""
echo "✅ Security Tests Complete"
echo ""
echo "⚠️  MANUAL TESTING REQUIRED:"
echo "   Test XSS payloads in the following forms:"
echo "   1. Add Asset Modal → Asset Name field"
echo "   2. Create Patch Modal → Description field"
echo "   3. Add User Modal → Name and Email fields"
echo "   4. Schedule Report → Email Recipients field"
echo ""
echo "   Use these payloads:"
echo "   - <script>alert('XSS')</script>"
echo "   - <img src=x onerror=alert('XSS')>"
echo "   - <svg/onload=alert('XSS')>"
echo ""
echo "   All should be sanitized/blocked ✅"
