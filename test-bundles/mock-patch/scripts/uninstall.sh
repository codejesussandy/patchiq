#!/bin/bash
# Mock Security Patch Uninstall Script

set -e

PATCH_DIR="/var/lib/patchiq/patches"
PATCH_FILE="$PATCH_DIR/${PATCH_ID:-MOCK-2024-01}.installed"

echo "========================================="
echo "  Mock Security Patch - Uninstall"
echo "========================================="
echo ""

if [ ! -f "$PATCH_FILE" ]; then
    echo "Patch not installed. Nothing to uninstall."
    exit 0
fi

echo "Removing patch record..."
rm -f "$PATCH_FILE"

echo ""
echo "Patch uninstalled successfully!"
exit 0
