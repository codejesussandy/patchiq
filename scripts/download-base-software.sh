#!/bin/bash
#
# PatchIQ Base Software Downloader
# Downloads essential software from whitelisted vendors
# Usage: ./download-base-software.sh [platform]
#

set -e

DOWNLOAD_DIR="./software-downloads"
PLATFORM="${1:-all}"  # windows, linux, macos, or all

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PatchIQ Base Software Downloader${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create directory structure
mkdir -p "$DOWNLOAD_DIR"/{windows,linux,macos}/{browsers,productivity,development,utilities,security}

# Function to download and verify
download_with_verify() {
    local url="$1"
    local output_path="$2"
    local checksum="$3"
    local filename=$(basename "$output_path")

    echo -e "${YELLOW}Downloading: ${filename}${NC}"
    echo -e "  URL: $url"

    if [[ -f "$output_path" ]]; then
        echo -e "${GREEN}  ✓ Already exists, skipping${NC}"
        return 0
    fi

    # Download with progress bar
    if wget -q --show-progress "$url" -O "$output_path"; then
        echo -e "${GREEN}  ✓ Download complete${NC}"

        # Verify checksum if provided
        if [[ -n "$checksum" ]]; then
            local actual_checksum=$(sha256sum "$output_path" | cut -d' ' -f1)
            if [[ "$actual_checksum" == "$checksum" ]]; then
                echo -e "${GREEN}  ✓ Checksum verified${NC}"
            else
                echo -e "${RED}  ✗ Checksum mismatch!${NC}"
                echo -e "    Expected: $checksum"
                echo -e "    Got:      $actual_checksum"
                return 1
            fi
        fi
    else
        echo -e "${RED}  ✗ Download failed${NC}"
        return 1
    fi
}

# ===========================================
# WINDOWS SOFTWARE
# ===========================================

download_windows() {
    echo -e "\n${BLUE}=== Downloading Windows Software ===${NC}\n"

    # Google Chrome
    echo -e "${GREEN}[1/8] Google Chrome${NC}"
    download_with_verify \
        "https://dl.google.com/chrome/install/latest/chrome_installer.exe" \
        "$DOWNLOAD_DIR/windows/browsers/ChromeStandaloneSetup64.exe" \
        ""

    # Mozilla Firefox
    echo -e "\n${GREEN}[2/8] Mozilla Firefox${NC}"
    download_with_verify \
        "https://download.mozilla.org/?product=firefox-latest&os=win64&lang=en-US" \
        "$DOWNLOAD_DIR/windows/browsers/Firefox-Setup.exe" \
        ""

    # 7-Zip
    echo -e "\n${GREEN}[3/8] 7-Zip${NC}"
    download_with_verify \
        "https://www.7-zip.org/a/7z2301-x64.exe" \
        "$DOWNLOAD_DIR/windows/utilities/7z2301-x64.exe" \
        ""

    # Adobe Acrobat Reader
    echo -e "\n${GREEN}[4/8] Adobe Acrobat Reader${NC}"
    download_with_verify \
        "https://ardownload2.adobe.com/pub/adobe/reader/win/AcrobatDC/2300820360/AcroRdrDC2300820360_en_US.exe" \
        "$DOWNLOAD_DIR/windows/productivity/AcroRdrDC_en_US.exe" \
        ""

    # VLC Media Player
    echo -e "\n${GREEN}[5/8] VLC Media Player${NC}"
    download_with_verify \
        "https://get.videolan.org/vlc/last/win64/vlc-3.0.20-win64.exe" \
        "$DOWNLOAD_DIR/windows/utilities/vlc-win64.exe" \
        ""

    # Notepad++
    echo -e "\n${GREEN}[6/8] Notepad++${NC}"
    download_with_verify \
        "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.6.2/npp.8.6.2.Installer.x64.exe" \
        "$DOWNLOAD_DIR/windows/development/npp.8.6.2.Installer.x64.exe" \
        ""

    # Visual Studio Code
    echo -e "\n${GREEN}[7/8] Visual Studio Code${NC}"
    download_with_verify \
        "https://update.code.visualstudio.com/latest/win32-x64-user/stable" \
        "$DOWNLOAD_DIR/windows/development/VSCodeUserSetup-x64.exe" \
        ""

    # Git for Windows
    echo -e "\n${GREEN}[8/8] Git for Windows${NC}"
    download_with_verify \
        "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe" \
        "$DOWNLOAD_DIR/windows/development/Git-2.43.0-64-bit.exe" \
        ""
}

# ===========================================
# LINUX SOFTWARE (Debian/Ubuntu)
# ===========================================

download_linux() {
    echo -e "\n${BLUE}=== Downloading Linux Software ===${NC}\n"

    # Google Chrome
    echo -e "${GREEN}[1/6] Google Chrome (Debian/Ubuntu)${NC}"
    download_with_verify \
        "https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb" \
        "$DOWNLOAD_DIR/linux/browsers/google-chrome-stable_current_amd64.deb" \
        ""

    # Mozilla Firefox (snap-based, just download installer script)
    echo -e "\n${GREEN}[2/6] Mozilla Firefox${NC}"
    echo "  Note: Firefox on Linux typically installed via snap/apt"

    # Visual Studio Code
    echo -e "\n${GREEN}[3/6] Visual Studio Code${NC}"
    download_with_verify \
        "https://update.code.visualstudio.com/latest/linux-deb-x64/stable" \
        "$DOWNLOAD_DIR/linux/development/code_amd64.deb" \
        ""

    # Slack
    echo -e "\n${GREEN}[4/6] Slack${NC}"
    download_with_verify \
        "https://downloads.slack-edge.com/releases/linux/4.35.131/prod/x64/slack-desktop-4.35.131-amd64.deb" \
        "$DOWNLOAD_DIR/linux/productivity/slack-desktop-amd64.deb" \
        ""

    # TeamViewer
    echo -e "\n${GREEN}[5/6] TeamViewer${NC}"
    download_with_verify \
        "https://download.teamviewer.com/download/linux/teamviewer_amd64.deb" \
        "$DOWNLOAD_DIR/linux/utilities/teamviewer_amd64.deb" \
        ""

    # VLC Media Player
    echo -e "\n${GREEN}[6/6] VLC Media Player${NC}"
    echo "  Note: VLC typically installed via apt (apt-get install vlc)"
}

# ===========================================
# MACOS SOFTWARE
# ===========================================

download_macos() {
    echo -e "\n${BLUE}=== Downloading macOS Software ===${NC}\n"

    # Google Chrome
    echo -e "${GREEN}[1/5] Google Chrome${NC}"
    download_with_verify \
        "https://dl.google.com/chrome/mac/universal/stable/GGRO/googlechrome.dmg" \
        "$DOWNLOAD_DIR/macos/browsers/googlechrome.dmg" \
        ""

    # Mozilla Firefox
    echo -e "\n${GREEN}[2/5] Mozilla Firefox${NC}"
    download_with_verify \
        "https://download.mozilla.org/?product=firefox-latest&os=osx&lang=en-US" \
        "$DOWNLOAD_DIR/macos/browsers/Firefox.dmg" \
        ""

    # Visual Studio Code
    echo -e "\n${GREEN}[3/5] Visual Studio Code${NC}"
    download_with_verify \
        "https://update.code.visualstudio.com/latest/darwin-universal/stable" \
        "$DOWNLOAD_DIR/macos/development/VSCode-darwin-universal.zip" \
        ""

    # Slack
    echo -e "\n${GREEN}[4/5] Slack${NC}"
    download_with_verify \
        "https://downloads.slack-edge.com/releases/macos/4.35.131/prod/universal/Slack-4.35.131-macOS.dmg" \
        "$DOWNLOAD_DIR/macos/productivity/Slack-macOS.dmg" \
        ""

    # VLC Media Player
    echo -e "\n${GREEN}[5/5] VLC Media Player${NC}"
    download_with_verify \
        "https://get.videolan.org/vlc/last/macosx/vlc-3.0.20-universal.dmg" \
        "$DOWNLOAD_DIR/macos/utilities/vlc-universal.dmg" \
        ""
}

# ===========================================
# MAIN EXECUTION
# ===========================================

case "$PLATFORM" in
    windows)
        download_windows
        ;;
    linux)
        download_linux
        ;;
    macos)
        download_macos
        ;;
    all)
        download_windows
        download_linux
        download_macos
        ;;
    *)
        echo "Usage: $0 [windows|linux|macos|all]"
        exit 1
        ;;
esac

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Download Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Downloaded files are in: $DOWNLOAD_DIR"
echo ""
echo "Next steps:"
echo "  1. Review downloaded files"
echo "  2. Run: ./upload-to-hub.sh"
echo "  3. Create package bundles with scripts"
echo ""
