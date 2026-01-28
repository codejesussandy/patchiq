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
