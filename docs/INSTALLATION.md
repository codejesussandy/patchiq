# PatchIQ Agent Installation Guide

This guide provides comprehensive instructions for installing the PatchIQ Agent on all supported platforms.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Windows Installation](#windows-installation)
- [macOS Installation](#macos-installation)
- [Debian/Ubuntu Installation](#debianubuntu-installation)
- [RHEL/Fedora Installation](#rhelfedora-installation)
- [Post-Installation Configuration](#post-installation-configuration)
- [Verification](#verification)
- [Silent Installation](#silent-installation)
- [Troubleshooting](#troubleshooting)

## Overview

The PatchIQ Agent is a lightweight system service that:

- Collects hardware and software inventory
- Deploys patches and software packages
- Monitors system security and compliance
- Communicates with the PatchIQ Hub for centralized management

**Supported Platforms:**

- Windows 10/11, Windows Server 2016/2019/2022
- macOS 12+ (Monterey, Ventura, Sonoma)
- Debian 11, 12
- Ubuntu 20.04 LTS, 22.04 LTS, 24.04 LTS
- RHEL 8, 9
- Fedora 38, 39, 40
- Rocky Linux 8, 9
- CentOS Stream 8, 9

**System Requirements:**

- CPU: 1+ core (2+ recommended)
- RAM: 256 MB minimum (512 MB recommended)
- Disk: 200 MB free space
- Network: Outbound HTTPS (443) to PatchIQ Hub

## Prerequisites

### All Platforms

1. **Network Access**: Ensure the agent can reach your PatchIQ Hub server
2. **Administrator/Root Access**: Installation requires elevated privileges
3. **Hub URL and API Key**: Obtain these from your PatchIQ Hub administrator

### Platform-Specific

**Windows:**
- PowerShell 5.1 or later
- Windows Installer 3.1 or later (included in Windows 10+)

**macOS:**
- macOS 12.0 (Monterey) or later
- Administrator account

**Linux (Debian/Ubuntu):**
- `systemd` (included in Ubuntu 15.04+, Debian 8+)
- `ca-certificates` package

**Linux (RHEL/Fedora):**
- `systemd` (included in RHEL 7+, Fedora 15+)
- `ca-certificates` package

## Windows Installation

### Interactive Installation

1. **Download the installer**:
   - Download `PatchIQAgent-x.x.x.msi` from your Hub or distribution server

2. **Run the installer**:
   - Double-click the MSI file
   - Click "Next" on the welcome screen
   - Accept the license agreement
   - Choose installation location (default: `C:\Program Files\PatchIQ Agent\`)
   - Click "Install"
   - Click "Finish"

3. **Verify installation**:
   ```powershell
   Get-Service PatchIQAgent
   ```

### Command-Line Installation

Using Command Prompt (as Administrator):

```cmd
msiexec /i PatchIQAgent-1.0.0.msi /qn
```

Using PowerShell (as Administrator):

```powershell
Start-Process msiexec.exe -ArgumentList '/i', 'PatchIQAgent-1.0.0.msi', '/qn' -Wait
```

### Configuration

After installation, configure the agent:

1. **Edit the configuration file**:
   - Location: `C:\Program Files\PatchIQ Agent\config.yaml`
   - Or via Registry: `HKLM\SOFTWARE\PatchIQ\Agent`

2. **Set Hub URL and API Key**:
   ```yaml
   hub:
     url: "https://your-hub-server.com:3000"
     api_key: "your-api-key-here"
   ```

3. **Restart the service**:
   ```powershell
   Restart-Service PatchIQAgent
   ```

### Service Management

```powershell
# Check service status
Get-Service PatchIQAgent

# Start service
Start-Service PatchIQAgent

# Stop service
Stop-Service PatchIQAgent

# Restart service
Restart-Service PatchIQAgent

# View logs
Get-EventLog -LogName Application -Source "PatchIQ Agent" -Newest 50
```

## macOS Installation

### Interactive Installation

1. **Download the installer**:
   - Download `PatchIQAgent-x.x.x.pkg` from your Hub or distribution server

2. **Run the installer**:
   - Double-click the PKG file
   - Click "Continue" on the introduction screen
   - Read and accept the license agreement
   - Select installation destination (default: Macintosh HD)
   - Click "Install"
   - Enter your administrator password when prompted
   - Click "Close" when installation completes

3. **Verify installation**:
   ```bash
   launchctl list | grep patchiq
   ```

### Command-Line Installation

Using Terminal (requires sudo):

```bash
sudo installer -pkg PatchIQAgent-1.0.0.pkg -target /
```

### Configuration

1. **Edit the configuration file**:
   ```bash
   sudo nano /usr/local/etc/patchiq-agent/config.yaml
   ```

2. **Set Hub URL and API Key**:
   ```yaml
   hub:
     url: "https://your-hub-server.com:3000"
     api_key: "your-api-key-here"
   ```

3. **Restart the service**:
   ```bash
   launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist
   launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist
   ```

   Or for system-wide installation:
   ```bash
   sudo launchctl unload /Library/LaunchAgents/io.patchiq.agent.plist
   sudo launchctl load /Library/LaunchAgents/io.patchiq.agent.plist
   ```

### Service Management

```bash
# Check service status
launchctl list | grep io.patchiq.agent

# Start service
launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist

# Stop service
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist

# View logs
tail -f /tmp/patchiq-agent.log
tail -f /tmp/patchiq-agent.err
```

## Debian/Ubuntu Installation

### Standard Installation

1. **Download the DEB package**:
   ```bash
   wget https://your-distribution-server.com/patchiq-agent_1.0.0_amd64.deb
   ```

2. **Install with dpkg**:
   ```bash
   sudo dpkg -i patchiq-agent_1.0.0_amd64.deb
   ```

### Recommended Installation (Auto-Dependency Resolution)

Using APT (automatically installs missing dependencies):

```bash
sudo apt install ./patchiq-agent_1.0.0_amd64.deb
```

### Repository Installation (If Available)

If your organization has a Debian repository:

1. **Add repository**:
   ```bash
   echo "deb [trusted=yes] https://your-repo.com/debian stable main" | sudo tee /etc/apt/sources.list.d/patchiq.list
   ```

2. **Update and install**:
   ```bash
   sudo apt update
   sudo apt install patchiq-agent
   ```

### Configuration

1. **Edit the configuration file**:
   ```bash
   sudo nano /etc/patchiq-agent/config.yaml
   ```

2. **Set Hub URL and API Key**:
   ```yaml
   hub:
     url: "https://your-hub-server.com:3000"
     api_key: "your-api-key-here"

   agent:
     log_level: "info"
     data_dir: "/var/lib/patchiq-agent"
   ```

3. **Restart the service**:
   ```bash
   sudo systemctl restart patchiq-agent
   ```

### Service Management

```bash
# Check service status
sudo systemctl status patchiq-agent

# Start service
sudo systemctl start patchiq-agent

# Stop service
sudo systemctl stop patchiq-agent

# Restart service
sudo systemctl restart patchiq-agent

# Enable auto-start on boot
sudo systemctl enable patchiq-agent

# Disable auto-start on boot
sudo systemctl disable patchiq-agent

# View logs (real-time)
sudo journalctl -u patchiq-agent -f

# View recent logs
sudo journalctl -u patchiq-agent -n 100

# View logs since boot
sudo journalctl -u patchiq-agent -b
```

## RHEL/Fedora Installation

### Standard Installation

1. **Download the RPM package**:
   ```bash
   wget https://your-distribution-server.com/patchiq-agent-1.0.0-1.x86_64.rpm
   ```

2. **Install with rpm**:
   ```bash
   sudo rpm -ivh patchiq-agent-1.0.0-1.x86_64.rpm
   ```

### Recommended Installation (Auto-Dependency Resolution)

Using DNF (Fedora, RHEL 8+, Rocky Linux 8+):

```bash
sudo dnf install ./patchiq-agent-1.0.0-1.x86_64.rpm
```

Using YUM (RHEL 7, CentOS 7):

```bash
sudo yum localinstall patchiq-agent-1.0.0-1.x86_64.rpm
```

### Repository Installation (If Available)

If your organization has an RPM repository:

1. **Add repository**:
   ```bash
   sudo tee /etc/yum.repos.d/patchiq.repo <<EOF
   [patchiq]
   name=PatchIQ Repository
   baseurl=https://your-repo.com/rpm/el$releasever
   enabled=1
   gpgcheck=0
   EOF
   ```

2. **Install**:
   ```bash
   # RHEL 8+, Fedora, Rocky Linux
   sudo dnf install patchiq-agent

   # RHEL 7, CentOS 7
   sudo yum install patchiq-agent
   ```

### Configuration

1. **Edit the configuration file**:
   ```bash
   sudo nano /etc/patchiq-agent/config.yaml
   ```

2. **Set Hub URL and API Key**:
   ```yaml
   hub:
     url: "https://your-hub-server.com:3000"
     api_key: "your-api-key-here"

   agent:
     log_level: "info"
     data_dir: "/var/lib/patchiq-agent"
   ```

3. **Restart the service**:
   ```bash
   sudo systemctl restart patchiq-agent
   ```

### Service Management

Same as Debian/Ubuntu (uses systemd):

```bash
# Check service status
sudo systemctl status patchiq-agent

# Start/Stop/Restart
sudo systemctl start patchiq-agent
sudo systemctl stop patchiq-agent
sudo systemctl restart patchiq-agent

# Enable/Disable auto-start
sudo systemctl enable patchiq-agent
sudo systemctl disable patchiq-agent

# View logs
sudo journalctl -u patchiq-agent -f
```

## Post-Installation Configuration

### Required Configuration

After installation, you must configure the agent to connect to your Hub:

1. **Hub URL**: The URL of your PatchIQ Hub server
2. **API Key**: Authentication key provided by your Hub administrator

### Configuration File Locations

| Platform          | Configuration File                                    |
|-------------------|------------------------------------------------------|
| Windows           | `C:\Program Files\PatchIQ Agent\config.yaml`         |
| macOS             | `/usr/local/etc/patchiq-agent/config.yaml`           |
| Linux (DEB/RPM)   | `/etc/patchiq-agent/config.yaml`                     |

### Configuration Example

```yaml
# PatchIQ Agent Configuration

# Hub connection settings (REQUIRED)
hub:
  url: "https://patchiq-hub.example.com:3000"
  api_key: "your-api-key-here"

# Agent settings (OPTIONAL)
agent:
  # Log level: debug, info, warn, error
  log_level: "info"

  # Data directory for cached packages and state
  data_dir: "/var/lib/patchiq-agent"

  # Agent name (defaults to hostname)
  name: ""

  # Custom tags for organization
  tags:
    - "production"
    - "web-server"

# Collection settings (OPTIONAL)
collection:
  # Inventory collection interval (minutes)
  interval: 60

  # Collect software inventory
  software: true

  # Collect hardware inventory
  hardware: true

  # Collect network configuration
  network: true

# Deployment settings (OPTIONAL)
deployment:
  # Allow automatic deployments
  auto_deploy: true

  # Maintenance window (24-hour format)
  maintenance_window:
    enabled: false
    start: "02:00"
    end: "06:00"
```

### Applying Configuration Changes

After editing the configuration file, restart the service:

**Windows:**
```powershell
Restart-Service PatchIQAgent
```

**macOS:**
```bash
sudo launchctl unload /Library/LaunchAgents/io.patchiq.agent.plist
sudo launchctl load /Library/LaunchAgents/io.patchiq.agent.plist
```

**Linux:**
```bash
sudo systemctl restart patchiq-agent
```

## Verification

### Check Service Status

**Windows:**
```powershell
Get-Service PatchIQAgent
# Expected: Status = Running, StartType = Automatic
```

**macOS:**
```bash
launchctl list | grep io.patchiq.agent
# Should return process ID if running
```

**Linux:**
```bash
sudo systemctl status patchiq-agent
# Expected: Active: active (running)
```

### Check Agent Registration

Verify the agent appears in your PatchIQ Hub dashboard:

1. Log in to PatchIQ Hub
2. Navigate to "Agents" section
3. Look for the hostname of the installed system
4. Check "Last Seen" timestamp is recent

### Check Logs

**Windows:**
```powershell
Get-EventLog -LogName Application -Source "PatchIQ Agent" -Newest 20
```

**macOS:**
```bash
tail -n 50 /tmp/patchiq-agent.log
```

**Linux:**
```bash
sudo journalctl -u patchiq-agent -n 50
```

Look for messages indicating successful connection to Hub.

### Test Connectivity

Test network connectivity to Hub:

**Windows:**
```powershell
Test-NetConnection your-hub-server.com -Port 3000
```

**macOS/Linux:**
```bash
curl -v https://your-hub-server.com:3000/health
```

## Silent Installation

Silent installation is useful for automated deployments via GPO, SCCM, Ansible, Chef, Puppet, etc.

### Windows Silent Install

```cmd
msiexec /i PatchIQAgent-1.0.0.msi /qn /l*v install.log ^
  HUB_URL="https://hub.example.com:3000" ^
  API_KEY="your-api-key-here"
```

### macOS Silent Install

```bash
sudo installer -pkg PatchIQAgent-1.0.0.pkg -target / -dumplog

# Then configure via file
sudo tee /usr/local/etc/patchiq-agent/config.yaml <<EOF
hub:
  url: "https://hub.example.com:3000"
  api_key: "your-api-key-here"
EOF

sudo launchctl load /Library/LaunchAgents/io.patchiq.agent.plist
```

### Linux Silent Install

**Debian/Ubuntu:**
```bash
# Install package
sudo DEBIAN_FRONTEND=noninteractive dpkg -i patchiq-agent_1.0.0_amd64.deb

# Configure
sudo tee /etc/patchiq-agent/config.yaml <<EOF
hub:
  url: "https://hub.example.com:3000"
  api_key: "your-api-key-here"
EOF

# Restart service
sudo systemctl restart patchiq-agent
```

**RHEL/Fedora:**
```bash
# Install package
sudo rpm -ivh patchiq-agent-1.0.0-1.x86_64.rpm

# Configure
sudo tee /etc/patchiq-agent/config.yaml <<EOF
hub:
  url: "https://hub.example.com:3000"
  api_key: "your-api-key-here"
EOF

# Restart service
sudo systemctl restart patchiq-agent
```

### Ansible Playbook Example

```yaml
---
- name: Install PatchIQ Agent
  hosts: all
  become: yes
  vars:
    hub_url: "https://hub.example.com:3000"
    api_key: "{{ vault_patchiq_api_key }}"

  tasks:
    - name: Install on Debian/Ubuntu
      apt:
        deb: https://repo.example.com/patchiq-agent_1.0.0_amd64.deb
      when: ansible_os_family == "Debian"

    - name: Install on RHEL/Fedora
      dnf:
        name: https://repo.example.com/patchiq-agent-1.0.0-1.x86_64.rpm
        state: present
      when: ansible_os_family == "RedHat"

    - name: Configure agent
      template:
        src: config.yaml.j2
        dest: /etc/patchiq-agent/config.yaml
        mode: '0600'
      notify: restart patchiq-agent

  handlers:
    - name: restart patchiq-agent
      systemd:
        name: patchiq-agent
        state: restarted
```

## Troubleshooting

For installation issues, see [TROUBLESHOOTING-INSTALL.md](./TROUBLESHOOTING-INSTALL.md).

For general agent issues, check:

- Service is running: `systemctl status patchiq-agent`
- Configuration is valid: Check YAML syntax
- Network connectivity: Agent can reach Hub on port 3000/443
- Logs: `journalctl -u patchiq-agent -f`

## Next Steps

1. **Verify agent registration**: Check PatchIQ Hub dashboard
2. **Configure policies**: Set up patch and software deployment policies
3. **Schedule maintenance windows**: Configure automated deployment schedules
4. **Monitor compliance**: Review agent status and compliance reports

## Support

For assistance:

- **Documentation**: https://docs.patchiq.io
- **Email**: support@patchiq.io
- **Community**: https://community.patchiq.io

## Related Documentation

- [Uninstallation Guide](./UNINSTALLATION.md)
- [Troubleshooting Installation](./TROUBLESHOOTING-INSTALL.md)
- [Configuration Reference](./CONFIGURATION.md)
- [Agent Architecture](../agent/README.md)
