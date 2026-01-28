#!/bin/bash
set -e
echo "Updating Postman to ${POSTMAN_VERSION}..."
rm -rf /opt/Postman
$(dirname "$0")/install.sh

echo "UPDATED" > "${STATUS_DIR}/.status"
echo "Updated to version: ${POSTMAN_VERSION}" >> "${STATUS_DIR}/.status"
echo "Updated at: $(date)" >> "${STATUS_DIR}/.status"
