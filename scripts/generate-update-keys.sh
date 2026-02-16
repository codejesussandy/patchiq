#!/bin/bash
#
# Generate Ed25519 key pair for update manifest signing
#
# Usage:
#   ./generate-update-keys.sh [output-dir]
#
# Output:
#   - update-private.key: Private key (KEEP SECRET - for CI/CD signing)
#   - update-public.key: Public key (embed in agent binary)
#   - update-keys.txt: Base64-encoded keys for easy copying
#

set -euo pipefail

# Default output directory
OUTPUT_DIR="${1:-.}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Update Manifest Key Generation${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: openssl not found. Please install OpenSSL.${NC}"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Generate Ed25519 private key
PRIVATE_KEY_FILE="$OUTPUT_DIR/update-private.key"
PUBLIC_KEY_FILE="$OUTPUT_DIR/update-public.key"
KEYS_TXT_FILE="$OUTPUT_DIR/update-keys.txt"

echo -e "${YELLOW}Generating Ed25519 key pair...${NC}"

# Generate private key (Ed25519)
openssl genpkey -algorithm Ed25519 -out "$PRIVATE_KEY_FILE"

# Extract public key from private key
openssl pkey -in "$PRIVATE_KEY_FILE" -pubout -out "$PUBLIC_KEY_FILE"

echo -e "${GREEN}Keys generated successfully!${NC}"
echo

# Extract raw key bytes and encode to base64 (for Go code)
echo -e "${YELLOW}Extracting raw key bytes...${NC}"

# Extract private key bytes (skip header/footer)
PRIVATE_KEY_BASE64=$(openssl pkey -in "$PRIVATE_KEY_FILE" -outform DER | tail -c 32 | base64)

# Extract public key bytes (skip header/footer)
PUBLIC_KEY_BASE64=$(openssl pkey -in "$PUBLIC_KEY_FILE" -pubin -outform DER | tail -c 32 | base64)

# Save base64-encoded keys to text file for easy copying
cat > "$KEYS_TXT_FILE" <<EOF
========================================
Update Manifest Keys (Base64-Encoded)
========================================

PRIVATE KEY (KEEP SECRET):
$PRIVATE_KEY_BASE64

PUBLIC KEY (Embed in agent binary):
$PUBLIC_KEY_BASE64

========================================
File Locations
========================================

Private Key File: $PRIVATE_KEY_FILE
Public Key File:  $PUBLIC_KEY_FILE
Keys Text File:   $KEYS_TXT_FILE

========================================
Usage Instructions
========================================

1. PRIVATE KEY (CI/CD Signing):
   - Store in GitHub Secrets: UPDATE_MANIFEST_PRIVATE_KEY
   - Keep absolutely secret (never commit to git)
   - Use to sign update manifests before release

2. PUBLIC KEY (Agent Binary):
   - Embed in agent source code (hardcoded constant)
   - Used by agent to verify manifest signatures
   - Safe to commit to git (public verification key)

3. GitHub Secrets Setup:
   - Go to: Repository Settings → Secrets → Actions
   - Create new secret: UPDATE_MANIFEST_PRIVATE_KEY
   - Paste the private key base64 value above

4. Agent Code Integration:
   - In agent/cmd/agent/main.go, add:
     const updateManifestPublicKey = "$PUBLIC_KEY_BASE64"

5. Signing Process:
   - Use scripts/sign-manifest.sh to sign manifests
   - Verification happens automatically in agent

========================================
Security Notes
========================================

⚠️  CRITICAL: Never commit update-private.key to git
⚠️  Store private key in encrypted secrets only
⚠️  Rotate keys annually or if compromised
⚠️  Keep multiple backups of private key (encrypted)

========================================
EOF

echo -e "${GREEN}Keys saved to:${NC}"
echo "  - Private Key: $PRIVATE_KEY_FILE"
echo "  - Public Key:  $PUBLIC_KEY_FILE"
echo "  - Keys Info:   $KEYS_TXT_FILE"
echo

# Display keys info
cat "$KEYS_TXT_FILE"

# Set restrictive permissions
chmod 600 "$PRIVATE_KEY_FILE"
chmod 644 "$PUBLIC_KEY_FILE"
chmod 644 "$KEYS_TXT_FILE"

echo
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}SECURITY WARNINGS${NC}"
echo -e "${YELLOW}========================================${NC}"
echo
echo -e "${RED}⚠️  NEVER commit update-private.key to git${NC}"
echo -e "${RED}⚠️  Store private key in GitHub Secrets or encrypted vault${NC}"
echo -e "${RED}⚠️  Rotate keys annually or if compromised${NC}"
echo
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Store private key in GitHub Secrets (UPDATE_MANIFEST_PRIVATE_KEY)"
echo "2. Embed public key in agent source code"
echo "3. Delete local private key file after secure storage"
echo "4. Test signing with scripts/sign-manifest.sh"
echo
echo -e "${GREEN}========================================${NC}"
