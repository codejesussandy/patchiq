package client

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Credentials represents stored agent credentials
type Credentials struct {
	AgentID      string `json:"agentId"`
	AssetID      string `json:"assetId"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	MachineID    string `json:"machineId"`
}

// SaveCredentials saves agent credentials to disk
func SaveCredentials(dataDir string, creds *Credentials) error {
	if err := os.MkdirAll(dataDir, 0700); err != nil {
		return err
	}

	credPath := filepath.Join(dataDir, "credentials.json")
	data, err := json.MarshalIndent(creds, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(credPath, data, 0600)
}

// LoadCredentials loads agent credentials from disk
func LoadCredentials(dataDir string) (*Credentials, error) {
	credPath := filepath.Join(dataDir, "credentials.json")

	data, err := os.ReadFile(credPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // No credentials yet
		}
		return nil, err
	}

	var creds Credentials
	if err := json.Unmarshal(data, &creds); err != nil {
		return nil, err
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
