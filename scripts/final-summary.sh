#!/bin/bash
echo "=== FINAL DOWNLOAD & UPLOAD SUMMARY ==="
echo ""
echo "Windows Packages:"
find software-downloads/windows -type f \( -name "*.exe" -o -name "*.msi" \) | while read f; do
  size=$(ls -lh "$f" | awk '{print $5}')
  name=$(basename "$f")
  echo "  ✅ $name - $size"
done
echo ""
echo "Linux Packages:"
find software-downloads/linux -type f -name "*.deb" | while read f; do
  size=$(ls -lh "$f" | awk '{print $5}')
  name=$(basename "$f")
  echo "  ✅ $name - $size"
done
echo ""
echo "macOS Packages:"
find software-downloads/macos -type f \( -name "*.dmg" -o -name "*.zip" \) | while read f; do
  size=$(ls -lh "$f" | awk '{print $5}')
  name=$(basename "$f")
  echo "  ✅ $name - $size"
done
echo ""
echo "=== STORAGE TOTALS ==="
du -sh software-downloads/windows software-downloads/linux software-downloads/macos software-downloads
