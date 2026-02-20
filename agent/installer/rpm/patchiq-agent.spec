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
mkdir -p $RPM_BUILD_ROOT/usr/local/bin
mkdir -p $RPM_BUILD_ROOT/etc/systemd/system
mkdir -p $RPM_BUILD_ROOT/etc/patchiq
mkdir -p $RPM_BUILD_ROOT/var/lib/patchiq-agent

# Install binary
install -m 755 %{SOURCE0} $RPM_BUILD_ROOT/usr/local/bin/patchiq-agent

# Create default config file
cat > $RPM_BUILD_ROOT/etc/patchiq/config.json <<'EOF'
{
  "serverUrl": "",
  "webUiPort": 3006,
  "dataDir": "/var/lib/patchiq-agent",
  "enableDownloadResume": true
}
EOF

# Create systemd service file
cat > $RPM_BUILD_ROOT/etc/systemd/system/patchiq-agent.service <<'EOF'
[Unit]
Description=PatchIQ Agent for Patch and Software Management
Documentation=https://patchiq.io/docs
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/patchiq-agent
Restart=always
RestartSec=10
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=patchiq-agent

[Install]
WantedBy=multi-user.target
EOF

%post
systemctl daemon-reload
systemctl enable patchiq-agent.service
systemctl start patchiq-agent.service

%preun
if [ $1 -eq 0 ]; then
    systemctl stop patchiq-agent.service
    systemctl disable patchiq-agent.service
fi

%postun
systemctl daemon-reload

%files
/usr/local/bin/patchiq-agent
/etc/systemd/system/patchiq-agent.service
%config(noreplace) /etc/patchiq/config.json
%dir /var/lib/patchiq-agent

%changelog
* Wed Feb 18 2026 PatchIQ <support@patchiq.io> - 0.1.0-1
- Initial release
