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
