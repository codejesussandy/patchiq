# Fresh Install Test Plan: Windows 11 Pro

**Platform:** Windows 11 Pro (22H2)
**Architecture:** amd64
**Test Date:** TBD
**Tester:** TBD

## Prerequisites
- Fresh Windows 11 Pro installation (22H2+)
- Administrator access
- Backend accessible
- MSI installer available

## Installation
```powershell
msiexec /i PatchIQ-Agent-1.0.0.msi /qn SERVERURL="https://[BACKEND_URL]/api"
```

## Verification Checklist
- [ ] Service installed (PatchIQAgent)
- [ ] Service running and set to Automatic
- [ ] Files installed to C:\Program Files\PatchIQ
- [ ] Configuration created at C:\ProgramData\PatchIQ\agent.conf
- [ ] Logs directory created
- [ ] Agent registered with backend
- [ ] Heartbeat working
- [ ] Inventory collection succeeds
- [ ] WebUI accessible on port 4504
- [ ] Service auto-starts after reboot

## Known Issues
[Document any Windows 11-specific issues]

## Result: Pass / Fail
