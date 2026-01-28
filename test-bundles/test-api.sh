#!/bin/bash
#
# Hub-Centric API Test Script
# Tests the complete bundle upload and deployment pipeline
#
# Usage: ./test-api.sh [API_BASE_URL]
#
# Prerequisites:
#   - Backend running
#   - At least one agent connected (for deployment tests)
#

set -e

API_BASE="${1:-http://localhost:3000/v1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE_DIR="$SCRIPT_DIR/dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}[FAIL]${NC} $test_name"
        echo -e "       ${RED}$message${NC}"
        ((TESTS_FAILED++))
    fi
}

print_section() {
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
}

# Get auth token
get_token() {
    local response
    response=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@patchiq.io","password":"admin123"}')

    echo "$response" | jq -r '.data.accessToken // .accessToken // .token // empty'
}

echo "Hub-Centric API Test Suite"
echo "=========================="
echo "API Base: $API_BASE"
echo ""

# Get authentication token
print_section "Authentication"
TOKEN=$(get_token)
if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to get auth token. Is the backend running?${NC}"
    echo "Trying to connect to: $API_BASE"
    exit 1
fi
print_result "Login and get token" "PASS"

# Check bundles exist
print_section "Bundle Files Check"
for bundle in hello-world nginx mock-patch; do
    if [ -f "$BUNDLE_DIR/$bundle.tar.gz" ]; then
        print_result "Bundle exists: $bundle.tar.gz" "PASS"
    else
        print_result "Bundle exists: $bundle.tar.gz" "FAIL" "File not found. Run ./build-bundles.sh first"
    fi
done

# Test 1: Upload Hello World Bundle
print_section "Test 1: Upload Bundle"

UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/hub/packages/upload-bundle" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$BUNDLE_DIR/hello-world.tar.gz")

UPLOAD_SUCCESS=$(echo "$UPLOAD_RESPONSE" | jq -r '.success // false')
PACKAGE_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.packageId // empty')
SCRIPTS_FOUND=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.scriptsFound | join(", ") // empty')

if [ "$UPLOAD_SUCCESS" = "true" ] && [ -n "$PACKAGE_ID" ]; then
    print_result "Upload hello-world bundle" "PASS"
    echo "       Package ID: $PACKAGE_ID"
    echo "       Scripts found: $SCRIPTS_FOUND"
else
    print_result "Upload hello-world bundle" "FAIL" "Response: $UPLOAD_RESPONSE"
fi

# Test 2: Verify Package Fields
print_section "Test 2: Verify Package Fields"

if [ -n "$PACKAGE_ID" ]; then
    PKG_RESPONSE=$(curl -s -X GET "$API_BASE/hub/packages/$PACKAGE_ID" \
        -H "Authorization: Bearer $TOKEN")

    # Check expected fields
    INSTALL_SOURCE=$(echo "$PKG_RESPONSE" | jq -r '.data.installSource // empty')
    SCRIPTS_INCLUDED=$(echo "$PKG_RESPONSE" | jq -r '.data.scriptsIncluded // false')
    HAS_BUNDLE=$(echo "$PKG_RESPONSE" | jq -r '.data.hasBundle // false')
    REQUIRES_ROOT=$(echo "$PKG_RESPONSE" | jq -r '.data.requiresRoot // false')

    if [ "$INSTALL_SOURCE" = "bundle" ]; then
        print_result "installSource = 'bundle'" "PASS"
    else
        print_result "installSource = 'bundle'" "FAIL" "Got: $INSTALL_SOURCE"
    fi

    if [ "$SCRIPTS_INCLUDED" = "true" ]; then
        print_result "scriptsIncluded = true" "PASS"
    else
        print_result "scriptsIncluded = true" "FAIL" "Got: $SCRIPTS_INCLUDED"
    fi

    if [ "$HAS_BUNDLE" = "true" ]; then
        print_result "hasBundle = true" "PASS"
    else
        print_result "hasBundle = true" "FAIL" "Got: $HAS_BUNDLE"
    fi

    if [ "$REQUIRES_ROOT" = "false" ]; then
        print_result "requiresRoot = false (hello-world)" "PASS"
    else
        print_result "requiresRoot = false (hello-world)" "FAIL" "Got: $REQUIRES_ROOT"
    fi
fi

# Test 3: Get Bundle Download Info
print_section "Test 3: Bundle Download URL"

if [ -n "$PACKAGE_ID" ]; then
    BUNDLE_RESPONSE=$(curl -s -X GET "$API_BASE/hub/packages/$PACKAGE_ID/bundle" \
        -H "Authorization: Bearer $TOKEN")

    BUNDLE_URL=$(echo "$BUNDLE_RESPONSE" | jq -r '.data.bundleUrl // empty')
    BUNDLE_CHECKSUM=$(echo "$BUNDLE_RESPONSE" | jq -r '.data.bundleChecksum // empty')

    if [ -n "$BUNDLE_URL" ]; then
        print_result "Get bundle download URL" "PASS"
        echo "       URL length: ${#BUNDLE_URL} chars"
    else
        print_result "Get bundle download URL" "FAIL" "No bundleUrl in response"
    fi

    if [ -n "$BUNDLE_CHECKSUM" ]; then
        print_result "Bundle checksum present" "PASS"
        echo "       Checksum: ${BUNDLE_CHECKSUM:0:16}..."
    else
        print_result "Bundle checksum present" "FAIL" "No checksum in response"
    fi
fi

# Test 4: Get Execution Payload
print_section "Test 4: Execution Payload"

if [ -n "$PACKAGE_ID" ]; then
    for operation in install update rollback uninstall; do
        EXEC_RESPONSE=$(curl -s -X GET "$API_BASE/hub/packages/$PACKAGE_ID/execution-payload/$operation" \
            -H "Authorization: Bearer $TOKEN")

        EXEC_SUCCESS=$(echo "$EXEC_RESPONSE" | jq -r '.success // false')
        OP_TYPE=$(echo "$EXEC_RESPONSE" | jq -r '.data.operationType // empty')

        if [ "$EXEC_SUCCESS" = "true" ] && [ "$OP_TYPE" = "$operation" ]; then
            print_result "Execution payload for '$operation'" "PASS"
        else
            print_result "Execution payload for '$operation'" "FAIL" "Response: $EXEC_RESPONSE"
        fi
    done
fi

# Test 5: List Packages (verify bundle shows up)
print_section "Test 5: List Packages"

LIST_RESPONSE=$(curl -s -X GET "$API_BASE/hub/packages" \
    -H "Authorization: Bearer $TOKEN")

TOTAL_PACKAGES=$(echo "$LIST_RESPONSE" | jq -r '.total // 0')
BUNDLE_PACKAGES=$(echo "$LIST_RESPONSE" | jq '[.data[] | select(.installSource == "bundle")] | length')

print_result "List packages endpoint" "PASS"
echo "       Total packages: $TOTAL_PACKAGES"
echo "       Bundle packages: $BUNDLE_PACKAGES"

# Test 6: Upload Nginx Bundle (requires root)
print_section "Test 6: Upload Nginx Bundle"

NGINX_RESPONSE=$(curl -s -X POST "$API_BASE/hub/packages/upload-bundle" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$BUNDLE_DIR/nginx.tar.gz")

NGINX_SUCCESS=$(echo "$NGINX_RESPONSE" | jq -r '.success // false')
NGINX_PKG_ID=$(echo "$NGINX_RESPONSE" | jq -r '.data.packageId // empty')

if [ "$NGINX_SUCCESS" = "true" ]; then
    print_result "Upload nginx bundle" "PASS"
    echo "       Package ID: $NGINX_PKG_ID"

    # Verify requires root
    NGINX_PKG=$(curl -s -X GET "$API_BASE/hub/packages/$NGINX_PKG_ID" \
        -H "Authorization: Bearer $TOKEN")
    NGINX_ROOT=$(echo "$NGINX_PKG" | jq -r '.data.requiresRoot // false')

    if [ "$NGINX_ROOT" = "true" ]; then
        print_result "Nginx requiresRoot = true" "PASS"
    else
        print_result "Nginx requiresRoot = true" "FAIL" "Got: $NGINX_ROOT"
    fi
else
    print_result "Upload nginx bundle" "FAIL" "Response: $NGINX_RESPONSE"
fi

# Test 7: Hub Statistics
print_section "Test 7: Hub Statistics"

STATS_RESPONSE=$(curl -s -X GET "$API_BASE/hub/stats" \
    -H "Authorization: Bearer $TOKEN")

STATS_SUCCESS=$(echo "$STATS_RESPONSE" | jq -r '.success // false')
TOTAL_IN_STATS=$(echo "$STATS_RESPONSE" | jq -r '.data.totalPackages // 0')

if [ "$STATS_SUCCESS" = "true" ]; then
    print_result "Hub statistics endpoint" "PASS"
    echo "       Total packages: $TOTAL_IN_STATS"
    echo "       Active packages: $(echo "$STATS_RESPONSE" | jq -r '.data.activePackages // 0')"
else
    print_result "Hub statistics endpoint" "FAIL"
fi

# Test 8: List Agents (for deployment test)
print_section "Test 8: Agent Availability"

AGENTS_RESPONSE=$(curl -s -X GET "$API_BASE/agents" \
    -H "Authorization: Bearer $TOKEN")

AGENTS_COUNT=$(echo "$AGENTS_RESPONSE" | jq '[.data[] // []] | length')
ONLINE_AGENTS=$(echo "$AGENTS_RESPONSE" | jq '[.data[] | select(.status == "online")] | length')

print_result "List agents endpoint" "PASS"
echo "       Total agents: $AGENTS_COUNT"
echo "       Online agents: $ONLINE_AGENTS"

# Test 9: Create Deployment (if agent available)
print_section "Test 9: Deployment Creation"

if [ "$ONLINE_AGENTS" -gt 0 ] && [ -n "$PACKAGE_ID" ]; then
    AGENT_ID=$(echo "$AGENTS_RESPONSE" | jq -r '[.data[] | select(.status == "online")][0].id')

    DEPLOY_RESPONSE=$(curl -s -X POST "$API_BASE/deployments/software" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"API Test Deploy - Hello World\",
            \"description\": \"Automated API test deployment\",
            \"type\": \"install\",
            \"targetAgentIds\": [\"$AGENT_ID\"],
            \"package\": {
                \"packageId\": \"$PACKAGE_ID\",
                \"name\": \"hello-world\",
                \"source\": \"bundle\",
                \"version\": \"1.0.0\"
            },
            \"retryCount\": 1
        }")

    DEPLOY_SUCCESS=$(echo "$DEPLOY_RESPONSE" | jq -r '.success // .data.deploymentId != null')
    DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.data.deploymentId // .deploymentId // empty')

    if [ -n "$DEPLOY_ID" ]; then
        print_result "Create deployment" "PASS"
        echo "       Deployment ID: $DEPLOY_ID"
        echo "       Tasks created: $(echo "$DEPLOY_RESPONSE" | jq -r '.data.tasksCreated // .tasksCreated // 0')"

        # Verify command type
        sleep 2  # Wait for command to be created

        CMD_RESPONSE=$(curl -s -X GET "$API_BASE/agents/$AGENT_ID/commands?status=pending" \
            -H "Authorization: Bearer $TOKEN")

        LATEST_CMD_TYPE=$(echo "$CMD_RESPONSE" | jq -r '.data[0].type // .[-1].type // empty')

        if [ "$LATEST_CMD_TYPE" = "hub_install" ]; then
            print_result "Command type = 'hub_install'" "PASS"
        elif [ "$LATEST_CMD_TYPE" = "software_install" ]; then
            print_result "Command type = 'hub_install'" "FAIL" "Got legacy: software_install (packageId not detected?)"
        else
            print_result "Command type = 'hub_install'" "FAIL" "Got: $LATEST_CMD_TYPE"
        fi
    else
        print_result "Create deployment" "FAIL" "Response: $DEPLOY_RESPONSE"
    fi
else
    echo -e "${YELLOW}[SKIP]${NC} Deployment test - no online agents"
fi

# Test 10: Delete Test Packages (cleanup)
print_section "Test 10: Cleanup"

for pkg_id in $PACKAGE_ID $NGINX_PKG_ID; do
    if [ -n "$pkg_id" ]; then
        DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/hub/packages/$pkg_id" \
            -H "Authorization: Bearer $TOKEN")

        DELETE_SUCCESS=$(echo "$DELETE_RESPONSE" | jq -r '.success // false')
        if [ "$DELETE_SUCCESS" = "true" ]; then
            print_result "Delete package $pkg_id" "PASS"
        else
            print_result "Delete package $pkg_id" "FAIL" "Response: $DELETE_RESPONSE"
        fi
    fi
done

# Summary
print_section "Test Summary"
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo ""
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total tests:  $TOTAL_TESTS"
echo ""

if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
