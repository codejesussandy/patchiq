# RPM Installer for PatchIQ Agent

This directory contains files for building RPM packages for Red Hat-based Linux distributions.

## Files

- **`patchiq-agent.spec`** - RPM spec file defining package metadata, dependencies, and installation scripts
- **`build-rpm.sh`** - Build script that creates the RPM package
- **`README.md`** - This file

## Quick Start

### Prerequisites

```bash
# On Fedora
sudo dnf install rpm-build rpmdevtools rpmlint

# On RHEL/CentOS/Rocky/Alma
sudo yum install rpm-build rpmdevtools rpmlint
```

### Build Package

```bash
# Build with default version (1.0.0-1)
./build-rpm.sh

# Build with specific version
./build-rpm.sh 1.0.0 1

# Build version 1.2.3, release 2
./build-rpm.sh 1.2.3 2
```

### Install Package

```bash
# Install
sudo rpm -i ../../dist/patchiq-agent-1.0.0-1.*.rpm

# Verify installation
systemctl status patchiq-agent

# View logs
journalctl -u patchiq-agent -f
```

### Uninstall Package

```bash
sudo rpm -e patchiq-agent
```

## Supported Distributions

- RHEL 8, 9
- Fedora 38, 39, 40+
- CentOS Stream 8, 9
- Rocky Linux 8, 9
- Alma Linux 8, 9

## Package Details

**Installation locations:**
- Binary: `/usr/bin/patchiq-agent`
- Service: `/etc/systemd/system/patchiq-agent.service`

**Auto-start:**
- Service is enabled and started automatically on installation
- Service is stopped and disabled automatically on uninstallation

**Dependencies:**
- systemd
- ca-certificates

## Documentation

See [docs/RPM-PACKAGING.md](/agent/docs/RPM-PACKAGING.md) for complete documentation including:
- Detailed build instructions
- RPM spec file structure
- Installation and uninstallation procedures
- Service management
- Troubleshooting
- Distribution-specific notes

## Testing

After building, test the package:

```bash
# Install
sudo rpm -i ../../dist/patchiq-agent-1.0.0-1.*.rpm

# Verify service is running
systemctl status patchiq-agent

# List installed files
rpm -ql patchiq-agent

# Check package info
rpm -qi patchiq-agent

# Verify files
rpm -V patchiq-agent

# Uninstall
sudo rpm -e patchiq-agent

# Verify service is removed
systemctl status patchiq-agent  # Should show "could not be found"
```

## Build Process

The build script:

1. Creates RPM build directory structure in `~/rpmbuild/`
2. Copies spec file to `~/rpmbuild/SPECS/`
3. Copies binary from `../../dist/` to `~/rpmbuild/SOURCES/`
4. Runs `rpmbuild` to build the package
5. Copies result to `../../dist/`
6. Runs `rpmlint` validation (if available)

## Troubleshooting

### Binary not found

```
Error: Binary not found at .../dist/patchiq-agent-linux-amd64
```

**Solution:** Build binaries first:

```bash
cd ../..
make release
```

### rpmbuild not found

```
bash: rpmbuild: command not found
```

**Solution:** Install rpm-build:

```bash
sudo dnf install rpm-build  # Fedora
sudo yum install rpm-build  # RHEL
```

## Support

For issues, see:
- [RPM Packaging Documentation](/agent/docs/RPM-PACKAGING.md)
- [PatchIQ Support](mailto:support@patchiq.io)
