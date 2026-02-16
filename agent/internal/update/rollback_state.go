package update

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/rs/zerolog/log"
)

// RollbackState stores information needed to rollback an agent self-update
type RollbackState struct {
	CurrentVersion     string    `json:"currentVersion"`
	PreviousVersion    string    `json:"previousVersion"`
	PreviousBinaryPath string    `json:"previousBinaryPath"`
	UpdateStartedAt    time.Time `json:"updateStartedAt"`
	HealthCheckFailed  bool      `json:"healthCheckFailed"`
	RollbackReason     string    `json:"rollbackReason,omitempty"`
	ConfigBackupPath   string    `json:"configBackupPath,omitempty"`
	Platform           string    `json:"platform"`
	Architecture       string    `json:"architecture"`
}

// SaveRollbackState persists rollback state to disk
func SaveRollbackState(state *RollbackState) error {
	stateDir := getRollbackStateDir()
	if err := os.MkdirAll(stateDir, 0755); err != nil {
		return fmt.Errorf("failed to create rollback state directory: %w", err)
	}

	stateFile := filepath.Join(stateDir, "agent-update-rollback.json")
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal rollback state: %w", err)
	}

	if err := os.WriteFile(stateFile, data, 0600); err != nil {
		return fmt.Errorf("failed to write rollback state: %w", err)
	}

	log.Info().
		Str("currentVersion", state.CurrentVersion).
		Str("previousVersion", state.PreviousVersion).
		Msg("Saved agent update rollback state")

	return nil
}

// LoadRollbackState reads rollback state from disk
func LoadRollbackState() (*RollbackState, error) {
	stateDir := getRollbackStateDir()
	stateFile := filepath.Join(stateDir, "agent-update-rollback.json")

	data, err := os.ReadFile(stateFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("no rollback state found")
		}
		return nil, fmt.Errorf("failed to read rollback state: %w", err)
	}

	var state RollbackState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("failed to parse rollback state: %w", err)
	}

	return &state, nil
}

// ClearRollbackState removes the rollback state file
func ClearRollbackState() error {
	stateDir := getRollbackStateDir()
	stateFile := filepath.Join(stateDir, "agent-update-rollback.json")

	if err := os.Remove(stateFile); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to remove rollback state: %w", err)
	}

	log.Info().Msg("Cleared agent update rollback state")
	return nil
}

// BackupConfigFiles creates backups of configuration files before update
func BackupConfigFiles() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	configDir := filepath.Join(homeDir, ".patchify-agent")
	backupDir := filepath.Join(configDir, "backup", fmt.Sprintf("pre-update-%d", time.Now().Unix()))

	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create backup directory: %w", err)
	}

	// Files to backup
	filesToBackup := []string{
		"config.json",
		"credentials.json",
	}

	backedUpCount := 0
	for _, filename := range filesToBackup {
		srcPath := filepath.Join(configDir, filename)
		dstPath := filepath.Join(backupDir, filename)

		// Skip if source doesn't exist
		if _, err := os.Stat(srcPath); os.IsNotExist(err) {
			continue
		}

		// Copy file
		data, err := os.ReadFile(srcPath)
		if err != nil {
			log.Warn().Err(err).Str("file", filename).Msg("Failed to read config file for backup")
			continue
		}

		if err := os.WriteFile(dstPath, data, 0600); err != nil {
			log.Warn().Err(err).Str("file", filename).Msg("Failed to write config backup")
			continue
		}

		backedUpCount++
	}

	if backedUpCount == 0 {
		return "", fmt.Errorf("no config files backed up")
	}

	log.Info().
		Str("backupDir", backupDir).
		Int("fileCount", backedUpCount).
		Msg("Backed up config files before update")

	return backupDir, nil
}

// RestoreConfigFiles restores configuration files from backup
func RestoreConfigFiles(backupDir string) error {
	if backupDir == "" {
		return fmt.Errorf("backup directory not specified")
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	configDir := filepath.Join(homeDir, ".patchify-agent")

	// Files to restore
	filesToRestore := []string{
		"config.json",
		"credentials.json",
	}

	restoredCount := 0
	for _, filename := range filesToRestore {
		srcPath := filepath.Join(backupDir, filename)
		dstPath := filepath.Join(configDir, filename)

		// Skip if backup doesn't exist
		if _, err := os.Stat(srcPath); os.IsNotExist(err) {
			continue
		}

		// Copy file
		data, err := os.ReadFile(srcPath)
		if err != nil {
			log.Warn().Err(err).Str("file", filename).Msg("Failed to read config backup")
			continue
		}

		if err := os.WriteFile(dstPath, data, 0600); err != nil {
			log.Warn().Err(err).Str("file", filename).Msg("Failed to restore config file")
			continue
		}

		restoredCount++
	}

	if restoredCount == 0 {
		return fmt.Errorf("no config files restored")
	}

	log.Info().
		Str("backupDir", backupDir).
		Int("fileCount", restoredCount).
		Msg("Restored config files from backup")

	return nil
}

// CleanOldBackups removes old backup directories, keeping only the last N
func CleanOldBackups(keepCount int) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	backupBaseDir := filepath.Join(homeDir, ".patchify-agent", "backup")

	entries, err := os.ReadDir(backupBaseDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No backups yet
		}
		return err
	}

	// Filter to only backup directories
	var backupDirs []os.DirEntry
	for _, entry := range entries {
		if entry.IsDir() && filepath.HasPrefix(entry.Name(), "pre-update-") {
			backupDirs = append(backupDirs, entry)
		}
	}

	// If we don't have more than keepCount, nothing to clean
	if len(backupDirs) <= keepCount {
		return nil
	}

	// Sort by name (which includes timestamp) and remove oldest
	toRemove := len(backupDirs) - keepCount
	for i := 0; i < toRemove; i++ {
		dirPath := filepath.Join(backupBaseDir, backupDirs[i].Name())
		if err := os.RemoveAll(dirPath); err != nil {
			log.Warn().Err(err).Str("dir", dirPath).Msg("Failed to remove old backup")
		} else {
			log.Debug().Str("dir", dirPath).Msg("Removed old backup directory")
		}
	}

	return nil
}

// getRollbackStateDir returns the directory for storing rollback state
func getRollbackStateDir() string {
	homeDir, _ := os.UserHomeDir()

	switch runtime.GOOS {
	case "windows":
		return filepath.Join(homeDir, ".patchify-agent", "update")
	case "darwin":
		return filepath.Join(homeDir, ".patchify-agent", "update")
	default: // linux
		return filepath.Join(homeDir, ".patchify-agent", "update")
	}
}

// KeepPreviousVersions maintains the last N binary versions for rollback
func KeepPreviousVersions(currentBinary string, keepCount int) error {
	backupPattern := currentBinary + ".v*"

	matches, err := filepath.Glob(backupPattern)
	if err != nil {
		return fmt.Errorf("failed to list backup binaries: %w", err)
	}

	// If we don't have more than keepCount, nothing to clean
	if len(matches) <= keepCount {
		return nil
	}

	// Remove oldest backups
	toRemove := len(matches) - keepCount
	for i := 0; i < toRemove; i++ {
		if err := os.Remove(matches[i]); err != nil {
			log.Warn().Err(err).Str("file", matches[i]).Msg("Failed to remove old binary backup")
		} else {
			log.Debug().Str("file", matches[i]).Msg("Removed old binary backup")
		}
	}

	log.Info().
		Int("kept", keepCount).
		Int("removed", toRemove).
		Msg("Cleaned up old binary versions")

	return nil
}

// CheckRollbackTimeout checks if update has been running too long without health check
// Returns true if rollback should be triggered
func CheckRollbackTimeout(state *RollbackState, timeout time.Duration) bool {
	if state == nil {
		return false
	}

	elapsed := time.Since(state.UpdateStartedAt)
	if elapsed > timeout {
		log.Warn().
			Dur("elapsed", elapsed).
			Dur("timeout", timeout).
			Msg("Update health check timeout - triggering rollback")
		return true
	}

	return false
}
