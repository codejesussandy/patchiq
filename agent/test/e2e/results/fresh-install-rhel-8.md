# Fresh Install Test Plan: RHEL 8

## Platform Information

- **OS:** Red Hat Enterprise Linux 8
- **Architecture:** x86_64 (amd64)
- **Installer Type:** RPM
- **Service Type:** systemd unit
- **Package Manager:** yum/dnf
- **Test Duration:** ~30 minutes

---

## Pre-requisites

### System Requirements
- RHEL 8.x (minimum 8.0, tested on 8.9)
- 2 GB RAM minimum
- 1 GB free disk space
- root or sudo privileges
- Internet connectivity
- Active RHEL subscription

### RHEL Subscription
```bash
# Verify RHEL subscription status
sudo subscription-manager status

# Expected: Status: Current
# If not subscribed, register:
# sudo subscription-manager register --username YOUR_USERNAME
# sudo subscription-manager attach --auto
```

### Test Environment Setup
```bash
# 1. Ensure RHEL is fully updated
sudo dnf update -y

# 2. Verify no previous installation
rpm -qa | grep patchiq
# Should return nothing

# 3. Verify SELinux status
getenforce
# Expected: Enforcing (test with SELinux enabled)

# 4. Check firewalld status
sudo systemctl status firewalld
```

### Backend Setup
- PatchIQ backend running and accessible
- Test API endpoint: `https://test-hub.patchiq.io/api`
- Valid API credentials configured

---

## Installation Steps

### Step 1: Download RPM Package
```bash
# Download RPM installer
INSTALLER_URL="https://releases.patchiq.io/agent/patchiq-agent-1.0.0-linux-amd64.rpm"
INSTALLER_PATH="/tmp/patchiq-agent.rpm"

curl -L -o "$INSTALLER_PATH" "$INSTALLER_URL"

# Verify download
if [ -f "$INSTALLER_PATH" ]; then
    echo "✓ Installer downloaded: $INSTALLER_PATH"
    ls -lh "$INSTALLER_PATH"
    file "$INSTALLER_PATH"
else
    echo "✗ Failed to download installer"
    exit 1
fi
```

**Expected Result:**
- RPM file downloaded (40-60 MB)
- File type: RPM package

### Step 2: Verify RPM Package
```bash
# Check RPM package info
rpm -qip "$INSTALLER_PATH"

# Expected output:
# Name        : patchiq-agent
# Version     : 1.0.0
# Release     : 1.el8
# Architecture: x86_64
# ...

# Verify GPG signature (if signed)
rpm -K "$INSTALLER_PATH"
```

**Expected Result:**
- Package name: patchiq-agent
- Version: 1.0.0
- Architecture: x86_64

### Step 3: Install RPM Package
```bash
# Install with yum/dnf
sudo dnf install -y "$INSTALLER_PATH"

# OR use rpm directly
# sudo rpm -ivh "$INSTALLER_PATH"

# Check exit code
if [ $? -eq 0 ]; then
    echo "✓ Installation completed successfully"
else
    echo "✗ Installation failed with exit code $?"
    exit 1
fi
```

**Expected Result:**
- Installation completes without errors
- Dependencies auto-resolved (if any)

### Step 4: Verify Installation Files
```bash
# List installed files
rpm -ql patchiq-agent

# Expected files:
# /usr/bin/patchiq-agent
# /etc/patchiq/agent.yaml
# /usr/lib/systemd/system/patchiq-agent.service
# /var/lib/patchiq/agent/
# /var/log/patchiq/

# Check binary
ls -lh /usr/bin/patchiq-agent
file /usr/bin/patchiq-agent
# Expected: ELF 64-bit LSB executable, x86-64

# Check config
ls -lh /etc/patchiq/agent.yaml
cat /etc/patchiq/agent.yaml
```

**Expected Result:**
- Binary: `/usr/bin/patchiq-agent` (755, root:root)
- Config: `/etc/patchiq/agent.yaml` (644, root:root)
- Service: `/usr/lib/systemd/system/patchiq-agent.service`
- Data dir: `/var/lib/patchiq/agent/` (700, root:root)
- Log dir: `/var/log/patchiq/` (755, root:root)

### Step 5: Configure Server URL
```bash
# Update config with backend URL
sudo vi /etc/patchiq/agent.yaml

# Or using sed:
SERVER_URL="https://test-hub.patchiq.io/api"
sudo sed -i "s|server_url:.*|server_url: ${SERVER_URL}|" /etc/patchiq/agent.yaml

# Verify
grep server_url /etc/patchiq/agent.yaml
```

**Expected Result:**
- Config updated with correct backend URL

### Step 6: Enable and Start Service
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (auto-start on boot)
sudo systemctl enable patchiq-agent.service

# Start service
sudo systemctl start patchiq-agent.service

# Check status
sudo systemctl status patchiq-agent.service

# Expected:
# ● patchiq-agent.service - PatchIQ Agent
#    Loaded: loaded (/usr/lib/systemd/system/patchiq-agent.service; enabled; vendor preset: disabled)
#    Active: active (running) since ...
```

**Expected Result:**
- Service enabled
- Service started
- Status: active (running)

---

## Verification Steps

### Step 7: Verify Service Running
```bash
# Check service status
sudo systemctl is-active patchiq-agent.service
# Expected: active

# Check process
ps aux | grep patchiq-agent
# Expected: Running as root

# Check listening ports (if any)
sudo ss -tlnp | grep patchiq
```

**Expected Result:**
- Service active
- Process running as root
- No errors in status

### Step 8: Check SELinux Context
```bash
# Verify SELinux is not blocking agent
# Check binary context
ls -Z /usr/bin/patchiq-agent

# Check config context
ls -Z /etc/patchiq/agent.yaml

# Check for SELinux denials
sudo ausearch -m avc -ts recent | grep patchiq

# If denials found, may need to create SELinux policy
```

**Expected Result:**
- Appropriate SELinux contexts
- No AVC denials
- Agent runs successfully with SELinux enforcing

### Step 9: Check Logs
```bash
# View journal logs
sudo journalctl -u patchiq-agent.service -n 50 --no-pager

# View agent log file
sudo tail -50 /var/log/patchiq/agent.log

# Look for key messages
sudo grep -E "starting|registered|heartbeat" /var/log/patchiq/agent.log
```

**Expected Result:**
- Logs show agent starting
- Logs show configuration loaded
- Logs show registration attempt
- No critical errors

### Step 10: Verify Registration
```bash
# Wait for registration
sleep 30

# Check backend
API_URL="https://test-hub.patchiq.io/api/v1/agents"
TOKEN="YOUR_TEST_TOKEN"
HOSTNAME=$(hostname)

RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL")
AGENT_ID=$(echo "$RESPONSE" | jq -r ".data[] | select(.hostname == \"$HOSTNAME\") | .id")

if [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ]; then
    echo "✓ Agent registered (ID: $AGENT_ID)"
    echo "$RESPONSE" | jq ".data[] | select(.id == \"$AGENT_ID\")"
else
    echo "✗ Agent not found in backend"
    exit 1
fi
```

**Expected Result:**
- Agent registered within 60 seconds
- Platform: RHEL 8
- OS Version detected correctly
- Architecture: x86_64

### Step 11: Verify Heartbeat
```bash
# Check last heartbeat
sleep 60
AGENT_URL="https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID"
AGENT_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$AGENT_URL")

LAST_HEARTBEAT=$(echo "$AGENT_DETAILS" | jq -r '.data.lastHeartbeat')
echo "Last heartbeat: $LAST_HEARTBEAT"

# Check agent is online
STATUS=$(echo "$AGENT_DETAILS" | jq -r '.data.status')
if [ "$STATUS" = "online" ]; then
    echo "✓ Agent online, heartbeat working"
else
    echo "✗ Agent status: $STATUS"
fi
```

**Expected Result:**
- Heartbeat within last 60 seconds
- Agent status: online

### Step 12: Trigger Inventory Collection
```bash
# Trigger inventory
COLLECT_URL="https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/collect"
curl -s -X POST -H "Authorization: Bearer $TOKEN" "$COLLECT_URL"

echo "Waiting 90 seconds for inventory..."
sleep 90

# Check inventory submitted
INVENTORY_URL="https://test-hub.patchiq.io/api/v1/agents/$AGENT_ID/inventory"
INVENTORY=$(curl -s -H "Authorization: Bearer $TOKEN" "$INVENTORY_URL")

# Check hardware
echo "$INVENTORY" | jq '.data.hardware'

# Check software count
SOFTWARE_COUNT=$(echo "$INVENTORY" | jq '.data.software | length')
echo "Software packages detected: $SOFTWARE_COUNT"
# Expected: 200+ packages typical on RHEL 8
```

**Expected Result:**
- Inventory collection completes
- Hardware data present
- Software packages detected (yum/dnf packages)
- Network interfaces detected

### Step 13: Test Service Restart
```bash
# Restart service
sudo systemctl restart patchiq-agent.service

# Check status
sudo systemctl status patchiq-agent.service

# Wait and verify heartbeat resumes
sleep 30
AGENT_DETAILS=$(curl -s -H "Authorization: Bearer $TOKEN" "$AGENT_URL")
STATUS=$(echo "$AGENT_DETAILS" | jq -r '.data.status')

if [ "$STATUS" = "online" ]; then
    echo "✓ Service restarted, heartbeat resumed"
else
    echo "✗ Service restart issue"
fi
```

**Expected Result:**
- Service restarts cleanly
- Heartbeat resumes quickly

### Step 14: Test Firewall Configuration
```bash
# Check if firewall is blocking (shouldn't be for outbound)
sudo firewall-cmd --list-all

# Test connectivity to backend
curl -v https://test-hub.patchiq.io/api/health

# Agent uses outbound HTTPS only, no inbound ports needed
```

**Expected Result:**
- Outbound HTTPS allowed
- No firewall issues

---

## RHEL-Specific Tests

### Test 15: Verify Yum/DNF Package Detection
```bash
# Check that inventory includes yum packages
echo "$INVENTORY" | jq '.data.software[] | select(.source == "yum") | .name' | head -20

# Should include RHEL-specific packages like:
# - redhat-release
# - subscription-manager
# - selinux-policy
```

### Test 16: Verify SELinux Policy
```bash
# Generate SELinux policy if needed
# (Only if denials found in step 8)

# Example policy creation:
# sudo ausearch -m avc -ts recent | audit2allow -M patchiq-agent
# sudo semodule -i patchiq-agent.pp
```

### Test 17: Verify Subscription Info
```bash
# Check if inventory includes subscription info
echo "$INVENTORY" | jq '.data.system.subscription'

# Expected fields:
# - subscriptionStatus
# - subscriptionId
# - supportLevel
```

---

## Expected Results Summary

- [x] RPM installs successfully
- [x] Service enabled and started
- [x] SELinux enforcing, no denials
- [x] Agent registered
- [x] Heartbeat working
- [x] Inventory collected (200+ packages)
- [x] Service survives restart
- [x] RHEL subscription info collected

---

## Known Issues/Limitations

### RHEL 8 Specific
- **SELinux:** May require custom policy on first run
  - Solution: Create policy from audit2allow

- **Subscription Required:** RHEL requires active subscription
  - Some repos unavailable without subscription

- **Firewalld:** Usually allows outbound HTTPS
  - Corporate firewalls may block

- **YUM vs DNF:** RHEL 8 uses dnf backend
  - Both commands work, dnf preferred

---

## Troubleshooting

### Service Fails to Start
```bash
# Check journal
sudo journalctl -u patchiq-agent.service -xe

# Check SELinux
sudo ausearch -m avc -ts recent

# Check permissions
ls -lZ /usr/bin/patchiq-agent
```

### Registration Fails
```bash
# Test backend connectivity
curl -v https://test-hub.patchiq.io/api/health

# Check config
cat /etc/patchiq/agent.yaml

# Check logs
sudo tail -100 /var/log/patchiq/agent.log
```

---

## Test Checklist

- [ ] RHEL 8 system with active subscription
- [ ] RPM installation successful
- [ ] Service enabled and running
- [ ] SELinux enforcing, no denials
- [ ] Agent registered with backend
- [ ] Heartbeat working
- [ ] Inventory collected
- [ ] YUM packages detected
- [ ] Subscription info collected
- [ ] Service restart tested
- [ ] Test results documented

---

## Test Results

**Date:** _______________
**Tester:** _______________
**RHEL Version:** _______________ (8.x)
**Installer Version:** _______________
**Backend Version:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

**Notes:**
```
(Add observations, SELinux issues, subscription status)
```

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** RHEL 8 (x86_64)
