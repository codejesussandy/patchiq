# Agent Credential Encryption - Quick Start Guide

## What Changed?

Agent credentials (`credentials.json`) are now **encrypted at rest** using OS-native encryption:
- **Windows**: DPAPI (Data Protection API)
- **macOS**: Keychain Services
- **Linux**: AES-256-GCM with machine-id key

## For Developers

### No Code Changes Required

The encryption is **transparent** to existing code:

```go
// This still works exactly the same
creds := &client.Credentials{
    AgentID:      "agent-123",
    AccessToken:  "secret-token",
    RefreshToken: "refresh-token",
}

// Save (now encrypted)
client.SaveCredentials(dataDir, creds)

// Load (auto-decrypts)
loaded, err := client.LoadCredentials(dataDir)
```

### Testing

```bash
# Run all tests
go test ./internal/crypto/... ./internal/client/... -v

# Test encryption
go test ./internal/crypto/... -v

# Test credentials
go test ./internal/client/... -v
```

### Building

```bash
# macOS
go build -o patchify-agent ./cmd/agent

# Windows
GOOS=windows GOARCH=amd64 go build -o patchify-agent.exe ./cmd/agent

# Linux  
GOOS=linux GOARCH=amd64 go build -o patchify-agent-linux ./cmd/agent
```

## For Operations

### Migration

**Existing deployments automatically migrate:**
1. Agent starts and loads plaintext `credentials.json`
2. Detects plaintext format
3. Logs: `Migrating plaintext credentials to encrypted format`
4. Re-saves with encryption
5. Future loads use encrypted version

**No manual intervention required.**

### Verification

Check if credentials are encrypted:

```bash
# macOS - should see "KEYCHAIN"
cat /path/to/data/credentials.json

# Linux/Windows - should see binary/encrypted data (not JSON)
hexdump -C /path/to/data/credentials.json | head
```

### Troubleshooting

**Encryption fails:**
- Agent logs warning and falls back to plaintext
- Check logs for error details
- Verify OS permissions

**Decryption fails:**
- Agent attempts plaintext fallback
- Check if credentials file is corrupted
- Verify machine-id exists (Linux: `/etc/machine-id`)

## Security Notes

### What's Protected
✅ Credentials encrypted at rest  
✅ Machine/user binding (can't copy to another machine)  
✅ File permissions enforced (0600)

### What's NOT Protected
❌ Tokens in memory (use memory encryption if needed)  
❌ Root/admin access (OS-level access bypasses encryption)  
❌ Network transmission (use TLS - already implemented)

### Platform Details

| Platform | Storage | Bound To |
|----------|---------|----------|
| Windows | DPAPI | User + Machine |
| macOS | Keychain | User + Machine |
| Linux | AES-256-GCM | Machine |

## FAQ

**Q: Will this break existing agents?**  
A: No, plaintext credentials are automatically migrated.

**Q: What if encryption fails?**  
A: Agent logs warning and falls back to plaintext operation.

**Q: Can I disable encryption?**  
A: No, but it gracefully degrades if unavailable.

**Q: What about Docker containers?**  
A: Linux encryption works in containers (uses container's machine-id).

**Q: Performance impact?**  
A: Negligible - encryption only happens on save/load (not per request).

## Additional Resources

- Full implementation details: `/agent/ENCRYPTION_IMPLEMENTATION.md`
- Package documentation: `/agent/internal/crypto/README.md`
- Tests: `/agent/internal/crypto/encryption_test.go`
- Integration tests: `/agent/internal/client/credentials_test.go`
