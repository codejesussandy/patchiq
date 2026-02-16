#!/bin/bash
# Rollback Test Script
# Tests package rollback functionality across platforms

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://test-hub.patchiq.io/api}"
API_TOKEN="${API_TOKEN:-}"
AGENT_ID="${AGENT_ID:-}"
RESULTS_FILE="rollback-test-results-$(date +%Y%m%d-%H%M%S).json"

echo "==================================================================="
echo "Rollback Test"
echo "==================================================================="
echo "API URL: $API_URL"
echo "Agent ID: ${AGENT_ID:-auto-select}"
echo "Results File: $RESULTS_FILE"
echo "==================================================================="
echo ""

# Check prerequisites
if [ -z "$API_TOKEN" ]; then
    echo -e "${RED}✗ API_TOKEN not set${NC}"
    echo "Usage: API_TOKEN=your-token $0"
    exit 1
fi

# Function to get first available agent
get_agent() {
    if [ -z "$AGENT_ID" ]; then
        AGENT_ID=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
            "$API_URL/v1/agents" | jq -r '.data[0].id // empty')

        if [ -z "$AGENT_ID" ]; then
            echo -e "${RED}✗ No agents available${NC}"
            exit 1
        fi

        echo "Auto-selected agent: $AGENT_ID"
    fi
}

# Function to get agent platform
get_agent_platform() {
    curl -s -H "Authorization: Bearer $API_TOKEN" \
        "$API_URL/v1/agents/$AGENT_ID" | jq -r '.data.platform // "unknown"'
}

# Function to get rollback-capable test packages
get_rollback_test_packages() {
    local platform="$1"

    case "$platform" in
        windows)
            # Windows: Chocolatey supports rollback
            echo "winrar putty" # Space-separated
            ;;
        macos)
            # macOS: Homebrew supports rollback for formulae (not casks)
            echo "git node python@3.12 wget htop"
            ;;
        linux)
            # Linux: apt/dnf support rollback with package version pinning
            echo "curl git vim htop nginx"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Function to wait for deployment completion
wait_for_deployment() {
    local deployment_id="$1"
    local max_wait="${2:-300}" # 5 minutes default
    local elapsed=0

    echo "Waiting for deployment $deployment_id to complete..."

    while [ $elapsed -lt $max_wait ]; do
        local status=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
            "$API_URL/v1/deployments/$deployment_id" | jq -r '.data.status // "unknown"')

        echo "  Status: $status (${elapsed}s elapsed)"

        case "$status" in
            success|completed)
                echo -e "${GREEN}✓ Deployment completed successfully${NC}"
                return 0
                ;;
            failed|error)
                echo -e "${RED}✗ Deployment failed${NC}"
                return 1
                ;;
            pending|in_progress|queued)
                sleep 10
                ((elapsed+=10))
                ;;
            *)
                echo -e "${RED}✗ Unknown status: $status${NC}"
                return 1
                ;;
        esac
    done

    echo -e "${RED}✗ Timeout waiting for deployment${NC}"
    return 1
}

# Function to deploy package
deploy_package() {
    local package="$1"
    local version="${2:-latest}"
    local action="${3:-install}"

    echo "Deploying package: $package (version: $version, action: $action)"

    local response=$(curl -s -X POST \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"packageId\": \"$package\", \"version\": \"$version\", \"action\": \"$action\"}" \
        "$API_URL/v1/agents/$AGENT_ID/deployments")

    local deployment_id=$(echo "$response" | jq -r '.data.id // empty')

    if [ -z "$deployment_id" ]; then
        echo -e "${RED}✗ Failed to trigger deployment${NC}"
        echo "Response: $response"
        return 1
    fi

    echo "Deployment ID: $deployment_id"
    echo "$deployment_id"
}

# Function to check if package is installed
check_package_installed() {
    local package="$1"
    local platform="$2"

    # Get inventory
    local inventory=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
        "$API_URL/v1/agents/$AGENT_ID/inventory")

    # Check if package exists in inventory
    local installed=$(echo "$inventory" | jq -r \
        ".data.software[] | select(.name == \"$package\" or .id == \"$package\") | .name" | head -1)

    if [ -n "$installed" ]; then
        echo "true"
    else
        echo "false"
    fi
}

# Function to get installed package version
get_installed_version() {
    local package="$1"

    # Trigger inventory collection first
    curl -s -X POST -H "Authorization: Bearer $API_TOKEN" \
        "$API_URL/v1/agents/$AGENT_ID/collect" > /dev/null

    # Wait for inventory to complete
    sleep 30

    # Get inventory
    local inventory=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
        "$API_URL/v1/agents/$AGENT_ID/inventory")

    # Get version
    local version=$(echo "$inventory" | jq -r \
        ".data.software[] | select(.name == \"$package\" or .id == \"$package\") | .version" | head -1)

    echo "${version:-unknown}"
}

# Rollback Test Scenarios
test_rollback_scenario() {
    local package="$1"
    local test_name="$2"
    local platform="$3"

    echo ""
    echo "==================================================================="
    echo "Test: $test_name"
    echo "Package: $package"
    echo "Platform: $platform"
    echo "==================================================================="

    local test_result="{\"test\": \"$test_name\", \"package\": \"$package\", \"platform\": \"$platform\""

    # Step 1: Check if package already installed (uninstall if needed)
    echo ""
    echo "Step 1: Checking initial state..."
    local initially_installed=$(check_package_installed "$package" "$platform")

    if [ "$initially_installed" = "true" ]; then
        echo "Package already installed, uninstalling first..."
        local uninstall_id=$(deploy_package "$package" "latest" "uninstall")

        if [ -z "$uninstall_id" ]; then
            test_result+=", \"result\": \"failed\", \"error\": \"Failed to uninstall existing package\"}"
            echo "$test_result" >> "$RESULTS_FILE.tmp"
            return 1
        fi

        if ! wait_for_deployment "$uninstall_id" 300; then
            test_result+=", \"result\": \"failed\", \"error\": \"Uninstall failed\"}"
            echo "$test_result" >> "$RESULTS_FILE.tmp"
            return 1
        fi

        sleep 10
    fi

    # Step 2: Install version 1.0 (or older version)
    echo ""
    echo "Step 2: Installing initial version..."
    local install_id=$(deploy_package "$package" "1.0" "install")

    if [ -z "$install_id" ]; then
        test_result+=", \"result\": \"failed\", \"error\": \"Failed to install version 1.0\"}"
        echo "$test_result" >> "$RESULTS_FILE.tmp"
        return 1
    fi

    if ! wait_for_deployment "$install_id" 300; then
        test_result+=", \"result\": \"failed\", \"error\": \"Install v1.0 failed\"}"
        echo "$test_result" >> "$RESULTS_FILE.tmp"
        return 1
    fi

    # Verify installed
    sleep 10
    local version_1=$(get_installed_version "$package")
    echo "Installed version: $version_1"
    test_result+=", \"version_1\": \"$version_1\""

    # Step 3: Upgrade to version 2.0 (or latest)
    echo ""
    echo "Step 3: Upgrading to newer version..."
    local upgrade_id=$(deploy_package "$package" "2.0" "update")

    if [ -z "$upgrade_id" ]; then
        test_result+=", \"result\": \"failed\", \"error\": \"Failed to upgrade to version 2.0\"}"
        echo "$test_result" >> "$RESULTS_FILE.tmp"
        return 1
    fi

    if ! wait_for_deployment "$upgrade_id" 300; then
        test_result+=", \"result\": \"failed\", \"error\": \"Upgrade to v2.0 failed\"}"
        echo "$test_result" >> "$RESULTS_FILE.tmp"
        return 1
    fi

    # Verify upgraded
    sleep 10
    local version_2=$(get_installed_version "$package")
    echo "Upgraded version: $version_2"
    test_result+=", \"version_2\": \"$version_2\""

    # Step 4: Rollback to version 1.0
    echo ""
    echo "Step 4: Rolling back to previous version..."
    local rollback_id=$(deploy_package "$package" "1.0" "rollback")

    if [ -z "$rollback_id" ]; then
        test_result+=", \"result\": \"failed\", \"error\": \"Failed to trigger rollback\"}"
        echo "$test_result" >> "$RESULTS_FILE.tmp"
        return 1
    fi

    if ! wait_for_deployment "$rollback_id" 300; then
        test_result+=", \"result\": \"failed\", \"error\": \"Rollback failed\"}"
        echo "$test_result" >> "$RESULTS_FILE.tmp"
        return 1
    fi

    # Step 5: Verify rollback successful
    echo ""
    echo "Step 5: Verifying rollback..."
    sleep 10
    local version_rollback=$(get_installed_version "$package")
    echo "Rollback version: $version_rollback"
    test_result+=", \"version_rollback\": \"$version_rollback\""

    # Check if rollback successful (should match version_1 or be older than version_2)
    if [ "$version_rollback" = "$version_1" ] || [ "$version_rollback" != "$version_2" ]; then
        echo -e "${GREEN}✓ Rollback successful!${NC}"
        test_result+=", \"result\": \"success\"}"
        echo "$test_result" >> "$RESULTS_FILE.tmp"
        return 0
    else
        echo -e "${RED}✗ Rollback failed (version unchanged)${NC}"
        test_result+=", \"result\": \"failed\", \"error\": \"Version unchanged after rollback\"}"
        echo "$test_result" >> "$RESULTS_FILE.tmp"
        return 1
    fi
}

# Function to generate final results
generate_results() {
    echo ""
    echo "==================================================================="
    echo "Generating Results..."
    echo "==================================================================="

    # Create JSON array
    echo "[" > "$RESULTS_FILE"

    local first=true
    local total=0
    local successful=0
    local failed=0

    while IFS= read -r line; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$RESULTS_FILE"
        fi

        echo "$line" >> "$RESULTS_FILE"

        ((total++))

        local result=$(echo "$line" | jq -r '.result')
        if [ "$result" = "success" ]; then
            ((successful++))
        else
            ((failed++))
        fi
    done < "$RESULTS_FILE.tmp"

    echo "]" >> "$RESULTS_FILE"

    # Calculate success rate
    local success_rate=0
    if [ $total -gt 0 ]; then
        success_rate=$(awk "BEGIN {printf \"%.2f\", ($successful * 100.0 / $total)}")
    fi

    echo ""
    echo "==================================================================="
    echo "Rollback Test Results Summary"
    echo "==================================================================="
    echo "Total Tests: $total"
    echo -e "Successful: ${GREEN}$successful${NC}"
    echo -e "Failed: ${RED}$failed${NC}"
    echo "Success Rate: $success_rate%"
    echo "Results saved to: $RESULTS_FILE"
    echo "==================================================================="

    # Cleanup temp file
    rm -f "$RESULTS_FILE.tmp"

    # Check success criteria (100% for rollback)
    if [ $failed -eq 0 ]; then
        echo -e "${GREEN}✓ All rollback tests PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ Some rollback tests FAILED${NC}"
        return 1
    fi
}

# Main test execution
main() {
    # Initialize temp results file
    > "$RESULTS_FILE.tmp"

    # Get agent
    get_agent

    # Get platform
    local platform=$(get_agent_platform)
    echo "Agent platform: $platform"
    echo ""

    # Get test packages
    read -ra PACKAGES <<< "$(get_rollback_test_packages "$platform")"

    if [ ${#PACKAGES[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠ No rollback-capable packages for platform: $platform${NC}"
        echo "Platform may not support rollback or test packages not defined"
        exit 0
    fi

    echo "Test packages: ${PACKAGES[*]}"
    echo "Running ${#PACKAGES[@]} rollback tests..."
    echo ""

    # Run rollback tests for each package
    for i in "${!PACKAGES[@]}"; do
        local package="${PACKAGES[$i]}"
        test_rollback_scenario "$package" "Rollback Test $((i+1))" "$platform"
    done

    # Generate and display results
    generate_results
}

# Run main function
main
