# Fresh Install Test Plan: Rocky Linux 8

## Platform Information

- **OS:** Rocky Linux 8
- **Architecture:** x86_64 (amd64)
- **Installer Type:** RPM
- **Service Type:** systemd unit
- **Package Manager:** dnf/yum
- **Test Duration:** ~30 minutes

---

## Key Differences from RHEL 8

Rocky Linux is a RHEL clone, nearly identical to RHEL 8. This test plan inherits all steps from `fresh-install-rhel-8.md` with these Rocky-specific differences:

### Rocky Linux vs RHEL

#### 1. No Subscription Required
- Rocky is free and open source
- Binary compatible with RHEL
- No subscription-manager

#### 2. Different Branding
- OS name: Rocky Linux
- Different logos, naming

#### 3. Same Package Base
- Uses same RPMs as RHEL (recompiled)
- Same repos structure
- Same SELinux policies

---

## Installation
```bash
# No subscription required
sudo dnf install -y /tmp/patchiq-agent.rpm

# RPM release tag
rpm -qip /tmp/patchiq-agent.rpm | grep Release
# Expected: Release: 1.el8 (same as RHEL 8)
```

---

## Rocky Linux Specific Tests

### Test 1: Verify OS Detection
```bash
# Check OS release
cat /etc/os-release
# NAME="Rocky Linux"
# VERSION="8.9 (Green Obsidian)"

# Check inventory detects Rocky correctly
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory")

OS_NAME=$(echo "$INVENTORY" | jq -r '.data.system.osName')
echo "Detected OS: $OS_NAME"
# Expected: "Rocky Linux" or "Rocky"
```

### Test 2: Verify No Subscription Checks
```bash
# subscription-manager should not be running
systemctl status subscription-manager 2>&1 | grep -q "could not be found" && echo "✓ No subscription required"

# Inventory should not include subscription info
echo "$INVENTORY" | jq '.data.system.subscription'
# Expected: null or not present
```

### Test 3: Verify Repository Configuration
```bash
# Check Rocky repos
dnf repolist

# Should show Rocky repos, not RHEL repos:
# - baseos
# - appstream
# - extras
```

---

## Expected Results

All RHEL 8 tests apply, except:

- [x] OS detected as "Rocky Linux"
- [x] No subscription required
- [x] Rocky repositories configured
- [x] Binary compatible with RHEL 8
- [x] All RHEL 8 functionality works

---

## Known Issues/Limitations

### Rocky Linux 8 Specific
- **RHEL Support:** Not officially supported by Red Hat
  - Community supported

- **Updates:** Slightly delayed vs RHEL
  - Usually within days of RHEL release

- **Branding:** Different from RHEL
  - Ensure agent detects correctly

---

## Test Checklist

- [ ] Fresh Rocky Linux 8 system
- [ ] OS detected as Rocky Linux
- [ ] No subscription requirements
- [ ] Rocky repositories working
- [ ] All RHEL 8 tests passed
- [ ] Binary compatibility verified

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Rocky Version:** _______________ (8.x)
**Installer Version:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** Rocky Linux 8 (x86_64)
