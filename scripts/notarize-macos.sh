#!/bin/bash
set -euo pipefail

# macOS Notarization Script
# ==========================
# Submits macOS binaries to Apple's notary service for notarization
# Waits for notarization to complete and staples the ticket
#
# Usage:
#   ./notarize-macos.sh --binary /path/to/binary --bundle-id com.patchiq.agent
#
# Requirements:
# - Binary must be signed with Developer ID certificate
# - Valid Apple Developer account credentials
# - Apple Developer Program membership
#
# Environment Variables:
#   APPLE_ID          - Apple ID email (required)
#   APPLE_PASSWORD    - App-specific password (required)
#   APPLE_TEAM_ID     - Apple Developer Team ID (required)
#   NOTARIZE_TIMEOUT  - Timeout in seconds (default: 1800 = 30 minutes)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
BINARY=""
BUNDLE_ID=""
TIMEOUT="${NOTARIZE_TIMEOUT:-1800}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --binary)
      BINARY="$2"
      shift 2
      ;;
    --bundle-id)
      BUNDLE_ID="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 --binary <binary_path> --bundle-id <bundle_id>"
      echo ""
      echo "Options:"
      echo "  --binary      Path to signed binary"
      echo "  --bundle-id   Bundle identifier (e.g., com.patchiq.agent)"
      echo "  --timeout     Timeout in seconds (default: 1800)"
      echo "  --help        Show this help message"
      echo ""
      echo "Environment Variables (required):"
      echo "  APPLE_ID          - Apple ID email"
      echo "  APPLE_PASSWORD    - App-specific password (not your Apple ID password)"
      echo "  APPLE_TEAM_ID     - Apple Developer Team ID"
      echo ""
      echo "Creating an App-Specific Password:"
      echo "  1. Go to https://appleid.apple.com"
      echo "  2. Sign in with your Apple ID"
      echo "  3. Go to Security > App-Specific Passwords"
      echo "  4. Generate a new password for 'PatchIQ Notarization'"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

# Validate arguments
if [ -z "$BINARY" ]; then
  echo -e "${RED}Error: Binary path is required${NC}"
  echo "Use --binary to specify the binary to notarize"
  exit 1
fi

if [ -z "$BUNDLE_ID" ]; then
  # Auto-generate bundle ID from binary name
  BUNDLE_ID="com.patchiq.$(basename "$BINARY" | sed 's/[^a-zA-Z0-9]//g')"
  echo -e "${YELLOW}No bundle ID specified. Using: $BUNDLE_ID${NC}"
fi

if [ ! -f "$BINARY" ]; then
  echo -e "${RED}Error: Binary not found: $BINARY${NC}"
  exit 1
fi

# Validate environment variables
if [ -z "${APPLE_ID:-}" ]; then
  echo -e "${RED}Error: APPLE_ID environment variable is required${NC}"
  echo "Set your Apple ID email: export APPLE_ID=your@email.com"
  exit 1
fi

if [ -z "${APPLE_PASSWORD:-}" ]; then
  echo -e "${RED}Error: APPLE_PASSWORD environment variable is required${NC}"
  echo "Set your app-specific password: export APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx"
  echo "Create one at: https://appleid.apple.com (Security > App-Specific Passwords)"
  exit 1
fi

if [ -z "${APPLE_TEAM_ID:-}" ]; then
  echo -e "${RED}Error: APPLE_TEAM_ID environment variable is required${NC}"
  echo "Find your Team ID at: https://developer.apple.com/account (Membership Details)"
  exit 1
fi

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${YELLOW}Warning: Not running on macOS. Notarization will be skipped.${NC}"
  echo "This script must run on macOS with Xcode command line tools installed."
  exit 0
fi

# Check if xcrun is available
if ! command -v xcrun &> /dev/null; then
  echo -e "${RED}Error: xcrun command not found${NC}"
  echo "Install Xcode command line tools: xcode-select --install"
  exit 1
fi

# Check if binary is signed
if ! codesign -dv "$BINARY" 2>/dev/null; then
  echo -e "${RED}Error: Binary is not signed${NC}"
  echo "Sign the binary first: ./scripts/sign-macos.sh --binary $BINARY"
  exit 1
fi

echo -e "${CYAN}===================================${NC}"
echo -e "${CYAN}  macOS Notarization${NC}"
echo -e "${CYAN}===================================${NC}"
echo ""
echo "Binary:    $BINARY"
echo "Bundle ID: $BUNDLE_ID"
echo "Apple ID:  $APPLE_ID"
echo "Team ID:   $APPLE_TEAM_ID"
echo "Timeout:   ${TIMEOUT}s"
echo ""

# Create temporary directory for ZIP
TEMP_DIR=$(mktemp -d)
ZIP_FILE="$TEMP_DIR/$(basename "$BINARY").zip"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Create ZIP archive (required for notarization)
echo -e "${CYAN}Creating ZIP archive...${NC}"
ditto -c -k --keepParent "$BINARY" "$ZIP_FILE"

if [ ! -f "$ZIP_FILE" ]; then
  echo -e "${RED}Failed to create ZIP archive${NC}"
  exit 1
fi

echo -e "${GREEN}✓ ZIP archive created: $(basename "$ZIP_FILE")${NC}"

# Submit for notarization
echo ""
echo -e "${CYAN}Submitting to Apple notary service...${NC}"
echo -e "${YELLOW}This may take several minutes. Please wait...${NC}"

SUBMISSION_OUTPUT=$(xcrun notarytool submit "$ZIP_FILE" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait \
  --timeout "$TIMEOUT" \
  2>&1)

echo "$SUBMISSION_OUTPUT"

# Check if notarization succeeded
if echo "$SUBMISSION_OUTPUT" | grep -q "status: Accepted"; then
  echo ""
  echo -e "${GREEN}✓ Notarization succeeded!${NC}"
else
  echo ""
  echo -e "${RED}✗ Notarization failed${NC}"
  echo ""
  echo "Common reasons for failure:"
  echo "  - Binary not signed with Hardened Runtime"
  echo "  - Invalid entitlements"
  echo "  - Binary contains unsigned code"
  echo ""
  echo "Get detailed logs:"
  SUBMISSION_ID=$(echo "$SUBMISSION_OUTPUT" | grep "id:" | head -1 | awk '{print $2}')
  if [ -n "$SUBMISSION_ID" ]; then
    echo "  xcrun notarytool log $SUBMISSION_ID --apple-id $APPLE_ID --password <password> --team-id $APPLE_TEAM_ID"
  fi
  exit 1
fi

# Staple notarization ticket to binary
echo ""
echo -e "${CYAN}Stapling notarization ticket...${NC}"

if xcrun stapler staple "$BINARY" 2>&1; then
  echo -e "${GREEN}✓ Notarization ticket stapled${NC}"
else
  echo -e "${YELLOW}Warning: Failed to staple ticket${NC}"
  echo "The binary is notarized but may require internet connection for verification."
fi

# Verify notarization
echo ""
echo -e "${CYAN}Verifying notarization...${NC}"

if spctl --assess --verbose "$BINARY" 2>&1; then
  echo -e "${GREEN}✓ Notarization verified with spctl${NC}"
else
  echo -e "${YELLOW}Warning: spctl assessment failed${NC}"
  echo "The binary is notarized but may show warnings on first launch."
fi

echo ""
echo -e "${GREEN}===================================${NC}"
echo -e "${GREEN}  Notarization complete!${NC}"
echo -e "${GREEN}===================================${NC}"
echo ""
echo "The binary is now notarized and will pass Gatekeeper checks."
echo ""
echo "Test on macOS 13+:"
echo "  1. Copy binary to another Mac"
echo "  2. Run: $BINARY"
echo "  3. Should launch without Gatekeeper warning"
echo ""
