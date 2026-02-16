## Linux Binary Verification Guide

This document explains how to verify the authenticity and integrity of PatchIQ agent binaries on Linux.

## Overview

Linux binaries use **SHA256 checksums** for integrity verification. Unlike code signing on Windows and macOS, Linux doesn't have a unified code signing infrastructure, so checksums are the standard approach.

**What checksums provide:**
- Verify binary has not been corrupted during download
- Detect tampering or modification
- Ensure you have the exact binary that was built

**What checksums don't provide:**
- Cryptographic proof of publisher identity (use GPG for this - planned for future)
- Protection against MITM attacks on checksum files (unless checksums are obtained via HTTPS)

---

## Checksum Files

For each agent release, we provide:

1. **Individual `.sha256` files** - One per binary
   ```
   patchiq-agent-linux-amd64.sha256
   patchiq-agent-linux-arm64.sha256
   ```

2. **Combined `checksums.txt`** - All checksums in one file
   ```
   abc123...  patchiq-agent-linux-amd64
   def456...  patchiq-agent-linux-arm64
   ```

---

## Manual Verification

### Method 1: Using Verification Script (Recommended)

Download binary and checksum file:
```bash
# Download binary
curl -LO https://github.com/org/repo/releases/download/v1.2.3/patchiq-agent-linux-amd64

# Download checksum
curl -LO https://github.com/org/repo/releases/download/v1.2.3/patchiq-agent-linux-amd64.sha256

# Verify
./scripts/verify-linux-checksums.sh patchiq-agent-linux-amd64
```

Expected output:
```
====================================
  Linux Binary Checksum Verification
====================================

Binary: patchiq-agent-linux-amd64
Checksum source: patchiq-agent-linux-amd64.sha256 (auto-detected)

Calculating checksum...

Expected: abc123...
Actual:   abc123...

====================================
  ✓ Checksum verified successfully!
====================================

The binary is authentic and has not been tampered with.
```

### Method 2: Using sha256sum Directly

```bash
# Verify using individual checksum file
sha256sum -c patchiq-agent-linux-amd64.sha256

# Expected output:
# patchiq-agent-linux-amd64: OK

# Or verify using combined checksums file
sha256sum -c checksums.txt

# Expected output:
# patchiq-agent-linux-amd64: OK
# patchiq-agent-linux-arm64: OK
```

### Method 3: Manual Calculation

```bash
# Calculate checksum
sha256sum patchiq-agent-linux-amd64

# Output:
# abc123def456...  patchiq-agent-linux-amd64

# Compare with published checksum manually
cat patchiq-agent-linux-amd64.sha256
```

---

## Automatic Verification (Agent Updates)

The PatchIQ agent automatically verifies checksums when downloading updates:

1. Agent requests update from backend API
2. Backend returns download URL and SHA256 checksum
3. Agent downloads binary
4. Agent calculates checksum during download
5. Agent compares calculated vs expected checksum
6. If mismatch: Update is rejected, error logged
7. If match: Update proceeds

See: `agent/internal/update/update.go` for implementation details.

---

## Generating Checksums (For Developers)

### Local Build

```bash
# Generate checksums for all binaries in dist/
./scripts/generate-checksums.sh agent/dist

# Output:
# - agent/dist/<binary>.sha256 (individual files)
# - agent/dist/checksums.txt (combined file)
```

### Makefile Integration

```bash
# Build agent and generate checksums
make agent-release

# Checksums are automatically generated
ls -la agent/dist/*.sha256
```

### CI/CD Workflow

The `.github/workflows/agent-release.yml` workflow automatically:
1. Builds binaries for all platforms
2. Generates individual `.sha256` files
3. Creates combined `checksums.txt`
4. Publishes both binaries and checksums as GitHub release assets

No manual intervention required.

---

## Checksum File Format

### Individual .sha256 File

```
abc123def456...  patchiq-agent-linux-amd64
```

- First field: 64-character hex SHA256 hash
- Two spaces
- Second field: Filename

### Combined checksums.txt File

```
abc123def456...  patchiq-agent-linux-amd64
def789abc012...  patchiq-agent-linux-arm64
ghi345def678...  patchiq-agent-darwin-amd64
```

- Same format as individual files
- One line per binary

---

## Troubleshooting

### "checksum: No such file or directory"

**Cause:** Checksum file not found

**Solution:**
```bash
# Download checksum file from GitHub releases
curl -LO https://github.com/org/repo/releases/download/v1.2.3/patchiq-agent-linux-amd64.sha256

# Or use --checksum flag with explicit hash
./scripts/verify-linux-checksums.sh patchiq-agent-linux-amd64 \
  --checksum abc123def456...
```

### "Checksum verification failed"

**Cause:** Binary corrupted or tampered with

**Solution:**
1. Delete the binary
2. Download again from official source
3. Verify checksum matches
4. **Do not use** if checksum still fails

**Important:** Never use a binary that fails checksum verification!

### "Expected checksum not found in checksums.txt"

**Cause:** Wrong checksums.txt file or binary name mismatch

**Solution:**
```bash
# Check binary name matches
ls -la patchiq-agent-linux-amd64

# Check checksums.txt contains the binary
grep "patchiq-agent-linux-amd64" checksums.txt

# Use individual .sha256 file instead
sha256sum -c patchiq-agent-linux-amd64.sha256
```

---

## Future: GPG Signing

GPG (GNU Privacy Guard) signing is planned for future enhancement. GPG provides:

- Cryptographic proof of publisher identity
- Protection against MITM attacks on checksum files
- Industry-standard verification for open-source software

**Planned workflow:**

1. Generate GPG key pair:
   ```bash
   gpg --gen-key
   ```

2. Sign binary:
   ```bash
   gpg --detach-sign --armor patchiq-agent-linux-amd64
   # Creates patchiq-agent-linux-amd64.asc
   ```

3. Verify signature:
   ```bash
   # Import PatchIQ public key (one-time)
   gpg --import patchiq-public.asc

   # Verify signature
   gpg --verify patchiq-agent-linux-amd64.asc patchiq-agent-linux-amd64
   ```

**Status:** Planned for future release (see `scripts/gpg-sign-linux.sh` placeholder)

---

## Security Best Practices

### For Users

1. **Always verify checksums** before running binaries
   ```bash
   ./scripts/verify-linux-checksums.sh patchiq-agent-linux-amd64
   ```

2. **Download from official sources only**
   - GitHub releases: https://github.com/org/repo/releases
   - Official website: https://patchiq.io/downloads

3. **Use HTTPS** when downloading
   - Ensures checksum file itself isn't tampered with during transit

4. **Never skip verification**
   - If checksum fails, **do not proceed**
   - Report to security@patchiq.io

### For Developers

1. **Protect checksum generation**
   - Generate checksums in trusted CI/CD environment
   - Never manually create checksums for production binaries

2. **Automate verification in scripts**
   ```bash
   #!/bin/bash
   curl -LO https://example.com/patchiq-agent-linux-amd64
   curl -LO https://example.com/patchiq-agent-linux-amd64.sha256

   if ! sha256sum -c patchiq-agent-linux-amd64.sha256; then
     echo "Checksum verification failed!"
     exit 1
   fi

   chmod +x patchiq-agent-linux-amd64
   ./patchiq-agent-linux-amd64
   ```

3. **Include verification in documentation**
   - Installation guides should include checksum verification steps
   - Deployment scripts should fail on checksum mismatch

---

## Verification Commands Reference

### Generate Checksums

```bash
# Single binary
sha256sum patchiq-agent-linux-amd64 > patchiq-agent-linux-amd64.sha256

# All binaries in directory
./scripts/generate-checksums.sh agent/dist
```

### Verify Checksums

```bash
# Using verification script (recommended)
./scripts/verify-linux-checksums.sh patchiq-agent-linux-amd64

# Using sha256sum directly
sha256sum -c patchiq-agent-linux-amd64.sha256

# Manual comparison
sha256sum patchiq-agent-linux-amd64
cat patchiq-agent-linux-amd64.sha256
```

### Download and Verify (Complete Workflow)

```bash
#!/bin/bash
VERSION="v1.2.3"
BINARY="patchiq-agent-linux-amd64"
BASE_URL="https://github.com/org/repo/releases/download"

# Download binary and checksum
curl -LO "${BASE_URL}/${VERSION}/${BINARY}"
curl -LO "${BASE_URL}/${VERSION}/${BINARY}.sha256"

# Verify checksum
if sha256sum -c "${BINARY}.sha256"; then
  echo "✓ Checksum verified"
  chmod +x "$BINARY"
  ./"$BINARY" --version
else
  echo "✗ Checksum verification failed"
  exit 1
fi
```

---

## Related Documentation

- [Code Signing Guide](./CODE-SIGNING.md) - Windows and macOS code signing
- [Agent Update Process](../agent/internal/update/README.md) - How agent updates work
- [CI/CD Workflow](../.github/workflows/agent-release.yml) - Automated checksum generation

---

**Last Updated:** 2026-02-14
**Status:** Production-ready
