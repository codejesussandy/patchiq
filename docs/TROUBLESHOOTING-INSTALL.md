# PatchIQ Agent Installation Troubleshooting

This guide helps you diagnose and resolve common installation issues.

## Table of Contents

- [General Troubleshooting Steps](#general-troubleshooting-steps)
- [Windows Issues](#windows-issues)
- [macOS Issues](#macos-issues)
- [Linux Issues](#linux-issues)
- [Network Connectivity Issues](#network-connectivity-issues)
- [Service Start Issues](#service-start-issues)
- [Permission Issues](#permission-issues)
- [Log File Locations](#log-file-locations)

## General Troubleshooting Steps

Before diving into platform-specific issues, try these general steps:

1. **Verify System Requirements**
   - Check OS version is supported
   - Ensure sufficient disk space (200 MB minimum)
   - Verify network connectivity to Hub

2. **Check Prerequisites**
   - Administrator/root privileges
   - Latest installer version
   - All dependencies installed

3. **Review Installation Logs**
   - Check installer logs for errors
   - Review service logs after installation

4. **Verify Configuration**
   - Confirm Hub URL is correct
   - Verify API key is valid
   - Check YAML syntax in config file

5. **Test Network Connectivity**
   - Ping Hub server
   - Test HTTPS connectivity on required port
   - Check firewall rules

## Windows Issues

### Issue: MSI Installation Fails with Error 1603

**Symptoms:**
- Installation exits with error code 1603
- Error message: "Fatal error during installation"

**Causes:**
- Insufficient permissions
- Corrupted installer
- Conflicting software
- Insufficient disk space

**Solutions:**

1. **Run as Administrator:**
   ```powershell
   # Right-click MSI and select "Run as Administrator"
   # Or use command line:
   Start-Process msiexec.exe -ArgumentList '/i', 'PatchIQAgent-1.0.0.msi', '/l*v', 'install.log' -Verb RunAs -Wait
   ```

2. **Check installation log:**
   ```powershell
   # Review install.log for specific errors
   Get-Content install.log | Select-String -Pattern "error", "failed"
   ```

3. **Clear Windows Installer cache:**
   ```cmd
   net stop msiserver
   del %WINDIR%\Installer\*.msi
   net start msiserver
   ```

4. **Verify disk space:**
   ```powershell
   Get-PSDrive C | Select-Object Free
   ```

### Issue: Service Fails to Start After Installation

**Symptoms:**
- Installation completes but service shows "Stopped"
- Event Viewer shows service start errors

**Solutions:**

1. **Check service status:**
   ```powershell
   Get-Service PatchIQAgent | Format-List *
   ```

2. **Try manual start:**
   ```powershell
   Start-Service PatchIQAgent -Verbose
   ```

3. **Check Event Viewer:**
   ```powershell
   Get-EventLog -LogName Application -Source "PatchIQ Agent" -Newest 20 | Format-List
   ```

4. **Verify binary exists:**
   ```powershell
   Test-Path "C:\Program Files\PatchIQ Agent\patchiq-agent.exe"
   ```

5. **Check service account permissions:**
   ```powershell
   # Service should run as Local System
   Get-WmiObject Win32_Service | Where-Object {$_.Name -eq "PatchIQAgent"} | Select-Object Name, StartName
   ```

### Issue: Windows Defender/Antivirus Blocks Installation

**Symptoms:**
- Installation fails or service crashes
- Antivirus logs show PatchIQ Agent blocked

**Solutions:**

1. **Add exclusions in Windows Defender:**
   ```powershell
   Add-MpPreference -ExclusionPath "C:\Program Files\PatchIQ Agent"
   Add-MpPreference -ExclusionProcess "patchiq-agent.exe"
   ```

2. **Temporarily disable real-time protection:**
   ```powershell
   Set-MpPreference -DisableRealtimeMonitoring $true
   # Install agent
   Set-MpPreference -DisableRealtimeMonitoring $false
   ```

3. **Check antivirus quarantine:**
   - Open Windows Security
   - Go to Virus & threat protection
   - Check Protection history
   - Restore if PatchIQ files were quarantined

### Issue: Registry Access Denied

**Symptoms:**
- Installation fails with registry access error
- Service can't read configuration from registry

**Solutions:**

1. **Verify registry permissions:**
   ```powershell
   Get-Acl "HKLM:\SOFTWARE\PatchIQ" | Format-List
   ```

2. **Fix registry permissions:**
   ```powershell
   $acl = Get-Acl "HKLM:\SOFTWARE\PatchIQ"
   $rule = New-Object System.Security.AccessControl.RegistryAccessRule("SYSTEM","FullControl","Allow")
   $acl.SetAccessRule($rule)
   Set-Acl "HKLM:\SOFTWARE\PatchIQ" $acl
   ```

## macOS Issues

### Issue: PKG Installation Fails - "Unidentified Developer"

**Symptoms:**
- macOS blocks installation
- Error: "PatchIQAgent.pkg can't be opened because it is from an unidentified developer"

**Solutions:**

1. **Allow installation (temporary):**
   - Right-click PKG file
   - Hold Option key and select "Open"
   - Click "Open" in the dialog

2. **Bypass Gatekeeper (not recommended for production):**
   ```bash
   sudo spctl --master-disable
   # Install package
   sudo spctl --master-enable
   ```

3. **Request notarized installer:**
   - Contact your administrator for properly signed/notarized PKG

### Issue: LaunchAgent Won't Load

**Symptoms:**
- Installation completes but agent doesn't start
- `launchctl list | grep patchiq` returns nothing

**Solutions:**

1. **Check LaunchAgent plist exists:**
   ```bash
   ls -la ~/Library/LaunchAgents/io.patchiq.agent.plist
   ls -la /Library/LaunchAgents/io.patchiq.agent.plist
   ```

2. **Verify plist syntax:**
   ```bash
   plutil -lint ~/Library/LaunchAgents/io.patchiq.agent.plist
   ```

3. **Check permissions:**
   ```bash
   ls -la ~/Library/LaunchAgents/io.patchiq.agent.plist
   # Should be -rw-r--r-- or -rw-r--r--@
   ```

4. **Fix permissions:**
   ```bash
   chmod 644 ~/Library/LaunchAgents/io.patchiq.agent.plist
   ```

5. **Load manually:**
   ```bash
   launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist
   launchctl start io.patchiq.agent
   ```

6. **Check error logs:**
   ```bash
   tail -f /tmp/patchiq-agent.err
   ```

### Issue: Binary Permission Denied

**Symptoms:**
- LaunchAgent loaded but agent won't execute
- Error: "Permission denied" in logs

**Solutions:**

1. **Check binary exists and is executable:**
   ```bash
   ls -la /usr/local/bin/patchiq-agent
   # Should be -rwxr-xr-x
   ```

2. **Fix permissions:**
   ```bash
   sudo chmod +x /usr/local/bin/patchiq-agent
   ```

3. **Check quarantine attribute (Catalina+):**
   ```bash
   xattr -l /usr/local/bin/patchiq-agent
   ```

4. **Remove quarantine:**
   ```bash
   sudo xattr -dr com.apple.quarantine /usr/local/bin/patchiq-agent
   ```

### Issue: Full Disk Access Required (Catalina+)

**Symptoms:**
- Agent runs but can't access certain files
- Errors about disk access in logs

**Solutions:**

1. **Grant Full Disk Access:**
   - Open System Preferences
   - Go to Security & Privacy
   - Select Privacy tab
   - Select Full Disk Access
   - Click the lock to make changes
   - Add `/usr/local/bin/patchiq-agent`

## Linux Issues

### Issue: DEB/RPM Installation - Missing Dependencies

**Symptoms:**
- dpkg/rpm reports missing dependencies
- Error: "dependency is not installed"

**Solutions:**

**Debian/Ubuntu:**
```bash
# Install dependencies manually
sudo apt update
sudo apt install systemd ca-certificates

# Or use apt to auto-resolve dependencies
sudo apt install ./patchiq-agent_1.0.0_amd64.deb
```

**RHEL/Fedora:**
```bash
# Install dependencies manually
sudo dnf install systemd ca-certificates

# Or use dnf to auto-resolve dependencies
sudo dnf install ./patchiq-agent-1.0.0-1.x86_64.rpm
```

### Issue: Systemd Service Fails to Start

**Symptoms:**
- Installation completes but service won't start
- `systemctl status patchiq-agent` shows "failed"

**Solutions:**

1. **Check service status:**
   ```bash
   sudo systemctl status patchiq-agent -l
   ```

2. **Check journalctl logs:**
   ```bash
   sudo journalctl -u patchiq-agent -n 50 --no-pager
   ```

3. **Verify binary exists:**
   ```bash
   ls -la /usr/bin/patchiq-agent
   ```

4. **Check binary is executable:**
   ```bash
   # Should be -rwxr-xr-x
   sudo chmod +x /usr/bin/patchiq-agent
   ```

5. **Test binary manually:**
   ```bash
   /usr/bin/patchiq-agent --version
   ```

6. **Check service file syntax:**
   ```bash
   systemd-analyze verify /etc/systemd/system/patchiq-agent.service
   ```

7. **Reload systemd:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart patchiq-agent
   ```

### Issue: SELinux Blocking Service (RHEL/Fedora)

**Symptoms:**
- Service fails to start on RHEL/Fedora
- SELinux denials in audit log

**Solutions:**

1. **Check SELinux status:**
   ```bash
   getenforce
   ```

2. **Check for denials:**
   ```bash
   sudo ausearch -m avc -ts recent | grep patchiq
   ```

3. **Temporarily set to permissive (testing only):**
   ```bash
   sudo setenforce 0
   sudo systemctl restart patchiq-agent
   # If works, SELinux is the issue
   sudo setenforce 1
   ```

4. **Create SELinux policy:**
   ```bash
   # Generate policy from denials
   sudo ausearch -m avc -ts recent | audit2allow -M patchiq-agent
   sudo semodule -i patchiq-agent.pp
   ```

5. **Or disable SELinux for testing (not recommended for production):**
   ```bash
   # Edit /etc/selinux/config
   SELINUX=permissive
   # Reboot
   ```

### Issue: Package Already Installed

**Symptoms:**
- Installation fails: "package is already installed"

**Solutions:**

**Debian/Ubuntu:**
```bash
# Remove old version first
sudo dpkg -r patchiq-agent
sudo apt install ./patchiq-agent_1.0.0_amd64.deb

# Or force reinstall
sudo dpkg -i --force-overwrite patchiq-agent_1.0.0_amd64.deb
```

**RHEL/Fedora:**
```bash
# Remove old version
sudo rpm -e patchiq-agent
sudo rpm -ivh patchiq-agent-1.0.0-1.x86_64.rpm

# Or upgrade
sudo rpm -Uvh patchiq-agent-1.0.0-1.x86_64.rpm
```

## Network Connectivity Issues

### Issue: Can't Connect to Hub

**Symptoms:**
- Agent installed but not appearing in Hub
- Logs show connection errors

**Solutions:**

1. **Test basic connectivity:**
   ```bash
   # Ping Hub server
   ping your-hub-server.com

   # Test HTTPS connectivity
   curl -v https://your-hub-server.com:3000/health
   ```

2. **Check DNS resolution:**
   ```bash
   nslookup your-hub-server.com
   dig your-hub-server.com
   ```

3. **Test specific port:**
   ```bash
   # Linux/macOS
   nc -zv your-hub-server.com 3000
   telnet your-hub-server.com 3000

   # Windows
   Test-NetConnection your-hub-server.com -Port 3000
   ```

4. **Check firewall rules:**
   ```bash
   # Linux (iptables)
   sudo iptables -L -n -v | grep 3000

   # Linux (firewalld)
   sudo firewall-cmd --list-all

   # Windows
   Get-NetFirewallRule | Where-Object {$_.Enabled -eq 'True'} | Format-Table
   ```

5. **Test with proxy (if applicable):**
   ```bash
   export https_proxy=http://proxy.example.com:8080
   curl -v https://your-hub-server.com:3000/health
   ```

### Issue: TLS/SSL Certificate Errors

**Symptoms:**
- Connection fails with certificate error
- Logs show "x509: certificate signed by unknown authority"

**Solutions:**

1. **Test certificate:**
   ```bash
   openssl s_client -connect your-hub-server.com:3000 -showcerts
   ```

2. **Install CA certificate (Linux):**
   ```bash
   # Ubuntu/Debian
   sudo cp your-ca.crt /usr/local/share/ca-certificates/
   sudo update-ca-certificates

   # RHEL/Fedora
   sudo cp your-ca.crt /etc/pki/ca-trust/source/anchors/
   sudo update-ca-trust
   ```

3. **Verify ca-certificates package installed:**
   ```bash
   # Debian/Ubuntu
   dpkg -l | grep ca-certificates

   # RHEL/Fedora
   rpm -qa | grep ca-certificates
   ```

### Issue: API Key Authentication Fails

**Symptoms:**
- Agent connects but gets 401/403 errors
- Hub rejects agent registration

**Solutions:**

1. **Verify API key in config:**
   ```bash
   # Linux
   sudo cat /etc/patchiq-agent/config.yaml | grep api_key

   # macOS
   cat /usr/local/etc/patchiq-agent/config.yaml | grep api_key

   # Windows
   Get-Content "C:\Program Files\PatchIQ Agent\config.yaml" | Select-String api_key
   ```

2. **Regenerate API key from Hub:**
   - Log in to Hub
   - Go to Settings > API Keys
   - Generate new key
   - Update agent configuration
   - Restart agent

3. **Check for whitespace/formatting issues:**
   ```bash
   # Ensure no extra spaces or quotes
   api_key: "abc123"  # Correct
   api_key: " abc123" # Wrong (leading space)
   api_key: abc123    # Acceptable (no quotes)
   ```

## Service Start Issues

### Issue: Service Starts Then Immediately Crashes

**Symptoms:**
- Service starts but stops within seconds
- Repeated crash/restart cycles

**Solutions:**

1. **Check crash logs:**
   ```bash
   # Linux
   sudo journalctl -u patchiq-agent --since "5 minutes ago"

   # macOS
   tail -f /tmp/patchiq-agent.err

   # Windows
   Get-EventLog -LogName Application -Source "PatchIQ Agent" -Newest 20
   ```

2. **Test binary manually:**
   ```bash
   # Run directly to see error output
   /usr/bin/patchiq-agent
   ```

3. **Check configuration syntax:**
   ```bash
   # Validate YAML
   python3 -c "import yaml; yaml.safe_load(open('/etc/patchiq-agent/config.yaml'))"
   ```

4. **Common YAML errors:**
   - Missing quotes around URLs
   - Incorrect indentation (must use spaces, not tabs)
   - Missing colons
   - Duplicate keys

5. **Use example config:**
   ```bash
   # Start with minimal config
   cat > /etc/patchiq-agent/config.yaml <<EOF
   hub:
     url: "https://hub.example.com:3000"
     api_key: "your-key-here"
   EOF
   ```

### Issue: Service Won't Stop

**Symptoms:**
- Service stop command hangs
- Service shows "stopping" but never stops

**Solutions:**

1. **Force stop (Linux):**
   ```bash
   sudo systemctl kill -s SIGTERM patchiq-agent
   # If still running:
   sudo systemctl kill -s SIGKILL patchiq-agent
   ```

2. **Force stop (macOS):**
   ```bash
   sudo pkill -9 patchiq-agent
   ```

3. **Force stop (Windows):**
   ```powershell
   Stop-Service PatchIQAgent -Force
   # Or:
   Stop-Process -Name "patchiq-agent" -Force
   ```

## Permission Issues

### Issue: Config File Permission Denied

**Symptoms:**
- Agent can't read configuration file
- Permission denied errors in logs

**Solutions:**

1. **Fix config permissions (Linux):**
   ```bash
   sudo chown root:root /etc/patchiq-agent/config.yaml
   sudo chmod 600 /etc/patchiq-agent/config.yaml
   ```

2. **Fix config permissions (macOS):**
   ```bash
   sudo chown root:wheel /usr/local/etc/patchiq-agent/config.yaml
   sudo chmod 644 /usr/local/etc/patchiq-agent/config.yaml
   ```

3. **Fix config permissions (Windows):**
   ```powershell
   $acl = Get-Acl "C:\Program Files\PatchIQ Agent\config.yaml"
   $acl.SetAccessRuleProtection($true, $false)
   $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM","FullControl","Allow")
   $acl.AddAccessRule($rule)
   Set-Acl "C:\Program Files\PatchIQ Agent\config.yaml" $acl
   ```

### Issue: Data Directory Permission Denied

**Symptoms:**
- Agent can't write to data directory
- Errors about creating/writing files

**Solutions:**

```bash
# Linux
sudo mkdir -p /var/lib/patchiq-agent
sudo chown root:root /var/lib/patchiq-agent
sudo chmod 755 /var/lib/patchiq-agent

# macOS
sudo mkdir -p /usr/local/var/patchiq-agent
sudo chown root:wheel /usr/local/var/patchiq-agent
sudo chmod 755 /usr/local/var/patchiq-agent

# Windows
New-Item -ItemType Directory -Path "C:\ProgramData\PatchIQ" -Force
icacls "C:\ProgramData\PatchIQ" /grant "SYSTEM:(OI)(CI)F" /T
```

## Log File Locations

### Windows

- **Event Viewer**: Application log, source "PatchIQ Agent"
- **Installation Log**: `%TEMP%\install.log` (if /l*v used)
- **Service Log**: Check Event Viewer

**View logs:**
```powershell
Get-EventLog -LogName Application -Source "PatchIQ Agent" -Newest 50 | Format-List
```

### macOS

- **Standard Output**: `/tmp/patchiq-agent.log`
- **Standard Error**: `/tmp/patchiq-agent.err`
- **System Log**: Use Console.app

**View logs:**
```bash
tail -f /tmp/patchiq-agent.log
tail -f /tmp/patchiq-agent.err
```

### Linux

- **systemd Journal**: Primary log destination
- **Syslog**: May also log to syslog

**View logs:**
```bash
# Real-time
sudo journalctl -u patchiq-agent -f

# Last 100 lines
sudo journalctl -u patchiq-agent -n 100

# Since boot
sudo journalctl -u patchiq-agent -b

# Specific time range
sudo journalctl -u patchiq-agent --since "2026-02-14 10:00" --until "2026-02-14 11:00"

# Export to file
sudo journalctl -u patchiq-agent > patchiq-logs.txt
```

## Getting Help

If these troubleshooting steps don't resolve your issue:

1. **Collect diagnostic information:**
   - OS version: `uname -a` (Linux/macOS) or `systeminfo` (Windows)
   - Agent version: Check package version
   - Service status: `systemctl status patchiq-agent`
   - Logs: Last 50-100 lines
   - Configuration: Sanitized config file (remove API key)

2. **Contact support:**
   - **Email**: support@patchiq.io
   - **Documentation**: https://docs.patchiq.io
   - **Community**: https://community.patchiq.io

3. **Include in support request:**
   - Operating system and version
   - Installation method (MSI/PKG/DEB/RPM)
   - Error messages (full text)
   - Relevant log excerpts
   - Steps already attempted

## Related Documentation

- [Installation Guide](./INSTALLATION.md)
- [Uninstallation Guide](./UNINSTALLATION.md)
- [Configuration Reference](./CONFIGURATION.md)
