#!/bin/bash
# Test App Uninstall Script

set -e

echo "[Uninstall] Uninstalling $PATCHIQ_APP_NAME"

# Determine install location
if [ -n "$HOME" ]; then
    INSTALL_DIR="$HOME/.patchiq-test-app"
else
    INSTALL_DIR="/opt/patchiq-test-app"
fi

if [ ! -d "$INSTALL_DIR" ]; then
    echo "[Uninstall] Application not found, nothing to uninstall"
    exit 0
fi

# Remove symlink
if [ -L "$HOME/bin/patchiq-test-app" ]; then
    rm -f "$HOME/bin/patchiq-test-app"
    echo "[Uninstall] Removed symlink"
fi

# Remove installation directory
echo "[Uninstall] Removing: $INSTALL_DIR"
rm -rf "$INSTALL_DIR"

echo "[Uninstall] Uninstall complete!"

exit 0
