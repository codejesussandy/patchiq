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
mkdir -p $RPM_BUILD_ROOT/usr/bin
mkdir -p $RPM_BUILD_ROOT/etc/systemd/system

# Install binary
install -m 755 %{SOURCE0} $RPM_BUILD_ROOT/usr/bin/patchiq-agent

# Create systemd service file
cat > $RPM_BUILD_ROOT/etc/systemd/system/patchiq-agent.service <<'EOF'
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
if [ $1 -eq 0 ]; then
    systemctl stop patchiq-agent.service
    systemctl disable patchiq-agent.service
fi

%postun
systemctl daemon-reload

%files
/usr/bin/patchiq-agent
/etc/systemd/system/patchiq-agent.service

%changelog
* Fri Feb 14 2026 PatchIQ <support@patchiq.io> - 1.0.0-1
- Initial release
