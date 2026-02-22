#!/bin/bash
set -e

VERSION=${1:-0.1.0}
ARCH=${2:-$(uname -m)}

echo "Building PatchIQ Agent PKG Installer for macOS..."
echo "Version: $VERSION"
echo "Architecture: $ARCH"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
PAYLOAD_DIR="$BUILD_DIR/payload"
SCRIPTS_DIR="$BUILD_DIR/scripts"
OUTPUT_DIR="$SCRIPT_DIR/output"

# Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$PAYLOAD_DIR/usr/local/bin" "$PAYLOAD_DIR/Library/LaunchDaemons" "$SCRIPTS_DIR" "$OUTPUT_DIR"

# Resolve Go arch name
GOARCH=${ARCH}
if [ "$ARCH" = "x86_64" ]; then GOARCH=amd64; fi

# Use pre-built binary from dist/ if available, otherwise compile from source
PREBUILT="$PROJECT_ROOT/dist/patchiq-agent-darwin-${GOARCH}"
if [ -f "$PREBUILT" ]; then
    echo "Using pre-built binary: $PREBUILT"
    cp "$PREBUILT" "$PAYLOAD_DIR/usr/local/bin/patchiq-agent"
else
    echo "Building agent binary from source..."
    cd "$PROJECT_ROOT"
    GOOS=darwin GOARCH=$GOARCH go build \
        -ldflags "-X main.version=$VERSION -X main.buildDate=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        -o "$PAYLOAD_DIR/usr/local/bin/patchiq-agent" \
        ./cmd/agent
fi
chmod +x "$PAYLOAD_DIR/usr/local/bin/patchiq-agent"

# Create LaunchDaemon plist
cat > "$PAYLOAD_DIR/Library/LaunchDaemons/io.patchiq.agent.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.patchiq.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/patchiq-agent</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/patchiq/agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/patchiq/agent-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
PLIST

# Create postinstall script
cat > "$SCRIPTS_DIR/postinstall" <<'POSTINSTALL'
#!/bin/bash

# Create log directory
mkdir -p /var/log/patchiq
chmod 755 /var/log/patchiq

# Set permissions
chmod +x /usr/local/bin/patchiq-agent
chown root:wheel /usr/local/bin/patchiq-agent
chown root:wheel /Library/LaunchDaemons/io.patchiq.agent.plist

# Load and start service
launchctl load /Library/LaunchDaemons/io.patchiq.agent.plist
launchctl start io.patchiq.agent

echo "PatchIQ Agent installed successfully."
exit 0
POSTINSTALL
chmod +x "$SCRIPTS_DIR/postinstall"

# Create preinstall script
cat > "$SCRIPTS_DIR/preinstall" <<'PREINSTALL'
#!/bin/bash

# Stop existing service if running
launchctl stop io.patchiq.agent 2>/dev/null || true
launchctl unload /Library/LaunchDaemons/io.patchiq.agent.plist 2>/dev/null || true

exit 0
PREINSTALL
chmod +x "$SCRIPTS_DIR/preinstall"

# Build PKG
echo "Building PKG..."
pkgbuild \
    --root "$PAYLOAD_DIR" \
    --scripts "$SCRIPTS_DIR" \
    --identifier "io.patchiq.agent" \
    --version "$VERSION" \
    --install-location "/" \
    "$OUTPUT_DIR/PatchIQAgent-$VERSION-$ARCH.pkg"

echo ""
echo "PKG installer built successfully!"
echo "Output: $OUTPUT_DIR/PatchIQAgent-$VERSION-$ARCH.pkg"
