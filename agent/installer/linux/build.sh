#!/bin/bash
set -e

VERSION=${1:-1.0.0}
ARCH=${2:-amd64}
FORMAT=${3:-deb}

echo "Building PatchIQ Agent $FORMAT Package..."
echo "Version: $VERSION"
echo "Architecture: $ARCH"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
OUTPUT_DIR="$SCRIPT_DIR/output"

# Clean
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$OUTPUT_DIR"

# Build agent binary
echo "Building agent binary..."
cd "$PROJECT_ROOT"

# Map architecture names for Go
GOARCH="$ARCH"
if [ "$ARCH" = "x86_64" ]; then GOARCH=amd64; fi

GOOS=linux GOARCH=$GOARCH go build \
    -ldflags "-X main.version=$VERSION -X main.buildDate=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -o "$BUILD_DIR/patchiq-agent" \
    ./cmd/agent

# Create directory structure
mkdir -p "$BUILD_DIR/opt/patchiq"
mkdir -p "$BUILD_DIR/etc/systemd/system"
mkdir -p "$BUILD_DIR/etc/patchiq"

cp "$BUILD_DIR/patchiq-agent" "$BUILD_DIR/opt/patchiq/"
chmod +x "$BUILD_DIR/opt/patchiq/patchiq-agent"

# Create systemd service
cat > "$BUILD_DIR/etc/systemd/system/patchiq-agent.service" <<'SYSTEMD'
[Unit]
Description=PatchIQ Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/opt/patchiq/patchiq-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=PATCHIQ_DATA_DIR=/var/lib/patchiq-agent

[Install]
WantedBy=multi-user.target
SYSTEMD

# Create default config
cat > "$BUILD_DIR/etc/patchiq/config.json" <<'CONFIG'
{
  "serverUrl": "",
  "webUiPort": 5003,
  "dataDir": "/var/lib/patchiq-agent",
  "enableDownloadResume": true
}
CONFIG

# Create post-install script
cat > "$BUILD_DIR/post-install.sh" <<'POSTINSTALL'
#!/bin/bash

# Create data directory
mkdir -p /var/lib/patchiq-agent
chmod 755 /var/lib/patchiq-agent

# Symlink for CLI access
ln -sf /opt/patchiq/patchiq-agent /usr/local/bin/patchiq-agent

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable patchiq-agent
systemctl start patchiq-agent

echo "PatchIQ Agent installed successfully!"
echo "Status: systemctl status patchiq-agent"
echo "Logs:   journalctl -u patchiq-agent -f"
POSTINSTALL
chmod +x "$BUILD_DIR/post-install.sh"

# Create pre-uninstall script
cat > "$BUILD_DIR/pre-uninstall.sh" <<'PREUNINSTALL'
#!/bin/bash

# Stop and disable service
systemctl stop patchiq-agent || true
systemctl disable patchiq-agent || true
PREUNINSTALL
chmod +x "$BUILD_DIR/pre-uninstall.sh"

# Create post-uninstall script
cat > "$BUILD_DIR/post-uninstall.sh" <<'POSTUNINSTALL'
#!/bin/bash

# Remove symlink
rm -f /usr/local/bin/patchiq-agent

# Reload systemd
systemctl daemon-reload
POSTUNINSTALL
chmod +x "$BUILD_DIR/post-uninstall.sh"

# Check for fpm
if ! command -v fpm &> /dev/null; then
    echo "ERROR: fpm is not installed."
    echo "Install with: gem install fpm"
    echo "Or on Ubuntu: apt install ruby ruby-dev && gem install fpm"
    exit 1
fi

# Build package with FPM
echo "Building $FORMAT package..."

fpm \
    -s dir \
    -t "$FORMAT" \
    -n patchiq-agent \
    -v "$VERSION" \
    --architecture "$ARCH" \
    --description "PatchIQ endpoint management agent for inventory collection and patch deployment" \
    --url "https://patchiq.io" \
    --maintainer "support@patchiq.io" \
    --license "Proprietary" \
    --after-install "$BUILD_DIR/post-install.sh" \
    --before-remove "$BUILD_DIR/pre-uninstall.sh" \
    --after-remove "$BUILD_DIR/post-uninstall.sh" \
    --config-files /etc/patchiq/config.json \
    -C "$BUILD_DIR" \
    --package "$OUTPUT_DIR/patchiq-agent_${VERSION}_${ARCH}.$FORMAT" \
    opt/patchiq/patchiq-agent=/opt/patchiq/patchiq-agent \
    etc/systemd/system/patchiq-agent.service=/etc/systemd/system/patchiq-agent.service \
    etc/patchiq/config.json=/etc/patchiq/config.json

echo ""
echo "$FORMAT package built successfully!"
echo "Output: $OUTPUT_DIR/patchiq-agent_${VERSION}_${ARCH}.$FORMAT"
