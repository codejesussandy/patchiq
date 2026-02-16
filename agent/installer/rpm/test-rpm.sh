#!/bin/bash
# Test script for RPM package validation
# This script helps validate RPM packages on RHEL/Fedora systems

set -e

RPM_FILE="${1}"

if [ -z "$RPM_FILE" ]; then
    echo "Usage: $0 <rpm-file>"
    echo ""
    echo "Example:"
    echo "  $0 ../../dist/patchiq-agent-1.0.0-1.fc40.x86_64.rpm"
    exit 1
fi

if [ ! -f "$RPM_FILE" ]; then
    echo "Error: RPM file not found: $RPM_FILE"
    exit 1
fi

echo "========================================="
echo "RPM Package Testing Script"
echo "========================================="
echo ""

# Test 1: Package info
echo "[1/9] Checking package metadata..."
rpm -qip "$RPM_FILE"
echo ""

# Test 2: List files
echo "[2/9] Listing package files..."
rpm -qlp "$RPM_FILE"
echo ""

# Test 3: Check dependencies
echo "[3/9] Checking package dependencies..."
rpm -qRp "$RPM_FILE"
echo ""

# Test 4: Check scripts
echo "[4/9] Checking package scripts..."
echo "--- Post-install script ---"
rpm -q --scripts -p "$RPM_FILE" | sed -n '/postinstall/,/preuninstall/p' | head -n -1
echo ""
echo "--- Pre-uninstall script ---"
rpm -q --scripts -p "$RPM_FILE" | sed -n '/preuninstall/,/postuninstall/p' | head -n -1
echo ""
echo "--- Post-uninstall script ---"
rpm -q --scripts -p "$RPM_FILE" | sed -n '/postuninstall/,//p'
echo ""

# Test 5: Run rpmlint if available
echo "[5/9] Running rpmlint validation..."
if command -v rpmlint &> /dev/null; then
    rpmlint "$RPM_FILE" || true
else
    echo "rpmlint not installed (optional)"
fi
echo ""

# Ask if user wants to proceed with installation test
echo "[6/9] Installation test"
read -p "Do you want to install the package? (requires sudo) [y/N]: " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping installation test"
    echo ""
    echo "========================================="
    echo "Testing complete (partial)"
    echo "========================================="
    exit 0
fi

# Test 6: Install package
echo "Installing package..."
sudo rpm -i "$RPM_FILE"
echo ""

# Test 7: Verify installation
echo "[7/9] Verifying installation..."
echo "Package info:"
rpm -qi patchiq-agent
echo ""
echo "Installed files:"
rpm -ql patchiq-agent
echo ""
echo "Service status:"
systemctl status patchiq-agent --no-pager || true
echo ""

# Test 8: Verify files
echo "[8/9] Verifying file integrity..."
rpm -V patchiq-agent || echo "Some files differ (expected if service is running)"
echo ""

# Test 9: Test uninstall
echo "[9/9] Uninstallation test"
read -p "Do you want to uninstall the package? [y/N]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstalling package..."
    sudo rpm -e patchiq-agent
    echo ""

    echo "Verifying uninstallation..."
    echo "Package check:"
    rpm -q patchiq-agent || echo "✓ Package removed successfully"
    echo ""
    echo "Service check:"
    systemctl status patchiq-agent --no-pager 2>&1 | grep -q "could not be found" && echo "✓ Service removed successfully" || echo "⚠ Service still exists"
    echo ""
    echo "Binary check:"
    if [ ! -f /usr/bin/patchiq-agent ]; then
        echo "✓ Binary removed successfully"
    else
        echo "⚠ Binary still exists"
    fi
    echo ""
fi

echo "========================================="
echo "Testing complete"
echo "========================================="
