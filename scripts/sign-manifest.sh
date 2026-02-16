#!/bin/bash
#
# Sign update manifest with Ed25519 private key
#
# Usage:
#   ./sign-manifest.sh <manifest.json> <private-key-base64>
#
# Example:
#   ./sign-manifest.sh manifest.json "$UPDATE_MANIFEST_PRIVATE_KEY"
#
# Output:
#   - Updates manifest.json with signature field
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ $# -ne 2 ]; then
    echo -e "${RED}Usage: $0 <manifest.json> <private-key-base64>${NC}"
    echo
    echo "Example:"
    echo "  $0 manifest.json \"\$UPDATE_MANIFEST_PRIVATE_KEY\""
    exit 1
fi

MANIFEST_FILE="$1"
PRIVATE_KEY_BASE64="$2"

# Validate manifest file exists
if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}Error: Manifest file not found: $MANIFEST_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Update Manifest Signing${NC}"
echo -e "${GREEN}========================================${NC}"
echo

echo -e "${YELLOW}Manifest file: $MANIFEST_FILE${NC}"

# Check if jq is available (for JSON manipulation)
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not found. Please install jq.${NC}"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
    exit 1
fi

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: openssl not found. Please install OpenSSL.${NC}"
    exit 1
fi

# Validate JSON format
if ! jq empty "$MANIFEST_FILE" 2>/dev/null; then
    echo -e "${RED}Error: Invalid JSON format in manifest file${NC}"
    exit 1
fi

echo -e "${YELLOW}Validating manifest structure...${NC}"

# Validate required fields
REQUIRED_FIELDS=("version" "releaseDate" "builds")
for field in "${REQUIRED_FIELDS[@]}"; do
    if ! jq -e ".$field" "$MANIFEST_FILE" > /dev/null 2>&1; then
        echo -e "${RED}Error: Missing required field: $field${NC}"
        exit 1
    fi
done

# Validate builds have required fields
if ! jq -e '.builds | to_entries | .[] | .value | has("url") and has("sha256") and has("size")' "$MANIFEST_FILE" > /dev/null 2>&1; then
    echo -e "${RED}Error: Build entries must have url, sha256, and size fields${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Manifest structure valid${NC}"

# Display manifest info
VERSION=$(jq -r '.version' "$MANIFEST_FILE")
RELEASE_DATE=$(jq -r '.releaseDate' "$MANIFEST_FILE")
BUILD_COUNT=$(jq '.builds | length' "$MANIFEST_FILE")

echo
echo "Manifest details:"
echo "  Version:      $VERSION"
echo "  Release Date: $RELEASE_DATE"
echo "  Builds:       $BUILD_COUNT"
echo

# Prepare manifest for signing (remove signature field if present)
echo -e "${YELLOW}Preparing manifest for signing...${NC}"

# Create temporary file for canonical JSON
TEMP_MANIFEST=$(mktemp)
trap "rm -f $TEMP_MANIFEST" EXIT

# Remove signature field and set signatureAlg
jq 'del(.signature) | .signatureAlg = "Ed25519"' "$MANIFEST_FILE" > "$TEMP_MANIFEST"

# Create canonical JSON (compact, sorted keys)
CANONICAL_JSON=$(jq -c -S '.' "$TEMP_MANIFEST")

echo -e "${GREEN}✓ Canonical JSON created${NC}"

# Decode private key from base64
echo -e "${YELLOW}Decoding private key...${NC}"

PRIVATE_KEY_DER=$(mktemp)
trap "rm -f $TEMP_MANIFEST $PRIVATE_KEY_DER" EXIT

echo "$PRIVATE_KEY_BASE64" | base64 -d > "$PRIVATE_KEY_DER"

if [ ! -s "$PRIVATE_KEY_DER" ]; then
    echo -e "${RED}Error: Failed to decode private key${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Private key decoded${NC}"

# Sign the canonical JSON
echo -e "${YELLOW}Signing manifest...${NC}"

# Write canonical JSON to temp file for signing
CANONICAL_FILE=$(mktemp)
trap "rm -f $TEMP_MANIFEST $PRIVATE_KEY_DER $CANONICAL_FILE" EXIT

echo -n "$CANONICAL_JSON" > "$CANONICAL_FILE"

# Sign with Ed25519 (using openssl dgst with raw Ed25519 key)
# Note: This requires OpenSSL 1.1.1+ for Ed25519 support
SIGNATURE_DER=$(mktemp)
trap "rm -f $TEMP_MANIFEST $PRIVATE_KEY_DER $CANONICAL_FILE $SIGNATURE_DER" EXIT

# Create PEM private key from raw bytes for signing
PRIVATE_KEY_PEM=$(mktemp)
trap "rm -f $TEMP_MANIFEST $PRIVATE_KEY_DER $CANONICAL_FILE $SIGNATURE_DER $PRIVATE_KEY_PEM" EXIT

# Convert raw Ed25519 key (32 bytes) to PEM format
# Ed25519 private key in DER format has specific structure
# For simplicity, we'll use a Go helper program if available
# Otherwise, use Python or another method

# Check if we can use Go for signing (more reliable for Ed25519)
if command -v go &> /dev/null; then
    # Create temporary Go program for signing
    SIGN_PROGRAM=$(mktemp -d)
    trap "rm -rf $TEMP_MANIFEST $PRIVATE_KEY_DER $CANONICAL_FILE $SIGNATURE_DER $PRIVATE_KEY_PEM $SIGN_PROGRAM" EXIT

    cat > "$SIGN_PROGRAM/sign.go" <<'EOF'
package main

import (
    "crypto/ed25519"
    "encoding/base64"
    "fmt"
    "io"
    "os"
)

func main() {
    if len(os.Args) != 3 {
        fmt.Fprintf(os.Stderr, "Usage: %s <private-key-file> <message-file>\n", os.Args[0])
        os.Exit(1)
    }

    // Read private key (raw 32 bytes)
    privateKeyBytes, err := os.ReadFile(os.Args[1])
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error reading private key: %v\n", err)
        os.Exit(1)
    }

    // Ed25519 private key is 64 bytes (32 seed + 32 public)
    // If we only have 32 bytes (seed), we need to derive the full key
    var privateKey ed25519.PrivateKey
    if len(privateKeyBytes) == 32 {
        // Derive full private key from seed
        privateKey = ed25519.NewKeyFromSeed(privateKeyBytes)
    } else if len(privateKeyBytes) == 64 {
        privateKey = privateKeyBytes
    } else {
        fmt.Fprintf(os.Stderr, "Invalid private key size: %d bytes\n", len(privateKeyBytes))
        os.Exit(1)
    }

    // Read message to sign
    message, err := os.ReadFile(os.Args[2])
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error reading message: %v\n", err)
        os.Exit(1)
    }

    // Sign message
    signature := ed25519.Sign(privateKey, message)

    // Output base64-encoded signature
    fmt.Print(base64.StdEncoding.EncodeToString(signature))
}
EOF

    # Compile and run signing program
    (cd "$SIGN_PROGRAM" && go build -o sign sign.go) 2>/dev/null

    if [ ! -f "$SIGN_PROGRAM/sign" ]; then
        echo -e "${RED}Error: Failed to compile signing program${NC}"
        exit 1
    fi

    SIGNATURE_BASE64=$("$SIGN_PROGRAM/sign" "$PRIVATE_KEY_DER" "$CANONICAL_FILE")

    if [ -z "$SIGNATURE_BASE64" ]; then
        echo -e "${RED}Error: Signing failed${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Manifest signed successfully${NC}"
else
    echo -e "${RED}Error: Go not found. Please install Go or use alternative signing method.${NC}"
    exit 1
fi

# Add signature to manifest
echo -e "${YELLOW}Adding signature to manifest...${NC}"

jq --arg sig "$SIGNATURE_BASE64" '.signature = $sig | .signatureAlg = "Ed25519"' "$MANIFEST_FILE" > "$TEMP_MANIFEST"
mv "$TEMP_MANIFEST" "$MANIFEST_FILE"

echo -e "${GREEN}✓ Signature added to manifest${NC}"

# Display result
echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Signing Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo "Signed manifest: $MANIFEST_FILE"
echo "Signature (first 20 chars): ${SIGNATURE_BASE64:0:20}..."
echo
echo "Manifest is ready for distribution."
echo

# Display updated manifest info
jq '.' "$MANIFEST_FILE"
