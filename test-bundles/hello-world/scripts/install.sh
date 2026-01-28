#!/bin/bash
# Hello World Install Script
# This script demonstrates the Hub-centric installation flow

set -e

echo "========================================="
echo "  Hello World Package - Install Script"
echo "========================================="
echo ""
echo "Environment Variables:"
echo "  HELLO_WORLD_VERSION: ${HELLO_WORLD_VERSION:-not set}"
echo "  INSTALL_DIR: ${INSTALL_DIR:-/tmp/hello-world}"
echo "  PATCHIQ_WORK_DIR: ${PATCHIQ_WORK_DIR:-not set}"
echo ""

# Create installation directory
INSTALL_DIR="${INSTALL_DIR:-/tmp/hello-world}"
mkdir -p "$INSTALL_DIR"

# Create version file
echo "Installed version: ${HELLO_WORLD_VERSION:-1.0.0}" > "$INSTALL_DIR/version.txt"
echo "Installed at: $(date)" >> "$INSTALL_DIR/version.txt"

# Create a simple hello world script
cat > "$INSTALL_DIR/hello.sh" << 'EOF'
#!/bin/bash
echo "Hello from PatchIQ Hub!"
echo "Version: $(cat "$(dirname "$0")/version.txt" | head -1)"
EOF
chmod +x "$INSTALL_DIR/hello.sh"

# Create marker file for verification
echo "INSTALLED" > "$INSTALL_DIR/.status"

echo ""
echo "Installation completed successfully!"
echo "Files installed to: $INSTALL_DIR"
echo ""
echo "To test: $INSTALL_DIR/hello.sh"
echo ""
exit 0
