#!/bin/bash
set -euo pipefail

# Verify Linux Binary Checksums
# ==============================
# Verifies SHA256 checksums for downloaded binaries
#
# Usage:
#   ./verify-linux-checksums.sh /path/to/binary
#   ./verify-linux-checksums.sh /path/to/binary --checksum <hash>
#   ./verify-linux-checksums.sh /path/to/binary --checksum-file <file>
#
# Examples:
#   # Verify using .sha256 file (auto-detected)
#   ./verify-linux-checksums.sh patchiq-agent-linux-amd64
#
#   # Verify using explicit checksum
#   ./verify-linux-checksums.sh patchiq-agent-linux-amd64 --checksum abc123...
#
#   # Verify using separate checksum file
#   ./verify-linux-checksums.sh patchiq-agent-linux-amd64 --checksum-file checksums.txt

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
BINARY=""
CHECKSUM=""
CHECKSUM_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --checksum)
      CHECKSUM="$2"
      shift 2
      ;;
    --checksum-file)
      CHECKSUM_FILE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 <binary> [options]"
      echo ""
      echo "Verify SHA256 checksum of a binary file."
      echo ""
      echo "Options:"
      echo "  --checksum <hash>        Expected checksum (64-character hex)"
      echo "  --checksum-file <file>   File containing checksum"
      echo "  --help                   Show this help message"
      echo ""
      echo "Auto-detection:"
      echo "  If no checksum is provided, the script will:"
      echo "  1. Look for <binary>.sha256 file"
      echo "  2. Look for checksums.txt in the same directory"
      echo ""
      echo "Examples:"
      echo "  $0 patchiq-agent-linux-amd64"
      echo "  $0 patchiq-agent-linux-amd64 --checksum abc123..."
      echo "  $0 patchiq-agent-linux-amd64 --checksum-file checksums.txt"
      exit 0
      ;;
    *)
      if [ -z "$BINARY" ]; then
        BINARY="$1"
        shift
      else
        echo -e "${RED}Error: Unknown option $1${NC}"
        exit 1
      fi
      ;;
  esac
done

# Validate binary
if [ -z "$BINARY" ]; then
  echo -e "${RED}Error: Binary path is required${NC}"
  echo "Usage: $0 <binary> [options]"
  exit 1
fi

if [ ! -f "$BINARY" ]; then
  echo -e "${RED}Error: Binary not found: $BINARY${NC}"
  exit 1
fi

echo -e "${CYAN}===================================${NC}"
echo -e "${CYAN}  Linux Binary Checksum Verification${NC}"
echo -e "${CYAN}===================================${NC}"
echo ""
echo "Binary: $BINARY"
echo ""

# Get expected checksum
EXPECTED_CHECKSUM=""

if [ -n "$CHECKSUM" ]; then
  # Use provided checksum
  EXPECTED_CHECKSUM="$CHECKSUM"
  echo "Checksum source: Command-line argument"
elif [ -n "$CHECKSUM_FILE" ]; then
  # Use provided checksum file
  if [ ! -f "$CHECKSUM_FILE" ]; then
    echo -e "${RED}Error: Checksum file not found: $CHECKSUM_FILE${NC}"
    exit 1
  fi
  EXPECTED_CHECKSUM=$(grep "$(basename "$BINARY")" "$CHECKSUM_FILE" | awk '{print $1}')
  echo "Checksum source: $CHECKSUM_FILE"
else
  # Auto-detect checksum file
  BINARY_DIR=$(dirname "$BINARY")
  BINARY_NAME=$(basename "$BINARY")

  # Try <binary>.sha256
  if [ -f "${BINARY}.sha256" ]; then
    EXPECTED_CHECKSUM=$(cat "${BINARY}.sha256" | awk '{print $1}')
    echo "Checksum source: ${BINARY_NAME}.sha256 (auto-detected)"
  # Try checksums.txt in same directory
  elif [ -f "${BINARY_DIR}/checksums.txt" ]; then
    EXPECTED_CHECKSUM=$(grep "$BINARY_NAME" "${BINARY_DIR}/checksums.txt" | awk '{print $1}')
    echo "Checksum source: checksums.txt (auto-detected)"
  fi
fi

# If no checksum found, error
if [ -z "$EXPECTED_CHECKSUM" ]; then
  echo -e "${RED}Error: No checksum found${NC}"
  echo ""
  echo "Provide checksum using one of:"
  echo "  - Create ${BINARY_NAME}.sha256 file"
  echo "  - Create checksums.txt in the same directory"
  echo "  - Use --checksum <hash> option"
  echo "  - Use --checksum-file <file> option"
  exit 1
fi

# Calculate actual checksum
echo ""
echo -e "${CYAN}Calculating checksum...${NC}"

ACTUAL_CHECKSUM=$(sha256sum "$BINARY" | awk '{print $1}')

# Display checksums
echo ""
echo "Expected: $EXPECTED_CHECKSUM"
echo "Actual:   $ACTUAL_CHECKSUM"
echo ""

# Compare checksums
if [ "$EXPECTED_CHECKSUM" = "$ACTUAL_CHECKSUM" ]; then
  echo -e "${GREEN}===================================${NC}"
  echo -e "${GREEN}  ✓ Checksum verified successfully!${NC}"
  echo -e "${GREEN}===================================${NC}"
  echo ""
  echo "The binary is authentic and has not been tampered with."
  exit 0
else
  echo -e "${RED}===================================${NC}"
  echo -e "${RED}  ✗ Checksum verification failed!${NC}"
  echo -e "${RED}===================================${NC}"
  echo ""
  echo -e "${YELLOW}WARNING: Checksum mismatch detected!${NC}"
  echo ""
  echo "Possible causes:"
  echo "  - Binary has been corrupted during download"
  echo "  - Binary has been tampered with"
  echo "  - Wrong checksum file provided"
  echo ""
  echo -e "${RED}DO NOT use this binary!${NC}"
  echo ""
  echo "Download the binary again from a trusted source."
  exit 1
fi
