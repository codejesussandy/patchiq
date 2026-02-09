#!/bin/bash
#
# Upload Downloaded Software to PatchIQ Hub
# Uploads files to MinIO and creates package records
#

set -e

DOWNLOAD_DIR="./software-downloads"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
AUTH_TOKEN="${PATCHIQ_TOKEN:-}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Upload Software to PatchIQ Hub${NC}"
echo -e "${BLUE}========================================${NC}"

# Check for auth token
if [[ -z "$AUTH_TOKEN" ]]; then
    echo -e "${RED}Error: PATCHIQ_TOKEN environment variable not set${NC}"
    echo "Set it with: export PATCHIQ_TOKEN='your-jwt-token'"
    exit 1
fi

# Function to upload file to MinIO via backend
upload_file() {
    local file_path="$1"
    local package_id="$2"
    local filename=$(basename "$file_path")

    echo -e "${YELLOW}Uploading: ${filename}${NC}"

    local checksum=$(sha256sum "$file_path" | cut -d' ' -f1)
    local file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path")

    # Upload via MinIO API (through backend proxy)
    curl -X POST "$BACKEND_URL/v1/hub/packages/$package_id/bundle" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$file_path" \
        -F "checksum=$checksum" \
        -s | jq -r '.success'

    echo -e "${GREEN}  ✓ Uploaded (${file_size} bytes)${NC}"
}

# Function to create package record
create_package() {
    local package_id="$1"
    local name="$2"
    local display_name="$3"
    local version="$4"
    local platform="$5"
    local category="$6"
    local vendor="$7"

    echo -e "${BLUE}Creating package: ${display_name}${NC}"

    curl -X POST "$BACKEND_URL/v1/hub/packages" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d @- <<EOF | jq -r '.packageId // "error"'
{
    "packageId": "$package_id",
    "name": "$name",
    "displayName": "$display_name",
    "version": "$version",
    "platform": "$platform",
    "category": "$category",
    "vendor": "$vendor",
    "installSource": "bundle",
    "requiresRoot": true,
    "requiresReboot": false,
    "isActive": true
}
EOF

    echo -e "${GREEN}  ✓ Package created${NC}"
}

# ===========================================
# UPLOAD WINDOWS SOFTWARE
# ===========================================

upload_windows() {
    echo -e "\n${BLUE}=== Uploading Windows Software ===${NC}\n"

    # Chrome
    if [[ -f "$DOWNLOAD_DIR/windows/browsers/ChromeStandaloneSetup64.exe" ]]; then
        create_package "chrome-win-latest" "chrome" "Google Chrome" "latest" "windows" "browser" "Google"
        upload_file "$DOWNLOAD_DIR/windows/browsers/ChromeStandaloneSetup64.exe" "chrome-win-latest"
    fi

    # Firefox
    if [[ -f "$DOWNLOAD_DIR/windows/browsers/Firefox-Setup.exe" ]]; then
        create_package "firefox-win-latest" "firefox" "Mozilla Firefox" "latest" "windows" "browser" "Mozilla"
        upload_file "$DOWNLOAD_DIR/windows/browsers/Firefox-Setup.exe" "firefox-win-latest"
    fi

    # 7-Zip
    if [[ -f "$DOWNLOAD_DIR/windows/utilities/7z2301-x64.exe" ]]; then
        create_package "7zip-win-23.01" "7zip" "7-Zip" "23.01" "windows" "utility" "7-Zip"
        upload_file "$DOWNLOAD_DIR/windows/utilities/7z2301-x64.exe" "7zip-win-23.01"
    fi

    # VSCode
    if [[ -f "$DOWNLOAD_DIR/windows/development/VSCodeUserSetup-x64.exe" ]]; then
        create_package "vscode-win-latest" "code" "Visual Studio Code" "latest" "windows" "utility" "Microsoft"
        upload_file "$DOWNLOAD_DIR/windows/development/VSCodeUserSetup-x64.exe" "vscode-win-latest"
    fi

    # Git
    if [[ -f "$DOWNLOAD_DIR/windows/development/Git-2.43.0-64-bit.exe" ]]; then
        create_package "git-win-2.43" "git" "Git for Windows" "2.43.0" "windows" "utility" "Git"
        upload_file "$DOWNLOAD_DIR/windows/development/Git-2.43.0-64-bit.exe" "git-win-2.43"
    fi

    # VLC
    if [[ -f "$DOWNLOAD_DIR/windows/utilities/vlc-win64.exe" ]]; then
        create_package "vlc-win-latest" "vlc" "VLC Media Player" "latest" "windows" "utility" "VideoLAN"
        upload_file "$DOWNLOAD_DIR/windows/utilities/vlc-win64.exe" "vlc-win-latest"
    fi
}

# ===========================================
# UPLOAD LINUX SOFTWARE
# ===========================================

upload_linux() {
    echo -e "\n${BLUE}=== Uploading Linux Software ===${NC}\n"

    # Chrome
    if [[ -f "$DOWNLOAD_DIR/linux/browsers/google-chrome-stable_current_amd64.deb" ]]; then
        create_package "chrome-linux-latest" "google-chrome-stable" "Google Chrome" "latest" "linux" "browser" "Google"
        upload_file "$DOWNLOAD_DIR/linux/browsers/google-chrome-stable_current_amd64.deb" "chrome-linux-latest"
    fi

    # VSCode
    if [[ -f "$DOWNLOAD_DIR/linux/development/code_amd64.deb" ]]; then
        create_package "vscode-linux-latest" "code" "Visual Studio Code" "latest" "linux" "utility" "Microsoft"
        upload_file "$DOWNLOAD_DIR/linux/development/code_amd64.deb" "vscode-linux-latest"
    fi

    # Slack
    if [[ -f "$DOWNLOAD_DIR/linux/productivity/slack-desktop-amd64.deb" ]]; then
        create_package "slack-linux-4.35" "slack-desktop" "Slack" "4.35.131" "linux" "utility" "Salesforce"
        upload_file "$DOWNLOAD_DIR/linux/productivity/slack-desktop-amd64.deb" "slack-linux-4.35"
    fi
}

# ===========================================
# UPLOAD MACOS SOFTWARE
# ===========================================

upload_macos() {
    echo -e "\n${BLUE}=== Uploading macOS Software ===${NC}\n"

    # Chrome
    if [[ -f "$DOWNLOAD_DIR/macos/browsers/googlechrome.dmg" ]]; then
        create_package "chrome-mac-latest" "chrome" "Google Chrome" "latest" "macos" "browser" "Google"
        upload_file "$DOWNLOAD_DIR/macos/browsers/googlechrome.dmg" "chrome-mac-latest"
    fi

    # Firefox
    if [[ -f "$DOWNLOAD_DIR/macos/browsers/Firefox.dmg" ]]; then
        create_package "firefox-mac-latest" "firefox" "Mozilla Firefox" "latest" "macos" "browser" "Mozilla"
        upload_file "$DOWNLOAD_DIR/macos/browsers/Firefox.dmg" "firefox-mac-latest"
    fi

    # VSCode
    if [[ -f "$DOWNLOAD_DIR/macos/development/VSCode-darwin-universal.zip" ]]; then
        create_package "vscode-mac-latest" "code" "Visual Studio Code" "latest" "macos" "utility" "Microsoft"
        upload_file "$DOWNLOAD_DIR/macos/development/VSCode-darwin-universal.zip" "vscode-mac-latest"
    fi
}

# ===========================================
# MAIN
# ===========================================

if [[ ! -d "$DOWNLOAD_DIR" ]]; then
    echo -e "${RED}Error: Download directory not found${NC}"
    echo "Run ./download-base-software.sh first"
    exit 1
fi

upload_windows
upload_linux
upload_macos

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Upload Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Software packages are now in the Hub"
echo "Next: Create deployment bundles with install scripts"
echo ""
