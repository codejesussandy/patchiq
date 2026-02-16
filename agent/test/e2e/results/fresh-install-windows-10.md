# Fresh Install Test Plan: Windows 10 Pro

**Platform:** Windows 10 Pro (21H2)
**Architecture:** amd64
**Test Date:** TBD
**Tester:** TBD
**Status:** Not Started

---

## Prerequisites

- [ ] Fresh Windows 10 Pro installation (21H2 or later)
- [ ] System updated to latest patches
- [ ] Administrator access
- [ ] Network connectivity to backend
- [ ] Backend URL: https://[BACKEND_URL]
- [ ] PatchIQ Agent MSI installer available

---

## System Specifications

| Component | Specification |
|-----------|--------------|
| OS Version | Windows 10 Pro 21H2 |
| Build Number | 19044 or later |
| Architecture | x86_64 (amd64) |
| RAM | 4 GB minimum |
| Disk Space | 50 GB minimum, 10 GB free |
| PowerShell | 5.1 or later |

---

## Installation Steps

### Step 1: Verify Prerequisites

**Commands:**
```powershell
# Check Windows version
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsBuildNumber

# Check available disk space
Get-PSDrive C | Select-Object Used, Free

# Check PowerShell version
$PSVersionTable.PSVersion

# Test network connectivity to backend
Test-NetConnection -ComputerName [BACKEND_HOSTNAME] -Port 443
```

**Expected Results:**
- Windows 10 Pro 21H2 (Build 19044+)
- At least 10 GB free disk space
- PowerShell 5.1+
- Backend reachable on port 443

**Actual Results:**
- [ ] Prerequisites met

---

### Step 2: Download Installer

**Location:** [MSI Download URL]

**Verification:**
```powershell
# Verify installer exists
Test-Path ".\PatchIQ-Agent-1.0.0.msi"

# Check file size (should be ~20 MB)
(Get-Item ".\PatchIQ-Agent-1.0.0.msi").Length / 1MB
```

**Expected Results:**
- File exists
- Size: ~20 MB

**Actual Results:**
- [ ] Installer downloaded and verified

---

### Step 3: Install Agent

**Command:**
```powershell
# Silent install
msiexec /i PatchIQ-Agent-1.0.0.msi /qn SERVERURL="https://[BACKEND_URL]/api"

# OR with logging
msiexec /i PatchIQ-Agent-1.0.0.msi /qn /l*v install.log SERVERURL="https://[BACKEND_URL]/api"
```

**Expected Results:**
- Installation completes successfully (exit code 0)
- No error dialogs
- Install log shows success

**Actual Results:**
- [ ] Installation completed
- **Exit Code:** ___
- **Notes:** ___

---

### Step 4: Verify Service Installation

**Commands:**
```powershell
# Check if service exists
Get-Service -Name "PatchIQAgent"

# Check service status
Get-Service -Name "PatchIQAgent" | Select-Object Name, Status, StartType

# Check service process
Get-Process -Name "patchiq-agent" -ErrorAction SilentlyContinue
```

**Expected Results:**
- Service exists
- Service is Running
- StartType is Automatic
- Process is running

**Actual Results:**
- [ ] Service installed
- [ ] Service running
- [ ] StartType is Automatic
- **Status:** ___

---

### Step 5: Verify File Installation

**Commands:**
```powershell
# Check installation directory
Test-Path "C:\Program Files\PatchIQ"
Get-ChildItem "C:\Program Files\PatchIQ"

# Check binary
Test-Path "C:\Program Files\PatchIQ\patchiq-agent.exe"

# Check configuration
Test-Path "C:\ProgramData\PatchIQ\agent.conf"

# Check logs directory
Test-Path "C:\ProgramData\PatchIQ\logs"
Get-ChildItem "C:\ProgramData\PatchIQ\logs"
```

**Expected Results:**
- Installation directory exists
- Binary exists (~20 MB)
- Configuration file exists
- Logs directory exists
- Agent log file created

**Actual Results:**
- [ ] Files installed correctly
- **Notes:** ___

---

### Step 6: Verify Configuration

**Commands:**
```powershell
# Read configuration
Get-Content "C:\ProgramData\PatchIQ\agent.conf"

# Verify server URL
Select-String -Path "C:\ProgramData\PatchIQ\agent.conf" -Pattern "server_url"
```

**Expected Results:**
- Configuration file is valid YAML
- server_url matches backend URL
- agent_id is generated (UUID format)

**Actual Results:**
- [ ] Configuration valid
- **Server URL:** ___
- **Agent ID:** ___

---

### Step 7: Verify Agent Registration

**Wait:** 30 seconds for agent to register

**Commands:**
```powershell
# Check backend for agent (requires curl or Invoke-RestMethod)
$hostname = $env:COMPUTERNAME
$backend = "https://[BACKEND_URL]/api/v1/agents"

Invoke-RestMethod -Uri $backend | Select-Object -ExpandProperty data | Where-Object { $_.hostname -eq $hostname }
```

**Expected Results:**
- Agent appears in backend
- Hostname matches
- Status is "online"
- First heartbeat timestamp exists

**Actual Results:**
- [ ] Agent registered
- **Agent ID:** ___
- **Status:** ___

---

### Step 8: Verify Heartbeat

**Wait:** 60 seconds for heartbeat to update

**Commands:**
```powershell
# Get agent details from backend
$agentId = "[AGENT_ID from Step 7]"
$agent = Invoke-RestMethod -Uri "https://[BACKEND_URL]/api/v1/agents/$agentId"

# Check heartbeat timestamp
$agent.data.lastHeartbeat
```

**Expected Results:**
- lastHeartbeat timestamp is recent (< 60 seconds ago)
- Heartbeat updates after waiting

**Actual Results:**
- [ ] Heartbeat working
- **Last Heartbeat:** ___

---

### Step 9: Trigger Inventory Collection

**Commands:**
```powershell
# Trigger inventory via backend API
$agentId = "[AGENT_ID]"
Invoke-RestMethod -Method POST -Uri "https://[BACKEND_URL]/api/v1/agents/$agentId/collect"
```

**Wait:** 90 seconds for inventory collection

**Commands:**
```powershell
# Check if inventory submitted
$agent = Invoke-RestMethod -Uri "https://[BACKEND_URL]/api/v1/agents/$agentId"
$agent.data.lastInventory
```

**Expected Results:**
- Inventory collection triggered successfully
- lastInventory timestamp updated
- Inventory includes hardware, software, OS info

**Actual Results:**
- [ ] Inventory collected
- **Last Inventory:** ___

---

### Step 10: Verify Agent WebUI

**Commands:**
```powershell
# Test local WebUI
Invoke-WebRequest -Uri "http://localhost:4504"
```

**Expected Results:**
- WebUI is accessible
- Returns HTTP 200
- Shows agent dashboard

**Actual Results:**
- [ ] WebUI accessible
- **HTTP Status:** ___

---

### Step 11: Test Service Auto-Start

**Commands:**
```powershell
# Restart computer
Restart-Computer -Force

# After reboot, check service
Get-Service -Name "PatchIQAgent" | Select-Object Name, Status
```

**Expected Results:**
- Service starts automatically after reboot
- Agent re-registers with backend

**Actual Results:**
- [ ] Service auto-starts
- [ ] Agent reconnects

---

## Known Issues

### Issue 1: [Title]
- **Description:** ___
- **Severity:** Critical / High / Medium / Low
- **Workaround:** ___
- **Status:** Open / Fixed

---

## Test Summary

| Step | Result | Notes |
|------|--------|-------|
| 1. Prerequisites | Pass / Fail | |
| 2. Download Installer | Pass / Fail | |
| 3. Install Agent | Pass / Fail | |
| 4. Verify Service | Pass / Fail | |
| 5. Verify Files | Pass / Fail | |
| 6. Verify Config | Pass / Fail | |
| 7. Agent Registration | Pass / Fail | |
| 8. Heartbeat | Pass / Fail | |
| 9. Inventory Collection | Pass / Fail | |
| 10. WebUI | Pass / Fail | |
| 11. Auto-Start | Pass / Fail | |

**Overall Result:** Pass / Fail / Incomplete

---

## Uninstall Test

**Commands:**
```powershell
# Uninstall via MSI
msiexec /x PatchIQ-Agent-1.0.0.msi /qn

# OR use Add/Remove Programs
Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*PatchIQ*" } | ForEach-Object { $_.Uninstall() }
```

**Verification:**
```powershell
# Verify service removed
Get-Service -Name "PatchIQAgent" -ErrorAction SilentlyContinue

# Verify files removed
Test-Path "C:\Program Files\PatchIQ"
```

**Expected Results:**
- Service removed
- Program Files directory removed
- Configuration and logs optionally removed (based on installer settings)

**Actual Results:**
- [ ] Uninstall successful
- **Notes:** ___

---

## Sign-Off

**Tester:** _______________
**Date:** _______________
**Signature:** _______________

**Approved By:** _______________
**Date:** _______________
