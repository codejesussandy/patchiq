# Fresh Install Test Plan: Rocky Linux 9

## Platform Information

- **OS:** Rocky Linux 9
- **Architecture:** x86_64 (amd64)
- **Installer Type:** RPM
- **Service Type:** systemd unit
- **Package Manager:** dnf
- **Test Duration:** ~30 minutes

---

## Key Differences from Rocky Linux 8

This test plan inherits all steps from `fresh-install-rocky-8.md` with Rocky 9-specific differences that mirror RHEL 9:

### Rocky Linux 9 vs Rocky Linux 8

#### 1. DNF Only
- Rocky 9 uses dnf exclusively
- Python 3.9+ default
- OpenSSL 3.0

#### 2. Based on RHEL 9
- All RHEL 9 changes apply
- See `fresh-install-rhel-9.md` for details

---

## Installation
```bash
# Use dnf
sudo dnf install -y /tmp/patchiq-agent.rpm

# RPM release tag
rpm -qip /tmp/patchiq-agent.rpm | grep Release
# Expected: Release: 1.el9 (same as RHEL 9)
```

---

## Rocky Linux 9 Specific Tests

### Test 1: Verify OS Detection
```bash
cat /etc/os-release
# NAME="Rocky Linux"
# VERSION="9.3 (Blue Onyx)"

# Check inventory
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory")

OS_NAME=$(echo "$INVENTORY" | jq -r '.data.system.osName')
echo "Detected OS: $OS_NAME"
# Expected: "Rocky Linux 9"
```

### Test 2: Verify OpenSSL 3.0
```bash
openssl version
# Expected: OpenSSL 3.0.x

# Test TLS connection
curl -vvI https://test-hub.patchiq.io/api 2>&1 | grep -E "SSL|TLS"
```

### Test 3: Verify Python 3.9+
```bash
python3 --version
# Expected: Python 3.9.x or later

# No Python 2
python2 --version 2>&1 | grep -q "command not found" && echo "✓ Python 2 removed"
```

---

## Expected Results

All Rocky 8 and RHEL 9 tests apply:

- [x] OS detected as "Rocky Linux 9"
- [x] OpenSSL 3.0 compatible
- [x] Python 3.9+ used
- [x] DNF package manager
- [x] No subscription required
- [x] Binary compatible with RHEL 9

---

## Known Issues/Limitations

### Rocky Linux 9 Specific
- Same as Rocky 8, plus RHEL 9 considerations
- OpenSSL 3.0 stricter crypto requirements
- More restrictive SELinux

---

## Test Checklist

- [ ] Fresh Rocky Linux 9 system
- [ ] OS detected as Rocky Linux 9
- [ ] OpenSSL 3.0 verified
- [ ] Python 3.9+ verified
- [ ] All RHEL 9 tests passed
- [ ] All Rocky 8 tests passed

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Rocky Version:** _______________ (9.x)
**OpenSSL Version:** _______________
**Installer Version:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** Rocky Linux 9 (x86_64)
