# Certificate Management

This document provides comprehensive guidance on managing code signing certificates for PatchIQ agent binaries.

---

## Table of Contents

- [Overview](#overview)
- [Certificate Inventory](#certificate-inventory)
- [Procurement Process](#procurement-process)
- [Certificate Storage](#certificate-storage)
- [Renewal Timeline](#renewal-timeline)
- [Secrets Management](#secrets-management)
- [Emergency Procedures](#emergency-procedures)
- [Compliance & Auditing](#compliance--auditing)

---

## Overview

### Purpose

This document serves as the authoritative guide for managing all code signing certificates used in PatchIQ agent distribution. Proper certificate management is critical for:

- **Security**: Preventing unauthorized code signing
- **Availability**: Ensuring uninterrupted release capability
- **Compliance**: Meeting security audit requirements
- **Cost Control**: Managing certificate renewal budgets

### Responsible Parties

| Role | Responsibility | Contact |
|------|----------------|---------|
| **Certificate Owner** | Primary authority for certificate decisions | security@patchiq.io |
| **DevOps Lead** | CI/CD integration and secrets management | devops@patchiq.io |
| **Finance** | Budget approval for certificate purchases | finance@patchiq.io |
| **Security Team** | Security policy compliance and audits | security@patchiq.io |

---

## Certificate Inventory

### Windows Code Signing Certificate

| Property | Value |
|----------|-------|
| **Type** | Extended Validation (EV) Code Signing |
| **Provider** | DigiCert / Sectigo / GlobalSign (TBD) |
| **Cost** | $549-595/year |
| **Validity Period** | 1-3 years |
| **Renewal Lead Time** | 60 days |
| **Storage** | USB Token or Cloud HSM |
| **Used For** | Windows .exe and .msi signing |

**Certificate Details:**
```
Subject: CN=PatchIQ Inc, O=PatchIQ Inc, C=US
Issuer: [Certificate Authority]
Serial Number: [To be filled after procurement]
Valid From: [To be filled]
Valid To: [To be filled]
Thumbprint: [To be filled]
```

**Status:** 🟡 Procurement Required

**Procurement Status:**
- [ ] Budget approved
- [ ] Vendor selected (DigiCert/Sectigo/GlobalSign)
- [ ] Business validation documents prepared
- [ ] CSR generated
- [ ] Order submitted
- [ ] Validation completed
- [ ] Certificate received
- [ ] Certificate tested locally
- [ ] Certificate imported to CI/CD
- [ ] First signed release deployed

---

### Apple Developer ID Certificate

| Property | Value |
|----------|-------|
| **Type** | Developer ID Application |
| **Provider** | Apple Developer Program |
| **Cost** | $99/year (program membership) |
| **Validity Period** | 1 year |
| **Renewal Lead Time** | 30 days |
| **Storage** | Keychain Access + GitHub Secrets |
| **Used For** | macOS binary signing and notarization |

**Certificate Details:**
```
Subject: Developer ID Application: PatchIQ Inc (TEAM_ID)
Issuer: Developer ID Certification Authority
Serial Number: [To be filled after creation]
Valid From: [To be filled]
Valid To: [To be filled]
Team ID: [To be filled]
```

**Status:** 🟡 Procurement Required

**Procurement Status:**
- [ ] Apple Developer Program enrollment submitted
- [ ] Program activated ($99 paid)
- [ ] Team created
- [ ] Developer ID certificate requested
- [ ] Certificate downloaded
- [ ] Certificate imported to Keychain
- [ ] App-specific password created (for notarization)
- [ ] Certificate tested locally
- [ ] Certificate exported for CI/CD (.p12)
- [ ] Certificate imported to GitHub Secrets
- [ ] First signed release deployed

---

### Update Manifest Signing Keys

| Property | Value |
|----------|-------|
| **Type** | Ed25519 Key Pair |
| **Provider** | Self-generated (OpenSSL) |
| **Cost** | Free |
| **Validity Period** | Rotate annually (recommendation) |
| **Renewal Lead Time** | 14 days (for gradual rollout) |
| **Storage** | GitHub Secrets (private), Agent binary (public) |
| **Used For** | Update manifest signature verification |

**Key Details:**
```
Algorithm: Ed25519
Private Key Size: 64 bytes
Public Key Size: 32 bytes
Generation Date: [To be filled]
Rotation Date: [To be filled]
```

**Status:** 🟢 Ready (can be generated anytime)

**Key Generation:**
```bash
./scripts/generate-update-keys.sh
# Follow prompts to generate and store keys
```

---

## Procurement Process

### Windows EV Code Signing Certificate

#### Step 1: Budget Approval (Week 0)

**Action Items:**
- [ ] Submit budget request: $549-595/year
- [ ] Get finance approval
- [ ] Determine validity period (1 vs 3 years)

**Cost Comparison:**

| Vendor | 1-Year Cost | 3-Year Cost | Total Savings |
|--------|-------------|-------------|---------------|
| DigiCert | $595 | $1,485 ($495/yr) | $300 |
| Sectigo | $549 | $1,449 ($483/yr) | $198 |
| GlobalSign | $599 | $1,497 ($499/yr) | $300 |

**Recommendation:** 3-year certificate for cost savings

---

#### Step 2: Vendor Selection (Week 0-1)

**Evaluation Criteria:**
- Cost (weight: 30%)
- Validation speed (weight: 25%)
- Support quality (weight: 20%)
- HSM/token options (weight: 15%)
- Industry reputation (weight: 10%)

**Vendor Comparison:**

| Criteria | DigiCert | Sectigo | GlobalSign |
|----------|----------|---------|------------|
| **Cost** | Higher | Lower | Medium |
| **Validation Speed** | Fast (3-5 days) | Medium (5-10 days) | Medium (5-10 days) |
| **Support** | Excellent | Good | Good |
| **HSM Options** | Cloud HSM, USB | USB only | Cloud HSM, USB |
| **Reputation** | Best | Good | Good |

**Recommended Vendor:** DigiCert (best balance of speed and support)

---

#### Step 3: Business Validation Documents (Week 1)

**Required Documents:**

1. **Business Registration**
   - Articles of Incorporation
   - Business License
   - DUNS number (apply at https://www.dnb.com/)

2. **Proof of Business Address**
   - Utility bill (last 60 days)
   - Bank statement (last 60 days)
   - Lease agreement

3. **Identity Verification**
   - Government-issued ID (authorized signer)
   - Passport or driver's license
   - Proof of employment/authority

4. **Contact Verification**
   - Business phone number (publicly listed)
   - Business email (domain-verified)

**Document Checklist:**
```
[ ] Articles of Incorporation (PDF)
[ ] Business License (PDF)
[ ] DUNS number confirmation
[ ] Utility bill or bank statement (PDF, last 60 days)
[ ] Authorized signer government ID (PDF)
[ ] Domain verification (email confirmation)
[ ] Phone verification (callback confirmation)
```

---

#### Step 4: Generate CSR (Week 1)

**Generate Certificate Signing Request:**

```bash
# Generate private key and CSR
openssl req -new -newkey rsa:2048 -nodes \
  -keyout patchiq-code-signing.key \
  -out patchiq-code-signing.csr \
  -subj "/C=US/ST=California/L=San Francisco/O=PatchIQ Inc/CN=PatchIQ Inc"

# Verify CSR
openssl req -text -noout -verify -in patchiq-code-signing.csr
```

**⚠️ CRITICAL: Securely store `patchiq-code-signing.key`**
- Encrypt with GPG: `gpg --symmetric --cipher-algo AES256 patchiq-code-signing.key`
- Store in secure location (encrypted vault, not git)

---

#### Step 5: Submit Order (Week 1-2)

**Order Process:**

1. **Create Account:**
   - Go to vendor website (e.g., https://www.digicert.com/)
   - Create business account
   - Verify email address

2. **Select Certificate:**
   - Product: "EV Code Signing Certificate"
   - Validity: 3 years (recommended)
   - Quantity: 1
   - Total: ~$1,485

3. **Upload CSR:**
   - Paste CSR content or upload file
   - Verify organization details auto-filled correctly

4. **Complete Validation:**
   - Submit required documents
   - Respond to validation emails
   - Complete phone verification call
   - Wait for approval (3-7 business days)

---

#### Step 6: Receive Certificate (Week 2-3)

**Certificate Delivery Options:**

**Option A: USB Token (Recommended for EV)**
- Certificate pre-loaded on USB hardware token
- Plug-and-play (Windows only)
- Highest security (private key never extractable)
- Cost: Usually included with EV cert

**Option B: Cloud HSM**
- Certificate stored in cloud-based HSM (e.g., DigiCert ONE)
- Accessible from CI/CD via API
- Moderate security (API key required)
- Cost: May have additional monthly fee

**Option C: Software Certificate (.pfx)**
- Not available for EV certificates
- Only for Standard Code Signing

---

#### Step 7: Test Certificate (Week 3)

**Local Testing:**

```powershell
# Test signing with USB token
.\installer\windows\sign-binary.ps1 `
  -CertificatePath "Cert:\CurrentUser\My\<thumbprint>" `
  -FilePath "test\test-binary.exe"

# Or with .pfx file (Standard only)
.\installer\windows\sign-binary.ps1 `
  -CertificatePath "C:\certs\patchiq-code-signing.pfx" `
  -Password "YourPassword" `
  -FilePath "test\test-binary.exe"

# Verify signature
.\scripts\verify-windows-signature.ps1 "test\test-binary.exe"

# Test SmartScreen (on clean Windows 10/11 VM)
# Download and double-click test-binary.exe
# Expected: No warning (for EV cert)
```

---

#### Step 8: CI/CD Integration (Week 3-4)

**For USB Token:**
- Not practical for CI/CD (requires physical USB)
- Use Cloud HSM or export to .pfx for automation

**For Cloud HSM:**
- Obtain API credentials from vendor
- Store in GitHub Secrets
- Update workflow to use cloud signing API

**For .pfx (Standard cert only):**
```bash
# Export certificate to .pfx
# (Done on machine with certificate installed)

# Encode to base64 for GitHub Secrets
base64 -i patchiq-code-signing.pfx -o cert.b64

# Add to GitHub Secrets:
# WINDOWS_CERTIFICATE_BASE64 = <contents of cert.b64>
# WINDOWS_CERTIFICATE_PASSWORD = <certificate password>
```

**Test CI/CD:**
```bash
# Trigger test build
gh workflow run agent-release.yml
```

---

### Apple Developer ID Certificate

#### Step 1: Enroll in Apple Developer Program (Week 0)

**Enrollment Process:**

1. **Go to:** https://developer.apple.com/programs/enroll/
2. **Sign in** with Apple ID
3. **Select** "Enroll as Organization"
4. **Provide:**
   - Organization name: PatchIQ Inc
   - DUNS number (required)
   - Organization website
   - Business address
5. **Complete** purchase ($99/year)
6. **Wait** for approval (1-3 business days)

**Timeline:** 1-3 days

---

#### Step 2: Create Developer ID Certificate (Week 1)

**Option A: Via Xcode (macOS required)**

1. Open Xcode
2. Preferences → Accounts
3. Add Apple ID
4. Manage Certificates → + → Developer ID Application
5. Certificate is created and automatically added to Keychain

**Option B: Via Developer Portal**

1. Go to: https://developer.apple.com/account/resources/certificates/add
2. Select: "Developer ID Application"
3. Generate CSR (via Keychain Access or OpenSSL)
4. Upload CSR
5. Download certificate (.cer)
6. Import to Keychain Access (double-click)

**Verify Certificate:**
```bash
# List signing identities
security find-identity -p codesigning -v

# Expected output:
# 1) ABC123... "Developer ID Application: PatchIQ Inc (TEAM_ID)"
```

---

#### Step 3: Create App-Specific Password (Week 1)

**For Notarization:**

1. Go to: https://appleid.apple.com
2. Sign in with Apple ID
3. Security → App-Specific Passwords
4. Generate password
   - Name: "PatchIQ Agent Notarization"
   - Copy password (format: `xxxx-xxxx-xxxx-xxxx`)
5. Store securely (needed for CI/CD)

---

#### Step 4: Test Signing & Notarization (Week 1-2)

**Test locally:**

```bash
# Sign binary
./scripts/sign-macos.sh \
  --identity "Developer ID Application: PatchIQ Inc (TEAM_ID)" \
  --binary dist/patchiq-agent-darwin-arm64

# Notarize binary
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="ABC123XYZ"

./scripts/notarize-macos.sh \
  --binary dist/patchiq-agent-darwin-arm64 \
  --bundle-id com.patchiq.agent

# Verify
./scripts/verify-macos-signature.sh \
  dist/patchiq-agent-darwin-arm64
```

---

#### Step 5: CI/CD Integration (Week 2)

**Export Certificate:**

```bash
# Export certificate from Keychain Access
# Right-click → Export "Developer ID Application..."
# Save as: patchiq-macos-cert.p12
# Set strong password

# Encode to base64
base64 -i patchiq-macos-cert.p12 | pbcopy

# Add to GitHub Secrets:
# MACOS_CERTIFICATE_BASE64 = <paste from clipboard>
# MACOS_CERTIFICATE_PASSWORD = <certificate password>
# APPLE_ID = <your@email.com>
# APPLE_APP_PASSWORD = <app-specific password>
# APPLE_TEAM_ID = <team ID from developer.apple.com>
```

---

## Certificate Storage

### Local Development

**macOS:**
```
Location: Keychain Access
Access: User keychain (login keychain)
Protection: Keychain password
Backup: Time Machine (keychain is encrypted)
```

**Windows:**
```
Location (USB Token): USB device (hardware-protected)
Location (.pfx): C:\ProgramData\PatchIQ\certs\ (encrypted folder)
Access: Administrator only
Protection: Windows DPAPI or BitLocker
Backup: Encrypted backup to secure location
```

**Linux:**
```
Location: /etc/patchiq/certs/ (encrypted partition)
Access: root only (chmod 600)
Protection: LUKS encryption + GPG
Backup: Encrypted backup to secure location
```

---

### CI/CD (GitHub Secrets)

**GitHub Secrets:**
```
Settings → Secrets → Actions

Required Secrets:
- WINDOWS_CERTIFICATE_BASE64 (base64-encoded .pfx)
- WINDOWS_CERTIFICATE_PASSWORD (plaintext password)
- MACOS_CERTIFICATE_BASE64 (base64-encoded .p12)
- MACOS_CERTIFICATE_PASSWORD (plaintext password)
- MACOS_CODESIGN_IDENTITY (identity name, optional)
- APPLE_ID (Apple ID email)
- APPLE_APP_PASSWORD (app-specific password)
- APPLE_TEAM_ID (team ID)
- UPDATE_MANIFEST_PRIVATE_KEY (base64-encoded Ed25519 key)
```

**Access Control:**
```
Repository Settings → Environments → production

Protection Rules:
- Required reviewers: 2 (security team + devops lead)
- Deployment branches: tags matching v*.*.*
- Wait timer: 5 minutes (for review)
```

---

### Enterprise Key Management (Optional)

**Azure Key Vault:**

```bash
# Create Key Vault
az keyvault create \
  --name patchiq-certs \
  --resource-group patchiq-prod \
  --location eastus

# Store certificate
az keyvault secret set \
  --vault-name patchiq-certs \
  --name windows-code-signing-cert \
  --file patchiq-code-signing.pfx

# Grant access to CI/CD service principal
az keyvault set-policy \
  --name patchiq-certs \
  --spn <ci-cd-service-principal-id> \
  --secret-permissions get list
```

**AWS Secrets Manager:**

```bash
# Store certificate
aws secretsmanager create-secret \
  --name patchiq/windows-code-signing-cert \
  --secret-binary fileb://patchiq-code-signing.pfx \
  --region us-east-1

# Grant access to CI/CD role
aws secretsmanager put-resource-policy \
  --secret-id patchiq/windows-code-signing-cert \
  --resource-policy file://policy.json
```

---

## Renewal Timeline

### 90 Days Before Expiration

**Actions:**
- [ ] Review current certificate provider
- [ ] Compare pricing (may have changed)
- [ ] Verify business information is current
- [ ] Prepare renewal budget approval
- [ ] Check for any changes in requirements

**Notification:**
- Email: security@patchiq.io, devops@patchiq.io
- Slack: #security-alerts
- Calendar: 90-day reminder

---

### 60 Days Before Expiration

**Actions:**
- [ ] Submit renewal order to CA
- [ ] Update business documents if needed
- [ ] Generate new CSR (if required by CA)
- [ ] Pay renewal invoice

**Notification:**
- Email: finance@patchiq.io (for payment)
- Ticket: Create renewal tracking ticket

---

### 30 Days Before Expiration

**Actions:**
- [ ] Receive renewed certificate
- [ ] Test signing locally (both platforms)
- [ ] Verify SmartScreen behavior (Windows)
- [ ] Verify Gatekeeper behavior (macOS)
- [ ] Document new certificate details (thumbprint, serial, expiry)

**Testing Checklist:**
```
[ ] Sign test Windows .exe
[ ] Sign test Windows .msi
[ ] Verify on Windows 10 VM (clean)
[ ] Verify on Windows 11 VM (clean)
[ ] Sign test macOS binary
[ ] Notarize test macOS binary
[ ] Verify on macOS 13 VM (clean)
[ ] Verify on macOS 14 VM (clean)
```

---

### 14 Days Before Expiration

**Actions:**
- [ ] Update GitHub Secrets with new certificate
- [ ] Update CI/CD workflows if needed
- [ ] Deploy test build using new certificate
- [ ] Monitor test build for issues

**Test Build Verification:**
```
[ ] Build succeeds
[ ] Binary is signed correctly
[ ] Signature timestamp is valid
[ ] SmartScreen passes (Windows)
[ ] Gatekeeper passes (macOS)
[ ] No warnings on fresh install
```

---

### 7 Days Before Expiration

**Actions:**
- [ ] Deploy production build with new certificate
- [ ] Monitor for signing issues
- [ ] Verify users can download and install
- [ ] Document any issues encountered

**Rollback Plan:**
- If new certificate fails: revert to old certificate (still valid for 7 days)
- Emergency contact: CA support hotline

---

### Expiration Day

**Actions:**
- [ ] Verify old certificate has expired
- [ ] Confirm all new builds use new certificate
- [ ] Archive old certificate securely
- [ ] Update documentation with new expiry date

**Post-Expiration:**
- Old certificates can still validate previously-signed binaries (if timestamped)
- Timestamp servers ensure signatures remain valid indefinitely

---

## Secrets Management

### Best Practices

1. **Principle of Least Privilege**
   - Limit access to 2-3 authorized personnel
   - Use separate dev/prod certificates if possible
   - Audit access logs quarterly

2. **Encryption at Rest**
   - Encrypt certificate files (GPG, BitLocker, FileVault)
   - Use hardware tokens for highest security
   - Never store unencrypted certificates

3. **Encryption in Transit**
   - Use HTTPS for all certificate transfers
   - Use secure channels for sharing passwords (1Password, LastPass)
   - Never email certificates or passwords

4. **Rotation**
   - Rotate passwords annually
   - Rotate signing keys (update manifest) annually
   - Test rotation process before emergency need

5. **Monitoring**
   - Set up expiration alerts (90/60/30/14/7 days)
   - Monitor certificate usage in CI/CD logs
   - Alert on failed signings

6. **Incident Response**
   - Document compromise procedure
   - Practice key rotation drill annually
   - Maintain emergency contact list

---

### Access Control Matrix

| Resource | Security Team | DevOps Lead | Finance | Developers |
|----------|---------------|-------------|---------|------------|
| **Windows Certificate (prod)** | Read/Write | Read | None | None |
| **macOS Certificate (prod)** | Read/Write | Read | None | None |
| **GitHub Secrets** | Admin | Write | None | Read (via CI/CD) |
| **Azure Key Vault** | Admin | Read | None | None |
| **Certificate Purchase** | Approve | Request | Approve | None |
| **Renewal Process** | Owner | Execute | Pay | None |

---

## Emergency Procedures

### Certificate Compromise

**Indicators:**
- Unauthorized signed binaries discovered
- Certificate credentials leaked (e.g., in git commit)
- Suspicious certificate usage in logs
- CA notification of compromise

**Immediate Response (within 24 hours):**

1. **Revoke Certificate:**
   ```bash
   # Contact CA immediately
   # DigiCert: https://www.digicert.com/support/certificate-revocation
   # Sectigo: https://sectigo.com/support
   # Apple: https://developer.apple.com/support/contact/
   ```

2. **Rotate GitHub Secrets:**
   ```bash
   # Remove compromised secrets
   # Generate new keys/certificates
   # Update CI/CD workflows
   ```

3. **Audit Signed Binaries:**
   ```bash
   # List all binaries signed with compromised certificate
   # Verify authenticity of each binary
   # Flag suspicious binaries
   ```

4. **Notify Stakeholders:**
   - Internal: Security team, executive team
   - External: Users (if malicious binaries distributed)
   - Regulatory: As required by law

**Recovery (within 7 days):**

1. **Obtain New Certificate:**
   - Emergency procurement from CA
   - May require expedited validation ($$$)

2. **Re-sign All Binaries:**
   ```bash
   # Re-sign all release binaries
   # Update distribution channels
   # Notify users of new signature
   ```

3. **Post-Incident Review:**
   - Root cause analysis
   - Update security procedures
   - Implement preventive measures

---

### Certificate Loss

**Indicators:**
- Certificate file deleted/corrupted
- USB token lost/damaged
- Cloud HSM access lost

**Recovery:**

1. **For Windows Certificate:**
   - If backup exists: Restore from encrypted backup
   - If no backup: Re-issue certificate from CA (usually free within validity period)

2. **For macOS Certificate:**
   - If in iCloud Keychain: Restore from iCloud
   - If no backup: Revoke and create new Developer ID

3. **For Update Manifest Keys:**
   - Rotate to new keys immediately
   - Deploy updated agent with new public key

---

### Expired Certificate (Missed Renewal)

**Impact:**
- Cannot sign new binaries
- Release process blocked
- Emergency patches delayed

**Recovery:**

1. **Immediate:**
   - Rush order new certificate (2-3 day expedite fee)
   - Contact CA for emergency issuance

2. **Short-term Workaround:**
   - Deploy unsigned binaries to staging only
   - Document security exception
   - Get approval from security team

3. **Prevention:**
   - Set up redundant expiration alerts
   - Renew 60 days early (not 7 days)
   - Automate renewal process where possible

---

## Compliance & Auditing

### Annual Security Audit

**Certificate Review:**
- [ ] Verify all certificates are current
- [ ] Confirm expiration dates tracked
- [ ] Review access control logs
- [ ] Validate backup procedures
- [ ] Test recovery procedures

**Secrets Management Audit:**
- [ ] Review GitHub Secrets access logs
- [ ] Verify principle of least privilege
- [ ] Confirm encryption at rest
- [ ] Test rotation procedures
- [ ] Review incident response plan

**Documentation Review:**
- [ ] Update this document with any changes
- [ ] Verify all procedures are accurate
- [ ] Update contact information
- [ ] Review and update runbooks

---

### Quarterly Review

**Certificate Status:**
- [ ] Windows cert: X days until expiration
- [ ] macOS cert: X days until expiration
- [ ] Update keys: Last rotated X days ago

**Access Audit:**
- [ ] Review who has access to certificates
- [ ] Revoke access for departed employees
- [ ] Confirm MFA enabled for all accounts

**Usage Audit:**
- [ ] Number of binaries signed this quarter
- [ ] Failed signing attempts (investigate anomalies)
- [ ] CI/CD secrets access logs

---

## Appendix

### Certificate Authority Contact Information

**DigiCert:**
- Website: https://www.digicert.com/
- Support: https://www.digicert.com/support/
- Phone: +1-801-877-2100
- Email: support@digicert.com
- Revocation: https://www.digicert.com/support/certificate-revocation

**Sectigo (Comodo):**
- Website: https://sectigo.com/
- Support: https://sectigo.com/support/
- Phone: +1-888-266-6361
- Email: support@sectigo.com

**Apple Developer:**
- Website: https://developer.apple.com/
- Support: https://developer.apple.com/support/
- Phone: +1-800-633-2152
- Portal: https://developer.apple.com/account/

---

### Internal Contacts

**Security Team:**
- Email: security@patchiq.io
- Slack: #security
- On-call: security-oncall@patchiq.io

**DevOps Team:**
- Email: devops@patchiq.io
- Slack: #devops
- On-call: devops-oncall@patchiq.io

**Finance Team:**
- Email: finance@patchiq.io
- Purchasing: purchasing@patchiq.io

---

### Budget Planning

**Annual Certificate Costs:**

| Certificate | Cost | Frequency | Annual Total |
|-------------|------|-----------|--------------|
| Windows EV Code Signing (3-year) | $1,485 | One-time (amortized) | $495 |
| Apple Developer Program | $99 | Annual | $99 |
| Update Manifest Keys | $0 | Free | $0 |
| **Total Annual Cost** | | | **$594** |

**One-Time Costs:**
- Initial procurement: ~$1,600
- USB tokens (optional): $50-100 each
- Cloud HSM (optional): $10-50/month

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-14
**Next Review:** 2026-05-14 (Quarterly)
**Owner:** Security Team (security@patchiq.io)
