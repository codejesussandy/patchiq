# Fresh Install Test Plan: macos-14-intel

**Platform:** macos-14-intel
**Test Date:** TBD
**Tester:** TBD
**Status:** Not Started

---

## Prerequisites

- Fresh macos-14-intel installation
- Root/Administrator access
- Network connectivity to backend
- Installer package available

---

## Installation Commands

```bash
sudo installer -pkg PatchIQ-Agent-1.0.0.pkg -target /
sudo launchctl load /Library/LaunchDaemons/io.patchiq.agent.plist
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

- [ ] LaunchDaemon plist installed
- [ ] Gatekeeper allows agent
- [ ] Correct file permissions

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
