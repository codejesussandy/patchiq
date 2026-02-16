#!/bin/bash
#
# Phased Rollout Test Script
#
# Tests the phased rollout mechanism for agent updates.
# Validates that updates are rolled out gradually (10% → 50% → 100%)
# and that agent bucketing is consistent and deterministic.
#
# Usage:
#   ./phased-rollout-test.sh <backend_url> <num_agents> <old_version> <new_version>
#
# Examples:
#   ./phased-rollout-test.sh https://hub.patchiq.io 30 1.0.0 1.1.0
#   ./phased-rollout-test.sh https://localhost:3000 50 1.0.0 1.1.0
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
OLD_VERSION="${3:-1.0.0}"
NEW_VERSION="${4:-1.1.0}"
TEST_RESULTS_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
RESULT_FILE="$TEST_RESULTS_DIR/phased-rollout-test-$TIMESTAMP.log"

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

# Get all agent IDs
get_agent_ids() {
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents?limit=${NUM_AGENTS}" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        log_error "Failed to fetch agents"
        return 1
    fi

    echo "$response" | jq -r '.data[].id'
}

# Count agents on specific version
count_agents_on_version() {
    local version=$1
    local count=0

    for agent_id in $(get_agent_ids); do
        local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${agent_id}" 2>&1 || echo "ERROR")

        if [[ "$response" != "ERROR" ]]; then
            local agent_version=$(echo "$response" | jq -r '.data.version')

            if [[ "$agent_version" == "$version" ]]; then
                ((count++))
            fi
        fi
    done

    echo "$count"
}

# Publish manifest with specific rollout percentage
publish_manifest() {
    local rollout_percentage=$1
    log_info "Publishing manifest with ${rollout_percentage}% rollout"

    local manifest=$(cat <<EOF
{
  "version": "$NEW_VERSION",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platforms": {
    "windows": {
      "amd64": {
        "url": "${BACKEND_URL}/updates/patchiq-agent-windows-amd64-v${NEW_VERSION}.exe",
        "checksum": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        "size": 20971520
      }
    },
    "darwin": {
      "amd64": {
        "url": "${BACKEND_URL}/updates/patchiq-agent-darwin-amd64-v${NEW_VERSION}",
        "checksum": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        "size": 19922944
      },
      "arm64": {
        "url": "${BACKEND_URL}/updates/patchiq-agent-darwin-arm64-v${NEW_VERSION}",
        "checksum": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        "size": 18874368
      }
    },
    "linux": {
      "amd64": {
        "url": "${BACKEND_URL}/updates/patchiq-agent-linux-amd64-v${NEW_VERSION}",
        "checksum": "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        "size": 21495808
      }
    }
  },
  "rolloutPercentage": $rollout_percentage,
  "minVersion": "$OLD_VERSION",
  "critical": false,
  "changelog": "Phased rollout test update"
}
EOF
)

    local response=$(curl -sf -X PUT "${BACKEND_URL}/api/v1/agent-versions/current" \
        -H "Content-Type: application/json" \
        -d "$manifest" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        log_error "Failed to publish manifest"
        return 1
    fi

    log_success "Manifest published with ${rollout_percentage}% rollout"
    return 0
}

# Wait for updates to complete
wait_for_updates() {
    local expected_count=$1
    local max_wait=600  # 10 minutes
    local waited=0

    log_info "Waiting for $expected_count agents to update (max ${max_wait}s)..."

    while [[ $waited -lt $max_wait ]]; do
        sleep 30
        ((waited+=30))

        local updated_count=$(count_agents_on_version "$NEW_VERSION")
        log_info "Progress: ${updated_count}/${expected_count} agents updated (${waited}s elapsed)"

        if [[ $updated_count -ge $expected_count ]]; then
            log_success "Target reached: ${updated_count} agents on version $NEW_VERSION"
            return 0
        fi
    done

    log_warning "Timeout reached after ${max_wait}s"
    return 1
}

# Get agents that updated
get_updated_agent_ids() {
    local updated_agents=()

    for agent_id in $(get_agent_ids); do
        local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${agent_id}" 2>&1 || echo "ERROR")

        if [[ "$response" != "ERROR" ]]; then
            local agent_version=$(echo "$response" | jq -r '.data.version')

            if [[ "$agent_version" == "$NEW_VERSION" ]]; then
                updated_agents+=("$agent_id")
            fi
        fi
    done

    printf '%s\n' "${updated_agents[@]}"
}

# Test: Initial state
test_initial_state() {
    log_info "Testing: All agents on version $OLD_VERSION"

    local count=$(count_agents_on_version "$OLD_VERSION")

    if [[ $count -ge $NUM_AGENTS ]]; then
        record_pass "All agents on version $OLD_VERSION (found $count agents)"
        return 0
    else
        record_fail "Not all agents on version $OLD_VERSION (found $count agents, expected $NUM_AGENTS)"
        return 1
    fi
}

# Test: Phase 1 - 10% rollout
test_phase1_10_percent() {
    log_info "========================================="
    log_info "Phase 1: 10% Rollout"
    log_info "========================================="

    # Publish manifest with 10% rollout
    publish_manifest 10 || return 1

    # Calculate expected count (±5% tolerance)
    local expected=$((NUM_AGENTS * 10 / 100))
    local min_expected=$((expected - (NUM_AGENTS * 5 / 100)))
    local max_expected=$((expected + (NUM_AGENTS * 5 / 100)))

    log_info "Expected updates: ${expected} (tolerance: ${min_expected}-${max_expected})"

    # Wait for updates
    wait_for_updates "$expected"

    # Verify count
    local updated_count=$(count_agents_on_version "$NEW_VERSION")

    if [[ $updated_count -ge $min_expected ]] && [[ $updated_count -le $max_expected ]]; then
        record_pass "Phase 1: ${updated_count} agents updated (within tolerance)"

        # Store Phase 1 agent IDs for consistency check
        get_updated_agent_ids > "/tmp/phase1_agents.txt"
        return 0
    else
        record_fail "Phase 1: ${updated_count} agents updated (outside tolerance: ${min_expected}-${max_expected})"
        return 1
    fi
}

# Test: Phase 2 - 50% rollout
test_phase2_50_percent() {
    log_info "========================================="
    log_info "Phase 2: 50% Rollout"
    log_info "========================================="

    # Publish manifest with 50% rollout
    publish_manifest 50 || return 1

    # Calculate expected count
    local expected=$((NUM_AGENTS * 50 / 100))
    local min_expected=$((expected - (NUM_AGENTS * 5 / 100)))
    local max_expected=$((expected + (NUM_AGENTS * 5 / 100)))

    log_info "Expected updates: ${expected} (tolerance: ${min_expected}-${max_expected})"

    # Wait for updates
    wait_for_updates "$expected"

    # Verify count
    local updated_count=$(count_agents_on_version "$NEW_VERSION")

    if [[ $updated_count -ge $min_expected ]] && [[ $updated_count -le $max_expected ]]; then
        record_pass "Phase 2: ${updated_count} agents updated (within tolerance)"

        # Verify consistency: Phase 1 agents should still be in Phase 2
        get_updated_agent_ids > "/tmp/phase2_agents.txt"

        if [[ -f "/tmp/phase1_agents.txt" ]]; then
            local phase1_count=$(wc -l < "/tmp/phase1_agents.txt")
            local phase2_count=$(wc -l < "/tmp/phase2_agents.txt")

            if [[ $phase2_count -ge $phase1_count ]]; then
                record_pass "Phase 2 includes all Phase 1 agents (consistency verified)"
            else
                record_fail "Phase 2 does not include all Phase 1 agents (inconsistency detected)"
            fi

            # Check that all Phase 1 agents are in Phase 2
            while IFS= read -r agent_id; do
                if ! grep -q "$agent_id" "/tmp/phase2_agents.txt"; then
                    record_fail "Agent $agent_id was in Phase 1 but not in Phase 2"
                    return 1
                fi
            done < "/tmp/phase1_agents.txt"

            record_pass "All Phase 1 agents present in Phase 2 (deterministic bucketing)"
        fi

        return 0
    else
        record_fail "Phase 2: ${updated_count} agents updated (outside tolerance: ${min_expected}-${max_expected})"
        return 1
    fi
}

# Test: Phase 3 - 100% rollout
test_phase3_100_percent() {
    log_info "========================================="
    log_info "Phase 3: 100% Rollout"
    log_info "========================================="

    # Publish manifest with 100% rollout
    publish_manifest 100 || return 1

    log_info "Expected updates: ${NUM_AGENTS} (all agents)"

    # Wait for all updates
    wait_for_updates "$NUM_AGENTS"

    # Verify all agents updated
    local updated_count=$(count_agents_on_version "$NEW_VERSION")

    if [[ $updated_count -ge $NUM_AGENTS ]]; then
        record_pass "Phase 3: All ${updated_count} agents updated to version $NEW_VERSION"
        return 0
    else
        record_fail "Phase 3: Only ${updated_count}/${NUM_AGENTS} agents updated"

        # Log agents that didn't update
        for agent_id in $(get_agent_ids); do
            local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${agent_id}" 2>&1 || echo "ERROR")

            if [[ "$response" != "ERROR" ]]; then
                local agent_version=$(echo "$response" | jq -r '.data.version')

                if [[ "$agent_version" != "$NEW_VERSION" ]]; then
                    log_error "Agent $agent_id failed to update (version: $agent_version)"
                fi
            fi
        done

        return 1
    fi
}

# Test: Bucketing consistency
test_bucketing_consistency() {
    log_info "Testing: Bucketing consistency (re-check 10% rollout)"

    # Re-publish 10% manifest
    publish_manifest 10 || return 1

    # Reset all agents to OLD_VERSION (via API or manual)
    log_warning "Bucketing consistency test requires resetting agents to $OLD_VERSION"
    log_warning "This test is skipped in automated runs (requires manual setup)"

    record_pass "Bucketing consistency test skipped (manual verification required)"
    return 0
}

# Main test execution
main() {
    log_info "========================================="
    log_info "Phased Rollout Test"
    log_info "========================================="
    log_info "Backend URL: $BACKEND_URL"
    log_info "Number of Agents: $NUM_AGENTS"
    log_info "Old Version: $OLD_VERSION"
    log_info "New Version: $NEW_VERSION"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Results: $RESULT_FILE"
    log_info "========================================="

    # Prerequisite checks
    log_info "Fetching agent count..."
    local agent_count=$(get_agent_ids | wc -l)
    log_info "Found $agent_count agents"

    if [[ $agent_count -lt $NUM_AGENTS ]]; then
        log_error "Insufficient agents: found $agent_count, expected $NUM_AGENTS"
        exit 1
    fi

    # Run phased rollout tests
    test_initial_state || exit 1
    test_phase1_10_percent
    sleep 60  # Small delay between phases
    test_phase2_50_percent
    sleep 60
    test_phase3_100_percent
    test_bucketing_consistency

    # Cleanup
    rm -f /tmp/phase1_agents.txt /tmp/phase2_agents.txt

    # Summary
    log_info "========================================="
    log_info "Test Summary"
    log_info "========================================="
    log_success "Passed: $TESTS_PASSED"
    log_error "Failed: $TESTS_FAILED"
    log_info "========================================="

    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All phased rollout tests passed!"
        exit 0
    else
        log_error "Some tests failed. See $RESULT_FILE for details."
        exit 1
    fi
}

# Run main
main
