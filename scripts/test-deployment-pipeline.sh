#!/bin/bash
#
# Deployment Pipeline Diagnostic Script
# Tests the entire flow from API to database to agent
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Pipeline Diagnostic Tool  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Check backend health
echo -e "${YELLOW}[1/7] Checking backend health...${NC}"
if curl -s "$BACKEND_URL/health" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}  ✓ Backend is healthy${NC}"
else
    echo -e "${RED}  ✗ Backend is not responding${NC}"
    echo "    Make sure backend is running: cd backend && npm run dev"
    exit 1
fi

# Step 2: Login and get token
echo -e "${YELLOW}[2/7] Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@patchiq.io","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .data.accessToken // empty')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${RED}  ✗ Failed to authenticate${NC}"
    echo "    Response: $LOGIN_RESPONSE"
    exit 1
fi
echo -e "${GREEN}  ✓ Authenticated successfully${NC}"

# Step 3: List agents
echo -e "${YELLOW}[3/7] Fetching agents...${NC}"
AGENTS_RESPONSE=$(curl -s "$BACKEND_URL/v1/agents" \
    -H "Authorization: Bearer $TOKEN")

AGENT_COUNT=$(echo "$AGENTS_RESPONSE" | jq -r 'if type == "array" then length else (.data | length) end // 0')
if [ "$AGENT_COUNT" -eq 0 ]; then
    echo -e "${RED}  ✗ No agents found${NC}"
    echo "    You need at least one registered agent to test deployments"
    echo "    Start an agent: cd agent && go run ./cmd/agent"
    exit 1
fi

# Get first agent ID
FIRST_AGENT=$(echo "$AGENTS_RESPONSE" | jq -r 'if type == "array" then .[0] else .data[0] end')
AGENT_ID=$(echo "$FIRST_AGENT" | jq -r '.id')
AGENT_NAME=$(echo "$FIRST_AGENT" | jq -r '.hostname // .name // "Unknown"')
echo -e "${GREEN}  ✓ Found $AGENT_COUNT agent(s)${NC}"
echo -e "    Using agent: $AGENT_NAME ($AGENT_ID)"

# Step 4: Create a test deployment
echo -e "${YELLOW}[4/7] Creating test deployment...${NC}"
DEPLOYMENT_PAYLOAD=$(cat <<EOF
{
  "name": "Pipeline Test $(date +%Y%m%d-%H%M%S)",
  "description": "Testing deployment pipeline",
  "type": "install",
  "targetAgentIds": ["$AGENT_ID"],
  "package": {
    "name": "test-package-diagnostic",
    "source": "apt"
  }
}
EOF
)

CREATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/v1/deployments/software" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$DEPLOYMENT_PAYLOAD")

DEPLOYMENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.deploymentId // empty')
if [ -z "$DEPLOYMENT_ID" ] || [ "$DEPLOYMENT_ID" == "null" ]; then
    echo -e "${RED}  ✗ Failed to create deployment${NC}"
    echo "    Response: $CREATE_RESPONSE"
    exit 1
fi
TASKS_CREATED=$(echo "$CREATE_RESPONSE" | jq -r '.data.tasksCreated // 0')
COMMANDS_CREATED=$(echo "$CREATE_RESPONSE" | jq -r '.data.commandsCreated // 0')
echo -e "${GREEN}  ✓ Deployment created: $DEPLOYMENT_ID${NC}"
echo -e "    Tasks created: $TASKS_CREATED, Commands created: $COMMANDS_CREATED"

# Step 5: Check deployment status
echo -e "${YELLOW}[5/7] Checking deployment status...${NC}"
STATUS_RESPONSE=$(curl -s "$BACKEND_URL/v1/deployments/software/$DEPLOYMENT_ID" \
    -H "Authorization: Bearer $TOKEN")

DEPLOYMENT_STAGE=$(echo "$STATUS_RESPONSE" | jq -r '.data.stage // empty')
PENDING_COUNT=$(echo "$STATUS_RESPONSE" | jq -r '.data.pending // 0')
TASKS_ARRAY=$(echo "$STATUS_RESPONSE" | jq -r '.data.tasks // []')
TASK_COUNT=$(echo "$TASKS_ARRAY" | jq 'length')

echo -e "${GREEN}  ✓ Deployment status: $DEPLOYMENT_STAGE${NC}"
echo -e "    Pending tasks: $PENDING_COUNT"
echo -e "    Total tasks: $TASK_COUNT"

# Check task field names
if [ "$TASK_COUNT" -gt 0 ]; then
    FIRST_TASK=$(echo "$TASKS_ARRAY" | jq '.[0]')
    echo ""
    echo -e "${BLUE}  Task fields returned by API:${NC}"
    echo "$FIRST_TASK" | jq -r 'keys[]' | while read key; do
        VALUE=$(echo "$FIRST_TASK" | jq -r ".$key // \"null\"" | head -c 50)
        echo -e "    - $key: $VALUE"
    done
fi

# Step 6: Check if commands are in database
echo -e ""
echo -e "${YELLOW}[6/7] Checking pending commands in database...${NC}"
# This requires psql access - we'll skip if not available
if command -v psql &> /dev/null; then
    PENDING_COMMANDS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"AgentCommand\" WHERE status = 'pending'" 2>/dev/null || echo "N/A")
    echo -e "    Pending commands in DB: $PENDING_COMMANDS"
else
    echo -e "    (psql not available - skipping direct DB check)"
fi

# Step 7: List all deployments
echo -e "${YELLOW}[7/7] Listing all deployments...${NC}"
LIST_RESPONSE=$(curl -s "$BACKEND_URL/v1/deployments/software" \
    -H "Authorization: Bearer $TOKEN")

TOTAL_DEPLOYMENTS=$(echo "$LIST_RESPONSE" | jq -r '.data | length // 0')
echo -e "${GREEN}  ✓ Total deployments: $TOTAL_DEPLOYMENTS${NC}"

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}           Pipeline Summary            ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Test Deployment ID: ${GREEN}$DEPLOYMENT_ID${NC}"
echo -e "Target Agent: ${GREEN}$AGENT_NAME${NC}"
echo -e "Deployment Stage: ${GREEN}$DEPLOYMENT_STAGE${NC}"
echo ""
echo -e "${YELLOW}Next steps to verify:${NC}"
echo -e "1. Check Agent UI: http://localhost:8080/jobs"
echo -e "   - The job should appear in 'Active Jobs' or 'Job History'"
echo ""
echo -e "2. Check PatchIQ Frontend: $FRONTEND_URL/jobs/software-jobs/deployed"
echo -e "   - Deployment should be visible with correct status"
echo -e "   - Click view icon to see tasks"
echo ""
echo -e "3. Check Agent logs for command execution:"
echo -e "   grep -i 'command\\|execute' agent.log"
echo ""
echo -e "${GREEN}Pipeline test completed!${NC}"
