# Windows Build Quick Start

## Prerequisites

```bash
# Install goversioninfo (one-time setup)
go install github.com/josephspurrier/goversioninfo/cmd/goversioninfo@latest
```

## Build Commands

```bash
# Build both Windows binaries (amd64 + arm64)
make build-windows

# Build individual architectures
make build-windows-amd64
make build-windows-arm64

# Build all platforms (Linux, macOS, Windows)
make agent-release
```

## Output Location

```
agent/dist/
├── patchiq-agent-windows-amd64.exe   (~18 MB)
└── patchiq-agent-windows-arm64.exe   (~17 MB)
```

## Verify Build

```bash
# Check file type
file agent/dist/patchiq-agent-windows-amd64.exe
# Output: PE32+ executable (console) x86-64, for MS Windows

# Check version info (on Windows VM)
Right-click .exe → Properties → Details
# Shows: Company, Version, Description, Copyright
```

## Service Installation (Windows Only)

```bash
# Install as Windows Service (requires Administrator)
.\patchiq-agent.exe --install-service

# Start service
.\patchiq-agent.exe --start-service
# OR: sc start PatchIQAgent
# OR: net start PatchIQAgent

# Stop service
.\patchiq-agent.exe --stop-service

# Uninstall service
.\patchiq-agent.exe --uninstall-service
```

## Service Management (Windows Services UI)

```
1. Press Win+R
2. Type: services.msc
3. Find: PatchIQ Agent
4. Right-click → Start/Stop/Restart
5. Properties → Startup type: Automatic
```

## Event Logs (Windows)

```
1. Press Win+R
2. Type: eventvwr.msc
3. Windows Logs → Application
4. Filter: Source = "PatchIQAgent"
```

## Troubleshooting

### goversioninfo not found
```bash
# Check installation
which goversioninfo
# If not found, install:
go install github.com/josephspurrier/goversioninfo/cmd/goversioninfo@latest

# Check Go bin path
echo $HOME/go/bin
# Add to PATH if needed
export PATH=$PATH:$HOME/go/bin
```

### Service won't start
```bash
# Check Event Viewer for error details
# Common issues:
# - Config file missing (create %USERPROFILE%\.patchify-agent\config.json)
# - Permissions issue (ensure service runs as LocalSystem)
# - Port conflict (another process using port 4504)
```

### Binary won't run on Windows
```bash
# Check architecture
# amd64.exe → Intel/AMD 64-bit processors
# arm64.exe → ARM processors (Surface X, Windows on ARM)

# Check Windows Defender/SmartScreen
# Binaries are unsigned - you may see warning
# Future: Sign with Authenticode (Pipeline 4)
```

## CI/CD Release

```bash
# Tag version
git tag v1.1.0
git push origin v1.1.0

# GitHub Actions will:
# 1. Build all platforms
# 2. Embed version info in Windows binaries
# 3. Create GitHub Release
# 4. Upload binaries + checksums
```

## Development Workflow

```bash
# 1. Make changes to agent code
# 2. Build Windows binary
make build-windows-amd64

# 3. Test on Windows VM
# (Transfer .exe to Windows machine)

# 4. Install as service
.\patchiq-agent.exe --install-service

# 5. Verify service starts
Get-Service PatchIQAgent

# 6. Check logs
# Event Viewer → Application → PatchIQAgent events

# 7. Iterate as needed
```

## Production Deployment

**Current State (Manual):**
1. Download `patchiq-agent-windows-amd64.exe` from GitHub Releases
2. Copy to `C:\Program Files\PatchIQ\`
3. Run as Administrator: `patchiq-agent.exe --install-service`
4. Service auto-starts on boot

**Future State (MSI Installer - Task 3.2):**
1. Download `PatchIQAgent-1.1.0-amd64.msi`
2. Double-click to install
3. Service auto-installed and started
4. Start Menu shortcuts created
5. Add/Remove Programs entry added

## Configuration

**Service Mode Config Locations (in order of precedence):**
1. `%ProgramData%\PatchIQ\config.json`
2. `%USERPROFILE%\.patchify-agent\config.json`
3. Built-in defaults

**Example config.json:**
```json
{
  "serverURL": "https://patchiq.example.com/api",
  "webUIPort": 4504,
  "logLevel": "info",
  "dataDir": "C:\\ProgramData\\PatchIQ\\data"
}
```

## Next Steps

See `/agent/WINDOWS-BUILD-SUMMARY.md` for full documentation.

---

**Quick Links:**
- PRD: `/docs/agent/PIPELINE-3-PRD.md`
- Service Code: `/agent/internal/service/service_windows.go`
- Version Info: `/agent/assets/versioninfo.json`
- CI/CD: `/.github/workflows/agent-release.yml`
