# Fresh Install Test Plan: Fedora 40

## Platform Information

- **OS:** Fedora 40
- **Architecture:** x86_64 (amd64)
- **Installer Type:** RPM
- **Service Type:** systemd unit
- **Package Manager:** dnf
- **Test Duration:** ~30 minutes

---

## Key Differences from Fedora 39

This test plan inherits all steps from `fresh-install-fedora-39.md` with these Fedora 40-specific differences:

### Fedora 40 New Features

#### 1. DNF5 Default
- Fedora 40 uses DNF5 by default
- Faster, rewritten in C++
- Agent must support DNF5 API changes

#### 2. Kernel 6.7+
- Even newer kernel than Fedora 39
- Latest hardware support

#### 3. systemd 255+
- Latest systemd features
- May have new unit file options

---

## Installation
```bash
# RPM release tag for Fedora 40
rpm -qip /tmp/patchiq-agent.rpm | grep Release
# Expected: Release: 1.fc40

# Install
sudo dnf install -y /tmp/patchiq-agent.rpm
```

---

## Fedora 40 Specific Tests

### Test 1: Verify DNF5
```bash
# Check DNF version
dnf --version
# Expected: 5.x.x

# Verify agent works with DNF5
# Trigger software deployment or inventory
```

### Test 2: Verify Kernel 6.7+
```bash
uname -r
# Expected: 6.7.x or 6.8.x

# Check inventory
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory")

echo "$INVENTORY" | jq '.data.system.kernelVersion'
```

### Test 3: Verify systemd 255+
```bash
systemctl --version
# Expected: systemd 255 or later
```

---

## Expected Results

All Fedora 39 tests apply, plus:

- [x] DNF5 supported
- [x] Kernel 6.7+ detected
- [x] systemd 255+ working
- [x] RPM release tag: 1.fc40

---

## Known Issues/Limitations

### Fedora 40 Specific
- **DNF5 Changes:** New package manager API
  - Ensure executors compatible

- **Latest Everything:** Bleeding edge
  - May encounter new bugs
  - Good for testing future RHEL 10

---

## Test Checklist

- [ ] Fresh Fedora 40 system
- [ ] DNF5 verified
- [ ] Kernel 6.7+ verified
- [ ] systemd 255+ verified
- [ ] All Fedora 39 tests passed
- [ ] Package deployment with DNF5 tested

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Fedora Version:** _______________ (40)
**DNF Version:** _______________
**Kernel Version:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** Fedora 40 (x86_64)
