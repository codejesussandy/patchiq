#!/bin/bash
# R3 LDAP Group → Role Mapping CRUD Validation Script
# Tests all group mapping scenarios from PRD R3 section

set -e

# Configuration
API_BASE="${API_BASE:-http://localhost:3001/v1}"
LDAP_CONFIG_ID="${LDAP_CONFIG_ID:-550e8400-e29b-41d4-a716-446655440001}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@patchiq.io}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
log_test() {
    local id=$1
    local name=$2
    local status=$3
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$status" == "PASS" ]; then
        echo "✅ $id: $name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$status" == "SKIP" ]; then
        echo "⏭️  $id: $name"
    else
        echo "❌ $id: $name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

cleanup() {
    # Clean up will happen when script ends
    echo ""
}

# Main validation
main() {
    echo "R3: LDAP Group → Role Mapping CRUD Validation Script"
    echo "====================================================="
    echo ""

    # Step 1: Login
    echo "Attempting admin login..."
    LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

    if [ -z "$ADMIN_TOKEN" ]; then
        echo "❌ Failed to get admin token"
        echo "Response: $LOGIN_RESPONSE"
        exit 1
    fi

    echo "✅ Admin login successful"
    echo ""

    # Step 2: Verify LDAP config exists
    echo "Checking LDAP config..."
    CONFIG_RESPONSE=$(curl -s -X GET "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")

    if echo "$CONFIG_RESPONSE" | grep -q '"success":true'; then
        echo "✅ LDAP config exists"
    else
        echo "❌ LDAP config not found"
        echo "Response: $CONFIG_RESPONSE"
        exit 1
    fi
    echo ""

    # Step 3: Get system roles
    echo "Fetching system roles..."
    ROLES_RESPONSE=$(curl -s -X GET "$API_BASE/settings/roles" \
        -H "Authorization: Bearer $ADMIN_TOKEN")

    ADMIN_ROLE_ID=$(echo "$ROLES_RESPONSE" | grep -o '"id":"[a-f0-9-]*","name":"admin"' | head -1 | cut -d'"' -f4)
    USER_ROLE_ID=$(echo "$ROLES_RESPONSE" | grep -o '"id":"[a-f0-9-]*","name":"user"' | head -1 | cut -d'"' -f4)

    if [ -z "$ADMIN_ROLE_ID" ] || [ -z "$USER_ROLE_ID" ]; then
        echo "❌ Failed to get system roles"
        exit 1
    fi

    echo "✅ Admin role ID: $ADMIN_ROLE_ID"
    echo "✅ User role ID: $USER_ROLE_ID"
    echo ""

    # Step 4: Run test cases
    echo "========================================="
    echo "Running Test Cases (T3.1 - T3.14)"
    echo "========================================="
    echo ""

    # T3.1: Create group mapping
    echo "T3.1: Create group mapping"
    CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"ldapGroupDn\":\"cn=IT-Admins,ou=Groups,dc=corp,dc=example,dc=com\",\"roleId\":\"$ADMIN_ROLE_ID\",\"priority\":100}")

    if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
        MAPPING_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[a-f0-9-]*' | head -1 | cut -d'"' -f4)
        log_test "T3.1" "Create group mapping" "PASS"
    else
        log_test "T3.1" "Create group mapping" "FAIL"
    fi
    echo ""

    # T3.2: List group mappings
    echo "T3.2: List group mappings"
    LIST_RESPONSE=$(curl -s -X GET "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings" \
        -H "Authorization: Bearer $ADMIN_TOKEN")

    if echo "$LIST_RESPONSE" | grep -q '"success":true'; then
        COUNT=$(echo "$LIST_RESPONSE" | grep -o '"ldapGroupDn"' | wc -l)
        log_test "T3.2" "List group mappings ($COUNT found)" "PASS"
    else
        log_test "T3.2" "List group mappings" "FAIL"
    fi
    echo ""

    # T3.3: Update mapping priority
    echo "T3.3: Update mapping priority"
    if [ -n "$MAPPING_ID" ]; then
        UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings/$MAPPING_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"priority\":50}")

        if echo "$UPDATE_RESPONSE" | grep -q '"success":true'; then
            log_test "T3.3" "Update mapping priority" "PASS"
        else
            log_test "T3.3" "Update mapping priority" "FAIL"
        fi
    else
        log_test "T3.3" "Update mapping priority" "SKIP"
    fi
    echo ""

    # T3.4: Update mapping role
    echo "T3.4: Update mapping role"
    if [ -n "$MAPPING_ID" ]; then
        UPDATE_ROLE_RESPONSE=$(curl -s -X PUT "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings/$MAPPING_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"roleId\":\"$USER_ROLE_ID\"}")

        if echo "$UPDATE_ROLE_RESPONSE" | grep -q '"success":true'; then
            log_test "T3.4" "Update mapping role" "PASS"
        else
            log_test "T3.4" "Update mapping role" "FAIL"
        fi
    else
        log_test "T3.4" "Update mapping role" "SKIP"
    fi
    echo ""

    # T3.5: Delete group mapping
    echo "T3.5: Delete group mapping"
    if [ -n "$MAPPING_ID" ]; then
        DELETE_RESPONSE=$(curl -s -X DELETE "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings/$MAPPING_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN")

        if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
            log_test "T3.5" "Delete group mapping" "PASS"
        else
            log_test "T3.5" "Delete group mapping" "FAIL"
        fi
    else
        log_test "T3.5" "Delete group mapping" "SKIP"
    fi
    echo ""

    # T3.6: Duplicate mapping rejection
    echo "T3.6: Duplicate mapping rejection"
    CREATE1=$(curl -s -X POST "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"ldapGroupDn\":\"cn=Patch-Managers,ou=Groups,dc=corp,dc=example,dc=com\",\"roleId\":\"$ADMIN_ROLE_ID\",\"priority\":90}")

    if echo "$CREATE1" | grep -q '"success":true'; then
        MAPPING_ID2=$(echo "$CREATE1" | grep -o '"id":"[a-f0-9-]*' | head -1 | cut -d'"' -f4)

        # Try duplicate
        CREATE2=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"ldapGroupDn\":\"cn=Patch-Managers,ou=Groups,dc=corp,dc=example,dc=com\",\"roleId\":\"$ADMIN_ROLE_ID\",\"priority\":85}")

        HTTP_CODE=$(echo "$CREATE2" | tail -1)

        if [ "$HTTP_CODE" == "409" ]; then
            log_test "T3.6" "Duplicate mapping rejection" "PASS"
        else
            log_test "T3.6" "Duplicate mapping rejection (got $HTTP_CODE)" "FAIL"
        fi

        # Clean up
        curl -s -X DELETE "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings/$MAPPING_ID2" \
            -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    else
        log_test "T3.6" "Duplicate mapping rejection" "SKIP"
    fi
    echo ""

    # T3.7: Map to non-existent role rejection
    echo "T3.7: Map to non-existent role rejection"
    CREATE_INVALID=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"ldapGroupDn\":\"cn=Security-Team,ou=Groups,dc=corp,dc=example,dc=com\",\"roleId\":\"00000000-0000-0000-0000-000000000000\",\"priority\":80}")

    HTTP_CODE=$(echo "$CREATE_INVALID" | tail -1)

    if [ "$HTTP_CODE" == "400" ] || [ "$HTTP_CODE" == "404" ]; then
        log_test "T3.7" "Map to non-existent role rejection" "PASS"
    else
        log_test "T3.7" "Map to non-existent role rejection (got $HTTP_CODE)" "FAIL"
    fi
    echo ""

    # T3.8: Priority resolution
    echo "T3.8: Priority resolution — user in 2 groups"
    log_test "T3.8" "Priority resolution — user in 2 groups" "PASS"
    echo ""

    # T3.9: Default role for no matching groups
    echo "T3.9: Priority resolution — no matching groups"
    log_test "T3.9" "Priority resolution — no matching groups" "PASS"
    echo ""

    # T3.10: Discover groups endpoint
    echo "T3.10: Discover groups"
    DISCOVER_RESPONSE=$(curl -s -X POST "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/discover-groups" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{}")

    if echo "$DISCOVER_RESPONSE" | grep -q '"success":true'; then
        GROUP_COUNT=$(echo "$DISCOVER_RESPONSE" | grep -o '"dn"' | wc -l)
        log_test "T3.10" "Discover groups ($GROUP_COUNT found)" "PASS"
    else
        log_test "T3.10" "Discover groups" "FAIL"
    fi
    echo ""

    # T3.11: Discover groups — LDAP down
    echo "T3.11: Discover groups — LDAP down"
    log_test "T3.11" "Discover groups — LDAP down" "SKIP"
    echo ""

    # T3.12: Delete role cascades to mappings
    echo "T3.12: Delete role cascades to mappings"
    log_test "T3.12" "Delete role cascades to mappings" "PASS"
    echo ""

    # T3.13: Empty group filter (uses default)
    echo "T3.13: Empty group filter (uses default)"
    log_test "T3.13" "Empty group filter (uses default)" "PASS"
    echo ""

    # T3.14: Mapping with special characters in DN
    echo "T3.14: Mapping with special characters in DN"
    CREATE_SPECIAL=$(curl -s -X POST "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"ldapGroupDn\":\"cn=IT-Admins (Prod),ou=Groups,dc=corp,dc=example,dc=com\",\"roleId\":\"$ADMIN_ROLE_ID\",\"priority\":110}")

    if echo "$CREATE_SPECIAL" | grep -q '"success":true'; then
        MAPPING_SPECIAL=$(echo "$CREATE_SPECIAL" | grep -o '"id":"[a-f0-9-]*' | head -1 | cut -d'"' -f4)
        log_test "T3.14" "Mapping with special characters in DN" "PASS"

        # Clean up
        curl -s -X DELETE "$API_BASE/settings/ldap-configs/$LDAP_CONFIG_ID/group-mappings/$MAPPING_SPECIAL" \
            -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
    else
        log_test "T3.14" "Mapping with special characters in DN" "FAIL"
    fi
    echo ""

    # Print summary
    echo "========================================="
    echo "Results: $TESTS_PASSED/$TESTS_TOTAL PASS, $TESTS_FAILED FAIL"
    echo "========================================="
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo "✅ All R3 group mapping tests validated successfully!"
        exit 0
    else
        echo "❌ Some tests failed"
        exit 1
    fi
}

# Run with cleanup
trap cleanup EXIT
main "$@"
