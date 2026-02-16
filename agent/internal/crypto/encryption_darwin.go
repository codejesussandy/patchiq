//go:build darwin
// +build darwin

package crypto

import (
	"encoding/base64"
	"fmt"
	"os/exec"
	"strings"
)

const (
	serviceName = "com.patchiq.agent"
	accountName = "credentials"
)

// Encrypt stores data in macOS Keychain
func Encrypt(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, nil
	}

	// Encode data as base64 to safely pass through command line
	encoded := base64.StdEncoding.EncodeToString(data)

	// Delete existing entry first (ignore errors)
	deleteCmd := exec.Command("security", "delete-generic-password",
		"-a", accountName,
		"-s", serviceName)
	deleteCmd.Run()

	// Store in keychain
	cmd := exec.Command("security", "add-generic-password",
		"-a", accountName,
		"-s", serviceName,
		"-w", encoded,
		"-U")

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("failed to store in keychain: %w", err)
	}

	// Return marker to indicate data is in keychain
	return []byte("KEYCHAIN"), nil
}

// Decrypt retrieves data from macOS Keychain
func Decrypt(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, nil
	}

	// Check if data is keychain marker
	if string(data) != "KEYCHAIN" {
		// Old plaintext format - return as-is for migration
		return data, nil
	}

	// Retrieve from keychain
	cmd := exec.Command("security", "find-generic-password",
		"-a", accountName,
		"-s", serviceName,
		"-w")

	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve from keychain: %w", err)
	}

	// Remove trailing newline
	encoded := strings.TrimSpace(string(output))

	// Decode from base64
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("failed to decode keychain data: %w", err)
	}

	return decoded, nil
}
