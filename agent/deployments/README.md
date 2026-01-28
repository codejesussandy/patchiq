# Agent Deployment & Privilege Management

## Overview

The PatchIQ agent requires elevated privileges to:
- Install/uninstall software packages
- Apply system patches
- Modify system configurations
- Access protected directories

## Deployment Models

### Linux: Systemd Service (Root)

```bash
# /etc/systemd/system/patchiq-agent.service
[Unit]
Description=PatchIQ Agent
After=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=/opt/patchiq/patchiq-agent --server https://your-server.com/api
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=false
ProtectSystem=false
ProtectHome=read-only
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=patchiq-agent

[Install]
WantedBy=multi-user.target
```

**Installation:**
```bash
sudo cp patchiq-agent /opt/patchiq/
sudo cp patchiq-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable patchiq-agent
sudo systemctl start patchiq-agent
```

### macOS: Launchd Daemon (Root)

```xml
<!-- /Library/LaunchDaemons/com.patchiq.agent.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.patchiq.agent</string>

    <key>ProgramArguments</key>
    <array>
        <string>/opt/patchiq/patchiq-agent</string>
        <string>--server</string>
        <string>https://your-server.com/api</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>UserName</key>
    <string>root</string>

    <key>GroupName</key>
    <string>wheel</string>

    <key>StandardOutPath</key>
    <string>/var/log/patchiq/agent.log</string>

    <key>StandardErrorPath</key>
    <string>/var/log/patchiq/agent-error.log</string>
</dict>
</plist>
```

**Installation:**
```bash
sudo mkdir -p /opt/patchiq /var/log/patchiq
sudo cp patchiq-agent /opt/patchiq/
sudo cp com.patchiq.agent.plist /Library/LaunchDaemons/
sudo launchctl load /Library/LaunchDaemons/com.patchiq.agent.plist
```

### Windows: Windows Service (LocalSystem)

**Using NSSM (Non-Sucking Service Manager):**
```powershell
# Install as Windows Service
nssm install PatchIQAgent "C:\Program Files\PatchIQ\patchiq-agent.exe"
nssm set PatchIQAgent AppParameters "--server https://your-server.com/api"
nssm set PatchIQAgent DisplayName "PatchIQ Agent"
nssm set PatchIQAgent Description "PatchIQ endpoint management agent"
nssm set PatchIQAgent Start SERVICE_AUTO_START
nssm set PatchIQAgent ObjectName LocalSystem
nssm start PatchIQAgent
```

**Native Go Windows Service:**
The agent can be compiled with Windows service support using `golang.org/x/sys/windows/svc`.

## Security Considerations

### 1. Binary Signing
- Linux: Sign with GPG, verify before installation
- macOS: Code sign with Apple Developer certificate, notarize
- Windows: Authenticode signing with EV certificate

### 2. Communication Security
- All backend communication over HTTPS/TLS 1.3
- Certificate pinning for backend connection
- Mutual TLS (mTLS) for high-security environments

### 3. Command Validation
- Agent validates command signatures from backend
- Only executes commands from authenticated backend
- Audit log of all executed commands

### 4. Script Sandboxing (Future)
- Run scripts in isolated namespaces (Linux)
- App Sandbox (macOS)
- AppContainer (Windows)

### 5. Least Privilege for Scripts
Even running as root, scripts should:
- Not modify agent binaries
- Not access agent credentials
- Be isolated to specific directories

## Agent Installation Script

### Linux (Universal)
```bash
#!/bin/bash
set -e

PATCHIQ_SERVER="${1:-https://patchiq.example.com/api}"
INSTALL_DIR="/opt/patchiq"
SERVICE_FILE="/etc/systemd/system/patchiq-agent.service"

echo "Installing PatchIQ Agent..."

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p /var/log/patchiq
mkdir -p /var/lib/patchiq

# Download agent (or copy from local)
# curl -o "$INSTALL_DIR/patchiq-agent" "https://releases.patchiq.com/agent/linux/latest"
cp ./patchiq-agent "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/patchiq-agent"

# Create systemd service
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=PatchIQ Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=$INSTALL_DIR/patchiq-agent --server $PATCHIQ_SERVER
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
systemctl daemon-reload
systemctl enable patchiq-agent
systemctl start patchiq-agent

echo "PatchIQ Agent installed and running!"
systemctl status patchiq-agent --no-pager
```

### macOS (Universal)
```bash
#!/bin/bash
set -e

PATCHIQ_SERVER="${1:-https://patchiq.example.com/api}"
INSTALL_DIR="/opt/patchiq"
PLIST_FILE="/Library/LaunchDaemons/com.patchiq.agent.plist"

echo "Installing PatchIQ Agent..."

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p /var/log/patchiq

# Copy agent
cp ./patchiq-agent "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/patchiq-agent"

# Create launchd plist
cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.patchiq.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/patchiq-agent</string>
        <string>--server</string>
        <string>$PATCHIQ_SERVER</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/patchiq/agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/patchiq/agent-error.log</string>
</dict>
</plist>
EOF

# Load service
launchctl load "$PLIST_FILE"

echo "PatchIQ Agent installed and running!"
```

### Windows (PowerShell)
```powershell
param(
    [string]$Server = "https://patchiq.example.com/api"
)

$ErrorActionPreference = "Stop"
$InstallDir = "C:\Program Files\PatchIQ"
$ServiceName = "PatchIQAgent"

Write-Host "Installing PatchIQ Agent..."

# Create directory
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Copy agent
Copy-Item ".\patchiq-agent.exe" "$InstallDir\patchiq-agent.exe"

# Create Windows Service using sc.exe
$binPath = "`"$InstallDir\patchiq-agent.exe`" --server $Server"
sc.exe create $ServiceName binPath= $binPath start= auto obj= LocalSystem
sc.exe description $ServiceName "PatchIQ endpoint management agent"
sc.exe start $ServiceName

Write-Host "PatchIQ Agent installed and running!"
Get-Service $ServiceName
```

## Updating Agent Scripts

When the agent runs as root/admin, scripts no longer need sudo:

**Before (user mode):**
```bash
#!/bin/bash
sudo apt-get update
sudo apt-get install -y nginx
```

**After (service mode):**
```bash
#!/bin/bash
apt-get update
apt-get install -y nginx
```

The `requiresRoot` flag in manifest.json becomes informational rather than functional when the agent runs as a privileged service.
