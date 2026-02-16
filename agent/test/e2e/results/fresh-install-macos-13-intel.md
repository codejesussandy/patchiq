# Fresh Install Test Plan: macOS 13 Ventura (Intel)

## Platform Information

- **OS:** macOS 13 Ventura
- **Architecture:** amd64 (Intel x86_64)
- **Installer Type:** PKG
- **Service Type:** launchd daemon
- **Test Duration:** ~30 minutes

---

## Key Differences from macOS 12 Apple Silicon

This test plan inherits all steps from `fresh-install-macos-12-silicon.md` with these platform-specific differences:

### Binary Architecture
- **Expected:** x86_64 (Intel 64-bit), NOT arm64
- **Verification:**
  ```bash
  file "/Library/Application Support/PatchIQ/Agent/patchiq-agent"
  # Expected: Mach-O 64-bit executable x86_64
  ```

### Homebrew Location
- **Location:** `/usr/local/bin/brew` (Intel) vs `/opt/homebrew/bin/brew` (Apple Silicon)
- **Verification:**
  ```bash
  which brew
  # Expected: /usr/local/bin/brew
  ```

### CPU Detection
- **Expected CPU Model:** Intel Core i5/i7/i9
- **Verification:**
  ```bash
  sysctl -n machdep.cpu.brand_string
  # Expected: "Intel(R) Core(TM) i5-xxxxx" or similar
  ```

### Performance Baselines
- **CPU Usage:** May be slightly higher than Apple Silicon
- **Memory Usage:** Similar to Apple Silicon
- **Battery Impact:** Higher on Intel (if laptop)

---

## Installation Steps

See **fresh-install-macos-12-silicon.md** for complete installation steps. Use the Intel-specific installer:

```bash
INSTALLER_URL="https://releases.patchiq.io/agent/patchiq-agent-1.0.0-macos-amd64.pkg"
```

---

## Intel-Specific Verification

### Verify x86_64 Binary
```bash
# Check binary architecture
file "/Library/Application Support/PatchIQ/Agent/patchiq-agent"
# Expected: Mach-O 64-bit executable x86_64

lipo -info "/Library/Application Support/PatchIQ/Agent/patchiq-agent"
# Expected: Non-fat file: x86_64
```

### Verify CPU Information
```bash
# Get inventory
INVENTORY_URL="https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory"
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" "$INVENTORY_URL")

# Check CPU info
echo "$INVENTORY" | jq '.data.hardware.cpu'
# Expected:
# {
#   "model": "Intel(R) Core(TM) i7-xxxx",
#   "architecture": "x86_64",
#   "cores": 4,
#   "threads": 8
# }
```

### Verify Homebrew Detection
```bash
# Check Homebrew location
HOMEBREW_PATH=$(echo "$INVENTORY" | jq -r '.data.software[] | select(.name == "Homebrew") | .installPath')
echo "Homebrew path: $HOMEBREW_PATH"
# Expected: /usr/local or /usr/local/bin
```

---

## Platform-Specific Considerations

### macOS 13 Ventura Features
- **System Settings:** Redesigned UI (vs System Preferences on macOS 12)
- **Privacy Controls:** More granular than macOS 12
- **Rapid Security Response:** New update mechanism (ensure agent handles)

### Intel Mac Considerations
- **Rosetta:** Not applicable (native x86_64)
- **Performance:** CPU may run hotter/louder than Apple Silicon
- **Power Usage:** Higher than Apple Silicon

---

## Expected Results

All results from `fresh-install-macos-12-silicon.md` apply, with these modifications:

- [x] Binary is x86_64 (not arm64)
- [x] CPU model shows Intel processor
- [x] Homebrew at `/usr/local` (if installed)
- [x] No Rosetta involvement
- [x] Architecture reported as "x86_64" or "amd64"

---

## Test Checklist

- [ ] Fresh macOS 13 Ventura system (Intel)
- [ ] Correct installer downloaded (amd64)
- [ ] Binary is x86_64 architecture
- [ ] CPU detected as Intel
- [ ] Homebrew detected at correct path
- [ ] All standard macOS tests passed (see base test plan)
- [ ] Performance baseline documented

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Installer Version:** _______________
**Backend Version:** _______________
**Mac Model:** _______________ (Intel)
**CPU:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

**Notes:**
```
(Add any observations, Intel-specific issues, or deviations from expected results)
```

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** macOS 13 Ventura (Intel x86_64)
