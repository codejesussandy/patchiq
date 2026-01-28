#!/bin/bash
# Mock Security Patch Update Script

set -e

PATCH_DIR="/var/lib/patchiq/patches"
PATCH_FILE="$PATCH_DIR/${PATCH_ID:-MOCK-2024-01}.installed"

echo "========================================="
echo "  Mock Security Patch - Update"
echo "========================================="
echo ""

if [ ! -f "$PATCH_FILE" ]; then
    echo "Patch not installed. Running install..."
    exec "$(dirname "$0")/install.sh"
fi

echo "Updating patch metadata..."

# Update the installation record
cat > "$PATCH_FILE" << EOF
Patch ID: ${PATCH_ID:-MOCK-2024-01}
Originally Installed: $(grep "Installed:" "$PATCH_FILE" | cut -d':' -f2- || echo "unknown")
Updated: $(date)
Severity: ${PATCH_SEVERITY:-UNKNOWN}
Status: UPDATED
EOF

echo ""
echo "Patch updated successfully!"
cat "$PATCH_FILE"
exit 0
