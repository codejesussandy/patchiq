#!/bin/bash
#
# PatchIQ Agent - macOS PKG Installer Builder
#
# Usage:
#   ./build-pkg.sh [VERSION] [ARCH]
#
# Examples:
#   ./build-pkg.sh 0.1.0 arm64
#   ./build-pkg.sh 0.1.0 amd64
#   ./build-pkg.sh           # Defaults to 0.1.0 and current architecture
#
# Requirements:
#   - macOS with pkgbuild and productbuild
#   - Pre-built agent binary in ../../dist/
#   - Optional: Developer ID Installer certificate for signing
#
# Output:
#   - ../../dist/PatchIQAgent-{VERSION}-{ARCH}.pkg
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="${1:-0.1.0}"
ARCH="${2:-$(uname -m)}"
IDENTIFIER="io.patchiq.agent"
INSTALL_LOCATION="/"

# Normalize architecture names
case "$ARCH" in
    x86_64|amd64)
        ARCH="amd64"
        BINARY_ARCH="amd64"
        ;;
    arm64|aarch64)
        ARCH="arm64"
        BINARY_ARCH="arm64"
        ;;
    *)
        echo -e "${RED}Error: Unsupported architecture: $ARCH${NC}"
        echo "Supported: amd64, arm64"
        exit 1
        ;;
esac

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
PAYLOAD_DIR="$BUILD_DIR/payload"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
RESOURCES_DIR="$SCRIPT_DIR/resources"
DIST_DIR="$PROJECT_ROOT/dist"
OUTPUT_PKG="$DIST_DIR/PatchIQAgent-$VERSION-$ARCH.pkg"

# Agent binary path
AGENT_BINARY="$DIST_DIR/patchiq-agent-darwin-$BINARY_ARCH"

# Print banner
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PatchIQ Agent - macOS PKG Builder${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Version:      $VERSION${NC}"
echo -e "${YELLOW}Architecture: $ARCH${NC}"
echo -e "${YELLOW}Output:       $OUTPUT_PKG${NC}"
echo ""

# Validate agent binary exists
if [ ! -f "$AGENT_BINARY" ]; then
    echo -e "${RED}Error: Agent binary not found: $AGENT_BINARY${NC}"
    echo ""
    echo "Please build the agent first:"
    echo "  cd $PROJECT_ROOT"
    echo "  GOOS=darwin GOARCH=$BINARY_ARCH go build -o $AGENT_BINARY ./cmd/agent"
    exit 1
fi

echo -e "${GREEN}✓ Found agent binary: $AGENT_BINARY${NC}"

# Clean and create build directory
echo -e "${YELLOW}Preparing build directory...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$PAYLOAD_DIR/usr/local/bin"
mkdir -p "$PAYLOAD_DIR/Library/LaunchDaemons"
mkdir -p "$PAYLOAD_DIR/var/log/patchiq"

# Copy agent binary
echo -e "${YELLOW}Copying agent binary...${NC}"
cp "$AGENT_BINARY" "$PAYLOAD_DIR/usr/local/bin/patchiq-agent"
chmod +x "$PAYLOAD_DIR/usr/local/bin/patchiq-agent"
echo -e "${GREEN}✓ Agent binary copied${NC}"

# Create LaunchDaemon plist
echo -e "${YELLOW}Creating LaunchDaemon plist...${NC}"
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
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>/var/log/patchiq/agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/patchiq/agent-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
PLIST
echo -e "${GREEN}✓ LaunchDaemon plist created${NC}"

# Ensure scripts directory exists
mkdir -p "$SCRIPTS_DIR"

# Create preinstall script
echo -e "${YELLOW}Creating pre-install script...${NC}"
cat > "$SCRIPTS_DIR/preinstall" <<'PREINSTALL'
#!/bin/bash
#
# PatchIQ Agent - Pre-Install Script
#
# Runs before installation to stop existing agent
#

# Stop existing service if running
echo "Stopping existing PatchIQ Agent..."
launchctl stop io.patchiq.agent 2>/dev/null || true
launchctl unload /Library/LaunchDaemons/io.patchiq.agent.plist 2>/dev/null || true

echo "Pre-install complete."
exit 0
PREINSTALL
chmod +x "$SCRIPTS_DIR/preinstall"
echo -e "${GREEN}✓ Pre-install script created${NC}"

# Create postinstall script
echo -e "${YELLOW}Creating post-install script...${NC}"
cat > "$SCRIPTS_DIR/postinstall" <<'POSTINSTALL'
#!/bin/bash
#
# PatchIQ Agent - Post-Install Script
#
# Runs after installation to start agent service
#

set -e

# Create log directory if it doesn't exist
mkdir -p /var/log/patchiq
chmod 755 /var/log/patchiq

# Set proper permissions
chmod +x /usr/local/bin/patchiq-agent
chown root:wheel /usr/local/bin/patchiq-agent
chmod 644 /Library/LaunchDaemons/io.patchiq.agent.plist
chown root:wheel /Library/LaunchDaemons/io.patchiq.agent.plist

# Load and start LaunchDaemon (system-wide)
echo "Loading PatchIQ Agent daemon..."
launchctl load /Library/LaunchDaemons/io.patchiq.agent.plist
launchctl start io.patchiq.agent

echo ""
echo "PatchIQ Agent installed successfully!"
echo ""
echo "The agent is now running as a system daemon."
echo "Logs: /var/log/patchiq/agent.log"
echo ""
echo "To check status: launchctl list | grep patchiq"
echo "To stop:         launchctl stop io.patchiq.agent"
echo "To start:        launchctl start io.patchiq.agent"
echo ""

exit 0
POSTINSTALL
chmod +x "$SCRIPTS_DIR/postinstall"
echo -e "${GREEN}✓ Post-install script created${NC}"

# Create Distribution.xml
echo -e "${YELLOW}Creating Distribution.xml...${NC}"
cat > "$SCRIPT_DIR/Distribution.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
    <title>PatchIQ Agent</title>
    <organization>io.patchiq</organization>
    <domains enable_localSystem="true"/>
    <options customize="never" require-scripts="true" rootVolumeOnly="true"/>

    <!-- Define documents displayed at various steps -->
    <welcome file="welcome.html" mime-type="text/html"/>
    <license file="license.html" mime-type="text/html"/>
    <conclusion file="conclusion.html" mime-type="text/html"/>

    <!-- Define installation destinations -->
    <allowed-os-versions>
        <os-version min="10.13"/>
    </allowed-os-versions>

    <!-- List all component packages -->
    <pkg-ref id="$IDENTIFIER">
        <bundle-version>
            <bundle id="$IDENTIFIER" CFBundleShortVersionString="$VERSION"/>
        </bundle-version>
    </pkg-ref>

    <!-- Define the order of installation -->
    <choices-outline>
        <line choice="default">
            <line choice="$IDENTIFIER"/>
        </line>
    </choices-outline>

    <choice id="default"/>
    <choice id="$IDENTIFIER" visible="false">
        <pkg-ref id="$IDENTIFIER"/>
    </choice>

    <pkg-ref id="$IDENTIFIER" version="$VERSION" onConclusion="none">component.pkg</pkg-ref>
</installer-gui-script>
EOF
echo -e "${GREEN}✓ Distribution.xml created${NC}"

# Ensure resources directory exists
mkdir -p "$RESOURCES_DIR"

# Create welcome.html
echo -e "${YELLOW}Creating welcome screen...${NC}"
cat > "$RESOURCES_DIR/welcome.html" <<'HTML'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            color: #333;
            padding: 20px;
        }
        h1 {
            font-size: 24px;
            font-weight: 300;
            margin-bottom: 20px;
        }
        p {
            margin: 10px 0;
        }
        .version {
            color: #666;
            font-size: 12px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <h1>Welcome to PatchIQ Agent Installer</h1>

    <p>This installer will guide you through the installation of PatchIQ Agent on your Mac.</p>

    <p><strong>What is PatchIQ Agent?</strong></p>
    <p>PatchIQ Agent provides automated patch management, software deployment, and system inventory collection for your Mac. It connects to your PatchIQ Hub for centralized management.</p>

    <p><strong>What will be installed:</strong></p>
    <ul>
        <li>PatchIQ Agent binary at /usr/local/bin/patchiq-agent</li>
        <li>LaunchDaemon for system-wide automatic startup</li>
        <li>Log directory at /var/log/patchiq</li>
    </ul>

    <p><strong>System Requirements:</strong></p>
    <ul>
        <li>macOS 10.13 (High Sierra) or later</li>
        <li>50 MB available disk space</li>
        <li>Network connectivity to PatchIQ Hub</li>
    </ul>

    <div class="version">PatchIQ Agent Installer</div>
</body>
</html>
HTML
echo -e "${GREEN}✓ Welcome screen created${NC}"

# Create license.html
echo -e "${YELLOW}Creating license screen...${NC}"
cat > "$RESOURCES_DIR/license.html" <<'HTML'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }
        h1 {
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 20px;
        }
        h2 {
            font-size: 14px;
            font-weight: 500;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        p {
            margin: 10px 0;
        }
        .copyright {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
    </style>
</head>
<body>
    <h1>PatchIQ Agent Software License Agreement</h1>

    <p>PLEASE READ THIS SOFTWARE LICENSE AGREEMENT CAREFULLY BEFORE USING THE SOFTWARE. BY USING THE SOFTWARE, YOU ARE AGREEING TO BE BOUND BY THE TERMS OF THIS LICENSE.</p>

    <h2>1. License Grant</h2>
    <p>PatchIQ grants you a non-exclusive, non-transferable license to use the PatchIQ Agent software on your computer system for the purposes of patch management and system administration.</p>

    <h2>2. Restrictions</h2>
    <p>You may not:</p>
    <ul>
        <li>Modify, reverse engineer, or decompile the software</li>
        <li>Redistribute or resell the software</li>
        <li>Use the software for illegal purposes</li>
        <li>Remove or alter any proprietary notices</li>
    </ul>

    <h2>3. Ownership</h2>
    <p>PatchIQ retains all rights, title, and interest in and to the software. This license does not grant you any rights to trademarks or service marks.</p>

    <h2>4. Data Collection</h2>
    <p>The PatchIQ Agent collects system information including hardware inventory, installed software, and patch status. This data is transmitted to your PatchIQ Hub for management purposes.</p>

    <h2>5. Warranty Disclaimer</h2>
    <p>THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.</p>

    <h2>6. Limitation of Liability</h2>
    <p>IN NO EVENT SHALL PATCHIQ BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE SOFTWARE.</p>

    <h2>7. Termination</h2>
    <p>This license is effective until terminated. Your rights under this license will terminate automatically if you fail to comply with any terms.</p>

    <div class="copyright">
        <p>Copyright © 2026 PatchIQ. All rights reserved.</p>
    </div>
</body>
</html>
HTML
echo -e "${GREEN}✓ License screen created${NC}"

# Create conclusion.html
echo -e "${YELLOW}Creating conclusion screen...${NC}"
cat > "$RESOURCES_DIR/conclusion.html" <<'HTML'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            color: #333;
            padding: 20px;
        }
        h1 {
            font-size: 24px;
            font-weight: 300;
            margin-bottom: 20px;
            color: #007AFF;
        }
        p {
            margin: 10px 0;
        }
        .success {
            background-color: #E8F5E9;
            border-left: 4px solid #4CAF50;
            padding: 15px;
            margin: 20px 0;
        }
        .next-steps {
            background-color: #E3F2FD;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
        }
        code {
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: Monaco, Menlo, monospace;
            font-size: 12px;
        }
        .command {
            background-color: #2d2d2d;
            color: #f8f8f2;
            padding: 10px;
            border-radius: 5px;
            font-family: Monaco, Menlo, monospace;
            font-size: 12px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <h1>Installation Complete!</h1>

    <div class="success">
        <p><strong>✓ PatchIQ Agent has been successfully installed</strong></p>
        <p>The agent is now running in the background and will start automatically on system boot.</p>
    </div>

    <div class="next-steps">
        <p><strong>Next Steps:</strong></p>
        <ol>
            <li>Configure the agent to connect to your PatchIQ Hub</li>
            <li>Register this system with your organization</li>
            <li>Monitor patch status from the PatchIQ dashboard</li>
        </ol>
    </div>

    <p><strong>Useful Commands:</strong></p>

    <p>Check agent status:</p>
    <div class="command">launchctl list | grep patchiq</div>

    <p>View logs:</p>
    <div class="command">tail -f /var/log/patchiq/agent.log</div>

    <p>Stop the agent:</p>
    <div class="command">launchctl stop io.patchiq.agent</div>

    <p>Start the agent:</p>
    <div class="command">launchctl start io.patchiq.agent</div>

    <p><strong>Uninstall:</strong></p>
    <p>To remove PatchIQ Agent, run:</p>
    <div class="command">sudo /usr/local/bin/patchiq-agent-uninstall.sh</div>

    <p><strong>Documentation:</strong></p>
    <p>For more information, visit: <a href="https://docs.patchiq.io">docs.patchiq.io</a></p>

    <p><strong>Support:</strong></p>
    <p>Need help? Contact support@patchiq.io</p>
</body>
</html>
HTML
echo -e "${GREEN}✓ Conclusion screen created${NC}"

# Build component package
echo ""
echo -e "${YELLOW}Building component package...${NC}"
pkgbuild \
    --root "$PAYLOAD_DIR" \
    --scripts "$SCRIPTS_DIR" \
    --identifier "$IDENTIFIER" \
    --version "$VERSION" \
    --install-location "$INSTALL_LOCATION" \
    "$BUILD_DIR/component.pkg"

echo -e "${GREEN}✓ Component package built${NC}"

# Build product package with Distribution.xml
echo -e "${YELLOW}Building product package...${NC}"
productbuild \
    --distribution "$SCRIPT_DIR/Distribution.xml" \
    --package-path "$BUILD_DIR" \
    --resources "$RESOURCES_DIR" \
    "$OUTPUT_PKG"

echo -e "${GREEN}✓ Product package built${NC}"

# Sign package if certificate is available
if [ -n "${DEVELOPER_ID_INSTALLER:-}" ]; then
    echo ""
    echo -e "${YELLOW}Signing package with Developer ID...${NC}"

    SIGNED_PKG="${OUTPUT_PKG%.pkg}-signed.pkg"
    productsign --sign "$DEVELOPER_ID_INSTALLER" \
                "$OUTPUT_PKG" \
                "$SIGNED_PKG"

    # Replace unsigned with signed
    mv "$SIGNED_PKG" "$OUTPUT_PKG"

    echo -e "${GREEN}✓ Package signed successfully${NC}"

    # Verify signature
    pkgutil --check-signature "$OUTPUT_PKG"
elif [ -n "${CODESIGN_IDENTITY:-}" ]; then
    echo ""
    echo -e "${YELLOW}Signing package with codesign identity...${NC}"

    SIGNED_PKG="${OUTPUT_PKG%.pkg}-signed.pkg"
    productsign --sign "$CODESIGN_IDENTITY" \
                "$OUTPUT_PKG" \
                "$SIGNED_PKG"

    # Replace unsigned with signed
    mv "$SIGNED_PKG" "$OUTPUT_PKG"

    echo -e "${GREEN}✓ Package signed successfully${NC}"

    # Verify signature
    pkgutil --check-signature "$OUTPUT_PKG"
else
    echo ""
    echo -e "${YELLOW}Note: Package not signed (no certificate specified)${NC}"
    echo "To sign later, set DEVELOPER_ID_INSTALLER or CODESIGN_IDENTITY environment variable"
    echo ""
    echo "Example:"
    echo "  export DEVELOPER_ID_INSTALLER=\"Developer ID Installer: Company Name (TEAM_ID)\""
    echo "  ./build-pkg.sh $VERSION $ARCH"
fi

# Get package size
PKG_SIZE=$(du -h "$OUTPUT_PKG" | cut -f1)

# Print summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Build Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ PKG installer created successfully${NC}"
echo ""
echo "Output:  $OUTPUT_PKG"
echo "Size:    $PKG_SIZE"
echo "Version: $VERSION"
echo "Arch:    $ARCH"
echo ""
echo "Installation:"
echo "  sudo installer -pkg $OUTPUT_PKG -target /"
echo ""
echo "Or double-click the PKG file to install via GUI."
echo ""

# Cleanup build directory
echo -e "${YELLOW}Cleaning up build directory...${NC}"
rm -rf "$BUILD_DIR"
echo -e "${GREEN}✓ Build directory cleaned${NC}"
echo ""
