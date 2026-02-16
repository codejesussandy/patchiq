#!/bin/bash
set -e

VERSION="${1:-1.0.0}"
ARCH="amd64"
PACKAGE="patchiq-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=========================================="
echo "Building $PACKAGE DEB package"
echo "Version: $VERSION"
echo "Architecture: $ARCH"
echo "=========================================="

# Create build directory
BUILD_DIR="${SCRIPT_DIR}/${PACKAGE}_${VERSION}_${ARCH}"
rm -rf "$BUILD_DIR"

# Create directory structure
mkdir -p "${BUILD_DIR}/DEBIAN"
mkdir -p "${BUILD_DIR}/usr/bin"
mkdir -p "${BUILD_DIR}/etc/systemd/system"
mkdir -p "${BUILD_DIR}/etc/patchiq-agent"

echo "✓ Created directory structure"

# Copy binary
if [ ! -f "${AGENT_ROOT}/dist/patchiq-agent-linux-amd64" ]; then
    echo "ERROR: Binary not found at ${AGENT_ROOT}/dist/patchiq-agent-linux-amd64"
    echo "Please build the agent first with: make build"
    exit 1
fi

cp "${AGENT_ROOT}/dist/patchiq-agent-linux-amd64" "${BUILD_DIR}/usr/bin/patchiq-agent"
chmod +x "${BUILD_DIR}/usr/bin/patchiq-agent"
echo "✓ Copied agent binary"

# Create systemd service file
cat > "${BUILD_DIR}/etc/systemd/system/patchiq-agent.service" <<EOF
[Unit]
Description=PatchIQ Agent for Patch and Software Management
Documentation=https://patchiq.io/docs
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/patchiq-agent
Restart=always
RestartSec=10
User=root

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/var/log /var/lib/patchiq-agent /etc/patchiq-agent

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=patchiq-agent

[Install]
WantedBy=multi-user.target
EOF
echo "✓ Created systemd service file"

# Create default configuration file (placeholder)
cat > "${BUILD_DIR}/etc/patchiq-agent/config.yaml" <<EOF
# PatchIQ Agent Configuration
# Edit this file to configure the agent

# Hub connection settings
hub:
  url: "https://your-hub-server:3000"
  api_key: ""

# Agent settings
agent:
  log_level: "info"
  data_dir: "/var/lib/patchiq-agent"
EOF
echo "✓ Created default configuration file"

# Create control file
cat > "${BUILD_DIR}/DEBIAN/control" <<EOF
Package: $PACKAGE
Version: $VERSION
Section: admin
Priority: optional
Architecture: $ARCH
Maintainer: PatchIQ <support@patchiq.io>
Description: PatchIQ Agent for Patch and Software Management
 The PatchIQ Agent provides automated patch management, software
 deployment, and system inventory collection for Linux systems.
 .
 Features:
  - Automated patch deployment
  - Software package management
  - System inventory collection
  - Centralized management via PatchIQ Hub
Depends: systemd, ca-certificates
Homepage: https://patchiq.io
EOF
echo "✓ Created control file"

# Create postinst script
cat > "${BUILD_DIR}/DEBIAN/postinst" <<'EOF'
#!/bin/bash
set -e

echo "Configuring PatchIQ Agent..."

# Create data directory
mkdir -p /var/lib/patchiq-agent
chmod 755 /var/lib/patchiq-agent

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable patchiq-agent.service
systemctl start patchiq-agent.service

echo ""
echo "=========================================="
echo "PatchIQ Agent installed successfully!"
echo "=========================================="
echo ""
echo "Service status:"
systemctl status patchiq-agent.service --no-pager || true
echo ""
echo "Configuration file: /etc/patchiq-agent/config.yaml"
echo "Logs: journalctl -u patchiq-agent -f"
echo ""
echo "To configure the agent, edit /etc/patchiq-agent/config.yaml"
echo "and restart the service: systemctl restart patchiq-agent"
echo ""

exit 0
EOF
chmod +x "${BUILD_DIR}/DEBIAN/postinst"
echo "✓ Created postinst script"

# Create prerm script
cat > "${BUILD_DIR}/DEBIAN/prerm" <<'EOF'
#!/bin/bash
set -e

echo "Stopping PatchIQ Agent..."

# Stop service
systemctl stop patchiq-agent.service || true
systemctl disable patchiq-agent.service || true

echo "PatchIQ Agent stopped and disabled"

exit 0
EOF
chmod +x "${BUILD_DIR}/DEBIAN/prerm"
echo "✓ Created prerm script"

# Create postrm script
cat > "${BUILD_DIR}/DEBIAN/postrm" <<'EOF'
#!/bin/bash
set -e

if [ "$1" = "purge" ]; then
    echo "Removing PatchIQ Agent data..."

    # Remove data directory
    rm -rf /var/lib/patchiq-agent

    # Remove configuration directory
    rm -rf /etc/patchiq-agent

    echo "PatchIQ Agent data removed"
fi

# Reload systemd
systemctl daemon-reload || true

exit 0
EOF
chmod +x "${BUILD_DIR}/DEBIAN/postrm"
echo "✓ Created postrm script"

# Build package
echo ""
echo "Building DEB package..."
dpkg-deb --build "$BUILD_DIR"

# Move to dist directory
mkdir -p "${AGENT_ROOT}/dist"
mv "${BUILD_DIR}.deb" "${AGENT_ROOT}/dist/"

# Clean up build directory
rm -rf "$BUILD_DIR"

echo ""
echo "=========================================="
echo "✓ DEB package created successfully!"
echo "=========================================="
echo "Package: ${AGENT_ROOT}/dist/${PACKAGE}_${VERSION}_${ARCH}.deb"
echo ""

# Validate with lintian if available
if command -v lintian &> /dev/null; then
    echo "Validating package with lintian..."
    lintian "${AGENT_ROOT}/dist/${PACKAGE}_${VERSION}_${ARCH}.deb" || true
    echo ""
fi

# Show package info
if command -v dpkg-deb &> /dev/null; then
    echo "Package information:"
    dpkg-deb -I "${AGENT_ROOT}/dist/${PACKAGE}_${VERSION}_${ARCH}.deb"
    echo ""
    echo "Package contents:"
    dpkg-deb -c "${AGENT_ROOT}/dist/${PACKAGE}_${VERSION}_${ARCH}.deb"
fi

echo ""
echo "Installation instructions:"
echo "  sudo dpkg -i ${AGENT_ROOT}/dist/${PACKAGE}_${VERSION}_${ARCH}.deb"
echo ""
echo "Or with apt (recommended for dependency resolution):"
echo "  sudo apt install ${AGENT_ROOT}/dist/${PACKAGE}_${VERSION}_${ARCH}.deb"
echo ""
