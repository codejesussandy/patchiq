#!/bin/bash
# Concurrent Deployment Test Script
# Tests deploying multiple packages concurrently to validate agent queuing and parallel execution

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://test-hub.patchiq.io/api}"
API_TOKEN="${API_TOKEN:-}"
NUM_CONCURRENT="${NUM_CONCURRENT:-10}"
TEST_TYPE="${TEST_TYPE:-same-agent}" # same-agent or multi-agent
AGENT_ID="${AGENT_ID:-}"
RESULTS_FILE="concurrent-deploy-results-$(date +%Y%m%d-%H%M%S).json"

echo "==================================================================="
echo "Concurrent Deployment Test"
echo "==================================================================="
echo "API URL: $API_URL"
echo "Test Type: $TEST_TYPE"
echo "Concurrent Deployments: $NUM_CONCURRENT"
echo "Results File: $RESULTS_FILE"
echo "==================================================================="
echo ""

# Check prerequisites
if [ -z "$API_TOKEN" ]; then
    echo -e "${RED}✗ API_TOKEN not set${NC}"
    echo "Usage: API_TOKEN=your-token $0"
    exit 1
fi

# Function to get agent list
get_agents() {
    curl -s -H "Authorization: Bearer $API_TOKEN" \
        "$API_URL/v1/agents" | jq -r '.data[].id'
}

# Function to get test packages based on agent platform
get_test_packages() {
    local agent_id="$1"

    # Get agent platform
    local platform=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
        "$API_URL/v1/agents/$agent_id" | jq -r '.data.platform')

    # Return appropriate test packages
    case "$platform" in
        windows)
            echo "7zip.7zip VideoLAN.VLC Google.Chrome Mozilla.Firefox Notepad++.Notepad++ Git.Git Python.Python.3.12 Microsoft.VisualStudioCode OpenJS.NodeJS.LTS SlackTechnologies.Slack"
            ;;
        macos)
            echo "google-chrome visual-studio-code slack zoom vlc git node python@3.12 wget htop"
            ;;
        linux)
            echo "curl git vim htop nginx python3-pip build-essential net-tools jq tree"
            ;;
        *)
            echo "curl git vim htop"
            ;;
    esac
}

# Function to trigger deployment
trigger_deployment() {
    local agent_id="$1"
    local package="$2"
    local index="$3"

    echo -e "${YELLOW}[Deployment $index] Triggering: $package on agent $agent_id${NC}"

    local start_time=$(date +%s)

    # Trigger deployment
    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"packageId\": \"$package\", \"action\": \"install\"}" \
        "$API_URL/v1/agents/$agent_id/deployments")

    local deployment_id=$(echo "$response" | jq -r '.data.id // empty')

    if [ -z "$deployment_id" ]; then
        echo -e "${RED}✗ [Deployment $index] Failed to trigger: $(echo "$response" | jq -r '.error.message')${NC}"
        echo "{\"index\": $index, \"agent\": \"$agent_id\", \"package\": \"$package\", \"status\": \"trigger_failed\", \"deployment_id\": null, \"start_time\": $start_time}" >> "$RESULTS_FILE.tmp"
        return 1
    fi

    echo -e "${GREEN}✓ [Deployment $index] Triggered: $deployment_id${NC}"
    echo "{\"index\": $index, \"agent\": \"$agent_id\", \"package\": \"$package\", \"status\": \"triggered\", \"deployment_id\": \"$deployment_id\", \"start_time\": $start_time}" >> "$RESULTS_FILE.tmp"

    return 0
}

# Function to check deployment status
check_deployment_status() {
    local deployment_id="$1"

    curl -s -H "Authorization: Bearer $API_TOKEN" \
        "$API_URL/v1/deployments/$deployment_id" | jq -r '.data.status // "unknown"'
}

# Function to wait for all deployments to complete
wait_for_deployments() {
    echo ""
    echo "Waiting for all deployments to complete..."
    echo ""

    local max_wait=600 # 10 minutes
    local elapsed=0
    local check_interval=10

    while [ $elapsed -lt $max_wait ]; do
        local pending=0
        local successful=0
        local failed=0
        local unknown=0

        # Read deployment IDs from temp results
        while IFS= read -r line; do
            local deployment_id=$(echo "$line" | jq -r '.deployment_id // empty')

            if [ -n "$deployment_id" ] && [ "$deployment_id" != "null" ]; then
                local status=$(check_deployment_status "$deployment_id")

                case "$status" in
                    success|completed)
                        ((successful++))
                        ;;
                    failed|error)
                        ((failed++))
                        ;;
                    pending|in_progress|queued)
                        ((pending++))
                        ;;
                    *)
                        ((unknown++))
                        ;;
                esac
            fi
        done < "$RESULTS_FILE.tmp"

        echo -e "Status: ${GREEN}$successful successful${NC}, ${YELLOW}$pending pending${NC}, ${RED}$failed failed${NC}, $unknown unknown"

        if [ $pending -eq 0 ]; then
            echo -e "${GREEN}All deployments completed!${NC}"
            break
        fi

        sleep $check_interval
        ((elapsed+=check_interval))
    done

    if [ $elapsed -ge $max_wait ]; then
        echo -e "${RED}✗ Timeout waiting for deployments (${max_wait}s)${NC}"
        return 1
    fi

    return 0
}

# Function to generate final results
generate_results() {
    echo ""
    echo "==================================================================="
    echo "Generating Results..."
    echo "==================================================================="

    local total=0
    local successful=0
    local failed=0
    local trigger_failed=0
    local total_duration=0

    # Create JSON array
    echo "[" > "$RESULTS_FILE"

    local first=true
    while IFS= read -r line; do
        local deployment_id=$(echo "$line" | jq -r '.deployment_id // empty')
        local start_time=$(echo "$line" | jq -r '.start_time')
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        if [ -n "$deployment_id" ] && [ "$deployment_id" != "null" ]; then
            # Get final status
            local status=$(check_deployment_status "$deployment_id")

            # Get deployment details
            local details=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
                "$API_URL/v1/deployments/$deployment_id")

            # Update line with final status and details
            local result=$(echo "$line" | jq \
                --arg status "$status" \
                --arg duration "$duration" \
                --argjson details "$details" \
                '. + {final_status: $status, duration: ($duration | tonumber), details: $details.data}')

            if [ "$first" = true ]; then
                first=false
            else
                echo "," >> "$RESULTS_FILE"
            fi

            echo "$result" >> "$RESULTS_FILE"

            ((total++))

            case "$status" in
                success|completed)
                    ((successful++))
                    ;;
                failed|error)
                    ((failed++))
                    ;;
            esac

            total_duration=$((total_duration + duration))
        else
            ((trigger_failed++))
            ((total++))
        fi
    done < "$RESULTS_FILE.tmp"

    echo "]" >> "$RESULTS_FILE"

    # Calculate metrics
    local success_rate=0
    if [ $total -gt 0 ]; then
        success_rate=$(awk "BEGIN {printf \"%.2f\", ($successful * 100.0 / $total)}")
    fi

    local avg_duration=0
    if [ $successful -gt 0 ]; then
        avg_duration=$((total_duration / successful))
    fi

    echo ""
    echo "==================================================================="
    echo "Test Results Summary"
    echo "==================================================================="
    echo "Total Deployments: $total"
    echo -e "Successful: ${GREEN}$successful${NC}"
    echo -e "Failed: ${RED}$failed${NC}"
    echo -e "Trigger Failed: ${RED}$trigger_failed${NC}"
    echo "Success Rate: $success_rate%"
    echo "Average Duration: ${avg_duration}s (successful only)"
    echo "Results saved to: $RESULTS_FILE"
    echo "==================================================================="

    # Cleanup temp file
    rm -f "$RESULTS_FILE.tmp"

    # Check success criteria (95%+)
    if (( $(echo "$success_rate >= 95.0" | bc -l) )); then
        echo -e "${GREEN}✓ Test PASSED (success rate >= 95%)${NC}"
        return 0
    else
        echo -e "${RED}✗ Test FAILED (success rate < 95%)${NC}"
        return 1
    fi
}

# Main test execution
main() {
    # Initialize temp results file
    > "$RESULTS_FILE.tmp"

    case "$TEST_TYPE" in
        same-agent)
            echo "Test Type: Concurrent deployments to SAME agent"
            echo "This tests the agent's queuing mechanism"
            echo ""

            if [ -z "$AGENT_ID" ]; then
                echo "Getting first available agent..."
                AGENT_ID=$(get_agents | head -1)

                if [ -z "$AGENT_ID" ]; then
                    echo -e "${RED}✗ No agents available${NC}"
                    exit 1
                fi

                echo "Using agent: $AGENT_ID"
            fi

            # Get test packages for agent
            echo "Getting test packages..."
            read -ra PACKAGES <<< "$(get_test_packages "$AGENT_ID")"

            # Limit to NUM_CONCURRENT packages
            PACKAGES=("${PACKAGES[@]:0:$NUM_CONCURRENT}")

            echo "Test packages: ${PACKAGES[*]}"
            echo ""

            # Trigger all deployments concurrently
            echo "Triggering $NUM_CONCURRENT concurrent deployments..."
            for i in "${!PACKAGES[@]}"; do
                trigger_deployment "$AGENT_ID" "${PACKAGES[$i]}" "$((i+1))" &
            done

            # Wait for all trigger commands to complete
            wait

            ;;

        multi-agent)
            echo "Test Type: Concurrent deployments to MULTIPLE agents"
            echo "This tests backend load handling"
            echo ""

            # Get list of agents
            echo "Getting agent list..."
            mapfile -t AGENTS < <(get_agents | head -n $NUM_CONCURRENT)

            if [ ${#AGENTS[@]} -lt $NUM_CONCURRENT ]; then
                echo -e "${YELLOW}⚠ Only ${#AGENTS[@]} agents available (requested $NUM_CONCURRENT)${NC}"
                NUM_CONCURRENT=${#AGENTS[@]}
            fi

            echo "Using $NUM_CONCURRENT agents"
            echo ""

            # Trigger deployments to all agents concurrently
            echo "Triggering $NUM_CONCURRENT concurrent deployments..."
            for i in "${!AGENTS[@]}"; do
                local agent_id="${AGENTS[$i]}"
                read -ra PACKAGES <<< "$(get_test_packages "$agent_id")"
                local package="${PACKAGES[0]}" # Use first package

                trigger_deployment "$agent_id" "$package" "$((i+1))" &
            done

            # Wait for all trigger commands to complete
            wait

            ;;

        *)
            echo -e "${RED}✗ Invalid TEST_TYPE: $TEST_TYPE${NC}"
            echo "Valid options: same-agent, multi-agent"
            exit 1
            ;;
    esac

    # Wait for all deployments to complete
    if ! wait_for_deployments; then
        echo -e "${RED}✗ Deployments did not complete in time${NC}"
    fi

    # Generate and display results
    generate_results
}

# Run main function
main
