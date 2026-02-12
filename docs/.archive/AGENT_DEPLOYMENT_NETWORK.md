# Agent Network Deployment Guide

**Last Updated:** 2026-02-08
**Purpose:** Configure PatchIQ agents to connect from external devices to your server

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Setup Analysis](#current-setup-analysis)
3. [Production Deployment Options](#production-deployment-options)
4. [Configuration Methods](#agent-configuration-methods)
5. [Network Security](#network-security)
6. [Step-by-Step Setup](#step-by-step-setup)
7. [Agent Installation Scripts](#agent-installation-scripts)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Current Development Setup (localhost)

```
┌─────────────────┐
│   Developer     │
│   Machine       │
│                 │
│  ┌──────────┐  │
│  │ Backend  │  │  localhost:6001
│  │   API    │◄─┼─────┐
│  └──────────┘  │     │
│                 │     │
│  ┌──────────┐  │     │
│  │  Agent   │──┼─────┘
│  │ (Go bin) │  │
│  └──────────┘  │
└─────────────────┘
```

**Problem:** Agents on external devices cannot reach `localhost:6001`

### Production Setup (external agents)

```
                    Internet/Network
                          │
                    ┌─────▼──────┐
                    │  Firewall  │
                    │ (Port 3500)│
                    └─────┬──────┘
                          │
              ┌───────────▼────────────┐
              │   PatchIQ Server       │
              │  (dev.skenzeriq.com)   │
              │                        │
              │  ┌──────────────────┐  │
              │  │     Nginx        │  │
              │  │   (Port 80)      │  │
              │  │  Reverse Proxy   │  │
              │  └────────┬─────────┘  │
              │           │            │
              │  ┌────────▼─────────┐  │
              │  │    Backend       │  │
              │  │  (Port 3000)     │  │
              │  │   /api/agent/*   │  │
              │  └──────────────────┘  │
              └────────────────────────┘
                          ▲
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼─────┐    ┌────▼─────┐    ┌────▼─────┐
    │ Agent 1  │    │ Agent 2  │    │ Agent 3  │
    │ Windows  │    │  macOS   │    │  Linux   │
    └──────────┘    └──────────┘    └──────────┘
    Remote Office    Home Office     Data Center
```

---

## Current Setup Analysis

### ✅ What's Already Configured

From your `.env.example`:

```bash
# Public access configuration (ALREADY SET)
PUBLIC_SCHEME=http
PUBLIC_HOST=dev.skenzeriq.com
PUBLIC_PORT=3500

# Agent server URL (ALREADY SET)
PATCHIQ_SERVER_URL=http://dev.skenzeriq.com:3500/api
```

### ✅ Nginx Reverse Proxy (ALREADY CONFIGURED)

From `nginx.conf:64-72`:

```nginx
# Agent API (for agents to communicate)
location /api/agent {
    proxy_pass http://backend:3000/api/agent;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### ✅ Agent Configuration System (ALREADY IMPLEMENTED)

The agent already supports multiple configuration methods:

1. **Environment Variable**: `PATCHIQ_SERVER_URL`
2. **Config File**: `~/.patchify-agent/config.json`
3. **Command Line**: `--server http://your-server:3500/api`
4. **Interactive Setup**: `--setup` wizard
5. **Compile-time Default**: Build-time `ldflags`

---

## Production Deployment Options

### Option 1: Public Internet Deployment (Recommended for SaaS)

**Use Case:** PatchIQ hosted on cloud, agents on customer networks

```
┌────────────────────────────────────────────┐
│           Cloud Provider                   │
│  ┌──────────────────────────────────────┐  │
│  │   PatchIQ Server                     │  │
│  │   https://patchiq.yourcompany.com    │  │
│  │   Port: 443 (HTTPS)                  │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
                    ▲
                    │ HTTPS/TLS
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐     ┌─────▼─────┐   ┌────▼────┐
│Agent 1│     │  Agent 2  │   │ Agent 3 │
│Office │     │   Home    │   │  Cloud  │
└───────┘     └───────────┘   └─────────┘
```

**Requirements:**
- ✅ Domain name (e.g., `patchiq.yourcompany.com`)
- ✅ SSL/TLS certificate (Let's Encrypt or commercial)
- ✅ Firewall rules (allow port 443 inbound)
- ✅ Load balancer (optional, for HA)

**Pros:**
- Works from anywhere
- Simple agent configuration (single URL)
- Easy to scale

**Cons:**
- Requires public exposure (security risk)
- Need SSL certificate management
- Potential DDoS target

---

### Option 2: VPN/Private Network (Recommended for Enterprise)

**Use Case:** Enterprise with existing VPN infrastructure

```
┌────────────────────────────────────────────┐
│          Corporate Network                 │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   PatchIQ Server                     │  │
│  │   http://patchiq.internal.corp       │  │
│  │   Port: 3500 (HTTP - internal)       │  │
│  └──────────────────────────────────────┘  │
│                    ▲                       │
│                    │                       │
│    ┌───────────────┼───────────────┐       │
│    │               │               │       │
│ ┌──▼───┐     ┌─────▼─────┐   ┌────▼────┐  │
│ │Agent1│     │  Agent 2  │   │ Agent 3 │  │
│ │Office│     │   DC      │   │  Cloud  │  │
│ └──────┘     └───────────┘   └─────────┘  │
│                                            │
└────────────────────────────────────────────┘
         │                    │
         │  VPN Tunnel        │
         ▼                    ▼
    ┌────────┐          ┌──────────┐
    │ Remote │          │  Remote  │
    │ Agent  │          │  Agent   │
    └────────┘          └──────────┘
```

**Requirements:**
- ✅ VPN infrastructure (WireGuard, OpenVPN, Tailscale, etc.)
- ✅ Internal DNS or hosts file
- ✅ No public exposure needed

**Pros:**
- Most secure (no public exposure)
- Leverages existing VPN
- No SSL certificate needed (internal)

**Cons:**
- Requires VPN on all devices
- VPN overhead on performance
- More complex setup

---

### Option 3: Cloudflare Tunnel / Ngrok (Recommended for Dev/Testing)

**Use Case:** Quick testing without port forwarding

```
┌────────────────────────────────────────────┐
│           Cloudflare / Ngrok               │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   Tunnel Service                     │  │
│  │   https://random-name.trycloudflare  │  │
│  └───────────────┬──────────────────────┘  │
└──────────────────┼─────────────────────────┘
                   │ Encrypted Tunnel
         ┌─────────▼──────────┐
         │  Your Local Dev    │
         │  Machine           │
         │  localhost:3500    │
         └────────────────────┘
                   ▲
                   │
         ┌─────────┴──────────┐
         │                    │
    ┌────▼─────┐        ┌─────▼────┐
    │ Agent 1  │        │ Agent 2  │
    └──────────┘        └──────────┘
```

**Requirements:**
- ✅ Cloudflare account or Ngrok account
- ✅ Tunnel client running on server

**Pros:**
- Zero firewall configuration
- Free SSL certificate
- Works from anywhere

**Cons:**
- **NOT for production** (random URLs, rate limits)
- Single point of failure
- Latency overhead

---

### Option 4: Hybrid (DMZ + Internal)

**Use Case:** Mix of internal and external agents

```
                  Internet
                     │
              ┌──────▼───────┐
              │  DMZ Server  │
              │  Public IP   │ ◄───── External Agents
              └──────┬───────┘
                     │ Firewall
              ┌──────▼───────┐
              │   Internal   │
              │   Network    │ ◄───── Internal Agents
              └──────────────┘
```

**Requirements:**
- ✅ DMZ configuration
- ✅ Firewall rules between DMZ and internal network
- ✅ Two DNS entries (public + internal)

**Pros:**
- Balanced security
- Flexibility for different agent types

**Cons:**
- Complex network setup
- Two URLs to manage

---

## Agent Configuration Methods

### Method 1: Environment Variable (Recommended for Services)

**Linux/macOS:**
```bash
# Export before starting agent
export PATCHIQ_SERVER_URL="https://patchiq.yourcompany.com/api"
./patchiq-agent
```

**Windows (PowerShell):**
```powershell
$env:PATCHIQ_SERVER_URL = "https://patchiq.yourcompany.com/api"
.\patchiq-agent.exe
```

**Systemd Service (Linux):**
```ini
[Service]
Environment="PATCHIQ_SERVER_URL=https://patchiq.yourcompany.com/api"
ExecStart=/opt/patchiq/patchiq-agent
```

---

### Method 2: Command-Line Flag (Manual Installs)

```bash
# Start with explicit server URL
./patchiq-agent --server https://patchiq.yourcompany.com/api

# Configuration is auto-saved to ~/.patchify-agent/config.json
```

**Agent will auto-save this configuration** so future runs don't need the flag.

---

### Method 3: Config File (Persistent Configuration)

**Location:**
- Linux/macOS: `~/.patchify-agent/config.json` or `/etc/patchify-agent/config.json`
- Windows: `%USERPROFILE%\.patchify-agent\config.json`

**Example `config.json`:**
```json
{
  "serverUrl": "https://patchiq.yourcompany.com/api",
  "webUiPort": 5003,
  "enableWebUi": true,
  "heartbeatIntervalSeconds": 60,
  "inventoryIntervalSeconds": 21600,
  "telemetryIntervalSeconds": 60,
  "collectHardware": true,
  "collectSoftware": true,
  "collectNetwork": true,
  "collectSecurity": true,
  "collectPeripherals": true,
  "collectTelemetry": true,
  "logLevel": "info",
  "dataDir": "/var/lib/patchiq-agent"
}
```

---

### Method 4: Interactive Setup Wizard (User-Friendly)

```bash
./patchiq-agent --setup
```

**Output:**
```
╔═══════════════════════════════════════════════════╗
║         Patchify Agent Setup Wizard               ║
╚═══════════════════════════════════════════════════╝

Enter PatchIQ Server URL [http://localhost:6001/api]: https://patchiq.yourcompany.com/api
Enter Web UI Port [5003]: 5003

─────────────────────────────────────────────────────
Configuration Summary:
  Server URL:  https://patchiq.yourcompany.com/api
  Web UI Port: 5003
  Config File: ~/.patchify-agent/config.json
─────────────────────────────────────────────────────

✓ Configuration saved successfully!

To start the agent, run:
  ./patchify-agent
```

---

### Method 5: Compile-Time Default (Build-Time Injection)

**When building agents for distribution:**

```bash
# Build with embedded server URL
cd agent
go build -ldflags "-X main.defaultServerURL=https://patchiq.yourcompany.com/api" \
  -o patchiq-agent ./cmd/agent

# Agents built this way default to your server
```

**Pros:**
- Users don't need to configure anything
- Simplified deployment

**Cons:**
- Need separate builds for different environments
- Can still be overridden by config/env/flag

---

## Network Security

### Minimum Security Requirements

#### 1. HTTPS/TLS (CRITICAL for Production)

**Current setup uses HTTP** - **MUST** upgrade to HTTPS for production.

**Why HTTPS is critical:**
- Agent credentials transmitted during registration
- Access tokens transmitted with every request
- Inventory data contains sensitive system information
- Prevents man-in-the-middle attacks

**Implementation:**

**Option A: Let's Encrypt (Free, Automated)**

```yaml
# docker-compose.yml (add service)
certbot:
  image: certbot/certbot
  volumes:
    - ./certbot/conf:/etc/letsencrypt
    - ./certbot/www:/var/www/certbot
  command: certonly --webroot -w /var/www/certbot --email admin@yourcompany.com -d patchiq.yourcompany.com --agree-tos
```

**Option B: Commercial Certificate**

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name patchiq.yourcompany.com;

    ssl_certificate /etc/nginx/certs/patchiq.crt;
    ssl_certificate_key /etc/nginx/certs/patchiq.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of config
}
```

---

#### 2. Firewall Rules

**On Server:**

```bash
# Allow HTTPS from anywhere
sudo ufw allow 443/tcp comment 'PatchIQ HTTPS'

# Allow HTTP (for Let's Encrypt renewal)
sudo ufw allow 80/tcp comment 'HTTP redirect to HTTPS'

# Block direct access to backend
sudo ufw deny 3000/tcp comment 'Backend (nginx only)'

# Allow database only from localhost
sudo ufw deny 4500/tcp comment 'PostgreSQL (internal only)'
```

**On Agent Machines:**

```bash
# Outbound HTTPS to PatchIQ server
# (Usually allowed by default, but check corporate firewalls)

# Agent WebUI (optional - for local diagnostics only)
sudo ufw allow from 127.0.0.1 to any port 5003
```

---

#### 3. Authentication & Authorization

**Already implemented** in the agent:

```go
// From backend.go:162-176
// Agent registers with machine ID
req := &client.RegisterRequest{
    MachineID:    machineID,
    Hostname:     hostname,
    OS:           osName,
    OSVersion:    osVersion,
    Architecture: runtime.GOARCH,
    AgentVersion: m.agentVersion,
    IPAddress:    ipAddress,
}

resp, err := m.client.Register(req)

// Gets access token + refresh token
// Tokens used for all subsequent requests
```

**Security features:**
- ✅ Token-based authentication
- ✅ Access token + refresh token pattern
- ✅ Automatic token refresh before expiry
- ✅ Re-registration on auth failures
- ✅ Credentials stored securely in `~/.patchify-agent/credentials.json`

---

#### 4. Rate Limiting (Nginx)

```nginx
# Add to nginx.conf
http {
    # Rate limit agent registration (1 req/sec per IP)
    limit_req_zone $binary_remote_addr zone=agent_reg:10m rate=1r/s;

    # Rate limit heartbeats (2 req/sec per IP - allow burst)
    limit_req_zone $binary_remote_addr zone=agent_hb:10m rate=2r/s;

    server {
        # Agent registration endpoint
        location /api/agent/register {
            limit_req zone=agent_reg burst=3;
            proxy_pass http://backend:3000/api/agent/register;
        }

        # Agent heartbeat endpoint
        location /api/agent/heartbeat {
            limit_req zone=agent_hb burst=10;
            proxy_pass http://backend:3000/api/agent/heartbeat;
        }
    }
}
```

---

#### 5. IP Whitelisting (Optional - for VPN setups)

```nginx
# Allow only from corporate network
location /api/agent {
    allow 10.0.0.0/8;      # Internal network
    allow 192.168.1.0/24;  # Office network
    deny all;

    proxy_pass http://backend:3000/api/agent;
}
```

---

## Step-by-Step Setup

### Scenario 1: Public Cloud Deployment (AWS/GCP/Azure)

#### Step 1: Provision Server

```bash
# Example: AWS EC2
# - Instance Type: t3.medium (2 vCPU, 4GB RAM)
# - OS: Ubuntu 22.04 LTS
# - Storage: 50GB SSD
# - Security Group: Allow 80, 443 inbound
```

#### Step 2: Configure DNS

```bash
# Point your domain to the server IP
patchiq.yourcompany.com  →  52.12.34.56 (A record)
```

#### Step 3: Update .env File

```bash
# Edit .env on server
PUBLIC_SCHEME=https
PUBLIC_HOST=patchiq.yourcompany.com
PUBLIC_PORT=443
PATCHIQ_SERVER_URL=https://patchiq.yourcompany.com/api
```

#### Step 4: Configure SSL Certificate

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d patchiq.yourcompany.com

# Auto-renewal (already configured by certbot)
sudo systemctl status certbot.timer
```

#### Step 5: Update nginx.conf

```nginx
server {
    listen 80;
    server_name patchiq.yourcompany.com;
    return 301 https://$host$request_uri;  # Redirect to HTTPS
}

server {
    listen 443 ssl http2;
    server_name patchiq.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/patchiq.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/patchiq.yourcompany.com/privkey.pem;

    # ... rest of your existing nginx.conf
}
```

#### Step 6: Deploy Stack

```bash
# On server
git clone <your-repo>
cd patchiq-full-dev-sandy
cp .env.example .env
# Edit .env with values from Step 3
make dev
```

#### Step 7: Verify Backend is Reachable

```bash
# From external machine
curl https://patchiq.yourcompany.com/health
# Should return: {"status":"healthy"}

curl https://patchiq.yourcompany.com/v1/health
# Should return backend health
```

#### Step 8: Deploy Agents

**On each agent machine:**

```bash
# Download agent binary
wget https://patchiq.yourcompany.com/downloads/patchiq-agent-linux-amd64
chmod +x patchiq-agent-linux-amd64

# Run setup wizard
./patchiq-agent-linux-amd64 --setup
# Enter: https://patchiq.yourcompany.com/api

# Or run directly
./patchiq-agent-linux-amd64 --server https://patchiq.yourcompany.com/api
```

#### Step 9: Verify Agent Registration

**On server:**

```bash
# Check backend logs
docker logs patchiq_backend | grep "Agent registered"

# Or check database
docker exec -it patchiq_db psql -U postgres -d patchiq_dev \
  -c "SELECT id, hostname, \"os\", \"createdAt\" FROM \"Asset\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

---

### Scenario 2: Internal VPN Deployment (Tailscale)

#### Step 1: Install Tailscale on Server

```bash
# On PatchIQ server
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

#### Step 2: Get Tailscale IP

```bash
tailscale ip -4
# Example output: 100.64.0.1
```

#### Step 3: Update .env

```bash
PUBLIC_SCHEME=http
PUBLIC_HOST=100.64.0.1
PUBLIC_PORT=3500
PATCHIQ_SERVER_URL=http://100.64.0.1:3500/api
```

#### Step 4: Install Tailscale on Agent Machines

```bash
# On each agent machine
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

#### Step 5: Deploy Agent

```bash
./patchiq-agent --server http://100.64.0.1:3500/api
```

**Pros:**
- Encrypted mesh VPN
- No firewall changes needed
- Works across NATs

---

## Agent Installation Scripts

### Linux (Ubuntu/Debian)

Create `install-agent-linux.sh`:

```bash
#!/bin/bash
set -e

SERVER_URL="${1:-https://patchiq.yourcompany.com/api}"
INSTALL_DIR="/opt/patchiq"
SERVICE_FILE="/etc/systemd/system/patchiq-agent.service"

echo "Installing PatchIQ Agent..."
echo "Server URL: $SERVER_URL"

# Download agent binary
sudo mkdir -p "$INSTALL_DIR"
sudo wget -O "$INSTALL_DIR/patchiq-agent" \
  "https://patchiq.yourcompany.com/downloads/patchiq-agent-linux-amd64"
sudo chmod +x "$INSTALL_DIR/patchiq-agent"

# Create systemd service
sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=PatchIQ Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Environment="PATCHIQ_SERVER_URL=$SERVER_URL"
ExecStart=$INSTALL_DIR/patchiq-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable patchiq-agent
sudo systemctl start patchiq-agent

echo "✓ PatchIQ Agent installed and running!"
echo "Check status: sudo systemctl status patchiq-agent"
echo "View logs: sudo journalctl -u patchiq-agent -f"
```

**Usage:**
```bash
curl -fsSL https://install.patchiq.yourcompany.com/linux.sh | sudo bash -s -- https://patchiq.yourcompany.com/api
```

---

### macOS

Create `install-agent-macos.sh`:

```bash
#!/bin/bash
set -e

SERVER_URL="${1:-https://patchiq.yourcompany.com/api}"
INSTALL_DIR="/opt/patchiq"
PLIST_FILE="/Library/LaunchDaemons/com.patchiq.agent.plist"

echo "Installing PatchIQ Agent..."
echo "Server URL: $SERVER_URL"

# Download agent binary
sudo mkdir -p "$INSTALL_DIR"
sudo curl -fsSL -o "$INSTALL_DIR/patchiq-agent" \
  "https://patchiq.yourcompany.com/downloads/patchiq-agent-darwin-$(uname -m)"
sudo chmod +x "$INSTALL_DIR/patchiq-agent"

# Create launchd plist
sudo tee "$PLIST_FILE" > /dev/null <<EOF
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
        <string>$SERVER_URL</string>
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

# Create log directory
sudo mkdir -p /var/log/patchiq

# Load service
sudo launchctl load "$PLIST_FILE"

echo "✓ PatchIQ Agent installed and running!"
echo "Check logs: tail -f /var/log/patchiq/agent.log"
```

---

### Windows (PowerShell)

Create `Install-Agent.ps1`:

```powershell
param(
    [string]$ServerURL = "https://patchiq.yourcompany.com/api"
)

$ErrorActionPreference = "Stop"
$InstallDir = "C:\Program Files\PatchIQ"
$ServiceName = "PatchIQAgent"

Write-Host "Installing PatchIQ Agent..."
Write-Host "Server URL: $ServerURL"

# Download agent binary
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$DownloadURL = "https://patchiq.yourcompany.com/downloads/patchiq-agent-windows-amd64.exe"
Invoke-WebRequest -Uri $DownloadURL -OutFile "$InstallDir\patchiq-agent.exe"

# Create Windows Service using NSSM (recommended)
# Or use sc.exe for native service

# Option 1: Native service (requires agent to support Windows service mode)
$binPath = "`"$InstallDir\patchiq-agent.exe`" --server $ServerURL"
sc.exe create $ServiceName binPath= $binPath start= auto obj= LocalSystem
sc.exe description $ServiceName "PatchIQ endpoint management agent"
sc.exe start $ServiceName

Write-Host "✓ PatchIQ Agent installed and running!"
Write-Host "Check status: Get-Service $ServiceName"
```

---

## Troubleshooting

### Agent Can't Connect to Server

**Symptom:**
```
Backend communication failed: dial tcp: lookup patchiq.yourcompany.com: no such host
```

**Checks:**
```bash
# 1. DNS resolution
nslookup patchiq.yourcompany.com

# 2. Network connectivity
ping patchiq.yourcompany.com

# 3. Port accessibility
telnet patchiq.yourcompany.com 443

# Or use curl
curl -v https://patchiq.yourcompany.com/health
```

**Solutions:**
- Check DNS configuration
- Verify firewall rules
- Ensure server is running: `docker ps`

---

### SSL Certificate Errors

**Symptom:**
```
x509: certificate signed by unknown authority
```

**Solution for Self-Signed Certs (DEV ONLY):**

```bash
# NOT RECOMMENDED FOR PRODUCTION
# Add flag to agent (testing only)
./patchiq-agent --server https://patchiq.yourcompany.com/api --insecure
```

**Proper Solution:**
- Use Let's Encrypt or commercial certificate
- Install CA certificate on agent machines

---

### Agent Registered but Not Showing in UI

**Checks:**

```bash
# Check agent logs
sudo journalctl -u patchiq-agent -n 50

# Check agent is registered
./patchiq-agent --status

# Check backend logs
docker logs patchiq_backend | grep -i agent

# Query database directly
docker exec -it patchiq_db psql -U postgres -d patchiq_dev \
  -c "SELECT * FROM \"Asset\" ORDER BY \"createdAt\" DESC LIMIT 1;"
```

---

### Firewall Blocking Agent

**Corporate Firewall:**

Many corporate firewalls block outbound connections on non-standard ports.

**Solutions:**
1. Use standard HTTPS port (443)
2. Request firewall rule from IT
3. Use VPN/Tailscale
4. Set up proxy support in agent (may need to implement)

---

### High Bandwidth Usage

**Check telemetry frequency:**

```json
// ~/.patchify-agent/config.json
{
  "heartbeatIntervalSeconds": 300,   // 5 minutes (instead of 60s)
  "telemetryIntervalSeconds": 300,   // 5 minutes
  "inventoryIntervalSeconds": 43200  // 12 hours (instead of 6h)
}
```

**Bandwidth estimates:**
- Heartbeat: ~1 KB/min (60s interval) = 1.4 MB/day
- Telemetry: ~30 KB/min (60s interval) = 42 MB/day
- Inventory: ~300 KB every 6h = 1.2 MB/day

**Reduce frequency for lower bandwidth.**

---

## Next Steps

1. ✅ Review `.env.example` and set `PUBLIC_HOST`/`PUBLIC_PORT`
2. ✅ Agent already has configuration system - just needs server URL
3. ❌ Set up HTTPS/TLS with Let's Encrypt
4. ❌ Configure firewall rules (allow port 443)
5. ❌ Create agent installation scripts
6. ❌ Test agent registration from external network
7. ❌ Document agent deployment for your team

---

## Security Checklist

- [ ] HTTPS/TLS enabled (443) ← **CRITICAL**
- [ ] HTTP redirects to HTTPS
- [ ] SSL certificate auto-renewal configured
- [ ] Firewall allows only 80/443 inbound
- [ ] Backend port 3000 not exposed directly
- [ ] Database port 4500 not exposed externally
- [ ] Strong JWT_SECRET set in .env
- [ ] Rate limiting configured in nginx
- [ ] Agent authentication working
- [ ] Token refresh working
- [ ] Credentials stored securely on agents
- [ ] Agent WebUI only accessible on localhost
- [ ] Server URL validation in agent registration

---

**Summary:**

Your infrastructure is **90% ready** for external agents! You just need to:

1. **Enable HTTPS** (Let's Encrypt)
2. **Update `.env`** with your public domain
3. **Deploy agents** with `--server https://yourdomain.com/api`

The agent already has all the configuration mechanisms built-in. 🎉
