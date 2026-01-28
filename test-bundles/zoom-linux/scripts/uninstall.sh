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
