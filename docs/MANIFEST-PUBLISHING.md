# Auto-Update Manifest Publishing

**Document Version:** 1.0
**Last Updated:** 2026-02-14
**Status:** Production Ready

---

## Overview

This document describes the auto-update manifest system for PatchIQ Agent, including:
- Manifest format and structure
- Generation process
- Signing and verification
- Publishing to CDN
- Rollback support
- CI/CD integration

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Manifest Format](#manifest-format)
3. [Generation Process](#generation-process)
4. [Signing](#signing)
5. [Publishing](#publishing)
6. [CI/CD Integration](#cicd-integration)
7. [Rollback](#rollback)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Generating a Manifest

```bash
# Navigate to scripts directory
cd agent/scripts

# Generate manifest for version 1.0.0
./generate-manifest.sh 1.0.0

# Output: agent-manifest-1.0.0.json
```

### Signing a Manifest

```bash
# Set private key (base64-encoded Ed25519 key)
export UPDATE_MANIFEST_PRIVATE_KEY="your-base64-encoded-private-key"

# Generate and sign in one step
./generate-manifest.sh 1.0.0

# Or sign manually
../../scripts/sign-manifest.sh agent-manifest-1.0.0.json "$UPDATE_MANIFEST_PRIVATE_KEY"
```

### Publishing to CDN

```bash
# Configure AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"

# Upload to S3
aws s3 cp agent-manifest-1.0.0.json \
    s3://patchiq-cdn/agent/manifest-1.0.0.json \
    --content-type application/json \
    --acl public-read

# Update latest manifest
aws s3 cp agent-manifest-1.0.0.json \
    s3://patchiq-cdn/agent/manifest-latest.json \
    --content-type application/json \
    --acl public-read
```

---

## Manifest Format

### Structure

```json
{
  "version": "1.0.0",
  "releaseDate": "2026-02-14T12:00:00Z",
  "builds": {
    "windows-amd64": {
      "url": "https://cdn.patchiq.io/agent/1.0.0/patchiq-agent-windows-amd64.exe",
      "sha256": "a12c7b59c2b6388332291d5f9ac907deff25fa36092c8d17633f298a90a15701",
      "size": 18821120
    },
    "windows-arm64": {
      "url": "https://cdn.patchiq.io/agent/1.0.0/patchiq-agent-windows-arm64.exe",
      "sha256": "55b63034f30e4b0755a8cc6afcf32cce13e26af5103ec79428e69ca5e80f4a1c",
      "size": 17502208
    },
    "darwin-amd64": {
      "url": "https://cdn.patchiq.io/agent/1.0.0/patchiq-agent-darwin-amd64",
      "sha256": "df6c7e75f5acb09511cb73104507f5a2eb30c129a6fdeb7bf851d133f66e3577",
      "size": 18653888
    },
    "darwin-arm64": {
      "url": "https://cdn.patchiq.io/agent/1.0.0/patchiq-agent-darwin-arm64",
      "sha256": "ff3003aa8f09fc368fa478cd4927f798cc0c4f2f274ee781e309347c03c86109",
      "size": 21147778
    },
    "linux-amd64": {
      "url": "https://cdn.patchiq.io/agent/1.0.0/patchiq-agent-linux-amd64",
      "sha256": "17e5e8e1bdb8b3caf41a48d3ffb6bafd1799c2ef9f892c605566c41fdbbe26a6",
      "size": 18294473
    },
    "linux-arm64": {
      "url": "https://cdn.patchiq.io/agent/1.0.0/patchiq-agent-linux-arm64",
      "sha256": "c23fec46a14c6059c8f54d1e20eb4997146a9adafdae25670257df2e957ead39",
      "size": 17162761
    }
  },
  "signature": "base64-encoded-ed25519-signature",
  "signatureAlg": "Ed25519"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Semantic version (e.g., "1.0.0", "2.1.0-beta") |
| `releaseDate` | string | ISO 8601 timestamp (UTC) |
| `builds` | object | Platform-specific build information |
| `builds.{platform}.url` | string | Download URL for binary |
| `builds.{platform}.sha256` | string | SHA256 checksum (hex-encoded) |
| `builds.{platform}.size` | integer | File size in bytes |
| `signature` | string | Ed25519 signature (base64-encoded) |
| `signatureAlg` | string | Signature algorithm (always "Ed25519") |

### Supported Platforms

| Platform Key | OS | Architecture | Binary Name |
|--------------|-----|--------------|-------------|
| `windows-amd64` | Windows | x86_64 | `patchiq-agent-windows-amd64.exe` |
| `windows-arm64` | Windows | ARM64 | `patchiq-agent-windows-arm64.exe` |
| `darwin-amd64` | macOS | x86_64 (Intel) | `patchiq-agent-darwin-amd64` |
| `darwin-arm64` | macOS | ARM64 (Apple Silicon) | `patchiq-agent-darwin-arm64` |
| `linux-amd64` | Linux | x86_64 | `patchiq-agent-linux-amd64` |
| `linux-arm64` | Linux | ARM64 | `patchiq-agent-linux-arm64` |

---

## Generation Process

### Prerequisites

**Required:**
- All platform binaries in `agent/dist/`
- `jq` (JSON processor)
- `sha256sum` or `shasum` (checksum utility)
- `bc` (for size calculations, optional)

**Optional:**
- Ed25519 private key (for signing)
- AWS CLI (for publishing to S3)

### Building All Binaries

```bash
cd agent

# Build all platforms
GOOS=windows GOARCH=amd64 go build -o dist/patchiq-agent-windows-amd64.exe ./cmd/agent
GOOS=windows GOARCH=arm64 go build -o dist/patchiq-agent-windows-arm64.exe ./cmd/agent
GOOS=darwin GOARCH=amd64 go build -o dist/patchiq-agent-darwin-amd64 ./cmd/agent
GOOS=darwin GOARCH=arm64 go build -o dist/patchiq-agent-darwin-arm64 ./cmd/agent
GOOS=linux GOARCH=amd64 go build -o dist/patchiq-agent-linux-amd64 ./cmd/agent
GOOS=linux GOARCH=arm64 go build -o dist/patchiq-agent-linux-arm64 ./cmd/agent
```

### Generating the Manifest

```bash
cd agent/scripts

# Generate manifest
./generate-manifest.sh 1.0.0

# Custom output file
./generate-manifest.sh 1.0.0 my-manifest.json

# Custom CDN URL
CDN_BASE_URL=https://my-cdn.com/agent/1.0.0 ./generate-manifest.sh 1.0.0
```

### What the Script Does

1. **Validates Dependencies**
   - Checks for `jq`, `sha256sum`/`shasum`
   - Ensures all binaries exist

2. **Calculates Checksums**
   - Computes SHA256 for each binary
   - Uses `sha256sum` (Linux) or `shasum -a 256` (macOS)

3. **Gets File Sizes**
   - Uses `stat -f%z` (macOS) or `stat -c%s` (Linux)
   - Stores size in bytes

4. **Generates JSON**
   - Creates manifest with all metadata
   - Formats with `jq` for readability

5. **Signs (Optional)**
   - Calls `sign-manifest.sh` if key is available
   - Adds `signature` and `signatureAlg` fields

6. **Displays Summary**
   - Shows version, platforms, sizes
   - Provides publishing instructions

---

## Signing

### Overview

Manifests are signed with **Ed25519** digital signatures to ensure:
- **Authenticity** - Manifest came from PatchIQ
- **Integrity** - Manifest hasn't been tampered with
- **Non-repudiation** - Signature proves origin

### Generating Keys

```bash
# Use the key generation script from Pipeline 4
cd scripts

# Generate Ed25519 key pair
./generate-ed25519-key.sh

# Output:
#   private-key.pem (keep secret)
#   public-key.pem (distribute with agent)
#   private-key.base64 (for signing)
#   public-key.base64 (for verification)
```

### Setting the Private Key

```bash
# Read private key from file
export UPDATE_MANIFEST_PRIVATE_KEY=$(cat private-key.base64)

# Or set directly (example only - use secure method in production)
export UPDATE_MANIFEST_PRIVATE_KEY="base64-encoded-key-here"
```

### Signing Process

**Automatic (during generation):**

```bash
export UPDATE_MANIFEST_PRIVATE_KEY=$(cat private-key.base64)
cd agent/scripts
./generate-manifest.sh 1.0.0
```

**Manual (after generation):**

```bash
cd scripts
./sign-manifest.sh agent/scripts/agent-manifest-1.0.0.json "$UPDATE_MANIFEST_PRIVATE_KEY"
```

### Verification

The agent verifies manifests using the public key:

```go
// Agent code (internal/update/verifier.go)
func VerifyManifest(manifestJSON []byte, publicKey []byte) error {
    // Parse manifest
    var manifest Manifest
    json.Unmarshal(manifestJSON, &manifest)

    // Extract signature
    signature := base64.Decode(manifest.Signature)

    // Verify with Ed25519
    if !ed25519.Verify(publicKey, canonicalJSON, signature) {
        return errors.New("invalid signature")
    }

    return nil
}
```

---

## Publishing

### Manual Publishing

**To S3:**

```bash
# Configure AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Upload versioned manifest
aws s3 cp agent-manifest-1.0.0.json \
    s3://patchiq-cdn/agent/manifest-1.0.0.json \
    --content-type application/json \
    --acl public-read \
    --cache-control "max-age=3600"

# Update latest manifest
aws s3 cp agent-manifest-1.0.0.json \
    s3://patchiq-cdn/agent/manifest-latest.json \
    --content-type application/json \
    --acl public-read \
    --cache-control "max-age=300"
```

**To CloudFront:**

```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
    --distribution-id E1234EXAMPLE \
    --paths "/agent/manifest-latest.json"
```

### Automatic Publishing

The script can auto-publish if AWS credentials are configured:

```bash
# Set credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"

# Generate and publish
cd agent/scripts
./generate-manifest.sh 1.0.0
```

### URL Structure

| Type | URL | Cache |
|------|-----|-------|
| Latest | `https://cdn.patchiq.io/agent/manifest-latest.json` | 5 minutes |
| Versioned | `https://cdn.patchiq.io/agent/manifest-1.0.0.json` | 1 hour |
| Binary | `https://cdn.patchiq.io/agent/1.0.0/patchiq-agent-{platform}` | 24 hours |

### CDN Configuration

**S3 Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::patchiq-cdn/agent/*"
    }
  ]
}
```

**CORS Configuration:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

---

## CI/CD Integration

### GitHub Actions Workflow

The project includes a GitHub Actions workflow for automated publishing:

**File:** `.github/workflows/publish-agent-manifest.yml`

**Triggers:**
- On release creation
- Manual workflow dispatch

**Steps:**
1. Checkout code
2. Download release artifacts (binaries)
3. Generate manifest
4. Sign manifest
5. Upload to S3
6. Invalidate CDN cache
7. Keep last 3 manifests (rollback)

### Usage

**On Release:**

```bash
# Create a GitHub release
gh release create v1.0.0 --title "PatchIQ Agent v1.0.0" --notes "Release notes"

# Workflow runs automatically
```

**Manual Dispatch:**

```bash
# Trigger workflow manually
gh workflow run publish-agent-manifest.yml -f version=1.0.0
```

### Required Secrets

Configure these in GitHub Actions secrets:

| Secret | Description |
|--------|-------------|
| `UPDATE_MANIFEST_PRIVATE_KEY` | Base64-encoded Ed25519 private key |
| `AWS_ROLE_ARN` | AWS IAM role for OIDC authentication |
| `S3_BUCKET` | S3 bucket name (default: `patchiq-cdn`) |

---

## Rollback

### Strategy

The system keeps the **last 3 manifests** for rollback support:

1. **Current** - `manifest-latest.json`
2. **Previous** - `manifest-{previous-version}.json`
3. **Stable** - `manifest-{stable-version}.json`

### Rolling Back

**To specific version:**

```bash
# Copy old manifest to latest
aws s3 cp s3://patchiq-cdn/agent/manifest-1.0.0.json \
    s3://patchiq-cdn/agent/manifest-latest.json \
    --content-type application/json \
    --acl public-read

# Invalidate CDN cache
aws cloudfront create-invalidation \
    --distribution-id E1234EXAMPLE \
    --paths "/agent/manifest-latest.json"
```

**Agent behavior:**
- Agents check `manifest-latest.json` periodically (default: 1 hour)
- If new version available, download and verify
- If verification fails, retry or wait for next check
- No automatic rollback (requires manual intervention)

### Cleanup

The CI/CD workflow automatically deletes manifests older than the last 3:

```bash
# List manifests
aws s3 ls s3://patchiq-cdn/agent/ | grep manifest-

# Keep last 3, delete older
aws s3 ls s3://patchiq-cdn/agent/ | \
    grep 'manifest-[0-9]' | \
    sort -r | \
    tail -n +4 | \
    awk '{print $4}' | \
    while read manifest; do
        aws s3 rm "s3://patchiq-cdn/agent/$manifest"
    done
```

---

## Testing

### Local Testing

**1. Generate test manifest:**

```bash
cd agent/scripts
./generate-manifest.sh 1.0.0-test
```

**2. Verify structure:**

```bash
# Check JSON is valid
jq '.' agent-manifest-1.0.0-test.json

# Verify all platforms
jq '.builds | keys' agent-manifest-1.0.0-test.json

# Check checksums
jq '.builds."linux-amd64".sha256' agent-manifest-1.0.0-test.json
```

**3. Verify checksums:**

```bash
# Recalculate checksum
sha256sum ../dist/patchiq-agent-linux-amd64

# Compare with manifest
jq -r '.builds."linux-amd64".sha256' agent-manifest-1.0.0-test.json
```

**4. Test signing:**

```bash
# Generate test key
cd ../../scripts
./generate-ed25519-key.sh

# Sign manifest
export UPDATE_MANIFEST_PRIVATE_KEY=$(cat private-key.base64)
cd ../agent/scripts
./generate-manifest.sh 1.0.0-test

# Verify signature exists
jq '.signature' agent-manifest-1.0.0-test.json
```

### Integration Testing

**1. Publish to test CDN:**

```bash
# Upload to test bucket
aws s3 cp agent-manifest-1.0.0-test.json \
    s3://patchiq-cdn-test/agent/manifest-test.json \
    --content-type application/json

# Get URL
echo "https://patchiq-cdn-test.s3.amazonaws.com/agent/manifest-test.json"
```

**2. Point agent to test manifest:**

```bash
# Configure agent
export UPDATE_MANIFEST_URL="https://patchiq-cdn-test.s3.amazonaws.com/agent/manifest-test.json"

# Run agent
./patchiq-agent
```

**3. Verify agent downloads manifest:**

```bash
# Check logs
tail -f /var/log/patchiq/agent.log | grep update

# Expected:
# Checking for updates...
# Downloaded manifest: version 1.0.0-test
# Verifying signature...
# Signature valid
```

---

## Troubleshooting

### Generation Issues

**Issue: Binary not found**

```
Error: Missing binary: patchiq-agent-linux-arm64
```

**Solution:**

```bash
# Build missing binary
cd agent
GOOS=linux GOARCH=arm64 go build -o dist/patchiq-agent-linux-arm64 ./cmd/agent
```

**Issue: jq not found**

```
Error: jq not found. Please install jq.
```

**Solution:**

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# RHEL/CentOS
sudo yum install jq
```

### Signing Issues

**Issue: Invalid signature**

```
Error: Manifest signature verification failed
```

**Causes:**
1. Wrong private/public key pair
2. Manifest modified after signing
3. Corrupt base64 encoding

**Solution:**

```bash
# Regenerate key pair
cd scripts
./generate-ed25519-key.sh

# Sign with new key
export UPDATE_MANIFEST_PRIVATE_KEY=$(cat private-key.base64)
cd ../agent/scripts
./generate-manifest.sh 1.0.0
```

### Publishing Issues

**Issue: S3 upload fails**

```
Error: Access Denied
```

**Solution:**

```bash
# Check credentials
aws sts get-caller-identity

# Verify bucket permissions
aws s3 ls s3://patchiq-cdn/

# Check IAM policy allows:
# - s3:PutObject
# - s3:PutObjectAcl
```

**Issue: CDN not updating**

```
Old manifest still served
```

**Solution:**

```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
    --distribution-id E1234EXAMPLE \
    --paths "/agent/manifest-latest.json" "/agent/manifest-*.json"

# Check invalidation status
aws cloudfront get-invalidation \
    --distribution-id E1234EXAMPLE \
    --id INVALIDATION_ID
```

---

## Related Documentation

- **Pipeline 4**: Security & Code Signing (`docs/agent/PIPELINE-4-PRD.md`)
  - Ed25519 key generation
  - Signature verification
  - Certificate management

- **Pipeline 5**: Production Packaging (`docs/agent/PIPELINE-5-PRD.md`)
  - Overall packaging strategy
  - Installer creation
  - Multi-platform support

- **Agent Update**: Self-update implementation (`agent/internal/update/`)
  - Manifest fetching
  - Signature verification
  - Binary download and installation

---

## Support

**For manifest issues:**
- Email: support@patchiq.io
- Docs: https://docs.patchiq.io/agent/updates

**For development issues:**
- GitHub: https://github.com/patchiq/agent/issues
- Internal: Slack #agent-dev

---

**Document Version:** 1.0
**Last Updated:** 2026-02-14
**Status:** Production Ready
