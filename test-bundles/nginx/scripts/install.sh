#!/bin/bash
# Nginx Install Script - Hub Bundle
# Requires sudo/root privileges

set -e

echo "========================================="
echo "  Nginx Web Server - Install Script"
echo "========================================="
echo "Version: ${NGINX_VERSION:-latest}"
echo ""

# Detect package manager
if command -v apt-get &> /dev/null; then
    PKG_MGR="apt"
elif command -v dnf &> /dev/null; then
    PKG_MGR="dnf"
elif command -v yum &> /dev/null; then
    PKG_MGR="yum"
else
    echo "ERROR: No supported package manager found (apt, dnf, yum)"
    exit 1
fi

echo "Using package manager: $PKG_MGR"
echo ""

# Install nginx
case $PKG_MGR in
    apt)
        apt-get update -qq
        apt-get install -y nginx
        ;;
    dnf)
        dnf install -y nginx
        ;;
    yum)
        yum install -y nginx
        ;;
esac

# Verify installation
if command -v nginx &> /dev/null; then
    INSTALLED_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
    echo ""
    echo "Nginx installed successfully!"
    echo "Installed version: $INSTALLED_VERSION"
    echo ""

    # Start nginx service
    systemctl enable nginx 2>/dev/null || true
    systemctl start nginx 2>/dev/null || true

    echo "Nginx service started"
    exit 0
else
    echo "ERROR: Nginx installation failed"
    exit 1
fi
