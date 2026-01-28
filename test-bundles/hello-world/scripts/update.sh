#!/bin/bash
# Hello World Update Script

set -e

echo "========================================="
echo "  Hello World Package - Update Script"
echo "========================================="
echo ""

INSTALL_DIR="${INSTALL_DIR:-/tmp/hello-world}"

# Check if already installed
if [ ! -f "$INSTALL_DIR/.status" ]; then
    echo "ERROR: Package not installed. Run install first."
    exit 1
fi

# Backup current version
PREV_VERSION=$(cat "$INSTALL_DIR/version.txt" | head -1 | cut -d':' -f2 | tr -d ' ')
echo "Previous version: $PREV_VERSION"

# Update version file
echo "Installed version: ${HELLO_WORLD_VERSION:-1.1.0}" > "$INSTALL_DIR/version.txt"
echo "Updated from: $PREV_VERSION" >> "$INSTALL_DIR/version.txt"
echo "Updated at: $(date)" >> "$INSTALL_DIR/version.txt"

# Update status
echo "UPDATED" > "$INSTALL_DIR/.status"

echo ""
echo "Update completed successfully!"
echo "Updated from $PREV_VERSION to ${HELLO_WORLD_VERSION:-1.1.0}"
echo ""
exit 0
