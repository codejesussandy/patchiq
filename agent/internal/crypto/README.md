# Crypto Package

This package provides OS-native encryption for sensitive agent credentials (access tokens, refresh tokens) stored in `credentials.json`.

## Platform-Specific Encryption

### Windows (DPAPI)
- Uses Windows Data Protection API (DPAPI)
- Encryption tied to user account and machine
- No additional configuration needed
- Data cannot be decrypted on different machines or by different users

**Implementation**: `encryption_windows.go`
- `CryptProtectData` for encryption
- `CryptUnprotectData` for decryption
- Requires: `golang.org/x/sys/windows`

### macOS (Keychain)
- Uses macOS Keychain Services
- Credentials stored in user's login keychain
- Service name: `com.patchiq.agent`
- Account name: `credentials`

**Implementation**: `encryption_darwin.go`
- `security add-generic-password` to store
- `security find-generic-password` to retrieve
- Base64 encoding for safe command-line transmission
- File contains "KEYCHAIN" marker, actual data in Keychain

### Linux (AES-256-GCM)
- Uses AES-256-GCM authenticated encryption
- Encryption key derived from `/etc/machine-id` (fallback: `/var/lib/dbus/machine-id`)
- 256-bit key via SHA-256 hash of machine ID
- Random nonce per encryption operation

**Implementation**: `encryption_linux.go`
- Standard Go `crypto/aes` and `crypto/cipher` packages
- No external dependencies
- Data cannot be decrypted on different machines

## Usage

```go
import "github.com/patchify/agent/internal/crypto"

// Encrypt data
plaintext := []byte("sensitive data")
encrypted, err := crypto.Encrypt(plaintext)
if err != nil {
    // Handle error - fall back to plaintext if needed
}

// Decrypt data
decrypted, err := crypto.Decrypt(encrypted)
if err != nil {
    // Handle error - might be plaintext
}
```

## Migration Support

The package automatically handles migration from plaintext to encrypted credentials:

1. **Decrypt** detects plaintext JSON and returns it unchanged
2. **SaveCredentials** re-encrypts on next save
3. No manual migration needed

Detection logic:
- **Linux**: Checks if data length < nonce size, or if decryption fails
- **macOS**: Checks if data != "KEYCHAIN" marker
- **Windows**: DPAPI decryption fails on non-encrypted data

## Security Properties

| Platform | Encryption | Key Storage | Portability |
|----------|-----------|-------------|-------------|
| Windows  | DPAPI | OS-managed | Machine + User bound |
| macOS    | Keychain | System Keychain | Machine + User bound |
| Linux    | AES-256-GCM | Derived from machine-id | Machine bound |

**Key Points**:
- Credentials cannot be copied to another machine and decrypted
- Linux: Key derived from machine-id (survives reboots, not OS reinstalls)
- macOS: Stored in user's keychain (survives reboots, not user deletion)
- Windows: DPAPI bound to user profile (survives reboots, not profile deletion)

## Error Handling

The package uses graceful degradation:
- If encryption fails → log warning, save as plaintext
- If decryption fails → log warning, try plaintext
- Allows operation even if encryption unavailable

## Testing

Run tests:
```bash
go test ./internal/crypto/... -v
```

Tests cover:
- Empty data
- Simple strings
- JSON data
- Binary data
- Plaintext migration

## File Permissions

Credentials file is always created with `0600` permissions (owner read/write only), regardless of encryption status.

## Build Tags

Platform-specific implementations use Go build tags:
- `encryption_windows.go` - `//go:build windows`
- `encryption_darwin.go` - `//go:build darwin`
- `encryption_linux.go` - `//go:build linux`
- `encryption.go` - Default (unsupported platforms)

Cross-compilation example:
```bash
GOOS=windows GOARCH=amd64 go build ./cmd/agent
GOOS=linux GOARCH=amd64 go build ./cmd/agent
GOOS=darwin GOARCH=arm64 go build ./cmd/agent
```
