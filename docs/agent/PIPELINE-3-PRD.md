# Pipeline 3: Windows Platform Hardening

## Overview

- **Priority:** Critical
- **Estimated Effort:** 56-67 hours
- **Dependencies:** Pipeline 1 (Core Deployment Engine)
- **Platform Scope:** Windows (10, 11, Server 2016+)
- **Target Completion:** Week 3
- **Current Completion:** 40%

## Business Justification

**Windows represents 50%+ of enterprise endpoints.** Without production-grade Windows support:
- Cannot ship to majority of enterprise customers
- MSI installer is industry standard (vs manual binary)
- Service installation required for background operation
- Registry handling needed for configuration persistence

**Current State:**
- Windows executor code exists (patch_windows.go, software_windows.go)
- No Windows binaries built (missing from release builds)
- No MSI installer
- No Windows Service wrapper
- Registry operations are ad-hoc

**Target State:**
- Windows binaries for amd64 and arm64
- Production MSI installer with WiX Toolset
- Windows Service auto-starts on boot
- Proper registry handling for configuration
- Windows-specific testing complete

**Value Delivered:**
- Enterprise-grade Windows deployment
- Professional installation experience
- Automatic startup and recovery
- Production confidence on Windows platform

---

## Requirements

### R1: Windows Binary Builds

**Description:** Build Windows executables for all target architectures with proper metadata

**Acceptance Criteria:**
- [ ] Windows amd64 binary builds successfully
- [ ] Windows arm64 binary builds successfully (for Surface devices)
- [ ] Version information embedded (FileVersion, ProductVersion)
- [ ] Icon embedded in executable
- [ ] Binaries signed with Authenticode (placeholder, full signing in Pipeline 4)
- [ ] Build automation via Makefile

**Platform:** Windows
**Priority:** Must Have
**Estimated Hours:** 6-8

---

### R2: MSI Installer with WiX

**Description:** Create professional MSI installer using WiX Toolset for Windows deployment

**Acceptance Criteria:**
- [ ] MSI installer created with WiX Toolset 4.x
- [ ] Install to `C:\Program Files\PatchIQ\Agent\`
- [ ] Create Start Menu shortcuts
- [ ] Add/Remove Programs entry with icon
- [ ] Upgrade support (detect existing installation)
- [ ] Uninstall cleans up files and registry
- [ ] Silent install support (`msiexec /i /qn`)
- [ ] Custom action to start service after install

**Platform:** Windows
**Priority:** Must Have
**Estimated Hours:** 12-16

---

### R3: Windows Service Installation

**Description:** Wrap agent binary as Windows Service for background operation

**Acceptance Criteria:**
- [ ] Service installed via MSI installer
- [ ] Service name: `PatchIQAgent`
- [ ] Display name: `PatchIQ Agent`
- [ ] Auto-start on boot (SERVICE_AUTO_START)
- [ ] Runs under LocalSystem account (or NetworkService)
- [ ] Service recovery options (restart on failure)
- [ ] Graceful shutdown on service stop
- [ ] Event Log integration for service events

**Platform:** Windows
**Priority:** Must Have
**Estimated Hours:** 8-10

---

### R4: Registry Configuration Handling

**Description:** Use Windows Registry for agent configuration storage

**Acceptance Criteria:**
- [ ] Configuration stored in `HKLM\SOFTWARE\PatchIQ\Agent\`
- [ ] Registry keys: ServerURL, DataDir, LogLevel, HeartbeatInterval
- [ ] Fallback to config file if registry unavailable
- [ ] MSI installer populates initial registry values
- [ ] Setup wizard updates registry (not just file)
- [ ] Uninstaller cleans up registry keys

**Platform:** Windows
**Priority:** Should Have
**Estimated Hours:** 4-6

---

### R5: Windows-Specific Bug Fixes

**Description:** Fix Windows-specific issues discovered during testing

**Acceptance Criteria:**
- [ ] Path handling uses `filepath.Join()` (not hardcoded slashes)
- [ ] File permissions respect Windows ACLs
- [ ] Command execution uses `cmd.exe` properly
- [ ] PowerShell script execution works (for advanced deployments)
- [ ] UAC elevation prompts work correctly
- [ ] Firewall exceptions configured during install

**Platform:** Windows
**Priority:** Must Have
**Estimated Hours:** 6-8

---

### R6: Windows Executor Enhancements

**Description:** Enhance Windows executors with production-grade features

**Acceptance Criteria:**
- [ ] winget executor uses `--silent` and `--accept-package-agreements`
- [ ] Chocolatey executor handles dependencies correctly
- [ ] MSI executor supports custom properties
- [ ] EXE executor detects and uses silent install flags
- [ ] Windows Update integration via PSWindowsUpdate module
- [ ] Proper exit code handling for all package managers

**Platform:** Windows
**Priority:** Should Have
**Estimated Hours:** 8-10

---

### R7: Windows Testing & Validation

**Description:** Comprehensive testing on Windows platforms

**Acceptance Criteria:**
- [ ] Test on Windows 10 (21H2+)
- [ ] Test on Windows 11 (22H2+)
- [ ] Test on Windows Server 2019
- [ ] Test on Windows Server 2022
- [ ] Test fresh install (MSI)
- [ ] Test upgrade install (over existing)
- [ ] Test uninstall (clean removal)
- [ ] Test service auto-start
- [ ] Test patch deployment (Windows Update)
- [ ] Test software deployment (winget, choco, msi, exe)

**Platform:** Windows
**Priority:** Must Have
**Estimated Hours:** 12-16

---

## Technical Approach

### Binary Build Configuration

**Makefile targets:**

```makefile
# Build Windows binaries
build-windows:
	GOOS=windows GOARCH=amd64 go build -ldflags "-X main.Version=$(VERSION) -X main.BuildDate=$(BUILD_DATE) -H windowsgui" -o dist/patchiq-agent-windows-amd64.exe ./cmd/agent
	GOOS=windows GOARCH=arm64 go build -ldflags "-X main.Version=$(VERSION) -X main.BuildDate=$(BUILD_DATE) -H windowsgui" -o dist/patchiq-agent-windows-arm64.exe ./cmd/agent

# Embed icon and version info
embed-resources:
	goversioninfo -icon=assets/icon.ico -manifest=assets/patchiq-agent.manifest
```

**Version Info (`versioninfo.json`):**

```json
{
  "FixedFileInfo": {
    "FileVersion": {
      "Major": 1,
      "Minor": 0,
      "Patch": 0,
      "Build": 0
    },
    "ProductVersion": {
      "Major": 1,
      "Minor": 0,
      "Patch": 0,
      "Build": 0
    },
    "FileFlagsMask": "3f",
    "FileFlags": "00",
    "FileOS": "040004",
    "FileType": "01",
    "FileSubType": "00"
  },
  "StringFileInfo": {
    "Comments": "PatchIQ Agent for Windows",
    "CompanyName": "PatchIQ",
    "FileDescription": "PatchIQ Agent Service",
    "FileVersion": "1.0.0.0",
    "InternalName": "patchiq-agent",
    "LegalCopyright": "Copyright (C) 2026 PatchIQ",
    "OriginalFilename": "patchiq-agent.exe",
    "ProductName": "PatchIQ Agent",
    "ProductVersion": "1.0.0.0"
  },
  "VarFileInfo": {
    "Translation": {
      "LangID": "0409",
      "CharsetID": "04B0"
    }
  }
}
```

---

### WiX Installer Structure

**File: `installer/windows/patchiq-agent.wxs`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Product Id="*"
           Name="PatchIQ Agent"
           Language="1033"
           Version="1.0.0.0"
           Manufacturer="PatchIQ"
           UpgradeCode="12345678-1234-1234-1234-123456789012">

    <Package InstallerVersion="500"
             Compressed="yes"
             InstallScope="perMachine"
             Description="PatchIQ Agent for Windows" />

    <MajorUpgrade DowngradeErrorMessage="A newer version is already installed." />
    <MediaTemplate EmbedCab="yes" />

    <!-- Installation Directory -->
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFiles64Folder">
        <Directory Id="CompanyFolder" Name="PatchIQ">
          <Directory Id="INSTALLFOLDER" Name="Agent">
            <Component Id="AgentExecutable" Guid="*">
              <File Id="AgentEXE"
                    Source="../../dist/patchiq-agent-windows-amd64.exe"
                    KeyPath="yes" />

              <!-- Windows Service -->
              <ServiceInstall Id="ServiceInstaller"
                              Type="ownProcess"
                              Name="PatchIQAgent"
                              DisplayName="PatchIQ Agent"
                              Description="Manages patch and software deployments"
                              Start="auto"
                              Account="LocalSystem"
                              ErrorControl="normal" />

              <ServiceControl Id="ServiceControl"
                              Name="PatchIQAgent"
                              Start="install"
                              Stop="both"
                              Remove="uninstall" />
            </Component>

            <!-- Configuration Files -->
            <Component Id="ConfigFile" Guid="*">
              <File Id="ConfigYAML"
                    Source="../../agent/config.yaml.template"
                    Name="config.yaml" />
            </Component>
          </Directory>
        </Directory>
      </Directory>

      <!-- Start Menu -->
      <Directory Id="ProgramMenuFolder">
        <Directory Id="ApplicationProgramsFolder" Name="PatchIQ Agent">
          <Component Id="StartMenuShortcuts" Guid="*">
            <Shortcut Id="AgentWebUIShortcut"
                      Name="Agent Web UI"
                      Target="http://localhost:4504"
                      Icon="AgentIcon.exe" />
            <RemoveFolder Id="RemoveApplicationProgramsFolder" On="uninstall" />
            <RegistryValue Root="HKCU"
                          Key="Software\PatchIQ\Agent"
                          Name="installed"
                          Type="integer"
                          Value="1"
                          KeyPath="yes" />
          </Component>
        </Directory>
      </Directory>
    </Directory>

    <!-- Registry Configuration -->
    <Component Id="RegistryEntries" Directory="INSTALLFOLDER" Guid="*">
      <RegistryKey Root="HKLM" Key="SOFTWARE\PatchIQ\Agent">
        <RegistryValue Type="string" Name="ServerURL" Value="[SERVERURL]" />
        <RegistryValue Type="string" Name="DataDir" Value="[INSTALLFOLDER]data" />
        <RegistryValue Type="string" Name="LogLevel" Value="info" />
        <RegistryValue Type="integer" Name="HeartbeatInterval" Value="30" />
      </RegistryKey>
    </Component>

    <!-- Features -->
    <Feature Id="ProductFeature" Title="PatchIQ Agent" Level="1">
      <ComponentRef Id="AgentExecutable" />
      <ComponentRef Id="ConfigFile" />
      <ComponentRef Id="StartMenuShortcuts" />
      <ComponentRef Id="RegistryEntries" />
    </Feature>

    <!-- UI -->
    <Property Id="WIXUI_INSTALLDIR" Value="INSTALLFOLDER" />
    <UIRef Id="WixUI_InstallDir" />
    <WixVariable Id="WixUILicenseRtf" Value="License.rtf" />

    <!-- Icons -->
    <Icon Id="AgentIcon.exe" SourceFile="../../assets/icon.ico" />
    <Property Id="ARPPRODUCTICON" Value="AgentIcon.exe" />
  </Product>
</Wix>
```

**Build script: `installer/windows/build-msi.ps1`**

```powershell
# Build MSI installer with WiX Toolset

param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"

Write-Host "Building PatchIQ Agent MSI installer v$Version..."

# Check WiX installation
if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
    Write-Error "WiX Toolset not found. Install with: dotnet tool install --global wix"
    exit 1
}

# Build agent binary
Write-Host "Building agent binary..."
Push-Location ..\..\agent
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -ldflags "-X main.Version=$Version" -o ..\dist\patchiq-agent-windows-amd64.exe .\cmd\agent
Pop-Location

# Compile WiX
Write-Host "Compiling WiX source..."
wix build patchiq-agent.wxs -out ..\..\dist\PatchIQAgent-$Version-amd64.msi -arch x64

Write-Host "MSI installer built successfully: dist\PatchIQAgent-$Version-amd64.msi"
```

---

### Windows Service Wrapper

**File: `agent/internal/service/service_windows.go`**

```go
package service

import (
    "fmt"
    "time"

    "golang.org/x/sys/windows/svc"
    "golang.org/x/sys/windows/svc/mgr"
    "github.com/rs/zerolog/log"
)

type windowsService struct {
    agent *Agent
}

func (s *windowsService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (bool, uint32) {
    const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown

    changes <- svc.Status{State: svc.StartPending}

    // Start agent
    if err := s.agent.Start(); err != nil {
        log.Error().Err(err).Msg("Failed to start agent")
        return true, 1
    }

    changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}
    log.Info().Msg("Windows Service started")

loop:
    for {
        select {
        case c := <-r:
            switch c.Cmd {
            case svc.Interrogate:
                changes <- c.CurrentStatus
            case svc.Stop, svc.Shutdown:
                log.Info().Msg("Stopping Windows Service...")
                changes <- svc.Status{State: svc.StopPending}
                s.agent.Stop()
                break loop
            default:
                log.Warn().Uint32("cmd", uint32(c.Cmd)).Msg("Unexpected service command")
            }
        }
    }

    changes <- svc.Status{State: svc.Stopped}
    return false, 0
}

func InstallService(name, displayName, description, binaryPath string) error {
    m, err := mgr.Connect()
    if err != nil {
        return fmt.Errorf("connect to service manager: %w", err)
    }
    defer m.Disconnect()

    s, err := m.OpenService(name)
    if err == nil {
        s.Close()
        return fmt.Errorf("service %s already exists", name)
    }

    s, err = m.CreateService(name, binaryPath, mgr.Config{
        DisplayName:      displayName,
        Description:      description,
        StartType:        mgr.StartAutomatic,
        ServiceStartName: "LocalSystem",
    })
    if err != nil {
        return fmt.Errorf("create service: %w", err)
    }
    defer s.Close()

    // Set recovery options (restart on failure)
    err = s.SetRecoveryActions([]mgr.RecoveryAction{
        {Type: mgr.ServiceRestart, Delay: 5 * time.Second},
        {Type: mgr.ServiceRestart, Delay: 10 * time.Second},
        {Type: mgr.ServiceRestart, Delay: 20 * time.Second},
    }, 86400) // Reset failure count after 24 hours

    if err != nil {
        return fmt.Errorf("set recovery actions: %w", err)
    }

    return nil
}

func RunAsService(agent *Agent) error {
    isService, err := svc.IsWindowsService()
    if err != nil {
        return fmt.Errorf("check if running as service: %w", err)
    }

    if !isService {
        return fmt.Errorf("not running as Windows Service")
    }

    return svc.Run("PatchIQAgent", &windowsService{agent: agent})
}
```

---

### Registry Configuration

**File: `agent/internal/config/registry_windows.go`**

```go
package config

import (
    "fmt"

    "golang.org/x/sys/windows/registry"
)

const registryPath = `SOFTWARE\PatchIQ\Agent`

func LoadFromRegistry() (*Config, error) {
    key, err := registry.OpenKey(registry.LOCAL_MACHINE, registryPath, registry.QUERY_VALUE)
    if err != nil {
        return nil, fmt.Errorf("open registry key: %w", err)
    }
    defer key.Close()

    cfg := &Config{}

    if val, _, err := key.GetStringValue("ServerURL"); err == nil {
        cfg.ServerURL = val
    }

    if val, _, err := key.GetStringValue("DataDir"); err == nil {
        cfg.DataDir = val
    }

    if val, _, err := key.GetStringValue("LogLevel"); err == nil {
        cfg.LogLevel = val
    }

    if val, _, err := key.GetIntegerValue("HeartbeatInterval"); err == nil {
        cfg.HeartbeatInterval = int(val)
    }

    return cfg, nil
}

func SaveToRegistry(cfg *Config) error {
    key, _, err := registry.CreateKey(registry.LOCAL_MACHINE, registryPath, registry.SET_VALUE)
    if err != nil {
        return fmt.Errorf("create registry key: %w", err)
    }
    defer key.Close()

    if err := key.SetStringValue("ServerURL", cfg.ServerURL); err != nil {
        return err
    }

    if err := key.SetStringValue("DataDir", cfg.DataDir); err != nil {
        return err
    }

    if err := key.SetStringValue("LogLevel", cfg.LogLevel); err != nil {
        return err
    }

    if err := key.SetDWordValue("HeartbeatInterval", uint32(cfg.HeartbeatInterval)); err != nil {
        return err
    }

    return nil
}
```

---

## Implementation Plan

### Task 3.1: Windows Binary Builds (6-8 hours)

**Owner:** Teammate 1
**Files:**
- `Makefile` (add Windows build targets)
- `assets/icon.ico` (create icon)
- `assets/versioninfo.json` (version metadata)
- `.github/workflows/agent-release.yml` (add Windows builds)

**Steps:**
1. Create Windows build targets in Makefile
2. Add goversioninfo for resource embedding
3. Build amd64 and arm64 binaries
4. Test binaries on Windows 10/11
5. Update CI/CD to build Windows binaries

---

### Task 3.2: MSI Installer (12-16 hours)

**Owner:** Teammate 2
**Files:**
- `installer/windows/patchiq-agent.wxs` (WiX source)
- `installer/windows/build-msi.ps1` (build script)
- `installer/windows/License.rtf` (license for installer UI)

**Steps:**
1. Install WiX Toolset 4.x
2. Create WiX source file with directory structure
3. Add service installation custom actions
4. Add registry configuration
5. Add Start Menu shortcuts
6. Test MSI install/upgrade/uninstall
7. Document silent install parameters

---

### Task 3.3: Windows Service Wrapper (8-10 hours)

**Owner:** Teammate 1
**Files:**
- `agent/internal/service/service_windows.go`
- `agent/cmd/agent/main.go` (detect service mode)

**Steps:**
1. Implement `windowsService` struct with Execute method
2. Add service control handlers (stop, shutdown, interrogate)
3. Implement InstallService, UninstallService functions
4. Add service recovery options
5. Integrate with main.go (detect if running as service)
6. Test service install, start, stop, restart
7. Test service auto-start on boot

---

### Task 3.4: Registry Configuration (4-6 hours)

**Owner:** Teammate 2
**Files:**
- `agent/internal/config/registry_windows.go`
- `agent/internal/config/config.go` (add registry fallback)

**Steps:**
1. Implement LoadFromRegistry function
2. Implement SaveToRegistry function
3. Update config loader to try registry first, then file
4. Update setup wizard to write to registry
5. Test registry read/write
6. Add uninstall cleanup for registry keys

---

### Task 3.5: Windows Bug Fixes (6-8 hours)

**Owner:** Teammate 3
**Files:**
- All executor files (audit for Windows compatibility)
- `agent/internal/download/download.go`
- `agent/internal/client/client.go`

**Steps:**
1. Audit all file path operations (use filepath.Join)
2. Fix command execution (proper cmd.exe usage)
3. Add PowerShell script execution support
4. Test file permissions on Windows
5. Add firewall exception during install
6. Test UAC elevation prompts

---

### Task 3.6: Windows Executor Enhancements (8-10 hours)

**Owner:** Teammate 3
**Files:**
- `agent/internal/executors/patch_windows.go`
- `agent/internal/executors/software_windows.go`

**Steps:**
1. Enhance winget executor (silent mode, package agreements)
2. Enhance chocolatey executor (dependency handling)
3. Enhance MSI executor (custom properties)
4. Enhance EXE executor (auto-detect silent flags)
5. Add Windows Update integration
6. Add proper exit code handling
7. Write unit tests for enhancements

---

### Task 3.7: Windows Testing (12-16 hours)

**Owner:** Teammate 2 + Teammate 3
**Platforms:**
- Windows 10 (21H2)
- Windows 11 (22H2)
- Windows Server 2019
- Windows Server 2022

**Test Matrix:**

| Test Case | Windows 10 | Windows 11 | Server 2019 | Server 2022 |
|-----------|------------|------------|-------------|-------------|
| Fresh install (MSI) | ✅ | ✅ | ✅ | ✅ |
| Upgrade install | ✅ | ✅ | ✅ | ✅ |
| Uninstall | ✅ | ✅ | ✅ | ✅ |
| Service auto-start | ✅ | ✅ | ✅ | ✅ |
| Patch deployment (Windows Update) | ✅ | ✅ | ✅ | ✅ |
| Software: winget | ✅ | ✅ | N/A | N/A |
| Software: chocolatey | ✅ | ✅ | ✅ | ✅ |
| Software: MSI | ✅ | ✅ | ✅ | ✅ |
| Software: EXE | ✅ | ✅ | ✅ | ✅ |
| Registry configuration | ✅ | ✅ | ✅ | ✅ |

---

## Parallelization Strategy

```
Week 1 (Parallel):
├── Teammate 1: Task 3.1 → 3.3
│   ├── Windows binary builds (6-8h)
│   └── Service wrapper (8-10h)
│   Total: 14-18 hours
│
├── Teammate 2: Task 3.2 → 3.4
│   ├── MSI installer (12-16h)
│   └── Registry configuration (4-6h)
│   Total: 16-22 hours
│
└── Teammate 3: Task 3.5 → 3.6
    ├── Windows bug fixes (6-8h)
    └── Executor enhancements (8-10h)
    Total: 14-18 hours

Week 2 (Testing):
└── All teammates: Task 3.7
    └── Windows testing (12-16h split across teammates)
```

**Total: 56-74 hours with 3 teammates = 19-25 hours per teammate**
**Timeline: ~2 weeks**

---

## Exit Criteria

- [ ] Windows amd64 and arm64 binaries build successfully
- [ ] MSI installer installs/upgrades/uninstalls cleanly
- [ ] Windows Service auto-starts on boot
- [ ] Registry configuration works correctly
- [ ] All Windows executors functional
- [ ] Test matrix complete (36/36 test cases passing)
- [ ] No critical or high-priority bugs
- [ ] Documentation updated

---

## Test Metrics

**Platform Coverage:**
- Windows 10: 100%
- Windows 11: 100%
- Windows Server 2019: 100%
- Windows Server 2022: 100%

**Test Count Goals:**
- Installation tests: 12
- Service tests: 8
- Deployment tests: 16
- **Total: 36 test cases**

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| WiX Toolset learning curve | Medium | Use WiX 4.x documentation, example projects |
| Windows Service debugging hard | Medium | Use Event Viewer, service logs |
| UAC prompts block silent install | High | Require admin elevation, document in installer |
| Windows Update API limitations | Medium | Use PSWindowsUpdate module as alternative |

---

## Dependencies

**Required Tools:**
- Go 1.22+ (cross-compilation)
- WiX Toolset 4.x
- goversioninfo (`go install github.com/josephspurrier/goversioninfo/cmd/goversioninfo@latest`)
- PowerShell 7+

**Required Windows VMs:**
- Windows 10 (21H2)
- Windows 11 (22H2)
- Windows Server 2019
- Windows Server 2022

---

## Timeline

- **Planning:** 6 hours
- **Implementation:** 44-56 hours (with 3 teammates: 15-19 hours each)
- **Testing:** 12-16 hours (split across teammates)
- **QA:** 6 hours
- **Buffer:** 11 hours
- **Total:** 67 hours = **2 weeks** with 3 teammates

---

## Success Metrics

- **Binary Quality:** All Windows binaries build without errors
- **MSI Quality:** Installer passes on all 4 Windows platforms
- **Service Reliability:** Service auto-starts 100% of the time
- **Test Coverage:** 36/36 test cases passing
- **Performance:** Agent uses < 50MB RAM, < 1% CPU on Windows

---

**Document Status:** APPROVED
**Last Updated:** 2026-02-14
**Implementation Start:** Now
