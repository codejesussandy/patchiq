#!/bin/bash
set -e
echo "Installing Curl Security Patch ${CURL_VERSION}..."
echo "Addresses: ${CVE_IDS}"

mkdir -p "${STATUS_DIR}"
curl --version | head -1 > "${STATUS_DIR}/pre-patch-version.txt" 2>/dev/null || true

if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y --only-upgrade curl libcurl4
elif command -v dnf &> /dev/null; then
    dnf update -y curl libcurl
elif command -v yum &> /dev/null; then
    yum update -y curl libcurl
fi

curl --version | head -1 > "${STATUS_DIR}/post-patch-version.txt"

echo "INSTALLED" > "${STATUS_DIR}/.status"
echo "Patched to version: $(curl --version | head -1)" >> "${STATUS_DIR}/.status"
echo "CVEs addressed: ${CVE_IDS}" >> "${STATUS_DIR}/.status"
echo "Patched at: $(date)" >> "${STATUS_DIR}/.status"

echo "Curl security patch applied successfully"
