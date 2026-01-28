#!/bin/bash
# Mock Security Patch Install Script

set -e

PATCH_DIR="/var/lib/patchiq/patches"
PATCH_FILE="$PATCH_DIR/${PATCH_ID:-MOCK-2024-01}.installed"

echo "========================================="
echo "  Mock Security Patch - Install"
echo "========================================="
echo "Patch ID: ${PATCH_ID:-MOCK-2024-01}"
echo "Severity: ${PATCH_SEVERITY:-UNKNOWN}"
echo ""

# Create patches directory
mkdir -p "$PATCH_DIR"

# Check if already installed
if [ -f "$PATCH_FILE" ]; then
    echo "Patch already installed."
    cat "$PATCH_FILE"
    exit 0
fi

# Simulate patch installation
echo "Applying security patch..."
sleep 1

# Record installation
cat > "$PATCH_FILE" << EOF
Patch ID: ${PATCH_ID:-MOCK-2024-01}
Installed: $(date)
Severity: ${PATCH_SEVERITY:-UNKNOWN}
Status: INSTALLED
EOF

echo ""
echo "Patch installed successfully!"
cat "$PATCH_FILE"
exit 0
