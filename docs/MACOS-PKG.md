# macOS PKG Installer Documentation

**Document Version:** 1.0
**Last Updated:** 2026-02-14
**Status:** Production Ready

---

## Overview

This document describes the macOS PKG installer for PatchIQ Agent, including:
- Build process and requirements
- Installation behavior and file locations
- Signing and notarization
- Testing and troubleshooting
- Uninstallation

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Build Process](#build-process)
3. [Installation Details](#installation-details)
4. [Code Signing](#code-signing)
5. [Testing](#testing)
6. [Uninstallation](#uninstallation)
7. [Troubleshooting](#troubleshooting)
8. [Technical Reference](#technical-reference)

---

## Quick Start

### Building the Installer

```bash
# Navigate to installer directory
cd agent/installer/macos

# Build for current architecture
./build-pkg.sh 1.0.0

# Build for specific architecture
./build-pkg.sh 1.0.0 arm64   # Apple Silicon
./build-pkg.sh 1.0.0 amd64   # Intel
```

### Installing

```bash
# GUI installation (double-click PKG file)
open ../../dist/PatchIQAgent-1.0.0-arm64.pkg

# Command-line installation
sudo installer -pkg ../../dist/PatchIQAgent-1.0.0-arm64.pkg -target /
```

### Uninstalling

```bash
sudo ./uninstall.sh
```

---

## Build Process

### Requirements

**System Requirements:**
- macOS 10.13 (High Sierra) or later
- Xcode Command Line Tools installed
- `pkgbuild` and `productbuild` (included with Xcode)

**Optional (for signing):**
- Apple Developer account
- Developer ID Installer certificate
- Signing identity in Keychain

**Build Dependencies:**
- Pre-built agent binary in `agent/dist/`
- Binary must match target architecture

### Directory Structure

```
installer/macos/
├── build-pkg.sh              # Main build script
├── uninstall.sh              # Uninstall script for end users
├── Distribution.xml          # Product package configuration (generated)
├── scripts/                  # Install scripts (generated)
│   ├── preinstall           # Stops existing agent
│   └── postinstall          # Starts new agent
├── resources/               # Installer UI resources (generated)
│   ├── welcome.html         # Welcome screen
│   ├── license.html         # License agreement
│   └── conclusion.html      # Post-install information
└── build/                   # Temporary build directory (cleaned after build)
    ├── payload/             # Files to install
    └── component.pkg        # Component package
```

### Build Steps

The `build-pkg.sh` script performs these steps:

1. **Validation**
   - Check for agent binary in `dist/`
   - Validate architecture parameter
   - Create build directories

2. **Payload Creation**
   - Copy agent binary to `usr/local/bin/patchiq-agent`
   - Create LaunchAgent plist in `Library/LaunchAgents/`
   - Set proper permissions (755 for binary, 644 for plist)

3. **Install Scripts**
   - Generate `preinstall` script (stops existing service)
   - Generate `postinstall` script (starts new service)
   - Make scripts executable

4. **Resource Generation**
   - Create `welcome.html` (installer welcome screen)
   - Create `license.html` (software license agreement)
   - Create `conclusion.html` (post-install instructions)

5. **Component Package**
   - Build component package with `pkgbuild`
   - Include install scripts
   - Set package identifier and version

6. **Product Package**
   - Build product package with `productbuild`
   - Use `Distribution.xml` for configuration
   - Include UI resources
   - Create final PKG in `dist/`

7. **Code Signing** (Optional)
   - Sign package with Developer ID Installer certificate
   - Verify signature with `pkgutil`

8. **Cleanup**
   - Remove temporary build directory
   - Keep final PKG in `dist/`

### Build Script Usage

```bash
./build-pkg.sh [VERSION] [ARCH]

# Parameters:
#   VERSION  - Semantic version (default: 1.0.0)
#   ARCH     - Architecture: arm64 or amd64 (default: current system)

# Examples:
./build-pkg.sh                    # 1.0.0, current arch
./build-pkg.sh 2.1.0              # 2.1.0, current arch
./build-pkg.sh 2.1.0 arm64        # 2.1.0, Apple Silicon
./build-pkg.sh 2.1.0 amd64        # 2.1.0, Intel
```

### Environment Variables

```bash
# Signing (optional)
export DEVELOPER_ID_INSTALLER="Developer ID Installer: Company Name (TEAM_ID)"
# or
export CODESIGN_IDENTITY="Developer ID Installer: Company Name (TEAM_ID)"
```

---

## Installation Details

### Installation Locations

| Item | Path | Permissions |
|------|------|-------------|
| Agent Binary | `/usr/local/bin/patchiq-agent` | 755 (rwxr-xr-x) |
| LaunchAgent | `~/Library/LaunchAgents/io.patchiq.agent.plist` | 644 (rw-r--r--) |
| Logs | `/var/log/patchiq/agent.log` | 644 (rw-r--r--) |
| Error Logs | `/var/log/patchiq/agent-error.log` | 644 (rw-r--r--) |

### LaunchAgent Configuration

The installer creates a LaunchAgent plist that:
- **Auto-starts on login** (`RunAtLoad: true`)
- **Restarts on failure** (`KeepAlive: true`)
- **Throttles restarts** (10 second interval)
- **Logs output** to `/var/log/patchiq/`
- **Sets environment** (PATH variable)

**LaunchAgent Plist:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.patchiq.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/patchiq-agent</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>/var/log/patchiq/agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/patchiq/agent-error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
```

### Pre-Install Behavior

The `preinstall` script runs **before** installation and:
1. Stops existing PatchIQ Agent service (if running)
2. Unloads existing LaunchAgent (if present)
3. Handles both user and system-wide installations
4. Fails gracefully if agent is not running

### Post-Install Behavior

The `postinstall` script runs **after** installation and:
1. Creates log directory (`/var/log/patchiq`)
2. Sets proper permissions on files
3. Loads LaunchAgent for current user
4. Starts the agent service
5. Displays success message with useful commands

---

## Code Signing

### Overview

Code signing is **recommended but not required** for distribution. Signed packages:
- Build user trust
- Pass Gatekeeper checks
- Enable notarization by Apple
- Are required for App Store and enterprise deployment

### Certificate Requirements

**For Signing:**
- Developer ID Installer certificate
- Certificate must be in your Keychain
- Must have private key access

**Certificate Types:**
- **Developer ID Installer** - For PKG signing (required)
- **Developer ID Application** - For binary signing (separate, see Pipeline 4)

### Obtaining Certificates

1. **Join Apple Developer Program**
   - Visit: https://developer.apple.com
   - Cost: $99/year (USD)

2. **Request Certificate**
   - Open Xcode → Preferences → Accounts
   - Add Apple ID
   - Manage Certificates → Create "Developer ID Installer"

3. **Verify Certificate**
   ```bash
   # List certificates
   security find-identity -v -p basic

   # Look for "Developer ID Installer: Company Name (TEAM_ID)"
   ```

### Signing Process

**Option 1: Automatic (during build)**

```bash
# Set environment variable
export DEVELOPER_ID_INSTALLER="Developer ID Installer: PatchIQ Inc (ABC123XYZ)"

# Build and sign
./build-pkg.sh 1.0.0 arm64
```

**Option 2: Manual (after build)**

```bash
# Build without signing
./build-pkg.sh 1.0.0 arm64

# Sign manually
productsign --sign "Developer ID Installer: PatchIQ Inc (ABC123XYZ)" \
    ../../dist/PatchIQAgent-1.0.0-arm64.pkg \
    ../../dist/PatchIQAgent-1.0.0-arm64-signed.pkg

# Verify signature
pkgutil --check-signature ../../dist/PatchIQAgent-1.0.0-arm64-signed.pkg
```

### Verifying Signature

```bash
# Check signature
pkgutil --check-signature PatchIQAgent-1.0.0-arm64.pkg

# Expected output:
#   Package "PatchIQAgent-1.0.0-arm64.pkg":
#      Status: signed by a developer certificate issued by Apple
#      Signed with a trusted timestamp on: 2026-02-14 12:00:00 +0000
#      Certificate Chain:
#       1. Developer ID Installer: PatchIQ Inc (ABC123XYZ)
#       2. Developer ID Certification Authority
#       3. Apple Root CA
```

### Notarization (Optional)

Notarization is required for macOS 10.15+ (Catalina) to avoid Gatekeeper warnings.

**Prerequisites:**
- Signed PKG
- Apple ID credentials
- App-specific password (not regular Apple ID password)

**Notarization Process:**

```bash
# 1. Create app-specific password
#    Visit: https://appleid.apple.com → Security → App-Specific Passwords

# 2. Submit for notarization
xcrun notarytool submit PatchIQAgent-1.0.0-arm64.pkg \
    --apple-id "your@email.com" \
    --password "xxxx-xxxx-xxxx-xxxx" \
    --team-id "ABC123XYZ" \
    --wait

# 3. Staple notarization ticket (after approval)
xcrun stapler staple PatchIQAgent-1.0.0-arm64.pkg

# 4. Verify
spctl --assess -v --type install PatchIQAgent-1.0.0-arm64.pkg
```

**Note:** See `scripts/notarize-macos.sh` from Pipeline 4 for automated notarization.

---

## Testing

### Pre-Flight Checks

Before testing installation, verify:

```bash
# 1. Binary exists and is executable
ls -lh ../../dist/patchiq-agent-darwin-arm64
file ../../dist/patchiq-agent-darwin-arm64

# 2. Binary is for correct architecture
lipo -info ../../dist/patchiq-agent-darwin-arm64

# 3. PKG exists
ls -lh ../../dist/PatchIQAgent-1.0.0-arm64.pkg

# 4. PKG is valid
pkgutil --check-signature ../../dist/PatchIQAgent-1.0.0-arm64.pkg
```

### Installation Testing

**Test 1: Fresh Install**

```bash
# Install
sudo installer -pkg ../../dist/PatchIQAgent-1.0.0-arm64.pkg -target /

# Verify binary
ls -l /usr/local/bin/patchiq-agent
/usr/local/bin/patchiq-agent --version

# Verify LaunchAgent
ls -l ~/Library/LaunchAgents/io.patchiq.agent.plist

# Verify service is running
launchctl list | grep patchiq

# Verify logs
tail -f /var/log/patchiq/agent.log
```

**Test 2: Upgrade Install**

```bash
# Install older version first
sudo installer -pkg PatchIQAgent-1.0.0-arm64.pkg -target /

# Install newer version
sudo installer -pkg PatchIQAgent-2.0.0-arm64.pkg -target /

# Verify version upgraded
/usr/local/bin/patchiq-agent --version

# Verify service restarted
launchctl list | grep patchiq
```

**Test 3: Service Auto-Start**

```bash
# Install
sudo installer -pkg ../../dist/PatchIQAgent-1.0.0-arm64.pkg -target /

# Reboot system
sudo reboot

# After reboot, verify service started
launchctl list | grep patchiq
ps aux | grep patchiq-agent
```

**Test 4: GUI Installation**

```bash
# Open PKG with GUI installer
open ../../dist/PatchIQAgent-1.0.0-arm64.pkg

# Follow installer wizard:
#   1. Welcome screen (verify content)
#   2. License agreement (verify content)
#   3. Installation location (verify default)
#   4. Install button
#   5. Conclusion screen (verify content)

# Verify installation
launchctl list | grep patchiq
```

### Service Testing

```bash
# Check service status
launchctl list | grep patchiq

# Output should show:
#   PID    Status  Label
#   12345  0       io.patchiq.agent

# Stop service
launchctl stop io.patchiq.agent

# Verify stopped
launchctl list | grep patchiq  # Status should show "-"

# Start service
launchctl start io.patchiq.agent

# Verify started
launchctl list | grep patchiq  # Should show PID
```

### Log Verification

```bash
# View standard output
tail -f /var/log/patchiq/agent.log

# View error output
tail -f /var/log/patchiq/agent-error.log

# Check for errors
grep -i error /var/log/patchiq/agent.log
grep -i error /var/log/patchiq/agent-error.log
```

### Test Matrix

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| Fresh Install | Install on clean system | Service running, logs present |
| Upgrade Install | Install over existing version | Version updated, service restarted |
| Downgrade | Install older over newer | Version downgraded, service works |
| Reboot | System reboot after install | Service auto-starts |
| Manual Start/Stop | launchctl stop/start | Service responds correctly |
| GUI Install | Double-click PKG | Installer UI displays correctly |
| CLI Install | installer -pkg command | Silent install succeeds |
| Unsigned PKG | Install unsigned package | Gatekeeper warning (can override) |
| Signed PKG | Install signed package | No warnings, smooth install |
| Notarized PKG | Install notarized package | No warnings, trusted by Gatekeeper |

---

## Uninstallation

### Using the Uninstall Script

```bash
# Navigate to installer directory
cd agent/installer/macos

# Run uninstall script (requires sudo)
sudo ./uninstall.sh

# Follow prompts:
#   1. Confirm uninstallation (y/N)
#   2. Remove log files? (y/N)
#   3. Remove config files? (y/N)
```

### Manual Uninstallation

If the uninstall script is not available:

```bash
# 1. Stop and unload service
launchctl stop io.patchiq.agent
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist

# 2. Remove LaunchAgent plist
rm ~/Library/LaunchAgents/io.patchiq.agent.plist

# 3. Remove agent binary
sudo rm /usr/local/bin/patchiq-agent

# 4. Remove logs (optional)
sudo rm -rf /var/log/patchiq

# 5. Remove config (optional)
rm -rf ~/.patchiq

# 6. Forget package receipt
sudo pkgutil --forget io.patchiq.agent
```

### Verification

```bash
# Verify service stopped
launchctl list | grep patchiq  # Should return nothing

# Verify binary removed
ls /usr/local/bin/patchiq-agent  # Should not exist

# Verify plist removed
ls ~/Library/LaunchAgents/io.patchiq.agent.plist  # Should not exist

# Verify package forgotten
pkgutil --pkgs | grep patchiq  # Should return nothing
```

---

## Troubleshooting

### Build Issues

**Issue: Agent binary not found**

```
Error: Agent binary not found: /path/to/patchiq-agent-darwin-arm64
```

**Solution:**

```bash
# Build agent first
cd ../../
GOOS=darwin GOARCH=arm64 go build -o dist/patchiq-agent-darwin-arm64 ./cmd/agent

# Then build PKG
cd installer/macos
./build-pkg.sh 1.0.0 arm64
```

**Issue: pkgbuild command not found**

```
./build-pkg.sh: line 123: pkgbuild: command not found
```

**Solution:**

```bash
# Install Xcode Command Line Tools
xcode-select --install
```

### Installation Issues

**Issue: Gatekeeper blocks installation**

```
"PatchIQAgent-1.0.0-arm64.pkg" can't be opened because it is from an unidentified developer.
```

**Solution:**

```bash
# Option 1: Right-click → Open (one-time bypass)
# Option 2: System Preferences → Security → Allow Anyway
# Option 3: Sign the package (recommended)
export DEVELOPER_ID_INSTALLER="Developer ID Installer: Company (TEAM)"
./build-pkg.sh 1.0.0 arm64
```

**Issue: Service fails to start**

```bash
# Check logs
tail -f /var/log/patchiq/agent-error.log

# Common causes:
# 1. Binary not executable
sudo chmod +x /usr/local/bin/patchiq-agent

# 2. LaunchAgent plist malformed
plutil -lint ~/Library/LaunchAgents/io.patchiq.agent.plist

# 3. Permissions issue
sudo chown $(whoami) ~/Library/LaunchAgents/io.patchiq.agent.plist
```

**Issue: Service stops after manual start**

**Cause:** `KeepAlive` not working correctly

**Solution:**

```bash
# Edit plist to use SuccessfulExit
# Set <key>SuccessfulExit</key> to <false/>
# This restarts on any exit (not just crashes)
```

### Service Issues

**Issue: Service not auto-starting on reboot**

**Solution:**

```bash
# Verify LaunchAgent is in correct location
ls ~/Library/LaunchAgents/io.patchiq.agent.plist

# Verify RunAtLoad is set
grep -A1 RunAtLoad ~/Library/LaunchAgents/io.patchiq.agent.plist

# Manually load
launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist
```

**Issue: Multiple instances running**

**Solution:**

```bash
# Find all instances
ps aux | grep patchiq-agent

# Kill all instances
pkill -9 patchiq-agent

# Unload LaunchAgent
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist

# Wait a moment
sleep 2

# Load LaunchAgent again
launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist
```

### Log Issues

**Issue: Logs not being written**

**Solution:**

```bash
# Ensure log directory exists
sudo mkdir -p /var/log/patchiq
sudo chmod 755 /var/log/patchiq

# Ensure plist has correct log paths
grep StandardOutPath ~/Library/LaunchAgents/io.patchiq.agent.plist
grep StandardErrorPath ~/Library/LaunchAgents/io.patchiq.agent.plist

# Reload LaunchAgent
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist
launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist
```

---

## Technical Reference

### Package Metadata

```bash
# View package info
pkgutil --pkg-info io.patchiq.agent

# List package files
pkgutil --files io.patchiq.agent

# View package payload
pkgutil --payload-files PatchIQAgent-1.0.0-arm64.pkg

# Extract package
pkgutil --expand PatchIQAgent-1.0.0-arm64.pkg /tmp/pkg-contents
```

### LaunchAgent Commands

```bash
# List all LaunchAgents
launchctl list

# Get service info
launchctl list io.patchiq.agent

# Load LaunchAgent
launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist

# Unload LaunchAgent
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist

# Start service
launchctl start io.patchiq.agent

# Stop service
launchctl stop io.patchiq.agent

# Bootstrap (modern macOS)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/io.patchiq.agent.plist

# Bootout (modern macOS)
launchctl bootout gui/$(id -u)/io.patchiq.agent
```

### File Permissions

```bash
# Agent binary
chmod 755 /usr/local/bin/patchiq-agent
chown root:wheel /usr/local/bin/patchiq-agent

# LaunchAgent plist
chmod 644 ~/Library/LaunchAgents/io.patchiq.agent.plist
chown $(whoami):staff ~/Library/LaunchAgents/io.patchiq.agent.plist

# Log directory
chmod 755 /var/log/patchiq
chown root:wheel /var/log/patchiq

# Log files
chmod 644 /var/log/patchiq/*.log
chown $(whoami):staff /var/log/patchiq/*.log
```

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| macOS Version | 10.13 (High Sierra) | 12.0 (Monterey) or later |
| Architecture | x86_64 (Intel) or arm64 (Apple Silicon) | arm64 (Apple Silicon) |
| Disk Space | 50 MB | 100 MB |
| Memory | 128 MB | 256 MB |
| Network | Internet for updates | Broadband connection |

---

## Related Documentation

- **Pipeline 4**: Security & Code Signing (`docs/agent/PIPELINE-4-PRD.md`)
  - macOS binary signing
  - Notarization process
  - Certificate management

- **Pipeline 5**: Production Packaging (`docs/agent/PIPELINE-5-PRD.md`)
  - Overall packaging strategy
  - Auto-update manifests
  - Multi-platform support

- **Agent Build**: Build instructions (`agent/README.md` or similar)
  - Compiling the Go agent
  - Cross-platform builds
  - Build flags and options

---

## Support

**For installation issues:**
- Email: support@patchiq.io
- Docs: https://docs.patchiq.io

**For development issues:**
- GitHub: https://github.com/patchiq/agent
- Internal: Slack #agent-dev

---

**Document Version:** 1.0
**Last Updated:** 2026-02-14
**Status:** Production Ready
