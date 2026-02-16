#!/bin/bash
#
# Fresh Install Test Script
#
# Tests agent installation from installer packages on fresh VMs.
# Validates service installation, auto-start, registration, and basic functionality.
#
# Usage:
#   ./fresh-install-test.sh <platform> <installer_path> [backend_url]
#
# Platforms: windows, macos, debian, ubuntu, rhel, fedora
#
# Examples:
#   ./fresh-install-test.sh ubuntu /tmp/patchiq-agent_1.0.0_amd64.deb
#   ./fresh-install-test.sh macos /tmp/PatchIQ-Agent-1.0.0.pkg https://hub.patchiq.io
#   ./fresh-install-test.sh windows /tmp/PatchIQ-Agent-1.0.0.msi https://hub.patchiq.io
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PLATFORM="${1:-}"
INSTALLER="${2:-}"
BACKEND_URL="${3:-https://localhost:3000}"
TEST_RESULTS_DIR="$(dirname "$0")/results"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
RESULT_FILE="$TEST_RESULTS_DIR/fresh-install-$PLATFORM-$TIMESTAMP.log"

# Validate inputs
if [[ -z "$PLATFORM" ]] || [[ -z "$INSTALLER" ]]; then
    echo "Usage: $0 <platform> <installer_path> [backend_url]"
    echo "Platforms: windows, macos, debian, ubuntu, rhel, fedora"
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

# Test: Check installer exists
test_installer_exists() {
    log_info "Testing: Installer file exists"
    if [[ -f "$INSTALLER" ]]; then
        record_pass "Installer file found: $INSTALLER"
        return 0
    else
        record_fail "Installer file not found: $INSTALLER"
        return 1
    fi
}

# Install functions per platform
install_windows() {
    log_info "Installing agent on Windows..."

    # Convert Unix path to Windows path if needed
    local installer_win_path=$(wslpath -w "$INSTALLER" 2>/dev/null || echo "$INSTALLER")

    # Install via MSI (quiet mode)
    log_info "Running: msiexec /i \"$installer_win_path\" /qn SERVERURL=\"$BACKEND_URL\""

    if msiexec /i "$installer_win_path" /qn SERVERURL="$BACKEND_URL"; then
        record_pass "Windows MSI installation completed"
        return 0
    else
        record_fail "Windows MSI installation failed"
        return 1
    fi
}

install_macos() {
    log_info "Installing agent on macOS..."

    # Install via PKG
    log_info "Running: sudo installer -pkg \"$INSTALLER\" -target /"

    if sudo installer -pkg "$INSTALLER" -target /; then
        record_pass "macOS PKG installation completed"

        # Configure backend URL (macOS installs to /opt/patchiq)
        if [[ -f /opt/patchiq/agent.conf ]]; then
            log_info "Configuring backend URL in /opt/patchiq/agent.conf"
            sudo sed -i '' "s|server_url:.*|server_url: $BACKEND_URL|g" /opt/patchiq/agent.conf
        fi

        return 0
    else
        record_fail "macOS PKG installation failed"
        return 1
    fi
}

install_debian_ubuntu() {
    log_info "Installing agent on Debian/Ubuntu..."

    # Install via dpkg
    log_info "Running: sudo dpkg -i \"$INSTALLER\""

    if sudo dpkg -i "$INSTALLER"; then
        record_pass "DEB package installation completed"

        # Configure backend URL
        if [[ -f /etc/patchiq/agent.conf ]]; then
            log_info "Configuring backend URL in /etc/patchiq/agent.conf"
            sudo sed -i "s|server_url:.*|server_url: $BACKEND_URL|g" /etc/patchiq/agent.conf
        fi

        return 0
    else
        record_fail "DEB package installation failed"
        return 1
    fi
}

install_rhel_fedora() {
    log_info "Installing agent on RHEL/Fedora..."

    # Install via rpm
    log_info "Running: sudo rpm -i \"$INSTALLER\""

    if sudo rpm -i "$INSTALLER"; then
        record_pass "RPM package installation completed"

        # Configure backend URL
        if [[ -f /etc/patchiq/agent.conf ]]; then
            log_info "Configuring backend URL in /etc/patchiq/agent.conf"
            sudo sed -i "s|server_url:.*|server_url: $BACKEND_URL|g" /etc/patchiq/agent.conf
        fi

        return 0
    else
        record_fail "RPM package installation failed"
        return 1
    fi
}

# Test: Install package
test_install() {
    log_info "Testing: Package installation"

    case $PLATFORM in
        windows)
            install_windows
            ;;
        macos)
            install_macos
            ;;
        debian|ubuntu)
            install_debian_ubuntu
            ;;
        rhel|fedora)
            install_rhel_fedora
            ;;
        *)
            record_fail "Unsupported platform: $PLATFORM"
            return 1
            ;;
    esac
}

# Test: Service installed
test_service_installed() {
    log_info "Testing: Service installed"
    sleep 5  # Give installer time to complete

    case $PLATFORM in
        windows)
            if sc.exe query PatchIQAgent >/dev/null 2>&1; then
                record_pass "Windows service 'PatchIQAgent' installed"
                return 0
            else
                record_fail "Windows service 'PatchIQAgent' not found"
                return 1
            fi
            ;;
        macos)
            if launchctl list | grep -q io.patchiq.agent; then
                record_pass "macOS LaunchDaemon installed"
                return 0
            else
                record_fail "macOS LaunchDaemon not found"
                return 1
            fi
            ;;
        debian|ubuntu|rhel|fedora)
            if systemctl list-unit-files | grep -q patchiq-agent.service; then
                record_pass "Systemd service installed"
                return 0
            else
                record_fail "Systemd service not found"
                return 1
            fi
            ;;
    esac
}

# Test: Service running
test_service_running() {
    log_info "Testing: Service running (waiting 10 seconds for auto-start)"
    sleep 10

    case $PLATFORM in
        windows)
            if sc.exe query PatchIQAgent | grep -q "RUNNING"; then
                record_pass "Windows service is running"
                return 0
            else
                record_fail "Windows service is not running"
                return 1
            fi
            ;;
        macos)
            if launchctl list | grep io.patchiq.agent | grep -q -v "-"; then
                record_pass "macOS LaunchDaemon is running"
                return 0
            else
                record_fail "macOS LaunchDaemon is not running"
                return 1
            fi
            ;;
        debian|ubuntu|rhel|fedora)
            if systemctl is-active --quiet patchiq-agent; then
                record_pass "Systemd service is active"
                return 0
            else
                record_fail "Systemd service is not active"
                systemctl status patchiq-agent | tee -a "$RESULT_FILE"
                return 1
            fi
            ;;
    esac
}

# Test: Configuration file created
test_config_exists() {
    log_info "Testing: Configuration file created"

    local config_path=""
    case $PLATFORM in
        windows)
            config_path="C:\\ProgramData\\PatchIQ\\agent.conf"
            ;;
        macos)
            config_path="/opt/patchiq/agent.conf"
            ;;
        debian|ubuntu|rhel|fedora)
            config_path="/etc/patchiq/agent.conf"
            ;;
    esac

    if [[ -f "$config_path" ]]; then
        record_pass "Configuration file exists: $config_path"
        return 0
    else
        record_fail "Configuration file not found: $config_path"
        return 1
    fi
}

# Test: Logs directory created
test_logs_directory() {
    log_info "Testing: Logs directory created"

    local logs_path=""
    case $PLATFORM in
        windows)
            logs_path="C:\\ProgramData\\PatchIQ\\logs"
            ;;
        macos)
            logs_path="/var/log/patchiq"
            ;;
        debian|ubuntu|rhel|fedora)
            logs_path="/var/log/patchiq"
            ;;
    esac

    if [[ -d "$logs_path" ]]; then
        record_pass "Logs directory exists: $logs_path"
        return 0
    else
        record_fail "Logs directory not found: $logs_path"
        return 1
    fi
}

# Test: Agent registration
test_agent_registration() {
    log_info "Testing: Agent registration (waiting 30 seconds)"
    sleep 30

    local hostname=$(hostname)
    log_info "Checking backend for agent: $hostname"

    # Query backend API
    local response=$(curl -sf "${BACKEND_URL}/api/v1/agents" 2>&1 || echo "ERROR")

    if [[ "$response" == "ERROR" ]]; then
        record_fail "Failed to query backend API"
        return 1
    fi

    # Check if agent is registered
    if echo "$response" | jq -e ".data[] | select(.hostname==\"$hostname\")" >/dev/null 2>&1; then
        record_pass "Agent registered successfully"

        # Extract agent ID for later tests
        AGENT_ID=$(echo "$response" | jq -r ".data[] | select(.hostname==\"$hostname\") | .id")
        log_info "Agent ID: $AGENT_ID"
        return 0
    else
        record_fail "Agent not found in backend"
        log_info "Backend response: $response"
        return 1
    fi
}

# Test: Heartbeat working
test_heartbeat() {
    log_info "Testing: Heartbeat (waiting 60 seconds)"

    if [[ -z "${AGENT_ID:-}" ]]; then
        record_fail "Agent ID not available (registration may have failed)"
        return 1
    fi

    # Get initial heartbeat time
    local initial_heartbeat=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" | jq -r '.data.lastHeartbeat')
    log_info "Initial heartbeat: $initial_heartbeat"

    # Wait for next heartbeat (agents heartbeat every 30 seconds)
    sleep 60

    # Get updated heartbeat time
    local updated_heartbeat=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" | jq -r '.data.lastHeartbeat')
    log_info "Updated heartbeat: $updated_heartbeat"

    if [[ "$updated_heartbeat" != "$initial_heartbeat" ]]; then
        record_pass "Heartbeat is working (updated)"
        return 0
    else
        record_fail "Heartbeat not updating"
        return 1
    fi
}

# Test: Trigger inventory collection
test_inventory_collection() {
    log_info "Testing: Inventory collection"

    if [[ -z "${AGENT_ID:-}" ]]; then
        record_fail "Agent ID not available (registration may have failed)"
        return 1
    fi

    # Trigger inventory collection
    log_info "Triggering inventory collection via API"
    if curl -sf -X POST "${BACKEND_URL}/api/v1/agents/${AGENT_ID}/collect" >/dev/null 2>&1; then
        record_pass "Inventory collection triggered"
    else
        record_fail "Failed to trigger inventory collection"
        return 1
    fi

    # Wait for inventory to be submitted
    log_info "Waiting 90 seconds for inventory to be collected and submitted"
    sleep 90

    # Check if inventory was submitted
    local last_inventory=$(curl -sf "${BACKEND_URL}/api/v1/agents/${AGENT_ID}" | jq -r '.data.lastInventory')

    if [[ -n "$last_inventory" ]] && [[ "$last_inventory" != "null" ]]; then
        record_pass "Inventory submitted successfully"
        log_info "Last inventory: $last_inventory"
        return 0
    else
        record_fail "Inventory not submitted"
        return 1
    fi
}

# Test: Agent WebUI accessible
test_webui_accessible() {
    log_info "Testing: Agent WebUI accessible"

    # Check if WebUI is accessible on localhost:4504
    if curl -sf http://localhost:4504 >/dev/null 2>&1; then
        record_pass "Agent WebUI is accessible on port 4504"
        return 0
    else
        record_fail "Agent WebUI is not accessible"
        return 1
    fi
}

# Main test execution
main() {
    log_info "========================================="
    log_info "Fresh Install Test"
    log_info "========================================="
    log_info "Platform: $PLATFORM"
    log_info "Installer: $INSTALLER"
    log_info "Backend URL: $BACKEND_URL"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Results: $RESULT_FILE"
    log_info "========================================="

    # Run tests
    test_installer_exists || exit 1
    test_install || exit 1
    test_service_installed || exit 1
    test_service_running || exit 1
    test_config_exists
    test_logs_directory
    test_agent_registration
    test_heartbeat
    test_inventory_collection
    test_webui_accessible

    # Summary
    log_info "========================================="
    log_info "Test Summary"
    log_info "========================================="
    log_success "Passed: $TESTS_PASSED"
    log_error "Failed: $TESTS_FAILED"
    log_info "========================================="

    if [[ $TESTS_FAILED -eq 0 ]]; then
        log_success "All tests passed!"
        exit 0
    else
        log_error "Some tests failed. See $RESULT_FILE for details."
        exit 1
    fi
}

# Run main
main
