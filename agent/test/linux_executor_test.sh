#!/bin/bash
# Linux Executor E2E Test Script
# Tests all Linux package managers with real packages

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Linux Executor E2E Test Suite"
echo "========================================="
echo ""

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
else
    echo -e "${RED}ERROR: Cannot detect Linux distribution${NC}"
    exit 1
fi

echo "Detected distribution: $DISTRO"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run a test
run_test() {
    local test_name=$1
    local test_command=$2

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "[$TOTAL_TESTS] Testing: $test_name... "

    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  Error output:"
        cat /tmp/test_output.log | sed 's/^/    /'
        return 1
    fi
}

# Helper to verify package installed
verify_installed() {
    local package=$1
    local pm=$2

    case $pm in
        apt)
            dpkg -l | grep -q "^ii.*$package"
            ;;
        yum|dnf)
            rpm -qa | grep -q "$package"
            ;;
        *)
            which "$package" &> /dev/null
            ;;
    esac
}

# Debian/Ubuntu tests
if [[ "$DISTRO" == "ubuntu" ]] || [[ "$DISTRO" == "debian" ]]; then
    echo "=== Test 1: APT Package Manager ==="
    echo ""

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}WARNING: Not running as root, tests may fail${NC}"
        echo "         Run with: sudo $0"
    fi

    # Test 1.1: Update package lists
    run_test "apt update" "sudo apt-get update -qq"

    # Test 1.2: Install curl
    run_test "apt install curl" "sudo apt-get install -y curl"

    # Test 1.3: Verify curl installed
    run_test "verify curl installation" "verify_installed curl apt"

    # Test 1.4: Uninstall curl
    run_test "apt remove curl" "sudo apt-get remove -y curl"

    # Test 1.5: Verify curl removed
    if verify_installed curl apt 2>/dev/null; then
        echo -e "[$TOTAL_TESTS] Testing: verify curl removal... ${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "[$((TOTAL_TESTS + 1))] Testing: verify curl removal... ${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo ""
    echo "=== Test 2: DEB Package File ==="
    echo ""

    echo -e "${YELLOW}INFO: DEB file tests require a .deb file${NC}"
    echo "      Manual test: Download a .deb and test with:"
    echo "      sudo dpkg -i package.deb"
fi

# RedHat/CentOS/Fedora tests
if [[ "$DISTRO" == "rhel" ]] || [[ "$DISTRO" == "centos" ]] || [[ "$DISTRO" == "fedora" ]]; then
    # Determine package manager (yum or dnf)
    if command -v dnf &> /dev/null; then
        PM="dnf"
    else
        PM="yum"
    fi

    echo "=== Test 1: $PM Package Manager ==="
    echo ""

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}WARNING: Not running as root, tests may fail${NC}"
        echo "         Run with: sudo $0"
    fi

    # Test 1.1: Install wget
    run_test "$PM install wget" "sudo $PM install -y wget"

    # Test 1.2: Verify wget installed
    run_test "verify wget installation" "verify_installed wget $PM"

    # Test 1.3: Uninstall wget
    run_test "$PM remove wget" "sudo $PM remove -y wget"

    # Test 1.4: Verify wget removed
    if verify_installed wget "$PM" 2>/dev/null; then
        echo -e "[$TOTAL_TESTS] Testing: verify wget removal... ${RED}FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "[$((TOTAL_TESTS + 1))] Testing: verify wget removal... ${GREEN}PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo ""
    echo "=== Test 2: RPM Package File ==="
    echo ""

    echo -e "${YELLOW}INFO: RPM file tests require a .rpm file${NC}"
    echo "      Manual test: Download a .rpm and test with:"
    echo "      sudo rpm -i package.rpm"
fi

echo ""
echo "=== Test 3: Hub-Centric Script Bundle ==="
echo ""

echo -e "${YELLOW}INFO: Hub-centric bundle test requires bundle creation first${NC}"
echo "      See test/create_test_bundle.sh"

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo "Total Tests:  $TOTAL_TESTS"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
