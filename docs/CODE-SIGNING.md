# Code Signing Documentation

This document provides comprehensive guidance on code signing for PatchIQ agent binaries across all platforms (Windows, macOS, and Linux).

---

## Table of Contents

- [Overview](#overview)
- [Windows Code Signing](#windows-code-signing)
  - [Certificate Procurement](#certificate-procurement)
  - [Certificate Types](#certificate-types)
  - [Signing Process](#signing-process)
  - [SmartScreen Requirements](#smartscreen-requirements)
  - [Troubleshooting](#troubleshooting)
- [macOS Code Signing](#macos-code-signing)
- [Linux Binary Verification](#linux-binary-verification)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

---

## Overview

**Why code signing is mandatory:**

- **Windows**: SmartScreen blocks unsigned executables, preventing enterprise deployment
- **macOS**: Gatekeeper blocks unsigned applications on macOS 10.15+
- **Enterprise**: Security policies require signed software
- **Trust**: Code signing establishes chain of trust and prevents tampering

**Current Status:**
- Windows Authenticode: Infrastructure ready, requires certificate
- macOS notarization: Documented (see separate implementation)
- Linux: Checksum-based verification

---

## Windows Code Signing

### Certificate Procurement

#### Recommended Certificate Authorities

1. **DigiCert** (Recommended)
   - URL: https://www.digicert.com/signing/code-signing-certificates
   - Cost: $474/year (Standard), $595/year (EV)
   - Validation time: 1-3 business days (Standard), 3-7 business days (EV)
   - Support: Excellent, 24/7

2. **Sectigo (Comodo)**
   - URL: https://sectigo.com/ssl-certificates-tls/code-signing
   - Cost: $415/year (Standard), $549/year (EV)
   - Validation time: 1-3 business days (Standard), 5-10 business days (EV)
   - Support: Good

3. **GlobalSign**
   - URL: https://www.globalsign.com/en/code-signing-certificate
   - Cost: $399/year (Standard), $599/year (EV)
   - Validation time: 1-5 business days (Standard), 5-10 business days (EV)
   - Support: Good

#### Procurement Process

**Step 1: Choose Certificate Type**
- **Recommendation**: EV (Extended Validation) code signing certificate
- **Reason**: Immediate SmartScreen reputation, no warning dialogs

**Step 2: Prepare Required Documents**

For organization validation, you'll need:
- Business registration documents (Articles of Incorporation, Business License)
- DUNS number (https://www.dnb.com/)
- Proof of business address (utility bill, bank statement)
- Contact verification (phone number, email)
- Identity verification for authorized signer (government-issued ID)

**Step 3: Submit Certificate Signing Request (CSR)**

Generate CSR using OpenSSL or certificate authority's tool:

```bash
# Generate private key and CSR
openssl req -new -newkey rsa:2048 -nodes \
  -keyout patchiq-code-signing.key \
  -out patchiq-code-signing.csr \
  -subj "/C=US/ST=California/L=San Francisco/O=PatchIQ Inc/CN=PatchIQ Inc"
```

**Step 4: Complete Validation**
- Respond to validation emails
- Provide requested documents
- Complete phone verification
- Wait for CA approval (1-10 business days)

**Step 5: Receive Certificate**

For EV certificates, you'll receive either:
- **USB Token**: Physical USB device with certificate (recommended)
- **Cloud HSM**: Certificate stored in cloud-based Hardware Security Module

For Standard certificates:
- **PFX file**: Download and secure with strong password

---

### Certificate Types

| Feature | Standard Code Signing | EV Code Signing |
|---------|----------------------|-----------------|
| **Cost** | $399-474/year | $549-595/year |
| **Validation Time** | 1-3 days | 3-10 days |
| **SmartScreen Reputation** | Must build over time | Immediate |
| **Storage** | Software (PFX) | USB Token or Cloud HSM |
| **Security** | Good | Excellent (Hardware-backed) |
| **User Trust** | Moderate | High |
| **Recommendation** | Development/Testing | **Production (REQUIRED)** |

**Why EV is required:**
- Standard certificates trigger SmartScreen warnings until reputation is built
- Building reputation takes months and thousands of downloads
- EV certificates bypass SmartScreen warnings immediately
- Enterprise customers require EV certificates

---

### Signing Process

#### Local Signing (Development)

**Prerequisites:**
- Windows SDK installed (for signtool.exe)
- Certificate PFX file or USB token
- PowerShell 5.1+

**Method 1: Using PowerShell Script**

```powershell
# Sign single executable
.\installer\windows\sign-binary.ps1 `
  -CertificatePath "C:\certs\patchiq-code-signing.pfx" `
  -Password "YourStrongPassword123!" `
  -FilePath "dist\patchify-agent-windows-amd64.exe"

# Sign MSI installer
.\installer\windows\sign-binary.ps1 `
  -CertificatePath "C:\certs\patchiq-code-signing.pfx" `
  -Password "YourStrongPassword123!" `
  -FilePath "dist\PatchIQAgent-1.0.0-amd64.msi"
```

**Method 2: Using signtool.exe Directly**

```powershell
# Find signtool.exe (usually in Windows SDK)
# C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe

# Sign with PFX file
signtool.exe sign `
  /f "C:\certs\patchiq-code-signing.pfx" `
  /p "YourStrongPassword123!" `
  /tr "http://timestamp.digicert.com" `
  /td sha256 `
  /fd sha256 `
  /v `
  "dist\patchify-agent-windows-amd64.exe"

# Verify signature
signtool.exe verify /pa /v "dist\patchify-agent-windows-amd64.exe"
```

#### CI/CD Signing (GitHub Actions)

See [CI/CD Integration](#cicd-integration) section below.

---

### SmartScreen Requirements

**What is SmartScreen?**
- Windows Defender SmartScreen filters downloads and warns users about untrusted software
- Shows "Windows protected your PC" warning for unknown publishers
- Blocks execution unless user clicks "More info" → "Run anyway"

**How to bypass SmartScreen:**

1. **EV Certificate** (Recommended)
   - Immediate reputation
   - No warnings from day one
   - Cost: $549-595/year

2. **Build Reputation** (Standard Certificate)
   - Requires 1000+ downloads over 3+ months
   - Not practical for new software
   - Users see warnings during ramp-up period

**Testing SmartScreen:**

```powershell
# Download signed binary to fresh Windows 10/11 VM
# Double-click the executable
# Expected behavior with EV cert: No warning, runs immediately
# Expected behavior with Standard cert: SmartScreen warning
```

---

### Troubleshooting

#### Issue: "signtool.exe not found"

**Solution:**
1. Install Windows SDK: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/
2. Add signtool.exe to PATH:
   ```powershell
   $env:PATH += ";C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
   ```

#### Issue: "The specified PFX password is not correct"

**Solution:**
- Verify password is correct
- Ensure PFX file is not corrupted (re-download from CA)
- Check certificate hasn't expired

#### Issue: "Timestamp server not responding"

**Solution:**
- Try alternate timestamp servers:
  ```
  http://timestamp.digicert.com (Primary)
  http://timestamp.sectigo.com (Backup)
  http://timestamp.globalsign.com (Backup)
  http://timestamp.comodoca.com (Backup)
  ```

#### Issue: "Signature verification failed"

**Solution:**
- Ensure certificate chain is complete
- Check certificate is trusted by Windows
- Verify timestamp is valid
- Run: `signtool verify /pa /v yourfile.exe` for details

#### Issue: "SmartScreen still shows warnings with EV certificate"

**Solution:**
- Verify certificate is actually EV (check certificate details)
- Ensure timestamp server was used during signing
- Check certificate hasn't been revoked
- Wait 24-48 hours for Microsoft's reputation database to update

---

## macOS Code Signing

### Prerequisites

1. **Apple Developer Program Membership** ($99/year)
   - Enroll at: https://developer.apple.com/programs/
   - Required for Developer ID certificates and notarization

2. **Developer ID Application Certificate**
   - Request in Xcode or at developer.apple.com
   - Download and install to Keychain Access
   - Used for signing applications distributed outside the Mac App Store

3. **App-Specific Password** (for notarization)
   - Create at: https://appleid.apple.com
   - Go to Security → App-Specific Passwords
   - Generate password for "PatchIQ Notarization"
   - **Important:** This is NOT your Apple ID password

### Certificate Creation

**Step 1: Request Developer ID Certificate**

1. Open Xcode or visit https://developer.apple.com/account/resources/certificates/add
2. Select "Developer ID Application"
3. Create Certificate Signing Request (CSR):
   ```bash
   # In Keychain Access: Certificate Assistant → Request Certificate from CA
   # Or via command line:
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout patchiq-macos.key \
     -out patchiq-macos.csr \
     -subj "/CN=PatchIQ Inc/O=PatchIQ Inc/C=US"
   ```
4. Upload CSR to Apple Developer portal
5. Download certificate (.cer file)
6. Import to Keychain Access (double-click)

**Step 2: Verify Certificate**

```bash
# List available signing identities
security find-identity -p codesigning -v

# Expected output:
# 1) ABC123... "Developer ID Application: PatchIQ Inc (TEAM_ID)"
```

### Local Signing (Development)

**Sign Binary:**

```bash
./scripts/sign-macos.sh \
  --identity "Developer ID Application: PatchIQ Inc (TEAM_ID)" \
  --binary agent/dist/patchiq-agent-darwin-arm64
```

**Script Options:**
- `--identity` - Developer ID certificate name from Keychain
- `--binary` - Path to binary to sign
- `--force` - Re-sign even if already signed

**Environment Variables:**
- `CODESIGN_IDENTITY` - Alternative way to specify identity
- `SKIP_VERIFY=1` - Skip verification step

**What the script does:**
1. Verifies binary is not already signed (unless --force)
2. Signs binary with Hardened Runtime enabled
3. Adds timestamp (from Apple's timestamp server)
4. Verifies signature with codesign
5. Displays signature details

### Notarization

**Why notarize?**
- macOS 10.15+ (Catalina) shows warnings for non-notarized apps
- Gatekeeper blocks unsigned/non-notarized apps by default
- Required for enterprise deployment

**Notarize Binary:**

```bash
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
export APPLE_TEAM_ID="ABC123XYZ"

./scripts/notarize-macos.sh \
  --binary agent/dist/patchiq-agent-darwin-arm64 \
  --bundle-id com.patchiq.agent
```

**Requirements:**
- Binary must be signed first (with Hardened Runtime)
- Internet connection (submits to Apple's servers)
- Valid Apple Developer credentials

**Timeline:**
- Notarization typically takes 2-10 minutes
- Script waits for completion (default timeout: 30 minutes)
- On success, notarization ticket is stapled to binary

**What the script does:**
1. Verifies binary is signed
2. Creates ZIP archive (required for submission)
3. Submits to Apple notary service via `xcrun notarytool`
4. Polls for notarization status
5. Staples notarization ticket to binary (for offline verification)
6. Verifies with `spctl --assess`

### Verification

**Verify Signature and Notarization:**

```bash
./scripts/verify-macos-signature.sh \
  agent/dist/patchiq-agent-darwin-arm64
```

**Checks performed:**
1. Code signature validity (codesign --verify)
2. Signature details (Authority, Team ID, Hardened Runtime)
3. Gatekeeper assessment (spctl --assess)
4. Notarization ticket status (stapler validate)

**Expected output:**
```
[1/4] Verifying code signature...
✓ Code signature is valid

[2/4] Signature details:
Authority:       Developer ID Application: PatchIQ Inc (ABC123XYZ)
Team ID:         ABC123XYZ
Hardened Runtime: Enabled

[3/4] Gatekeeper assessment...
✓ Binary passes Gatekeeper check

[4/4] Notarization ticket...
✓ Notarization ticket is stapled
```

### CI/CD Integration (GitHub Actions)

**Required GitHub Secrets:**

| Secret | Description | How to Get |
|--------|-------------|------------|
| `MACOS_CERTIFICATE_BASE64` | Base64-encoded Developer ID certificate (.p12) | Export from Keychain, then `base64 -i cert.p12` |
| `MACOS_CERTIFICATE_PASSWORD` | Password for the .p12 file | Set when exporting from Keychain |
| `MACOS_CODESIGN_IDENTITY` | Identity name (optional) | Defaults to "Developer ID Application" |
| `APPLE_ID` | Apple ID email | Your Apple Developer email |
| `APPLE_APP_PASSWORD` | App-specific password | Create at appleid.apple.com |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Find at developer.apple.com/account |

**Export Certificate for CI/CD:**

```bash
# Step 1: Export certificate from Keychain Access
# Right-click certificate → Export "Developer ID Application..."
# Save as .p12 file with a strong password

# Step 2: Convert to base64
base64 -i certificate.p12 | pbcopy

# Step 3: Paste into GitHub Secrets as MACOS_CERTIFICATE_BASE64
```

**Workflow Behavior:**

The `.github/workflows/agent-release.yml` workflow includes:
- `sign-macos` job - Signs and notarizes macOS binaries
- Runs on `macos-latest` runner
- Triggered on tag push (e.g., `v1.2.3`) or manual dispatch
- Signs both amd64 and arm64 binaries
- Attempts notarization (non-blocking if credentials missing)

### Hardened Runtime

All macOS binaries are signed with Hardened Runtime enabled (`--options runtime`).

**What Hardened Runtime provides:**
- Disables code injection
- Enforces library validation
- Protects runtime integrity
- Required for notarization

**No entitlements needed** for our agent binary (pure Go, no special permissions).

### Troubleshooting

**Issue: "Developer ID certificate not found"**

Solution:
```bash
# List available identities
security find-identity -p codesigning -v

# If empty, import certificate to Keychain Access
```

**Issue: "Notarization failed: Invalid binary"**

Common causes:
- Binary not signed with Hardened Runtime
- Binary contains unsigned dynamic libraries
- Invalid code signature

Solution:
```bash
# Get detailed notarization logs
xcrun notarytool log SUBMISSION_ID \
  --apple-id your@email.com \
  --password xxxx-xxxx-xxxx-xxxx \
  --team-id ABC123XYZ
```

**Issue: "The certificate chain does not include a timestamp"**

Solution: Our scripts use `--timestamp` automatically. If signing manually:
```bash
codesign --sign "Developer ID Application" \
  --options runtime \
  --timestamp \
  --force \
  patchiq-agent
```

**Issue: "Gatekeeper: app is damaged and can't be opened"**

Causes:
- Binary modified after signing
- Signature invalid
- Not notarized

Solution:
1. Re-sign and notarize
2. Verify with `verify-macos-signature.sh`
3. Users can bypass: System Settings → Privacy & Security → Open Anyway

**Issue: "Notarization timeout"**

Solution:
- Increase timeout: `--timeout 3600` (1 hour)
- Check Apple's system status: https://developer.apple.com/system-status/
- Try again during off-peak hours

---

## Linux Binary Verification

**Approach:** SHA256 checksum-based verification (no code signing infrastructure)

**Process:**
1. Generate SHA256 checksums during build
2. Publish checksums alongside binaries
3. Agent verifies checksum before self-update

**Future Enhancement:** GPG signing for additional security

---

## CI/CD Integration

### GitHub Actions Setup

**Step 1: Encode Certificate**

```bash
# Convert PFX to base64 for GitHub Secrets
base64 -i patchiq-code-signing.pfx -o certificate.b64

# Or on Windows:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("patchiq-code-signing.pfx")) | Out-File certificate.b64
```

**Step 2: Add GitHub Secrets**

Navigate to repository Settings → Secrets → Actions:

- `WINDOWS_CERTIFICATE_BASE64`: Base64-encoded PFX file (paste contents of certificate.b64)
- `WINDOWS_CERTIFICATE_PASSWORD`: Certificate password

**Step 3: Workflow Integration**

The workflow is already configured in `.github/workflows/agent-release.yml`:

```yaml
sign-windows:
  name: Sign Windows Binaries
  runs-on: windows-latest
  needs: build

  steps:
    - name: Decode and import certificate
      env:
        CERTIFICATE_BASE64: ${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}
        CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
      run: |
        # Decode certificate and sign binaries
        # See .github/workflows/agent-release.yml for full workflow
```

**Step 4: Test Workflow**

```bash
# Trigger manual release (without actual certificate)
gh workflow run agent-release.yml

# Or create a tag to trigger automatic release
git tag v1.0.0
git push origin v1.0.0
```

---

## Best Practices

### Certificate Security

1. **Storage:**
   - **Production**: Use USB token or cloud HSM (EV requirement)
   - **CI/CD**: Store as encrypted GitHub Secret (base64-encoded)
   - **Never**: Commit certificates to git or expose in logs

2. **Password Management:**
   - Use strong passwords (20+ characters, random)
   - Rotate passwords annually
   - Use separate passwords for dev/prod certificates

3. **Access Control:**
   - Limit certificate access to 2-3 authorized personnel
   - Use GitHub environment protection rules for production
   - Audit certificate usage quarterly

### Signing Workflow

1. **Always timestamp signatures:**
   - Ensures signatures remain valid after certificate expiration
   - Use multiple timestamp servers for redundancy

2. **Verify after signing:**
   - Run `signtool verify /pa /v` after every signing operation
   - Test on clean Windows VM before release

3. **Monitor certificate expiration:**
   - Set reminders 90 days, 60 days, 30 days before expiration
   - Order renewal certificate 60 days before expiration
   - Test new certificate before old one expires

### Incident Response

**If certificate is compromised:**

1. **Immediate Actions:**
   - Revoke certificate with CA (within 24 hours)
   - Rotate GitHub Secrets
   - Audit all signed binaries

2. **Communication:**
   - Notify users of potential compromise
   - Provide new signed binaries ASAP
   - Update security documentation

3. **Post-Incident:**
   - Root cause analysis
   - Update security procedures
   - Consider upgrading to cloud HSM

---

## Certificate Renewal Timeline

### Standard Certificate (1-3 years validity)

| Timeline | Action |
|----------|--------|
| **T-90 days** | Review current certificate, set renewal reminder |
| **T-60 days** | Order new certificate from CA |
| **T-45 days** | Complete validation process |
| **T-30 days** | Receive new certificate, test signing |
| **T-14 days** | Update CI/CD secrets with new certificate |
| **T-7 days** | Release build with new certificate |
| **Expiration** | Old certificate expires, binaries remain valid (if timestamped) |

### Actions Required

1. **90 Days Before Expiration:**
   - Review certificate authority pricing
   - Verify business information is current
   - Prepare renewal budget

2. **60 Days Before Expiration:**
   - Submit renewal order to CA
   - Update business documents if needed

3. **30 Days Before Expiration:**
   - Receive new certificate
   - Test signing locally
   - Verify SmartScreen behavior

4. **14 Days Before Expiration:**
   - Update GitHub Secrets
   - Deploy test build
   - Verify CI/CD pipeline

5. **7 Days Before Expiration:**
   - Release production build with new certificate
   - Monitor for signing issues

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| **EV Code Signing Certificate** | $549-595 | Annually |
| **Apple Developer Program** | $99 | Annually |
| **Windows SDK** | Free | One-time |
| **Xcode** | Free | One-time |
| **Total Annual Cost** | **~$650-700** | Per year |

**Note:** These are 2024 prices and may change. Check certificate authority websites for current pricing.

---

## Support

**Internal Contacts:**
- **Security Team**: security@patchiq.io
- **DevOps Team**: devops@patchiq.io
- **Certificate Owner**: (To be designated)

**External Support:**
- **DigiCert Support**: https://www.digicert.com/support
- **Microsoft Code Signing**: https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools
- **Apple Developer**: https://developer.apple.com/support/

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-14
**Next Review:** 2026-08-14
