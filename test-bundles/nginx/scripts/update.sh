#!/bin/bash
# Nginx Update Script - Hub Bundle

set -e

echo "========================================="
echo "  Nginx Web Server - Update Script"
echo "========================================="
echo ""

# Get current version
if command -v nginx &> /dev/null; then
    CURRENT_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
    echo "Current version: $CURRENT_VERSION"
else
    echo "Nginx not installed. Running install instead."
    exec "$(dirname "$0")/install.sh"
fi

# Detect package manager and update
if command -v apt-get &> /dev/null; then
    apt-get update -qq
    apt-get install -y --only-upgrade nginx
elif command -v dnf &> /dev/null; then
    dnf upgrade -y nginx
elif command -v yum &> /dev/null; then
    yum update -y nginx
fi

# Restart nginx to apply updates
systemctl restart nginx 2>/dev/null || true

# Verify
NEW_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
echo ""
echo "Update completed!"
echo "Version: $CURRENT_VERSION -> $NEW_VERSION"
exit 0
