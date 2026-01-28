#!/bin/bash
# Hello World Uninstall Script

set -e

echo "========================================="
echo "  Hello World Package - Uninstall Script"
echo "========================================="
echo ""

INSTALL_DIR="${INSTALL_DIR:-/tmp/hello-world}"

# Check if installed
if [ ! -d "$INSTALL_DIR" ]; then
    echo "Package not installed at $INSTALL_DIR"
    echo "Nothing to uninstall."
    exit 0
fi

echo "Removing installation from: $INSTALL_DIR"

# Remove all files
rm -rf "$INSTALL_DIR"

echo ""
echo "Uninstall completed successfully!"
echo "All files removed from $INSTALL_DIR"
echo ""
exit 0
