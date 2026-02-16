# Fresh Install Test Plan: windows-server-2019

**Platform:** windows-server-2019
**Test Date:** TBD
**Tester:** TBD
**Status:** Not Started

---

## Prerequisites

- Fresh windows-server-2019 installation
- Root/Administrator access
- Network connectivity to backend
- Installer package available

---

## Installation Commands

```powershell
msiexec /i PatchIQ-Agent-1.0.0.msi /qn SERVERURL="https://[BACKEND_URL]/api"
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

- [ ] Windows service registered
- [ ] Service account configured
- [ ] Windows Defender allows agent

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
