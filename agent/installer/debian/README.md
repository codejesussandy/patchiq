# Debian/Ubuntu DEB Package

This directory contains the build scripts and resources for creating DEB packages for Debian-based Linux distributions (Debian, Ubuntu, Linux Mint, etc.).

## Prerequisites

- `dpkg-deb` (usually pre-installed on Debian/Ubuntu)
- `lintian` (optional, for package validation)
- Agent binary built for Linux AMD64

## Building the Package

```bash
cd installer/debian
./build-deb.sh 1.0.0
```

This will create: `../../dist/patchiq-agent_1.0.0_amd64.deb`

## Package Contents

The DEB package includes:

- **Binary**: `/usr/bin/patchiq-agent`
- **Systemd Service**: `/etc/systemd/system/patchiq-agent.service`
- **Configuration**: `/etc/patchiq-agent/config.yaml`
- **Data Directory**: `/var/lib/patchiq-agent` (created on install)

## Installation

### Standard Installation

```bash
sudo dpkg -i patchiq-agent_1.0.0_amd64.deb
```

### Recommended Installation (with dependency resolution)

```bash
sudo apt install ./patchiq-agent_1.0.0_amd64.deb
```

## Post-Installation

The package will:

1. Install the binary to `/usr/bin/patchiq-agent`
2. Create the systemd service file
3. Create the default configuration file
4. Reload systemd
5. Enable the service to start on boot
6. Start the service immediately

## Verification

Check service status:

```bash
systemctl status patchiq-agent
```

View logs:

```bash
journalctl -u patchiq-agent -f
```

## Configuration

Edit the configuration file:

```bash
sudo nano /etc/patchiq-agent/config.yaml
```

Restart the service after configuration changes:

```bash
sudo systemctl restart patchiq-agent
```

## Uninstallation

Remove the package but keep configuration:

```bash
sudo dpkg -r patchiq-agent
```

Remove the package and all data (purge):

```bash
sudo dpkg -P patchiq-agent
```

## Package Maintenance Scripts

- **postinst**: Runs after installation (creates directories, enables/starts service)
- **prerm**: Runs before removal (stops/disables service)
- **postrm**: Runs after removal (cleans up data on purge)

## Systemd Service

The service is configured with:

- **Auto-start**: Enabled on boot
- **Auto-restart**: Always restarts on failure
- **Security**: Hardened with NoNewPrivileges, PrivateTmp, ProtectSystem
- **Logging**: Integrated with journald

## Testing

Test the package on:

- Ubuntu 20.04 LTS (Focal Fossa)
- Ubuntu 22.04 LTS (Jammy Jellyfish)
- Ubuntu 24.04 LTS (Noble Numbat)
- Debian 11 (Bullseye)
- Debian 12 (Bookworm)

## Dependencies

- `systemd`: For service management
- `ca-certificates`: For TLS/SSL certificate verification

## Lintian Validation

If `lintian` is installed, the build script will automatically validate the package:

```bash
lintian patchiq-agent_1.0.0_amd64.deb
```

Common warnings (acceptable):

- `binary-without-manpage`: We don't provide a man page yet
- `new-package-should-close-itp-bug`: Not applicable for proprietary packages

## Troubleshooting

### Package Won't Install

```bash
# Check for conflicting packages
dpkg -l | grep patchiq

# Force reinstall
sudo dpkg -i --force-overwrite patchiq-agent_1.0.0_amd64.deb
```

### Service Won't Start

```bash
# Check service status
systemctl status patchiq-agent

# View detailed logs
journalctl -u patchiq-agent -n 50

# Check binary permissions
ls -la /usr/bin/patchiq-agent

# Test binary manually
/usr/bin/patchiq-agent --version
```

### Dependencies Missing

```bash
# Install dependencies manually
sudo apt install systemd ca-certificates

# Or use apt to install the package (auto-resolves dependencies)
sudo apt install ./patchiq-agent_1.0.0_amd64.deb
```

## Build Artifacts

The build process creates:

1. `patchiq-agent_1.0.0_amd64/` - Temporary build directory (cleaned up after build)
2. `../../dist/patchiq-agent_1.0.0_amd64.deb` - Final package

## Architecture Support

Currently supports:

- **amd64** (x86_64): Intel/AMD 64-bit processors

Future support planned:

- **arm64**: ARM 64-bit processors (Raspberry Pi 4, AWS Graviton, etc.)

## Version Numbering

Follows semantic versioning:

- `1.0.0` - Major.Minor.Patch
- Debian revision: `-1` (appended automatically by dpkg)

## References

- [Debian Binary Package Building HOWTO](https://tldp.org/HOWTO/html_single/Debian-Binary-Package-Building-HOWTO/)
- [Debian Policy Manual](https://www.debian.org/doc/debian-policy/)
- [systemd Service Files](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
