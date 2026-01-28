#!/bin/bash
set -e
echo "Uninstalling Postman..."
rm -rf /opt/Postman
rm -f /usr/share/applications/postman.desktop
rm -f /usr/local/bin/postman
rm -rf "${STATUS_DIR}"
echo "Postman uninstalled successfully"
