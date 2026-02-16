# File Permissions Audit

## Windows File Permissions

### Binary Permissions
```powershell
# C:\Program Files\PatchIQ\Agent\patchiq-agent.exe
$acl = Get-Acl "C:\Program Files\PatchIQ\Agent\patchiq-agent.exe"
$acl.Access | Format-Table IdentityReference, FileSystemRights, AccessControlType
```

**Expected:**
- SYSTEM: FullControl
- Administrators: Read & Execute
- Users: Read & Execute (NO Write)

**Result:** [ ] PASS [ ] FAIL

---

### Config Permissions
```powershell
# C:\ProgramData\PatchIQ\Agent\config.yaml
$acl = Get-Acl "C:\ProgramData\PatchIQ\Agent\config.yaml"
```

**Expected:**
- SYSTEM: FullControl
- Administrators: Read only

**Result:** [ ] PASS [ ] FAIL

---

## macOS File Permissions

### Binary Permissions
```bash
ls -l "/Library/Application Support/PatchIQ/Agent/patchiq-agent"
# Expected: -rwxr-xr-x or -rwx------ root wheel
```

**Result:** [ ] PASS [ ] FAIL

---

### Config Permissions
```bash
ls -l "/Library/Application Support/PatchIQ/Agent/config.yaml"
# Expected: -rw-r--r-- or -rw------- root wheel
```

**Result:** [ ] PASS [ ] FAIL

---

## Linux File Permissions

### Binary Permissions
```bash
stat -c "%a %U:%G" /usr/bin/patchiq-agent
# Expected: 755 root:root
```

**Result:** [ ] PASS [ ] FAIL

---

### Config Permissions
```bash
stat -c "%a %U:%G" /etc/patchiq/agent.yaml
# Expected: 600 root:root
```

**Result:** [ ] PASS [ ] FAIL

---

### Log Permissions
```bash
stat -c "%a %U:%G" /var/log/patchiq/agent.log
# Expected: 644 root:root
```

**Result:** [ ] PASS [ ] FAIL

---

### Data Directory Permissions
```bash
stat -c "%a %U:%G" /var/lib/patchiq/agent/
# Expected: 700 root:root
```

**Result:** [ ] PASS [ ] FAIL

---

## Security Checklist

- [ ] Windows: Binary not writable by non-admin
- [ ] Windows: Config not readable by standard users
- [ ] macOS: Binary 755 or 700, owned by root
- [ ] macOS: Config 644 or 600, owned by root
- [ ] Linux: Binary 755 root:root
- [ ] Linux: Config 600 root:root
- [ ] Linux: Logs 644 root:root
- [ ] Linux: Data directory 700 root:root
- [ ] All: No world-writable files

## Findings

**Critical:** None

**Conclusion:** [ ] Secure [ ] Needs Improvement

---

**Last Updated:** 2026-02-14
