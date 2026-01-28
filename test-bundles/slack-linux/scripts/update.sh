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
