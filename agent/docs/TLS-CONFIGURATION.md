# TLS Configuration Guide

This guide explains TLS/HTTPS enforcement in the PatchIQ agent and how to configure custom CA certificates for self-signed or enterprise certificate scenarios.

---

## Table of Contents

- [Overview](#overview)
- [TLS Enforcement](#tls-enforcement)
- [Custom CA Certificates](#custom-ca-certificates)
- [Configuration Examples](#configuration-examples)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

---

## Overview

**Starting with version 1.0.0, the PatchIQ agent enforces HTTPS for all backend communication.**

Key changes:
- **HTTPS is mandatory** - HTTP URLs are rejected
- **TLS validation is always enabled** - Certificate verification cannot be disabled
- **Minimum TLS version:** TLS 1.2
- **Custom CA certificates supported** - For self-signed or enterprise certificates

---

## TLS Enforcement

### Why TLS is Mandatory

**Security Requirements:**
- Prevent man-in-the-middle (MITM) attacks
- Protect sensitive data in transit (agent credentials, inventory data, telemetry)
- Comply with enterprise security policies
- Meet security audit requirements

**What Changed:**

**Before (Insecure):**
```json
{
  "serverUrl": "http://patchiq-backend.local:3000",
  "tlsDisable": true
}
```

**After (Secure):**
```json
{
  "serverUrl": "https://patchiq-backend.local:3000"
}
```

### HTTPS Validation

The agent validates:
1. **URL Protocol:** Must be `https://` (not `http://`)
2. **Certificate Chain:** Server certificate must be signed by trusted CA
3. **Certificate Validity:** Certificate must not be expired
4. **Hostname Match:** Certificate CN/SAN must match server hostname

**Example Error (HTTP URL):**
```
Error: server URL must use HTTPS (got: http://example.com)
```

---

## Custom CA Certificates

### When You Need Custom CA Certificates

**Scenario 1: Self-Signed Certificates**
- Internal/development environments
- Testing without purchasing CA certificate
- Quickly setting up HTTPS

**Scenario 2: Enterprise Certificate Authority**
- Corporate PKI infrastructure
- Internal CA for organizational certificates
- Private certificate chains

**Scenario 3: Certificate Pinning**
- Additional security layer
- Prevent rogue CA attacks
- Strict certificate validation

### How to Use Custom CA Certificates

#### Step 1: Obtain CA Certificate

**For self-signed certificates:**
```bash
# If you created your own CA, export the CA certificate
openssl x509 -in /path/to/ca.crt -out /etc/patchiq/ca-cert.pem -outform PEM
```

**For enterprise CA:**
- Contact your IT/Security team
- Download CA certificate from your enterprise PKI portal
- Save in PEM format

#### Step 2: Configure Agent

**Method 1: Configuration File**

Edit `config.json`:
```json
{
  "serverUrl": "https://patchiq-backend.internal:3000",
  "caCertFile": "/etc/patchiq/ca-cert.pem"
}
```

**Method 2: Environment Variable**

```bash
export PATCHIQ_CA_CERT_FILE=/etc/patchiq/ca-cert.pem
```

**Method 3: Windows Registry (Windows only)**

```powershell
Set-ItemProperty -Path "HKLM:\SOFTWARE\PatchIQ\Agent" -Name "CACertFile" -Value "C:\ProgramData\PatchIQ\ca-cert.pem"
```

#### Step 3: Verify Configuration

Start the agent with verbose logging:
```bash
# Linux/macOS
./patchify-agent --log-level debug

# Windows
patchify-agent.exe --log-level debug
```

Look for log entry:
```
[Client] Loaded custom CA certificate from: /etc/patchiq/ca-cert.pem
```

#### Step 4: Test Connection

```bash
# Agent should successfully register and send heartbeat
# Check logs for successful TLS handshake
```

---

## Configuration Examples

### Example 1: Production with Public CA Certificate

**Scenario:** Backend uses Let's Encrypt or commercial CA certificate

**Configuration:**
```json
{
  "serverUrl": "https://patchiq.example.com",
  "agentName": "prod-server-01"
}
```

**Notes:**
- No custom CA certificate needed
- Agent trusts system CA bundle (default)

---

### Example 2: Development with Self-Signed Certificate

**Scenario:** Local development environment with self-signed cert

**Step 1: Generate Self-Signed Certificate**
```bash
# Generate CA key and certificate
openssl genrsa -out ca-key.pem 2048
openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 365 -out ca-cert.pem \
  -subj "/C=US/ST=CA/L=SF/O=PatchIQ Dev/CN=PatchIQ Dev CA"

# Generate server key and CSR
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server.csr \
  -subj "/C=US/ST=CA/L=SF/O=PatchIQ/CN=patchiq.local"

# Sign server certificate with CA
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -days 365 -sha256
```

**Step 2: Configure Backend**
```bash
# Use server-cert.pem and server-key.pem in your Express app
```

**Step 3: Configure Agent**
```json
{
  "serverUrl": "https://patchiq.local:3000",
  "caCertFile": "/etc/patchiq/ca-cert.pem"
}
```

---

### Example 3: Enterprise CA Certificate

**Scenario:** Corporate environment with internal PKI

**Configuration:**
```json
{
  "serverUrl": "https://patchiq.corp.example.com",
  "caCertFile": "/etc/ssl/certs/corporate-ca.pem",
  "agentName": "workstation-123"
}
```

**Notes:**
- Corporate CA certificate must be in PEM format
- Certificate path must be accessible by agent process
- On Windows, ensure SYSTEM account has read access

---

### Example 4: Multiple CA Certificates (Certificate Chain)

**Scenario:** Server certificate signed by intermediate CA

**Step 1: Concatenate CA Certificates**
```bash
# Combine root CA and intermediate CA into single file
cat root-ca.pem intermediate-ca.pem > ca-bundle.pem
```

**Step 2: Configure Agent**
```json
{
  "serverUrl": "https://patchiq.example.com",
  "caCertFile": "/etc/patchiq/ca-bundle.pem"
}
```

---

## Troubleshooting

### Issue: "server URL must use HTTPS"

**Cause:** Trying to connect to HTTP endpoint

**Solution:**
1. Update `serverUrl` to use `https://` protocol
2. Ensure backend is configured for HTTPS
3. Check firewall allows HTTPS (port 443 or custom)

**Example:**
```json
// Before (wrong)
{"serverUrl": "http://patchiq.local"}

// After (correct)
{"serverUrl": "https://patchiq.local"}
```

---

### Issue: "x509: certificate signed by unknown authority"

**Cause:** Server uses self-signed or enterprise CA certificate not trusted by system

**Solution:**
1. Obtain CA certificate from server administrator
2. Configure `caCertFile` in agent config
3. Verify CA certificate is in PEM format

**Verification:**
```bash
# Check certificate format
openssl x509 -in ca-cert.pem -text -noout

# Expected output: Certificate details
```

---

### Issue: "x509: certificate has expired"

**Cause:** Server certificate or CA certificate has expired

**Solution:**
1. Check certificate expiration:
   ```bash
   openssl x509 -in ca-cert.pem -noout -dates
   ```
2. Renew certificate with CA
3. Update agent configuration with new certificate

---

### Issue: "x509: certificate is valid for X, not Y"

**Cause:** Hostname mismatch between certificate CN/SAN and `serverUrl`

**Solution:**
1. Verify server certificate CN/SAN:
   ```bash
   openssl x509 -in server-cert.pem -noout -text | grep -A1 "Subject:"
   openssl x509 -in server-cert.pem -noout -text | grep -A1 "Subject Alternative Name"
   ```

2. Update `serverUrl` to match certificate, or re-issue certificate with correct hostname

**Example:**
```bash
# Certificate CN: patchiq.example.com
# serverUrl must be: https://patchiq.example.com
# NOT: https://192.168.1.100 (IP address)
```

---

### Issue: "failed to read CA certificate file"

**Cause:** CA certificate file not found or permissions issue

**Solution:**
1. Verify file exists:
   ```bash
   ls -l /etc/patchiq/ca-cert.pem
   ```

2. Check file permissions:
   ```bash
   # File must be readable by agent process
   chmod 644 /etc/patchiq/ca-cert.pem
   ```

3. On Windows, check SYSTEM account has read access:
   ```powershell
   icacls "C:\ProgramData\PatchIQ\ca-cert.pem"
   # Add read permission if missing
   icacls "C:\ProgramData\PatchIQ\ca-cert.pem" /grant "SYSTEM:R"
   ```

---

### Issue: "failed to parse CA certificate"

**Cause:** CA certificate file is not in valid PEM format

**Solution:**
1. Verify PEM format:
   ```bash
   head -n 1 ca-cert.pem
   # Should output: -----BEGIN CERTIFICATE-----
   ```

2. Convert from DER to PEM if needed:
   ```bash
   openssl x509 -inform DER -in ca-cert.der -out ca-cert.pem -outform PEM
   ```

3. Ensure no extra whitespace or corruption

---

## Security Best Practices

### 1. Certificate Storage

**Linux/macOS:**
```bash
# Store CA certificate in system-protected directory
sudo mkdir -p /etc/patchiq
sudo cp ca-cert.pem /etc/patchiq/
sudo chmod 644 /etc/patchiq/ca-cert.pem
sudo chown root:root /etc/patchiq/ca-cert.pem
```

**Windows:**
```powershell
# Store in ProgramData (accessible by SYSTEM)
New-Item -ItemType Directory -Force -Path "C:\ProgramData\PatchIQ"
Copy-Item ca-cert.pem -Destination "C:\ProgramData\PatchIQ\"
icacls "C:\ProgramData\PatchIQ\ca-cert.pem" /inheritance:r /grant "SYSTEM:R" /grant "Administrators:F"
```

### 2. Certificate Rotation

**Best Practice:**
- Renew certificates 30 days before expiration
- Test new certificate in staging environment
- Deploy new certificate to all agents
- Monitor for certificate expiration (automated alerts)

**Automation Example:**
```bash
# Cron job to check certificate expiration (daily)
0 9 * * * /usr/local/bin/check-cert-expiration.sh
```

**Script Example:**
```bash
#!/bin/bash
CERT_FILE="/etc/patchiq/ca-cert.pem"
DAYS_WARNING=30

EXPIRY=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt $DAYS_WARNING ]; then
  echo "WARNING: CA certificate expires in $DAYS_LEFT days"
  # Send alert to admin
fi
```

### 3. Least Privilege

**Principle:** Agent should run with minimal permissions

**Linux:**
```bash
# Create dedicated user for agent
sudo useradd -r -s /bin/false patchiq-agent

# Run agent as non-root
sudo -u patchiq-agent /usr/local/bin/patchify-agent
```

**Windows:**
```powershell
# Run agent as Network Service (not Administrator)
# Configure during installation
```

### 4. Network Security

**Firewall Rules:**
```bash
# Allow HTTPS to backend only (egress)
sudo ufw allow out to <backend-ip> port 443

# Block all other outbound connections from agent
```

**TLS Version:**
```
Minimum: TLS 1.2
Recommended: TLS 1.3
Ciphers: Modern ciphers only (no weak/deprecated)
```

### 5. Certificate Monitoring

**Automate monitoring:**
1. Certificate expiration alerts (30/14/7 days)
2. Certificate revocation checks (OCSP/CRL)
3. Certificate chain validation
4. Hostname/IP changes

**Tools:**
- `certbot` for Let's Encrypt automation
- `cert-manager` for Kubernetes environments
- Custom scripts for enterprise CAs

---

## Advanced Configuration

### Proxy with TLS

**Scenario:** Agent connects through corporate proxy

**Configuration:**
```json
{
  "serverUrl": "https://patchiq.example.com",
  "proxyUrl": "http://proxy.corp.example.com:8080",
  "proxyUser": "proxyuser",
  "proxyPassword": "proxypass",
  "caCertFile": "/etc/patchiq/ca-cert.pem"
}
```

**Notes:**
- Proxy connection uses HTTP (proxy itself)
- Backend connection uses HTTPS (end-to-end encryption)
- TLS validation occurs between agent and backend (not proxy)

---

### Certificate Pinning (Future Enhancement)

**Planned Feature:** Pin specific certificate or public key

**Example Configuration (future):**
```json
{
  "serverUrl": "https://patchiq.example.com",
  "tlsPinning": {
    "enabled": true,
    "pinType": "publicKey",
    "pins": [
      "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    ]
  }
}
```

---

## FAQ

**Q: Can I disable TLS validation for testing?**
A: No. TLS validation cannot be disabled. Use custom CA certificate for self-signed certs.

**Q: Does the agent support TLS 1.3?**
A: Yes, if the backend supports it. The agent negotiates the highest TLS version supported by both sides.

**Q: Can I use IP address instead of hostname?**
A: Yes, but the server certificate must include the IP in Subject Alternative Name (SAN).

**Q: What happens if CA certificate expires?**
A: TLS connections will fail. Update the CA certificate before expiration.

**Q: Can I use multiple CA certificates?**
A: Yes, concatenate all CA certificates into a single PEM file (ca-bundle.pem).

**Q: Does the agent verify certificate revocation?**
A: Currently, no. OCSP/CRL checking is planned for future release.

---

## Support

**Documentation:**
- Code Signing: `docs/CODE-SIGNING.md`
- Certificate Management: `docs/CERTIFICATE-MANAGEMENT.md`
- Runbook: `docs/RUNBOOK-SIGNING.md`

**Internal Contacts:**
- Security Team: security@patchiq.io
- DevOps Team: devops@patchiq.io

**External Resources:**
- OpenSSL Documentation: https://www.openssl.org/docs/
- Let's Encrypt: https://letsencrypt.org/
- Mozilla TLS Guidelines: https://wiki.mozilla.org/Security/Server_Side_TLS

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-14
**Next Review:** 2026-08-14
