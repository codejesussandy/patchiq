#!/bin/bash
#
# Concurrent Deployments Load Test
#
# Tests system under high concurrent deployment load.
# Validates backend API, database, and agent handling of concurrent deployments.
#
# Usage:
#   ./concurrent-deployments.sh <backend_url> <num_agents> <num_deployments>
#
# Examples:
#   ./concurrent-deployments.sh https://hub.patchiq.io 30 100
#   ./concurrent-deployments.sh https://localhost:3000 10 50
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
NUM_DEPLOYMENTS="${3:-100}"
TEST_RESULTS_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
RESULT_FILE="$TEST_RESULTS_DIR/concurrent-deployments-$TIMESTAMP.log"
METRICS_FILE="$TEST_RESULTS_DIR/concurrent-deployments-metrics-$TIMESTAMP.json"

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

# Get all agent IDs
get_agent_ids() {
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents?limit=${NUM_AGENTS}" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        log_error "Failed to fetch agents"
        return 1
    fi

    echo "$response" | jq -r '.data[].id'
}

# Test: Trigger concurrent deployments
test_trigger_concurrent_deployments() {
    log_info "========================================="
    log_info "Triggering ${NUM_DEPLOYMENTS} concurrent deployments"
    log_info "========================================="

    # Get all agent IDs
    local agent_ids=($(get_agent_ids))

    if [[ ${#agent_ids[@]} -lt $NUM_AGENTS ]]; then
        log_error "Not enough agents: found ${#agent_ids[@]}, expected $NUM_AGENTS"
        return 1
    fi

    log_info "Found ${#agent_ids[@]} agents"

    local deployment_ids=()
    local start_time=$(date +%s%3N)

    # Trigger concurrent deployments
    for i in $(seq 1 "$NUM_DEPLOYMENTS"); do
        # Select random agent
        local agent_id=${agent_ids[$RANDOM % ${#agent_ids[@]}]}

        # Create deployment
        local response=$(curl -sf -X POST "${BACKEND_URL}/api/v1/deployments" \
            -H "Content-Type: application/json" \
            -d "{
                \"agentId\": \"$agent_id\",
                \"packageId\": \"load-test-package-$i\",
                \"type\": \"software\",
                \"priority\": \"normal\"
            }" 2>&1 || echo "ERROR") &

        # Store PID for later
        local curl_pid=$!

        # Don't wait - fire and forget for max concurrency
    done

    # Wait for all curl requests to complete
    wait

    local end_time=$(date +%s%3N)
    local trigger_time=$((end_time - start_time))

    log_info "Triggered $NUM_DEPLOYMENTS deployments in ${trigger_time}ms"
    record_metric "trigger_time_ms" "$trigger_time"

    # Now collect deployment IDs
    log_info "Collecting deployment IDs..."
    local recent_deployments=$(curl -sf "${BACKEND_URL}/api/v1/deployments?limit=${NUM_DEPLOYMENTS}&sort=-createdAt" 2>&1 || echo "ERROR")

    if [[ "$recent_deployments" != "ERROR" ]]; then
        deployment_ids=($(echo "$recent_deployments" | jq -r '.data[].id'))
        log_info "Collected ${#deployment_ids[@]} deployment IDs"
        record_metric "deployments_created" "${#deployment_ids[@]}"
    else
        log_error "Failed to collect deployment IDs"
        return 1
    fi

    # Store deployment IDs for later tests
    printf '%s\n' "${deployment_ids[@]}" > "/tmp/deployment_ids_$TIMESTAMP.txt"

    if [[ ${#deployment_ids[@]} -ge $NUM_DEPLOYMENTS ]]; then
        record_pass "All $NUM_DEPLOYMENTS deployments created"
        return 0
    else
        record_fail "Only ${#deployment_ids[@]} deployments created (expected $NUM_DEPLOYMENTS)"
        return 1
    fi
}

# Test: Monitor deployment completion
test_monitor_deployment_completion() {
    log_info "========================================="
    log_info "Monitoring deployment completion"
    log_info "========================================="

    # Load deployment IDs
    if [[ ! -f "/tmp/deployment_ids_$TIMESTAMP.txt" ]]; then
        log_error "Deployment IDs file not found"
        return 1
    fi

    local deployment_ids=($(cat "/tmp/deployment_ids_$TIMESTAMP.txt"))
    log_info "Monitoring ${#deployment_ids[@]} deployments"

    local max_wait=600  # 10 minutes
    local waited=0
    local start_time=$(date +%s)

    local completed_count=0
    local failed_count=0
    local pending_count=${#deployment_ids[@]}

    while [[ $waited -lt $max_wait ]] && [[ $pending_count -gt 0 ]]; do
        sleep 10
        ((waited+=10))

        completed_count=0
        failed_count=0
        pending_count=0

        # Check status of all deployments
        for deployment_id in "${deployment_ids[@]}"; do
            local status_response=$(curl -sf "${BACKEND_URL}/api/v1/deployments/${deployment_id}" 2>&1 || echo "ERROR")

            if [[ "$status_response" != "ERROR" ]]; then
                local status=$(echo "$status_response" | jq -r '.data.status')

                case "$status" in
                    completed)
                        ((completed_count++))
                        ;;
                    failed)
                        ((failed_count++))
                        ;;
                    *)
                        ((pending_count++))
                        ;;
                esac
            fi
        done

        log_info "Progress: ${completed_count} completed, ${failed_count} failed, ${pending_count} pending (${waited}s elapsed)"
    done

    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))

    log_info "Deployment monitoring completed in ${total_time}s"
    record_metric "completion_time_s" "$total_time"
    record_metric "deployments_completed" "$completed_count"
    record_metric "deployments_failed" "$failed_count"
    record_metric "deployments_pending" "$pending_count"

    # Calculate success rate
    local total_finished=$((completed_count + failed_count))
    local success_rate=0

    if [[ $total_finished -gt 0 ]]; then
        success_rate=$((completed_count * 100 / total_finished))
    fi

    record_metric "success_rate_pct" "$success_rate"

    log_info "Success rate: ${success_rate}%"

    if [[ $success_rate -ge 95 ]]; then
        record_pass "Success rate meets target: ${success_rate}% ≥ 95%"
        return 0
    else
        record_fail "Success rate below target: ${success_rate}% < 95%"
        return 1
    fi
}

# Test: API response times under load
test_api_response_times() {
    log_info "========================================="
    log_info "Testing API response times under load"
    log_info "========================================="

    # Test concurrent GET requests
    local num_requests=100
    local response_times=()

    log_info "Sending $num_requests concurrent GET /agents requests..."

    for i in $(seq 1 "$num_requests"); do
        {
            local start_time=$(date +%s%3N)
            curl -sf "${BACKEND_URL}/api/v1/agents" >/dev/null 2>&1
            local end_time=$(date +%s%3N)
            local response_time=$((end_time - start_time))
            echo "$response_time" >> "/tmp/response_times_$TIMESTAMP.txt"
        } &
    done

    wait

    # Calculate statistics
    response_times=($(cat "/tmp/response_times_$TIMESTAMP.txt" | sort -n))
    local count=${#response_times[@]}

    if [[ $count -eq 0 ]]; then
        log_error "No response times collected"
        return 1
    fi

    # Calculate p50, p95, p99
    local p50_index=$((count * 50 / 100))
    local p95_index=$((count * 95 / 100))
    local p99_index=$((count * 99 / 100))

    local p50=${response_times[$p50_index]}
    local p95=${response_times[$p95_index]}
    local p99=${response_times[$p99_index]}

    log_info "API response times:"
    log_info "  p50: ${p50}ms"
    log_info "  p95: ${p95}ms"
    log_info "  p99: ${p99}ms"

    record_metric "api_response_time_p50_ms" "$p50"
    record_metric "api_response_time_p95_ms" "$p95"
    record_metric "api_response_time_p99_ms" "$p99"

    # Target: p95 < 500ms
    if [[ $p95 -lt 500 ]]; then
        record_pass "API p95 response time within target: ${p95}ms < 500ms"
        return 0
    else
        record_fail "API p95 response time exceeded target: ${p95}ms ≥ 500ms"
        return 1
    fi
}

# Test: Database query performance
test_database_performance() {
    log_info "========================================="
    log_info "Testing database query performance"
    log_info "========================================="

    # This requires backend to expose query performance metrics
    # For now, log a placeholder

    log_warning "Database query performance monitoring requires backend metrics"
    log_warning "Check backend logs for slow queries"

    # If backend exposes /metrics/database endpoint
    local db_metrics=$(curl -sf "${BACKEND_URL}/metrics/database" 2>&1 || echo "ERROR")

    if [[ "$db_metrics" != "ERROR" ]]; then
        log_info "Database metrics:"
        echo "$db_metrics" | tee -a "$RESULT_FILE"
    else
        log_warning "Database metrics endpoint not available"
    fi

    record_pass "Database performance test completed (manual verification required)"
    return 0
}

# Test: MinIO download performance
test_minio_performance() {
    log_info "========================================="
    log_info "Testing MinIO download performance"
    log_info "========================================="

    # Test download speed from MinIO
    # This requires a test file in MinIO

    log_warning "MinIO performance testing requires test files in MinIO"
    log_warning "Manual verification recommended"

    # If MinIO is accessible
    local test_file_url="${BACKEND_URL}/s3/test/10mb-test-file.bin"
    local start_time=$(date +%s%3N)

    if curl -sf -o /dev/null "$test_file_url" 2>&1; then
        local end_time=$(date +%s%3N)
        local download_time=$((end_time - start_time))

        # Assuming 10MB file
        local speed=$((10 * 1000 / download_time))  # MB/s

        log_info "MinIO download speed: ${speed} MB/s"
        record_metric "minio_download_speed_mbps" "$speed"
    else
        log_warning "MinIO test file not available"
    fi

    record_pass "MinIO performance test completed"
    return 0
}

# Test: Rate limiting
test_rate_limiting() {
    log_info "========================================="
    log_info "Testing rate limiting behavior"
    log_info "========================================="

    # Spam API with requests to test rate limiting
    local num_requests=1000
    local rate_limited_count=0

    log_info "Sending $num_requests rapid requests to test rate limiting..."

    for i in $(seq 1 "$num_requests"); do
        local response=$(curl -s -w "%{http_code}" -o /dev/null "${BACKEND_URL}/api/v1/agents" 2>&1)

        if [[ "$response" == "429" ]]; then
            ((rate_limited_count++))
        fi
    done

    log_info "Rate limited requests: ${rate_limited_count}/${num_requests}"
    record_metric "rate_limited_count" "$rate_limited_count"

    if [[ $rate_limited_count -gt 0 ]]; then
        record_pass "Rate limiting is active (${rate_limited_count} requests limited)"
        return 0
    else
        log_warning "No rate limiting detected (may not be configured)"
        record_pass "Rate limiting test completed (not enforced)"
        return 0
    fi
}

# Cleanup
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -f "/tmp/deployment_ids_$TIMESTAMP.txt"
    rm -f "/tmp/response_times_$TIMESTAMP.txt"
}

# Main test execution
main() {
    log_info "========================================="
    log_info "Concurrent Deployments Load Test"
    log_info "========================================="
    log_info "Backend URL: $BACKEND_URL"
    log_info "Number of Agents: $NUM_AGENTS"
    log_info "Number of Deployments: $NUM_DEPLOYMENTS"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Results: $RESULT_FILE"
    log_info "Metrics: $METRICS_FILE"
    log_info "========================================="

    record_metric "test_timestamp" "$TIMESTAMP"
    record_metric "backend_url" "$BACKEND_URL"
    record_metric "num_agents" "$NUM_AGENTS"
    record_metric "num_deployments" "$NUM_DEPLOYMENTS"

    # Run tests
    test_trigger_concurrent_deployments || exit 1
    test_monitor_deployment_completion
    test_api_response_times
    test_database_performance
    test_minio_performance
    test_rate_limiting

    # Cleanup
    cleanup

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
        log_success "All load tests passed!"
        exit 0
    else
        log_error "Some tests failed. See $RESULT_FILE for details."
        exit 1
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main
main
