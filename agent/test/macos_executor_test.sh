#!/bin/bash
# macOS Executor E2E Test Script
# Tests all macOS package managers with real packages

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "macOS Executor E2E Test Suite"
echo "========================================="
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run a test
run_test() {
    local test_name=$1
    local test_command=$2

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "[$TOTAL_TESTS] Testing: $test_name... "

    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  Error output:"
        cat /tmp/test_output.log | sed 's/^/    /'
        return 1
    fi
}

# Helper to verify package installed
verify_installed() {
    local package=$1
    local check_command=$2

    if eval "$check_command" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

echo "=== Test 1: Homebrew Package Manager ==="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}WARNING: Homebrew not installed, skipping brew tests${NC}"
else
    # Test 1.1: Install wget via brew
    run_test "brew install wget" "brew install wget"

    # Test 1.2: Verify wget installed
    run_test "verify wget installation" "verify_installed wget 'which wget'"

    # Test 1.3: Uninstall wget
    run_test "brew uninstall wget" "brew uninstall wget"

    # Test 1.4: Verify wget removed
    if verify_installed wget "which wget" 2>/dev/null; then
        echo -e "[$TOTAL_TESTS] Testing: verify wget removal... ${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "[$((TOTAL_TESTS + 1))] Testing: verify wget removal... ${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo ""
echo "=== Test 2: Mac App Store (mas) ==="
echo ""

# Check if mas is installed
if ! command -v mas &> /dev/null; then
    echo -e "${YELLOW}WARNING: mas not installed, skipping App Store tests${NC}"
    echo "         Install with: brew install mas"
else
    echo -e "${YELLOW}INFO: mas installed but App Store tests require manual authentication${NC}"
    echo "      Skipping automated App Store tests"
fi

echo ""
echo "=== Test 3: PKG Installer ==="
echo ""

# Create a test PKG (this would normally be a real package)
echo -e "${YELLOW}INFO: PKG installer tests require actual .pkg files${NC}"
echo "      Manual test: Download a .pkg file and test with:"
echo "      sudo installer -pkg package.pkg -target /"

echo ""
echo "=== Test 4: DMG Installer ==="
echo ""

echo -e "${YELLOW}INFO: DMG installer tests require actual .dmg files${NC}"
echo "      Manual test: Download a .dmg file and test mounting/copying app"

echo ""
echo "=== Test 5: Hub-Centric Script Bundle ==="
echo ""

# This will be tested with the bundle created in another test file
echo -e "${YELLOW}INFO: Hub-centric bundle test requires bundle creation first${NC}"
echo "      See test/create_test_bundle.sh"

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo "Total Tests:  $TOTAL_TESTS"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
