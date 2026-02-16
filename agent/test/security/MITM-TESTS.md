# Man-in-the-Middle (MITM) Attack Resistance Tests

## Update Manifest Signature Verification

### Manifest Signing (Backend)

**Implementation:**
```go
// Sign update manifest with private key
func SignManifest(manifest *UpdateManifest, privateKey *rsa.PrivateKey) ([]byte, error) {
    manifestJSON, _ := json.Marshal(manifest)
    hashed := sha256.Sum256(manifestJSON)

    signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, hashed[:])
    return signature, err
}
```

**Testing:**
```bash
# Generate test manifest
echo '{"version": "1.0.0", "url": "..."}' > manifest.json

# Sign manifest
openssl dgst -sha256 -sign private-key.pem -out signature.bin manifest.json

# Verify signature
openssl dgst -sha256 -verify public-key.pem -signature signature.bin manifest.json
# Expected: Verified OK
```

**Result:** [ ] Implemented [ ] Not Implemented

---

### Signature Verification (Agent)

**Implementation:**
```go
// Verify manifest signature before processing
func (u *Updater) VerifyManifest(manifest []byte, signature []byte) error {
    hashed := sha256.Sum256(manifest)

    err := rsa.VerifyPKCS1v15(u.publicKey, crypto.SHA256, hashed[:], signature)
    if err != nil {
        return fmt.Errorf("invalid manifest signature")
    }

    return nil
}
```

**Testing:**
```bash
# Test 1: Valid signature (should pass)
# Test 2: Invalid signature (should fail)
# Test 3: Tampered manifest (should fail)
```

**Result for each test:**
- Valid signature: [ ] PASS [ ] FAIL
- Invalid signature: [ ] Rejected [ ] Accepted (VULNERABLE)
- Tampered manifest: [ ] Rejected [ ] Accepted (VULNERABLE)

---

## Binary Checksum Validation

### Checksum in Manifest

**Example Manifest:**
```json
{
  "version": "1.1.0",
  "builds": {
    "windows-amd64": {
      "url": "https://releases.patchiq.io/agent/patchiq-agent-1.1.0-windows-amd64.exe",
      "checksum": "sha256:a1b2c3d4e5f6..." // ✓ Checksum included
    }
  }
}
```

---

### Checksum Verification (Agent)

**Implementation:**
```go
func (u *Updater) VerifyBinaryChecksum(binaryPath string, expectedChecksum string) error {
    data, _ := ioutil.ReadFile(binaryPath)
    hash := sha256.Sum256(data)
    actual := fmt.Sprintf("sha256:%x", hash)

    if actual != expectedChecksum {
        return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actual)
    }

    return nil
}
```

**Testing:**
```bash
# Test 1: Correct checksum (should pass)
# Test 2: Modified binary (should fail)
```

**Result:**
- Correct checksum: [ ] PASS [ ] FAIL
- Modified binary: [ ] Rejected [ ] Accepted (VULNERABLE)

---

## HTTPS Enforcement

### No HTTP Fallback

**Agent Code Check:**
```go
// Verify agent only uses HTTPS URLs
if !strings.HasPrefix(updateURL, "https://") {
    return fmt.Errorf("only HTTPS update URLs allowed")
}
```

**Testing:**
```bash
# Test with HTTP URL (should fail)
# Agent should refuse to download over HTTP
```

**Result:** [ ] Protected [ ] Vulnerable

---

## Certificate Pinning (Optional)

### Public Key Pinning

**If Implemented:**
```go
var pinnedPublicKeys = []string{
    "sha256/AAAAAA...", // Primary
    "sha256/BBBBBB...", // Backup
}

func (c *Client) verifyPinning(cert *x509.Certificate) error {
    pubKeyDER, _ := x509.MarshalPKIXPublicKey(cert.PublicKey)
    hash := sha256.Sum256(pubKeyDER)
    actual := fmt.Sprintf("sha256/%s", base64.StdEncoding.EncodeToString(hash[:]))

    for _, pinned := range pinnedPublicKeys {
        if actual == pinned {
            return nil
        }
    }

    return fmt.Errorf("certificate pin mismatch")
}
```

**Testing:**
```bash
# Test with correct certificate (should work)
# Test with different certificate (should fail)
```

**Result:** [ ] Implemented & Working [ ] Not Implemented

---

## Security Checklist

- [ ] Update manifest digitally signed
- [ ] Agent verifies signature before processing
- [ ] Invalid signatures rejected
- [ ] Tampered manifests rejected
- [ ] Binary checksum in manifest
- [ ] Agent verifies binary checksum
- [ ] Modified binaries rejected
- [ ] HTTPS enforced (no HTTP fallback)
- [ ] Certificate pinning (optional)

## Findings

**Critical:** None

**Recommendations:**
1. Implement certificate pinning for additional MITM protection
2. Use HPKP (HTTP Public Key Pinning) headers

**Conclusion:** [ ] Secure [ ] Needs Improvement

---

**Last Updated:** 2026-02-14
