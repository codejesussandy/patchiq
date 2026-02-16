# Fresh Install Test Plan: macOS 14 Sonoma (Apple Silicon)

## Platform Information

- **OS:** macOS 14 Sonoma
- **Architecture:** arm64 (Apple Silicon M1/M2/M3)
- **Installer Type:** PKG
- **Service Type:** launchd daemon
- **Test Duration:** ~30 minutes

---

## Key Differences from macOS 12 Monterey

This test plan inherits all steps from `fresh-install-macos-12-silicon.md` with these macOS 14-specific differences:

### macOS 14 Sonoma Specific Features

#### 1. Enhanced Privacy Controls
```bash
# TCC (Transparency, Consent, and Control) database
# More restrictions on system access

# Verify agent has necessary permissions
sqlite3 /Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT service, client FROM access WHERE client LIKE '%patchiq%';"
```

#### 2. Platform SSO
- New enterprise authentication framework
- May affect agent registration if SSO is configured

#### 3. Widget System
- New widget architecture
- Ensure agent doesn't interfere with widgets

#### 4. Game Mode
- Automatic game mode detection
- Verify agent respects game mode (reduces background activity)

---

## Installation Steps

See **fresh-install-macos-12-silicon.md** for complete installation steps. All steps identical except:

### Additional Privacy Prompts (macOS 14)
- Expect more privacy dialogs during first run
- Grant all necessary permissions

---

## macOS 14 Specific Tests

### Test 1: Privacy Permissions
```bash
# Check what permissions agent has
tccutil list | grep -i patchiq

# Expected permissions:
# - Accessibility (if needed)
# - Full Disk Access (for inventory)
# - Network (automatic)
```

### Test 2: Background Activity
```bash
# Verify agent registers as background service
sfltool dumpbtm | grep -i patchiq

# Check background task management
launchctl print system/io.patchiq.agent
```

### Test 3: Notification Permissions
```bash
# If agent uses notifications
notifyutil -g com.apple.notificationcenter.patchiq
```

### Test 4: System Extensions (if applicable)
```bash
# List system extensions
systemextensionsctl list

# Note: Agent should NOT require system extension for v1.0
```

---

## M3 Chip Support (if applicable)

### Verify M3 Detection
```bash
# Get inventory
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory")

# Check CPU model
CPU_MODEL=$(echo "$INVENTORY" | jq -r '.data.hardware.cpu.model')
echo "CPU Model: $CPU_MODEL"

# Expected for M3: "Apple M3", "Apple M3 Pro", or "Apple M3 Max"

# Check CPU cores
P_CORES=$(echo "$INVENTORY" | jq -r '.data.hardware.cpu.performanceCores')
E_CORES=$(echo "$INVENTORY" | jq -r '.data.hardware.cpu.efficiencyCores')
echo "Performance cores: $P_CORES, Efficiency cores: $E_CORES"
```

---

## Expected Results

All results from `fresh-install-macos-12-silicon.md` apply, with these additions:

- [x] Agent requests necessary privacy permissions
- [x] Agent granted Full Disk Access
- [x] Agent works with Platform SSO (if configured)
- [x] Agent detects M3 chip correctly (if applicable)
- [x] Agent registers as background service
- [x] No interference with Game Mode

---

## Known Issues/Limitations

### macOS 14 Specific
- **Privacy Prompts:** More frequent than macOS 12/13
  - User must manually grant Full Disk Access

- **Platform SSO:** May require additional configuration
  - Document SSO integration status

- **Background Tasks:** New background task management
  - Ensure agent doesn't get throttled

- **Energy Impact:** macOS 14 monitors more closely
  - Activity Monitor shows "Energy Impact" score
  - Target: Low energy impact

---

## Test Checklist

- [ ] Fresh macOS 14 Sonoma system (Apple Silicon)
- [ ] Full Disk Access granted
- [ ] All privacy permissions granted
- [ ] Agent handles macOS 14 security features
- [ ] M3 chip detected correctly (if applicable)
- [ ] Energy impact is "Low"
- [ ] All standard macOS tests passed
- [ ] No interference with macOS 14 features

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Installer Version:** _______________
**Backend Version:** _______________
**Mac Model:** _______________ (M1/M2/M3)
**macOS Build:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

**Notes:**
```
(Add any observations, macOS 14-specific issues)
```

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** macOS 14 Sonoma (Apple Silicon)
