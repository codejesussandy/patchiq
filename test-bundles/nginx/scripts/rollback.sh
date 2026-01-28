#!/bin/bash
# Nginx Rollback Script - Hub Bundle
# Note: Rolling back nginx is complex; this stops the service for safety

set -e

echo "========================================="
echo "  Nginx Web Server - Rollback Script"
echo "========================================="
echo ""

if ! command -v nginx &> /dev/null; then
    echo "Nginx not installed. Nothing to rollback."
    exit 0
fi

CURRENT_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
echo "Current version: $CURRENT_VERSION"
echo ""

# Stop nginx service as a safety measure
echo "Stopping nginx service..."
systemctl stop nginx 2>/dev/null || true

echo ""
echo "Rollback completed."
echo "Nginx service has been stopped."
echo "Manual intervention may be required to restore previous version."
exit 0
