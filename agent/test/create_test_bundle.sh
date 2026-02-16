#!/bin/bash
# Creates a test bundle for hub-centric deployment testing

set -e

echo "========================================="
echo "Creating Hub-Centric Test Bundle"
echo "========================================="
echo ""

# Create bundle structure
BUNDLE_DIR="test-app-bundle"
BUNDLE_NAME="test-app-1.0.0"

echo "Creating bundle directory structure..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"
cd "$BUNDLE_DIR"

# Create directories
mkdir -p scripts
mkdir -p files
mkdir -p config

# Create manifest.json
cat > manifest.json << 'EOF'
{
  "id": "com.patchiq.test-app",
  "name": "test-app",
  "displayName": "PatchIQ Test Application",
  "version": "1.0.0",
  "vendor": "PatchIQ",
  "category": "Development",
  "platform": "cross-platform",
  "description": "Test application for validating PatchIQ deployment engine",
  "requiresRoot": false,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "PATCHIQ_APP_NAME": "test-app",
    "PATCHIQ_APP_VERSION": "1.0.0"
  },
  "dependencies": [],
  "conflicts": []
}
EOF

# Create install script
cat > scripts/install.sh << 'EOF'
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
EOF

# Create update script
cat > scripts/update.sh << 'EOF'
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
EOF

# Create rollback script
cat > scripts/rollback.sh << 'EOF'
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
EOF

# Create uninstall script
cat > scripts/uninstall.sh << 'EOF'
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
EOF

# Make scripts executable
chmod +x scripts/*.sh

# Create a sample file
cat > files/test-app.txt << 'EOF'
PatchIQ Test Application
========================

This is a test file bundled with the application.
It serves to verify that file copying works correctly during installation.

Version: 1.0.0
EOF

# Create README
cat > README.md << 'EOF'
# PatchIQ Test App Bundle

This is a test bundle for validating the PatchIQ hub-centric deployment engine.

## Structure

```
test-app-bundle/
├── manifest.json          # Package metadata and script paths
├── scripts/
│   ├── install.sh        # Installation script
│   ├── update.sh         # Update script
│   ├── rollback.sh       # Rollback script
│   └── uninstall.sh      # Uninstall script
├── files/
│   └── test-app.txt      # Sample application file
└── README.md             # This file
```

## Testing

### Manual Test

1. Extract this bundle
2. Run installation:
   ```bash
   cd test-app-bundle
   ./scripts/install.sh
   ```

3. Verify installation:
   ```bash
   ls -la ~/.patchiq-test-app
   cat ~/.patchiq-test-app/version.txt
   ```

4. Test uninstall:
   ```bash
   ./scripts/uninstall.sh
   ```

### Bundle Test

1. Create tar.gz bundle:
   ```bash
   tar -czf test-app-1.0.0.tar.gz test-app-bundle/
   ```

2. Test with agent script executor (requires running agent)

## Installation Location

- User install: `~/.patchiq-test-app`
- System install: `/opt/patchiq-test-app`

## What Gets Installed

- Application files in installation directory
- version.txt - Current version
- metadata.json - Installation metadata
- test-app.sh - Executable script
- Symlink in ~/bin (if directory exists)
EOF

cd ..

# Create tar.gz bundle
echo ""
echo "Creating tar.gz bundle..."
tar -czf "$BUNDLE_NAME.tar.gz" "$BUNDLE_DIR/"

# Calculate SHA256 checksum
echo ""
echo "Calculating checksum..."
if command -v sha256sum &> /dev/null; then
    CHECKSUM=$(sha256sum "$BUNDLE_NAME.tar.gz" | awk '{print $1}')
elif command -v shasum &> /dev/null; then
    CHECKSUM=$(shasum -a 256 "$BUNDLE_NAME.tar.gz" | awk '{print $1}')
else
    CHECKSUM="N/A"
fi

# Create info file
cat > "$BUNDLE_NAME.info.txt" << EOF
Test Bundle Information
=======================

Bundle File: $BUNDLE_NAME.tar.gz
Created: $(date)
SHA256: $CHECKSUM

Structure:
----------
test-app-bundle/
├── manifest.json
├── scripts/
│   ├── install.sh
│   ├── update.sh
│   ├── rollback.sh
│   └── uninstall.sh
├── files/
│   └── test-app.txt
└── README.md

Testing Instructions:
--------------------

1. Manual Test:
   tar -xzf $BUNDLE_NAME.tar.gz
   cd $BUNDLE_DIR
   ./scripts/install.sh
   ./scripts/uninstall.sh

2. Agent Test:
   Upload bundle to MinIO
   Create deployment job pointing to bundle URL
   Agent will download, extract, and execute install.sh

3. Verify Installation:
   ls -la ~/.patchiq-test-app
   cat ~/.patchiq-test-app/version.txt

4. Verify Uninstall:
   [ ! -d ~/.patchiq-test-app ] && echo "Uninstalled successfully"
EOF

echo ""
echo "========================================="
echo "Bundle Creation Complete!"
echo "========================================="
echo ""
echo "Created files:"
echo "  - $BUNDLE_DIR/ (source directory)"
echo "  - $BUNDLE_NAME.tar.gz (bundle archive)"
echo "  - $BUNDLE_NAME.info.txt (bundle information)"
echo ""
echo "Bundle size: $(du -h "$BUNDLE_NAME.tar.gz" | cut -f1)"
echo "SHA256: $CHECKSUM"
echo ""
echo "Quick Test:"
echo "  cd $BUNDLE_DIR && ./scripts/install.sh"
echo ""
echo "Upload to MinIO:"
echo "  mc cp $BUNDLE_NAME.tar.gz myminio/packages/"
echo ""
