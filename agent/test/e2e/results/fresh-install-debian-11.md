# Fresh Install Test Plan: debian-11

**Platform:** debian-11
**Test Date:** TBD
**Tester:** TBD
**Status:** Not Started

---

## Prerequisites

- Fresh debian-11 installation
- Root/Administrator access
- Network connectivity to backend
- Installer package available

---

## Installation Commands

```bash
sudo dpkg -i patchiq-agent_1.0.0_amd64.deb
sudo sed -i "s|server_url:.*|server_url: https://[BACKEND_URL]/api|" /etc/patchiq/agent.conf
sudo systemctl start patchiq-agent
```

---

## Verification Checklist

- [ ] Package installs without errors
- [ ] Service/daemon installed
- [ ] Service running and enabled
- [ ] Configuration file created
- [ ] Logs directory created
- [ ] Agent binary installed
- [ ] Agent registers with backend
- [ ] Heartbeat working (check within 60 seconds)
- [ ] Inventory collection succeeds
- [ ] WebUI accessible on localhost:4504
- [ ] Service auto-starts after reboot

---

## Platform-Specific Checks

- [ ] Systemd service installed
- [ ] Service enabled at boot
- [ ] AppArmor/SELinux configured

---

## Known Issues

[Document any platform-specific issues discovered during testing]

---

## Test Result

**Overall:** Pass / Fail / Incomplete

**Tested By:** _______________
**Date:** _______________
**Notes:** 
_______________

---
