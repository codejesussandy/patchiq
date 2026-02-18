#!/bin/bash
set -e

VERSION=${1:-0.1.0}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "PatchIQ Agent Installer Builder v$VERSION"
echo "========================================"

# macOS PKG (both architectures)
if [[ "$(uname)" == "Darwin" ]] && command -v pkgbuild &> /dev/null; then
    echo ""
    echo "=== Building macOS PKG (arm64) ==="
    "$SCRIPT_DIR/macos/build.sh" "$VERSION" arm64

    echo ""
    echo "=== Building macOS PKG (x86_64) ==="
    "$SCRIPT_DIR/macos/build.sh" "$VERSION" x86_64
else
    echo ""
    echo "Skipping macOS PKG (not on macOS or pkgbuild not available)"
fi

# Linux DEB
if command -v fpm &> /dev/null; then
    echo ""
    echo "=== Building Linux DEB (amd64) ==="
    "$SCRIPT_DIR/linux/build.sh" "$VERSION" amd64 deb

    echo ""
    echo "=== Building Linux RPM (x86_64) ==="
    "$SCRIPT_DIR/linux/build.sh" "$VERSION" x86_64 rpm
else
    echo ""
    echo "Skipping Linux packages (fpm not installed)"
    echo "Install with: gem install fpm"
fi

# Windows MSI note
echo ""
echo "=== Windows MSI ==="
echo "Build on Windows with: cd installer/windows && powershell ./build-msi.ps1 -Version $VERSION"

echo ""
echo "========================================"
echo "Build complete!"
echo "========================================"
