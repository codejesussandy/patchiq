# Fresh Install Test Plan: macOS 12 Monterey (Apple Silicon)

## Platform Information

- **OS:** macOS 12 Monterey
- **Architecture:** arm64 (Apple Silicon M1/M2)
- **Installer Type:** PKG
- **Service Type:** launchd daemon
- **Test Duration:** ~30 minutes

---

## Pre-requisites

### System Requirements
- macOS 12.0 or later
- Apple Silicon Mac (M1, M1 Pro, M1 Max, M1 Ultra, M2)
- 2 GB RAM minimum
- 1 GB free disk space
- Administrator privileges
- Internet connectivity

### Test Environment Setup
1. Provision fresh macOS 12 Monterey system (or VM if using UTM/Parallels)
2. Ensure macOS is fully updated
3. Verify no previous PatchIQ installation exists
4. Disable Gatekeeper temporarily (for unsigned testing)
   ```bash
   sudo spctl --master-disable
   ```
5. Grant Terminal Full Disk Access (System Preferences > Security & Privacy > Privacy > Full Disk Access)

### Backend Setup
- PatchIQ backend running and accessible
- Test API endpoint: `https://test-hub.patchiq.io/api`
- Valid API credentials configured
- Test organization created

---

## Installation Steps

### Step 1: Download Installer
```bash
# Download PKG installer
INSTALLER_URL="https://releases.patchiq.io/agent/patchiq-agent-1.0.0-macos-arm64.pkg"
INSTALLER_PATH="/tmp/patchiq-agent.pkg"

curl -L -o "$INSTALLER_PATH" "$INSTALLER_URL"

# Verify download
if [ -f "$INSTALLER_PATH" ]; then
    echo "✓ Installer downloaded: $INSTALLER_PATH"
    ls -lh "$INSTALLER_PATH"
else
    echo "✗ Failed to download installer"
    exit 1
fi
```

**Expected Result:**
- PKG file downloaded (40-60 MB)
- No errors in download

### Step 2: Verify Installer Signature (Optional)
```bash
# Check PKG signature
pkgutil --check-signature "$INSTALLER_PATH"

# Expected output:
# Package "patchiq-agent.pkg":
#    Status: signed by a developer certificate issued by Apple
#    Signed with a trusted timestamp on: [date]
#    Certificate Chain:
#     1. Developer ID Installer: PatchIQ Inc (TEAMID)
```

**Expected Result:**
- Status: signed (when code signing implemented)
- Certificate: Developer ID Installer
- No warnings about unsigned package

### Step 3: Install via PKG
```bash
# Install with custom server URL
# Note: PKG cannot accept custom properties easily, so we'll configure post-install

# Silent install
sudo installer -pkg "$INSTALLER_PATH" -target / -verbose

# Check installer exit code
if [ $? -eq 0 ]; then
    echo "✓ Installation completed successfully"
else
    echo "✗ Installation failed with exit code $?"
    exit 1
fi

# Wait for installation to complete
sleep 5
```

**Expected Result:**
- Installer exits with code 0
- No error messages during installation
- Installation completes in < 20 seconds

### Step 4: Configure Server URL (Post-Install)
```bash
# Update config file with test backend URL
CONFIG_FILE="/Library/Application Support/PatchIQ/Agent/config.yaml"
SERVER_URL="https://test-hub.patchiq.io/api"

if [ -f "$CONFIG_FILE" ]; then
    # Backup original
    sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"

    # Update server URL (using sed or direct edit)
    sudo sed -i '' "s|server_url:.*|server_url: ${SERVER_URL}|" "$CONFIG_FILE"

    echo "✓ Server URL configured: $SERVER_URL"
    echo "Config file:"
    cat "$CONFIG_FILE"
else
    echo "✗ Config file not found"
    exit 1
fi
```

**Expected Result:**
- Config file exists
- Server URL updated
- Config file readable

### Step 5: Verify Installation Files
```bash
# Check installation directory
INSTALL_DIR="/Library/Application Support/PatchIQ/Agent"

if [ -d "$INSTALL_DIR" ]; then
    echo "✓ Installation directory exists: $INSTALL_DIR"
    find "$INSTALL_DIR" -type f -ls
else
    echo "✗ Installation directory not found"
    exit 1
fi

# Check for required files
REQUIRED_FILES=(
    "/Library/Application Support/PatchIQ/Agent/patchiq-agent"
    "/Library/Application Support/PatchIQ/Agent/config.yaml"
    "/Library/Application Support/PatchIQ/Agent/VERSION"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ Found: $file"
    else
        echo "✗ Missing: $file"
        exit 1
    fi
done

# Check binary architecture
file "/Library/Application Support/PatchIQ/Agent/patchiq-agent"
# Expected: Mach-O 64-bit executable arm64
```

**Expected Result:**
- Installation directory: `/Library/Application Support/PatchIQ/Agent`
- All required files present
- Binary architecture: arm64
- Binary is executable (755 permissions)

### Step 6: Verify LaunchDaemon Installation
```bash
# Check launchd plist
PLIST="/Library/LaunchDaemons/io.patchiq.agent.plist"

if [ -f "$PLIST" ]; then
    echo "✓ LaunchDaemon plist exists"
    cat "$PLIST"
else
    echo "✗ LaunchDaemon plist not found"
    exit 1
fi

# Verify plist is valid
plutil -lint "$PLIST"

# Check ownership and permissions
ls -l "$PLIST"
# Expected: -rw-r--r-- root wheel
```

**Expected Result:**
- LaunchDaemon plist: `/Library/LaunchDaemons/io.patchiq.agent.plist`
- Plist is valid XML
- Owned by root:wheel
- Permissions: 644

### Step 7: Load LaunchDaemon
```bash
# Load the daemon
sudo launchctl load "$PLIST"

# Verify it's loaded
sudo launchctl list | grep io.patchiq.agent

if [ $? -eq 0 ]; then
    echo "✓ LaunchDaemon loaded"
else
    echo "✗ LaunchDaemon not loaded"
    exit 1
fi

# Wait for service to start
sleep 10
```

**Expected Result:**
- LaunchDaemon loads without errors
- Agent process starts
- No error messages in system log

### Step 8: Verify Agent Process
```bash
# Check if agent process is running
AGENT_PID=$(pgrep -f "patchiq-agent")

if [ -n "$AGENT_PID" ]; then
    echo "✓ Agent process running (PID: $AGENT_PID)"
    ps -p "$AGENT_PID" -o pid,ppid,user,command
else
    echo "✗ Agent process not running"
    # Check system log for errors
    log show --predicate 'process == "patchiq-agent"' --last 5m --style compact
    exit 1
fi

# Check process CPU/memory
top -l 1 -pid "$AGENT_PID" | grep patchiq-agent
```

**Expected Result:**
- Agent process running
- Process owned by root
- CPU usage < 5% (idle)
- Memory usage < 50 MB (idle)

---

## Verification Steps

### Step 9: Check Agent Logs
```bash
# Check log file
LOG_FILE="/Library/Logs/PatchIQ/agent.log"

if [ -f "$LOG_FILE" ]; then
    echo "✓ Log file exists: $LOG_FILE"
    tail -50 "$LOG_FILE"
else
    echo "✗ Log file not found"
    # Check alternate location
    LOG_FILE="/var/log/patchiq/agent.log"
    if [ -f "$LOG_FILE" ]; then
        echo "Found at alternate location: $LOG_FILE"
    fi
fi

# Look for key log messages
grep -i "agent starting" "$LOG_FILE" && echo "✓ Agent started"
grep -i "configuration loaded" "$LOG_FILE" && echo "✓ Config loaded"
grep -i "registering with backend" "$LOG_FILE" && echo "✓ Registration attempted"
grep -i "heartbeat started" "$LOG_FILE" && echo "✓ Heartbeat started"

# Check for errors
ERROR_COUNT=$(grep -i "error" "$LOG_FILE" | wc -l)
echo "Error messages in log: $ERROR_COUNT"
```

**Expected Result:**
- Log file exists
- Contains startup messages
- Contains registration attempt
- Minimal ERROR messages (excluding expected errors)

### Step 10: Verify Agent Registration
```bash
# Wait for agent to register
echo "Waiting 30 seconds for agent registration..."
sleep 30

# Check backend for registered agent
API_URL="https://test-hub.patchiq.io/api/v1/agents"
TOKEN="YOUR_TEST_TOKEN"
HOSTNAME=$(hostname)

RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL")

AGENT_ID=$(echo "$RESPONSE" | jq -r ".data[] | select(.hostname == \"$HOSTNAME\") | .id")

if [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ]; then
    echo "✓ Agent registered successfully (ID: $AGENT_ID)"
    echo "$RESPONSE" | jq ".data[] | select(.id == \"$AGENT_ID\")"
else
    echo "✗ Agent not found in backend"
    echo "Response: $RESPONSE"
    exit 1
fi
```

**Expected Result:**
- Agent appears in backend within 60 seconds
- Agent status: Online
- Hostname matches
- Platform: macOS
- OS Version: macOS 12.x
- Architecture: arm64

### Step 11: Verify Heartbeat
```bash
# Check agent last heartbeat
AGENT_URL="https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID"

echo "Waiting 60 seconds for heartbeat..."
sleep 60

AGENT_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$AGENT_URL")
LAST_HEARTBEAT=$(echo "$AGENT_DETAILS" | jq -r '.data.lastHeartbeat')

# Calculate heartbeat age
NOW=$(date -u +%s)
HB_TIME=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${LAST_HEARTBEAT%.*}" +%s 2>/dev/null || echo 0)
HB_AGE=$((NOW - HB_TIME))

if [ $HB_AGE -lt 120 ]; then
    echo "✓ Heartbeat working (last seen $HB_AGE seconds ago)"
else
    echo "✗ Heartbeat not working (last seen $HB_AGE seconds ago)"
    exit 1
fi
```

**Expected Result:**
- Last heartbeat within 60 seconds
- Heartbeat interval: ~60 seconds
- Agent status: Online

### Step 12: Trigger Inventory Collection
```bash
# Trigger manual inventory collection
COLLECT_URL="https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/collect"

RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" "$COLLECT_URL")

if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✓ Inventory collection triggered"
else
    echo "✗ Failed to trigger inventory"
    echo "Response: $RESPONSE"
fi

# Wait for inventory to complete
echo "Waiting 90 seconds for inventory collection..."
sleep 90
```

**Expected Result:**
- Inventory collection command accepted
- Agent receives command
- Inventory collection completes

### Step 13: Verify Inventory Submission
```bash
# Check if inventory was submitted
AGENT_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$AGENT_URL")
LAST_INVENTORY=$(echo "$AGENT_DETAILS" | jq -r '.data.lastInventory')

if [ "$LAST_INVENTORY" != "null" ] && [ -n "$LAST_INVENTORY" ]; then
    echo "✓ Inventory submitted successfully"
    echo "Last inventory: $LAST_INVENTORY"

    # Get inventory details
    INVENTORY_URL="https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory"
    INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" "$INVENTORY_URL")

    echo "Hardware data:"
    echo "$INVENTORY" | jq '.data.hardware'

    SOFTWARE_COUNT=$(echo "$INVENTORY" | jq '.data.software | length')
    echo "Software packages detected: $SOFTWARE_COUNT"

    # macOS typically has 100+ packages from Homebrew, system apps, etc.
else
    echo "✗ Inventory not submitted"
    exit 1
fi
```

**Expected Result:**
- `lastInventory` timestamp updated
- Inventory contains:
  - System info (macOS version, build, architecture)
  - Hardware (CPU model, memory, disk, Apple Silicon chip)
  - Installed software (Homebrew, system apps, Mac App Store)
  - Network interfaces
  - Security info (SIP status, FileVault status)

### Step 14: Test LaunchDaemon Restart
```bash
# Unload and reload daemon
echo "Testing daemon restart..."
sudo launchctl unload "$PLIST"
sleep 5
sudo launchctl load "$PLIST"
sleep 10

# Verify process running
AGENT_PID=$(pgrep -f "patchiq-agent")
if [ -n "$AGENT_PID" ]; then
    echo "✓ Agent restarted successfully (PID: $AGENT_PID)"
else
    echo "✗ Agent failed to restart"
    exit 1
fi

# Verify heartbeat resumes
sleep 30
AGENT_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$AGENT_URL")
LAST_HEARTBEAT=$(echo "$AGENT_DETAILS" | jq -r '.data.lastHeartbeat')

if [ "$LAST_HEARTBEAT" != "null" ]; then
    echo "✓ Heartbeat resumed after restart"
else
    echo "✗ Heartbeat not resumed"
fi
```

**Expected Result:**
- Daemon unloads/loads cleanly
- Agent process restarts
- Heartbeat resumes within 60 seconds

### Step 15: Test System Reboot (Optional)
```bash
echo "Testing auto-start on reboot..."
echo "This will reboot the system. Continue? (y/n)"
read -r CONFIRM

if [ "$CONFIRM" = "y" ]; then
    sudo reboot
    # After reboot, re-run verification steps 8-11
fi
```

**Expected Result:**
- LaunchDaemon auto-loads on boot
- Agent connects to backend
- Heartbeat resumes

---

## Apple Silicon Specific Tests

### Test 16: Verify Rosetta 2 Not Required
```bash
# Ensure agent is native ARM64, not running via Rosetta
AGENT_PID=$(pgrep -f "patchiq-agent")

# Check process architecture
file "/proc/$AGENT_PID/exe" 2>/dev/null || \
    lsof -p "$AGENT_PID" | grep "patchiq-agent"

# Better method: check activity monitor or use sysctl
sysctl sysctl.proc_translated -p "$AGENT_PID" 2>/dev/null
# 0 = native ARM64, 1 = Rosetta 2

# Alternative: use arch command
arch -arch arm64 "/Library/Application Support/PatchIQ/Agent/patchiq-agent" --version
```

**Expected Result:**
- Agent is native ARM64 binary
- Not running via Rosetta 2
- sysctl.proc_translated returns 0

### Test 17: Test Apple Silicon Inventory Collection
```bash
# Verify chip information collected
INVENTORY_URL="https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory"
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" "$INVENTORY_URL")

# Check CPU info
CPU_MODEL=$(echo "$INVENTORY" | jq -r '.data.hardware.cpu.model')
echo "CPU Model: $CPU_MODEL"
# Expected: "Apple M1" or "Apple M2" or similar

# Check architecture
ARCH=$(echo "$INVENTORY" | jq -r '.data.hardware.cpu.architecture')
echo "Architecture: $ARCH"
# Expected: "arm64"

# Check macOS version
OS_VERSION=$(echo "$INVENTORY" | jq -r '.data.system.osVersion')
echo "OS Version: $OS_VERSION"
# Expected: "12.x.x"
```

**Expected Result:**
- CPU model shows Apple Silicon chip (M1/M2)
- Architecture: arm64
- macOS version correct

---

## Expected Results Summary

### Installation
- [x] PKG installs without errors
- [x] Installation completes in < 20 seconds
- [x] All files created in correct locations
- [x] LaunchDaemon installed and loaded

### Service
- [x] LaunchDaemon auto-starts
- [x] Agent process runs as root
- [x] LaunchDaemon restarts cleanly
- [x] Service survives reboot

### Registration
- [x] Agent registers within 60 seconds
- [x] Hostname detected correctly
- [x] Platform detected as macOS
- [x] OS version detected correctly

### Heartbeat
- [x] Heartbeat starts automatically
- [x] Heartbeat interval ~60 seconds
- [x] Agent status shows Online

### Inventory
- [x] Inventory collection completes
- [x] Hardware data collected (including Apple Silicon info)
- [x] Software data collected (Homebrew, apps)
- [x] Network data collected
- [x] Security data collected (SIP, FileVault)

### Apple Silicon
- [x] Native ARM64 binary (not Rosetta)
- [x] CPU model shows Apple chip
- [x] Architecture detected as arm64

---

## Known Issues/Limitations

### macOS 12 Monterey Specific
- **Gatekeeper:** May block unsigned PKG
  - **Solution:** Code sign with Developer ID Installer certificate
  - **Workaround:** `sudo spctl --master-disable` (testing only)

- **Full Disk Access:** Required for complete inventory
  - **Solution:** Add agent to FDA in System Preferences manually
  - **Note:** Cannot be automated from installer

- **System Integrity Protection (SIP):** Limits access to some system files
  - **Note:** This is expected and secure

- **Rosetta 2:** Not required for ARM64 build
  - **Verify:** Agent is native ARM64

### Apple Silicon Specific
- **Homebrew Location:** `/opt/homebrew` on Apple Silicon vs `/usr/local` on Intel
  - **Note:** Ensure inventory collector checks both locations

- **Performance:** Should be better than Intel due to efficiency cores
  - **Benchmark:** Compare with Intel results

### General Limitations
- Requires administrator privileges for installation
- Requires internet connectivity to backend
- LaunchDaemon runs as root (necessary for system access)
- No support for proxy configuration yet

---

## Troubleshooting

### LaunchDaemon Fails to Load
1. Check plist syntax: `plutil -lint /Library/LaunchDaemons/io.patchiq.agent.plist`
2. Check system log: `log show --predicate 'subsystem == "com.apple.launchd"' --last 5m`
3. Verify permissions: `ls -l /Library/LaunchDaemons/io.patchiq.agent.plist`
4. Try loading manually: `sudo launchctl load -w /Library/LaunchDaemons/io.patchiq.agent.plist`

### Agent Process Crashes
1. Check crash logs: `~/Library/Logs/DiagnosticReports/patchiq-agent*`
2. Check for Rosetta issues: Ensure binary is ARM64
3. Verify dependencies: `otool -L "/Library/Application Support/PatchIQ/Agent/patchiq-agent"`
4. Review agent logs

### Agent Doesn't Register
1. Check backend URL in config
2. Test connectivity: `curl https://test-hub.patchiq.io/api/health`
3. Check firewall: System Preferences > Security & Privacy > Firewall
4. Review agent logs for errors

### Inventory Collection Fails
1. Grant Full Disk Access to agent
2. Check for SIP restrictions
3. Verify Homebrew detection: `which brew`
4. Review collector-specific logs

---

## Test Checklist

- [ ] Fresh macOS 12 Monterey system (Apple Silicon)
- [ ] Installer downloaded and verified
- [ ] PKG installation completed successfully
- [ ] All files present in installation directory
- [ ] LaunchDaemon loaded and running
- [ ] Agent process running (native ARM64)
- [ ] Agent registered with backend
- [ ] Heartbeat working (3+ successful heartbeats)
- [ ] Inventory collection completed
- [ ] Apple Silicon chip detected correctly
- [ ] LaunchDaemon restart tested
- [ ] System reboot tested (optional)
- [ ] Logs reviewed for errors
- [ ] Resource usage acceptable (CPU < 5%, Memory < 50 MB idle)
- [ ] Test results documented

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Installer Version:** _______________
**Backend Version:** _______________
**Mac Model:** _______________ (M1/M2)

**Overall Result:** [ ] PASS [ ] FAIL

**Notes:**
```
(Add any observations, issues, or deviations from expected results)
```

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** macOS 12 Monterey (Apple Silicon)
