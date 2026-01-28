#!/bin/bash
#
# Local Script Test - Tests bundle scripts directly without the full pipeline
# Run this on the agent machine to verify scripts work correctly
#
# Usage: ./test-local-scripts.sh [bundle-name]
#   bundle-name: hello-world (default), nginx, mock-patch
#

set -e

BUNDLE="${1:-hello-world}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE_DIR="$SCRIPT_DIR/dist"
WORK_DIR="/tmp/patchiq-test-$$"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Local Script Test: $BUNDLE${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check bundle exists
if [ ! -f "$BUNDLE_DIR/$BUNDLE.tar.gz" ]; then
    echo -e "${RED}Bundle not found: $BUNDLE_DIR/$BUNDLE.tar.gz${NC}"
    echo "Run ./build-bundles.sh first"
    exit 1
fi

# Create work directory
mkdir -p "$WORK_DIR"
echo "Work directory: $WORK_DIR"

# Extract bundle
echo -e "\n${YELLOW}Extracting bundle...${NC}"
tar -xzf "$BUNDLE_DIR/$BUNDLE.tar.gz" -C "$WORK_DIR"

# Read manifest
echo -e "\n${YELLOW}Manifest contents:${NC}"
cat "$WORK_DIR/manifest.json" | jq '.'

# Get environment variables from manifest
export $(cat "$WORK_DIR/manifest.json" | jq -r '.environment // {} | to_entries | .[] | "\(.key)=\(.value)"' 2>/dev/null || echo "")

# Check if requires root
REQUIRES_ROOT=$(cat "$WORK_DIR/manifest.json" | jq -r '.requiresRoot // false')
if [ "$REQUIRES_ROOT" = "true" ]; then
    echo -e "\n${YELLOW}Note: This bundle requires root privileges${NC}"
    if [ "$(id -u)" -ne 0 ]; then
        echo -e "${YELLOW}You may need to run with sudo for full functionality${NC}"
    fi
fi

# Test function
test_script() {
    local operation="$1"
    local script_path="$2"

    echo -e "\n${BLUE}----------------------------------------${NC}"
    echo -e "${BLUE}Testing: $operation${NC}"
    echo -e "${BLUE}----------------------------------------${NC}"

    if [ ! -f "$script_path" ]; then
        echo -e "${YELLOW}[SKIP] Script not defined: $operation${NC}"
        return 0
    fi

    chmod +x "$script_path"

    echo "Running: $script_path"
    echo ""

    if bash "$script_path"; then
        echo -e "\n${GREEN}[PASS] $operation completed successfully${NC}"
        return 0
    else
        echo -e "\n${RED}[FAIL] $operation failed with exit code $?${NC}"
        return 1
    fi
}

# Get script paths from manifest
INSTALL_SCRIPT=$(cat "$WORK_DIR/manifest.json" | jq -r '.scripts.install // empty')
UPDATE_SCRIPT=$(cat "$WORK_DIR/manifest.json" | jq -r '.scripts.update // empty')
ROLLBACK_SCRIPT=$(cat "$WORK_DIR/manifest.json" | jq -r '.scripts.rollback // empty')
UNINSTALL_SCRIPT=$(cat "$WORK_DIR/manifest.json" | jq -r '.scripts.uninstall // empty')

# Run tests in sequence
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "\n${YELLOW}=== Running Script Tests ===${NC}"

# Install
if test_script "install" "$WORK_DIR/$INSTALL_SCRIPT"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Brief pause
sleep 1

# Update
if test_script "update" "$WORK_DIR/$UPDATE_SCRIPT"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

sleep 1

# Rollback
if test_script "rollback" "$WORK_DIR/$ROLLBACK_SCRIPT"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

sleep 1

# Uninstall
if test_script "uninstall" "$WORK_DIR/$UNINSTALL_SCRIPT"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Cleanup
echo -e "\n${YELLOW}Cleaning up work directory...${NC}"
rm -rf "$WORK_DIR"

# Summary
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All local script tests passed!${NC}"
    exit 0
fi
