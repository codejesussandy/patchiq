# Fresh Install Test Plan: Fedora 39

## Platform Information

- **OS:** Fedora 39
- **Architecture:** x86_64 (amd64)
- **Installer Type:** RPM
- **Service Type:** systemd unit
- **Package Manager:** dnf
- **Test Duration:** ~30 minutes

---

## Key Differences from RHEL

This test plan inherits core steps from `fresh-install-rhel-8.md` with these Fedora-specific differences:

### Fedora vs RHEL Differences

#### 1. No Subscription Required
- Fedora is free and open source
- No subscription-manager needed

#### 2. Bleeding Edge Packages
- Very recent kernel versions (6.5+)
- Latest systemd, SELinux policies
- Faster moving than RHEL

#### 3. Different Repositories
- Fedora repos vs RHEL repos
- More packages available

#### 4. Release Cycle
- New Fedora every 6 months
- RHEL is based on Fedora

### Installation
```bash
# No subscription needed
sudo dnf install -y /tmp/patchiq-agent.rpm

# RPM release tag for Fedora 39
# Expected: Release: 1.fc39
```

---

## Fedora 39 Specific Tests

### Test 1: Verify Kernel Version
```bash
# Fedora 39 uses kernel 6.5+
uname -r
# Expected: 6.5.x or 6.6.x

# Check inventory captures correct kernel
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory")

echo "$INVENTORY" | jq '.data.system.kernelVersion'
```

### Test 2: Verify systemd Version
```bash
# Fedora 39 uses systemd 254+
systemctl --version
# Expected: systemd 254 or later
```

### Test 3: Verify DNF5 (if applicable)
```bash
# Fedora 39 may have DNF5
dnf --version

# Agent should work with both DNF4 and DNF5
```

### Test 4: Verify Package Count
```bash
# Fedora typically has more packages installed
SOFTWARE_COUNT=$(echo "$INVENTORY" | jq '.data.software | length')
echo "Packages detected: $SOFTWARE_COUNT"
# Expected: 500-1000+ packages (Fedora Workstation)
```

---

## Expected Results

All core Linux tests apply, with Fedora-specific expectations:

- [x] No subscription required
- [x] Kernel 6.5+ detected
- [x] systemd 254+ working
- [x] Large package count (500-1000+)
- [x] RPM release tag: 1.fc39

---

## Known Issues/Limitations

### Fedora 39 Specific
- **Rapid Updates:** Fedora updates frequently
  - Agent must handle frequent kernel updates

- **Short Support:** ~13 months support window
  - Plan for Fedora 40, 41 migration

- **SELinux:** Default enforcing
  - Usually same policy as RHEL

- **Wayland Default:** Fedora Workstation uses Wayland
  - Shouldn't affect headless agent

---

## Test Checklist

- [ ] Fresh Fedora 39 system
- [ ] Kernel 6.5+ verified
- [ ] systemd 254+ verified
- [ ] No subscription checks
- [ ] Large package inventory collected
- [ ] All core Linux tests passed

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Fedora Version:** _______________ (39)
**Kernel Version:** _______________
**Installer Version:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** Fedora 39 (x86_64)
