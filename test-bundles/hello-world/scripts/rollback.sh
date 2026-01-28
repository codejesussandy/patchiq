#!/bin/bash
# Hello World Rollback Script

set -e

echo "========================================="
echo "  Hello World Package - Rollback Script"
echo "========================================="
echo ""

INSTALL_DIR="${INSTALL_DIR:-/tmp/hello-world}"

# Check if installed
if [ ! -f "$INSTALL_DIR/.status" ]; then
    echo "WARNING: Package not found at $INSTALL_DIR"
    echo "Nothing to rollback."
    exit 0
fi

CURRENT_STATUS=$(cat "$INSTALL_DIR/.status")
echo "Current status: $CURRENT_STATUS"

# Simulate rollback by resetting to base version
echo "Installed version: 1.0.0" > "$INSTALL_DIR/version.txt"
echo "Rolled back at: $(date)" >> "$INSTALL_DIR/version.txt"

echo "ROLLED_BACK" > "$INSTALL_DIR/.status"

echo ""
echo "Rollback completed successfully!"
echo "Reverted to version 1.0.0"
echo ""
exit 0
