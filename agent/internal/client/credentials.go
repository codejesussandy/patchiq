package client

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"

	"github.com/patchify/agent/internal/crypto"
)

// Credentials represents stored agent credentials
type Credentials struct {
	AgentID      string `json:"agentId"`
	AssetID      string `json:"assetId"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	MachineID    string `json:"machineId"`
	ServerURL    string `json:"serverUrl,omitempty"`
}

// SaveCredentials saves agent credentials to disk with encryption
func SaveCredentials(dataDir string, creds *Credentials) error {
	if err := os.MkdirAll(dataDir, 0700); err != nil {
		return err
	}

	// Marshal credentials to JSON
	plaintext, err := json.MarshalIndent(creds, "", "  ")
	if err != nil {
		return err
	}

	// Encrypt credentials
	encrypted, err := crypto.Encrypt(plaintext)
	if err != nil {
		log.Printf("Warning: Encryption failed, falling back to plaintext: %v", err)
		encrypted = plaintext
	}

	credPath := filepath.Join(dataDir, "credentials.json")
	return os.WriteFile(credPath, encrypted, 0600)
}

// LoadCredentials loads and decrypts agent credentials from disk
func LoadCredentials(dataDir string) (*Credentials, error) {
	credPath := filepath.Join(dataDir, "credentials.json")

	data, err := os.ReadFile(credPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // No credentials yet
		}
		return nil, err
	}

	// Decrypt credentials
	decrypted, err := crypto.Decrypt(data)
	if err != nil {
		log.Printf("Warning: Decryption failed, assuming plaintext: %v", err)
		decrypted = data
	}

	var creds Credentials
	if err := json.Unmarshal(decrypted, &creds); err != nil {
		return nil, err
	}

	// Auto-migrate: if data matches decrypted, it's plaintext - re-save with encryption
	// We check if decryption returned the same data (plaintext passthrough)
	if len(data) > 0 && data[0] == '{' {
		// Looks like JSON plaintext - try to migrate
		log.Println("Migrating plaintext credentials to encrypted format")
		if migErr := SaveCredentials(dataDir, &creds); migErr != nil {
			log.Printf("Warning: Failed to migrate credentials: %v", migErr)
		}
	}

	return &creds, nil
}

// DeleteCredentials removes stored credentials
func DeleteCredentials(dataDir string) error {
	credPath := filepath.Join(dataDir, "credentials.json")
	err := os.Remove(credPath)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}
