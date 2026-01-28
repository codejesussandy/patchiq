#!/bin/bash
# Populate Hub with test packages for Phase 5 testing
# Creates realistic bundles for applications and patches

set -e

BUNDLES_DIR="/home/patchiq/patchiq/test-bundles"
DIST_DIR="$BUNDLES_DIR/dist"

mkdir -p "$DIST_DIR"

echo "=== Creating Hub Test Packages ==="

# ============================================
# APPLICATIONS
# ============================================

# --- VS Code (Linux) ---
create_vscode_linux() {
    local pkg_dir="$BUNDLES_DIR/vscode-linux"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "vscode-linux-v1.96.0",
  "name": "vscode",
  "displayName": "Visual Studio Code",
  "version": "1.96.0",
  "vendor": "Microsoft",
  "category": "development",
  "platform": "linux",
  "architecture": "x64",
  "description": "Lightweight but powerful source code editor with built-in support for JavaScript, TypeScript and Node.js",
  "requiresRoot": true,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "VSCODE_VERSION": "1.96.0",
    "INSTALL_DIR": "/opt/vscode"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing Visual Studio Code ${VSCODE_VERSION}..."

# Check if already installed
if command -v code &> /dev/null; then
    CURRENT=$(code --version 2>/dev/null | head -1 || echo "unknown")
    echo "VS Code is already installed (version: $CURRENT)"
fi

# Detect package manager and install
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /tmp/packages.microsoft.gpg
    install -D -o root -g root -m 644 /tmp/packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list
    apt-get update
    apt-get install -y code
elif command -v dnf &> /dev/null; then
    # Fedora/RHEL
    rpm --import https://packages.microsoft.com/keys/microsoft.asc
    cat > /etc/yum.repos.d/vscode.repo << 'REPO'
[code]
name=Visual Studio Code
baseurl=https://packages.microsoft.com/yumrepos/vscode
enabled=1
gpgcheck=1
gpgkey=https://packages.microsoft.com/keys/microsoft.asc
REPO
    dnf install -y code
else
    echo "Unsupported package manager"
    exit 1
fi

# Create status file
mkdir -p /opt/vscode
echo "INSTALLED" > /opt/vscode/.status
echo "Installed version: ${VSCODE_VERSION}" >> /opt/vscode/.status
echo "Installed at: $(date)" >> /opt/vscode/.status

echo "VS Code ${VSCODE_VERSION} installed successfully"
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
echo "Updating Visual Studio Code to ${VSCODE_VERSION}..."

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y --only-upgrade code
elif command -v dnf &> /dev/null; then
    dnf update -y code
fi

echo "UPDATED" > /opt/vscode/.status
echo "Updated to version: ${VSCODE_VERSION}" >> /opt/vscode/.status
echo "Updated at: $(date)" >> /opt/vscode/.status

echo "VS Code updated successfully"
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back Visual Studio Code..."
echo "ROLLED_BACK" > /opt/vscode/.status
echo "Rolled back at: $(date)" >> /opt/vscode/.status
echo "Note: Package manager rollback requires manual intervention"
echo "VS Code rollback marker set"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "Uninstalling Visual Studio Code..."

if command -v apt-get &> /dev/null; then
    apt-get remove -y code
    rm -f /etc/apt/sources.list.d/vscode.list
elif command -v dnf &> /dev/null; then
    dnf remove -y code
    rm -f /etc/yum.repos.d/vscode.repo
fi

rm -rf /opt/vscode
echo "VS Code uninstalled successfully"
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/vscode-linux.tar.gz" -C "$pkg_dir" .
    echo "Created: vscode-linux.tar.gz"
}

# --- Slack (Linux) ---
create_slack_linux() {
    local pkg_dir="$BUNDLES_DIR/slack-linux"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "slack-linux-v4.36.140",
  "name": "slack",
  "displayName": "Slack",
  "version": "4.36.140",
  "vendor": "Salesforce",
  "category": "communication",
  "platform": "linux",
  "architecture": "x64",
  "description": "Slack brings the team together, wherever you are",
  "requiresRoot": true,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "SLACK_VERSION": "4.36.140",
    "STATUS_DIR": "/opt/slack-patchiq"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing Slack ${SLACK_VERSION}..."

if command -v snap &> /dev/null; then
    snap install slack --classic
elif command -v apt-get &> /dev/null; then
    wget -O /tmp/slack.deb "https://downloads.slack-edge.com/releases/linux/${SLACK_VERSION}/prod/x64/slack-desktop-${SLACK_VERSION}-amd64.deb"
    apt-get install -y /tmp/slack.deb
    rm /tmp/slack.deb
elif command -v dnf &> /dev/null; then
    wget -O /tmp/slack.rpm "https://downloads.slack-edge.com/releases/linux/${SLACK_VERSION}/prod/x64/slack-${SLACK_VERSION}-x86_64.rpm"
    dnf install -y /tmp/slack.rpm
    rm /tmp/slack.rpm
fi

mkdir -p "${STATUS_DIR}"
echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Installed version: ${SLACK_VERSION}" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"

echo "Slack ${SLACK_VERSION} installed successfully"
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
echo "Updating Slack to ${SLACK_VERSION}..."

if command -v snap &> /dev/null; then
    snap refresh slack
else
    # Re-run install for update
    $0/../install.sh
fi

echo "UPDATED" > "${STATUS_DIR}/.status"
echo "Updated to version: ${SLACK_VERSION}" >> "${STATUS_DIR}/.status"
echo "Updated at: $(date)" >> "${STATUS_DIR}/.status"

echo "Slack updated successfully"
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back Slack..."
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Slack rollback marker set"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "Uninstalling Slack..."

if command -v snap &> /dev/null && snap list | grep -q slack; then
    snap remove slack
elif command -v apt-get &> /dev/null; then
    apt-get remove -y slack-desktop
elif command -v dnf &> /dev/null; then
    dnf remove -y slack
fi

rm -rf "${STATUS_DIR}"
echo "Slack uninstalled successfully"
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/slack-linux.tar.gz" -C "$pkg_dir" .
    echo "Created: slack-linux.tar.gz"
}

# --- Zoom (Linux) ---
create_zoom_linux() {
    local pkg_dir="$BUNDLES_DIR/zoom-linux"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "zoom-linux-v6.2.6",
  "name": "zoom",
  "displayName": "Zoom",
  "version": "6.2.6",
  "vendor": "Zoom Video Communications",
  "category": "communication",
  "platform": "linux",
  "architecture": "x64",
  "description": "Zoom unified communications platform",
  "requiresRoot": true,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "ZOOM_VERSION": "6.2.6",
    "STATUS_DIR": "/opt/zoom-patchiq"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing Zoom ${ZOOM_VERSION}..."

if command -v apt-get &> /dev/null; then
    wget -O /tmp/zoom.deb "https://zoom.us/client/latest/zoom_amd64.deb"
    apt-get install -y /tmp/zoom.deb || apt-get install -f -y
    rm /tmp/zoom.deb
elif command -v dnf &> /dev/null; then
    wget -O /tmp/zoom.rpm "https://zoom.us/client/latest/zoom_x86_64.rpm"
    dnf install -y /tmp/zoom.rpm
    rm /tmp/zoom.rpm
fi

mkdir -p "${STATUS_DIR}"
echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Installed version: ${ZOOM_VERSION}" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"

echo "Zoom ${ZOOM_VERSION} installed successfully"
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
echo "Updating Zoom to ${ZOOM_VERSION}..."
# Re-run install for update
$(dirname "$0")/install.sh

echo "UPDATED" > "${STATUS_DIR}/.status"
echo "Updated to version: ${ZOOM_VERSION}" >> "${STATUS_DIR}/.status"
echo "Updated at: $(date)" >> "${STATUS_DIR}/.status"
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back Zoom..."
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Zoom rollback marker set"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "Uninstalling Zoom..."

if command -v apt-get &> /dev/null; then
    apt-get remove -y zoom
elif command -v dnf &> /dev/null; then
    dnf remove -y zoom
fi

rm -rf "${STATUS_DIR}"
echo "Zoom uninstalled successfully"
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/zoom-linux.tar.gz" -C "$pkg_dir" .
    echo "Created: zoom-linux.tar.gz"
}

# --- Node.js (Linux) ---
create_nodejs_linux() {
    local pkg_dir="$BUNDLES_DIR/nodejs-linux"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "nodejs-linux-v22.12.0",
  "name": "nodejs",
  "displayName": "Node.js LTS",
  "version": "22.12.0",
  "vendor": "OpenJS Foundation",
  "category": "runtime",
  "platform": "linux",
  "architecture": "x64",
  "description": "Node.js JavaScript runtime built on Chrome's V8 JavaScript engine",
  "requiresRoot": true,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "NODE_VERSION": "22.12.0",
    "NODE_MAJOR": "22",
    "STATUS_DIR": "/opt/nodejs-patchiq"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing Node.js ${NODE_VERSION}..."

if command -v apt-get &> /dev/null; then
    # Setup NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
    apt-get install -y nodejs
elif command -v dnf &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_${NODE_MAJOR}.x | bash -
    dnf install -y nodejs
fi

# Verify installation
node --version
npm --version

mkdir -p "${STATUS_DIR}"
echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Installed version: $(node --version)" >> "${STATUS_DIR}/.status"
echo "NPM version: $(npm --version)" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"

echo "Node.js ${NODE_VERSION} installed successfully"
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
echo "Updating Node.js to ${NODE_VERSION}..."

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y --only-upgrade nodejs
elif command -v dnf &> /dev/null; then
    dnf update -y nodejs
fi

echo "UPDATED" > "${STATUS_DIR}/.status"
echo "Updated to version: $(node --version)" >> "${STATUS_DIR}/.status"
echo "Updated at: $(date)" >> "${STATUS_DIR}/.status"
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back Node.js..."
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Node.js rollback marker set"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "Uninstalling Node.js..."

if command -v apt-get &> /dev/null; then
    apt-get remove -y nodejs
    rm -f /etc/apt/sources.list.d/nodesource.list
elif command -v dnf &> /dev/null; then
    dnf remove -y nodejs
fi

rm -rf "${STATUS_DIR}"
echo "Node.js uninstalled successfully"
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/nodejs-linux.tar.gz" -C "$pkg_dir" .
    echo "Created: nodejs-linux.tar.gz"
}

# --- Postman (Linux) ---
create_postman_linux() {
    local pkg_dir="$BUNDLES_DIR/postman-linux"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "postman-linux-v11.22.0",
  "name": "postman",
  "displayName": "Postman",
  "version": "11.22.0",
  "vendor": "Postman Inc",
  "category": "development",
  "platform": "linux",
  "architecture": "x64",
  "description": "API platform for building and using APIs",
  "requiresRoot": true,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "POSTMAN_VERSION": "11.22.0",
    "INSTALL_DIR": "/opt/Postman",
    "STATUS_DIR": "/opt/postman-patchiq"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing Postman ${POSTMAN_VERSION}..."

# Download and extract
wget -O /tmp/postman.tar.gz "https://dl.pstmn.io/download/latest/linux64"
tar -xzf /tmp/postman.tar.gz -C /opt/
rm /tmp/postman.tar.gz

# Create desktop entry
cat > /usr/share/applications/postman.desktop << 'DESKTOP'
[Desktop Entry]
Type=Application
Name=Postman
Icon=/opt/Postman/app/resources/app/assets/icon.png
Exec=/opt/Postman/Postman
Categories=Development;
DESKTOP

# Create symlink
ln -sf /opt/Postman/Postman /usr/local/bin/postman

mkdir -p "${STATUS_DIR}"
echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Installed version: ${POSTMAN_VERSION}" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"

echo "Postman ${POSTMAN_VERSION} installed successfully"
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
echo "Updating Postman to ${POSTMAN_VERSION}..."
rm -rf /opt/Postman
$(dirname "$0")/install.sh

echo "UPDATED" > "${STATUS_DIR}/.status"
echo "Updated to version: ${POSTMAN_VERSION}" >> "${STATUS_DIR}/.status"
echo "Updated at: $(date)" >> "${STATUS_DIR}/.status"
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back Postman..."
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Postman rollback marker set"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "Uninstalling Postman..."
rm -rf /opt/Postman
rm -f /usr/share/applications/postman.desktop
rm -f /usr/local/bin/postman
rm -rf "${STATUS_DIR}"
echo "Postman uninstalled successfully"
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/postman-linux.tar.gz" -C "$pkg_dir" .
    echo "Created: postman-linux.tar.gz"
}

# ============================================
# SECURITY PATCHES
# ============================================

# --- OpenSSL Security Update ---
create_openssl_patch() {
    local pkg_dir="$BUNDLES_DIR/openssl-patch"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "openssl-security-patch-3.0.15",
  "name": "openssl-patch",
  "displayName": "OpenSSL Security Update",
  "version": "3.0.15",
  "vendor": "OpenSSL",
  "category": "security-patch",
  "platform": "linux",
  "architecture": "x64",
  "description": "Critical security update for OpenSSL - addresses CVE-2024-5535 and CVE-2024-4741",
  "requiresRoot": true,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "OPENSSL_VERSION": "3.0.15",
    "CVE_IDS": "CVE-2024-5535,CVE-2024-4741",
    "STATUS_DIR": "/var/lib/patchiq/openssl-patch"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing OpenSSL Security Patch ${OPENSSL_VERSION}..."
echo "Addresses: ${CVE_IDS}"

# Backup current version info
mkdir -p "${STATUS_DIR}"
openssl version > "${STATUS_DIR}/pre-patch-version.txt" 2>/dev/null || true

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y --only-upgrade openssl libssl3
elif command -v dnf &> /dev/null; then
    dnf update -y openssl openssl-libs
elif command -v yum &> /dev/null; then
    yum update -y openssl openssl-libs
fi

# Verify and record
openssl version > "${STATUS_DIR}/post-patch-version.txt"

echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Patched to version: $(openssl version)" >> "${STATUS_DIR}/.status"
echo "CVEs addressed: ${CVE_IDS}" >> "${STATUS_DIR}/.status"
echo "Patched at: $(date)" >> "${STATUS_DIR}/.status"

echo "OpenSSL security patch applied successfully"
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
echo "Updating OpenSSL Security Patch..."
$(dirname "$0")/install.sh
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back OpenSSL Security Patch..."
echo "WARNING: Rollback of security patches is not recommended"
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Previous version was: $(cat ${STATUS_DIR}/pre-patch-version.txt)" >> "${STATUS_DIR}/.status"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "WARNING: Cannot uninstall OpenSSL - it is a system dependency"
echo "This operation is a no-op for security reasons"
exit 0
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/openssl-patch.tar.gz" -C "$pkg_dir" .
    echo "Created: openssl-patch.tar.gz"
}

# --- Curl Security Update ---
create_curl_patch() {
    local pkg_dir="$BUNDLES_DIR/curl-patch"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "curl-security-patch-8.11.1",
  "name": "curl-patch",
  "displayName": "Curl Security Update",
  "version": "8.11.1",
  "vendor": "curl",
  "category": "security-patch",
  "platform": "linux",
  "architecture": "x64",
  "description": "Security update for curl - addresses CVE-2024-9681 HTTP/2 vulnerability",
  "requiresRoot": true,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "CURL_VERSION": "8.11.1",
    "CVE_IDS": "CVE-2024-9681",
    "STATUS_DIR": "/var/lib/patchiq/curl-patch"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing Curl Security Patch ${CURL_VERSION}..."
echo "Addresses: ${CVE_IDS}"

mkdir -p "${STATUS_DIR}"
curl --version | head -1 > "${STATUS_DIR}/pre-patch-version.txt" 2>/dev/null || true

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y --only-upgrade curl libcurl4
elif command -v dnf &> /dev/null; then
    dnf update -y curl libcurl
elif command -v yum &> /dev/null; then
    yum update -y curl libcurl
fi

curl --version | head -1 > "${STATUS_DIR}/post-patch-version.txt"

echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Patched to version: $(curl --version | head -1)" >> "${STATUS_DIR}/.status"
echo "CVEs addressed: ${CVE_IDS}" >> "${STATUS_DIR}/.status"
echo "Patched at: $(date)" >> "${STATUS_DIR}/.status"

echo "Curl security patch applied successfully"
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
$(dirname "$0")/install.sh
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back Curl Security Patch..."
echo "WARNING: Rollback of security patches is not recommended"
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "WARNING: Cannot uninstall curl - it is a system dependency"
exit 0
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/curl-patch.tar.gz" -C "$pkg_dir" .
    echo "Created: curl-patch.tar.gz"
}

# --- Kernel Security Update ---
create_kernel_patch() {
    local pkg_dir="$BUNDLES_DIR/kernel-patch"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "linux-kernel-security-6.8.0-50",
  "name": "kernel-patch",
  "displayName": "Linux Kernel Security Update",
  "version": "6.8.0-50",
  "vendor": "Linux",
  "category": "security-patch",
  "platform": "linux",
  "architecture": "x64",
  "description": "Critical kernel security update - addresses multiple CVEs including privilege escalation vulnerabilities",
  "requiresRoot": true,
  "requiresReboot": true,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "KERNEL_VERSION": "6.8.0-50",
    "CVE_IDS": "CVE-2024-50302,CVE-2024-50264,CVE-2024-50267",
    "STATUS_DIR": "/var/lib/patchiq/kernel-patch"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing Linux Kernel Security Update ${KERNEL_VERSION}..."
echo "Addresses: ${CVE_IDS}"
echo "NOTE: System reboot will be required after installation"

mkdir -p "${STATUS_DIR}"
uname -r > "${STATUS_DIR}/pre-patch-version.txt"

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y linux-image-generic linux-headers-generic
elif command -v dnf &> /dev/null; then
    dnf update -y kernel kernel-headers
elif command -v yum &> /dev/null; then
    yum update -y kernel kernel-headers
fi

echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Current kernel: $(uname -r)" >> "${STATUS_DIR}/.status"
echo "Target kernel: ${KERNEL_VERSION}" >> "${STATUS_DIR}/.status"
echo "CVEs addressed: ${CVE_IDS}" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"
echo "REBOOT_REQUIRED: true" >> "${STATUS_DIR}/.status"

echo ""
echo "========================================="
echo "IMPORTANT: Kernel update installed"
echo "Please reboot the system to apply changes"
echo "========================================="
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
$(dirname "$0")/install.sh
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back Kernel Security Update..."
echo "Previous kernel version available in GRUB menu"
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
echo "Select previous kernel version during boot to complete rollback"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "WARNING: Cannot uninstall current kernel"
echo "Use GRUB boot menu to select previous kernel version"
exit 0
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/kernel-patch.tar.gz" -C "$pkg_dir" .
    echo "Created: kernel-patch.tar.gz"
}

# --- Sudo Security Update ---
create_sudo_patch() {
    local pkg_dir="$BUNDLES_DIR/sudo-patch"
    mkdir -p "$pkg_dir/scripts"

    cat > "$pkg_dir/manifest.json" << 'EOF'
{
  "id": "sudo-security-patch-1.9.16p2",
  "name": "sudo-patch",
  "displayName": "Sudo Security Update",
  "version": "1.9.16p2",
  "vendor": "Sudo",
  "category": "security-patch",
  "platform": "linux",
  "architecture": "x64",
  "description": "Security update for sudo - addresses privilege escalation vulnerability",
  "requiresRoot": true,
  "requiresReboot": false,
  "scripts": {
    "install": "scripts/install.sh",
    "update": "scripts/update.sh",
    "rollback": "scripts/rollback.sh",
    "uninstall": "scripts/uninstall.sh"
  },
  "environment": {
    "SUDO_VERSION": "1.9.16p2",
    "CVE_IDS": "CVE-2024-48568",
    "STATUS_DIR": "/var/lib/patchiq/sudo-patch"
  }
}
EOF

    cat > "$pkg_dir/scripts/install.sh" << 'EOF'
#!/bin/bash
set -e
echo "Installing Sudo Security Patch ${SUDO_VERSION}..."
echo "Addresses: ${CVE_IDS}"

mkdir -p "${STATUS_DIR}"
sudo --version | head -1 > "${STATUS_DIR}/pre-patch-version.txt" 2>/dev/null || true

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y --only-upgrade sudo
elif command -v dnf &> /dev/null; then
    dnf update -y sudo
elif command -v yum &> /dev/null; then
    yum update -y sudo
fi

sudo --version | head -1 > "${STATUS_DIR}/post-patch-version.txt"

echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Patched to version: $(sudo --version | head -1)" >> "${STATUS_DIR}/.status"
echo "CVEs addressed: ${CVE_IDS}" >> "${STATUS_DIR}/.status"
echo "Patched at: $(date)" >> "${STATUS_DIR}/.status"

echo "Sudo security patch applied successfully"
EOF

    cat > "$pkg_dir/scripts/update.sh" << 'EOF'
#!/bin/bash
set -e
$(dirname "$0")/install.sh
EOF

    cat > "$pkg_dir/scripts/rollback.sh" << 'EOF'
#!/bin/bash
set -e
echo "Rolling back Sudo Security Patch..."
echo "WARNING: Rollback of security patches is not recommended"
echo "ROLLED_BACK" > "${STATUS_DIR}/.status"
echo "Rolled back at: $(date)" >> "${STATUS_DIR}/.status"
EOF

    cat > "$pkg_dir/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
set -e
echo "WARNING: Cannot uninstall sudo - it is a critical system utility"
exit 0
EOF

    chmod +x "$pkg_dir/scripts/"*.sh
    tar -czf "$DIST_DIR/sudo-patch.tar.gz" -C "$pkg_dir" .
    echo "Created: sudo-patch.tar.gz"
}

# ============================================
# Build all bundles
# ============================================

echo ""
echo "Building application bundles..."
create_vscode_linux
create_slack_linux
create_zoom_linux
create_nodejs_linux
create_postman_linux

echo ""
echo "Building security patch bundles..."
create_openssl_patch
create_curl_patch
create_kernel_patch
create_sudo_patch

echo ""
echo "=== All bundles created ==="
ls -la "$DIST_DIR/"

echo ""
echo "Total bundles: $(ls -1 $DIST_DIR/*.tar.gz | wc -l)"
