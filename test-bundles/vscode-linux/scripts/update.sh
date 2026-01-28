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
