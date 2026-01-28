#!/bin/bash
set -e
echo "Installing Zoom ${ZOOM_VERSION}..."

if command -v apt-get &> /dev/null; then
    wget -O /tmp/zoom.deb "https://zoom.us/client/latest/zoom_amd64.deb"
    apt-get install -y /tmp/zoom.deb || apt-get install -f -y
    rm /tmp/zoom.deb
elif command -v dnf &> /dev/null; then
    wget -O /tmp/zoom.rpm "https://zoom.us/client/latest/zoom_x86_64.rpm"
    dnf install -y /tmp/zoom.rpm
    rm /tmp/zoom.rpm
fi

mkdir -p "${STATUS_DIR}"
echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Installed version: ${ZOOM_VERSION}" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"

echo "Zoom ${ZOOM_VERSION} installed successfully"
