# Update Manifest Documentation

This document explains the secure update manifest system for PatchIQ agent self-updates.

---

## Table of Contents

- [Overview](#overview)
- [Manifest Format](#manifest-format)
- [Signature Verification](#signature-verification)
- [Key Management](#key-management)
- [Signing Process](#signing-process)
- [Agent Integration](#agent-integration)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

The update manifest provides a secure, verifiable mechanism for distributing agent updates. It prevents:
- **Man-in-the-middle (MITM) attacks** - Attackers cannot inject malicious updates
- **Downgrade attacks** - Agents cannot be forced to install older versions
- **Tampering** - Manifest contents are cryptographically verified

### How It Works

1. **Build Release:**
   - CI/CD builds agent binaries for all platforms
   - Generates SHA256 checksums for each binary
   - Creates update manifest JSON with download URLs and checksums

2. **Sign Manifest:**
   - Manifest is signed with Ed25519 private key (held in CI/CD secrets)
   - Signature is embedded in manifest JSON

3. **Distribute Manifest:**
   - Signed manifest is published to CDN or backend API
   - Agents periodically check for updates

4. **Verify & Update:**
   - Agent downloads manifest
   - Verifies signature with embedded public key (hardcoded in agent)
   - If valid, downloads binary and verifies checksum
   - Replaces current binary and restarts

---

## Manifest Format

### JSON Schema

```json
{
  "version": "1.2.3",
  "releaseDate": "2026-02-14T12:00:00Z",
  "builds": {
    "windows-amd64": {
      "url": "https://downloads.patchiq.io/agents/patchify-agent-windows-amd64-1.2.3.exe",
      "sha256": "abc123def456...",
      "size": 18874368,
      "platform": "windows-amd64"
    },
    "darwin-arm64": {
      "url": "https://downloads.patchiq.io/agents/patchify-agent-darwin-arm64-1.2.3",
      "sha256": "fed456cba321...",
      "size": 17825792,
      "platform": "darwin-arm64"
    },
    "linux-amd64": {
      "url": "https://downloads.patchiq.io/agents/patchify-agent-linux-amd64-1.2.3",
      "sha256": "789abc456def...",
      "size": 16973824,
      "platform": "linux-amd64"
    }
  },
  "signature": "YXNkZmFzZGZhc2RmYXNkZmFzZGZhc2RmYXNkZg==",
  "signatureAlg": "Ed25519",
  "minAgentVersion": "1.0.0",
  "releaseNotes": "Bug fixes and performance improvements"
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Semantic version number (e.g., "1.2.3") |
| `releaseDate` | string (ISO 8601) | Yes | Release timestamp in UTC |
| `builds` | object | Yes | Map of platform → build info |
| `builds[platform].url` | string | Yes | Download URL (presigned or direct) |
| `builds[platform].sha256` | string | Yes | SHA256 checksum (hex-encoded) |
| `builds[platform].size` | integer | Yes | File size in bytes |
| `builds[platform].platform` | string | Yes | Platform identifier |
| `signature` | string | Yes | Base64-encoded Ed25519 signature |
| `signatureAlg` | string | Yes | Signature algorithm (always "Ed25519") |
| `minAgentVersion` | string | No | Minimum agent version that can apply this update |
| `releaseNotes` | string | No | Human-readable release notes |

### Platform Identifiers

| Platform | Identifier |
|----------|------------|
| Linux 64-bit | `linux-amd64` |
| Linux ARM64 | `linux-arm64` |
| Windows 64-bit | `windows-amd64` |
| Windows ARM64 | `windows-arm64` |
| macOS Intel | `darwin-amd64` |
| macOS Apple Silicon | `darwin-arm64` |

---

## Signature Verification

### Ed25519 Digital Signatures

**Why Ed25519?**
- Fast verification (critical for embedded systems)
- Small keys (32 bytes public, 64 bytes private)
- Secure (equivalent to 128-bit security)
- Simple implementation (no parameter choices)

**Signature Process:**

1. **Canonical JSON Creation:**
   ```json
   {
     "version": "1.2.3",
     "releaseDate": "2026-02-14T12:00:00Z",
     "builds": {...},
     "signatureAlg": "Ed25519",
     "minAgentVersion": "1.0.0",
     "releaseNotes": "..."
   }
   ```
   (Note: `signature` field is removed before signing)

2. **Sign Canonical JSON:**
   ```go
   signature := ed25519.Sign(privateKey, canonicalJSON)
   ```

3. **Embed Signature:**
   ```json
   {
     "version": "1.2.3",
     ...
     "signature": "base64-encoded-signature",
     "signatureAlg": "Ed25519"
   }
   ```

4. **Verify Signature:**
   ```go
   valid := ed25519.Verify(publicKey, canonicalJSON, signature)
   ```

---

## Key Management

### Key Generation

**Generate Ed25519 key pair:**

```bash
# Method 1: Using provided script
./scripts/generate-update-keys.sh

# Method 2: Using OpenSSL
openssl genpkey -algorithm Ed25519 -out update-private.key
openssl pkey -in update-private.key -pubout -out update-public.key
```

**Output:**
- `update-private.key` - Private key (KEEP SECRET)
- `update-public.key` - Public key (embed in agent)
- `update-keys.txt` - Base64-encoded keys for easy integration

### Key Storage

#### Private Key (Signing Key)

**⚠️ CRITICAL: Never commit private key to git or expose in logs**

**Recommended Storage:**

1. **GitHub Secrets** (for CI/CD)
   ```
   Name: UPDATE_MANIFEST_PRIVATE_KEY
   Value: <base64-encoded-private-key>
   ```

2. **Azure Key Vault** (for enterprise)
   ```bash
   az keyvault secret set \
     --vault-name "patchiq-vault" \
     --name "update-manifest-private-key" \
     --value "<base64-encoded-private-key>"
   ```

3. **Encrypted File** (for local signing)
   ```bash
   # Encrypt with GPG
   gpg --symmetric --cipher-algo AES256 update-private.key
   # Output: update-private.key.gpg

   # Decrypt when needed
   gpg --decrypt update-private.key.gpg > update-private.key
   ```

#### Public Key (Verification Key)

**Safe to commit to git - embedded in agent binary**

**Agent Integration:**

```go
// agent/cmd/agent/main.go
const updateManifestPublicKey = "YXNkZmFzZGZhc2RmYXNkZg=="  // Base64-encoded

func main() {
    verifier, err := update.NewManifestVerifier(updateManifestPublicKey)
    if err != nil {
        log.Fatal().Err(err).Msg("Failed to initialize manifest verifier")
    }
    // Use verifier to check for updates
}
```

### Key Rotation

**When to Rotate:**
- Annually (proactive security)
- If private key is compromised
- When changing key management infrastructure

**Rotation Process:**

1. **Generate New Key Pair:**
   ```bash
   ./scripts/generate-update-keys.sh new-keys/
   ```

2. **Update Agent Code:**
   ```go
   // Support both old and new public keys during transition
   const updateManifestPublicKeyOld = "old-key-base64"
   const updateManifestPublicKeyNew = "new-key-base64"

   func verifyManifest(manifest) error {
       // Try new key first
       if err := verifyWithKey(manifest, updateManifestPublicKeyNew); err == nil {
           return nil
       }
       // Fall back to old key (for gradual rollout)
       return verifyWithKey(manifest, updateManifestPublicKeyOld)
   }
   ```

3. **Sign Manifests with Both Keys:**
   ```bash
   # Transition period: sign with both keys
   ./scripts/sign-manifest.sh manifest.json $OLD_PRIVATE_KEY
   ./scripts/sign-manifest.sh manifest.json $NEW_PRIVATE_KEY
   ```

4. **Remove Old Key After Transition:**
   - Wait for all agents to update (30-90 days)
   - Remove old public key from agent code
   - Revoke old private key

---

## Signing Process

### Manual Signing (Development)

```bash
# Step 1: Create manifest template
cat > manifest.json <<EOF
{
  "version": "1.2.3",
  "releaseDate": "2026-02-14T12:00:00Z",
  "builds": {
    "linux-amd64": {
      "url": "https://example.com/agent-linux-amd64",
      "sha256": "abc123...",
      "size": 16973824,
      "platform": "linux-amd64"
    }
  },
  "minAgentVersion": "1.0.0",
  "releaseNotes": "Test release"
}
EOF

# Step 2: Sign manifest
./scripts/sign-manifest.sh manifest.json "$UPDATE_MANIFEST_PRIVATE_KEY"

# Step 3: Verify signature
cat manifest.json | jq '.signature'
```

### CI/CD Signing (GitHub Actions)

**Workflow Integration:**

```yaml
# .github/workflows/agent-release.yml
- name: Generate update manifest
  run: |
    # Create manifest.json with build URLs and checksums
    cat > manifest.json <<EOF
    {
      "version": "${{ steps.version.outputs.version }}",
      "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "builds": {
        $(for file in dist/*; do
          platform=$(basename $file | sed 's/patchify-agent-//' | sed 's/-[0-9].*//')
          checksum=$(sha256sum $file | cut -d' ' -f1)
          size=$(stat -f%z $file)
          url="https://downloads.patchiq.io/agents/$(basename $file)"
          echo "\"$platform\": {\"url\": \"$url\", \"sha256\": \"$checksum\", \"size\": $size, \"platform\": \"$platform\"}"
        done | paste -sd,)
      }
    }
    EOF

- name: Sign manifest
  env:
    UPDATE_MANIFEST_PRIVATE_KEY: ${{ secrets.UPDATE_MANIFEST_PRIVATE_KEY }}
  run: |
    ./scripts/sign-manifest.sh manifest.json "$UPDATE_MANIFEST_PRIVATE_KEY"

- name: Upload signed manifest
  run: |
    # Upload to CDN or S3
    aws s3 cp manifest.json s3://patchiq-updates/manifest.json
```

---

## Agent Integration

### Checking for Updates

```go
// agent/internal/update/checker.go
package update

import (
    "time"
    "github.com/rs/zerolog/log"
)

const updateManifestURL = "https://updates.patchiq.io/manifest.json"
const updateManifestPublicKey = "YXNkZmFzZGZhc2RmYXNkZg=="  // Base64

func CheckForUpdates(currentVersion string) (*Manifest, error) {
    // Create verifier
    verifier, err := NewManifestVerifier(updateManifestPublicKey)
    if err != nil {
        return nil, err
    }

    // Fetch and verify manifest
    manifest, err := verifier.FetchManifest(updateManifestURL)
    if err != nil {
        return nil, err
    }

    // Validate manifest structure
    if err := manifest.ValidateManifest(); err != nil {
        return nil, err
    }

    // Check if update is available
    if manifest.Version == currentVersion {
        log.Info().Msg("Agent is up to date")
        return nil, nil
    }

    log.Info().
        Str("currentVersion", currentVersion).
        Str("availableVersion", manifest.Version).
        Msg("Update available")

    return manifest, nil
}
```

### Applying Updates

```go
// agent/internal/update/applier.go
func ApplyUpdate(manifest *Manifest, platform string) error {
    // Get build for current platform
    build, err := manifest.GetBuildForPlatform(platform)
    if err != nil {
        return err
    }

    // Download binary
    log.Info().Str("url", build.URL).Msg("Downloading update")
    req := Request{
        DownloadURL: build.URL,
        Checksum:    build.SHA256,
        Version:     manifest.Version,
    }

    // Perform update (downloads, verifies checksum, replaces binary)
    result := Perform(req)
    if !result.Success {
        return fmt.Errorf("update failed: %s", result.ErrorMessage)
    }

    return nil
}
```

---

## Security Considerations

### Threat Model

**Protected Against:**
- ✅ MITM attacks (signature verification)
- ✅ Tampered manifests (cryptographic signature)
- ✅ Tampered binaries (SHA256 checksum)
- ✅ Downgrade attacks (version comparison)
- ✅ Replay attacks (timestamp validation)

**Not Protected Against:**
- ❌ Compromised private key (rotate keys if suspected)
- ❌ Vulnerable backend serving manifest (use HTTPS + CDN)
- ❌ Side-channel attacks on agent (assume agent runs in trusted environment)

### Best Practices

1. **Private Key Security:**
   - Never commit to git
   - Encrypt at rest (GPG, KMS, Key Vault)
   - Limit access (2-3 authorized personnel only)
   - Rotate annually

2. **Manifest Distribution:**
   - Serve over HTTPS (TLS 1.2+)
   - Use CDN for availability (CloudFront, Cloudflare)
   - Enable caching (reduce load, improve performance)
   - Monitor access logs (detect anomalies)

3. **Version Management:**
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Never reuse version numbers
   - Include `minAgentVersion` for breaking changes
   - Test rollout on canary group first

4. **Incident Response:**
   - If private key compromised:
     - Immediately rotate keys
     - Revoke compromised key
     - Sign all manifests with new key
     - Push emergency update to all agents
   - If malicious manifest detected:
     - Take down manifest URL
     - Investigate compromise vector
     - Notify users
     - Issue new signed manifest

---

## Troubleshooting

### Issue: "Signature verification failed"

**Cause:** Manifest was tampered with or signed with wrong key

**Solution:**
1. Re-download manifest (may be corrupted)
2. Verify public key matches signing key
3. Check manifest hasn't been modified after signing

**Debug:**
```bash
# Verify signature manually
go run tools/verify-manifest.go manifest.json
```

---

### Issue: "Failed to decode public key"

**Cause:** Public key is not valid base64

**Solution:**
1. Regenerate keys with `generate-update-keys.sh`
2. Copy base64 value from `update-keys.txt`
3. Update agent code with correct public key

**Verify:**
```bash
# Decode public key
echo "YXNkZmFzZGZhc2RmYXNkZg==" | base64 -d | xxd
# Should output 32 bytes
```

---

### Issue: "Invalid public key size"

**Cause:** Public key is not 32 bytes (Ed25519 requirement)

**Solution:**
1. Ensure you're using Ed25519 (not RSA or ECDSA)
2. Extract raw key bytes (not PEM wrapper)

**Correct extraction:**
```bash
# Extract raw 32-byte public key
openssl pkey -in update-public.key -pubin -outform DER | tail -c 32 | base64
```

---

### Issue: "Manifest has no builds"

**Cause:** Manifest JSON is malformed or missing builds

**Solution:**
1. Validate manifest JSON with jq: `jq '.' manifest.json`
2. Ensure builds object has at least one platform
3. Verify each build has url, sha256, size fields

---

### Issue: "Checksum mismatch"

**Cause:** Downloaded binary doesn't match manifest checksum

**Solution:**
1. Re-download binary (may be corrupted)
2. Verify checksum in manifest is correct
3. Check network proxy isn't modifying downloads

**Verify:**
```bash
# Calculate checksum
sha256sum patchify-agent-linux-amd64
# Compare with manifest
jq -r '.builds["linux-amd64"].sha256' manifest.json
```

---

## Tools

### Manifest Generation Tool

```bash
# tools/generate-manifest.sh
#!/bin/bash
VERSION=$1
DIST_DIR=$2

cat > manifest.json <<EOF
{
  "version": "$VERSION",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "builds": {
EOF

first=true
for file in $DIST_DIR/*; do
    [ ! -f "$file" ] && continue

    platform=$(basename $file | sed 's/patchify-agent-//' | sed 's/\.[^.]*$//')
    checksum=$(sha256sum $file | cut -d' ' -f1)
    size=$(stat -f%z $file 2>/dev/null || stat -c%s $file)
    url="https://downloads.patchiq.io/agents/$(basename $file)"

    [ "$first" = false ] && echo "," >> manifest.json
    cat >> manifest.json <<PLATFORM
    "$platform": {
      "url": "$url",
      "sha256": "$checksum",
      "size": $size,
      "platform": "$platform"
    }
PLATFORM
    first=false
done

cat >> manifest.json <<EOF
  }
}
EOF

echo "Manifest generated: manifest.json"
jq '.' manifest.json
```

### Manifest Verification Tool

```go
// tools/verify-manifest.go
package main

import (
    "encoding/json"
    "fmt"
    "os"
    "github.com/patchify/agent/internal/update"
)

const publicKey = "YXNkZmFzZGZhc2RmYXNkZg=="

func main() {
    if len(os.Args) != 2 {
        fmt.Fprintf(os.Stderr, "Usage: %s <manifest.json>\n", os.Args[0])
        os.Exit(1)
    }

    data, err := os.ReadFile(os.Args[1])
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error reading manifest: %v\n", err)
        os.Exit(1)
    }

    var manifest update.Manifest
    if err := json.Unmarshal(data, &manifest); err != nil {
        fmt.Fprintf(os.Stderr, "Error parsing manifest: %v\n", err)
        os.Exit(1)
    }

    verifier, err := update.NewManifestVerifier(publicKey)
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error creating verifier: %v\n", err)
        os.Exit(1)
    }

    if err := verifier.VerifyManifest(&manifest, data); err != nil {
        fmt.Fprintf(os.Stderr, "Verification failed: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("✅ Manifest signature is valid")
    fmt.Printf("Version: %s\n", manifest.Version)
    fmt.Printf("Builds: %d\n", len(manifest.Builds))
}
```

---

## References

- [Ed25519 Specification](https://ed25519.cr.yp.to/)
- [RFC 8032 - Edwards-Curve Digital Signature Algorithm](https://tools.ietf.org/html/rfc8032)
- [Go crypto/ed25519 Package](https://pkg.go.dev/crypto/ed25519)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-14
**Next Review:** 2026-08-14
