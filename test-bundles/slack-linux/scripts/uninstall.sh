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
