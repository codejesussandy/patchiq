#!/bin/bash
set -euo pipefail

# macOS Code Signing Script
# ==========================
# Signs macOS binaries with Developer ID Application certificate
# Enables Hardened Runtime for notarization compatibility
#
# Usage:
#   ./sign-macos.sh --identity "Developer ID Application: Your Name (TEAM_ID)" --binary /path/to/binary
#   ./sign-macos.sh --identity "Developer ID Application" --binary /path/to/binary
#
# Requirements:
# - Valid Developer ID Application certificate in keychain
# - Apple Developer Program membership
# - Binary must be built for macOS (darwin)
#
# Environment Variables:
#   CODESIGN_IDENTITY - Alternative way to specify identity
#   SKIP_VERIFY       - Set to 1 to skip verification step

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
IDENTITY=""
BINARY=""
SKIP_VERIFY="${SKIP_VERIFY:-0}"
FORCE=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --identity)
      IDENTITY="$2"
      shift 2
      ;;
    --binary)
      BINARY="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --help)
      echo "Usage: $0 --identity <identity> --binary <binary_path> [--force]"
      echo ""
      echo "Options:"
      echo "  --identity  Developer ID Application identity (e.g., 'Developer ID Application: Name (TEAM_ID)')"
      echo "  --binary    Path to binary to sign"
      echo "  --force     Re-sign even if already signed"
      echo "  --help      Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  CODESIGN_IDENTITY - Alternative way to specify identity"
      echo "  SKIP_VERIFY       - Set to 1 to skip verification step"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

# Use environment variable if identity not provided
if [ -z "$IDENTITY" ]; then
  IDENTITY="${CODESIGN_IDENTITY:-}"
fi

# Validate arguments
if [ -z "$IDENTITY" ]; then
  echo -e "${RED}Error: Code signing identity is required${NC}"
  echo "Use --identity or set CODESIGN_IDENTITY environment variable"
  exit 1
fi

if [ -z "$BINARY" ]; then
  echo -e "${RED}Error: Binary path is required${NC}"
  echo "Use --binary to specify the binary to sign"
  exit 1
fi

if [ ! -f "$BINARY" ]; then
  echo -e "${RED}Error: Binary not found: $BINARY${NC}"
  exit 1
fi

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${YELLOW}Warning: Not running on macOS. Code signing will be skipped.${NC}"
  echo "This script must run on macOS with Xcode command line tools installed."
  exit 0
fi

# Check if codesign is available
if ! command -v codesign &> /dev/null; then
  echo -e "${RED}Error: codesign command not found${NC}"
  echo "Install Xcode command line tools: xcode-select --install"
  exit 1
fi

echo -e "${CYAN}===================================${NC}"
echo -e "${CYAN}  macOS Code Signing${NC}"
echo -e "${CYAN}===================================${NC}"
echo ""
echo "Binary:   $BINARY"
echo "Identity: $IDENTITY"
echo ""

# Check if already signed
if codesign -dv "$BINARY" 2>/dev/null; then
  if [ "$FORCE" -eq 0 ]; then
    echo -e "${YELLOW}Binary is already signed. Use --force to re-sign.${NC}"
    codesign -dv --verbose=4 "$BINARY" 2>&1 | grep "Authority\|TeamIdentifier\|Signature"
    exit 0
  else
    echo -e "${YELLOW}Binary already signed. Re-signing with --force...${NC}"
  fi
fi

# Sign the binary
echo -e "${CYAN}Signing binary...${NC}"
codesign \
  --sign "$IDENTITY" \
  --options runtime \
  --timestamp \
  --force \
  --verbose \
  "$BINARY"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Binary signed successfully${NC}"
else
  echo -e "${RED}✗ Code signing failed${NC}"
  exit 1
fi

# Verify signature
if [ "$SKIP_VERIFY" -eq 0 ]; then
  echo ""
  echo -e "${CYAN}Verifying signature...${NC}"

  if codesign --verify --verbose=4 "$BINARY" 2>&1; then
    echo -e "${GREEN}✓ Signature verified${NC}"
  else
    echo -e "${RED}✗ Signature verification failed${NC}"
    exit 1
  fi

  # Display signature details
  echo ""
  echo -e "${CYAN}Signature details:${NC}"
  codesign -dv --verbose=4 "$BINARY" 2>&1 | grep -E "Authority|TeamIdentifier|Signature|Runtime"
else
  echo -e "${YELLOW}Skipping verification (SKIP_VERIFY=1)${NC}"
fi

echo ""
echo -e "${GREEN}===================================${NC}"
echo -e "${GREEN}  Code signing complete!${NC}"
echo -e "${GREEN}===================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Notarize the binary: ./scripts/notarize-macos.sh --binary $BINARY"
echo "  2. Verify notarization: spctl --assess --verbose $BINARY"
echo ""
