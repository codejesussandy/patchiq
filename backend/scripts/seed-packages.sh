#!/usr/bin/env bash
# Seed the Hub with real software packages — downloads actual binaries and uploads as bundles to MinIO
set -euo pipefail

BASE_URL="${API_BASE:-http://localhost:3500}"
WORK_DIR=$(mktemp -d)
CREATED=0
FAILED=0
SKIPPED=0

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

# ---------- Prerequisites ----------
for cmd in curl tar jq shasum; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not found"
    exit 1
  fi
done

# ---------- Auth ----------
echo "Logging in to $BASE_URL ..."
TOKEN=$(curl -sf "$BASE_URL/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@patchiq.io","password":"admin123"}' \
  | jq -r '.data.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: Failed to get auth token. Is the backend running?"
  exit 1
fi
echo "Authenticated."
echo ""

# ==========================================================
# upload_bundle <pkg_dir>
#   pkg_dir must contain manifest.json, scripts/, and files/
# ==========================================================
upload_bundle() {
  local pkg_dir="$1"
  local display_name
  display_name=$(jq -r '.displayName' "$pkg_dir/manifest.json")

  # Create tar.gz
  local bundle_file="$WORK_DIR/bundle.tar.gz"
  tar -czf "$bundle_file" -C "$pkg_dir" .

  local size
  size=$(du -h "$bundle_file" | cut -f1)
  echo "  Uploading bundle ($size) ..."

  local resp
  resp=$(curl -sf -X POST "$BASE_URL/v1/hub/packages/upload-bundle" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$bundle_file;filename=bundle.tar.gz;type=application/gzip" 2>&1) || true

  if echo "$resp" | jq -e '.success' &>/dev/null; then
    local pid
    pid=$(echo "$resp" | jq -r '.data.packageId')
    echo "  [OK] $display_name -> $pid"
    CREATED=$((CREATED + 1))
  else
    local err
    err=$(echo "$resp" | jq -r '.error.message // .message // "unknown error"' 2>/dev/null || echo "unknown error")
    echo "  [FAIL] $display_name — $err"
    FAILED=$((FAILED + 1))
  fi

  rm -f "$bundle_file"
}

# ==========================================================
# build_and_upload <name> <display> <version> <vendor>
#   <category> <platform> <arch> <download_url> <filename>
#   <install_script> <uninstall_script> <description>
#   [requires_reboot] [requires_root]
# ==========================================================
build_and_upload() {
  local name="$1"
  local display_name="$2"
  local version="$3"
  local vendor="$4"
  local category="$5"
  local platform="$6"
  local arch="$7"
  local download_url="$8"
  local filename="$9"
  local install_script="${10}"
  local uninstall_script="${11}"
  local description="${12}"
  local requires_reboot="${13:-false}"
  local requires_root="${14:-false}"

  echo "[$name] Downloading $display_name v$version ..."

  local pkg_dir="$WORK_DIR/$name"
  mkdir -p "$pkg_dir/scripts" "$pkg_dir/files"

  # Download binary
  if ! curl -fL --progress-bar -o "$pkg_dir/files/$filename" "$download_url"; then
    echo "  [SKIP] Download failed for $display_name"
    SKIPPED=$((SKIPPED + 1))
    rm -rf "$pkg_dir"
    return
  fi

  local file_size
  file_size=$(wc -c < "$pkg_dir/files/$filename" | tr -d ' ')
  local file_size_mb
  file_size_mb=$(echo "scale=1; $file_size / 1048576" | bc)
  echo "  Downloaded ${file_size_mb}MB"

  # Write install script
  cat > "$pkg_dir/scripts/install.sh" <<SCRIPT_EOF
#!/bin/bash
set -e
$install_script
SCRIPT_EOF
  chmod +x "$pkg_dir/scripts/install.sh"

  # Write uninstall script
  cat > "$pkg_dir/scripts/uninstall.sh" <<SCRIPT_EOF
#!/bin/bash
set -e
$uninstall_script
SCRIPT_EOF
  chmod +x "$pkg_dir/scripts/uninstall.sh"

  # Write manifest.json
  jq -n \
    --arg name "$name" \
    --arg displayName "$display_name" \
    --arg version "$version" \
    --arg vendor "$vendor" \
    --arg category "$category" \
    --arg platform "$platform" \
    --arg arch "$arch" \
    --arg description "$description" \
    --argjson requiresReboot "$requires_reboot" \
    --argjson requiresRoot "$requires_root" \
    --arg filename "$filename" \
    '{
      name: $name,
      displayName: $displayName,
      version: $version,
      vendor: $vendor,
      category: $category,
      platform: $platform,
      architecture: $arch,
      description: $description,
      requiresReboot: $requiresReboot,
      requiresRoot: $requiresRoot,
      scripts: {
        install: "scripts/install.sh",
        uninstall: "scripts/uninstall.sh"
      },
      files: [$filename],
      environment: {
        INSTALLER_FILE: $filename
      }
    }' > "$pkg_dir/manifest.json"

  upload_bundle "$pkg_dir"
  rm -rf "$pkg_dir"
}

# ==========================================================
# Package Definitions
# ==========================================================

echo "=== [1/7] 7-Zip (Windows) ==="
build_and_upload \
  "7zip" \
  "7-Zip" \
  "24.09" \
  "Igor Pavlov" \
  "utility" \
  "windows" \
  "x64" \
  "https://7-zip.org/a/7z2409-x64.exe" \
  "7z2409-x64.exe" \
  'INSTALLER="$PATCHIQ_WORK_DIR/files/$INSTALLER_FILE"
"$INSTALLER" /S' \
  '"C:\Program Files\7-Zip\Uninstall.exe" /S' \
  "High compression ratio file archiver. Supports 7z, ZIP, GZIP, BZIP2, TAR formats."
echo ""

echo "=== [2/7] Notepad++ (Windows) ==="
build_and_upload \
  "notepad-plus-plus" \
  "Notepad++" \
  "8.7.1" \
  "Notepad++ Team" \
  "utility" \
  "windows" \
  "x64" \
  "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.7.1/npp.8.7.1.Installer.x64.exe" \
  "npp.8.7.1.Installer.x64.exe" \
  'INSTALLER="$PATCHIQ_WORK_DIR/files/$INSTALLER_FILE"
"$INSTALLER" /S' \
  '"C:\Program Files\Notepad++\uninstall.exe" /S' \
  "Free source code editor supporting several programming languages."
echo ""

echo "=== [3/7] Node.js 22 LTS (Linux) ==="
build_and_upload \
  "nodejs-lts-linux" \
  "Node.js LTS" \
  "22.12.0" \
  "OpenJS Foundation" \
  "runtime" \
  "linux" \
  "x64" \
  "https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz" \
  "node-v22.12.0-linux-x64.tar.xz" \
  'tar -xf "$PATCHIQ_WORK_DIR/files/$INSTALLER_FILE" -C /usr/local --strip-components=1' \
  'rm -f /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx
rm -rf /usr/local/lib/node_modules' \
  "JavaScript runtime built on V8 engine. LTS release for production environments." \
  "false" \
  "true"
echo ""

echo "=== [4/7] Google Chrome (Linux) ==="
build_and_upload \
  "google-chrome-linux" \
  "Google Chrome" \
  "131.0.6778.204" \
  "Google" \
  "browser" \
  "linux" \
  "x64" \
  "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb" \
  "google-chrome-stable_current_amd64.deb" \
  'apt-get install -y "$PATCHIQ_WORK_DIR/files/$INSTALLER_FILE"' \
  'apt-get remove -y google-chrome-stable' \
  "Fast, secure web browser by Google. Enterprise-managed deployment." \
  "false" \
  "true"
echo ""

echo "=== [5/7] Python 3 (Windows) ==="
build_and_upload \
  "python3" \
  "Python 3" \
  "3.13.1" \
  "Python Software Foundation" \
  "runtime" \
  "windows" \
  "x64" \
  "https://www.python.org/ftp/python/3.13.1/python-3.13.1-amd64.exe" \
  "python-3.13.1-amd64.exe" \
  'INSTALLER="$PATCHIQ_WORK_DIR/files/$INSTALLER_FILE"
"$INSTALLER" /quiet InstallAllUsers=1 PrependPath=1' \
  'python-3.13.1-amd64.exe /quiet /uninstall' \
  "Popular general-purpose programming language. Includes pip package manager." \
  "false" \
  "false"
echo ""

echo "=== [6/7] AWS CLI v2 (Linux) ==="
build_and_upload \
  "aws-cli-linux" \
  "AWS CLI v2" \
  "2.22.12" \
  "Amazon Web Services" \
  "cloud" \
  "linux" \
  "x64" \
  "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" \
  "awscli-exe-linux-x86_64.zip" \
  'cd "$PATCHIQ_WORK_DIR/files"
unzip -o "$INSTALLER_FILE"
./aws/install --update' \
  'rm -rf /usr/local/aws-cli /usr/local/bin/aws' \
  "Official AWS command line interface for managing AWS services." \
  "false" \
  "true"
echo ""

echo "=== [7/7] Git for Windows ==="
build_and_upload \
  "git-windows" \
  "Git for Windows" \
  "2.47.1" \
  "Git" \
  "development" \
  "windows" \
  "x64" \
  "https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe" \
  "Git-2.47.1-64-bit.exe" \
  'INSTALLER="$PATCHIQ_WORK_DIR/files/$INSTALLER_FILE"
"$INSTALLER" /VERYSILENT /NORESTART' \
  '"C:\Program Files\Git\unins000.exe" /VERYSILENT' \
  "Distributed version control system. Essential developer tool."
echo ""

# ==========================================================
# Summary
# ==========================================================
echo "========================================"
echo "DONE"
echo "  Created : $CREATED"
echo "  Failed  : $FAILED"
echo "  Skipped : $SKIPPED (download failures)"
echo "========================================"

if [ "$FAILED" -gt 0 ] || [ "$SKIPPED" -gt 0 ]; then
  exit 1
fi
