# Pipeline 4: Security & Code Signing

## Overview

- **Priority:** High
- **Estimated Effort:** 38-48 hours
- **Dependencies:** Pipeline 3 (Windows binaries must exist)
- **Platform Scope:** All (Windows, Linux, macOS)
- **Target Completion:** Week 4
- **Current Completion:** 20%

## Business Justification

**Code signing is mandatory for production deployment.** Without proper signing:
- Windows SmartScreen blocks unsigned executables
- macOS Gatekeeper blocks unsigned applications
- Enterprise customers cannot deploy unsigned software
- No chain of trust for agent updates
- Security audits fail

**Current State:**
- Binaries are unsigned (development only)
- No certificate infrastructure
- TLS can be disabled (insecure)
- No binary checksum validation
- Update authenticity not verified

**Target State:**
- All binaries signed with valid certificates
- macOS binaries notarized by Apple
- Windows binaries signed with Authenticode
- Linux binaries checksummed and verified
- TLS enforced (no disable option)
- Update packages verified before installation

**Value Delivered:**
- Enterprise-grade security posture
- Compliance with security audits
- User trust and confidence
- Protection against tampering

---

## Requirements

### R1: Windows Authenticode Signing

**Description:** Sign all Windows binaries and MSI installer with Authenticode certificate

**Acceptance Criteria:**
- [ ] Acquire Extended Validation (EV) code signing certificate
- [ ] Sign `patchiq-agent-windows-amd64.exe` with Authenticode
- [ ] Sign `patchiq-agent-windows-arm64.exe` with Authenticode
- [ ] Sign MSI installer with Authenticode
- [ ] Timestamp signatures (RFC3161 timestamp server)
- [ ] Verify signatures with `signtool verify /pa`
- [ ] Test SmartScreen behavior (should not warn)
- [ ] Automate signing in CI/CD pipeline

**Platform:** Windows
**Priority:** Must Have
**Estimated Hours:** 10-12

---

### R2: macOS Code Signing & Notarization

**Description:** Sign macOS binaries and notarize with Apple

**Acceptance Criteria:**
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create Developer ID Application certificate
- [ ] Sign `patchiq-agent-darwin-amd64` with codesign
- [ ] Sign `patchiq-agent-darwin-arm64` with codesign
- [ ] Enable Hardened Runtime
- [ ] Notarize binaries with Apple notary service
- [ ] Verify notarization: `spctl --assess --verbose`
- [ ] Test on macOS 13+ (should not show Gatekeeper warning)
- [ ] Automate signing in CI/CD pipeline

**Platform:** macOS
**Priority:** Must Have
**Estimated Hours:** 12-16

---

### R3: Linux Binary Verification

**Description:** Add checksum-based verification for Linux binaries

**Acceptance Criteria:**
- [ ] Generate SHA256 checksums for all Linux binaries
- [ ] Create `.sha256` files alongside binaries
- [ ] Agent verifies checksum before self-update
- [ ] Backend serves checksums via API endpoint
- [ ] Document checksum verification process
- [ ] Optional: GPG signing for extra security

**Platform:** Linux
**Priority:** Should Have
**Estimated Hours:** 4-6

---

### R4: Enforce TLS for All Connections

**Description:** Remove TLS disable option and enforce HTTPS for all backend communication

**Acceptance Criteria:**
- [ ] Remove `TLSDisable` config option
- [ ] Enforce HTTPS for all API calls (ServerURL must be https://)
- [ ] Validate TLS certificates (no skip verify)
- [ ] Support custom CA certificates for self-signed
- [ ] Add CA cert bundle configuration option
- [ ] Fail fast if TLS cannot be established
- [ ] Document TLS requirements in installation guide

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 4-6

---

### R5: Binary Checksum Validation

**Description:** Verify checksums for all downloaded packages and updates

**Acceptance Criteria:**
- [ ] Backend API returns SHA256 checksum with download URL
- [ ] Agent verifies checksum after download (already implemented in Pipeline 1)
- [ ] Reject corrupted downloads before execution
- [ ] Add checksum to agent update manifest
- [ ] Verify agent binary checksum during self-update
- [ ] Log checksum mismatches with details

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 4-6

---

### R6: Secure Update Manifest

**Description:** Sign update manifests to prevent man-in-the-middle attacks

**Acceptance Criteria:**
- [ ] Create update manifest JSON format
- [ ] Include: version, download URL, checksum, signature
- [ ] Sign manifest with private key (RSA or Ed25519)
- [ ] Agent verifies manifest signature before downloading
- [ ] Public key embedded in agent binary
- [ ] Reject updates with invalid signatures
- [ ] Document key management process

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 6-8

---

### R7: Certificate Management Documentation

**Description:** Document certificate procurement, storage, and renewal

**Acceptance Criteria:**
- [ ] Document Windows EV certificate procurement process
- [ ] Document Apple Developer Program enrollment
- [ ] Document certificate storage (Azure Key Vault, HSM, etc.)
- [ ] Document CI/CD secrets management
- [ ] Document certificate renewal timeline (track expiration)
- [ ] Document emergency key rotation procedure
- [ ] Create runbook for signing operations

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 4-6

---

## Technical Approach

### Windows Authenticode Signing

**Certificate Procurement:**
1. Purchase EV Code Signing Certificate from DigiCert, Sectigo, or GlobalSign (~$300-500/year)
2. Validation process (2-5 business days)
3. Certificate delivered on USB token or cloud-based HSM

**Signing Process:**

```powershell
# Sign executable with timestamp
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 patchiq-agent-windows-amd64.exe

# Verify signature
signtool verify /pa /v patchiq-agent-windows-amd64.exe

# Sign MSI installer
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com /td sha256 /fd sha256 PatchIQAgent-1.0.0-amd64.msi
```

**CI/CD Integration:**

```yaml
# .github/workflows/agent-release.yml
- name: Sign Windows Binaries
  if: runner.os == 'Windows'
  env:
    CERTIFICATE_BASE64: ${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}
    CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
  run: |
    echo $CERTIFICATE_BASE64 | base64 -d > cert.pfx
    signtool sign /f cert.pfx /p $CERTIFICATE_PASSWORD /tr http://timestamp.digicert.com /td sha256 /fd sha256 dist/*.exe
    del cert.pfx
```

---

### macOS Code Signing & Notarization

**Prerequisites:**
1. Apple Developer Program membership ($99/year)
2. Developer ID Application certificate (request in Xcode or developer.apple.com)
3. App-specific password for notarization

**Signing Process:**

```bash
# Sign binary with Hardened Runtime
codesign --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --options runtime \
  --timestamp \
  --force \
  patchiq-agent-darwin-amd64

# Verify signature
codesign --verify --verbose patchiq-agent-darwin-amd64

# Notarize binary
zip patchiq-agent-darwin-amd64.zip patchiq-agent-darwin-amd64

xcrun notarytool submit patchiq-agent-darwin-amd64.zip \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait

# Staple notarization ticket (for offline verification)
xcrun stapler staple patchiq-agent-darwin-amd64

# Verify notarization
spctl --assess --verbose patchiq-agent-darwin-amd64
```

**CI/CD Integration:**

```yaml
# .github/workflows/agent-release.yml
- name: Sign and Notarize macOS Binaries
  if: runner.os == 'macOS'
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    CERTIFICATE_BASE64: ${{ secrets.MACOS_CERTIFICATE_BASE64 }}
    CERTIFICATE_PASSWORD: ${{ secrets.MACOS_CERTIFICATE_PASSWORD }}
  run: |
    echo $CERTIFICATE_BASE64 | base64 -d > cert.p12
    security create-keychain -p actions build.keychain
    security import cert.p12 -k build.keychain -P $CERTIFICATE_PASSWORD -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple: -s -k actions build.keychain

    codesign --sign "Developer ID Application" --options runtime --timestamp dist/patchiq-agent-darwin-*

    zip dist/patchiq-agent-darwin-amd64.zip dist/patchiq-agent-darwin-amd64
    xcrun notarytool submit dist/patchiq-agent-darwin-amd64.zip --apple-id $APPLE_ID --password $APPLE_PASSWORD --team-id $APPLE_TEAM_ID --wait
    xcrun stapler staple dist/patchiq-agent-darwin-amd64
```

---

### Update Manifest Format

**File: `agent-updates.json`**

```json
{
  "version": "1.2.3",
  "releaseDate": "2026-02-14T12:00:00Z",
  "builds": {
    "windows-amd64": {
      "url": "https://hub.patchiq.io/agents/patchiq-agent-windows-amd64-1.2.3.exe",
      "sha256": "abcd1234...",
      "size": 18874368
    },
    "darwin-arm64": {
      "url": "https://hub.patchiq.io/agents/patchiq-agent-darwin-arm64-1.2.3",
      "sha256": "efgh5678...",
      "size": 17825792
    },
    "linux-amd64": {
      "url": "https://hub.patchiq.io/agents/patchiq-agent-linux-amd64-1.2.3",
      "sha256": "ijkl9012...",
      "size": 16973824
    }
  },
  "signature": "base64-encoded-signature",
  "signatureAlgorithm": "Ed25519"
}
```

**Manifest Signing:**

```go
// Sign manifest with private key
func SignManifest(manifestJSON []byte, privateKey ed25519.PrivateKey) ([]byte, error) {
    signature := ed25519.Sign(privateKey, manifestJSON)
    return signature, nil
}

// Verify manifest signature
func VerifyManifest(manifestJSON, signature []byte, publicKey ed25519.PublicKey) bool {
    return ed25519.Verify(publicKey, manifestJSON, signature)
}
```

---

### TLS Enforcement

**File: `agent/internal/client/client.go`**

**Before (insecure):**
```go
type Config struct {
    ServerURL  string
    TLSDisable bool  // ❌ Insecure option
}

func NewClient(cfg *Config) *Client {
    transport := &http.Transport{
        TLSClientConfig: &tls.Config{
            InsecureSkipVerify: cfg.TLSDisable,  // ❌ Dangerous
        },
    }
    // ...
}
```

**After (secure):**
```go
type Config struct {
    ServerURL   string
    CACertFile  string  // Optional custom CA cert
}

func NewClient(cfg *Config) (*Client, error) {
    if !strings.HasPrefix(cfg.ServerURL, "https://") {
        return nil, fmt.Errorf("server URL must use HTTPS")
    }

    tlsConfig := &tls.Config{
        MinVersion: tls.VersionTLS12,
    }

    // Load custom CA cert if provided
    if cfg.CACertFile != "" {
        caCert, err := os.ReadFile(cfg.CACertFile)
        if err != nil {
            return nil, fmt.Errorf("read CA cert: %w", err)
        }
        caCertPool := x509.NewCertPool()
        caCertPool.AppendCertsFromPEM(caCert)
        tlsConfig.RootCAs = caCertPool
    }

    transport := &http.Transport{
        TLSClientConfig: tlsConfig,
    }
    // ...
}
```

---

## Implementation Plan

### Task 4.1: Windows Authenticode Signing (10-12 hours)

**Owner:** Teammate 1
**Files:**
- `installer/windows/sign-binary.ps1` (new signing script)
- `.github/workflows/agent-release.yml` (add signing step)
- `docs/CODE-SIGNING.md` (documentation)

**Steps:**
1. Procure EV Code Signing Certificate
2. Create signing script for local use
3. Test signing on Windows binaries
4. Test signing on MSI installer
5. Verify signatures with signtool
6. Add CI/CD integration
7. Test SmartScreen behavior
8. Document process

---

### Task 4.2: macOS Code Signing & Notarization (12-16 hours)

**Owner:** Teammate 2
**Files:**
- `scripts/sign-macos.sh` (new signing script)
- `.github/workflows/agent-release.yml` (add signing step)
- `docs/CODE-SIGNING.md` (add macOS section)

**Steps:**
1. Enroll in Apple Developer Program
2. Create Developer ID certificate
3. Create signing script for local use
4. Test signing on macOS binaries
5. Test notarization process
6. Verify with spctl
7. Add CI/CD integration
8. Test on macOS 13+
9. Document process

---

### Task 4.3: TLS Enforcement (4-6 hours)

**Owner:** Teammate 1
**Files:**
- `agent/internal/client/client.go`
- `agent/internal/config/config.go`
- `agent/docs/TLS-CONFIGURATION.md`

**Steps:**
1. Remove TLSDisable config option
2. Enforce HTTPS in ServerURL validation
3. Add CACertFile config option
4. Implement custom CA cert loading
5. Update setup wizard
6. Write unit tests
7. Document TLS requirements

---

### Task 4.4: Binary Checksum Validation (4-6 hours)

**Owner:** Teammate 2
**Files:**
- `agent/internal/update/update.go` (enhance)
- `backend/src/modules/agent-versions/` (add checksum endpoint)

**Steps:**
1. Backend: Add checksum to agent version API
2. Agent: Verify checksum in update.go
3. Add to update manifest format
4. Test checksum validation
5. Write unit tests
6. Document process

---

### Task 4.5: Secure Update Manifest (6-8 hours)

**Owner:** Teammate 1
**Files:**
- `agent/internal/update/manifest.go` (new)
- `scripts/generate-manifest.sh` (new)
- `docs/UPDATE-MANIFEST.md` (new)

**Steps:**
1. Define manifest JSON schema
2. Generate Ed25519 key pair
3. Create manifest signing script
4. Implement manifest verification in agent
5. Embed public key in agent binary
6. Write unit tests
7. Document key management

---

### Task 4.6: Linux Binary Verification (4-6 hours)

**Owner:** Teammate 2
**Files:**
- `Makefile` (add checksum generation)
- `.github/workflows/agent-release.yml` (add checksum step)

**Steps:**
1. Generate SHA256 checksums for Linux binaries
2. Create `.sha256` files
3. Publish checksums alongside binaries
4. Document verification process
5. Optional: GPG signing

---

### Task 4.7: Certificate Management Documentation (4-6 hours)

**Owner:** Teammate 1
**Files:**
- `docs/CODE-SIGNING.md`
- `docs/CERTIFICATE-MANAGEMENT.md` (new)
- `docs/RUNBOOK-SIGNING.md` (new)

**Steps:**
1. Document certificate procurement
2. Document secrets management
3. Document renewal timeline
4. Create signing runbook
5. Document emergency procedures

---

## Parallelization Strategy

```
Week 1-2 (Parallel):
├── Teammate 1: Task 4.1 → 4.3 → 4.5 → 4.7
│   ├── Windows signing (10-12h)
│   ├── TLS enforcement (4-6h)
│   ├── Update manifest (6-8h)
│   └── Documentation (4-6h)
│   Total: 24-32 hours
│
└── Teammate 2: Task 4.2 → 4.4 → 4.6
    ├── macOS signing (12-16h)
    ├── Checksum validation (4-6h)
    └── Linux verification (4-6h)
    Total: 20-28 hours
```

**Total: 44-60 hours with 2 teammates = 22-30 hours per teammate**
**Timeline: ~2 weeks**

---

## Exit Criteria

- [ ] All Windows binaries signed with Authenticode
- [ ] Windows SmartScreen does not warn
- [ ] All macOS binaries signed and notarized
- [ ] macOS Gatekeeper allows execution
- [ ] Linux binaries have SHA256 checksums
- [ ] TLS enforced (no disable option)
- [ ] Update manifest signed and verified
- [ ] All certificates documented
- [ ] CI/CD automation working

---

## Test Metrics

**Platform Coverage:**
- Windows: Authenticode verification
- macOS: Notarization verification
- Linux: Checksum verification

**Security Tests:**
- TLS connection test (must fail on http://)
- Certificate validation test
- Checksum mismatch test
- Manifest signature verification test

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Certificate procurement delays | High | Start immediately, budget 1 week |
| Apple notarization can take hours | Medium | Automate, allow time in CI/CD |
| Certificate costs ($400-600/year) | Low | Budget approved, necessary expense |
| Key management complexity | Medium | Use CI/CD secrets, document thoroughly |

---

## Dependencies

**External:**
- EV Code Signing Certificate (Windows)
- Apple Developer Program membership (macOS)
- Secure key storage (Azure Key Vault, GitHub Secrets, etc.)

**Internal:**
- Pipeline 3 complete (binaries must exist)

---

## Timeline

- **Planning:** 4 hours
- **Implementation:** 38-48 hours (with 2 teammates: 19-24 hours each)
- **Testing:** 8 hours
- **QA:** 4 hours
- **Buffer:** 10 hours
- **Total:** 48 hours = **2 weeks** with 2 teammates

---

## Success Metrics

- **Windows:** SmartScreen passes, no warnings
- **macOS:** Gatekeeper passes, no warnings
- **Linux:** Checksums published and verified
- **TLS:** 100% HTTPS enforcement
- **Updates:** Manifest signature verified

---

**Document Status:** APPROVED
**Last Updated:** 2026-02-14
**Implementation Start:** Now
