#!/bin/bash
#
# Auto-Update Manifest Generator for PatchIQ Agent
#
# Usage:
#   ./generate-manifest.sh <version> [output-file]
#
# Examples:
#   ./generate-manifest.sh 1.0.0
#   ./generate-manifest.sh 1.0.0 custom-manifest.json
#   ./generate-manifest.sh 2.1.0-beta
#
# Requirements:
#   - All platform binaries must exist in ../dist/
#   - jq (for JSON formatting)
#   - sha256sum or shasum (for checksums)
#   - Optional: Ed25519 private key for signing
#
# Output:
#   - agent-manifest-{VERSION}.json
#   - Signed with Ed25519 if UPDATE_MANIFEST_PRIVATE_KEY is set
#

set -eo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Usage: $0 <version> [output-file]${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.0"
    echo "  $0 1.0.0 custom-manifest.json"
    echo "  $0 2.1.0-beta"
    exit 1
fi

VERSION="$1"
MANIFEST_FILE="${2:-agent-manifest-$VERSION.json}"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"

# CDN base URL (can be overridden)
CDN_BASE_URL="${CDN_BASE_URL:-https://cdn.patchiq.io/agent/$VERSION}"

# Print banner
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PatchIQ Agent - Manifest Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Version:  $VERSION${NC}"
echo -e "${YELLOW}Output:   $MANIFEST_FILE${NC}"
echo -e "${YELLOW}CDN Base: $CDN_BASE_URL${NC}"
echo ""

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"

# Check for jq
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not found. Please install jq.${NC}"
    echo ""
    echo "Install instructions:"
    echo "  macOS:   brew install jq"
    echo "  Ubuntu:  sudo apt-get install jq"
    echo "  RHEL:    sudo yum install jq"
    exit 1
fi
echo -e "${GREEN}✓ jq found${NC}"

# Check for sha256sum or shasum
if command -v sha256sum &> /dev/null; then
    SHA256_CMD="sha256sum"
elif command -v shasum &> /dev/null; then
    SHA256_CMD="shasum -a 256"
else
    echo -e "${RED}Error: sha256sum or shasum not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SHA256 command found: $SHA256_CMD${NC}"

# Platform binaries configuration (using simple arrays for Bash 3.2 compatibility)
PLATFORMS=(
    "windows-amd64:patchiq-agent-windows-amd64.exe"
    "windows-arm64:patchiq-agent-windows-arm64.exe"
    "darwin-amd64:patchiq-agent-darwin-amd64"
    "darwin-arm64:patchiq-agent-darwin-arm64"
    "linux-amd64:patchiq-agent-linux-amd64"
    "linux-arm64:patchiq-agent-linux-arm64"
)

# Verify all binaries exist
echo ""
echo -e "${YELLOW}Verifying binaries...${NC}"
MISSING_BINARIES=()

for platform_spec in "${PLATFORMS[@]}"; do
    platform="${platform_spec%%:*}"
    binary="${platform_spec##*:}"
    binary_path="$DIST_DIR/$binary"

    if [ -f "$binary_path" ]; then
        echo -e "${GREEN}✓ Found: $binary${NC}"
    else
        echo -e "${RED}✗ Missing: $binary${NC}"
        MISSING_BINARIES+=("$binary")
    fi
done

# Exit if any binaries are missing
if [ ${#MISSING_BINARIES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Error: ${#MISSING_BINARIES[@]} binary(ies) missing${NC}"
    echo ""
    echo "Missing binaries:"
    for binary in "${MISSING_BINARIES[@]}"; do
        echo "  - $binary"
    done
    echo ""
    echo "Please build all binaries first. Example:"
    echo "  cd $PROJECT_ROOT"
    echo "  make build-all"
    echo "  # or"
    echo "  GOOS=windows GOARCH=amd64 go build -o dist/patchiq-agent-windows-amd64.exe ./cmd/agent"
    exit 1
fi

# Calculate checksums and file sizes
echo ""
echo -e "${YELLOW}Calculating checksums and file sizes...${NC}"

# Create temporary file for storing metadata
TMP_METADATA=$(mktemp)
trap "rm -f $TMP_METADATA" EXIT

for platform_spec in "${PLATFORMS[@]}"; do
    platform="${platform_spec%%:*}"
    binary="${platform_spec##*:}"
    binary_path="$DIST_DIR/$binary"

    # Calculate SHA256 checksum
    checksum=$($SHA256_CMD "$binary_path" | awk '{print $1}')

    # Get file size in bytes
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        size=$(stat -f%z "$binary_path")
    else
        # Linux
        size=$(stat -c%s "$binary_path")
    fi

    # Store metadata
    echo "$platform|$binary|$checksum|$size" >> "$TMP_METADATA"

    echo -e "${GREEN}✓ $platform: SHA256=${checksum:0:16}... Size=$size bytes${NC}"
done

# Generate manifest JSON
echo ""
echo -e "${YELLOW}Generating manifest JSON...${NC}"

# Current timestamp in ISO 8601 format
RELEASE_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Start JSON
cat > "$MANIFEST_FILE" <<EOF
{
  "version": "$VERSION",
  "releaseDate": "$RELEASE_DATE",
  "builds": {
EOF

# Add builds
FIRST=true
while IFS='|' read -r platform binary checksum size; do
    # Build URL
    url="$CDN_BASE_URL/$binary"

    # Add comma separator (except for first entry)
    if [ "$FIRST" = "false" ]; then
        echo "," >> "$MANIFEST_FILE"
    fi
    FIRST=false

    # Add build entry
    cat >> "$MANIFEST_FILE" <<EOF
    "$platform": {
      "url": "$url",
      "sha256": "$checksum",
      "size": $size
    }
EOF
done < "$TMP_METADATA"

# Close JSON
cat >> "$MANIFEST_FILE" <<EOF

  }
}
EOF

echo -e "${GREEN}✓ Manifest JSON generated${NC}"

# Format JSON with jq
echo -e "${YELLOW}Formatting JSON...${NC}"
TMP_FILE=$(mktemp)
trap "rm -f $TMP_METADATA $TMP_FILE" EXIT
jq '.' "$MANIFEST_FILE" > "$TMP_FILE"
mv "$TMP_FILE" "$MANIFEST_FILE"
echo -e "${GREEN}✓ JSON formatted${NC}"

# Sign manifest if private key is available
if [ -n "${UPDATE_MANIFEST_PRIVATE_KEY:-}" ]; then
    echo ""
    echo -e "${YELLOW}Signing manifest with Ed25519 key...${NC}"

    # Use signing script from root scripts directory
    SIGN_SCRIPT="$PROJECT_ROOT/../scripts/sign-manifest.sh"

    if [ -f "$SIGN_SCRIPT" ]; then
        # Sign manifest
        "$SIGN_SCRIPT" "$MANIFEST_FILE" "$UPDATE_MANIFEST_PRIVATE_KEY"
        echo -e "${GREEN}✓ Manifest signed successfully${NC}"
    else
        echo -e "${RED}Warning: Signing script not found: $SIGN_SCRIPT${NC}"
        echo -e "${YELLOW}Manifest will not be signed${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}Note: Manifest not signed (no private key provided)${NC}"
    echo ""
    echo "To sign the manifest, set UPDATE_MANIFEST_PRIVATE_KEY:"
    echo "  export UPDATE_MANIFEST_PRIVATE_KEY=\"base64-encoded-key\""
    echo "  $0 $VERSION"
    echo ""
    echo "Or sign manually later:"
    echo "  ../../scripts/sign-manifest.sh $MANIFEST_FILE \"\$UPDATE_MANIFEST_PRIVATE_KEY\""
fi

# Display manifest summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Manifest Generation Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Manifest created: $MANIFEST_FILE${NC}"
echo ""
echo "Manifest details:"
echo "  Version:      $VERSION"
echo "  Release Date: $RELEASE_DATE"
echo "  Platforms:    6 (Windows, macOS, Linux)"
echo "  File Size:    $(du -h "$MANIFEST_FILE" | cut -f1)"
echo ""

# Display builds summary
echo "Platform builds:"
while IFS='|' read -r platform binary checksum size; do
    size_mb=$(echo "scale=2; $size / 1024 / 1024" | bc 2>/dev/null || echo "N/A")
    echo "  $platform: ${size_mb} MB"
done < "$TMP_METADATA"
echo ""

# Check if signed
if jq -e '.signature' "$MANIFEST_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Manifest is signed${NC}"
    signature=$(jq -r '.signature' "$MANIFEST_FILE")
    echo "  Signature: ${signature:0:40}..."
    echo "  Algorithm: $(jq -r '.signatureAlg' "$MANIFEST_FILE")"
else
    echo -e "${YELLOW}⚠ Manifest is unsigned${NC}"
fi

echo ""

# Publishing instructions
echo "Next steps:"
echo ""
echo "1. Verify manifest:"
echo "   jq '.' $MANIFEST_FILE"
echo ""
echo "2. Test manifest locally:"
echo "   # Update agent to use this manifest for testing"
echo ""

if [ -n "${CDN_UPLOAD_KEY:-}" ] || [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
    echo "3. Publish to CDN (automated):"
    echo "   # CDN credentials detected"
    echo ""

    # Check for AWS CLI
    if command -v aws &> /dev/null; then
        echo -e "${YELLOW}Publishing to S3...${NC}"

        # Publish manifest
        S3_BUCKET="${S3_BUCKET:-patchiq-cdn}"
        S3_PREFIX="${S3_PREFIX:-agent}"

        # Upload versioned manifest
        aws s3 cp "$MANIFEST_FILE" "s3://$S3_BUCKET/$S3_PREFIX/manifest-$VERSION.json" \
            --content-type application/json \
            --acl public-read 2>/dev/null || echo "  (Skipped - configure AWS credentials to enable)"

        # Update latest manifest
        aws s3 cp "$MANIFEST_FILE" "s3://$S3_BUCKET/$S3_PREFIX/manifest-latest.json" \
            --content-type application/json \
            --acl public-read 2>/dev/null || echo "  (Skipped - configure AWS credentials to enable)"

        echo -e "${GREEN}✓ Manifest published to S3${NC}"
        echo "  Versioned: https://cdn.patchiq.io/$S3_PREFIX/manifest-$VERSION.json"
        echo "  Latest:    https://cdn.patchiq.io/$S3_PREFIX/manifest-latest.json"
    else
        echo "   aws s3 cp $MANIFEST_FILE s3://patchiq-cdn/agent/manifest-$VERSION.json"
        echo "   aws s3 cp $MANIFEST_FILE s3://patchiq-cdn/agent/manifest-latest.json"
    fi
else
    echo "3. Publish to CDN (manual):"
    echo "   # Upload to CDN or S3:"
    echo "   aws s3 cp $MANIFEST_FILE s3://patchiq-cdn/agent/manifest-$VERSION.json"
    echo "   aws s3 cp $MANIFEST_FILE s3://patchiq-cdn/agent/manifest-latest.json"
fi

echo ""
echo "4. Rollback support:"
echo "   # Keep last 3 manifests for rollback"
echo "   # Delete older manifests if needed"
echo ""

# Display full manifest
echo "Generated manifest:"
echo ""
cat "$MANIFEST_FILE" | jq '.'
echo ""
