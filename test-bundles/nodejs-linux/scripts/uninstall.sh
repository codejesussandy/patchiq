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
