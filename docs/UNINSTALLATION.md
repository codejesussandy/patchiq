# PatchIQ Agent Uninstallation Guide

This guide provides instructions for completely removing the PatchIQ Agent from all supported platforms.

## Table of Contents

- [Before You Uninstall](#before-you-uninstall)
- [Windows Uninstallation](#windows-uninstallation)
- [macOS Uninstallation](#macos-uninstallation)
- [Debian/Ubuntu Uninstallation](#debianubuntu-uninstallation)
- [RHEL/Fedora Uninstallation](#rhelfedora-uninstallation)
- [Manual Cleanup](#manual-cleanup)
- [Data Retention](#data-retention)

## Before You Uninstall

Before removing the PatchIQ Agent:

1. **Deregister from Hub**: If possible, deregister the agent from the PatchIQ Hub dashboard first
2. **Backup configuration**: Save your configuration file if you plan to reinstall later
3. **Check for running deployments**: Ensure no patches or software deployments are in progress
4. **Review logs**: Export logs if needed for troubleshooting or compliance

## Windows Uninstallation

### Method 1: Using Windows Settings (Windows 10/11)

1. Open **Settings** (Win + I)
2. Go to **Apps** > **Apps & features**
3. Search for "PatchIQ Agent"
4. Click on **PatchIQ Agent**
5. Click **Uninstall**
6. Confirm the uninstallation
7. Wait for the process to complete

### Method 2: Using Control Panel

1. Open **Control Panel**
2. Go to **Programs** > **Programs and Features**
3. Find **PatchIQ Agent** in the list
4. Click **Uninstall**
5. Follow the wizard to complete removal

### Method 3: Using Command Line

**Using msiexec (Administrator Command Prompt):**

```cmd
msiexec /x {ProductCode} /qn

REM Or if you have the original MSI:
msiexec /x PatchIQAgent-1.0.0.msi /qn
```

**Using PowerShell (Administrator):**

```powershell
# Find the product
Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like "PatchIQ*" }

# Uninstall
(Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -eq "PatchIQ Agent" }).Uninstall()
```

### Post-Uninstallation Cleanup (Windows)

The uninstaller should remove all files, but you can manually clean up:

```powershell
# Remove installation directory (if exists)
Remove-Item -Path "C:\Program Files\PatchIQ Agent" -Recurse -Force -ErrorAction SilentlyContinue

# Remove program data (if exists)
Remove-Item -Path "C:\ProgramData\PatchIQ" -Recurse -Force -ErrorAction SilentlyContinue

# Remove registry keys (if exists)
Remove-Item -Path "HKLM:\SOFTWARE\PatchIQ" -Recurse -Force -ErrorAction SilentlyContinue

# Remove logs (if exists)
Remove-Item -Path "C:\Windows\Logs\PatchIQ" -Recurse -Force -ErrorAction SilentlyContinue
```

## macOS Uninstallation

### Method 1: Using Uninstall Script (Recommended)

If the installer package included an uninstall script:

```bash
sudo /usr/local/bin/uninstall-patchiq-agent.sh
```

### Method 2: Manual Uninstallation

**Step 1: Stop and unload the LaunchAgent**

```bash
# For user-level installation
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist

# For system-level installation
sudo launchctl unload /Library/LaunchAgents/io.patchiq.agent.plist
```

**Step 2: Remove the LaunchAgent plist**

```bash
# For user-level installation
rm ~/Library/LaunchAgents/io.patchiq.agent.plist

# For system-level installation
sudo rm /Library/LaunchAgents/io.patchiq.agent.plist
```

**Step 3: Remove the agent binary**

```bash
sudo rm /usr/local/bin/patchiq-agent
```

**Step 4: Remove configuration and data**

```bash
# Remove configuration
sudo rm -rf /usr/local/etc/patchiq-agent

# Remove data directory
sudo rm -rf /usr/local/var/patchiq-agent

# Remove logs
sudo rm -f /tmp/patchiq-agent.log
sudo rm -f /tmp/patchiq-agent.err
```

**Step 5: Remove application directory (if exists)**

```bash
sudo rm -rf "/Applications/PatchIQ Agent.app"
```

### Verification (macOS)

Verify complete removal:

```bash
# Check LaunchAgent is gone
launchctl list | grep patchiq

# Check binary is removed
which patchiq-agent

# Check no leftover files
ls -la ~/Library/LaunchAgents/ | grep patchiq
sudo ls -la /Library/LaunchAgents/ | grep patchiq
```

## Debian/Ubuntu Uninstallation

### Method 1: Remove Package (Keep Configuration)

This removes the package but keeps configuration files:

```bash
sudo dpkg -r patchiq-agent
```

Or using apt:

```bash
sudo apt remove patchiq-agent
```

### Method 2: Purge Package (Remove Everything)

This removes the package AND all configuration files:

```bash
sudo dpkg -P patchiq-agent
```

Or using apt (recommended):

```bash
sudo apt purge patchiq-agent
```

### Post-Uninstallation Cleanup (Debian/Ubuntu)

Check and remove any remaining files:

```bash
# Check for remaining files
dpkg -L patchiq-agent 2>/dev/null

# Remove data directory (if purge didn't remove it)
sudo rm -rf /var/lib/patchiq-agent

# Remove configuration (if purge didn't remove it)
sudo rm -rf /etc/patchiq-agent

# Reload systemd
sudo systemctl daemon-reload
```

### Verification (Debian/Ubuntu)

```bash
# Verify package is removed
dpkg -l | grep patchiq-agent

# Verify service is gone
systemctl status patchiq-agent

# Check for remaining files
sudo find / -name "*patchiq*" 2>/dev/null
```

## RHEL/Fedora Uninstallation

### Method 1: Remove Package (Keep Configuration)

**Using DNF (RHEL 8+, Fedora, Rocky Linux):**

```bash
sudo dnf remove patchiq-agent
```

**Using YUM (RHEL 7, CentOS 7):**

```bash
sudo yum remove patchiq-agent
```

**Using RPM:**

```bash
sudo rpm -e patchiq-agent
```

### Method 2: Purge Package (Remove Everything)

RPM doesn't have a "purge" option like DEB, so we manually remove config:

```bash
# Remove package
sudo dnf remove patchiq-agent

# Remove configuration
sudo rm -rf /etc/patchiq-agent

# Remove data
sudo rm -rf /var/lib/patchiq-agent
```

### Post-Uninstallation Cleanup (RHEL/Fedora)

```bash
# Check for remaining files
rpm -ql patchiq-agent 2>/dev/null

# Remove data directory
sudo rm -rf /var/lib/patchiq-agent

# Remove configuration
sudo rm -rf /etc/patchiq-agent

# Reload systemd
sudo systemctl daemon-reload
```

### Verification (RHEL/Fedora)

```bash
# Verify package is removed
rpm -qa | grep patchiq-agent

# Verify service is gone
systemctl status patchiq-agent

# Check for remaining files
sudo find / -name "*patchiq*" 2>/dev/null
```

## Manual Cleanup

If automated uninstallation fails or leaves remnants, here's a comprehensive manual cleanup:

### Windows Manual Cleanup

```powershell
# Stop service (if still running)
Stop-Service PatchIQAgent -ErrorAction SilentlyContinue
sc.exe delete PatchIQAgent

# Remove files
Remove-Item -Path "C:\Program Files\PatchIQ Agent" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\ProgramData\PatchIQ" -Recurse -Force -ErrorAction SilentlyContinue

# Remove registry keys
Remove-Item -Path "HKLM:\SOFTWARE\PatchIQ" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Services\PatchIQAgent" -Recurse -Force -ErrorAction SilentlyContinue

# Remove from Windows Installer registry
# (This is advanced and typically not needed)
# Get-ChildItem "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" | Where-Object { $_.GetValue("DisplayName") -like "*PatchIQ*" } | Remove-Item -Recurse
```

### macOS Manual Cleanup

```bash
# Stop service
sudo launchctl unload /Library/LaunchAgents/io.patchiq.agent.plist 2>/dev/null
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist 2>/dev/null

# Remove all PatchIQ files
sudo rm -rf /usr/local/bin/patchiq-agent
sudo rm -rf /usr/local/etc/patchiq-agent
sudo rm -rf /usr/local/var/patchiq-agent
sudo rm -rf "/Applications/PatchIQ Agent.app"
sudo rm -f /Library/LaunchAgents/io.patchiq.agent.plist
rm -f ~/Library/LaunchAgents/io.patchiq.agent.plist
sudo rm -f /tmp/patchiq-agent.*

# Search for any remaining files
sudo find / -name "*patchiq*" -print 2>/dev/null
```

### Linux Manual Cleanup

```bash
# Stop and disable service
sudo systemctl stop patchiq-agent 2>/dev/null
sudo systemctl disable patchiq-agent 2>/dev/null

# Remove service file
sudo rm -f /etc/systemd/system/patchiq-agent.service
sudo systemctl daemon-reload

# Remove binary
sudo rm -f /usr/bin/patchiq-agent

# Remove configuration and data
sudo rm -rf /etc/patchiq-agent
sudo rm -rf /var/lib/patchiq-agent
sudo rm -rf /var/log/patchiq-agent

# Search for any remaining files
sudo find / -name "*patchiq*" -print 2>/dev/null
```

## Data Retention

### What Gets Removed

**Always Removed:**
- Agent binary/executable
- System service/LaunchAgent
- Installation directory

**Removed on Purge (Linux apt purge, dpkg -P):**
- Configuration files in `/etc/patchiq-agent/`
- Data directory `/var/lib/patchiq-agent/`

**May Need Manual Removal:**
- Cached packages
- Downloaded software bundles
- Deployment logs
- Inventory data

### What to Backup Before Uninstalling

If you plan to reinstall or need to preserve data:

**Configuration:**
- Windows: `C:\Program Files\PatchIQ Agent\config.yaml`
- macOS: `/usr/local/etc/patchiq-agent/config.yaml`
- Linux: `/etc/patchiq-agent/config.yaml`

**Logs:**
- Windows: Event Viewer logs (export Application log filtered by "PatchIQ Agent")
- macOS: `/tmp/patchiq-agent.log`, `/tmp/patchiq-agent.err`
- Linux: `journalctl -u patchiq-agent > patchiq-logs.txt`

**Data:**
- Cached packages: May be in data directory
- Deployment state: Usually in data directory
- API keys: In configuration file

### Example Backup Script (Linux)

```bash
#!/bin/bash
BACKUP_DIR="$HOME/patchiq-backup-$(date +%Y%m%d-%H%M%S)"

echo "Creating backup in $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Backup configuration
sudo cp -r /etc/patchiq-agent "$BACKUP_DIR/config" 2>/dev/null

# Backup data
sudo cp -r /var/lib/patchiq-agent "$BACKUP_DIR/data" 2>/dev/null

# Export logs
sudo journalctl -u patchiq-agent > "$BACKUP_DIR/logs.txt" 2>/dev/null

# Change ownership
sudo chown -R $USER:$USER "$BACKUP_DIR"

echo "Backup completed: $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

## Re-registration After Uninstall

If you uninstall and later reinstall the agent, you may need to re-register:

1. **Install the agent** (see [INSTALLATION.md](./INSTALLATION.md))
2. **Configure with same API key** to reassociate with existing Hub records
3. **Or generate new API key** if you want a fresh registration

The Hub will:
- Recognize the agent by hostname (if using same hostname)
- Create a new agent record (if hostname changed or new API key)
- Preserve historical data (if reassociating with same agent record)

## Deregistering from Hub

Before uninstalling, you can deregister from the Hub dashboard:

1. Log in to PatchIQ Hub
2. Navigate to **Agents**
3. Find the agent to remove
4. Click **Actions** > **Delete** or **Deregister**
5. Confirm the action

This cleans up the Hub database but doesn't uninstall the agent software.

## Troubleshooting Uninstallation

### Windows: "Uninstall Failed" Error

```powershell
# Try using the original MSI
msiexec /x PatchIQAgent-1.0.0.msi /l*v uninstall.log

# Check uninstall.log for errors

# Force uninstall using Windows Installer Cleanup
# (Use Microsoft's Program Install and Uninstall troubleshooter)
```

### macOS: "Permission Denied" Errors

```bash
# Ensure using sudo
sudo launchctl unload /Library/LaunchAgents/io.patchiq.agent.plist

# Check file ownership
ls -la /Library/LaunchAgents/io.patchiq.agent.plist

# Force removal
sudo rm -f /Library/LaunchAgents/io.patchiq.agent.plist
```

### Linux: Package Dependencies

```bash
# If another package depends on patchiq-agent
sudo apt remove --auto-remove patchiq-agent

# Force removal (not recommended)
sudo dpkg --force-all -r patchiq-agent
```

### Service Won't Stop

**Windows:**
```powershell
# Force stop
Stop-Service PatchIQAgent -Force

# If still running, kill process
Get-Process | Where-Object {$_.Name -like "*patchiq*"} | Stop-Process -Force
```

**macOS/Linux:**
```bash
# Force stop
sudo pkill -9 patchiq-agent

# Or find and kill process
ps aux | grep patchiq-agent
sudo kill -9 <PID>
```

## Support

If you encounter issues during uninstallation:

- **Documentation**: https://docs.patchiq.io
- **Email**: support@patchiq.io
- **Community**: https://community.patchiq.io

## Related Documentation

- [Installation Guide](./INSTALLATION.md)
- [Troubleshooting Installation](./TROUBLESHOOTING-INSTALL.md)
- [Configuration Reference](./CONFIGURATION.md)
