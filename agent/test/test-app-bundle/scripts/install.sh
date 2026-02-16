#!/bin/bash
# Test App Install Script

set -e

echo "[Install] Starting installation of $PATCHIQ_APP_NAME v$PATCHIQ_APP_VERSION"

# Determine install location
if [ -n "$HOME" ]; then
    INSTALL_DIR="$HOME/.patchiq-test-app"
else
    INSTALL_DIR="/opt/patchiq-test-app"
fi

echo "[Install] Installing to: $INSTALL_DIR"

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy files
echo "[Install] Copying application files..."
if [ -f "../files/test-app.txt" ]; then
    cp ../files/test-app.txt "$INSTALL_DIR/"
fi

# Create version file
echo "$PATCHIQ_APP_VERSION" > "$INSTALL_DIR/version.txt"
echo "$(date)" > "$INSTALL_DIR/installed_at.txt"

# Create a simple executable
cat > "$INSTALL_DIR/test-app.sh" << 'SCRIPT'
#!/bin/bash
echo "PatchIQ Test App - Version $(cat ~/.patchiq-test-app/version.txt)"
echo "Installed: $(cat ~/.patchiq-test-app/installed_at.txt)"
SCRIPT

chmod +x "$INSTALL_DIR/test-app.sh"

# Create symlink if on PATH
if [ -d "$HOME/bin" ]; then
    mkdir -p "$HOME/bin"
    ln -sf "$INSTALL_DIR/test-app.sh" "$HOME/bin/patchiq-test-app"
    echo "[Install] Created symlink in ~/bin"
fi

# Write installation metadata
cat > "$INSTALL_DIR/metadata.json" << METADATA
{
  "name": "$PATCHIQ_APP_NAME",
  "version": "$PATCHIQ_APP_VERSION",
  "installed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "install_dir": "$INSTALL_DIR"
}
METADATA

echo "[Install] Installation complete!"
echo "[Install] Installed files:"
ls -la "$INSTALL_DIR"

exit 0
