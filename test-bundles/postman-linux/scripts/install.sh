#!/bin/bash
set -e
echo "Installing Postman ${POSTMAN_VERSION}..."

# Download and extract
wget -O /tmp/postman.tar.gz "https://dl.pstmn.io/download/latest/linux64"
tar -xzf /tmp/postman.tar.gz -C /opt/
rm /tmp/postman.tar.gz

# Create desktop entry
cat > /usr/share/applications/postman.desktop << 'DESKTOP'
[Desktop Entry]
Type=Application
Name=Postman
Icon=/opt/Postman/app/resources/app/assets/icon.png
Exec=/opt/Postman/Postman
Categories=Development;
DESKTOP

# Create symlink
ln -sf /opt/Postman/Postman /usr/local/bin/postman

mkdir -p "${STATUS_DIR}"
echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Installed version: ${POSTMAN_VERSION}" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"

echo "Postman ${POSTMAN_VERSION} installed successfully"
