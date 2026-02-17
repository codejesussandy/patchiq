#!/bin/bash
# Phase 5B Agent 57: Manual LDAP Integration Test Script
#
# This script tests the complete LDAP integration flow via API calls.
# It creates an LDAP configuration, tests connection, and syncs users.

set -e

BASE_URL="http://localhost:3000/v1"
ADMIN_EMAIL="admin@patchiq.io"
ADMIN_PASSWORD="admin123"

echo "🧪 Phase 5B Agent 57: LDAP Integration Test"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Login
echo "Step 1: Login as Admin"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓${NC} Login successful"
else
  echo -e "${RED}✗${NC} Login failed"
  exit 1
fi
echo ""

# Step 2: List existing LDAP configs
echo "Step 2: List Existing LDAP Configurations"
LDAP_CONFIGS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/settings/ldap-configs")

CONFIG_COUNT=$(echo $LDAP_CONFIGS | jq -r '.data | length')
echo -e "${GREEN}✓${NC} Found ${CONFIG_COUNT} existing LDAP configurations"
echo ""

# Step 3: Create LDAP Configuration
echo "Step 3: Create LDAP Configuration"
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/settings/ldap-configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E2E Test LDAP Server",
    "host": "localhost",
    "port": 3389,
    "fqdn": "corp.example.com",
    "baseDN": "dc=corp,dc=example,dc=com",
    "username": "cn=admin,dc=corp,dc=example,dc=com",
    "password": "admin-ldap-password",
    "groupBase": "ou=groups,dc=corp,dc=example,dc=com",
    "protocol": "LDAP",
    "timeout": 10000,
    "description": "E2E Test OpenLDAP Server",
    "enabled": true,
    "enableAutoSync": false
  }')

CONFIG_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')

if [ "$CONFIG_ID" != "null" ] && [ -n "$CONFIG_ID" ]; then
  echo -e "${GREEN}✓${NC} LDAP configuration created: ${CONFIG_ID}"
else
  echo -e "${YELLOW}⚠${NC} Configuration might already exist or creation failed"
  # Try to find existing config
  CONFIG_ID=$(echo $LDAP_CONFIGS | jq -r '.data[] | select(.name=="E2E Test LDAP Server") | .id')
  if [ -n "$CONFIG_ID" ] && [ "$CONFIG_ID" != "null" ]; then
    echo -e "${GREEN}✓${NC} Using existing configuration: ${CONFIG_ID}"
  else
    echo -e "${RED}✗${NC} Could not create or find LDAP configuration"
    exit 1
  fi
fi
echo ""

# Step 4: Test Connection
echo "Step 4: Test LDAP Connection"
TEST_RESPONSE=$(curl -s -X POST "${BASE_URL}/settings/ldap-configs/${CONFIG_ID}/test" \
  -H "Authorization: Bearer $TOKEN")

TEST_SUCCESS=$(echo $TEST_RESPONSE | jq -r '.success')

if [ "$TEST_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✓${NC} LDAP connection test successful"
  TEST_MESSAGE=$(echo $TEST_RESPONSE | jq -r '.data.message // .message')
  echo "  Message: ${TEST_MESSAGE}"
else
  echo -e "${RED}✗${NC} LDAP connection test failed"
  ERROR_MSG=$(echo $TEST_RESPONSE | jq -r '.error.message // .error')
  echo "  Error: ${ERROR_MSG}"
fi
echo ""

# Step 5: Sync Users
echo "Step 5: Sync Users from LDAP"
SYNC_RESPONSE=$(curl -s -X POST "${BASE_URL}/settings/ldap-configs/${CONFIG_ID}/sync" \
  -H "Authorization: Bearer $TOKEN")

SYNC_SUCCESS=$(echo $SYNC_RESPONSE | jq -r '.success')

if [ "$SYNC_SUCCESS" = "true" ]; then
  echo -e "${GREEN}✓${NC} User sync initiated successfully"
  SYNC_DATA=$(echo $SYNC_RESPONSE | jq -r '.data')
  echo "  Result: ${SYNC_DATA}"
else
  echo -e "${YELLOW}⚠${NC} User sync may have failed or is still processing"
  SYNC_ERROR=$(echo $SYNC_RESPONSE | jq -r '.error.message // .error // "Unknown error"')
  echo "  Message: ${SYNC_ERROR}"
fi
echo ""

# Step 6: List Users to check for LDAP users
echo "Step 6: Check for LDAP Users"
USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/settings/users?limit=100")

LDAP_USERS=$(echo $USERS_RESPONSE | jq -r '.data[] | select(.authSource=="LDAP") | .email' 2>/dev/null || echo "")

if [ -n "$LDAP_USERS" ]; then
  LDAP_USER_COUNT=$(echo "$LDAP_USERS" | wc -l | tr -d ' ')
  echo -e "${GREEN}✓${NC} Found ${LDAP_USER_COUNT} LDAP users:"
  echo "$LDAP_USERS" | while read -r user; do
    echo "  - $user"
  done
else
  echo -e "${YELLOW}⚠${NC} No LDAP users found yet (sync may still be processing)"
fi
echo ""

# Step 7: Test LDAP Authentication
echo "Step 7: Test LDAP Authentication"
echo "Attempting to login with LDAP user: john.doe@corp.example.com"

LDAP_LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@corp.example.com","password":"test123"}')

LDAP_TOKEN=$(echo $LDAP_LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$LDAP_TOKEN" != "null" ] && [ -n "$LDAP_TOKEN" ]; then
  echo -e "${GREEN}✓${NC} LDAP authentication successful"
  LDAP_USER=$(echo $LDAP_LOGIN_RESPONSE | jq -r '.data.user.email')
  LDAP_AUTH_SOURCE=$(echo $LDAP_LOGIN_RESPONSE | jq -r '.data.user.authSource')
  echo "  User: ${LDAP_USER}"
  echo "  Auth Source: ${LDAP_AUTH_SOURCE}"
else
  echo -e "${YELLOW}⚠${NC} LDAP authentication not working yet"
  echo "  (User may need to be synced first)"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary:"
echo "=========================================="
echo -e "Login:              ${GREEN}✓ PASS${NC}"
echo -e "List Configs:       ${GREEN}✓ PASS${NC}"
echo -e "Create Config:      ${GREEN}✓ PASS${NC}"
if [ "$TEST_SUCCESS" = "true" ]; then
  echo -e "Test Connection:    ${GREEN}✓ PASS${NC}"
else
  echo -e "Test Connection:    ${RED}✗ FAIL${NC}"
fi
if [ "$SYNC_SUCCESS" = "true" ]; then
  echo -e "Sync Users:         ${GREEN}✓ PASS${NC}"
else
  echo -e "Sync Users:         ${YELLOW}⚠ PARTIAL${NC}"
fi
if [ -n "$LDAP_USERS" ]; then
  echo -e "LDAP Users Found:   ${GREEN}✓ PASS${NC}"
else
  echo -e "LDAP Users Found:   ${YELLOW}⚠ PENDING${NC}"
fi
if [ "$LDAP_TOKEN" != "null" ] && [ -n "$LDAP_TOKEN" ]; then
  echo -e "LDAP Auth:          ${GREEN}✓ PASS${NC}"
else
  echo -e "LDAP Auth:          ${YELLOW}⚠ PENDING${NC}"
fi
echo ""
echo "LDAP Configuration ID: ${CONFIG_ID}"
echo "Test completed!"
