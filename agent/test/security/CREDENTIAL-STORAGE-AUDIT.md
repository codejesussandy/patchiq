# Credential Storage Audit

## Audit Information

**Date:** _______________
**Auditor:** _______________
**Version:** Agent 1.0.0

---

## Windows Credential Storage

### DPAPI Encryption

**Implementation Check:**
```go
// File: agent/internal/auth/credentials_windows.go
func (s *CredentialStore) Save(creds *Credentials) error {
    // Encrypt with DPAPI
    encrypted, err := dpapi.EncryptBytes([]byte(creds.Token))
    if err != nil {
        return err
    }

    // Save to file
    path := filepath.Join(os.Getenv("LOCALAPPDATA"), "PatchIQ", "credentials.dat")
    return ioutil.WriteFile(path, encrypted, 0600)
}
```

**File Location:** `%LOCALAPPDATA%\PatchIQ\credentials.dat`

**File Permissions Check:**
```powershell
Get-Acl "$env:LOCALAPPDATA\PatchIQ\credentials.dat" | Format-List

# Expected: Only SYSTEM and current user have access
```

**Result:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## macOS Credential Storage

### Keychain Storage

**Implementation Check:**
```go
// File: agent/internal/auth/credentials_darwin.go
func (s *CredentialStore) Save(creds *Credentials) error {
    query := keychain.NewItem()
    query.SetSecClass(keychain.SecClassGenericPassword)
    query.SetService("io.patchiq.agent")
    query.SetAccount("api-token")
    query.SetData([]byte(creds.Token))
    query.SetAccessible(keychain.AccessibleAfterFirstUnlock)

    return keychain.AddItem(query)
}
```

**Testing:**
```bash
# Check keychain item exists
security find-generic-password -s "io.patchiq.agent" -a "api-token"

# Expected: Item found, access restricted to agent
```

**Result:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## Linux Credential Storage

### Encrypted File Storage

**Implementation Check:**
```go
// File: agent/internal/auth/credentials_linux.go
func (s *CredentialStore) Save(creds *Credentials) error {
    // Derive key from machine ID
    machineID, _ := ioutil.ReadFile("/etc/machine-id")
    key := pbkdf2.Key(machineID, []byte("patchiq-agent"), 10000, 32, sha256.New)

    // Encrypt with AES-256-GCM
    block, _ := aes.NewCipher(key)
    gcm, _ := cipher.NewGCM(block)
    nonce := make([]byte, gcm.NonceSize())
    rand.Read(nonce)

    encrypted := gcm.Seal(nonce, nonce, []byte(creds.Token), nil)

    // Save to file
    path := "/var/lib/patchiq/agent/.credentials"
    return ioutil.WriteFile(path, encrypted, 0600)
}
```

**File Permissions Check:**
```bash
stat -c "%a %U:%G" /var/lib/patchiq/agent/.credentials
# Expected: 600 root:root

ls -l /var/lib/patchiq/agent/.credentials
# Expected: -rw------- 1 root root
```

**Encryption Verification:**
```bash
# File should not contain plaintext tokens
strings /var/lib/patchiq/agent/.credentials | grep -i "token\|bearer\|key"
# Expected: No matches (all encrypted)
```

**Result:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## Security Checklist

- [ ] Windows: DPAPI encryption used
- [ ] Windows: File permissions restrict to SYSTEM/admin
- [ ] macOS: Keychain storage used
- [ ] macOS: Agent binary signed (required for Keychain)
- [ ] Linux: AES-256-GCM encryption used
- [ ] Linux: File permissions 600 root:root
- [ ] All: No plaintext credentials in files
- [ ] All: No credentials logged
- [ ] All: Secure key derivation (PBKDF2 or similar)

## Findings

**Critical:**
```
None
```

**Recommendations:**
```
1. Consider hardware security module (HSM) for enhanced security
2. Implement credential rotation mechanism
```

**Conclusion:** [ ] Secure [ ] Needs Improvement

---

**Last Updated:** 2026-02-14
