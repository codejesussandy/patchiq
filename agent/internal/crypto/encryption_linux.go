//go:build linux
// +build linux

package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"strings"
)

// Encrypt encrypts data using AES-256-GCM with machine-id key
func Encrypt(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, nil
	}

	key, err := getMachineKey()
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	return gcm.Seal(nonce, nonce, data, nil), nil
}

// Decrypt decrypts data using AES-256-GCM with machine-id key
func Decrypt(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, nil
	}

	key, err := getMachineKey()
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		// Plaintext format - return as-is for migration
		return data, nil
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		// Decryption failed - might be plaintext, return as-is for migration
		return data, nil
	}

	return plaintext, nil
}

// getMachineKey derives encryption key from /etc/machine-id
func getMachineKey() ([]byte, error) {
	data, err := os.ReadFile("/etc/machine-id")
	if err != nil {
		// Fallback to /var/lib/dbus/machine-id
		data, err = os.ReadFile("/var/lib/dbus/machine-id")
		if err != nil {
			return nil, fmt.Errorf("failed to read machine-id: %w", err)
		}
	}

	// Trim whitespace from machine-id
	machineID := strings.TrimSpace(string(data))

	// Derive 32-byte key from machine-id
	hash := sha256.Sum256([]byte(machineID))
	return hash[:], nil
}
