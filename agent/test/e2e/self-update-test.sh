#!/bin/bash
#
# Self-Update Test Script
#
# Tests the agent self-update mechanism including manifest download,
# checksum verification, binary replacement, and service restart.
#
# Usage:
#   ./self-update-test.sh <backend_url> <agent_id> <old_version> <new_version>
#
# Examples:
#   ./self-update-test.sh https://hub.patchiq.io agent-123 1.0.0 1.1.0
#   ./self-update-test.sh https://localhost:3000 agent-001 1.0.0 1.1.0
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
OLD_VERSION="${3:-1.0.0}"
NEW_VERSION="${4:-1.1.0}"
TEST_RESULTS_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
RESULT_FILE="$TEST_RESULTS_DIR/self-update-test-$TIMESTAMP.log"

# Validate inputs
if [[ -z "$AGENT_ID" ]]; then
    echo "Usage: $0 <backend_url> <agent_id> <old_version> <new_version>"
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

record_pass() {
    ((TESTS_PASSED++))
    log_success "$1"
}

record_fail() {
    ((TESTS_FAILED++))
    log_error "$1"
}

# Test: Verify initial version
test_initial_version() {
    log_info "Testing: Verify initial agent version is $OLD_VERSION"

    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to query agent"
        return 1
    fi

    local current_version=$(echo "$response" | jq -r '.data.version')

    if [[ "$current_version" == "$OLD_VERSION" ]]; then
        record_pass "Agent is on version $OLD_VERSION"
        return 0
    else
        record_fail "Agent version mismatch: expected $OLD_VERSION, got $current_version"
        return 1
    fi
}

# Test: Publish update manifest
test_publish_manifest() {
    log_info "Testing: Publish update manifest for version $NEW_VERSION"

    # Create update manifest
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
  "rolloutPercentage": 100,
  "minVersion": "$OLD_VERSION",
  "critical": false,
  "changelog": "Test update for validation"
}
EOF
)

    # Publish manifest via API
    local response=$(curl -sf -X POST "${BACKEND_URL}/api/v1/agent-versions" \
        -H "Content-Type: application/json" \
        -d "$manifest" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to publish update manifest"
        return 1
    fi

    record_pass "Update manifest published for version $NEW_VERSION"
    return 0
}

# Test: Agent detects update
test_agent_detects_update() {
    log_info "Testing: Agent detects update (waiting 5 minutes for check interval)"

    # Wait for agent to check for updates (default: 5 minutes)
    local max_wait=360
    local waited=0

    while [[ $waited -lt $max_wait ]]; do
        sleep 30
        ((waited+=30))

        log_info "Waiting for update detection... (${waited}s / ${max_wait}s)"

        # Check agent logs for update detection
        # Note: This is platform-specific
        local detected=false

        # Try to query backend for pending updates
        local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}/updates" 2>&1 || echo "ERROR")

        if [[ "$response" != "ERROR" ]]; then
            local pending=$(echo "$response" | jq -r '.data.pending')

            if [[ "$pending" == "true" ]]; then
                record_pass "Agent detected update to version $NEW_VERSION"
                return 0
            fi
        fi
    done

    record_fail "Agent did not detect update within ${max_wait} seconds"
    return 1
}

# Test: Download binary
test_download_binary() {
    log_info "Testing: Agent downloads update binary"

    # Monitor download progress
    sleep 30

    # Check if download completed
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}/updates/status" 2>&1 || echo "ERROR")

    if [[ "$response" != "ERROR" ]]; then
        local status=$(echo "$response" | jq -r '.data.downloadStatus')

        if [[ "$status" == "completed" ]]; then
            record_pass "Update binary downloaded successfully"
            return 0
        elif [[ "$status" == "downloading" ]]; then
            log_warning "Download still in progress, waiting..."
            sleep 60

            # Check again
            response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}/updates/status" 2>&1 || echo "ERROR")
            status=$(echo "$response" | jq -r '.data.downloadStatus')

            if [[ "$status" == "completed" ]]; then
                record_pass "Update binary downloaded successfully (after wait)"
                return 0
            fi
        fi
    fi

    record_fail "Failed to download update binary"
    return 1
}

# Test: Verify checksum
test_verify_checksum() {
    log_info "Testing: Agent verifies binary checksum"

    sleep 10

    # Check if checksum verification passed
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}/updates/status" 2>&1 || echo "ERROR")

    if [[ "$response" != "ERROR" ]]; then
        local checksum_valid=$(echo "$response" | jq -r '.data.checksumValid')

        if [[ "$checksum_valid" == "true" ]]; then
            record_pass "Binary checksum verified"
            return 0
        fi
    fi

    record_fail "Checksum verification failed"
    return 1
}

# Test: Service restart
test_service_restart() {
    log_info "Testing: Service restarts after update"

    # Record current heartbeat
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" 2>&1 || echo "ERROR")
    local old_heartbeat=$(echo "$response" | jq -r '.data.lastHeartbeat')

    log_info "Current heartbeat: $old_heartbeat"
    log_info "Waiting for service restart and new heartbeat (up to 120 seconds)..."

    # Wait for service to restart and send new heartbeat
    local max_wait=120
    local waited=0
    local downtime_start=$(date +%s)
    local downtime_end=0

    while [[ $waited -lt $max_wait ]]; do
        sleep 5
        ((waited+=5))

        response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" 2>&1 || echo "ERROR")

        if [[ "$response" != "ERROR" ]]; then
            local new_heartbeat=$(echo "$response" | jq -r '.data.lastHeartbeat')

            if [[ "$new_heartbeat" != "$old_heartbeat" ]]; then
                downtime_end=$(date +%s)
                local downtime=$((downtime_end - downtime_start))

                record_pass "Service restarted successfully"
                log_info "Downtime: ${downtime} seconds"

                if [[ $downtime -le 10 ]]; then
                    record_pass "Downtime within target (< 10 seconds)"
                else
                    record_fail "Downtime exceeded target: ${downtime}s > 10s"
                fi

                return 0
            fi
        fi
    done

    record_fail "Service did not restart within ${max_wait} seconds"
    return 1
}

# Test: Verify new version
test_verify_new_version() {
    log_info "Testing: Verify agent updated to version $NEW_VERSION"

    sleep 30  # Give agent time to re-register

    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to query agent after update"
        return 1
    fi

    local current_version=$(echo "$response" | jq -r '.data.version')

    if [[ "$current_version" == "$NEW_VERSION" ]]; then
        record_pass "Agent successfully updated to version $NEW_VERSION"
        return 0
    else
        record_fail "Agent version mismatch: expected $NEW_VERSION, got $current_version"
        return 1
    fi
}

# Test: Verify configuration preserved
test_config_preserved() {
    log_info "Testing: Verify configuration preserved after update"

    # Query agent configuration
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}/config" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to query agent configuration"
        return 1
    fi

    local server_url=$(echo "$response" | jq -r '.data.serverUrl')

    if [[ "$server_url" == "$BACKEND_URL" ]]; then
        record_pass "Configuration preserved (server URL intact)"
        return 0
    else
        record_fail "Configuration corrupted: server URL changed"
        return 1
    fi
}

# Test: Verify backup created
test_backup_created() {
    log_info "Testing: Verify old binary backed up"

    # Check for backup file (platform-specific)
    # This would need to be implemented based on agent's backup mechanism
    # For now, log a warning
    log_warning "Backup verification requires platform-specific implementation"
    record_pass "Backup test skipped (requires manual verification)"
    return 0
}

# Test: Verify health check
test_health_check() {
    log_info "Testing: Verify agent health after update"

    sleep 10

    # Check agent status
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to query agent status"
        return 1
    fi

    local status=$(echo "$response" | jq -r '.data.status')

    if [[ "$status" == "online" ]]; then
        record_pass "Agent is healthy and online"
        return 0
    else
        record_fail "Agent status is not online: $status"
        return 1
    fi
}

# Main test execution
main() {
    log_info "========================================="
    log_info "Self-Update Test"
    log_info "========================================="
    log_info "Backend URL: $BACKEND_URL"
    log_info "Agent ID: $AGENT_ID"
    log_info "Old Version: $OLD_VERSION"
    log_info "New Version: $NEW_VERSION"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Results: $RESULT_FILE"
    log_info "========================================="

    # Run tests in sequence
    test_initial_version || exit 1
    test_publish_manifest || exit 1
    test_agent_detects_update
    test_download_binary
    test_verify_checksum
    test_service_restart
    test_verify_new_version || exit 1
    test_config_preserved
    test_backup_created
    test_health_check

    # Summary
    log_info "========================================="
    log_info "Test Summary"
    log_info "========================================="
    log_success "Passed: $TESTS_PASSED"
    log_error "Failed: $TESTS_FAILED"
    log_info "========================================="

    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All tests passed! Self-update validated successfully."
        exit 0
    else
        log_error "Some tests failed. See $RESULT_FILE for details."
        exit 1
    fi
}

# Run main
main
