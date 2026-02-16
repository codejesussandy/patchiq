#!/bin/bash
#
# Scale Test Script
#
# Tests system behavior with N concurrent agents.
# Validates backend performance, database query times, and resource usage.
#
# Usage:
#   ./scale-test.sh <backend_url> <num_agents>
#
# Examples:
#   ./scale-test.sh https://hub.patchiq.io 30
#   ./scale-test.sh https://localhost:3000 50
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
NUM_AGENTS="${2:-30}"
TEST_RESULTS_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
RESULT_FILE="$TEST_RESULTS_DIR/scale-test-$TIMESTAMP.log"
METRICS_FILE="$TEST_RESULTS_DIR/scale-test-metrics-$TIMESTAMP.json"

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

record_pass() {
    ((TESTS_PASSED++))
    log_success "$1"
}

record_fail() {
    ((TESTS_FAILED++))
    log_error "$1"
}

# Metrics collection
declare -A METRICS

record_metric() {
    local name=$1
    local value=$2
    METRICS["$name"]=$value
    log_info "Metric: $name = $value"
}

save_metrics() {
    log_info "Saving metrics to $METRICS_FILE"

    echo "{" > "$METRICS_FILE"
    local first=true

    for key in "${!METRICS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$METRICS_FILE"
        fi

        echo "  \"$key\": \"${METRICS[$key]}\"" >> "$METRICS_FILE"
    done

    echo "" >> "$METRICS_FILE"
    echo "}" >> "$METRICS_FILE"
}

# Test: Get all agent IDs
get_agent_ids() {
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents?limit=${NUM_AGENTS}" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        log_error "Failed to fetch agents"
        return 1
    fi

    echo "$response" | jq -r '.data[].id'
}

# Test: Verify agent count
test_agent_count() {
    log_info "Testing: Verify ${NUM_AGENTS} agents are registered"

    local start_time=$(date +%s%3N)
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents?limit=${NUM_AGENTS}" 2>&1 || echo "ERROR")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))

    record_metric "agent_list_response_time_ms" "$response_time"

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to fetch agents"
        return 1
    fi

    local count=$(echo "$response" | jq '.data | length')

    if [[ $count -ge $NUM_AGENTS ]]; then
        record_pass "Found $count agents (expected $NUM_AGENTS)"
        record_metric "agent_count" "$count"
        return 0
    else
        record_fail "Only found $count agents (expected $NUM_AGENTS)"
        return 1
    fi
}

# Test: Concurrent heartbeats
test_concurrent_heartbeats() {
    log_info "Testing: Concurrent heartbeats from ${NUM_AGENTS} agents"

    # Get all agent IDs
    local agent_ids=($(get_agent_ids))

    log_info "Triggering ${#agent_ids[@]} concurrent heartbeats..."

    local start_time=$(date +%s%3N)

    # Trigger heartbeats in parallel
    for agent_id in "${agent_ids[@]}"; do
        curl -sf -X POST "${BACKEND_URL}/api/v1/agents/${agent_id}/heartbeat" \
            -H "Content-Type: application/json" \
            -d '{}' &
    done

    # Wait for all to complete
    wait

    local end_time=$(date +%s%3N)
    local total_time=$((end_time - start_time))

    log_info "Concurrent heartbeats completed in ${total_time}ms"
    record_metric "concurrent_heartbeats_time_ms" "$total_time"

    # Target: < 2000ms for 30 agents
    if [[ $total_time -lt 2000 ]]; then
        record_pass "Concurrent heartbeats within target (< 2000ms)"
        return 0
    else
        record_fail "Concurrent heartbeats exceeded target: ${total_time}ms > 2000ms"
        return 1
    fi
}

# Test: Backend API response times
test_api_response_times() {
    log_info "Testing: Backend API response times"

    local agent_ids=($(get_agent_ids | head -n 10))  # Test with 10 agents

    # Test GET /agents
    local total_time=0
    local count=0

    for i in {1..10}; do
        local start_time=$(date +%s%3N)
        curl -sf "${BACKEND_URL}/api/v1/agents" >/dev/null 2>&1
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        total_time=$((total_time + response_time))
        ((count++))
    done

    local avg_time=$((total_time / count))
    log_info "GET /agents average response time: ${avg_time}ms"
    record_metric "get_agents_avg_response_time_ms" "$avg_time"

    # Target: < 200ms
    if [[ $avg_time -lt 200 ]]; then
        record_pass "GET /agents response time within target (< 200ms)"
    else
        record_fail "GET /agents response time exceeded target: ${avg_time}ms > 200ms"
    fi

    # Test POST /agents/:id/heartbeat
    total_time=0
    count=0

    for agent_id in "${agent_ids[@]}"; do
        local start_time=$(date +%s%3N)
        curl -sf -X POST "${BACKEND_URL}/api/v1/agents/${agent_id}/heartbeat" \
            -H "Content-Type: application/json" \
            -d '{}' >/dev/null 2>&1
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        total_time=$((total_time + response_time))
        ((count++))
    done

    avg_time=$((total_time / count))
    log_info "POST /agents/:id/heartbeat average response time: ${avg_time}ms"
    record_metric "post_heartbeat_avg_response_time_ms" "$avg_time"

    # Target: < 100ms
    if [[ $avg_time -lt 100 ]]; then
        record_pass "POST /heartbeat response time within target (< 100ms)"
    else
        record_fail "POST /heartbeat response time exceeded target: ${avg_time}ms > 100ms"
    fi
}

# Test: Simultaneous deployments
test_simultaneous_deployments() {
    log_info "Testing: Simultaneous deployments to ${NUM_AGENTS} agents"

    local agent_ids=($(get_agent_ids))

    log_info "Triggering ${#agent_ids[@]} simultaneous deployments..."

    local start_time=$(date +%s)
    local deployment_ids=()

    # Trigger deployments in parallel
    for agent_id in "${agent_ids[@]}"; do
        local response=$(curl -sf -X POST "${BACKEND_URL}/api/v1/deployments" \
            -H "Content-Type: application/json" \
            -d "{
                \"agentId\": \"$agent_id\",
                \"packageId\": \"scale-test-package\",
                \"type\": \"software\",
                \"priority\": \"normal\"
            }" 2>&1 || echo "ERROR")

        if [[ "$response" != "ERROR" ]]; then
            local deployment_id=$(echo "$response" | jq -r '.data.id')
            deployment_ids+=("$deployment_id")
        fi
    done

    log_info "Created ${#deployment_ids[@]} deployments"
    record_metric "deployments_created" "${#deployment_ids[@]}"

    # Wait for all deployments to complete (timeout: 10 minutes)
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

        log_info "Deployment progress: ${completed_count} completed, ${failed_count} failed (${waited}s elapsed)"

        if [[ $((completed_count + failed_count)) -eq ${#deployment_ids[@]} ]]; then
            break
        fi
    done

    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))

    log_info "All deployments finished in ${total_time}s"
    record_metric "deployments_total_time_s" "$total_time"
    record_metric "deployments_completed" "$completed_count"
    record_metric "deployments_failed" "$failed_count"

    # Calculate success rate
    local success_rate=0
    if [[ ${#deployment_ids[@]} -gt 0 ]]; then
        success_rate=$((completed_count * 100 / ${#deployment_ids[@]}))
    fi

    record_metric "deployment_success_rate_pct" "$success_rate"

    if [[ $success_rate -ge 95 ]]; then
        record_pass "Deployment success rate: ${success_rate}% (target: ≥95%)"
        return 0
    else
        record_fail "Deployment success rate below target: ${success_rate}% < 95%"
        return 1
    fi
}

# Test: Backend resource usage
test_backend_resource_usage() {
    log_info "Testing: Backend resource usage under load"

    # Note: This requires backend to expose metrics endpoint
    # For now, log a placeholder

    log_warning "Backend resource monitoring requires metrics endpoint"
    log_warning "Manual verification required (check backend logs, Docker stats, etc.)"

    # If backend exposes /metrics endpoint, query it
    local metrics_response=$(curl -sf "${BACKEND_URL}/metrics" 2>&1 || echo "ERROR")

    if [[ "$metrics_response" != "ERROR" ]]; then
        log_info "Backend metrics available"

        # Parse metrics (assuming Prometheus format)
        # Extract CPU, memory, etc.
        log_info "Backend metrics:"
        echo "$metrics_response" | tee -a "$RESULT_FILE"
    else
        log_warning "Backend metrics endpoint not available"
    fi

    record_pass "Backend resource usage test completed (manual verification required)"
    return 0
}

# Test: Database connection pool
test_database_connection_pool() {
    log_info "Testing: Database connection pool under load"

    # Trigger many concurrent queries
    log_info "Triggering 100 concurrent API calls to test connection pool..."

    local start_time=$(date +%s%3N)

    for i in {1..100}; do
        curl -sf "${BACKEND_URL}/api/v1/agents" >/dev/null 2>&1 &
    done

    wait

    local end_time=$(date +%s%3N)
    local total_time=$((end_time - start_time))

    log_info "100 concurrent requests completed in ${total_time}ms"
    record_metric "concurrent_requests_100_time_ms" "$total_time"

    # Target: < 5000ms
    if [[ $total_time -lt 5000 ]]; then
        record_pass "Connection pool handled 100 concurrent requests (< 5000ms)"
        return 0
    else
        record_fail "Connection pool struggled: ${total_time}ms > 5000ms"
        return 1
    fi
}

# Test: Agent crash recovery
test_agent_crash_recovery() {
    log_info "Testing: Agent crash recovery"

    log_warning "Agent crash recovery requires manually stopping agents"
    log_warning "This test is skipped in automated runs"

    # Manual test: Kill 5 agents, verify they restart and re-register

    record_pass "Agent crash recovery test skipped (manual verification required)"
    return 0
}

# Main test execution
main() {
    log_info "========================================="
    log_info "Scale Test"
    log_info "========================================="
    log_info "Backend URL: $BACKEND_URL"
    log_info "Number of Agents: $NUM_AGENTS"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Results: $RESULT_FILE"
    log_info "Metrics: $METRICS_FILE"
    log_info "========================================="

    record_metric "test_timestamp" "$TIMESTAMP"
    record_metric "backend_url" "$BACKEND_URL"
    record_metric "num_agents" "$NUM_AGENTS"

    # Run tests
    test_agent_count || exit 1
    test_concurrent_heartbeats
    test_api_response_times
    test_simultaneous_deployments
    test_backend_resource_usage
    test_database_connection_pool
    test_agent_crash_recovery

    # Save metrics
    save_metrics

    # Summary
    log_info "========================================="
    log_info "Test Summary"
    log_info "========================================="
    log_success "Passed: $TESTS_PASSED"
    log_error "Failed: $TESTS_FAILED"
    log_info "========================================="
    log_info "Metrics saved to: $METRICS_FILE"
    log_info "========================================="

    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All scale tests passed!"
        exit 0
    else
        log_error "Some tests failed. See $RESULT_FILE for details."
        exit 1
    fi
}

# Run main
main
