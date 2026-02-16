# Fresh Install Test Plan: Windows Server 2022

## Platform Information

- **OS:** Windows Server 2022 Standard/Datacenter
- **Architecture:** amd64
- **Installer Type:** MSI
- **Service Type:** Windows Service
- **Test Duration:** ~30 minutes

---

## Pre-requisites

### System Requirements
- Windows Server 2022 (21H2 or later)
- 2 GB RAM minimum
- 1 GB free disk space
- Administrator privileges
- Internet connectivity

### Test Environment Setup
1. Provision fresh Windows Server 2022 VM
2. Ensure Windows is fully updated
3. Verify no previous PatchIQ installation exists
4. Open PowerShell as Administrator
5. Disable Windows Defender temporarily (for testing only)

### Backend Setup
- PatchIQ backend running and accessible
- Test API endpoint: `https://test-hub.patchiq.io/api`
- Valid API credentials configured
- Test organization created

---

## Installation Steps

### Step 1: Download Installer
```powershell
# Download MSI installer
$installerUrl = "https://releases.patchiq.io/agent/patchiq-agent-1.0.0-windows-amd64.msi"
$installerPath = "$env:TEMP\patchiq-agent.msi"
Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath

# Verify download
if (Test-Path $installerPath) {
    Write-Host "✓ Installer downloaded: $installerPath"
    Get-Item $installerPath | Select-Object Name, Length, LastWriteTime
} else {
    Write-Error "Failed to download installer"
    exit 1
}
```

**Expected Result:**
- MSI file downloaded (50-80 MB)
- No errors in download

### Step 2: Verify Installer Signature (Optional)
```powershell
# Check digital signature
Get-AuthenticodeSignature $installerPath | Select-Object Status, SignerCertificate

# Expected: Valid signature from PatchIQ Inc.
```

**Expected Result:**
- Status: Valid
- Signer: PatchIQ Inc. (when code signing implemented)

### Step 3: Install via MSI
```powershell
# Silent install with custom server URL
$serverUrl = "https://test-hub.patchiq.io/api"
$logPath = "$env:TEMP\patchiq-install.log"

msiexec /i $installerPath `
    /qn `
    SERVERURL="$serverUrl" `
    /l*v $logPath

# Wait for installation to complete
Start-Sleep -Seconds 20

# Check installation log
if (Test-Path $logPath) {
    Write-Host "Installation log:"
    Get-Content $logPath -Tail 20
}
```

**Expected Result:**
- MSI exits with code 0 (success)
- Installation log shows successful completion
- No error messages in Event Viewer

### Step 4: Verify Installation Files
```powershell
# Check installation directory
$installPath = "C:\Program Files\PatchIQ\Agent"
if (Test-Path $installPath) {
    Write-Host "✓ Installation directory exists"
    Get-ChildItem $installPath -Recurse | Select-Object FullName, Length
} else {
    Write-Error "Installation directory not found"
    exit 1
}

# Check for required files
$requiredFiles = @(
    "patchiq-agent.exe",
    "config.yaml",
    "VERSION"
)

foreach ($file in $requiredFiles) {
    $filePath = Join-Path $installPath $file
    if (Test-Path $filePath) {
        Write-Host "✓ Found: $file"
    } else {
        Write-Error "Missing: $file"
        exit 1
    }
}
```

**Expected Result:**
- Installation directory: `C:\Program Files\PatchIQ\Agent`
- All required files present
- Binary size: 30-50 MB
- Config file populated with server URL

### Step 5: Verify Service Installation
```powershell
# Check service exists
$service = Get-Service -Name "PatchIQAgent" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "✓ Service installed"
    $service | Select-Object Name, Status, StartType, DisplayName
} else {
    Write-Error "Service not installed"
    exit 1
}

# Check service configuration
$serviceConfig = Get-CimInstance -ClassName Win32_Service -Filter "Name='PatchIQAgent'"
$serviceConfig | Select-Object Name, PathName, StartMode, State, StartName
```

**Expected Result:**
- Service Name: PatchIQAgent
- Display Name: PatchIQ Agent
- Status: Running
- Start Type: Automatic
- Start Name: LocalSystem
- Executable path: `C:\Program Files\PatchIQ\Agent\patchiq-agent.exe --service`

### Step 6: Wait for Service to Start
```powershell
# Wait for service to be running
$maxWait = 30
$elapsed = 0
while ($elapsed -lt $maxWait) {
    $service = Get-Service -Name "PatchIQAgent"
    if ($service.Status -eq "Running") {
        Write-Host "✓ Service started after $elapsed seconds"
        break
    }
    Start-Sleep -Seconds 1
    $elapsed++
}

if ($service.Status -ne "Running") {
    Write-Error "Service failed to start within $maxWait seconds"
    # Check Windows Event Log for errors
    Get-EventLog -LogName Application -Source "PatchIQAgent" -Newest 10 -ErrorAction SilentlyContinue
    exit 1
}
```

**Expected Result:**
- Service starts within 10 seconds
- Status: Running
- No errors in Event Viewer

---

## Verification Steps

### Step 7: Check Agent Logs
```powershell
# Check log file
$logFile = "C:\ProgramData\PatchIQ\Agent\logs\agent.log"
if (Test-Path $logFile) {
    Write-Host "✓ Log file exists: $logFile"
    Get-Content $logFile -Tail 50
} else {
    Write-Error "Log file not found"
}

# Look for key log messages
$logContent = Get-Content $logFile -Raw
$expectedMessages = @(
    "Agent starting",
    "Configuration loaded",
    "Registering with backend",
    "Heartbeat started"
)

foreach ($msg in $expectedMessages) {
    if ($logContent -match $msg) {
        Write-Host "✓ Found log message: $msg"
    } else {
        Write-Warning "Missing log message: $msg"
    }
}
```

**Expected Result:**
- Log file exists at `C:\ProgramData\PatchIQ\Agent\logs\agent.log`
- Contains startup messages
- Contains registration attempt
- No ERROR level messages

### Step 8: Verify Agent Registration
```powershell
# Wait for agent to register (may take 30-60 seconds)
Start-Sleep -Seconds 30

# Check backend for registered agent
$apiUrl = "https://test-hub.patchiq.io/api/v1/agents"
$hostname = $env:COMPUTERNAME

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers @{
        "Authorization" = "Bearer YOUR_TEST_TOKEN"
    }

    $agent = $response.data | Where-Object { $_.hostname -eq $hostname }

    if ($agent) {
        Write-Host "✓ Agent registered successfully"
        $agent | ConvertTo-Json -Depth 3
    } else {
        Write-Error "Agent not found in backend"
        exit 1
    }
} catch {
    Write-Error "Failed to query backend: $_"
    exit 1
}
```

**Expected Result:**
- Agent appears in backend within 60 seconds
- Agent status: Online
- Hostname matches
- Platform: Windows
- OS Version: Windows Server 2022

### Step 9: Verify Heartbeat
```powershell
# Check agent last heartbeat
$agentId = $agent.id
$agentUrl = "https://test-hub.patchiq.io/api/v1/agents/$agentId"

# Wait 60 seconds and check again
Write-Host "Waiting 60 seconds for heartbeat..."
Start-Sleep -Seconds 60

$agentDetails = Invoke-RestMethod -Uri $agentUrl -Method Get -Headers @{
    "Authorization" = "Bearer YOUR_TEST_TOKEN"
}

$lastHeartbeat = [DateTime]::Parse($agentDetails.data.lastHeartbeat)
$now = [DateTime]::UtcNow
$heartbeatAge = ($now - $lastHeartbeat).TotalSeconds

if ($heartbeatAge -lt 120) {
    Write-Host "✓ Heartbeat working (last seen $heartbeatAge seconds ago)"
} else {
    Write-Error "Heartbeat not working (last seen $heartbeatAge seconds ago)"
    exit 1
}
```

**Expected Result:**
- Last heartbeat within 60 seconds
- Heartbeat interval: ~60 seconds
- Agent status: Online

### Step 10: Trigger Inventory Collection
```powershell
# Trigger manual inventory collection
$collectUrl = "https://test-hub.patchiq.io/api/v1/agents/$agentId/collect"

try {
    $response = Invoke-RestMethod -Uri $collectUrl -Method Post -Headers @{
        "Authorization" = "Bearer YOUR_TEST_TOKEN"
    }
    Write-Host "✓ Inventory collection triggered"
    $response | ConvertTo-Json
} catch {
    Write-Error "Failed to trigger inventory: $_"
}

# Wait for inventory to complete
Write-Host "Waiting 90 seconds for inventory collection..."
Start-Sleep -Seconds 90
```

**Expected Result:**
- Inventory collection command accepted
- Agent receives command via WebSocket/polling

### Step 11: Verify Inventory Submission
```powershell
# Check if inventory was submitted
$agentDetails = Invoke-RestMethod -Uri $agentUrl -Method Get -Headers @{
    "Authorization" = "Bearer YOUR_TEST_TOKEN"
}

if ($agentDetails.data.lastInventory) {
    Write-Host "✓ Inventory submitted successfully"
    Write-Host "Last inventory: $($agentDetails.data.lastInventory)"

    # Check inventory data
    $inventoryUrl = "https://test-hub.patchiq.io/api/v1/agents/$agentId/inventory"
    $inventory = Invoke-RestMethod -Uri $inventoryUrl -Method Get -Headers @{
        "Authorization" = "Bearer YOUR_TEST_TOKEN"
    }

    Write-Host "Hardware collectors:"
    $inventory.data.hardware | ConvertTo-Json -Depth 2

    Write-Host "Software collectors:"
    $inventory.data.software.Count + " packages detected"
} else {
    Write-Error "Inventory not submitted"
    exit 1
}
```

**Expected Result:**
- `lastInventory` timestamp updated
- Inventory contains:
  - System info (OS, version, architecture)
  - Hardware (CPU, memory, disk)
  - Installed software (50+ packages typical)
  - Network interfaces
  - Windows Update info

### Step 12: Test Service Restart
```powershell
# Restart service
Write-Host "Testing service restart..."
Restart-Service -Name "PatchIQAgent"

Start-Sleep -Seconds 10

# Verify service running
$service = Get-Service -Name "PatchIQAgent"
if ($service.Status -eq "Running") {
    Write-Host "✓ Service restarted successfully"
} else {
    Write-Error "Service failed to restart"
    exit 1
}

# Verify heartbeat resumes
Start-Sleep -Seconds 30
$agentDetails = Invoke-RestMethod -Uri $agentUrl -Method Get -Headers @{
    "Authorization" = "Bearer YOUR_TEST_TOKEN"
}

$lastHeartbeat = [DateTime]::Parse($agentDetails.data.lastHeartbeat)
$heartbeatAge = ([DateTime]::UtcNow - $lastHeartbeat).TotalSeconds

if ($heartbeatAge -lt 60) {
    Write-Host "✓ Heartbeat resumed after restart"
} else {
    Write-Error "Heartbeat not resumed"
}
```

**Expected Result:**
- Service restarts cleanly
- Heartbeat resumes within 60 seconds
- No data loss

### Step 13: Test System Reboot (Optional)
```powershell
Write-Host "Testing auto-start on reboot..."
Write-Host "This will reboot the system. Continue? (Y/N)"
$confirm = Read-Host

if ($confirm -eq "Y") {
    Restart-Computer -Force
    # After reboot, re-run verification steps 5-9
}
```

**Expected Result:**
- Service auto-starts after reboot
- Agent reconnects to backend
- Heartbeat resumes

---

## Expected Results Summary

### Installation
- [x] MSI installs without errors
- [x] Installation completes in < 30 seconds
- [x] All files created in correct locations
- [x] Service installed and configured

### Service
- [x] Service auto-starts
- [x] Service runs as LocalSystem
- [x] Service restarts cleanly
- [x] Service survives reboot

### Registration
- [x] Agent registers within 60 seconds
- [x] Hostname detected correctly
- [x] Platform detected as Windows
- [x] OS version detected correctly

### Heartbeat
- [x] Heartbeat starts automatically
- [x] Heartbeat interval ~60 seconds
- [x] Agent status shows Online

### Inventory
- [x] Inventory collection completes
- [x] Hardware data collected
- [x] Software data collected (50+ packages)
- [x] Network data collected

### Logs
- [x] Log file created
- [x] Logs contain startup messages
- [x] No ERROR level messages (except expected)
- [x] Log rotation working (if tested long-term)

---

## Known Issues/Limitations

### Windows Server 2022 Specific
- **Windows Firewall:** May block agent if not configured
  - **Solution:** MSI should create firewall rules automatically

- **Windows Defender:** May quarantine agent binary
  - **Solution:** Add exclusion or sign binary with valid certificate

- **TLS 1.2:** Must be enabled (default on Server 2022)
  - **Verification:** `Get-TlsSettings` shows TLS 1.2 enabled

- **PowerShell Execution Policy:** May prevent scripts
  - **Solution:** Agent uses compiled binary, not scripts

- **WSUS Configuration:** May conflict with Windows Update collector
  - **Note:** Document WSUS support status

### General Limitations
- Requires administrator privileges for installation
- Requires internet connectivity to backend
- Service runs as LocalSystem (high privileges)
- No support for proxy configuration yet (document if applicable)

---

## Troubleshooting

### Service Fails to Start
1. Check Event Viewer: Application log
2. Check agent log: `C:\ProgramData\PatchIQ\Agent\logs\agent.log`
3. Verify config file: `C:\Program Files\PatchIQ\Agent\config.yaml`
4. Test connectivity: `Test-NetConnection test-hub.patchiq.io -Port 443`

### Agent Doesn't Register
1. Check backend URL in config
2. Verify API is accessible
3. Check firewall rules
4. Review agent logs for errors

### Inventory Collection Fails
1. Check agent has necessary permissions
2. Verify WMI is working: `Get-CimInstance Win32_ComputerSystem`
3. Check for antivirus interference
4. Review collector-specific logs

### High CPU/Memory Usage
1. Check for stuck inventory collection
2. Review log file size (should rotate)
3. Check for deployment in progress
4. Verify no memory leaks in logs

---

## Test Checklist

- [ ] Fresh VM provisioned
- [ ] Installer downloaded and verified
- [ ] MSI installation completed successfully
- [ ] All files present in installation directory
- [ ] Service installed and running
- [ ] Agent registered with backend
- [ ] Heartbeat working (3+ successful heartbeats)
- [ ] Inventory collection completed
- [ ] Service restart tested
- [ ] System reboot tested (optional)
- [ ] Logs reviewed for errors
- [ ] Resource usage acceptable (CPU < 5%, Memory < 100 MB idle)
- [ ] Test results documented

---

## Test Results

**Date:** _______________
**Tester:** _______________
**Installer Version:** _______________
**Backend Version:** _______________

**Overall Result:** [ ] PASS [ ] FAIL

**Notes:**
```
(Add any observations, issues, or deviations from expected results)
```

---

**Test Status:** Ready for Execution
**Last Updated:** 2026-02-14
**Platform Coverage:** Windows Server 2022 (21H2+)
