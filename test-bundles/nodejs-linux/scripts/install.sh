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
