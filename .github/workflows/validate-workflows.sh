#!/bin/bash
# Workflow Validation Script
# Validates GitHub Actions workflow files before committing

set -e

echo "🔍 Validating GitHub Actions Workflows..."
echo ""

WORKFLOW_DIR=".github/workflows"
ERRORS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if file exists
check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} Found: $file"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $file"
        ((ERRORS++))
        return 1
    fi
}

# Function to validate YAML syntax
validate_yaml() {
    local file=$1

    # Check if file has basic YAML structure
    if grep -q "^name:" "$file" && grep -q "^on:" "$file"; then
        echo -e "${GREEN}✓${NC} Valid YAML structure: $(basename $file)"
        return 0
    else
        echo -e "${RED}✗${NC} Invalid YAML structure: $(basename $file)"
        ((ERRORS++))
        return 1
    fi
}

# Check required workflow files
echo "📋 Checking required workflow files..."
check_file "$WORKFLOW_DIR/frontend-tests.yml"
check_file "$WORKFLOW_DIR/backend-tests.yml"
check_file "$WORKFLOW_DIR/full-stack-tests.yml"
check_file "$WORKFLOW_DIR/pr-automation.yml"
echo ""

# Check documentation files
echo "📚 Checking documentation files..."
check_file "$WORKFLOW_DIR/README.md"
check_file "$WORKFLOW_DIR/OPTIMIZATION.md"
check_file "$WORKFLOW_DIR/ESTIMATED_TIMES.md"
check_file "$WORKFLOW_DIR/IMPLEMENTATION_SUMMARY.md"
check_file ".github/BADGES.md"
echo ""

# Validate YAML syntax
echo "🔧 Validating YAML syntax..."
for workflow in "$WORKFLOW_DIR"/*.yml; do
    if [ -f "$workflow" ]; then
        validate_yaml "$workflow"
    fi
done
echo ""

# Check for required scripts in package.json
echo "📦 Checking package.json scripts..."

# Frontend scripts
if [ -f "frontend/package.json" ]; then
    REQUIRED_SCRIPTS=("test" "test:unit" "test:integration" "lint" "type-check" "build")
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" frontend/package.json; then
            echo -e "${GREEN}✓${NC} Frontend has '$script' script"
        else
            echo -e "${YELLOW}⚠${NC} Frontend missing '$script' script"
        fi
    done
else
    echo -e "${RED}✗${NC} frontend/package.json not found"
    ((ERRORS++))
fi
echo ""

# Backend scripts
if [ -f "backend/package.json" ]; then
    REQUIRED_SCRIPTS=("test" "test:unit" "test:integration" "test:e2e" "lint" "build")
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" backend/package.json; then
            echo -e "${GREEN}✓${NC} Backend has '$script' script"
        else
            echo -e "${YELLOW}⚠${NC} Backend missing '$script' script"
        fi
    done
else
    echo -e "${RED}✗${NC} backend/package.json not found"
    ((ERRORS++))
fi
echo ""

# Check for required configuration files
echo "⚙️  Checking configuration files..."
check_file "frontend/vitest.config.ts" || echo -e "${YELLOW}⚠${NC} Frontend tests may not run correctly"
check_file "frontend/playwright.config.ts" || echo -e "${YELLOW}⚠${NC} E2E tests may not run correctly"
check_file "backend/jest.config.js" || echo -e "${YELLOW}⚠${NC} Backend tests may not run correctly"
echo ""

# Check workflow job names (common issues)
echo "🔍 Checking for common workflow issues..."

for workflow in "$WORKFLOW_DIR"/*.yml; do
    if [ -f "$workflow" ]; then
        # Check for concurrency configuration
        if grep -q "concurrency:" "$workflow"; then
            echo -e "${GREEN}✓${NC} $(basename $workflow) has concurrency control"
        else
            echo -e "${YELLOW}⚠${NC} $(basename $workflow) missing concurrency control"
        fi

        # Check for timeout configuration
        if grep -q "timeout-minutes:" "$workflow"; then
            echo -e "${GREEN}✓${NC} $(basename $workflow) has timeout configured"
        else
            echo -e "${YELLOW}⚠${NC} $(basename $workflow) missing timeout"
        fi
    fi
done
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed!${NC}"
    echo ""
    echo "Your workflows are ready to commit. Next steps:"
    echo "1. git add .github/"
    echo "2. git commit -m 'feat: add comprehensive CI/CD pipeline'"
    echo "3. git push"
    echo ""
    echo "📖 Read IMPLEMENTATION_SUMMARY.md for setup instructions"
else
    echo -e "${RED}❌ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before committing."
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
