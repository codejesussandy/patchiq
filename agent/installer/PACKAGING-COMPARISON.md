# Linux Package Comparison: DEB vs RPM

This document compares the Debian (DEB) and Red Hat (RPM) packaging implementations for the PatchIQ Agent to ensure consistency and highlight differences.

## Overview

Both packaging formats provide:
- Binary installation to `/usr/bin/patchiq-agent`
- Systemd service integration
- Auto-start on installation
- Clean uninstallation
- Upgrade support

## Directory Structure

### DEB (Debian/Ubuntu)
```
installer/debian/
├── build-deb.sh              # Build script
├── DEBIAN/
│   ├── control               # Package metadata
│   ├── postinst              # Post-install script
│   ├── prerm                 # Pre-remove script
│   └── postrm                # Post-remove script (optional)
├── usr/
│   └── bin/
│       └── patchiq-agent
└── etc/
    └── systemd/
        └── system/
            └── patchiq-agent.service
```

### RPM (RHEL/Fedora)
```
installer/rpm/
├── build-rpm.sh              # Build script
├── patchiq-agent.spec        # All-in-one spec file
├── test-rpm.sh               # Testing script
└── README.md                 # Quick reference
```

**Key Difference:** DEB uses separate directory structure with files, RPM uses single spec file that generates everything.

## Package Metadata

### DEB (control file)
```
Package: patchiq-agent
Version: 1.0.0
Section: admin
Priority: optional
Architecture: amd64
Maintainer: PatchIQ <support@patchiq.io>
Description: PatchIQ Agent for Patch and Software Management
 Multi-line description with leading space
Depends: systemd, ca-certificates
Homepage: https://patchiq.io
```

### RPM (spec file)
```spec
Name:           patchiq-agent
Version:        %{version}
Release:        %{release}%{?dist}
Summary:        PatchIQ Agent for Patch and Software Management
License:        Proprietary
URL:            https://patchiq.io
Source0:        patchiq-agent-linux-amd64
Requires:       systemd
Requires:       ca-certificates

%description
The PatchIQ Agent provides automated patch management, software
deployment, and system inventory collection for Linux systems.
```

**Key Differences:**
- RPM uses macros (`%{version}`, `%{release}`, `%{?dist}`)
- RPM includes License field (required)
- RPM uses `%description` section
- RPM has explicit Release number
- RPM auto-adds distribution tag (`.fc40`, `.el9`)

## Build Process

### DEB
```bash
# Build command
dpkg-deb --build patchiq-agent_1.0.0_amd64

# Output
patchiq-agent_1.0.0_amd64.deb
```

**Characteristics:**
- Builds from directory structure
- Files pre-staged in build directory
- Service file exists as actual file
- Scripts are separate files

### RPM
```bash
# Build command
rpmbuild -ba patchiq-agent.spec \
    --define "version 1.0.0" \
    --define "release 1"

# Output
patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

**Characteristics:**
- Builds from spec file
- Files created during %install phase
- Service file created inline in spec
- Scripts embedded in spec file
- Uses standard build directory: `~/rpmbuild/`

## Systemd Service File

### Both Implementations (Identical)
```ini
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
```

**Location:** `/etc/systemd/system/patchiq-agent.service`

**Consistency:** ✅ Service files are identical across both formats.

## Installation Scripts

### Post-Install (runs after installation)

**DEB (postinst):**
```bash
#!/bin/bash
set -e

systemctl daemon-reload
systemctl enable patchiq-agent.service
systemctl start patchiq-agent.service

echo "PatchIQ Agent installed and started successfully"
exit 0
```

**RPM (%post):**
```spec
%post
systemctl daemon-reload
systemctl enable patchiq-agent.service
systemctl start patchiq-agent.service
```

**Differences:**
- DEB includes shebang and `set -e`
- DEB includes success message
- RPM is more minimal
- Functionality is identical

### Pre-Uninstall (runs before removal)

**DEB (prerm):**
```bash
#!/bin/bash
set -e

systemctl stop patchiq-agent.service || true
systemctl disable patchiq-agent.service || true

exit 0
```

**RPM (%preun):**
```spec
%preun
if [ $1 -eq 0 ]; then
    systemctl stop patchiq-agent.service
    systemctl disable patchiq-agent.service
fi
```

**Differences:**
- DEB uses `|| true` to ignore errors
- RPM checks `$1 -eq 0` to distinguish uninstall vs upgrade
- DEB runs on both uninstall and upgrade
- RPM only runs on uninstall (correct behavior)

**Upgrade Behavior:**
- **DEB:** May restart service during upgrade (stop in prerm, start in postinst)
- **RPM:** Service keeps running during upgrade (preun skipped when `$1 -eq 1`)

**Winner:** RPM has better upgrade handling.

### Post-Uninstall (runs after removal)

**DEB (postrm):**
- Not implemented (optional)

**RPM (%postun):**
```spec
%postun
systemctl daemon-reload
```

**Winner:** RPM is more complete (reloads systemd after removal).

## File Ownership

### DEB
- Listed implicitly in directory structure
- All files in build directory are included

### RPM
```spec
%files
/usr/bin/patchiq-agent
/etc/systemd/system/patchiq-agent.service
```

**Key Difference:** RPM requires explicit file listing, DEB includes everything in build directory.

## Package Validation

### DEB
```bash
# Validate
lintian patchiq-agent_1.0.0_amd64.deb

# List files
dpkg -c patchiq-agent_1.0.0_amd64.deb

# Package info
dpkg -I patchiq-agent_1.0.0_amd64.deb
```

### RPM
```bash
# Validate
rpmlint patchiq-agent-1.0.0-1.fc40.x86_64.rpm

# List files
rpm -qlp patchiq-agent-1.0.0-1.fc40.x86_64.rpm

# Package info
rpm -qip patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

## Installation Commands

### DEB
```bash
# Install
sudo dpkg -i patchiq-agent_1.0.0_amd64.deb

# Uninstall
sudo dpkg -r patchiq-agent

# Purge (remove + config files)
sudo dpkg -P patchiq-agent

# Query installed
dpkg -l patchiq-agent

# List files
dpkg -L patchiq-agent
```

### RPM
```bash
# Install
sudo rpm -i patchiq-agent-1.0.0-1.fc40.x86_64.rpm

# Upgrade
sudo rpm -Uvh patchiq-agent-1.0.1-1.fc40.x86_64.rpm

# Uninstall
sudo rpm -e patchiq-agent

# Query installed
rpm -q patchiq-agent

# List files
rpm -ql patchiq-agent
```

## Package Naming Conventions

### DEB
```
patchiq-agent_<version>_<arch>.deb

Examples:
patchiq-agent_1.0.0_amd64.deb
patchiq-agent_1.2.3_arm64.deb
```

**Format:** `name_version_architecture.deb`

### RPM
```
patchiq-agent-<version>-<release>.<dist>.<arch>.rpm

Examples:
patchiq-agent-1.0.0-1.fc40.x86_64.rpm
patchiq-agent-1.0.0-1.el9.x86_64.rpm
patchiq-agent-1.2.3-2.fc40.x86_64.rpm
```

**Format:** `name-version-release.dist.architecture.rpm`

**Key Differences:**
- DEB uses underscores, RPM uses hyphens
- RPM includes release number (package iteration)
- RPM includes distribution tag (`.fc40`, `.el9`)

## Distribution Tags

### DEB
- No distribution tags
- Same package works on Ubuntu/Debian

### RPM
- Distribution tag auto-added: `%{?dist}`
- **Fedora 40:** `.fc40`
- **RHEL 9:** `.el9`
- **RHEL 8:** `.el8`
- Indicates build environment

## Dependency Management

### DEB
```
Depends: systemd, ca-certificates
```

Installed automatically with:
```bash
sudo apt-get install ./patchiq-agent_1.0.0_amd64.deb
```

### RPM
```spec
Requires: systemd
Requires: ca-certificates
```

Installed automatically with:
```bash
sudo dnf install ./patchiq-agent-1.0.0-1.fc40.x86_64.rpm
# or
sudo yum localinstall ./patchiq-agent-1.0.0-1.fc40.x86_64.rpm
```

**Consistency:** ✅ Both use same dependency names.

## Supported Distributions

### DEB
- Debian 11, 12
- Ubuntu 20.04, 22.04, 24.04
- Linux Mint
- Pop!_OS
- Elementary OS

### RPM
- RHEL 8, 9
- Fedora 38, 39, 40+
- CentOS Stream 8, 9
- Rocky Linux 8, 9
- Alma Linux 8, 9

## Build Script Comparison

### DEB (build-deb.sh)
- Creates directory structure
- Copies binary
- Creates service file inline
- Creates control file inline
- Creates maintainer scripts inline
- Runs dpkg-deb
- Runs lintian (optional)

### RPM (build-rpm.sh)
- Creates ~/rpmbuild/ structure
- Copies spec file
- Copies binary
- Runs rpmbuild with defines
- Copies result to dist/
- Runs rpmlint (optional)

**Key Difference:** DEB script creates all files, RPM script uses pre-written spec file.

## Documentation

### DEB
- README in `installer/debian/`
- (DEB-PACKAGING.md to be created by Task 5.2)

### RPM
- README in `installer/rpm/`
- Complete guide: `docs/RPM-PACKAGING.md` (605 lines)
- Testing script: `test-rpm.sh`

## Testing

### DEB
- Manual testing on Ubuntu/Debian
- Install/uninstall/upgrade tests

### RPM
- Automated testing script: `test-rpm.sh`
- Validates metadata, files, scripts
- Interactive install/uninstall testing

**Winner:** RPM has dedicated testing script.

## Improvements Needed for DEB

Based on RPM implementation:

1. **Add postrm script** - Reload systemd after removal
2. **Fix prerm logic** - Only stop service on uninstall, not upgrade
3. **Add testing script** - Similar to `test-rpm.sh`
4. **Create comprehensive docs** - Similar to `RPM-PACKAGING.md`
5. **Add validation** - Better lintian integration

## Best Practices Followed

### Both Implementations ✅
- Binary in `/usr/bin/`
- Service in `/etc/systemd/system/`
- Auto-start via systemd
- Clean uninstallation
- Dependency declarations
- Build automation

### RPM Advantages ✅
- Better upgrade handling (service stays running)
- Post-uninstall cleanup (systemd reload)
- Comprehensive documentation
- Automated testing script
- Explicit file listing

### DEB Advantages ✅
- Simpler build process
- No build directory setup needed
- Files pre-staged (easier to verify)

## Recommendations

### For DEB Package
1. Update `prerm` script to check if upgrade:
   ```bash
   if [ "$1" != "upgrade" ]; then
       systemctl stop patchiq-agent.service
       systemctl disable patchiq-agent.service
   fi
   ```

2. Add `postrm` script:
   ```bash
   #!/bin/bash
   set -e
   if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
       systemctl daemon-reload
   fi
   exit 0
   ```

3. Create `test-deb.sh` similar to `test-rpm.sh`

4. Create `DEB-PACKAGING.md` documentation

### For RPM Package
- No changes needed, implementation is production-ready

## Conclusion

Both packaging implementations provide professional-grade installation for the PatchIQ Agent. Key differences:

**Structure:**
- DEB: Directory-based, files pre-staged
- RPM: Spec file-based, files created during build

**Upgrade Handling:**
- DEB: May restart service during upgrade
- RPM: Service stays running during upgrade (better)

**Documentation:**
- DEB: Basic README
- RPM: Comprehensive guide + testing script (better)

**Complexity:**
- DEB: Simpler build process
- RPM: More sophisticated build infrastructure

Both are ready for production use, with RPM having slightly better upgrade handling and documentation.
