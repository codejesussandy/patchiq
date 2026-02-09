#!/bin/bash
TOKEN="$1"

./simple-upload.sh "$TOKEN" "software-downloads/windows/browsers/Firefox-Setup.exe" "firefox-win-latest" "firefox" "Mozilla Firefox" "latest" "windows" "browser" "Mozilla"
./simple-upload.sh "$TOKEN" "software-downloads/windows/utilities/7z2301-x64.exe" "7zip-win-23.01" "7zip" "7-Zip" "23.01" "windows" "utility" "7-Zip"
./simple-upload.sh "$TOKEN" "software-downloads/windows/development/VSCodeUserSetup-x64.exe" "vscode-win-latest" "code" "Visual Studio Code" "latest" "windows" "development" "Microsoft"
./simple-upload.sh "$TOKEN" "software-downloads/windows/development/Git-2.43.0-64-bit.exe" "git-win-2.43" "git" "Git for Windows" "2.43.0" "windows" "development" "Git"
./simple-upload.sh "$TOKEN" "software-downloads/windows/development/npp.8.6.2.Installer.x64.exe" "notepadpp-win-8.6.2" "notepadpp" "Notepad++" "8.6.2" "windows" "development" "Notepad++"
./simple-upload.sh "$TOKEN" "software-downloads/windows/utilities/vlc-3.0.20-win64.exe" "vlc-win-3.0.20" "vlc" "VLC Media Player" "3.0.20" "windows" "utility" "VideoLAN"

./simple-upload.sh "$TOKEN" "software-downloads/linux/browsers/google-chrome-stable_current_amd64.deb" "chrome-linux-latest" "google-chrome-stable" "Google Chrome" "latest" "linux" "browser" "Google"
./simple-upload.sh "$TOKEN" "software-downloads/linux/development/code_amd64.deb" "vscode-linux-latest" "code" "Visual Studio Code" "latest" "linux" "development" "Microsoft"
./simple-upload.sh "$TOKEN" "software-downloads/linux/productivity/slack-desktop-4.35.131-amd64.deb" "slack-linux-4.35" "slack-desktop" "Slack" "4.35.131" "linux" "productivity" "Salesforce"
./simple-upload.sh "$TOKEN" "software-downloads/linux/utilities/teamviewer_amd64.deb" "teamviewer-linux-latest" "teamviewer" "TeamViewer" "latest" "linux" "utility" "TeamViewer"

./simple-upload.sh "$TOKEN" "software-downloads/macos/browsers/googlechrome.dmg" "chrome-mac-latest" "chrome" "Google Chrome" "latest" "macos" "browser" "Google"
./simple-upload.sh "$TOKEN" "software-downloads/macos/development/VSCode-darwin-universal.zip" "vscode-mac-latest" "code" "Visual Studio Code" "latest" "macos" "development" "Microsoft"
./simple-upload.sh "$TOKEN" "software-downloads/macos/productivity/Slack-4.35.131-macOS.dmg" "slack-mac-4.35" "slack" "Slack" "4.35.131" "macos" "productivity" "Salesforce"
./simple-upload.sh "$TOKEN" "software-downloads/macos/utilities/vlc-3.0.20-universal.dmg" "vlc-mac-3.0.20" "vlc" "VLC Media Player" "3.0.20" "macos" "utility" "VideoLAN"

echo ""
echo "✅ All uploads complete!"
