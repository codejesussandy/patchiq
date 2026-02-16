#!/bin/bash
set -euo pipefail

# Generate SHA256 Checksums for Binaries
# =======================================
# Creates individual .sha256 files and a combined checksums.txt
#
# Usage:
#   ./generate-checksums.sh /path/to/dist/
#   ./generate-checksums.sh /path/to/dist/ --combined-only
#
# Output:
#   - Individual .sha256 files for each binary
#   - Combined checksums.txt file with all checksums

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
DIST_DIR=""
COMBINED_ONLY=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --combined-only)
      COMBINED_ONLY=1
      shift
      ;;
    --help)
      echo "Usage: $0 <dist_directory> [--combined-only]"
      echo ""
      echo "Generate SHA256 checksums for all binaries in a directory."
      echo ""
      echo "Options:"
      echo "  --combined-only  Only create checksums.txt (no individual .sha256 files)"
      echo "  --help           Show this help message"
      echo ""
      echo "Output:"
      echo "  - <binary>.sha256  - Individual checksum file for each binary"
      echo "  - checksums.txt    - Combined checksums for all binaries"
      exit 0
      ;;
    *)
      if [ -z "$DIST_DIR" ]; then
        DIST_DIR="$1"
        shift
      else
        echo -e "${RED}Error: Unknown option $1${NC}"
        exit 1
      fi
      ;;
  esac
done

# Default to dist directory if not specified
if [ -z "$DIST_DIR" ]; then
  DIST_DIR="agent/dist"
fi

# Validate directory
if [ ! -d "$DIST_DIR" ]; then
  echo -e "${RED}Error: Directory not found: $DIST_DIR${NC}"
  exit 1
fi

echo -e "${CYAN}===================================${NC}"
echo -e "${CYAN}  Generating Checksums${NC}"
echo -e "${CYAN}===================================${NC}"
echo ""
echo "Directory: $DIST_DIR"
echo ""

# Change to dist directory
cd "$DIST_DIR"

# Remove old checksums file
rm -f checksums.txt

# Counter
count=0

# Generate checksums for all binaries
echo -e "${CYAN}Processing binaries...${NC}"
echo ""

for file in *; do
  # Skip directories and checksum files
  if [ -d "$file" ] || [[ "$file" == *.sha256 ]] || [[ "$file" == checksums.txt ]]; then
    continue
  fi

  # Check if it's a regular file
  if [ ! -f "$file" ]; then
    continue
  fi

  # Calculate SHA256 checksum
  checksum=$(sha256sum "$file" | awk '{print $1}')

  # Create individual .sha256 file (unless --combined-only)
  if [ "$COMBINED_ONLY" -eq 0 ]; then
    echo "$checksum  $file" > "${file}.sha256"
    echo -e "${GREEN}✓${NC} ${file}.sha256"
  fi

  # Append to combined checksums file
  echo "$checksum  $file" >> checksums.txt

  count=$((count + 1))
done

echo ""
echo -e "${CYAN}===================================${NC}"
echo -e "${GREEN}  Checksum Generation Complete${NC}"
echo -e "${CYAN}===================================${NC}"
echo ""
echo "Generated checksums for $count binaries"
echo ""

if [ "$COMBINED_ONLY" -eq 0 ]; then
  echo "Individual checksum files created:"
  ls -1 *.sha256 2>/dev/null | while read -r file; do
    echo "  - $file"
  done
  echo ""
fi

echo "Combined checksums:"
echo ""
cat checksums.txt
echo ""

echo -e "${GREEN}Done!${NC}"
echo ""
echo "Verify checksums:"
echo "  sha256sum -c checksums.txt"
echo "  sha256sum -c <binary>.sha256"
