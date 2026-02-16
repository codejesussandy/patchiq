# Windows Platform Setup Guide

This document provides Windows-specific setup instructions for the PatchIQ Agent.

## System Requirements

- **Operating System**: Windows 10 (21H2+), Windows 11, Windows Server 2016+
- **Architecture**: x86_64 (amd64) or ARM64
- **PowerShell**: 5.1 or later (PowerShell 7+ recommended for better performance)
- **Privileges**: Administrator rights required for installation
- **.NET Framework**: 4.7.2+ (usually pre-installed on Windows 10+)

## Firewall Configuration

The PatchIQ Agent requires network access for the following:

### Required Firewall Rules

#### 1. Agent Web UI (Inbound)
```powershell
New-NetFirewallRule -DisplayName "PatchIQ Agent Web UI" `
  -Direction Inbound `
  -LocalPort 4504 `
  -Protocol TCP `
  -Action Allow `
  -Profile Any `
  -Description "Allows access to PatchIQ Agent's local web interface"
```

**Purpose**: Allows local web browser access to `http://localhost:4504` for monitoring and configuration.

**Security Note**: By default, the agent's web UI binds to `localhost` only. To allow remote access:
```yaml
# config.yaml
webui:
  bind: "0.0.0.0:4504"  # WARNING: Exposes UI to network
  # Recommended: Use firewall to restrict by IP
```

If enabling remote access, restrict the firewall rule:
```powershell
New-NetFirewallRule -DisplayName "PatchIQ Agent Web UI (Restricted)" `
  -Direction Inbound `
  -LocalPort 4504 `
  -Protocol TCP `
  -Action Allow `
  -RemoteAddress 192.168.1.0/24 `  # Adjust to your network
  -Profile Private,Domain `
  -Description "PatchIQ Agent Web UI - restricted to local network"
```

#### 2. Backend Communication (Outbound)
```powershell
New-NetFirewallRule -DisplayName "PatchIQ Agent - Backend API" `
  -Direction Outbound `
  -RemotePort 3000 `
  -Protocol TCP `
  -Action Allow `
  -Profile Any `
  -Description "Allows agent to communicate with PatchIQ backend"
```

**Purpose**: Agent heartbeat, command polling, telemetry upload.

**Note**: Adjust `-RemotePort` and add `-RemoteAddress` if your backend runs on a different port or specific IP.

#### 3. Package Downloads (Outbound)
```powershell
New-NetFirewallRule -DisplayName "PatchIQ Agent - Package Downloads" `
  -Direction Outbound `
  -RemotePort 80,443,9000 `
  -Protocol TCP `
  -Action Allow `
  -Profile Any `
  -Description "Allows agent to download packages from Hub/MinIO"
```

**Purpose**: Download software packages, patches, and script bundles.
- Port 80/443: HTTP/HTTPS downloads
- Port 9000: MinIO S3 API (if using local Hub)

### Firewall Rule Management via PowerShell Helper

The agent includes a PowerShell helper module for managing firewall rules programmatically:

```go
import "github.com/patchify/agent/internal/executors"

ps := executors.NewPowerShellExecutor(false)

// Add firewall rule
err := ps.AddFirewallRule(ctx, "PatchIQ Agent Web UI", "", 4504, "TCP")

// Remove firewall rule
err := ps.RemoveFirewallRule(ctx, "PatchIQ Agent Web UI")
```

## Registry Configuration

The agent stores configuration in the Windows Registry for persistence across restarts.

### Registry Location
```
HKEY_LOCAL_MACHINE\SOFTWARE\PatchIQ\Agent
```

### Registry Keys

| Key Name          | Type   | Description                          | Default Value         |
|-------------------|--------|--------------------------------------|-----------------------|
| ServerURL         | String | Backend API URL                      | http://localhost:3000 |
| DataDir           | String | Agent data directory                 | %ProgramData%\PatchIQ\Agent |
| LogLevel          | String | Logging level                        | info                  |
| HeartbeatInterval | DWord  | Heartbeat interval (seconds)         | 30                    |
| WebUIPort         | DWord  | Web UI port                          | 4504                  |
| WebUIBind         | String | Web UI bind address                  | 127.0.0.1             |

### Reading Registry Values

```go
ps := executors.NewPowerShellExecutor(false)
value, err := ps.GetRegistryValue(ctx, `HKLM:\SOFTWARE\PatchIQ\Agent`, "ServerURL")
```

### Writing Registry Values

```go
ps := executors.NewPowerShellExecutor(false)
err := ps.SetRegistryValue(ctx,
    `HKLM:\SOFTWARE\PatchIQ\Agent`,
    "LogLevel",
    "debug",
    "String")
```

## Windows Service Installation

The agent runs as a Windows Service for automatic startup and background operation.

### Service Details
- **Service Name**: `PatchIQAgent`
- **Display Name**: `PatchIQ Agent`
- **Start Type**: Automatic
- **Account**: LocalSystem (or NetworkService)
- **Recovery**: Restart on failure (3 attempts)

### Manual Installation

If not using the MSI installer:

```powershell
# Install service
sc.exe create PatchIQAgent binPath= "C:\Program Files\PatchIQ\Agent\patchiq-agent.exe" start= auto DisplayName= "PatchIQ Agent"

# Set service description
sc.exe description PatchIQAgent "Manages patch and software deployments for PatchIQ"

# Configure recovery options
sc.exe failure PatchIQAgent reset= 86400 actions= restart/5000/restart/10000/restart/20000

# Start service
sc.exe start PatchIQAgent
```

### Service Control

```powershell
# Start
Start-Service PatchIQAgent

# Stop
Stop-Service PatchIQAgent

# Restart
Restart-Service PatchIQAgent

# Check status
Get-Service PatchIQAgent

# View service logs
Get-EventLog -LogName Application -Source "PatchIQAgent" -Newest 50
```

## PowerShell Execution Policy

The agent executes PowerShell scripts for various operations. Ensure the execution policy allows script execution:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy (if needed)
Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
```

**Note**: The agent uses `-ExecutionPolicy Bypass` when running scripts, so this is not strictly required, but recommended for manual testing.

## Package Manager Prerequisites

### Windows Package Manager (winget)
- **Included in**: Windows 11, Windows 10 (version 1809+) via Microsoft Store
- **Manual Install**: Install "App Installer" from Microsoft Store
- **Verify**: `winget --version`

### Chocolatey (Optional)
```powershell
# Install Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Verify
choco --version
```

### PSWindowsUpdate Module (for Windows Update integration)
```powershell
# Install module
Install-Module -Name PSWindowsUpdate -Force -AllowClobber

# Verify
Get-Module -ListAvailable PSWindowsUpdate
```

Or use the agent's built-in helper:
```go
ps := executors.NewPowerShellExecutor(false)
err := ps.InstallModule(ctx, "PSWindowsUpdate")
```

## Proxy Configuration

If your network requires a proxy:

### System-Wide Proxy
```powershell
# Set proxy for current user
netsh winhttp set proxy proxy-server="http://proxy.example.com:8080" bypass-list="localhost;127.0.0.1"

# View current proxy
netsh winhttp show proxy
```

### Agent-Specific Proxy

Edit `config.yaml`:
```yaml
proxy:
  url: "http://proxy.example.com:8080"
  username: "proxyuser"
  password: "proxypass"
  no_proxy: "localhost,127.0.0.1,.local"
```

Or set via registry:
```powershell
Set-ItemProperty -Path "HKLM:\SOFTWARE\PatchIQ\Agent" -Name "ProxyURL" -Value "http://proxy.example.com:8080"
```

## UAC (User Account Control) Considerations

The agent requires administrator privileges for most operations:

1. **Windows Service**: When running as a service with LocalSystem account, UAC prompts are automatically bypassed
2. **Interactive Mode**: If running manually, always use "Run as Administrator"
3. **Scheduled Tasks**: Configure tasks to run with highest privileges

### Checking Admin Status
```go
ps := executors.NewPowerShellExecutor(false)
isAdmin := ps.IsAdministrator(ctx)
if !isAdmin {
    log.Fatal("Agent requires administrator privileges")
}
```

## Troubleshooting

### Agent Won't Start
1. Check Windows Event Viewer → Application log for errors
2. Verify service account has correct permissions
3. Check firewall rules aren't blocking backend communication
4. Ensure registry configuration is valid

### Web UI Not Accessible
1. Verify agent is running: `Get-Service PatchIQAgent`
2. Check firewall rules for port 4504
3. Test locally: `curl http://localhost:4504/health`
4. Check `webui.bind` in config.yaml (should be `127.0.0.1` for localhost-only)

### Package Installation Failures
1. Verify package manager (winget/choco) is installed
2. Check agent has internet access for downloads
3. Review MSI log files in `%TEMP%\msi-install-*.log`
4. Ensure UAC/admin privileges are available

### PowerShell Errors
1. Check PowerShell version: `$PSVersionTable.PSVersion`
2. Verify execution policy: `Get-ExecutionPolicy`
3. Test PowerShell module availability: `Get-Module -ListAvailable`
4. Check for Windows Management Framework updates

### Network/Proxy Issues
1. Verify proxy configuration in config.yaml or registry
2. Test backend connectivity: `curl http://backend:3000/health`
3. Check Windows proxy settings: `netsh winhttp show proxy`
4. Review firewall logs for blocked connections

## Performance Tuning

### Reduce CPU Usage
```yaml
# config.yaml
telemetry:
  interval: 300  # Increase from 60 to 300 seconds
heartbeat:
  interval: 60   # Increase from 30 to 60 seconds
```

### Reduce Memory Usage
```yaml
download:
  max_speed_mbps: 10  # Limit download speed
  cache_size_mb: 100  # Reduce cache size
```

### Optimize Patch Scans
```yaml
patch:
  scan_schedule: "0 2 * * *"  # Run at 2 AM instead of every hour
```

## Security Best Practices

1. **Run as Service**: Always run as Windows Service with LocalSystem account
2. **Firewall Rules**: Restrict Web UI access to localhost or specific IPs
3. **Update Regularly**: Keep agent binary and Windows OS updated
4. **Audit Logs**: Monitor Windows Event Log for agent activities
5. **Network Segmentation**: Place agent in trusted network zone
6. **Encrypt Communication**: Use HTTPS for backend communication
7. **Registry Permissions**: Protect `HKLM:\SOFTWARE\PatchIQ` from unauthorized modification

## Uninstallation

### Via MSI Installer
```powershell
# Find product code
$app = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "*PatchIQ*" }

# Uninstall
msiexec /x $app.IdentifyingNumber /quiet /norestart
```

### Manual Cleanup
```powershell
# Stop and remove service
Stop-Service PatchIQAgent -Force
sc.exe delete PatchIQAgent

# Remove firewall rules
Remove-NetFirewallRule -DisplayName "PatchIQ*"

# Remove registry keys
Remove-Item -Path "HKLM:\SOFTWARE\PatchIQ" -Recurse -Force

# Remove program files
Remove-Item -Path "C:\Program Files\PatchIQ" -Recurse -Force

# Remove data directory
Remove-Item -Path "$env:ProgramData\PatchIQ" -Recurse -Force
```

## References

- [Windows Firewall with Advanced Security](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/)
- [Windows Services](https://learn.microsoft.com/en-us/dotnet/framework/windows-services/)
- [Windows Registry](https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry)
- [PowerShell Documentation](https://learn.microsoft.com/en-us/powershell/)
- [MSI Error Codes](https://learn.microsoft.com/en-us/windows/win32/msi/error-codes)
- [winget CLI](https://learn.microsoft.com/en-us/windows/package-manager/winget/)

---

**Document Version**: 1.0
**Last Updated**: 2026-02-14
**Platform**: Windows 10+, Windows Server 2016+
