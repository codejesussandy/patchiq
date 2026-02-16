# RPM Packaging Guide

This document describes how to build, install, and manage RPM packages for the PatchIQ Agent on Red Hat-based Linux distributions (RHEL, Fedora, CentOS, Rocky Linux, Alma Linux).

## Overview

The PatchIQ Agent RPM package:
- Installs the agent binary to `/usr/bin/patchiq-agent`
- Creates a systemd service for automatic startup
- Enables and starts the service automatically on installation
- Stops and disables the service automatically on uninstallation
- Supports clean upgrades (service keeps running during upgrade)

## Supported Distributions

- **RHEL:** 8, 9
- **Fedora:** 38, 39, 40+
- **CentOS Stream:** 8, 9
- **Rocky Linux:** 8, 9
- **Alma Linux:** 8, 9

## Prerequisites

### Build Requirements

To build RPM packages, you need:

```bash
# On Fedora
sudo dnf install rpm-build rpmdevtools rpmlint

# On RHEL/CentOS/Rocky/Alma
sudo yum install rpm-build rpmdevtools rpmlint
```

### Installation Requirements

The package requires:
- **systemd** - For service management
- **ca-certificates** - For HTTPS connections to Hub

These dependencies are automatically installed if missing.

## Building RPM Packages

### Step 1: Build Agent Binaries

First, ensure the Linux AMD64 binary is built:

```bash
cd /path/to/agent
make release
```

This creates `dist/patchiq-agent-linux-amd64`.

### Step 2: Build RPM Package

```bash
cd installer/rpm
./build-rpm.sh <version> <release>
```

**Examples:**

```bash
# Build version 1.0.0, release 1
./build-rpm.sh 1.0.0 1

# Build version 1.2.3, release 2
./build-rpm.sh 1.2.3 2

# Use defaults (1.0.0-1)
./build-rpm.sh
```

### Step 3: Verify Build

The script will:
1. Create RPM build directories in `~/rpmbuild/`
2. Copy the spec file and binary to appropriate locations
3. Build the RPM package
4. Copy the result to `dist/`
5. Run `rpmlint` validation (if available)

**Output:**

```
dist/patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

The filename includes:
- Package name: `patchiq-agent`
- Version: `1.0.0`
- Release: `1`
- Distribution tag: `fc40` (Fedora 40) or `el9` (RHEL 9)
- Architecture: `x86_64`

## RPM Spec File Structure

### Package Metadata

```spec
Name:           patchiq-agent
Version:        %{version}
Release:        %{release}%{?dist}
Summary:        PatchIQ Agent for Patch and Software Management
License:        Proprietary
URL:            https://patchiq.io
```

- **Name:** Package name (used in `rpm -i patchiq-agent`)
- **Version:** Software version (passed via `--define "version 1.0.0"`)
- **Release:** Package release number (passed via `--define "release 1"`)
- **%{?dist}:** Expands to distribution tag (`.fc40`, `.el9`, etc.)

### Dependencies

```spec
Requires:       systemd
Requires:       ca-certificates
```

These packages must be installed before PatchIQ Agent.

### Description

```spec
%description
The PatchIQ Agent provides automated patch management, software
deployment, and system inventory collection for Linux systems.
```

Multi-line description shown by `rpm -qi patchiq-agent`.

### Install Section

```spec
%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT/usr/bin
mkdir -p $RPM_BUILD_ROOT/etc/systemd/system

# Install binary
install -m 755 %{SOURCE0} $RPM_BUILD_ROOT/usr/bin/patchiq-agent

# Create systemd service file
cat > $RPM_BUILD_ROOT/etc/systemd/system/patchiq-agent.service <<'EOF'
[Unit]
Description=PatchIQ Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/patchiq-agent
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF
```

Creates directory structure and installs files.

### Post-Install Scriptlet

```spec
%post
systemctl daemon-reload
systemctl enable patchiq-agent.service
systemctl start patchiq-agent.service
```

Runs **after** package installation:
1. Reloads systemd to recognize new service
2. Enables service to start on boot
3. Starts service immediately

### Pre-Uninstall Scriptlet

```spec
%preun
if [ $1 -eq 0 ]; then
    systemctl stop patchiq-agent.service
    systemctl disable patchiq-agent.service
fi
```

Runs **before** package removal:
- `$1 -eq 0`: Only on uninstall (not upgrade)
- Stops the running service
- Disables service from auto-start

**Note:** On upgrade (`$1 -eq 1`), service keeps running.

### Post-Uninstall Scriptlet

```spec
%postun
systemctl daemon-reload
```

Runs **after** package removal:
- Reloads systemd to remove service definition

### Files Section

```spec
%files
/usr/bin/patchiq-agent
/etc/systemd/system/patchiq-agent.service
```

Lists all files owned by the package. RPM tracks these for:
- Verification: `rpm -V patchiq-agent`
- Listing: `rpm -ql patchiq-agent`
- Uninstallation: `rpm -e patchiq-agent`

## Installation

### Fresh Install

```bash
sudo rpm -i patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

**What happens:**
1. Package dependencies checked
2. Binary installed to `/usr/bin/patchiq-agent`
3. Service file installed to `/etc/systemd/system/patchiq-agent.service`
4. `%post` scriptlet runs:
   - systemd reloaded
   - Service enabled
   - Service started

### Verify Installation

```bash
# Check service status
systemctl status patchiq-agent

# Expected output:
# ● patchiq-agent.service - PatchIQ Agent
#      Loaded: loaded (/etc/systemd/system/patchiq-agent.service; enabled; ...)
#      Active: active (running) since ...

# View logs
journalctl -u patchiq-agent -f

# List installed files
rpm -ql patchiq-agent

# Check package info
rpm -qi patchiq-agent
```

### Upgrade Package

```bash
sudo rpm -Uvh patchiq-agent-1.0.1-1.fc40.x86_64.rpm
```

**What happens:**
1. New files installed
2. `%post` scriptlet runs
3. Service restarts with new binary
4. Old files removed

**Note:** `%preun` does NOT run during upgrade (`$1 -eq 1`), so service stays running.

### Downgrade Package

```bash
sudo rpm -Uvh --oldpackage patchiq-agent-0.9.0-1.fc40.x86_64.rpm
```

Same behavior as upgrade.

## Uninstallation

### Remove Package

```bash
sudo rpm -e patchiq-agent
```

**What happens:**
1. `%preun` scriptlet runs (`$1 -eq 0`):
   - Service stopped
   - Service disabled
2. Files removed:
   - `/usr/bin/patchiq-agent`
   - `/etc/systemd/system/patchiq-agent.service`
3. `%postun` scriptlet runs:
   - systemd reloaded

### Verify Uninstallation

```bash
# Check package is gone
rpm -q patchiq-agent
# Output: package patchiq-agent is not installed

# Check service is removed
systemctl status patchiq-agent
# Output: Unit patchiq-agent.service could not be found

# Check files are removed
ls /usr/bin/patchiq-agent
# Output: No such file or directory
```

## Package Validation

### rpmlint

`rpmlint` checks RPM packages for common issues:

```bash
rpmlint patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

**Common warnings (acceptable):**

```
patchiq-agent.x86_64: W: no-documentation
patchiq-agent.x86_64: W: no-manual-page-for-binary patchiq-agent
```

These are warnings, not errors. Documentation and man pages are optional.

**Errors to fix:**

```
patchiq-agent.x86_64: E: non-executable-script /usr/bin/patchiq-agent
```

This would indicate the binary isn't executable.

### RPM Verify

Verify installed files haven't changed:

```bash
rpm -V patchiq-agent
```

No output = all files verified successfully.

### RPM Query

```bash
# Show package info
rpm -qi patchiq-agent

# List files
rpm -ql patchiq-agent

# Show dependencies
rpm -qR patchiq-agent

# Show which package owns a file
rpm -qf /usr/bin/patchiq-agent
```

## Systemd Service

### Service File Location

`/etc/systemd/system/patchiq-agent.service`

### Service Configuration

```ini
[Unit]
Description=PatchIQ Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/patchiq-agent
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
```

**Key settings:**

- **Type=simple:** Process runs in foreground
- **ExecStart:** Command to run
- **Restart=always:** Auto-restart on crash
- **RestartSec=10:** Wait 10 seconds before restart
- **User=root:** Run as root (required for system management)
- **WantedBy=multi-user.target:** Start at boot

### Service Management

```bash
# Start service
sudo systemctl start patchiq-agent

# Stop service
sudo systemctl stop patchiq-agent

# Restart service
sudo systemctl restart patchiq-agent

# Enable (start on boot)
sudo systemctl enable patchiq-agent

# Disable (don't start on boot)
sudo systemctl disable patchiq-agent

# Check status
systemctl status patchiq-agent

# View logs
journalctl -u patchiq-agent -f
```

## RPM Macros Used

### %{version} and %{release}

Defined at build time:

```bash
rpmbuild --define "version 1.0.0" --define "release 1" ...
```

### %{?dist}

Distribution tag, auto-detected:
- Fedora 40: `.fc40`
- RHEL 9: `.el9`
- CentOS Stream 9: `.el9`

### %{SOURCE0}

First source file (binary):

```spec
Source0: patchiq-agent-linux-amd64
```

References `~/rpmbuild/SOURCES/patchiq-agent-linux-amd64`

### $RPM_BUILD_ROOT

Build root directory where files are staged before packaging:

```bash
~/rpmbuild/BUILDROOT/patchiq-agent-1.0.0-1.fc40.x86_64/
```

### $1 in Scriptlets

Argument to scriptlet indicating operation:

- **%post:** `$1 = 1` (install), `$1 = 2` (upgrade)
- **%preun:** `$1 = 0` (uninstall), `$1 = 1` (upgrade)
- **%postun:** `$1 = 0` (uninstall), `$1 = 1` (upgrade)

Used to distinguish uninstall from upgrade.

## Build Directory Structure

RPM build uses standard directory structure in `~/rpmbuild/`:

```
~/rpmbuild/
├── BUILD/          # Source extraction and compilation
├── RPMS/           # Built binary RPMs
│   └── x86_64/     # Architecture-specific
├── SOURCES/        # Source files and patches
├── SPECS/          # RPM spec files
└── SRPMS/          # Built source RPMs
```

## Troubleshooting

### Binary Not Found

```
Error: Binary not found at /path/to/dist/patchiq-agent-linux-amd64
```

**Solution:** Build binaries first:

```bash
cd /path/to/agent
make release
```

### rpmbuild Command Not Found

```
bash: rpmbuild: command not found
```

**Solution:** Install rpm-build:

```bash
# Fedora
sudo dnf install rpm-build

# RHEL/CentOS/Rocky/Alma
sudo yum install rpm-build
```

### Permission Denied During Install

```
error: can't create transaction lock on /var/lib/rpm/.rpm.lock
```

**Solution:** Use sudo:

```bash
sudo rpm -i patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

### Service Fails to Start

```bash
# Check service status
systemctl status patchiq-agent

# View full logs
journalctl -u patchiq-agent -n 100

# Check binary permissions
ls -l /usr/bin/patchiq-agent

# Test binary directly
/usr/bin/patchiq-agent --version
```

### Package Already Installed

```
package patchiq-agent-1.0.0-1.fc40.x86_64 is already installed
```

**Solution:** Use upgrade instead:

```bash
sudo rpm -Uvh patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

Or remove first:

```bash
sudo rpm -e patchiq-agent
sudo rpm -i patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

## Distribution-Specific Notes

### RHEL 8

- Requires subscription or CentOS Stream 8
- Use `el8` tag: `patchiq-agent-1.0.0-1.el8.x86_64.rpm`

### RHEL 9

- Requires subscription or CentOS Stream 9
- Use `el9` tag: `patchiq-agent-1.0.0-1.el9.x86_64.rpm`

### Fedora

- Latest Fedora (40+) recommended
- Use `fc40` tag: `patchiq-agent-1.0.0-1.fc40.x86_64.rpm`

### Rocky Linux / Alma Linux

- RHEL-compatible rebuild
- Use same tags as RHEL (`el8`, `el9`)

## Best Practices

1. **Always test packages on target distributions** before production deployment
2. **Use rpmlint** to catch common packaging issues
3. **Keep release numbers incremented** for each rebuild of same version
4. **Document changes** in %changelog section of spec file
5. **Test upgrade path** from previous version before releasing
6. **Verify service auto-start** after reboot

## Reference Links

- [RPM Packaging Guide](https://rpm-packaging-guide.github.io/)
- [Fedora Packaging Guidelines](https://docs.fedoraproject.org/en-US/packaging-guidelines/)
- [systemd Service Files](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [rpmlint Documentation](https://github.com/rpm-software-management/rpmlint)

## Support

For issues with RPM packaging, contact:
- Email: support@patchiq.io
- Documentation: https://docs.patchiq.io
