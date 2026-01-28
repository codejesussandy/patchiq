#!/bin/bash
set -e
echo "Installing Linux Kernel Security Update ${KERNEL_VERSION}..."
echo "Addresses: ${CVE_IDS}"
echo "NOTE: System reboot will be required after installation"

mkdir -p "${STATUS_DIR}"
uname -r > "${STATUS_DIR}/pre-patch-version.txt"

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y linux-image-generic linux-headers-generic
elif command -v dnf &> /dev/null; then
    dnf update -y kernel kernel-headers
elif command -v yum &> /dev/null; then
    yum update -y kernel kernel-headers
fi

echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Current kernel: $(uname -r)" >> "${STATUS_DIR}/.status"
echo "Target kernel: ${KERNEL_VERSION}" >> "${STATUS_DIR}/.status"
echo "CVEs addressed: ${CVE_IDS}" >> "${STATUS_DIR}/.status"
echo "Installed at: $(date)" >> "${STATUS_DIR}/.status"
echo "REBOOT_REQUIRED: true" >> "${STATUS_DIR}/.status"

echo ""
echo "========================================="
echo "IMPORTANT: Kernel update installed"
echo "Please reboot the system to apply changes"
echo "========================================="
