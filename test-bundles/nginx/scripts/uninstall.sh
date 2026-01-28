#!/bin/bash
# Nginx Uninstall Script - Hub Bundle

set -e

echo "========================================="
echo "  Nginx Web Server - Uninstall Script"
echo "========================================="
echo ""

if ! command -v nginx &> /dev/null; then
    echo "Nginx not installed. Nothing to uninstall."
    exit 0
fi

CURRENT_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
echo "Current version: $CURRENT_VERSION"
echo ""

# Stop and disable service
echo "Stopping nginx service..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true

# Remove package
if command -v apt-get &> /dev/null; then
    apt-get remove -y nginx nginx-common
    apt-get autoremove -y
elif command -v dnf &> /dev/null; then
    dnf remove -y nginx
elif command -v yum &> /dev/null; then
    yum remove -y nginx
fi

echo ""
echo "Nginx uninstalled successfully!"
exit 0
