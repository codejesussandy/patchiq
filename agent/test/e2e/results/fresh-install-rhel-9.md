# Fresh Install Test Plan: RHEL 9

## Platform Information

- **OS:** Red Hat Enterprise Linux 9
- **Architecture:** x86_64 (amd64)
- **Installer Type:** RPM
- **Service Type:** systemd unit
- **Package Manager:** dnf
- **Test Duration:** ~30 minutes

---

## Key Differences from RHEL 8

This test plan inherits all steps from `fresh-install-rhel-8.md` with these RHEL 9-specific differences:

### RHEL 9 Changes

#### 1. DNF Only (No YUM)
- RHEL 9 uses dnf exclusively
- yum is a symlink to dnf

#### 2. Python 3.9+ Default
- Python 3.9 or later is default
- Python 2 completely removed

#### 3. OpenSSL 3.0
- Newer crypto requirements
- May affect TLS configuration

#### 4. Updated SELinux Policies
- More restrictive default policies
- May require updated agent policy

### Installation Command
```bash
# Use dnf (preferred on RHEL 9)
sudo dnf install -y /tmp/patchiq-agent.rpm
```

### Package Naming
```bash
# RPM release tag for RHEL 9
rpm -qip /tmp/patchiq-agent.rpm | grep Release
# Expected: Release: 1.el9
```

---

## RHEL 9 Specific Tests

### Test 1: Verify Python 3 Usage
```bash
# Check agent doesn't depend on Python 2
rpm -qR patchiq-agent | grep python
# Should not require python2
```

### Test 2: Verify OpenSSL 3.0 Compatibility
```bash
# Check TLS connection works
openssl version
# Expected: OpenSSL 3.0.x

# Test backend connection
curl -vvI https://test-hub.patchiq.io/api 2>&1 | grep -E "SSL|TLS"
```

### Test 3: Verify DNF Package Detection
```bash
# Inventory should use dnf
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory")

echo "$INVENTORY" | jq '.data.software[] | select(.source == "dnf") | .name' | head -20
```

---

## Expected Results

All results from `fresh-install-rhel-8.md` apply, with these RHEL 9-specific expectations:

- [x] RPM release tag: 1.el9
- [x] Python 3.9+ used (if agent uses Python)
- [x] OpenSSL 3.0 compatible
- [x] DNF package manager detected
- [x] SELinux policies compatible with RHEL 9

---

## Known Issues/Limitations

### RHEL 9 Specific
- **OpenSSL 3.0:** Stricter crypto requirements
  - Legacy algorithms disabled by default
  - May affect older backend systems

- **SELinux:** More restrictive on RHEL 9
  - May require additional policy modules

- **Python 2:** Completely removed
  - Ensure agent doesn't depend on Python 2

---

## Test Checklist

- [ ] RHEL 9 system with active subscription
- [ ] OpenSSL 3.0 verified
- [ ] Python 3.9+ verified
- [ ] DNF package manager working
- [ ] All RHEL 8 tests passed
- [ ] No Python 2 dependencies

---

## Test Results

**Date:** _______________
**Tester:** _______________
**RHEL Version:** _______________ (9.x)
**Installer Version:** _______________
**OpenSSL Version:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** RHEL 9 (x86_64)
