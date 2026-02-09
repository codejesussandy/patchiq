# PatchIQ Software Download & Hub Setup Guide

## Overview

This guide walks you through **downloading base software** and **uploading it to the PatchIQ Hub** so agents can install it on endpoints.

## 🎯 The Big Picture

```
┌─────────────────────┐
│  1. DOWNLOAD        │  ← You are here!
│  Base Software      │     Download installers from vendors
│  from Vendors       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. UPLOAD          │
│  to MinIO Hub       │     Store in central repository
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. CREATE          │
│  Package Bundles    │     Add install scripts
│  with Scripts       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. DEPLOY          │
│  to Endpoints       │     Agents download & install
└─────────────────────┘
```

---

## Step 1: Download Base Software

### 1.1 Run Download Script

```bash
cd /home/patchiq/patchiq-full-dev-sandy/scripts

# Download all platforms
./download-base-software.sh all

# Or download specific platform
./download-base-software.sh windows
./download-base-software.sh linux
./download-base-software.sh macos
```

### 1.2 What Gets Downloaded

**Windows (8 packages):**
- ✅ Google Chrome (latest)
- ✅ Mozilla Firefox (latest)
- ✅ 7-Zip (23.01)
- ✅ Adobe Acrobat Reader
- ✅ VLC Media Player
- ✅ Notepad++ (8.6.2)
- ✅ Visual Studio Code (latest)
- ✅ Git for Windows (2.43.0)

**Linux (6 packages):**
- ✅ Google Chrome (.deb)
- ✅ Visual Studio Code (.deb)
- ✅ Slack Desktop (.deb)
- ✅ TeamViewer (.deb)
- ✅ Firefox (via snap/apt - script-based)
- ✅ VLC (via apt - script-based)

**macOS (5 packages):**
- ✅ Google Chrome (.dmg)
- ✅ Mozilla Firefox (.dmg)
- ✅ Visual Studio Code (.zip)
- ✅ Slack (.dmg)
- ✅ VLC Media Player (.dmg)

### 1.3 Verify Downloads

```bash
# Check downloaded files
find software-downloads -type f -name "*.exe" -o -name "*.deb" -o -name "*.dmg"

# Check file sizes (should be non-zero)
du -sh software-downloads/*

# Example output:
# 156M    software-downloads/windows
# 282M    software-downloads/linux
# 394M    software-downloads/macos
```

### 1.4 Whitelist Verification

All download URLs are from **pre-approved whitelist sources**:

| Software | Vendor | Whitelist Source |
|----------|--------|------------------|
| Chrome | Google | `dl.google.com` ✅ |
| Firefox | Mozilla | `download.mozilla.org` ✅ |
| VSCode | Microsoft | `update.code.visualstudio.com` ✅ |
| 7-Zip | 7-Zip | `7-zip.org` ✅ |
| VLC | VideoLAN | `get.videolan.org` ✅ |
| Slack | Salesforce | `downloads.slack-edge.com` ✅ |
| Git | GitHub | `github.com` ✅ |
| TeamViewer | TeamViewer | `download.teamviewer.com` ✅ |

---

## Step 2: Upload to Hub (MinIO)

### 2.1 Set Authentication Token

```bash
# Get token from PatchIQ (login first)
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@patchiq.io", "password": "admin123"}' \
  | jq -r '.accessToken'

# Export token
export PATCHIQ_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2.2 Run Upload Script

```bash
./upload-to-hub.sh
```

**What happens:**
1. ✅ Creates package record in database
2. ✅ Calculates SHA256 checksum
3. ✅ Uploads file to MinIO storage
4. ✅ Links package to file in MinIO

### 2.3 Verify Upload

```bash
# Check packages in Hub
curl http://localhost:3000/v1/hub/packages \
  -H "Authorization: Bearer $PATCHIQ_TOKEN" \
  | jq '.data[] | {packageId, name, platform, bundleSize}'

# Example output:
# {
#   "packageId": "chrome-win-latest",
#   "name": "chrome",
#   "platform": "windows",
#   "bundleSize": 156832000
# }
```

---

## Step 3: Create Installation Scripts

Now that files are in the Hub, add install/uninstall scripts:

### 3.1 Simple Approach: Inline Scripts

For packages with straightforward installation:

```bash
# Update Chrome package with install script
curl -X PATCH http://localhost:3000/v1/hub/packages/chrome-win-latest \
  -H "Authorization: Bearer $PATCHIQ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scriptsIncluded": true,
    "scriptInstall": "#!/usr/bin/env powershell\n$installer = \"ChromeStandaloneSetup64.exe\"\nStart-Process $installer -ArgumentList \"/silent /install\" -Wait\nWrite-Host \"Chrome installed\"",
    "scriptUninstall": "#!/usr/bin/env powershell\n$chrome = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -like \"*Chrome*\" }\n$chrome.Uninstall()\nWrite-Host \"Chrome uninstalled\""
  }'
```

### 3.2 Advanced Approach: Full Bundles

For complex installations with multiple files:

```bash
# Create bundle directory
mkdir -p chrome-bundle/files

# Add installer
cp software-downloads/windows/browsers/ChromeStandaloneSetup64.exe chrome-bundle/files/

# Create install script
cat > chrome-bundle/install.ps1 << 'EOF'
# Chrome Silent Install
$installer = Join-Path $PSScriptRoot "files\ChromeStandaloneSetup64.exe"
Start-Process $installer -ArgumentList "/silent /install" -Wait -NoNewWindow

if (Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe") {
    Write-Host "Chrome installed successfully"
    exit 0
} else {
    Write-Error "Chrome installation failed"
    exit 1
}
EOF

# Create manifest
cat > chrome-bundle/manifest.json << 'EOF'
{
  "package": "chrome",
  "version": "120.0",
  "platform": "windows",
  "scripts": {
    "install": "install.ps1",
    "uninstall": "uninstall.ps1"
  },
  "files": ["files/ChromeStandaloneSetup64.exe"],
  "requiresRoot": true
}
EOF

# Package as tar.gz
tar -czf chrome-bundle.tar.gz -C chrome-bundle .

# Upload bundle
curl -X POST http://localhost:3000/v1/hub/packages/chrome-win-latest/bundle \
  -H "Authorization: Bearer $PATCHIQ_TOKEN" \
  -F "file=@chrome-bundle.tar.gz"
```

---

## Step 4: Deploy to Endpoints

### 4.1 Create Deployment

```bash
# Get agent IDs
curl http://localhost:3000/v1/agents \
  -H "Authorization: Bearer $PATCHIQ_TOKEN" \
  | jq '.data[] | {id, hostname, platform}'

# Create deployment
curl -X POST http://localhost:3000/v1/deployments/software \
  -H "Authorization: Bearer $PATCHIQ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chrome Deployment - Engineering",
    "targetAgentIds": ["agent-uuid-1", "agent-uuid-2"],
    "package": {
      "packageId": "chrome-win-latest",
      "name": "chrome"
    }
  }'
```

### 4.2 Monitor Deployment

```bash
# Check deployment status
curl http://localhost:3000/v1/deployments/software/SD-12345678 \
  -H "Authorization: Bearer $PATCHIQ_TOKEN" \
  | jq '{status: .stage, pending, succeeded, failed}'
```

---

## 📊 Quick Reference

### File Sizes (Approximate)

| Platform | Software | Size | Format |
|----------|----------|------|--------|
| Windows | Chrome | ~95 MB | .exe |
| Windows | Firefox | ~62 MB | .exe |
| Windows | 7-Zip | ~1.5 MB | .exe |
| Windows | VSCode | ~90 MB | .exe |
| Windows | Git | ~48 MB | .exe |
| Linux | Chrome | ~92 MB | .deb |
| Linux | VSCode | ~85 MB | .deb |
| Linux | Slack | ~78 MB | .deb |
| macOS | Chrome | ~180 MB | .dmg |
| macOS | VSCode | ~110 MB | .zip |

### Storage Requirements

- **Windows base pack**: ~350 MB
- **Linux base pack**: ~260 MB
- **macOS base pack**: ~400 MB
- **Total**: ~1 GB for essential cross-platform software

---

## 🔧 Troubleshooting

### Download Failed

```bash
# Check network connectivity to vendor
ping dl.google.com

# Try manual download
wget https://dl.google.com/chrome/install/latest/chrome_installer.exe

# Check whitelist
curl http://localhost:3000/v1/patch-sources?vendor=Google
```

### Upload Failed

```bash
# Check backend is running
curl http://localhost:3000/health

# Check MinIO is accessible
docker ps | grep minio

# Check auth token
echo $PATCHIQ_TOKEN
```

### Package Not Found

```bash
# List all packages
curl http://localhost:3000/v1/hub/packages \
  -H "Authorization: Bearer $PATCHIQ_TOKEN"

# Check specific package
curl http://localhost:3000/v1/hub/packages/chrome-win-latest \
  -H "Authorization: Bearer $PATCHIQ_TOKEN"
```

---

## 🚀 Next Steps

1. ✅ **Downloaded base software** (you are here!)
2. ⏭️ Upload to Hub (run `./upload-to-hub.sh`)
3. ⏭️ Add installation scripts
4. ⏭️ Test deployment on 1-2 pilot agents
5. ⏭️ Roll out to production fleet

---

## 📝 Notes

- All downloads use **HTTPS** for security
- Checksums verified when provided by vendor
- Files stored in MinIO with SHA256 hashes
- Whitelist prevents unauthorized sources
- Average download time: 10-15 minutes for full suite

## Need Help?

- Check logs: `docker logs patchiq-backend`
- View MinIO: http://localhost:9001 (admin/password123)
- Backend API: http://localhost:3000/api-docs
