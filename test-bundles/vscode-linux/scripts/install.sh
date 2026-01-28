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
