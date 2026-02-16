#!/bin/bash
#
# Deployment Test Script
#
# Tests software and patch deployment functionality on agents.
# Validates hub-centric deployments, rollback, and failure handling.
#
# Usage:
#   ./deployment-test.sh <backend_url> <agent_id> [num_deployments]
#
# Examples:
#   ./deployment-test.sh https://hub.patchiq.io abc-123-def 10
#   ./deployment-test.sh https://localhost:3000 agent-001 5
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${1:-https://localhost:3000}"
AGENT_ID="${2:-}"
NUM_DEPLOYMENTS="${3:-5}"
TEST_RESULTS_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
RESULT_FILE="$TEST_RESULTS_DIR/deployment-test-$TIMESTAMP.log"

# Validate inputs
if [[ -z "$AGENT_ID" ]]; then
    echo "Usage: $0 <backend_url> <agent_id> [num_deployments]"
    exit 1
fi

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"

# Logging functions
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$RESULT_FILE"
}

log_info() {
    log "INFO" "${BLUE}$*${NC}"
}

log_success() {
    log "SUCCESS" "${GREEN}✓ $*${NC}"
}

log_error() {
    log "ERROR" "${RED}✗ $*${NC}"
}

log_warning() {
    log "WARNING" "${YELLOW}⚠ $*${NC}"
}

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
DEPLOYMENTS_SUCCESS=0
DEPLOYMENTS_FAILED=0

record_pass() {
    ((TESTS_PASSED++))
    log_success "$1"
}

record_fail() {
    ((TESTS_FAILED++))
    log_error "$1"
}

# Test: Agent exists
test_agent_exists() {
    log_info "Testing: Agent exists in backend"

    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Agent not found: $AGENT_ID"
        return 1
    fi

    if echo "$response" | jq -e '.data.id' >/dev/null 2>&1; then
        local hostname=$(echo "$response" | jq -r '.data.hostname')
        record_pass "Agent found: $hostname ($AGENT_ID)"
        return 0
    else
        record_fail "Invalid agent response"
        return 1
    fi
}

# Test: Deploy software package
test_software_deployment() {
    local package_id="$1"
    log_info "Testing: Software deployment - Package: $package_id"

    # Create deployment
    local response=$(curl -sf -X POST "${BACKEND_URL}/api/v1/deployments" \
        -H "Content-Type: application/json" \
        -d "{
            \"agentId\": \"$AGENT_ID\",
            \"packageId\": \"$package_id\",
            \"type\": \"software\",
            \"priority\": \"normal\"
        }" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to create deployment for $package_id"
        ((DEPLOYMENTS_FAILED++))
        return 1
    fi

    local deployment_id=$(echo "$response" | jq -r '.data.id')
    log_info "Deployment created: $deployment_id"

    # Wait for deployment to complete (timeout: 300 seconds)
    local max_wait=300
    local waited=0
    local status=""

    while [[ $waited -lt $max_wait ]]; do
        sleep 5
        ((waited+=5))

        local status_response=$(curl -sf "${BACKEND_URL}/api/v1/deployments/${deployment_id}" 2>&1 || echo "ERROR")

        if [[ "$status_response" != "ERROR" ]]; then
            status=$(echo "$status_response" | jq -r '.data.status')
            log_info "Deployment status: $status (${waited}s elapsed)"

            if [[ "$status" == "completed" ]]; then
                record_pass "Deployment completed: $package_id"
                ((DEPLOYMENTS_SUCCESS++))
                return 0
            elif [[ "$status" == "failed" ]]; then
                record_fail "Deployment failed: $package_id"
                log_error "Error: $(echo "$status_response" | jq -r '.data.error')"
                ((DEPLOYMENTS_FAILED++))
                return 1
            fi
        fi
    done

    record_fail "Deployment timeout: $package_id"
    ((DEPLOYMENTS_FAILED++))
    return 1
}

# Test: Deploy script bundle
test_script_deployment() {
    local bundle_name="$1"
    log_info "Testing: Script bundle deployment - Bundle: $bundle_name"

    # Create script deployment
    local response=$(curl -sf -X POST "${BACKEND_URL}/api/v1/deployments" \
        -H "Content-Type: application/json" \
        -d "{
            \"agentId\": \"$AGENT_ID\",
            \"scriptBundle\": \"$bundle_name\",
            \"type\": \"script\",
            \"priority\": \"normal\"
        }" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to create script deployment for $bundle_name"
        ((DEPLOYMENTS_FAILED++))
        return 1
    fi

    local deployment_id=$(echo "$response" | jq -r '.data.id')
    log_info "Script deployment created: $deployment_id"

    # Wait for completion
    local max_wait=180
    local waited=0

    while [[ $waited -lt $max_wait ]]; do
        sleep 5
        ((waited+=5))

        local status_response=$(curl -sf "${BACKEND_URL}/api/v1/deployments/${deployment_id}" 2>&1 || echo "ERROR")

        if [[ "$status_response" != "ERROR" ]]; then
            local status=$(echo "$status_response" | jq -r '.data.status')
            log_info "Script deployment status: $status (${waited}s elapsed)"

            if [[ "$status" == "completed" ]]; then
                record_pass "Script deployment completed: $bundle_name"
                ((DEPLOYMENTS_SUCCESS++))
                return 0
            elif [[ "$status" == "failed" ]]; then
                record_fail "Script deployment failed: $bundle_name"
                ((DEPLOYMENTS_FAILED++))
                return 1
            fi
        fi
    done

    record_fail "Script deployment timeout: $bundle_name"
    ((DEPLOYMENTS_FAILED++))
    return 1
}

# Test: Concurrent deployments
test_concurrent_deployments() {
    local num_concurrent="$1"
    log_info "Testing: Concurrent deployments - Count: $num_concurrent"

    local deployment_ids=()

    # Trigger concurrent deployments
    for i in $(seq 1 "$num_concurrent"); do
        local package_id="test-package-$i"

        local response=$(curl -sf -X POST "${BACKEND_URL}/api/v1/deployments" \
            -H "Content-Type: application/json" \
            -d "{
                \"agentId\": \"$AGENT_ID\",
                \"packageId\": \"$package_id\",
                \"type\": \"software\",
                \"priority\": \"normal\"
            }" 2>&1 || echo "ERROR")

        if [[ "$response" != "ERROR" ]]; then
            local deployment_id=$(echo "$response" | jq -r '.data.id')
            deployment_ids+=("$deployment_id")
            log_info "Created concurrent deployment $i: $deployment_id"
        fi
    done

    log_info "Triggered ${#deployment_ids[@]} concurrent deployments"

    # Wait for all to complete
    local all_completed=false
    local max_wait=600
    local waited=0

    while [[ $waited -lt $max_wait ]]; do
        sleep 10
        ((waited+=10))

        local completed_count=0
        local failed_count=0

        for deployment_id in "${deployment_ids[@]}"; do
            local status_response=$(curl -sf "${BACKEND_URL}/api/v1/deployments/${deployment_id}" 2>&1 || echo "ERROR")

            if [[ "$status_response" != "ERROR" ]]; then
                local status=$(echo "$status_response" | jq -r '.data.status')

                if [[ "$status" == "completed" ]]; then
                    ((completed_count++))
                elif [[ "$status" == "failed" ]]; then
                    ((failed_count++))
                fi
            fi
        done

        log_info "Concurrent progress: ${completed_count} completed, ${failed_count} failed (${waited}s elapsed)"

        if [[ $((completed_count + failed_count)) -eq ${#deployment_ids[@]} ]]; then
            all_completed=true
            break
        fi
    done

    if [[ "$all_completed" == "true" ]]; then
        record_pass "All concurrent deployments finished"
        log_info "Success: $completed_count, Failed: $failed_count"
        return 0
    else
        record_fail "Concurrent deployments timed out"
        return 1
    fi
}

# Test: Deployment rollback
test_deployment_rollback() {
    log_info "Testing: Deployment rollback"

    # Create a deployment that will fail (intentionally)
    local response=$(curl -sf -X POST "${BACKEND_URL}/api/v1/deployments" \
        -H "Content-Type: application/json" \
        -d "{
            \"agentId\": \"$AGENT_ID\",
            \"packageId\": \"invalid-package-for-rollback-test\",
            \"type\": \"software\",
            \"priority\": \"normal\"
        }" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to create test deployment for rollback"
        return 1
    fi

    local deployment_id=$(echo "$response" | jq -r '.data.id')
    log_info "Test deployment created: $deployment_id"

    # Wait for failure
    sleep 30

    # Trigger rollback
    log_info "Triggering rollback for deployment: $deployment_id"
    local rollback_response=$(curl -sf -X POST "${BACKEND_URL}/api/v1/deployments/${deployment_id}/rollback" 2>&1 || echo "ERROR")

    if [[ "$rollback_response" == "ERROR" ]]; then
        record_fail "Failed to trigger rollback"
        return 1
    fi

    # Wait for rollback to complete
    sleep 30

    local status_response=$(curl -sf "${BACKEND_URL}/api/v1/deployments/${deployment_id}" 2>&1 || echo "ERROR")

    if [[ "$status_response" != "ERROR" ]]; then
        local status=$(echo "$status_response" | jq -r '.data.status')

        if [[ "$status" == "rolled_back" ]]; then
            record_pass "Deployment rolled back successfully"
            return 0
        else
            record_fail "Rollback failed - Status: $status"
            return 1
        fi
    fi

    record_fail "Could not verify rollback status"
    return 1
}

# Main test execution
main() {
    log_info "========================================="
    log_info "Deployment Test"
    log_info "========================================="
    log_info "Backend URL: $BACKEND_URL"
    log_info "Agent ID: $AGENT_ID"
    log_info "Number of deployments: $NUM_DEPLOYMENTS"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Results: $RESULT_FILE"
    log_info "========================================="

    # Prerequisite tests
    test_agent_exists || exit 1

    # Software deployment tests
    for i in $(seq 1 "$NUM_DEPLOYMENTS"); do
        test_software_deployment "test-package-$i"
        sleep 2  # Small delay between deployments
    done

    # Script deployment tests
    test_script_deployment "test-bundle-1"
    test_script_deployment "test-bundle-2"

    # Concurrent deployment test
    test_concurrent_deployments 10

    # Rollback test
    test_deployment_rollback

    # Summary
    log_info "========================================="
    log_info "Test Summary"
    log_info "========================================="
    log_success "Tests Passed: $TESTS_PASSED"
    log_error "Tests Failed: $TESTS_FAILED"
    log_info "========================================="
    log_success "Deployments Successful: $DEPLOYMENTS_SUCCESS"
    log_error "Deployments Failed: $DEPLOYMENTS_FAILED"

    local success_rate=0
    if [[ $((DEPLOYMENTS_SUCCESS + DEPLOYMENTS_FAILED)) -gt 0 ]]; then
        success_rate=$((DEPLOYMENTS_SUCCESS * 100 / (DEPLOYMENTS_SUCCESS + DEPLOYMENTS_FAILED)))
    fi

    log_info "Deployment Success Rate: ${success_rate}%"
    log_info "========================================="

    if [[ $TESTS_FAILED -eq 0 ]] && [[ $success_rate -ge 95 ]]; then
        log_success "All tests passed! Success rate: ${success_rate}%"
        exit 0
    else
        log_error "Some tests failed or success rate below 95%. See $RESULT_FILE for details."
        exit 1
    fi
}

# Run main
main
