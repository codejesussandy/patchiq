#!/bin/bash
# Mock Security Patch Rollback Script

set -e

PATCH_DIR="/var/lib/patchiq/patches"
PATCH_FILE="$PATCH_DIR/${PATCH_ID:-MOCK-2024-01}.installed"

echo "========================================="
echo "  Mock Security Patch - Rollback"
echo "========================================="
echo ""

if [ ! -f "$PATCH_FILE" ]; then
    echo "Patch not installed. Nothing to rollback."
    exit 0
fi

echo "Current patch state:"
cat "$PATCH_FILE"
echo ""

# Mark as rolled back
cat > "$PATCH_FILE" << EOF
Patch ID: ${PATCH_ID:-MOCK-2024-01}
Rolled back: $(date)
Severity: ${PATCH_SEVERITY:-UNKNOWN}
Status: ROLLED_BACK
EOF

echo "Patch rolled back successfully!"
exit 0
