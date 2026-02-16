#!/bin/bash
# Test App Rollback Script

set -e

echo "[Rollback] Rolling back $PATCHIQ_APP_NAME"

# Determine install location
if [ -n "$HOME" ]; then
    INSTALL_DIR="$HOME/.patchiq-test-app"
else
    INSTALL_DIR="/opt/patchiq-test-app"
fi

if [ ! -d "$INSTALL_DIR" ]; then
    echo "[Rollback] ERROR: Application not installed"
    exit 1
fi

# Check if previous version exists
if [ ! -f "$INSTALL_DIR/previous_version.txt" ]; then
    echo "[Rollback] ERROR: No previous version to rollback to"
    exit 1
fi

PREVIOUS_VERSION=$(cat "$INSTALL_DIR/previous_version.txt")
CURRENT_VERSION=$(cat "$INSTALL_DIR/version.txt")

echo "[Rollback] Rolling back from $CURRENT_VERSION to $PREVIOUS_VERSION"

# Restore previous version
echo "$PREVIOUS_VERSION" > "$INSTALL_DIR/version.txt"
rm -f "$INSTALL_DIR/previous_version.txt"
echo "$(date)" > "$INSTALL_DIR/rolledback_at.txt"

echo "[Rollback] Rollback complete!"

exit 0
