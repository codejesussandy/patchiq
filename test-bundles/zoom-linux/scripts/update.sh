#!/bin/bash
set -e
echo "Updating Zoom to ${ZOOM_VERSION}..."
# Re-run install for update
$(dirname "$0")/install.sh

echo "UPDATED" > "${STATUS_DIR}/.status"
echo "Updated to version: ${ZOOM_VERSION}" >> "${STATUS_DIR}/.status"
echo "Updated at: $(date)" >> "${STATUS_DIR}/.status"
