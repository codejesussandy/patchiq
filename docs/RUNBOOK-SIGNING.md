# Code Signing Runbook

This runbook provides step-by-step procedures for code signing operations.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites Checklist](#prerequisites-checklist)
- [Local Signing (Development)](#local-signing-development)
- [CI/CD Signing (Production)](#cicd-signing-production)
- [Emergency Signing](#emergency-signing)
- [Troubleshooting](#troubleshooting)
- [Verification Procedures](#verification-procedures)

---

## Overview

### When to Use This Runbook

- **Regular Releases:** Automated via CI/CD (refer to CI/CD section for verification)
- **Emergency Patches:** Manual signing required (refer to Emergency Signing)
- **Testing:** Local signing for development (refer to Local Signing)
- **Troubleshooting:** Failed CI/CD builds (refer to Troubleshooting)

### Signing Methods

| Method | When to Use | Tools Required |
|--------|-------------|----------------|
| **Automated (CI/CD)** | Regular releases, tags | GitHub Actions, secrets configured |
| **Local (Manual)** | Development, testing | PowerShell, signtool, codesign |
| **Emergency** | Hotfixes, CI/CD failures | Manual signing + manual upload |

---

## Prerequisites Checklist

### General Prerequisites

- [ ] Certificates procured and active (not expired)
- [ ] Signing scripts present in repository (`installer/windows/`, `scripts/`)
- [ ] Binaries built and ready to sign
- [ ] Verification tools installed (signtool, codesign, jq)

### Windows Signing Prerequisites

- [ ] Windows machine or VM available
- [ ] Windows SDK installed (for signtool.exe)
- [ ] Certificate available:
  - [ ] USB token plugged in (for EV cert), OR
  - [ ] .pfx file available (for Standard cert)
- [ ] Certificate password known
- [ ] PowerShell 5.1+ installed

### macOS Signing Prerequisites

- [ ] macOS machine available (Monterey 12+ recommended)
- [ ] Xcode installed (for codesign, notarytool)
- [ ] Developer ID certificate in Keychain
- [ ] Apple ID credentials available:
  - [ ] Apple ID email
  - [ ] App-specific password (for notarization)
  - [ ] Team ID

### Update Manifest Signing Prerequisites

- [ ] Go 1.22+ installed (for signing script)
- [ ] jq installed (for JSON manipulation)
- [ ] Private key available (base64-encoded)
- [ ] Manifest JSON prepared

---

## Local Signing (Development)

### Windows Local Signing

**Purpose:** Sign Windows binaries locally for testing

**Time Required:** 5-10 minutes per binary

**Procedure:**

1. **Prepare Binary:**
   ```powershell
   # Build binary (if not already built)
   cd agent
   go build -o patchify-agent-windows-amd64.exe ./cmd/agent

   # Move to dist/
   Move-Item patchify-agent-windows-amd64.exe ../dist/
   ```

2. **Verify Prerequisites:**
   ```powershell
   # Check signtool is available
   Get-Command signtool.exe

   # If not found, add to PATH:
   $env:PATH += ";C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
   ```

3. **Sign Binary:**
   ```powershell
   # Method 1: Using signing script (recommended)
   cd ../
   .\installer\windows\sign-binary.ps1 `
     -CertificatePath "C:\certs\patchiq-code-signing.pfx" `
     -Password "YourCertificatePassword" `
     -FilePath "dist\patchify-agent-windows-amd64.exe" `
     -Verify $true

   # Method 2: Using signtool directly
   signtool.exe sign `
     /f "C:\certs\patchiq-code-signing.pfx" `
     /p "YourCertificatePassword" `
     /tr "http://timestamp.digicert.com" `
     /td sha256 `
     /fd sha256 `
     /v `
     "dist\patchify-agent-windows-amd64.exe"
   ```

4. **Verify Signature:**
   ```powershell
   # Using verification script
   .\scripts\verify-windows-signature.ps1 `
     -FilePath "dist\patchify-agent-windows-amd64.exe"

   # Or using signtool directly
   signtool.exe verify /pa /v "dist\patchify-agent-windows-amd64.exe"
   ```

5. **Test on Clean VM:**
   ```powershell
   # Copy binary to Windows 10/11 VM
   # Double-click to test SmartScreen behavior
   # Expected: No warning (for EV cert)
   ```

**Expected Output:**
```
[INFO] Signing file: dist\patchify-agent-windows-amd64.exe
[INFO] Executing: signtool.exe sign ...
[SUCCESS] File signed successfully
[INFO] Verifying signature...
[SUCCESS] Signature verified successfully
```

**Common Issues:**
- **signtool not found:** Install Windows SDK or add to PATH
- **Incorrect password:** Verify certificate password
- **Timestamp server timeout:** Try alternate timestamp server
- **SmartScreen warning:** Use EV certificate or build reputation

---

### macOS Local Signing

**Purpose:** Sign and notarize macOS binaries locally for testing

**Time Required:** 10-20 minutes per binary (includes notarization wait time)

**Procedure:**

1. **Prepare Binary:**
   ```bash
   # Build binary (if not already built)
   cd agent
   GOOS=darwin GOARCH=arm64 go build -o patchify-agent-darwin-arm64 ./cmd/agent

   # Move to dist/
   mv patchify-agent-darwin-arm64 ../dist/
   ```

2. **Verify Prerequisites:**
   ```bash
   # Check codesign is available
   which codesign

   # Check signing identity is available
   security find-identity -p codesigning -v

   # Expected output:
   # 1) ABC123... "Developer ID Application: PatchIQ Inc (TEAM_ID)"
   ```

3. **Sign Binary:**
   ```bash
   cd ../

   # Using signing script (recommended)
   ./scripts/sign-macos.sh \
     --identity "Developer ID Application: PatchIQ Inc (TEAM_ID)" \
     --binary dist/patchify-agent-darwin-arm64

   # Or manually with codesign
   codesign --sign "Developer ID Application: PatchIQ Inc (TEAM_ID)" \
     --options runtime \
     --timestamp \
     --force \
     dist/patchify-agent-darwin-arm64
   ```

4. **Notarize Binary:**
   ```bash
   # Set credentials
   export APPLE_ID="your@email.com"
   export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
   export APPLE_TEAM_ID="ABC123XYZ"

   # Notarize using script
   ./scripts/notarize-macos.sh \
     --binary dist/patchify-agent-darwin-arm64 \
     --bundle-id com.patchiq.agent

   # This will:
   # 1. Create ZIP archive
   # 2. Submit to Apple notary service
   # 3. Wait for notarization (2-10 minutes)
   # 4. Staple notarization ticket to binary
   ```

5. **Verify Signature and Notarization:**
   ```bash
   # Using verification script
   ./scripts/verify-macos-signature.sh \
     dist/patchify-agent-darwin-arm64

   # Or manually
   codesign --verify --verbose dist/patchify-agent-darwin-arm64
   spctl --assess --verbose dist/patchify-agent-darwin-arm64
   stapler validate dist/patchify-agent-darwin-arm64
   ```

6. **Test on Clean macOS VM:**
   ```bash
   # Copy binary to macOS 13+ VM
   # Run binary from terminal or double-click
   # Expected: No Gatekeeper warning
   ```

**Expected Output:**
```
[1/4] Signing binary...
✓ Binary signed successfully

[2/4] Creating ZIP archive...
✓ Archive created

[3/4] Submitting for notarization...
✓ Submission accepted (ID: abc123-...)
Waiting for notarization... (this may take 2-10 minutes)
✓ Notarization successful

[4/4] Stapling notarization ticket...
✓ Ticket stapled successfully

Signature verified:
  Authority: Developer ID Application: PatchIQ Inc (ABC123XYZ)
  Gatekeeper: Accepted
  Notarization: Valid
```

**Common Issues:**
- **Certificate not found:** Import Developer ID certificate to Keychain
- **Invalid password:** Use app-specific password (not Apple ID password)
- **Notarization failed:** Check notarization logs with `xcrun notarytool log`
- **Stapling failed:** Ensure notarization completed successfully first

---

### Update Manifest Signing

**Purpose:** Sign update manifest JSON for secure distribution

**Time Required:** 2-5 minutes

**Procedure:**

1. **Generate Manifest Template:**
   ```bash
   # Create manifest.json
   cat > manifest.json <<EOF
   {
     "version": "1.2.3",
     "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
     "builds": {
       "linux-amd64": {
         "url": "https://downloads.patchiq.io/agents/patchify-agent-linux-amd64-1.2.3",
         "sha256": "$(sha256sum dist/patchify-agent-linux-amd64 | cut -d' ' -f1)",
         "size": $(stat -f%z dist/patchify-agent-linux-amd64 2>/dev/null || stat -c%s dist/patchify-agent-linux-amd64),
         "platform": "linux-amd64"
       }
     },
     "minAgentVersion": "1.0.0",
     "releaseNotes": "Bug fixes and performance improvements"
   }
   EOF
   ```

2. **Validate Manifest Structure:**
   ```bash
   # Validate JSON syntax
   jq '.' manifest.json

   # Check required fields
   jq -e '.version, .releaseDate, .builds' manifest.json
   ```

3. **Sign Manifest:**
   ```bash
   # Using signing script
   ./scripts/sign-manifest.sh manifest.json "$UPDATE_MANIFEST_PRIVATE_KEY"

   # Private key should be base64-encoded Ed25519 key (32 bytes)
   ```

4. **Verify Signature:**
   ```bash
   # Check signature was added
   jq -r '.signature' manifest.json

   # Expected: base64-encoded string (88 characters)
   ```

5. **Test Verification (Optional):**
   ```bash
   # Create test Go program to verify
   # See docs/UPDATE-MANIFEST.md for verification code
   ```

**Expected Output:**
```
[INFO] Manifest file: manifest.json
[INFO] Validating manifest structure...
✓ Manifest structure valid
[INFO] Manifest details:
  Version:      1.2.3
  Release Date: 2026-02-14T12:00:00Z
  Builds:       6
[INFO] Signing manifest...
✓ Manifest signed successfully
[INFO] Signature (first 20 chars): YXNkZmFzZGZhc2RmYXNk...

Manifest is ready for distribution.
```

---

## CI/CD Signing (Production)

### Automated GitHub Actions Signing

**Purpose:** Verify automated signing in CI/CD pipeline

**Trigger:** Push tag (e.g., `v1.2.3`) or manual workflow dispatch

**Procedure:**

1. **Verify Secrets are Configured:**
   ```bash
   # Go to: Repository Settings → Secrets → Actions
   # Verify these secrets exist:
   # - WINDOWS_CERTIFICATE_BASE64
   # - WINDOWS_CERTIFICATE_PASSWORD
   # - MACOS_CERTIFICATE_BASE64
   # - MACOS_CERTIFICATE_PASSWORD
   # - APPLE_ID
   # - APPLE_APP_PASSWORD
   # - APPLE_TEAM_ID
   # - UPDATE_MANIFEST_PRIVATE_KEY
   ```

2. **Trigger Workflow:**

   **Option A: Tag-based Release (Recommended)**
   ```bash
   # Create and push tag
   git tag v1.2.3
   git push origin v1.2.3
   ```

   **Option B: Manual Dispatch**
   ```bash
   # Via GitHub CLI
   gh workflow run agent-release.yml

   # Or via GitHub web UI:
   # Actions → Agent Release → Run workflow
   ```

3. **Monitor Workflow:**
   ```bash
   # Watch workflow progress
   gh run watch

   # Or via web UI:
   # Actions → Agent Release → Latest run
   ```

4. **Verify Signing Jobs:**

   **Check Windows Signing:**
   ```
   Job: sign-windows
   Steps:
   - ✓ Decode and import certificate
   - ✓ Sign Windows binaries
   - ✓ Clean up certificate
   - ✓ Upload signed binary artifact
   ```

   **Check macOS Signing:**
   ```
   Job: sign-macos
   Steps:
   - ✓ Import signing certificate
   - ✓ Sign macOS binaries
   - ✓ Notarize macOS binaries
   - ✓ Verify signatures
   - ✓ Clean up keychain
   - ✓ Upload signed binary artifact
   ```

5. **Download and Verify Artifacts:**
   ```bash
   # Download artifacts
   gh run download <run-id>

   # Verify Windows signatures
   cd agent-windows-amd64-signed/
   .\scripts\verify-windows-signature.ps1 patchify-agent-*.exe

   # Verify macOS signatures
   cd agent-darwin-arm64-signed/
   ./scripts/verify-macos-signature.sh patchify-agent-*
   ```

6. **Verify Release Assets:**
   ```bash
   # After create-release job completes
   gh release view v1.2.3

   # Download and verify
   gh release download v1.2.3
   ```

**Expected Output (Workflow):**
```
✓ build (11m 23s)
  ✓ Build windows-amd64 (2m 45s)
  ✓ Build darwin-arm64 (2m 31s)
  ✓ Build linux-amd64 (2m 18s)

✓ sign-windows (3m 12s)
  ✓ Sign windows-amd64 (1m 34s)
  ✓ Sign windows-arm64 (1m 28s)

✓ sign-macos (8m 45s)
  ✓ Sign darwin-amd64 (4m 12s)
  ✓ Sign darwin-arm64 (4m 21s)

✓ create-release (2m 03s)
  ✓ Create GitHub Release (2m 03s)
```

**Common Issues:**
- **Secret not found:** Verify GitHub Secrets are configured
- **Signing failed:** Check certificate hasn't expired
- **Notarization timeout:** Increase timeout or retry
- **Upload failed:** Check GitHub token permissions

---

## Emergency Signing

**Purpose:** Sign binaries manually when CI/CD is unavailable

**When to Use:**
- CI/CD pipeline failure
- GitHub Actions outage
- Emergency hotfix deployment
- Testing signing process

**Prerequisites:**
- [ ] Binaries built locally
- [ ] Certificates available locally
- [ ] Signing tools installed
- [ ] Credentials available

**Time Required:** 30-60 minutes (including notarization)

**Procedure:**

1. **Build Binaries Locally:**
   ```bash
   cd agent

   # Windows
   GOOS=windows GOARCH=amd64 go build -o ../dist/patchify-agent-windows-amd64.exe ./cmd/agent

   # macOS
   GOOS=darwin GOARCH=arm64 go build -o ../dist/patchify-agent-darwin-arm64 ./cmd/agent

   # Linux
   GOOS=linux GOARCH=amd64 go build -o ../dist/patchify-agent-linux-amd64 ./cmd/agent
   ```

2. **Sign All Binaries:**

   **Windows (on Windows machine):**
   ```powershell
   cd ..
   Get-ChildItem dist\*.exe | ForEach-Object {
     .\installer\windows\sign-binary.ps1 `
       -CertificatePath "C:\certs\patchiq-code-signing.pfx" `
       -Password "YourPassword" `
       -FilePath $_.FullName
   }
   ```

   **macOS (on macOS machine):**
   ```bash
   export APPLE_ID="your@email.com"
   export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="ABC123XYZ"

   for binary in dist/patchify-agent-darwin-*; do
     ./scripts/sign-macos.sh --identity "Developer ID Application" --binary "$binary"
     ./scripts/notarize-macos.sh --binary "$binary" --bundle-id com.patchiq.agent
   done
   ```

3. **Generate and Sign Update Manifest:**
   ```bash
   # Create manifest
   ./scripts/generate-manifest.sh 1.2.3 dist/ > manifest.json

   # Sign manifest
   ./scripts/sign-manifest.sh manifest.json "$UPDATE_MANIFEST_PRIVATE_KEY"
   ```

4. **Verify All Signatures:**
   ```bash
   # Windows
   .\scripts\verify-windows-signature.ps1 dist\*.exe

   # macOS
   ./scripts/verify-macos-signature.sh dist/patchify-agent-darwin-*

   # Linux (checksum only, no signature)
   sha256sum dist/patchify-agent-linux-* > dist/checksums.txt
   ```

5. **Upload to Distribution:**
   ```bash
   # Option A: GitHub Release
   gh release create v1.2.3 dist/* manifest.json

   # Option B: S3/CDN
   aws s3 sync dist/ s3://patchiq-updates/v1.2.3/
   aws s3 cp manifest.json s3://patchiq-updates/manifest.json
   ```

6. **Verify Download and Installation:**
   ```bash
   # Download from distribution
   wget https://downloads.patchiq.io/v1.2.3/patchify-agent-windows-amd64.exe

   # Verify signature
   .\scripts\verify-windows-signature.ps1 patchify-agent-windows-amd64.exe

   # Test installation on clean VM
   ```

**Emergency Checklist:**
```
[ ] All binaries built
[ ] Windows binaries signed
[ ] macOS binaries signed and notarized
[ ] Linux checksums generated
[ ] Update manifest created and signed
[ ] All signatures verified
[ ] Binaries uploaded to distribution
[ ] Download links tested
[ ] Installation tested on each platform
[ ] Users notified of emergency release
```

---

## Troubleshooting

### Windows Signing Issues

**Issue: "The specified PFX password is not correct"**

**Solution:**
```powershell
# Verify password by importing certificate manually
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
$cert.Import("C:\certs\patchiq-code-signing.pfx", "password", "DefaultKeySet")
$cert.Subject  # Should display certificate subject
```

**Issue: "Timestamp server not responding"**

**Solution:**
```powershell
# Try alternate timestamp servers
$timestampServers = @(
  "http://timestamp.digicert.com",
  "http://timestamp.sectigo.com",
  "http://timestamp.globalsign.com"
)

foreach ($ts in $timestampServers) {
  Write-Host "Trying $ts..."
  signtool sign /tr $ts /td sha256 /fd sha256 /f cert.pfx /p password file.exe
  if ($LASTEXITCODE -eq 0) { break }
}
```

**Issue: "SmartScreen warning despite EV certificate"**

**Causes:**
- Certificate is not EV (only Standard)
- Timestamp missing (signature won't outlive cert)
- Certificate recently issued (wait 24-48 hours)

**Solution:**
```powershell
# Verify certificate is EV
$cert = Get-PfxCertificate -FilePath cert.pfx
$cert.EnhancedKeyUsageList  # Should include "Code Signing"
$cert.Extensions | Where-Object {$_.Oid.FriendlyName -eq "Extended Key Usage"}

# Ensure timestamp is present
signtool verify /pa /v file.exe
# Look for: "SignerInfo: Timestamp Verified"
```

---

### macOS Signing Issues

**Issue: "Developer ID certificate not found"**

**Solution:**
```bash
# List available identities
security find-identity -p codesigning -v

# If empty, import certificate
security import cert.p12 -k ~/Library/Keychains/login.keychain-db -P password

# Unlock keychain
security unlock-keychain -p "keychain-password" ~/Library/Keychains/login.keychain-db
```

**Issue: "Notarization failed with 'Invalid Binary'"**

**Causes:**
- Binary not signed with Hardened Runtime
- Binary contains unsigned dynamic libraries
- Binary is corrupted

**Solution:**
```bash
# Verify Hardened Runtime is enabled
codesign --display --verbose dist/patchify-agent-darwin-arm64
# Look for: flags=0x10000(runtime)

# Get detailed notarization logs
xcrun notarytool log SUBMISSION_ID \
  --apple-id your@email.com \
  --password xxxx-xxxx-xxxx-xxxx \
  --team-id ABC123XYZ
```

**Issue: "Gatekeeper: 'app is damaged and can't be opened'"**

**Causes:**
- Binary modified after signing
- Signature invalid
- Not notarized

**Solution:**
```bash
# Re-sign and notarize
./scripts/sign-macos.sh --identity "Developer ID Application" --binary dist/binary
./scripts/notarize-macos.sh --binary dist/binary --bundle-id com.patchiq.agent

# Verify
./scripts/verify-macos-signature.sh dist/binary
```

---

## Verification Procedures

### Post-Signing Verification

**Windows:**
```powershell
# Automated verification
.\scripts\verify-windows-signature.ps1 dist\patchify-agent-windows-amd64.exe

# Manual checks
signtool verify /pa /v dist\patchify-agent-windows-amd64.exe
Get-AuthenticodeSignature dist\patchify-agent-windows-amd64.exe
```

**macOS:**
```bash
# Automated verification
./scripts/verify-macos-signature.sh dist/patchify-agent-darwin-arm64

# Manual checks
codesign --verify --verbose dist/patchify-agent-darwin-arm64
spctl --assess --verbose dist/patchify-agent-darwin-arm64
stapler validate dist/patchify-agent-darwin-arm64
```

**Update Manifest:**
```bash
# Verify signature field exists
jq -e '.signature' manifest.json

# Verify signature is base64-encoded
jq -r '.signature' manifest.json | base64 -d | wxxd | wc -l
# Should be 64 bytes (Ed25519 signature size)
```

---

### End-User Testing

**Windows (Clean VM):**
1. Download signed binary
2. Double-click to run
3. Expected: No SmartScreen warning (EV cert)
4. Verify binary runs successfully

**macOS (Clean VM):**
1. Download signed binary
2. Run from Terminal or double-click
3. Expected: No Gatekeeper warning
4. Verify binary runs successfully

**Linux:**
1. Download binary and checksum
2. Verify checksum: `sha256sum -c checksums.txt`
3. Verify binary runs successfully

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-14
**Owner:** DevOps Team (devops@patchiq.io)
