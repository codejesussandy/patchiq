#!/bin/bash
set -e

VERSION="${1:-0.1.0}"
RELEASE="${2:-1}"

echo "Building patchiq-agent RPM v$VERSION-$RELEASE..."

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$AGENT_ROOT/dist"

# Create RPM build structure
mkdir -p ~/rpmbuild/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Copy spec file
cp "$SCRIPT_DIR/patchiq-agent.spec" ~/rpmbuild/SPECS/

# Copy binary to SOURCES
if [ ! -f "$DIST_DIR/patchiq-agent-linux-amd64" ]; then
    echo "Error: Binary not found at $DIST_DIR/patchiq-agent-linux-amd64"
    echo "Please run 'make release' first to build binaries"
    exit 1
fi

cp "$DIST_DIR/patchiq-agent-linux-amd64" ~/rpmbuild/SOURCES/

# Build RPM
echo "Building RPM package..."
rpmbuild -ba ~/rpmbuild/SPECS/patchiq-agent.spec \
    --define "version $VERSION" \
    --define "release $RELEASE"

# Copy to dist
echo "Copying RPM to $DIST_DIR..."
cp ~/rpmbuild/RPMS/x86_64/patchiq-agent-$VERSION-$RELEASE.*.rpm "$DIST_DIR/"

# Get the actual filename
RPM_FILE=$(ls "$DIST_DIR"/patchiq-agent-$VERSION-$RELEASE.*.rpm)

echo ""
echo "✓ RPM package created: $RPM_FILE"
echo ""
echo "To install:"
echo "  sudo rpm -i $RPM_FILE"
echo ""
echo "To verify:"
echo "  systemctl status patchiq-agent"
echo "  journalctl -u patchiq-agent -f"
echo ""
echo "To list files:"
echo "  rpm -ql patchiq-agent"
echo ""
echo "To uninstall:"
echo "  sudo rpm -e patchiq-agent"
echo ""

# Validate with rpmlint if available
if command -v rpmlint &> /dev/null; then
    echo "Running rpmlint validation..."
    rpmlint "$RPM_FILE" || true
else
    echo "Note: rpmlint not found. Install it to validate RPM package:"
    echo "  Fedora: sudo dnf install rpmlint"
    echo "  RHEL: sudo yum install rpmlint"
fi
