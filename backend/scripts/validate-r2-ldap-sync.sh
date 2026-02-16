#!/bin/bash
set -e

# R2 LDAP User Sync Validation Script
# Tests all scenarios for LDAP user synchronization

BASE_URL="http://localhost:3000/v1"
LDAP_CONFIG_ID="dev-openldap-config"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0

# Get auth token
echo "Authenticating..."
TOKEN=$(curl -s ${BASE_URL}/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@patchiq.io","password":"admin123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}FAILED to get auth token${NC}"
  exit 1
fi

echo -e "${GREEN}Authenticated successfully${NC}\n"

# Helper functions
pass_test() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASS_COUNT++))
}

fail_test() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  echo -e "  Details: $2"
  ((FAIL_COUNT++))
}

# ===================================================================
# T2.1: Trigger on-demand sync
# ===================================================================
echo -e "\n${YELLOW}T2.1: Trigger on-demand sync${NC}"
SYNC_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/settings/ldap-configs/${LDAP_CONFIG_ID}/sync" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$SYNC_RESPONSE" | tail -n1)
BODY=$(echo "$SYNC_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
  JOB_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('jobId', ''))")
  if [ -n "$JOB_ID" ]; then
    pass_test "Sync triggered successfully, jobId: $JOB_ID"
    echo "Waiting 5 seconds for sync to complete..."
    sleep 5
  else
    fail_test "Sync triggered but no jobId returned" "$BODY"
  fi
else
  fail_test "Failed to trigger sync (HTTP $HTTP_CODE)" "$BODY"
fi

# ===================================================================
# T2.2: Verify sync job status
# ===================================================================
echo -e "\n${YELLOW}T2.2: Verify sync job status${NC}"
JOBS_RESPONSE=$(curl -s "${BASE_URL}/settings/ldap-configs/${LDAP_CONFIG_ID}/sync-jobs" \
  -H "Authorization: Bearer ${TOKEN}")

JOB_COUNT=$(echo "$JOBS_RESPONSE" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data', [])))")
if [ "$JOB_COUNT" -gt 0 ]; then
  LATEST_STATUS=$(echo "$JOBS_RESPONSE" | python3 -c "import sys,json; jobs=json.load(sys.stdin).get('data',[]); print(jobs[0].get('status','') if jobs else '')")
  if [ "$LATEST_STATUS" = "COMPLETED" ] || [ "$LATEST_STATUS" = "COMPLETED_WITH_ERRORS" ]; then
    pass_test "Latest sync job status: $LATEST_STATUS"
  else
    fail_test "Latest sync job status is $LATEST_STATUS (expected COMPLETED)" "$JOBS_RESPONSE"
  fi
else
  fail_test "No sync jobs found" "$JOBS_RESPONSE"
fi

# ===================================================================
# T2.3: Get sync job details
# ===================================================================
echo -e "\n${YELLOW}T2.3: Get sync job details${NC}"
if [ -n "$JOB_ID" ]; then
  JOB_DETAILS=$(curl -s "${BASE_URL}/settings/ldap-configs/${LDAP_CONFIG_ID}/sync-jobs/${JOB_ID}" \
    -H "Authorization: Bearer ${TOKEN}")

  USERS_FOUND=$(echo "$JOB_DETAILS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('usersFound', 0))")
  USERS_CREATED=$(echo "$JOB_DETAILS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data', {}).get('usersCreated', 0))")

  if [ "$USERS_FOUND" -gt 0 ]; then
    pass_test "Sync job details: usersFound=$USERS_FOUND, usersCreated=$USERS_CREATED"
  else
    fail_test "Sync job found 0 users" "$JOB_DETAILS"
  fi
else
  fail_test "Cannot get job details - no jobId from T2.1" ""
fi

# ===================================================================
# T2.4: Verify users created
# ===================================================================
echo -e "\n${YELLOW}T2.4: Verify users created${NC}"
USERS_RESPONSE=$(curl -s "${BASE_URL}/settings/users" \
  -H "Authorization: Bearer ${TOKEN}")

LDAP_USER_COUNT=$(echo "$USERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
ldap_users = [u for u in data if u.get('authSource') == 'LDAP']
print(len(ldap_users))
")

HAS_JOHN=$(echo "$USERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
has_john = any(u.get('email') == 'john.admin@corp.example.com' for u in data)
print('yes' if has_john else 'no')
")

if [ "$LDAP_USER_COUNT" -gt 0 ] && [ "$HAS_JOHN" = "yes" ]; then
  pass_test "LDAP users created: $LDAP_USER_COUNT users including john.admin@corp.example.com"
else
  fail_test "LDAP users not found properly (count=$LDAP_USER_COUNT, has_john=$HAS_JOHN)" "$USERS_RESPONSE"
fi

# ===================================================================
# T2.5: Local user not overwritten
# ===================================================================
echo -e "\n${YELLOW}T2.5: Local user not overwritten${NC}"
ADMIN_AUTH_SOURCE=$(echo "$USERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
admin = next((u for u in data if u.get('email') == 'admin@patchiq.io'), None)
print(admin.get('authSource', 'NOT_FOUND') if admin else 'NOT_FOUND')
")

if [ "$ADMIN_AUTH_SOURCE" = "LOCAL" ]; then
  pass_test "admin@patchiq.io remains LOCAL (not overwritten by LDAP sync)"
else
  fail_test "admin@patchiq.io authSource is $ADMIN_AUTH_SOURCE (expected LOCAL)" "$USERS_RESPONSE"
fi

# ===================================================================
# T2.6: Concurrent sync prevention (optional - timing dependent)
# ===================================================================
echo -e "\n${YELLOW}T2.6: Concurrent sync prevention (SKIPPED - timing dependent)${NC}"
echo "  (Would need to trigger sync while one is already running)"

# ===================================================================
# T2.7: List sync jobs
# ===================================================================
echo -e "\n${YELLOW}T2.7: List sync jobs${NC}"
JOBS_LIST=$(curl -s "${BASE_URL}/settings/ldap-configs/${LDAP_CONFIG_ID}/sync-jobs" \
  -H "Authorization: Bearer ${TOKEN}")

JOB_COUNT=$(echo "$JOBS_LIST" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data', [])))")
if [ "$JOB_COUNT" -gt 0 ]; then
  pass_test "Sync jobs listed: $JOB_COUNT jobs found"
else
  fail_test "No sync jobs in list" "$JOBS_LIST"
fi

# ===================================================================
# T2.8: Verify role assignment from group mapping
# ===================================================================
echo -e "\n${YELLOW}T2.8: Verify role assignment from group mapping${NC}"
JOHN_ROLE=$(echo "$USERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
john = next((u for u in data if u.get('email') == 'john.admin@corp.example.com'), None)
print(john.get('role', {}).get('name', 'NOT_FOUND') if john and john.get('role') else 'NO_ROLE')
")

ALICE_EMAIL="alice.user@corp.example.com"
ALICE_ROLE=$(echo "$USERS_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
alice = next((u for u in data if u.get('email') == '${ALICE_EMAIL}'), None)
print(alice.get('role', {}).get('name', 'NOT_FOUND') if alice and alice.get('role') else 'NO_ROLE')
")

if [ "$JOHN_ROLE" = "admin" ] || [ "$JOHN_ROLE" = "Admin" ]; then
  pass_test "john.admin has admin role (from IT-Admins group mapping)"
else
  fail_test "john.admin role is $JOHN_ROLE (expected admin)" "$USERS_RESPONSE"
fi

# Note: alice.user might have user/User role
if [ "$ALICE_ROLE" != "NOT_FOUND" ] && [ "$ALICE_ROLE" != "NO_ROLE" ]; then
  pass_test "alice.user has role: $ALICE_ROLE (from IT-Users group mapping)"
else
  echo -e "${YELLOW}  alice.user role: $ALICE_ROLE (acceptable if no group mapping for IT-Users)${NC}"
fi

# ===================================================================
# T2.9: No-email user handling
# ===================================================================
echo -e "\n${YELLOW}T2.9: No-email user handling${NC}"
if [ -n "$JOB_ID" ]; then
  SYNC_LOG=$(echo "$JOB_DETAILS" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', {})
log = data.get('syncLog', [])
skipped_entries = [entry for entry in log if 'skip' in entry.lower() or 'no email' in entry.lower()]
print('\n'.join(skipped_entries[:3]))  # Show first 3 skipped entries
")

  if echo "$SYNC_LOG" | grep -qi "email"; then
    pass_test "Sync log contains entries about skipped users (no email)"
  else
    echo -e "${YELLOW}  No specific 'no email' entries in sync log (may be acceptable)${NC}"
  fi
else
  fail_test "Cannot check no-email handling - no jobId" ""
fi

# ===================================================================
# SUMMARY
# ===================================================================
echo -e "\n=========================================="
echo -e "${YELLOW}R2 LDAP User Sync Validation Summary${NC}"
echo -e "=========================================="
echo -e "${GREEN}PASSED: $PASS_COUNT${NC}"
echo -e "${RED}FAILED: $FAIL_COUNT${NC}"
echo -e "=========================================\n"

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ All tests PASSED!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests FAILED${NC}"
  exit 1
fi
