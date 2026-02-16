#!/bin/bash
# Test App Update Script

set -e

echo "[Update] Updating $PATCHIQ_APP_NAME"

# Determine install location
if [ -n "$HOME" ]; then
    INSTALL_DIR="$HOME/.patchiq-test-app"
else
    INSTALL_DIR="/opt/patchiq-test-app"
fi

if [ ! -d "$INSTALL_DIR" ]; then
    echo "[Update] ERROR: Application not installed"
    exit 1
fi

OLD_VERSION=$(cat "$INSTALL_DIR/version.txt")
echo "[Update] Updating from version $OLD_VERSION to $PATCHIQ_APP_VERSION"

# Backup old version
echo "$OLD_VERSION" > "$INSTALL_DIR/previous_version.txt"

# Update version
echo "$PATCHIQ_APP_VERSION" > "$INSTALL_DIR/version.txt"
echo "$(date)" > "$INSTALL_DIR/updated_at.txt"

echo "[Update] Update complete!"

exit 0
