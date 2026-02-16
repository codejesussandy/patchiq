# Pipeline 5: Production Packaging

## Overview

- **Priority:** High
- **Estimated Effort:** 36-43 hours
- **Dependencies:** Pipeline 4 (binaries should be signed, but can package unsigned and sign later)
- **Platform Scope:** All (Windows MSI already done in Pipeline 3, focus on macOS + Linux)
- **Target Completion:** Week 5
- **Current Completion:** 30% (Windows MSI exists)

## Business Justification

**Professional installers are essential for enterprise adoption.** Without native package formats:
- Manual installation is error-prone
- No integration with system package managers
- Difficult to deploy at scale (GPO, SCCM, Intune, Ansible, Chef, Puppet)
- Poor user experience (no familiar install/uninstall process)

**Current State:**
- Windows MSI installer exists (Pipeline 3)
- No macOS PKG installer
- No Linux DEB packages
- No Linux RPM packages
- No auto-update manifest publishing

**Target State:**
- macOS PKG installer (signed + notarized)
- Debian/Ubuntu DEB packages
- RHEL/Fedora/CentOS RPM packages
- Auto-update manifests for all platforms
- Complete installation documentation

**Value Delivered:**
- Enterprise-grade deployment experience
- Native package manager integration
- Automated mass deployment support
- Professional appearance and trust

---

## Requirements

### R1: macOS PKG Installer

**Description:** Create professional PKG installer for macOS with LaunchAgent integration

**Acceptance Criteria:**
- [ ] PKG installer created with pkgbuild and productbuild
- [ ] Install to `/Applications/PatchIQ Agent.app` or `/usr/local/bin/`
- [ ] Create LaunchAgent plist for auto-start
- [ ] Install to `~/Library/LaunchAgents/` or `/Library/LaunchAgents/`
- [ ] Signed with Developer ID Installer certificate (when available)
- [ ] Notarized by Apple (when Developer account available)
- [ ] Silent install support
- [ ] Uninstall script included
- [ ] Post-install script configures service

**Platform:** macOS
**Priority:** Must Have
**Estimated Hours:** 10-14

---

### R2: Debian/Ubuntu DEB Packages

**Description:** Create DEB packages for Debian-based Linux distributions

**Acceptance Criteria:**
- [ ] DEB package created with dpkg-deb
- [ ] Install to `/usr/bin/patchiq-agent`
- [ ] Create systemd service file
- [ ] Install service to `/etc/systemd/system/`
- [ ] Post-install script enables and starts service
- [ ] Pre-remove script stops service
- [ ] Post-remove script cleans up files
- [ ] Package metadata (description, maintainer, dependencies)
- [ ] Lintian validation passes

**Platform:** Linux (Debian, Ubuntu)
**Priority:** Must Have
**Estimated Hours:** 8-12

---

### R3: RHEL/Fedora RPM Packages

**Description:** Create RPM packages for Red Hat-based Linux distributions

**Acceptance Criteria:**
- [ ] RPM package created with rpmbuild
- [ ] Install to `/usr/bin/patchiq-agent`
- [ ] Create systemd service file
- [ ] Install service to `/etc/systemd/system/`
- [ ] Post-install scriptlet enables and starts service
- [ ] Pre-uninstall scriptlet stops service
- [ ] Post-uninstall scriptlet cleans up files
- [ ] RPM spec file with metadata
- [ ] rpmlint validation passes

**Platform:** Linux (RHEL, Fedora, CentOS, Rocky, Alma)
**Priority:** Must Have
**Estimated Hours:** 8-12

---

### R4: Auto-Update Manifest Publishing

**Description:** Automate update manifest generation and publishing

**Acceptance Criteria:**
- [ ] Script to generate update manifest JSON
- [ ] Include all platform binaries (Windows, macOS, Linux)
- [ ] Sign manifest with Ed25519 private key (from Pipeline 4)
- [ ] Publish to CDN or backend API
- [ ] Version manifest with semantic versioning
- [ ] CI/CD integration for automatic publishing
- [ ] Rollback support (keep last 3 manifests)

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 4-6

---

### R5: Installation Documentation

**Description:** Create comprehensive user-facing installation guides

**Acceptance Criteria:**
- [ ] Installation guide for Windows (MSI)
- [ ] Installation guide for macOS (PKG)
- [ ] Installation guide for Debian/Ubuntu (DEB)
- [ ] Installation guide for RHEL/Fedora (RPM)
- [ ] Uninstallation guide for all platforms
- [ ] Troubleshooting common installation issues
- [ ] Silent install parameters documented
- [ ] Post-installation configuration guide

**Platform:** All
**Priority:** Should Have
**Estimated Hours:** 4-6

---

### R6: Package Testing Matrix

**Description:** Test all installers on target platforms

**Acceptance Criteria:**
- [ ] Test macOS PKG on macOS 12, 13, 14 (Intel and Apple Silicon)
- [ ] Test DEB on Ubuntu 20.04, 22.04, 24.04
- [ ] Test DEB on Debian 11, 12
- [ ] Test RPM on RHEL 8, 9
- [ ] Test RPM on Fedora 38, 39, 40
- [ ] Test RPM on Rocky Linux 8, 9
- [ ] Test fresh install, upgrade, uninstall
- [ ] Document test results

**Platform:** All
**Priority:** Must Have
**Estimated Hours:** 8-12

---

## Technical Approach

### macOS PKG Installer

**Directory Structure:**

```
installer/macos/
├── build-pkg.sh              # Build script
├── scripts/
│   ├── postinstall           # Post-install script
│   └── preinstall            # Pre-install script
├── resources/
│   ├── welcome.html          # Welcome screen
│   ├── license.html          # License
│   └── conclusion.html       # Post-install info
├── payload/
│   ├── usr/
│   │   └── local/
│   │       └── bin/
│   │           └── patchiq-agent
│   └── Library/
│       └── LaunchAgents/
│           └── io.patchiq.agent.plist
└── Distribution.xml          # Installer configuration
```

**Build Script (`build-pkg.sh`):**

```bash
#!/bin/bash
set -e

VERSION="${1:-1.0.0}"
IDENTIFIER="io.patchiq.agent"
INSTALL_LOCATION="/usr/local"

echo "Building PatchIQ Agent PKG for macOS v$VERSION..."

# Create payload structure
mkdir -p payload/usr/local/bin
mkdir -p payload/Library/LaunchAgents

# Copy agent binary
cp ../../dist/patchiq-agent-darwin-arm64 payload/usr/local/bin/patchiq-agent
chmod +x payload/usr/local/bin/patchiq-agent

# Create LaunchAgent plist
cat > payload/Library/LaunchAgents/io.patchiq.agent.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.patchiq.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/patchiq-agent</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/patchiq-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/patchiq-agent.err</string>
</dict>
</plist>
EOF

# Build component package
pkgbuild --root payload \
         --identifier "$IDENTIFIER" \
         --version "$VERSION" \
         --scripts scripts \
         --install-location "$INSTALL_LOCATION" \
         component.pkg

# Build product package (for Distribution.xml)
productbuild --distribution Distribution.xml \
             --package-path . \
             --resources resources \
             ../../dist/PatchIQAgent-$VERSION.pkg

# Sign package (when certificate available)
if [ -n "$DEVELOPER_ID_INSTALLER" ]; then
    productsign --sign "$DEVELOPER_ID_INSTALLER" \
                ../../dist/PatchIQAgent-$VERSION.pkg \
                ../../dist/PatchIQAgent-$VERSION-signed.pkg
    mv ../../dist/PatchIQAgent-$VERSION-signed.pkg ../../dist/PatchIQAgent-$VERSION.pkg
fi

echo "✓ PKG created: dist/PatchIQAgent-$VERSION.pkg"
```

**Post-Install Script:**

```bash
#!/bin/bash
# postinstall script

# Load LaunchAgent for current user
if [ -n "$USER" ] && [ "$USER" != "root" ]; then
    launchctl load ~/Library/LaunchAgents/io.patchiq.agent.plist
fi

# For system-wide installation
launchctl load /Library/LaunchAgents/io.patchiq.agent.plist

exit 0
```

---

### Debian/Ubuntu DEB Package

**Directory Structure:**

```
installer/debian/
├── build-deb.sh              # Build script
├── DEBIAN/
│   ├── control               # Package metadata
│   ├── postinst              # Post-install script
│   ├── prerm                 # Pre-remove script
│   └── postrm                # Post-remove script
├── usr/
│   └── bin/
│       └── patchiq-agent
└── etc/
    └── systemd/
        └── system/
            └── patchiq-agent.service
```

**Control File:**

```
Package: patchiq-agent
Version: 1.0.0
Section: admin
Priority: optional
Architecture: amd64
Maintainer: PatchIQ <support@patchiq.io>
Description: PatchIQ Agent for Patch and Software Management
 The PatchIQ Agent provides automated patch management, software
 deployment, and system inventory collection for Linux systems.
 .
 Features:
  - Automated patch deployment
  - Software package management
  - System inventory collection
  - Centralized management via PatchIQ Hub
Depends: systemd, ca-certificates
Homepage: https://patchiq.io
```

**Build Script (`build-deb.sh`):**

```bash
#!/bin/bash
set -e

VERSION="${1:-1.0.0}"
ARCH="amd64"
PACKAGE="patchiq-agent"

echo "Building $PACKAGE DEB package v$VERSION for $ARCH..."

# Create directory structure
mkdir -p ${PACKAGE}_${VERSION}_${ARCH}/DEBIAN
mkdir -p ${PACKAGE}_${VERSION}_${ARCH}/usr/bin
mkdir -p ${PACKAGE}_${VERSION}_${ARCH}/etc/systemd/system

# Copy binary
cp ../../dist/patchiq-agent-linux-amd64 ${PACKAGE}_${VERSION}_${ARCH}/usr/bin/patchiq-agent
chmod +x ${PACKAGE}_${VERSION}_${ARCH}/usr/bin/patchiq-agent

# Create systemd service file
cat > ${PACKAGE}_${VERSION}_${ARCH}/etc/systemd/system/patchiq-agent.service <<EOF
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

# Create control file
cat > ${PACKAGE}_${VERSION}_${ARCH}/DEBIAN/control <<EOF
Package: $PACKAGE
Version: $VERSION
Section: admin
Priority: optional
Architecture: $ARCH
Maintainer: PatchIQ <support@patchiq.io>
Description: PatchIQ Agent for Patch and Software Management
Depends: systemd, ca-certificates
Homepage: https://patchiq.io
EOF

# Create postinst script
cat > ${PACKAGE}_${VERSION}_${ARCH}/DEBIAN/postinst <<'EOF'
#!/bin/bash
set -e

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable patchiq-agent.service
systemctl start patchiq-agent.service

echo "PatchIQ Agent installed and started successfully"
exit 0
EOF
chmod +x ${PACKAGE}_${VERSION}_${ARCH}/DEBIAN/postinst

# Create prerm script
cat > ${PACKAGE}_${VERSION}_${ARCH}/DEBIAN/prerm <<'EOF'
#!/bin/bash
set -e

# Stop service
systemctl stop patchiq-agent.service || true
systemctl disable patchiq-agent.service || true

exit 0
EOF
chmod +x ${PACKAGE}_${VERSION}_${ARCH}/DEBIAN/prerm

# Build package
dpkg-deb --build ${PACKAGE}_${VERSION}_${ARCH}

# Move to dist
mv ${PACKAGE}_${VERSION}_${ARCH}.deb ../../dist/

# Validate with lintian
lintian ../../dist/${PACKAGE}_${VERSION}_${ARCH}.deb || true

echo "✓ DEB package created: dist/${PACKAGE}_${VERSION}_${ARCH}.deb"
```

---

### RHEL/Fedora RPM Package

**RPM Spec File (`patchiq-agent.spec`):**

```spec
Name:           patchiq-agent
Version:        1.0.0
Release:        1%{?dist}
Summary:        PatchIQ Agent for Patch and Software Management

License:        Proprietary
URL:            https://patchiq.io
Source0:        patchiq-agent-linux-amd64

Requires:       systemd
Requires:       ca-certificates

%description
The PatchIQ Agent provides automated patch management, software
deployment, and system inventory collection for Linux systems.

Features:
- Automated patch deployment
- Software package management
- System inventory collection
- Centralized management via PatchIQ Hub

%prep
# No prep needed for binary package

%build
# No build needed for binary package

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT/usr/bin
mkdir -p $RPM_BUILD_ROOT/etc/systemd/system

# Install binary
install -m 755 %{SOURCE0} $RPM_BUILD_ROOT/usr/bin/patchiq-agent

# Install systemd service
cat > $RPM_BUILD_ROOT/etc/systemd/system/patchiq-agent.service <<EOF
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

%post
systemctl daemon-reload
systemctl enable patchiq-agent.service
systemctl start patchiq-agent.service

%preun
systemctl stop patchiq-agent.service
systemctl disable patchiq-agent.service

%postun
systemctl daemon-reload

%files
/usr/bin/patchiq-agent
/etc/systemd/system/patchiq-agent.service

%changelog
* Fri Feb 14 2026 PatchIQ <support@patchiq.io> - 1.0.0-1
- Initial release
```

**Build Script (`build-rpm.sh`):**

```bash
#!/bin/bash
set -e

VERSION="${1:-1.0.0}"
RELEASE="1"

echo "Building patchiq-agent RPM v$VERSION..."

# Create RPM build structure
mkdir -p ~/rpmbuild/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

# Copy spec file
cp patchiq-agent.spec ~/rpmbuild/SPECS/

# Copy binary to SOURCES
cp ../../dist/patchiq-agent-linux-amd64 ~/rpmbuild/SOURCES/

# Build RPM
rpmbuild -ba ~/rpmbuild/SPECS/patchiq-agent.spec \
    --define "version $VERSION" \
    --define "release $RELEASE"

# Copy to dist
cp ~/rpmbuild/RPMS/x86_64/patchiq-agent-$VERSION-$RELEASE.*.rpm ../../dist/

# Validate with rpmlint
rpmlint ../../dist/patchiq-agent-$VERSION-$RELEASE.*.rpm || true

echo "✓ RPM package created: dist/patchiq-agent-$VERSION-$RELEASE.*.rpm"
```

---

### Auto-Update Manifest Publishing

**Manifest Generation Script (`scripts/generate-manifest.sh`):**

```bash
#!/bin/bash
set -e

VERSION="$1"
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

MANIFEST_FILE="agent-manifest-$VERSION.json"

echo "Generating update manifest for version $VERSION..."

# Calculate checksums
WIN_AMD64_SHA256=$(sha256sum dist/patchiq-agent-windows-amd64.exe | awk '{print $1}')
WIN_ARM64_SHA256=$(sha256sum dist/patchiq-agent-windows-arm64.exe | awk '{print $1}')
DARWIN_AMD64_SHA256=$(sha256sum dist/patchiq-agent-darwin-amd64 | awk '{print $1}')
DARWIN_ARM64_SHA256=$(sha256sum dist/patchiq-agent-darwin-arm64 | awk '{print $1}')
LINUX_AMD64_SHA256=$(sha256sum dist/patchiq-agent-linux-amd64 | awk '{print $1}')

# Get file sizes
WIN_AMD64_SIZE=$(stat -f%z dist/patchiq-agent-windows-amd64.exe 2>/dev/null || stat -c%s dist/patchiq-agent-windows-amd64.exe)
WIN_ARM64_SIZE=$(stat -f%z dist/patchiq-agent-windows-arm64.exe 2>/dev/null || stat -c%s dist/patchiq-agent-windows-arm64.exe)
DARWIN_AMD64_SIZE=$(stat -f%z dist/patchiq-agent-darwin-amd64 2>/dev/null || stat -c%s dist/patchiq-agent-darwin-amd64)
DARWIN_ARM64_SIZE=$(stat -f%z dist/patchiq-agent-darwin-arm64 2>/dev/null || stat -c%s dist/patchiq-agent-darwin-arm64)
LINUX_AMD64_SIZE=$(stat -f%z dist/patchiq-agent-linux-amd64 2>/dev/null || stat -c%s dist/patchiq-agent-linux-amd64)

# Create manifest JSON
cat > $MANIFEST_FILE <<EOF
{
  "version": "$VERSION",
  "releaseDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "builds": {
    "windows-amd64": {
      "url": "https://cdn.patchiq.io/agent/$VERSION/patchiq-agent-windows-amd64.exe",
      "sha256": "$WIN_AMD64_SHA256",
      "size": $WIN_AMD64_SIZE
    },
    "windows-arm64": {
      "url": "https://cdn.patchiq.io/agent/$VERSION/patchiq-agent-windows-arm64.exe",
      "sha256": "$WIN_ARM64_SHA256",
      "size": $WIN_ARM64_SIZE
    },
    "darwin-amd64": {
      "url": "https://cdn.patchiq.io/agent/$VERSION/patchiq-agent-darwin-amd64",
      "sha256": "$DARWIN_AMD64_SHA256",
      "size": $DARWIN_AMD64_SIZE
    },
    "darwin-arm64": {
      "url": "https://cdn.patchiq.io/agent/$VERSION/patchiq-agent-darwin-arm64",
      "sha256": "$DARWIN_ARM64_SHA256",
      "size": $DARWIN_ARM64_SIZE
    },
    "linux-amd64": {
      "url": "https://cdn.patchiq.io/agent/$VERSION/patchiq-agent-linux-amd64",
      "sha256": "$LINUX_AMD64_SHA256",
      "size": $LINUX_AMD64_SIZE
    }
  }
}
EOF

# Sign manifest (from Pipeline 4)
./scripts/sign-manifest.sh $MANIFEST_FILE

echo "✓ Manifest created: $MANIFEST_FILE"
echo "✓ Manifest signed"

# Publish to CDN (if credentials available)
if [ -n "$CDN_UPLOAD_KEY" ]; then
    aws s3 cp $MANIFEST_FILE s3://patchiq-cdn/agent/manifest-latest.json
    aws s3 cp $MANIFEST_FILE s3://patchiq-cdn/agent/manifest-$VERSION.json
    echo "✓ Manifest published to CDN"
fi
```

---

## Implementation Plan

### Task 5.1: macOS PKG Installer (10-14 hours)

**Owner:** Teammate 1
**Files:**
- `installer/macos/build-pkg.sh`
- `installer/macos/scripts/postinstall`
- `installer/macos/Distribution.xml`
- `installer/macos/resources/*.html`

**Steps:**
1. Create directory structure
2. Create build script
3. Create LaunchAgent plist
4. Create post-install script
5. Create Distribution.xml
6. Add signing support (placeholder)
7. Test on macOS 13+
8. Document installation process

---

### Task 5.2: Debian/Ubuntu DEB Packages (8-12 hours)

**Owner:** Teammate 2
**Files:**
- `installer/debian/build-deb.sh`
- `installer/debian/DEBIAN/control`
- `installer/debian/DEBIAN/postinst`
- `installer/debian/DEBIAN/prerm`

**Steps:**
1. Create directory structure
2. Create control file
3. Create systemd service file
4. Create post-install script
5. Create pre-remove script
6. Create build script
7. Test on Ubuntu 22.04+
8. Validate with lintian

---

### Task 5.3: RHEL/Fedora RPM Packages (8-12 hours)

**Owner:** Teammate 3
**Files:**
- `installer/rpm/patchiq-agent.spec`
- `installer/rpm/build-rpm.sh`

**Steps:**
1. Create RPM spec file
2. Define dependencies
3. Create systemd service file
4. Add post-install scriptlet
5. Add pre-uninstall scriptlet
6. Create build script
7. Test on Fedora 39+
8. Validate with rpmlint

---

### Task 5.4: Auto-Update Manifest (4-6 hours)

**Owner:** Teammate 1
**Files:**
- `scripts/generate-manifest.sh`
- `.github/workflows/publish-manifest.yml`

**Steps:**
1. Create manifest generation script
2. Calculate checksums for all binaries
3. Sign manifest with Ed25519 key
4. Create CI/CD workflow for publishing
5. Test manifest generation
6. Document publishing process

---

### Task 5.5: Installation Documentation (4-6 hours)

**Owner:** Teammate 2
**Files:**
- `docs/INSTALLATION.md`
- `docs/UNINSTALLATION.md`
- `docs/TROUBLESHOOTING-INSTALL.md`

**Steps:**
1. Document Windows MSI installation
2. Document macOS PKG installation
3. Document DEB installation
4. Document RPM installation
5. Document silent install parameters
6. Document uninstallation
7. Create troubleshooting guide

---

### Task 5.6: Package Testing (8-12 hours)

**Owner:** All teammates
**Platforms:** VMs for testing

**Test Matrix:**
- macOS: 12, 13, 14 (Intel, Apple Silicon)
- Ubuntu: 20.04, 22.04, 24.04
- Debian: 11, 12
- RHEL: 8, 9
- Fedora: 39, 40

**Test Cases:**
- Fresh install
- Upgrade install
- Uninstall
- Service auto-start
- Silent install

---

## Parallelization Strategy

```
Week 1 (Parallel):
├── Teammate 1: Task 5.1 → 5.4
│   ├── macOS PKG (10-14h)
│   └── Auto-update manifest (4-6h)
│   Total: 14-20 hours
│
├── Teammate 2: Task 5.2 → 5.5
│   ├── DEB packages (8-12h)
│   └── Documentation (4-6h)
│   Total: 12-18 hours
│
└── Teammate 3: Task 5.3
    └── RPM packages (8-12h)
    Total: 8-12 hours

Week 2 (Testing):
└── All teammates: Task 5.6
    └── Package testing (8-12h split across team)
```

**Total: 42-62 hours with 3 teammates = 14-21 hours per teammate**
**Timeline: ~2 weeks**

---

## Exit Criteria

- [ ] macOS PKG installer builds successfully
- [ ] DEB package builds successfully
- [ ] RPM package builds successfully
- [ ] All packages install correctly on target platforms
- [ ] Services auto-start after installation
- [ ] Uninstall cleans up properly
- [ ] Auto-update manifest generation working
- [ ] Documentation complete
- [ ] Test matrix complete (all platforms tested)

---

## Dependencies

**Internal:**
- Pipeline 3: Windows MSI already exists
- Pipeline 4: Signing infrastructure (optional, can sign later)

**External:**
- macOS VM or system for PKG testing
- Linux VMs for DEB/RPM testing
- CDN or S3 for manifest hosting (optional)

---

## Timeline

- **Planning:** 4 hours
- **Implementation:** 34-48 hours (with 3 teammates: 11-16 hours each)
- **Testing:** 8-12 hours (split across team)
- **QA:** 4 hours
- **Buffer:** 7 hours
- **Total:** 43 hours = **2 weeks** with 3 teammates

---

## Success Metrics

- **Package Quality:** All packages install without errors
- **Service Reliability:** Services auto-start 100% of the time
- **Platform Coverage:** All target platforms tested
- **Documentation:** Complete install guides for all platforms

---

**Document Status:** APPROVED
**Last Updated:** 2026-02-14
**Implementation Start:** Now
