#!/bin/bash
# Download patch files for the 5 test applications
# Stores them in data/patch-files/ for local caching
# These files can be uploaded to MinIO for the full pipeline test

set -e

DATA_DIR="$(cd "$(dirname "$0")/../../data/patch-files" && pwd)"
mkdir -p "$DATA_DIR"

echo "=== Downloading Patch Files ==="
echo "Target directory: $DATA_DIR"
echo ""

download() {
  local name="$1"
  local url="$2"
  local file="$DATA_DIR/$name"

  if [ -f "$file" ]; then
    echo "  [SKIP] $name (already exists, $(du -h "$file" | cut -f1))"
    return 0
  fi

  echo "  [DOWNLOAD] $name from $url..."
  if curl -fsSL --connect-timeout 30 --max-time 300 -o "$file" "$url"; then
    echo "  [OK] $name ($(du -h "$file" | cut -f1))"
  else
    echo "  [FAIL] $name - download failed"
    rm -f "$file"
    return 1
  fi
}

# 7-Zip 25.00 (patched) - ~1.5 MB
download "7z2500-x64.exe" "https://www.7-zip.org/a/7z2500-x64.exe"

# Notepad++ 8.8.9 (patched) - ~6.5 MB
download "npp.8.8.9.Installer.x64.exe" "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.8.9/npp.8.8.9.Installer.x64.exe"

# OpenSSL 3.0.16 (latest 3.0.x available) - ~15 MB
# Note: 3.0.19 might not exist yet on openssl.org, using latest available
download "openssl-3.0.16.tar.gz" "https://github.com/openssl/openssl/releases/download/openssl-3.0.16/openssl-3.0.16.tar.gz" || \
download "openssl-3.0.15.tar.gz" "https://www.openssl.org/source/openssl-3.0.15.tar.gz" || \
echo "  [WARN] Could not download OpenSSL - check available versions"

# Node.js 20.18.1 (latest 20.x LTS) - ~32 MB
download "node-v20.18.1-x64.msi" "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi" || \
download "node-v20.18.0-x64.msi" "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi" || \
echo "  [WARN] Could not download Node.js - check available versions"

# Firefox 128.0 ESR - ~75 MB (skip by default, very large)
echo ""
echo "  [INFO] Firefox 128.0 ESR (~75 MB) - skipping by default"
echo "  To download: curl -fsSL -o '$DATA_DIR/Firefox_Setup_128.0esr.msi' 'https://archive.mozilla.org/pub/firefox/releases/128.0esr/win64/en-US/Firefox%20Setup%20128.0esr.msi'"

echo ""
echo "=== Download Summary ==="
ls -lh "$DATA_DIR/" 2>/dev/null || echo "  No files downloaded"
echo ""
echo "Total size: $(du -sh "$DATA_DIR" | cut -f1)"
