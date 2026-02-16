# Pipeline 5 Quick Reference Card

**Tasks Implemented:** 5.1 (macOS PKG), 5.4 (Auto-Update Manifest)
**Date:** 2026-02-14
**Status:** Production Ready ✅

---

## macOS PKG Installer

### Build PKG

```bash
cd agent/installer/macos
./build-pkg.sh <version> <arch>

# Examples:
./build-pkg.sh 1.0.0 arm64     # Apple Silicon
./build-pkg.sh 1.0.0 amd64     # Intel
./build-pkg.sh 2.1.0-beta arm64
```

### Install PKG

```bash
# GUI (double-click)
open PatchIQAgent-1.0.0-arm64.pkg

# CLI (silent)
sudo installer -pkg PatchIQAgent-1.0.0-arm64.pkg -target /
```

### Sign PKG

```bash
export DEVELOPER_ID_INSTALLER="Developer ID Installer: Company Name (TEAM_ID)"
./build-pkg.sh 1.0.0 arm64
```

### Verify Installation

```bash
# Check service
launchctl list | grep patchiq

# Check binary
/usr/local/bin/patchiq-agent --version

# Check logs
tail -f /var/log/patchiq/agent.log
```

### Uninstall

```bash
cd agent/installer/macos
sudo ./uninstall.sh
```

---

## Auto-Update Manifest

### Generate Manifest

```bash
cd agent/scripts
./generate-manifest.sh <version>

# Examples:
./generate-manifest.sh 1.0.0
./generate-manifest.sh 2.1.0-beta
```

### Sign Manifest

```bash
export UPDATE_MANIFEST_PRIVATE_KEY="base64-encoded-ed25519-key"
./generate-manifest.sh 1.0.0
```

### Verify Manifest

```bash
# View manifest
cat agent-manifest-1.0.0.json | jq '.'

# Check platforms
jq '.builds | keys' agent-manifest-1.0.0.json

# Verify signature
jq '.signature' agent-manifest-1.0.0.json
```

### Publish to S3

```bash
# Manual upload
aws s3 cp agent-manifest-1.0.0.json \
    s3://patchiq-cdn/agent/manifest-1.0.0.json \
    --content-type application/json

aws s3 cp agent-manifest-1.0.0.json \
    s3://patchiq-cdn/agent/manifest-latest.json \
    --content-type application/json
```

### CI/CD Workflow

```bash
# Trigger on release
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"

# Manual trigger
gh workflow run publish-agent-manifest.yml -f version=1.0.0
```

---

## File Locations

### macOS PKG Installer

| File | Path |
|------|------|
| Build Script | `agent/installer/macos/build-pkg.sh` |
| Uninstall Script | `agent/installer/macos/uninstall.sh` |
| Distribution XML | `agent/installer/macos/Distribution.xml` |
| Resources | `agent/installer/macos/resources/*.html` |
| Scripts | `agent/installer/macos/scripts/pre*, post*` |
| Output PKG | `agent/dist/PatchIQAgent-{version}-{arch}.pkg` |
| Documentation | `docs/MACOS-PKG.md` |

### Auto-Update Manifest

| File | Path |
|------|------|
| Generator Script | `agent/scripts/generate-manifest.sh` |
| Signing Script | `scripts/sign-manifest.sh` (from Pipeline 4) |
| CI/CD Workflow | `.github/workflows/publish-agent-manifest.yml` |
| Output Manifest | `agent/scripts/agent-manifest-{version}.json` |
| Documentation | `docs/MANIFEST-PUBLISHING.md` |

---

## Installation Paths

### macOS

| Item | Path | Permissions |
|------|------|-------------|
| Agent Binary | `/usr/local/bin/patchiq-agent` | 755 |
| LaunchAgent | `~/Library/LaunchAgents/io.patchiq.agent.plist` | 644 |
| Logs | `/var/log/patchiq/agent.log` | 644 |
| Error Logs | `/var/log/patchiq/agent-error.log` | 644 |

---

## Environment Variables

### macOS PKG

| Variable | Description | Example |
|----------|-------------|---------|
| `DEVELOPER_ID_INSTALLER` | Certificate for signing | `"Developer ID Installer: Company (TEAM_ID)"` |
| `CODESIGN_IDENTITY` | Alternative certificate | `"Developer ID Installer: Company (TEAM_ID)"` |

### Manifest

| Variable | Description | Example |
|----------|-------------|---------|
| `UPDATE_MANIFEST_PRIVATE_KEY` | Ed25519 private key (base64) | `"base64-encoded-key"` |
| `CDN_BASE_URL` | Custom CDN URL | `"https://my-cdn.com/agent/1.0.0"` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | `"AKIAIOSFODNN7EXAMPLE"` |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | `"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"` |
| `S3_BUCKET` | S3 bucket name | `"patchiq-cdn"` |

---

## Common Commands

### LaunchAgent Management

```bash
# List LaunchAgents
launchctl list | grep patchiq

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

### PKG Management

```bash
# List installed packages
pkgutil --pkgs | grep patchiq

# Get package info
pkgutil --pkg-info io.patchiq.agent

# List package files
pkgutil --files io.patchiq.agent

# Check signature
pkgutil --check-signature PatchIQAgent-1.0.0-arm64.pkg

# Forget package
sudo pkgutil --forget io.patchiq.agent
```

---

## Troubleshooting

### macOS PKG

**Service won't start:**
```bash
# Check logs
tail -f /var/log/patchiq/agent-error.log

# Verify binary is executable
chmod +x /usr/local/bin/patchiq-agent

# Validate plist
plutil -lint ~/Library/LaunchAgents/io.patchiq.agent.plist

# Reload LaunchAgent
launchctl unload ~/Library/LaunchAgents/io.patchiq.agent.plist
launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist
```

**Gatekeeper blocks installation:**
```bash
# Option 1: Right-click → Open (one-time bypass)
# Option 2: System Preferences → Security → Allow Anyway
# Option 3: Sign the package (recommended)
export DEVELOPER_ID_INSTALLER="Developer ID Installer: Company (TEAM_ID)"
./build-pkg.sh 1.0.0 arm64
```

### Manifest

**Binary not found:**
```bash
# Build missing binary
cd agent
GOOS=linux GOARCH=arm64 go build -o dist/patchiq-agent-linux-arm64 ./cmd/agent
```

**jq not found:**
```bash
# macOS
brew install jq

# Ubuntu
sudo apt-get install jq

# RHEL
sudo yum install jq
```

**Checksums don't match:**
```bash
# Recalculate checksum
sha256sum agent/dist/patchiq-agent-linux-amd64

# Compare with manifest
jq -r '.builds."linux-amd64".sha256' agent-manifest-1.0.0.json
```

---

## Testing

### Test PKG Locally

```bash
# Build
cd agent/installer/macos
./build-pkg.sh 1.0.0-test arm64

# Verify PKG exists
ls -lh ../../dist/PatchIQAgent-1.0.0-test-arm64.pkg

# Check signature
pkgutil --check-signature ../../dist/PatchIQAgent-1.0.0-test-arm64.pkg

# Install
sudo installer -pkg ../../dist/PatchIQAgent-1.0.0-test-arm64.pkg -target /

# Verify
launchctl list | grep patchiq
/usr/local/bin/patchiq-agent --version

# Uninstall
sudo ./uninstall.sh
```

### Test Manifest Locally

```bash
# Generate
cd agent/scripts
./generate-manifest.sh 1.0.0-test

# Verify
cat agent-manifest-1.0.0-test.json | jq '.'

# Check platforms
jq '.builds | keys' agent-manifest-1.0.0-test.json

# Verify checksums
jq -r '.builds."darwin-arm64".sha256' agent-manifest-1.0.0-test.json
sha256sum ../dist/patchiq-agent-darwin-arm64

# Clean up
rm agent-manifest-1.0.0-test.json
```

---

## Documentation

| Document | Location | Description |
|----------|----------|-------------|
| macOS PKG Guide | `docs/MACOS-PKG.md` | Complete PKG installer docs (850+ lines) |
| Manifest Guide | `docs/MANIFEST-PUBLISHING.md` | Manifest publishing docs (800+ lines) |
| Implementation Report | `agent/PIPELINE-5-TASKS-5.1-5.4-COMPLETION.md` | Full implementation details |
| Quick Reference | `agent/PIPELINE-5-QUICK-REFERENCE.md` | This file |

---

## Support

**For installation issues:**
- Email: support@patchiq.io
- Docs: https://docs.patchiq.io

**For development issues:**
- GitHub: https://github.com/patchiq/agent
- Internal: Slack #agent-dev

---

**Last Updated:** 2026-02-14
**Version:** 1.0
**Status:** Production Ready ✅
