#!/bin/bash

# API Endpoint Test Script for PatchIQ Backend
# This script tests all major API endpoints to ensure they're working

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0
TOTAL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    local auth=$6

    # Small delay to avoid rate limiting (100 req/15min default)
    sleep 0.2

    TOTAL=$((TOTAL + 1))

    local headers="-H 'Content-Type: application/json'"
    if [ -n "$auth" ]; then
        headers="$headers -H 'Authorization: Bearer $auth'"
    fi

    local curl_cmd="curl -s -o /dev/null -w '%{http_code}' -X $method $headers"

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    curl_cmd="$curl_cmd $BASE_URL$endpoint"

    local status=$(eval $curl_cmd)

    if [ "$status" == "$expected_status" ]; then
        echo -e "${GREEN}[PASS]${NC} $method $endpoint - $description (Expected: $expected_status, Got: $status)"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}[FAIL]${NC} $method $endpoint - $description (Expected: $expected_status, Got: $status)"
        FAIL=$((FAIL + 1))
    fi
}

# Get response body
get_response() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth=$4

    local headers="-H 'Content-Type: application/json'"
    if [ -n "$auth" ]; then
        headers="$headers -H 'Authorization: Bearer $auth'"
    fi

    local curl_cmd="curl -s -X $method $headers"

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    curl_cmd="$curl_cmd $BASE_URL$endpoint"

    eval $curl_cmd
}

echo "============================================"
echo "PatchIQ API Endpoint Test Suite"
echo "============================================"
echo "Base URL: $BASE_URL"
echo ""

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${RED}ERROR: Server is not running at $BASE_URL${NC}"
    exit 1
fi
echo -e "${GREEN}Server is running!${NC}"
echo ""

# ============================================
# Health & Info Endpoints
# ============================================
echo "--- Health & Info Endpoints ---"
test_endpoint "GET" "/health" "200" "Health check"
test_endpoint "GET" "/v1" "200" "API version info"

# ============================================
# Authentication Endpoints
# ============================================
echo ""
echo "--- Authentication Endpoints ---"

# Login to get token
echo "Logging in to get access token..."
LOGIN_RESPONSE=$(get_response "POST" "/v1/auth/login" '{"email":"admin@patchiq.io","password":"admin123"}')
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}ERROR: Failed to login and get token${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
echo -e "${GREEN}Login successful!${NC}"
PASS=$((PASS + 1))
TOTAL=$((TOTAL + 1))

# Note: Login with invalid credentials returns 401 (Unauthorized), not 400
test_endpoint "POST" "/v1/auth/login" "401" "Login with invalid credentials" '{"email":"invalid@test.com","password":"wrong"}'
test_endpoint "GET" "/v1/user/me" "200" "Get current user" "" "$TOKEN"

# ============================================
# Patches Endpoints
# ============================================
echo ""
echo "--- Patches Endpoints ---"
test_endpoint "GET" "/v1/patches" "200" "List patches" "" "$TOKEN"
test_endpoint "GET" "/v1/patches?page=1&limit=5" "200" "List patches with pagination" "" "$TOKEN"
test_endpoint "GET" "/v1/patches/test-approve" "200" "Get patches pending test/approval" "" "$TOKEN"

# Create a patch
echo "Creating test patch..."
CREATE_PATCH_RESPONSE=$(get_response "POST" "/v1/patches" '{"software":"Test API Script Patch","severity":"High","os":"Windows"}' "$TOKEN")
PATCH_ID=$(echo $CREATE_PATCH_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$PATCH_ID" ]; then
    echo -e "${GREEN}Created patch: $PATCH_ID${NC}"
    PASS=$((PASS + 1))
else
    echo -e "${RED}Failed to create patch${NC}"
    FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

if [ -n "$PATCH_ID" ]; then
    test_endpoint "GET" "/v1/patches/$PATCH_ID" "200" "Get patch by ID" "" "$TOKEN"
    test_endpoint "PUT" "/v1/patches/$PATCH_ID" "200" "Update patch" '{"severity":"Medium"}' "$TOKEN"
    test_endpoint "GET" "/v1/patches/$PATCH_ID/affected-softwares" "200" "Get affected products" "" "$TOKEN"
    test_endpoint "GET" "/v1/patches/$PATCH_ID/file-details" "200" "Get file details" "" "$TOKEN"
    test_endpoint "GET" "/v1/patches/$PATCH_ID/vulnerabilities" "200" "Get related vulnerabilities" "" "$TOKEN"

    # Test workflow
    test_endpoint "POST" "/v1/patches/$PATCH_ID/test" "200" "Test patch" '{"status":"passed","notes":"Test passed"}' "$TOKEN"
    test_endpoint "POST" "/v1/patches/$PATCH_ID/approve" "200" "Approve patch" "" "$TOKEN"

    # Create deployment
    echo "Creating test deployment..."
    DEPLOY_RESPONSE=$(get_response "POST" "/v1/deployments" "{\"name\":\"Test Deployment\",\"type\":\"INSTALL\",\"patches\":[\"$PATCH_ID\"]}" "$TOKEN")
    DEPLOY_ID=$(echo $DEPLOY_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$DEPLOY_ID" ]; then
        echo -e "${GREEN}Created deployment: $DEPLOY_ID${NC}"
        PASS=$((PASS + 1))
        test_endpoint "GET" "/v1/deployments/$DEPLOY_ID" "200" "Get deployment by ID" "" "$TOKEN"
        test_endpoint "GET" "/v1/deployments/$DEPLOY_ID/preview" "200" "Get deployment preview" "" "$TOKEN"
    else
        echo -e "${RED}Failed to create deployment${NC}"
        FAIL=$((FAIL + 1))
    fi
    TOTAL=$((TOTAL + 1))
fi

# ============================================
# Deployments Endpoints
# ============================================
echo ""
echo "--- Deployments Endpoints ---"
test_endpoint "GET" "/v1/deployments" "200" "List deployments" "" "$TOKEN"

# ============================================
# Patch Tests Endpoints
# ============================================
echo ""
echo "--- Patch Tests Endpoints ---"
test_endpoint "GET" "/v1/patch-tests" "200" "List patch tests" "" "$TOKEN"

# Create patch test
echo "Creating patch test..."
PT_RESPONSE=$(get_response "POST" "/v1/patch-tests" '{"name":"API Test Config","applicationType":"ALL","scope":"ALL_COMPUTERS"}' "$TOKEN")
PT_ID=$(echo $PT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$PT_ID" ]; then
    echo -e "${GREEN}Created patch test: $PT_ID${NC}"
    PASS=$((PASS + 1))
    test_endpoint "GET" "/v1/patch-tests/$PT_ID" "200" "Get patch test by ID" "" "$TOKEN"
    test_endpoint "PUT" "/v1/patch-tests/$PT_ID/approve" "200" "Approve patch test" "" "$TOKEN"
    test_endpoint "DELETE" "/v1/patch-tests/$PT_ID" "204" "Delete patch test" "" "$TOKEN"
else
    echo -e "${RED}Failed to create patch test${NC}"
    FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

# ============================================
# Zero Touch Configs Endpoints
# ============================================
echo ""
echo "--- Zero Touch Configs Endpoints ---"
test_endpoint "GET" "/v1/zero-touch-configs" "200" "List zero touch configs" "" "$TOKEN"

# Create zero touch config
echo "Creating zero touch config..."
ZT_RESPONSE=$(get_response "POST" "/v1/zero-touch-configs" '{"name":"API Test ZT Config","autoDeploymentRules":{"severity":["Critical"],"approvalRequired":false,"schedule":"daily"}}' "$TOKEN")
ZT_ID=$(echo $ZT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$ZT_ID" ]; then
    echo -e "${GREEN}Created zero touch config: $ZT_ID${NC}"
    PASS=$((PASS + 1))
    test_endpoint "GET" "/v1/zero-touch-configs/$ZT_ID" "200" "Get zero touch config by ID" "" "$TOKEN"
    test_endpoint "PUT" "/v1/zero-touch-configs/$ZT_ID" "200" "Update zero touch config" '{"status":"Inactive"}' "$TOKEN"
    test_endpoint "DELETE" "/v1/zero-touch-configs/$ZT_ID" "204" "Delete zero touch config" "" "$TOKEN"
else
    echo -e "${RED}Failed to create zero touch config${NC}"
    FAIL=$((FAIL + 1))
fi
TOTAL=$((TOTAL + 1))

# ============================================
# Vulnerabilities Endpoints
# ============================================
echo ""
echo "--- Vulnerabilities Endpoints ---"
test_endpoint "GET" "/v1/vulnerabilities" "200" "List vulnerabilities" "" "$TOKEN"
test_endpoint "GET" "/v1/vulnerabilities/zero-day" "200" "List zero-day vulnerabilities" "" "$TOKEN"
test_endpoint "GET" "/v1/vulnerabilities/exceptions" "200" "List vulnerability exceptions" "" "$TOKEN"
test_endpoint "POST" "/v1/vulnerabilities/scan" "202" "Initiate vulnerability scan" '{"scope":"all"}' "$TOKEN"

# ============================================
# Assets Endpoints
# ============================================
echo ""
echo "--- Assets Endpoints ---"
test_endpoint "GET" "/v1/assets" "200" "List assets" "" "$TOKEN"
test_endpoint "GET" "/v1/categories" "200" "List categories" "" "$TOKEN"
test_endpoint "GET" "/v1/subcategories" "200" "List subcategories" "" "$TOKEN"
test_endpoint "GET" "/v1/tags" "200" "List tags" "" "$TOKEN"

# ============================================
# Agents Endpoints
# ============================================
echo ""
echo "--- Agents Endpoints ---"
test_endpoint "GET" "/v1/agents" "200" "List agents" "" "$TOKEN"
test_endpoint "GET" "/v1/agents/downloads" "200" "List agent downloads" "" "$TOKEN"
test_endpoint "GET" "/v1/agent-versions" "200" "List agent versions" "" "$TOKEN"

# ============================================
# Jobs Endpoints
# ============================================
echo ""
echo "--- Jobs Endpoints ---"
test_endpoint "GET" "/v1/jobs/patch" "200" "List patch jobs" "" "$TOKEN"
test_endpoint "GET" "/v1/jobs/vulnerability" "200" "List vulnerability jobs" "" "$TOKEN"
test_endpoint "GET" "/v1/jobs/software/catalog" "200" "List software catalog" "" "$TOKEN"
test_endpoint "GET" "/v1/jobs/software/deployed" "200" "List software deployments" "" "$TOKEN"
test_endpoint "GET" "/v1/jobs/software/bundles" "200" "List software bundles" "" "$TOKEN"
test_endpoint "GET" "/v1/jobs/config/catalog" "200" "List config catalog" "" "$TOKEN"
test_endpoint "GET" "/v1/jobs/config/deployed" "200" "List config deployments" "" "$TOKEN"
test_endpoint "GET" "/v1/jobs/config/bundles" "200" "List config bundles" "" "$TOKEN"
test_endpoint "GET" "/v1/deployment-policies" "200" "List deployment policies" "" "$TOKEN"

# ============================================
# Discovery Endpoints
# ============================================
echo ""
echo "--- Discovery Endpoints ---"
test_endpoint "GET" "/v1/discovery/ip-ranges" "200" "List IP ranges" "" "$TOKEN"
test_endpoint "GET" "/v1/discovery/credentials" "200" "List credentials" "" "$TOKEN"
test_endpoint "GET" "/v1/discovery/devices" "200" "List discovered devices" "" "$TOKEN"

# ============================================
# Dashboard Endpoints
# ============================================
echo ""
echo "--- Dashboard Endpoints ---"
test_endpoint "GET" "/v1/dashboard/stats" "200" "Get dashboard stats" "" "$TOKEN"

# ============================================
# Reports Endpoints
# ============================================
echo ""
echo "--- Reports Endpoints ---"
test_endpoint "GET" "/v1/reports" "200" "List reports" "" "$TOKEN"
test_endpoint "GET" "/v1/reports/schedules" "200" "List scheduled reports" "" "$TOKEN"
test_endpoint "GET" "/v1/reports/templates" "200" "List report templates" "" "$TOKEN"

# ============================================
# Settings Endpoints
# ============================================
echo ""
echo "--- Settings Endpoints ---"
test_endpoint "GET" "/v1/settings/users" "200" "List users" "" "$TOKEN"
test_endpoint "GET" "/v1/settings/roles" "200" "List roles" "" "$TOKEN"
test_endpoint "GET" "/v1/settings/organizations" "200" "List organizations" "" "$TOKEN"
test_endpoint "GET" "/v1/settings/branches" "200" "List branches" "" "$TOKEN"
test_endpoint "GET" "/v1/settings/departments" "200" "List departments" "" "$TOKEN"
test_endpoint "GET" "/v1/settings/locations" "200" "List locations" "" "$TOKEN"

# ============================================
# Cleanup
# ============================================
echo ""
echo "--- Cleanup ---"
if [ -n "$PATCH_ID" ]; then
    test_endpoint "DELETE" "/v1/patches/$PATCH_ID" "204" "Delete test patch" "" "$TOKEN"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "============================================"
echo "Test Summary"
echo "============================================"
echo -e "Total:  $TOTAL"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
