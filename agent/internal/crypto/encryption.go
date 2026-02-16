//go:build !windows && !darwin && !linux
// +build !windows,!darwin,!linux

package crypto

import "fmt"

// Encrypt encrypts data using OS-specific encryption
func Encrypt(data []byte) ([]byte, error) {
	return nil, fmt.Errorf("encryption not supported on this platform")
}

// Decrypt decrypts data using OS-specific decryption
func Decrypt(data []byte) ([]byte, error) {
	return nil, fmt.Errorf("decryption not supported on this platform")
}
