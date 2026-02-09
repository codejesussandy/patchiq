#!/bin/bash

TOKEN="$1"

echo "🔍 Checking which files we have..."
echo ""

# Check what files exist
echo "Available Linux files:"
ls -1 software-downloads/linux/*/*.deb 2>/dev/null | while read f; do echo "  ✓ $(basename $f)"; done

echo ""
echo "Available macOS files:"
ls -1 software-downloads/macos/*/*.{dmg,zip} 2>/dev/null | while read f; do echo "  ✓ $(basename $f)"; done

echo ""
echo "Available Windows files:"
ls -1 software-downloads/windows/*/*.exe 2>/dev/null | while read f; do echo "  ✓ $(basename $f)"; done

echo ""
echo "📤 Re-uploading missing files..."
echo ""

# Re-upload VSCode Linux (SWP-66D22745)
if [ -f "software-downloads/linux/development/code_amd64.deb" ]; then
  echo "Uploading VSCode Linux to SWP-66D22745..."
  curl -s -X POST "http://localhost:5173/v1/hub/packages/SWP-66D22745/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@software-downloads/linux/development/code_amd64.deb" | jq -r '.success'
fi

# Re-upload Chrome Linux (SWP-7489A297)
if [ -f "software-downloads/linux/browsers/google-chrome-stable_current_amd64.deb" ]; then
  echo "Uploading Chrome Linux to SWP-7489A297..."
  curl -s -X POST "http://localhost:5173/v1/hub/packages/SWP-7489A297/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@software-downloads/linux/browsers/google-chrome-stable_current_amd64.deb" | jq -r '.success'
fi

# Re-upload TeamViewer Linux (SWP-433B98E8)
if [ -f "software-downloads/linux/utilities/teamviewer_amd64.deb" ]; then
  echo "Uploading TeamViewer Linux to SWP-433B98E8..."
  curl -s -X POST "http://localhost:5173/v1/hub/packages/SWP-433B98E8/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@software-downloads/linux/utilities/teamviewer_amd64.deb" | jq -r '.success'
fi

# Re-upload Chrome macOS (SWP-7B7BD7B6)
if [ -f "software-downloads/macos/browsers/googlechrome.dmg" ]; then
  echo "Uploading Chrome macOS to SWP-7B7BD7B6..."
  curl -s -X POST "http://localhost:5173/v1/hub/packages/SWP-7B7BD7B6/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@software-downloads/macos/browsers/googlechrome.dmg" | jq -r '.success'
fi

# Re-upload VSCode macOS (SWP-AD58528C)
if [ -f "software-downloads/macos/development/VSCode-darwin-universal.zip" ]; then
  echo "Uploading VSCode macOS to SWP-AD58528C..."
  curl -s -X POST "http://localhost:5173/v1/hub/packages/SWP-AD58528C/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@software-downloads/macos/development/VSCode-darwin-universal.zip" | jq -r '.success'
fi

# Re-upload Slack macOS (SWP-BE3D45CE)
if [ -f "software-downloads/macos/productivity/Slack-4.35.131-macOS.dmg" ]; then
  echo "Uploading Slack macOS to SWP-BE3D45CE..."
  curl -s -X POST "http://localhost:5173/v1/hub/packages/SWP-BE3D45CE/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@software-downloads/macos/productivity/Slack-4.35.131-macOS.dmg" | jq -r '.success'
fi

echo ""
echo "✅ Re-upload complete!"
