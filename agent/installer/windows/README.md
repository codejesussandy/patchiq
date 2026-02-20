# PatchIQ Agent Windows Installer

This directory contains the WiX Toolset installer configuration for building a professional MSI installer for the PatchIQ Agent on Windows.

## Overview

The MSI installer provides:
- **Installation to**: `C:\Program Files\PatchIQ\Agent\`
- **Windows Service**: `PatchIQAgent` (auto-starts on boot)
- **Start Menu Shortcuts**: Web UI link and uninstall shortcut
- **Registry Configuration**: Configuration stored in `HKLM\SOFTWARE\PatchIQ\Agent`
- **Clean Uninstall**: Removes all files, registry keys, and the service
- **Silent Install Support**: Full support for unattended deployment

## Prerequisites

### Required Tools

1. **Go 1.22+**
   - Download from: https://go.dev/dl/
   - Verify: `go version`

2. **WiX Toolset 3.x**
   - **Option 1** (Chocolatey): `choco install wixtoolset`
   - **Option 2** (Direct Download): https://wixtoolset.org/releases/
   - **Option 3** (WiX 4.x): `dotnet tool install --global wix`
   - Verify: `candle.exe -?`

### System Requirements

- **Build Platform**: Windows 10/11 or Windows Server 2016+
- **Target Platform**: Windows 10/11 or Windows Server 2016+
- **Architecture**: 64-bit (x64)

## Building the MSI

### Quick Start

```powershell
# Build with default settings
.\build-msi.ps1

# Build with specific version
.\build-msi.ps1 -Version "1.2.3"

# Build with custom server URL
.\build-msi.ps1 -ServerUrl "https://patchiq.example.com/api"

# Clean build
.\build-msi.ps1 -Clean -Version "1.2.3"
```

### Build Script Options

```powershell
.\build-msi.ps1 [OPTIONS]

Options:
  -Version <string>           Agent version (default: "1.0.0")
  -ServerUrl <string>         Default server URL (default: "http://localhost:3000/api")
  -WebUIPort <int>            Web UI port (default: 3006)
  -LogLevel <string>          Log level (default: "info")
  -HeartbeatInterval <int>    Heartbeat interval in seconds (default: 60)
  -OutputDir <string>         Output directory (default: ".\dist")
  -WixPath <string>           Custom WiX Toolset path
  -Clean                      Clean build directories before building
  -SkipBuild                  Skip Go build, use existing binary
```

### Build Process

The build script performs these steps:

1. **Compile Go Binary**
   - Cross-compiles agent for `windows/amd64`
   - Embeds version and build date
   - Outputs to `build/patchiq-agent.exe`

2. **Prepare Resources**
   - Verifies icon file exists (`patchiq.ico`)
   - Verifies license file exists (`License.rtf`)
   - Generates `default-config.json`

3. **Compile WiX Source**
   - Uses `candle.exe` to compile `patchiq-agent.wxs`
   - Produces `build/patchiq-agent.wixobj`

4. **Link MSI**
   - Uses `light.exe` to create final MSI
   - Outputs to `dist/PatchIQAgent-<version>-amd64.msi`

### Manual Build (Advanced)

If you prefer to build manually without the script:

```powershell
# 1. Build Go binary
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"
cd ..\..\
go build -ldflags "-s -w -X main.Version=1.0.0" -o installer\windows\build\patchiq-agent.exe ./cmd/agent

# 2. Compile WiX source
cd installer\windows
candle.exe -arch x64 -dVersion=1.0.0 -dBuildDir=build -ext WixUtilExtension -out build\ patchiq-agent.wxs

# 3. Link MSI
light.exe -ext WixUIExtension -ext WixUtilExtension -cultures:en-us -out dist\PatchIQAgent-1.0.0-amd64.msi build\patchiq-agent.wixobj
```

## Installation

### Interactive Installation

Double-click the MSI file or run:

```cmd
msiexec /i PatchIQAgent-1.0.0-amd64.msi
```

This will:
1. Show the license agreement
2. Install to `C:\Program Files\PatchIQ\Agent\`
3. Create the Windows Service
4. Start the service automatically
5. Create Start Menu shortcuts

### Silent Installation

For unattended deployment (IT/MDM systems):

```cmd
msiexec /i PatchIQAgent-1.0.0-amd64.msi /qn
```

### Silent Installation with Custom Configuration

```cmd
msiexec /i PatchIQAgent-1.0.0-amd64.msi ^
  SERVERURL="https://patchiq.example.com/api" ^
  WEBUI_PORT="3006" ^
  LOGLEVEL="info" ^
  HEARTBEAT_INTERVAL="60" ^
  /qn
```

### Installation Properties

| Property | Description | Default |
|----------|-------------|---------|
| `SERVERURL` | PatchIQ backend server URL | `http://localhost:3000/api` |
| `WEBUI_PORT` | Agent Web UI port | `3006` |
| `LOGLEVEL` | Logging level (debug/info/warn/error) | `info` |
| `HEARTBEAT_INTERVAL` | Heartbeat interval in seconds | `60` |

### Installation Verification

After installation, verify the service is running:

```cmd
sc query PatchIQAgent
```

You should see:
```
STATE              : RUNNING
```

Check the agent version:

```cmd
"C:\Program Files\PatchIQ\Agent\patchiq-agent.exe" --version
```

## Uninstallation

### Interactive Uninstall

Via **Add/Remove Programs**:
1. Open **Settings > Apps > Apps & features**
2. Find **PatchIQ Agent**
3. Click **Uninstall**

Or via Start Menu:
1. Navigate to **Start > PatchIQ Agent**
2. Click **Uninstall PatchIQ Agent**

### Silent Uninstall

```cmd
msiexec /x PatchIQAgent-1.0.0-amd64.msi /qn
```

Or using the product code:

```cmd
msiexec /x {PRODUCT-CODE-GUID} /qn
```

### Uninstall Verification

The uninstaller removes:
- All files in `C:\Program Files\PatchIQ\Agent\`
- The `PatchIQAgent` Windows Service
- All registry keys under `HKLM\SOFTWARE\PatchIQ\Agent`
- Start Menu shortcuts
- Environment variables

## Service Management

### Service Details

- **Service Name**: `PatchIQAgent`
- **Display Name**: `PatchIQ Agent`
- **Startup Type**: Automatic
- **Account**: LocalSystem
- **Recovery**: Restart on failure (3 attempts)

### Manual Service Control

Start the service:
```cmd
sc start PatchIQAgent
```

Stop the service:
```cmd
sc stop PatchIQAgent
```

Query service status:
```cmd
sc query PatchIQAgent
```

View service configuration:
```cmd
sc qc PatchIQAgent
```

## Registry Configuration

The installer creates registry keys at:

```
HKLM\SOFTWARE\PatchIQ\Agent\
├── ServerURL         (REG_SZ)
├── DataDir           (REG_SZ)
├── LogLevel          (REG_SZ)
├── HeartbeatInterval (REG_DWORD)
├── InstallDir        (REG_SZ)
└── Version           (REG_SZ)
```

These values are used by the agent to configure itself on startup. The agent tries registry first, then falls back to the config file.

### Viewing Registry Values

```cmd
reg query "HKLM\SOFTWARE\PatchIQ\Agent"
```

### Modifying Configuration via Registry

```cmd
reg add "HKLM\SOFTWARE\PatchIQ\Agent" /v ServerURL /t REG_SZ /d "https://new-server/api" /f
sc stop PatchIQAgent
sc start PatchIQAgent
```

## Directory Structure

After installation:

```
C:\Program Files\PatchIQ\Agent\
├── patchiq-agent.exe           # Main agent binary
├── logs\                       # Log files
└── data\
    └── config.json             # Fallback config file
```

## Troubleshooting

### Installation Fails

1. **Check Windows version**: Must be Windows 10 or later, 64-bit
2. **Check permissions**: Run installer as Administrator
3. **View logs**: Check `%TEMP%\MSI*.log` for detailed error messages

Generate verbose installation log:
```cmd
msiexec /i PatchIQAgent-1.0.0-amd64.msi /l*v install.log
```

### Service Won't Start

1. **Check Event Viewer**: Look for errors under **Windows Logs > Application**
2. **Check agent logs**: `C:\Program Files\PatchIQ\Agent\logs\`
3. **Verify permissions**: Service runs as LocalSystem, should have full access

Run agent manually (for debugging):
```cmd
cd "C:\Program Files\PatchIQ\Agent"
.\patchiq-agent.exe
```

### Configuration Not Loading

1. **Check registry**: `reg query "HKLM\SOFTWARE\PatchIQ\Agent"`
2. **Check config file**: `C:\Program Files\PatchIQ\Agent\data\config.json`
3. **Check environment variables**: `set | findstr PATCHIQ`

### Upgrade Issues

If upgrade fails:
1. Uninstall old version completely
2. Delete `C:\Program Files\PatchIQ\` manually if needed
3. Clean registry: `reg delete "HKLM\SOFTWARE\PatchIQ" /f`
4. Install new version

## Development

### WiX Source Files

- **`patchiq-agent.wxs`**: Main WiX installer manifest
  - Defines directory structure
  - Configures Windows Service
  - Sets up registry keys
  - Creates Start Menu shortcuts
  - Handles upgrade logic

- **`License.rtf`**: License agreement shown during installation

- **`patchiq.ico`**: Icon for Add/Remove Programs and shortcuts

- **`default-config.json`**: Template configuration file

### Testing the Installer

1. **Build the MSI**:
   ```powershell
   .\build-msi.ps1 -Version "1.0.0-test"
   ```

2. **Install in a VM**:
   - Use Windows 10/11 VM
   - Test fresh install
   - Test upgrade install
   - Test uninstall

3. **Verify Installation**:
   ```cmd
   sc query PatchIQAgent
   reg query "HKLM\SOFTWARE\PatchIQ\Agent"
   dir "C:\Program Files\PatchIQ\Agent"
   ```

4. **Test Service**:
   ```cmd
   sc stop PatchIQAgent
   sc start PatchIQAgent
   ```

### Modifying the Installer

To customize the installer:

1. **Change install location**: Edit `INSTALLFOLDER` in `patchiq-agent.wxs`
2. **Add files**: Add new `<File>` elements in appropriate `<Component>`
3. **Change service account**: Modify `Account` attribute in `<ServiceInstall>`
4. **Add custom actions**: Create new `<CustomAction>` elements

After changes, rebuild:
```powershell
.\build-msi.ps1 -Clean -Version "1.0.1"
```

## Enterprise Deployment

### Group Policy Deployment

1. **Share the MSI** on a network share
2. **Create GPO**:
   - Computer Configuration > Policies > Software Settings > Software Installation
   - Right-click > New > Package
   - Select the MSI from network share

3. **Configure installation**:
   - Choose "Assigned" for automatic installation
   - Set properties for silent install parameters

### SCCM/Intune Deployment

Create a package with:
- **Install command**: `msiexec /i PatchIQAgent-1.0.0-amd64.msi SERVERURL="https://server/api" /qn`
- **Uninstall command**: `msiexec /x PatchIQAgent-1.0.0-amd64.msi /qn`
- **Detection method**: Check for service `PatchIQAgent` or registry key

### PDQ Deploy

1. Create new package
2. Set install step:
   ```cmd
   msiexec /i PatchIQAgent-1.0.0-amd64.msi SERVERURL="https://server/api" /qn /norestart
   ```
3. Enable success codes: 0, 1641, 3010
4. Deploy to target collection

## License

See `License.rtf` for the PatchIQ Agent license agreement.

## Support

For issues or questions:
- **Documentation**: https://patchiq.io/docs
- **Support**: https://patchiq.io/support
- **GitHub Issues**: https://github.com/patchiq/agent/issues

## Version History

- **1.0.0** (2026-02-14): Initial MSI installer release
  - Windows Service installation
  - Registry configuration
  - Silent install support
  - Upgrade handling
