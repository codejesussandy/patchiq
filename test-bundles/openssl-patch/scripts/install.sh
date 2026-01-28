#!/bin/bash
set -e
echo "Installing OpenSSL Security Patch ${OPENSSL_VERSION}..."
echo "Addresses: ${CVE_IDS}"

# Backup current version info
mkdir -p "${STATUS_DIR}"
openssl version > "${STATUS_DIR}/pre-patch-version.txt" 2>/dev/null || true

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y --only-upgrade openssl libssl3
elif command -v dnf &> /dev/null; then
    dnf update -y openssl openssl-libs
elif command -v yum &> /dev/null; then
    yum update -y openssl openssl-libs
fi

# Verify and record
openssl version > "${STATUS_DIR}/post-patch-version.txt"

echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Patched to version: $(openssl version)" >> "${STATUS_DIR}/.status"
echo "CVEs addressed: ${CVE_IDS}" >> "${STATUS_DIR}/.status"
echo "Patched at: $(date)" >> "${STATUS_DIR}/.status"

echo "OpenSSL security patch applied successfully"
