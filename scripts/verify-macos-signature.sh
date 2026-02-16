#!/bin/bash
set -euo pipefail

# macOS Signature Verification Script
# =====================================
# Verifies code signature and notarization status of macOS binaries
#
# Usage:
#   ./verify-macos-signature.sh /path/to/binary
#   ./verify-macos-signature.sh --binary /path/to/binary
#
# Requirements:
# - macOS with Xcode command line tools
# - Binary must be signed with Developer ID certificate

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
BINARY=""
VERBOSE=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --binary)
      BINARY="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=1
      shift
      ;;
    --help)
      echo "Usage: $0 [--binary] <binary_path> [--verbose]"
      echo ""
      echo "Options:"
      echo "  --binary    Path to binary to verify (optional)"
      echo "  --verbose   Show detailed output"
      echo "  --help      Show this help message"
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

# Validate arguments
if [ -z "$BINARY" ]; then
  echo -e "${RED}Error: Binary path is required${NC}"
  echo "Usage: $0 [--binary] <binary_path>"
  exit 1
fi

if [ ! -f "$BINARY" ]; then
  echo -e "${RED}Error: Binary not found: $BINARY${NC}"
  exit 1
fi

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo -e "${YELLOW}Warning: Not running on macOS. Verification limited.${NC}"
  echo "Full verification requires macOS with Xcode command line tools."
  exit 1
fi

# Check if codesign is available
if ! command -v codesign &> /dev/null; then
  echo -e "${RED}Error: codesign command not found${NC}"
  echo "Install Xcode command line tools: xcode-select --install"
  exit 1
fi

echo -e "${CYAN}===================================${NC}"
echo -e "${CYAN}  macOS Signature Verification${NC}"
echo -e "${CYAN}===================================${NC}"
echo ""
echo "Binary: $BINARY"
echo ""

EXIT_CODE=0

# Check 1: Basic signature verification
echo -e "${CYAN}[1/4] Verifying code signature...${NC}"
if codesign --verify --verbose "$BINARY" 2>&1; then
  echo -e "${GREEN}✓ Code signature is valid${NC}"
else
  echo -e "${RED}✗ Code signature verification failed${NC}"
  EXIT_CODE=1
fi

# Check 2: Display signature details
echo ""
echo -e "${CYAN}[2/4] Signature details:${NC}"
SIGNATURE_OUTPUT=$(codesign -dv --verbose=4 "$BINARY" 2>&1)

# Extract key information
AUTHORITY=$(echo "$SIGNATURE_OUTPUT" | grep "Authority=" | head -1 | sed 's/Authority=//')
TEAM_ID=$(echo "$SIGNATURE_OUTPUT" | grep "TeamIdentifier=" | sed 's/TeamIdentifier=//')
RUNTIME=$(echo "$SIGNATURE_OUTPUT" | grep "runtime" || echo "")

if [ -n "$AUTHORITY" ]; then
  echo "Authority:       $AUTHORITY"
else
  echo -e "${YELLOW}Authority:       Not found${NC}"
fi

if [ -n "$TEAM_ID" ]; then
  echo "Team ID:         $TEAM_ID"
else
  echo -e "${YELLOW}Team ID:         Not found${NC}"
fi

if [ -n "$RUNTIME" ]; then
  echo -e "${GREEN}Hardened Runtime: Enabled${NC}"
else
  echo -e "${YELLOW}Hardened Runtime: Not enabled${NC}"
  echo "  (Required for notarization)"
fi

if [ "$VERBOSE" -eq 1 ]; then
  echo ""
  echo "Full signature details:"
  echo "$SIGNATURE_OUTPUT"
fi

# Check 3: Gatekeeper assessment
echo ""
echo -e "${CYAN}[3/4] Gatekeeper assessment...${NC}"

# spctl returns non-zero for unsigned/untrusted binaries
if spctl --assess --type execute --verbose "$BINARY" 2>&1; then
  echo -e "${GREEN}✓ Binary passes Gatekeeper check${NC}"
  echo "  Binary is notarized and will run without warnings"
else
  SPCTL_OUTPUT=$(spctl --assess --type execute --verbose "$BINARY" 2>&1 || true)

  if echo "$SPCTL_OUTPUT" | grep -q "accepted"; then
    echo -e "${GREEN}✓ Binary passes Gatekeeper check${NC}"
  elif echo "$SPCTL_OUTPUT" | grep -q "source=Notarized"; then
    echo -e "${GREEN}✓ Binary is notarized${NC}"
  elif echo "$SPCTL_OUTPUT" | grep -q "source=Developer ID"; then
    echo -e "${YELLOW}⚠ Binary is signed but not notarized${NC}"
    echo "  Users will see a warning on first launch (macOS 10.15+)"
    echo "  Notarize the binary: ./scripts/notarize-macos.sh --binary $BINARY"
  else
    echo -e "${RED}✗ Binary does not pass Gatekeeper check${NC}"
    echo "  Users will not be able to run this binary without manual approval"
    EXIT_CODE=1
  fi

  if [ "$VERBOSE" -eq 1 ]; then
    echo ""
    echo "spctl output:"
    echo "$SPCTL_OUTPUT"
  fi
fi

# Check 4: Check for stapled notarization ticket
echo ""
echo -e "${CYAN}[4/4] Notarization ticket...${NC}"

if command -v stapler &> /dev/null; then
  if stapler validate "$BINARY" 2>&1 | grep -q "The validate action worked"; then
    echo -e "${GREEN}✓ Notarization ticket is stapled${NC}"
    echo "  Binary can be verified offline"
  else
    echo -e "${YELLOW}⚠ No stapled ticket found${NC}"
    echo "  Notarization will be verified online (requires internet)"
    echo "  Staple ticket: xcrun stapler staple $BINARY"
  fi
else
  echo -e "${YELLOW}⚠ stapler command not found${NC}"
  echo "  Cannot check for stapled ticket"
fi

# Summary
echo ""
echo -e "${CYAN}===================================${NC}"
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}  Verification passed!${NC}"
  echo -e "${CYAN}===================================${NC}"
  echo ""
  echo "Binary is properly signed and notarized."
  echo "It will run without warnings on macOS 10.15+."
else
  echo -e "${YELLOW}  Verification completed with warnings${NC}"
  echo -e "${CYAN}===================================${NC}"
  echo ""
  echo "Binary has signature issues."
  echo "Review the errors above and re-sign/notarize as needed."
fi

exit $EXIT_CODE
