#!/bin/bash
#
# PatchIQ Agent - Uninstall Script for macOS
#
# Usage:
#   sudo ./uninstall.sh
#
# This script will:
#   - Stop the PatchIQ Agent service
#   - Remove the agent binary
#   - Remove the LaunchDaemon plist
#   - Remove log files (optional)
#   - Remove configuration files (optional)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

# Print banner
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PatchIQ Agent - Uninstaller${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Confirm uninstallation
read -p "Are you sure you want to uninstall PatchIQ Agent? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Uninstalling PatchIQ Agent...${NC}"
echo ""

# Stop and unload LaunchDaemon
echo -e "${YELLOW}Stopping PatchIQ Agent service...${NC}"

launchctl stop io.patchiq.agent 2>/dev/null || true
launchctl unload /Library/LaunchDaemons/io.patchiq.agent.plist 2>/dev/null || true

echo -e "${GREEN}✓ Service stopped${NC}"

# Remove LaunchDaemon plist
echo -e "${YELLOW}Removing LaunchDaemon configuration...${NC}"

if [ -f "/Library/LaunchDaemons/io.patchiq.agent.plist" ]; then
    rm -f /Library/LaunchDaemons/io.patchiq.agent.plist
    echo "  Removed LaunchDaemon plist"
fi

echo -e "${GREEN}✓ LaunchDaemon configuration removed${NC}"

# Remove agent binary
echo -e "${YELLOW}Removing agent binary...${NC}"

if [ -f "/usr/local/bin/patchiq-agent" ]; then
    rm -f /usr/local/bin/patchiq-agent
    echo -e "${GREEN}✓ Agent binary removed${NC}"
else
    echo -e "${YELLOW}  Agent binary not found (already removed?)${NC}"
fi

# Ask about removing log files
echo ""
read -p "Remove log files? (/var/log/patchiq) (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "/var/log/patchiq" ]; then
        rm -rf /var/log/patchiq
        echo -e "${GREEN}✓ Log files removed${NC}"
    else
        echo -e "${YELLOW}  Log directory not found${NC}"
    fi
else
    echo -e "${YELLOW}  Log files retained${NC}"
fi

# Ask about removing configuration files
echo ""
read -p "Remove configuration files? (~/.patchiq) (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for uid in $(dscl . -list /Users UniqueID | awk '$2 >= 501 {print $2}'); do
        username=$(dscl . -list /Users UniqueID | awk -v uid="$uid" '$2 == uid {print $1}')
        user_home=$(dscl . -read /Users/$username NFSHomeDirectory | awk '{print $2}')

        if [ -d "$user_home/.patchiq" ]; then
            rm -rf "$user_home/.patchiq"
            echo "  Removed config for user: $username"
        fi
    done
    echo -e "${GREEN}✓ Configuration files removed${NC}"
else
    echo -e "${YELLOW}  Configuration files retained${NC}"
fi

# Remove receipt (PKG receipt)
echo ""
echo -e "${YELLOW}Removing package receipt...${NC}"
pkgutil --forget io.patchiq.agent 2>/dev/null || true
echo -e "${GREEN}✓ Package receipt removed${NC}"

# Final summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Uninstall Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ PatchIQ Agent has been successfully uninstalled${NC}"
echo ""
echo "If you want to reinstall, run the installer again."
echo ""
