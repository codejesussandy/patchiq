# Quick Reference: Windows Enhancements

## New Features at a Glance

### PowerShell Executor (NEW)
```go
import "github.com/patchify/agent/internal/executors"

ps := NewPowerShellExecutor(false) // false = PowerShell 5.x, true = PowerShell 7+

// Execute command
output, err := ps.ExecuteCommand(ctx, "Get-Service | Where-Object {$_.Status -eq 'Running'}")

// Check admin privileges
isAdmin := ps.IsAdministrator(ctx)

// Registry operations
value, _ := ps.GetRegistryValue(ctx, `HKLM:\SOFTWARE\PatchIQ\Agent`, "ServerURL")
ps.SetRegistryValue(ctx, `HKLM:\SOFTWARE\PatchIQ\Agent`, "LogLevel", "debug", "String")

// Firewall management
ps.AddFirewallRule(ctx, "PatchIQ Agent Web UI", "", 4504, "TCP")
ps.RemoveFirewallRule(ctx, "PatchIQ Agent Web UI")

// Module management
ps.CheckModuleAvailable(ctx, "PSWindowsUpdate")
ps.InstallModule(ctx, "PSWindowsUpdate")
```

### MSI Enhancements
- ✅ Silent mode: `/qn` (no UI at all)
- ✅ Verbose logging: `/l*v <tempfile>.log`
- ✅ Exit code mapping: 50+ error codes
- ✅ Reboot detection: Exit code 3010

**Example:**
```go
pkg := models.SoftwarePackage{
    Name:       "7-Zip",
    Source:     "msi",
    PackageURL: "https://example.com/7zip.msi",
    Arguments:  "INSTALLDIR=C:\\Custom\\Path",
}

result := executor.InstallSoftware(ctx, pkg)
if result.ExitCode == 3010 {
    log.Println("Installation successful, reboot required")
}
```

### EXE Silent Flag Auto-Detection
Tries these flags in order:
1. `/S` (NSIS)
2. `/silent` (InstallShield)
3. `/quiet` (Generic)
4. `/VERYSILENT` (Inno Setup)
5. `/qn` (MSI-wrapped EXE)
6. `--silent` (Modern)
7. `-s` (Rare)
8. `/passive` (Fallback)

**Example:**
```go
pkg := models.SoftwarePackage{
    Name:       "MyApp",
    Source:     "exe",
    PackageURL: "/path/to/installer.exe",
    Silent:     true, // Auto-detects correct flag
}

result := executor.InstallSoftware(ctx, pkg)
// Result message will show which flag worked
```

### Chocolatey Enhancements
- ✅ Auto-downgrade: `--allow-downgrade`
- ✅ Cleaner output: `--no-progress`
- ✅ Automatic dependency resolution

**Example:**
```go
pkg := models.SoftwarePackage{
    Name:    "nodejs",
    Version: "18.0.0", // Will downgrade if 19.x is installed
    Source:  "choco",
}
```

## Common Patterns

### Checking Admin Rights
```go
ps := NewPowerShellExecutor(false)
if !ps.IsAdministrator(ctx) {
    return fmt.Errorf("agent requires administrator privileges")
}
```

### Setting Up Firewall
```go
ps := NewPowerShellExecutor(false)

// Port-based rule
err := ps.AddFirewallRule(ctx, "Agent Web UI", "", 4504, "TCP")

// Program-based rule
err := ps.AddFirewallRule(ctx, "Agent Binary", "C:\\Program Files\\PatchIQ\\Agent\\patchiq-agent.exe", 0, "TCP")
```

### Reading Configuration from Registry
```go
ps := NewPowerShellExecutor(false)

serverURL, _ := ps.GetRegistryValue(ctx, `HKLM:\SOFTWARE\PatchIQ\Agent`, "ServerURL")
logLevel, _ := ps.GetRegistryValue(ctx, `HKLM:\SOFTWARE\PatchIQ\Agent`, "LogLevel")
```

### MSI Installation with Custom Properties
```go
pkg := models.SoftwarePackage{
    Name:       "MyApp",
    Source:     "msi",
    PackageURL: "https://example.com/myapp.msi",
    Arguments:  "INSTALLDIR=C:\\Apps ADDLOCAL=ALL",
}

result := executor.InstallSoftware(ctx, pkg)
```

### Handling MSI Exit Codes
```go
result := executor.InstallSoftware(ctx, msiPackage)

switch result.ExitCode {
case 0:
    log.Println("Success")
case 3010:
    log.Println("Success (reboot required)")
case 1602:
    log.Println("User cancelled")
case 1618:
    log.Println("Another installation in progress, retry later")
case 1638:
    log.Println("Already installed")
default:
    log.Printf("Failed: %s", result.ErrorMessage)
}
```

## Firewall Ports Reference

| Port | Protocol | Direction | Purpose |
|------|----------|-----------|---------|
| 4504 | TCP | Inbound | Agent Web UI |
| 3000 | TCP | Outbound | Backend API |
| 80/443 | TCP | Outbound | Package downloads (HTTP/HTTPS) |
| 9000 | TCP | Outbound | MinIO S3 API |

## Registry Keys Reference

**Base Key:** `HKLM:\SOFTWARE\PatchIQ\Agent`

| Value Name | Type | Default | Description |
|-----------|------|---------|-------------|
| ServerURL | String | http://localhost:3000 | Backend API endpoint |
| DataDir | String | %ProgramData%\PatchIQ\Agent | Agent data directory |
| LogLevel | String | info | Logging level (debug, info, warn, error) |
| HeartbeatInterval | DWord | 30 | Heartbeat interval in seconds |
| WebUIPort | DWord | 4504 | Web UI port |
| WebUIBind | String | 127.0.0.1 | Web UI bind address |

## Error Codes

### MSI Exit Codes (Common)

| Code | Meaning | Retryable |
|------|---------|-----------|
| 0 | Success | - |
| 1602 | User cancelled | No |
| 1603 | Fatal error | No |
| 1618 | Another installation in progress | Yes |
| 1619 | Invalid MSI package | No |
| 1625 | Forbidden by policy | No |
| 1638 | Already installed | No |
| 3010 | Success (reboot required) | - |

### Windows Update Error Codes (Common)

| Code | Meaning | Retryable |
|------|---------|-----------|
| 0x80072ee7 | DNS resolution failed | Yes |
| 0x80072efd | Connection failed | Yes |
| 0x80070005 | Access denied | No |
| 0x80070070 | Disk full | No |
| 0x80240017 | Update not applicable | No |
| 0x80240006 | Already installed | No |
| 0x80240438 | Service unavailable | Yes |

## Testing

### Run All Windows Tests
```bash
cd agent
go test -v ./internal/executors/...
```

### Run Specific Test
```bash
# PowerShell tests
go test -v -run TestPowerShellExecutor ./internal/executors/

# MSI tests
go test -v -run TestInstallSoftware_MSI ./internal/executors/

# Patch tests
go test -v -run TestInstallPatch ./internal/executors/
```

### Manual Testing Checklist

- [ ] PowerShell executor basic commands
- [ ] PowerShell executor admin check
- [ ] Registry read/write operations
- [ ] Firewall rule creation/deletion
- [ ] MSI installation (real package)
- [ ] EXE installation (NSIS, InstallShield, Inno Setup)
- [ ] Chocolatey installation
- [ ] Winget installation
- [ ] Windows Update listing
- [ ] Reboot detection

## Troubleshooting

### PowerShell Execution Errors
```powershell
# Check execution policy
Get-ExecutionPolicy

# Set to RemoteSigned (recommended)
Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
```

### Registry Access Denied
- Run agent with administrator privileges
- Use HKCU instead of HKLM for user-level config
- Check UAC settings

### Firewall Rule Creation Fails
- Requires administrator privileges
- Use `New-NetFirewallRule` PowerShell cmdlet directly
- Check if rule already exists

### MSI Installation Fails
- Check MSI log file in `%TEMP%\msi-install-*.log`
- Verify MSI package is valid: `msiexec /i <file> /l*v test.log`
- Check exit code in result.ExitCode

### EXE Silent Installation Fails
- Try manual silent flags: `/S`, `/silent`, `/quiet`, etc.
- Some installers don't support silent mode
- Check vendor documentation for correct flag

## Documentation

- **Setup Guide:** `agent/docs/WINDOWS-SETUP.md`
- **Implementation Report:** `agent/docs/PIPELINE-3-IMPLEMENTATION-REPORT.md`
- **Code:**
  - `agent/internal/executors/powershell_windows.go`
  - `agent/internal/executors/software_windows.go`
  - `agent/internal/executors/patch_windows.go`

---

**Last Updated:** 2026-02-14
**Version:** 1.0
**Platform:** Windows 10+, Server 2016+
