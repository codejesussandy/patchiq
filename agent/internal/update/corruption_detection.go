package update

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/rs/zerolog/log"
)

// CorruptionType indicates the type of corruption detected
type CorruptionType string

const (
	CorruptionTruncated CorruptionType = "truncated_download"
	CorruptionChecksum  CorruptionType = "checksum_mismatch"
	CorruptionSignature CorruptionType = "signature_verification_failed"
	CorruptionUnknown   CorruptionType = "unknown"
)

// CorruptionReport contains details about detected corruption
type CorruptionReport struct {
	Detected       bool
	Type           CorruptionType
	Message        string
	ExpectedSize   int64
	ActualSize     int64
	ExpectedHash   string
	ActualHash     string
	FilePath       string
	ShouldRollback bool
}

// DetectCorruption performs comprehensive corruption detection on a binary
func DetectCorruption(binaryPath string, expectedSize int64, expectedChecksum string) CorruptionReport {
	report := CorruptionReport{
		Detected:       false,
		FilePath:       binaryPath,
		ShouldRollback: false,
	}

	// Check 1: File exists
	fileInfo, err := os.Stat(binaryPath)
	if err != nil {
		report.Detected = true
		report.Type = CorruptionUnknown
		report.Message = fmt.Sprintf("binary not found: %v", err)
		report.ShouldRollback = true
		return report
	}

	// Check 2: Detect truncated downloads
	actualSize := fileInfo.Size()
	report.ActualSize = actualSize
	report.ExpectedSize = expectedSize

	if expectedSize > 0 && actualSize < expectedSize {
		report.Detected = true
		report.Type = CorruptionTruncated
		report.Message = fmt.Sprintf("truncated download: expected %d bytes, got %d bytes", expectedSize, actualSize)
		report.ShouldRollback = true

		log.Error().
			Str("file", binaryPath).
			Int64("expected", expectedSize).
			Int64("actual", actualSize).
			Msg("Detected truncated download")

		return report
	}

	// Check 3: Verify checksum
	if expectedChecksum != "" {
		actualChecksum, err := calculateChecksum(binaryPath)
		if err != nil {
			report.Detected = true
			report.Type = CorruptionUnknown
			report.Message = fmt.Sprintf("failed to calculate checksum: %v", err)
			report.ShouldRollback = true
			return report
		}

		report.ActualHash = actualChecksum
		report.ExpectedHash = expectedChecksum

		if actualChecksum != expectedChecksum {
			report.Detected = true
			report.Type = CorruptionChecksum
			report.Message = fmt.Sprintf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
			report.ShouldRollback = true

			log.Error().
				Str("file", binaryPath).
				Str("expected", expectedChecksum).
				Str("actual", actualChecksum).
				Msg("Detected checksum mismatch")

			return report
		}
	}

	log.Info().
		Str("file", binaryPath).
		Int64("size", actualSize).
		Str("checksum", report.ActualHash).
		Msg("No corruption detected")

	return report
}

// calculateChecksum calculates SHA256 checksum of a file
func calculateChecksum(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hasher.Sum(nil)), nil
}

// DetectSignatureFailure checks if binary signature verification failed
// This integrates with Pipeline 4 signature verification
func DetectSignatureFailure(binaryPath string, signatureData []byte) CorruptionReport {
	report := CorruptionReport{
		Detected:       false,
		FilePath:       binaryPath,
		Type:           CorruptionSignature,
		ShouldRollback: false,
	}

	// Placeholder for signature verification
	// Will be implemented in Pipeline 4
	// For now, we just log and don't fail
	if len(signatureData) == 0 {
		log.Debug().Msg("No signature data provided - skipping signature verification")
		return report
	}

	// TODO: Implement signature verification when Pipeline 4 is complete
	log.Info().Msg("Signature verification not yet implemented - skipping")

	return report
}

// AutoRollbackOnCorruption performs automatic rollback if corruption is detected
func AutoRollbackOnCorruption(report CorruptionReport, rollbackState *RollbackState) error {
	if !report.Detected || !report.ShouldRollback {
		return nil // No corruption or rollback not needed
	}

	log.Warn().
		Str("corruptionType", string(report.Type)).
		Str("message", report.Message).
		Msg("Corruption detected - initiating automatic rollback")

	if rollbackState == nil {
		return fmt.Errorf("no rollback state available")
	}

	// Update rollback state with corruption reason
	rollbackState.RollbackReason = fmt.Sprintf("corruption: %s - %s", report.Type, report.Message)

	// Perform rollback
	if err := PerformRollback(rollbackState); err != nil {
		return fmt.Errorf("auto-rollback failed: %w", err)
	}

	log.Info().Msg("Auto-rollback completed successfully")
	return nil
}

// PerformRollback restores the previous binary version
func PerformRollback(state *RollbackState) error {
	if state == nil {
		return fmt.Errorf("no rollback state provided")
	}

	if state.PreviousBinaryPath == "" {
		return fmt.Errorf("no previous binary path in rollback state")
	}

	// Get current binary path
	currentBinary, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get current binary path: %w", err)
	}
	currentBinary, _ = filepath.EvalSymlinks(currentBinary)

	log.Info().
		Str("from", state.CurrentVersion).
		Str("to", state.PreviousVersion).
		Str("reason", state.RollbackReason).
		Msg("Performing agent rollback")

	// Verify previous binary exists
	if _, err := os.Stat(state.PreviousBinaryPath); err != nil {
		return fmt.Errorf("previous binary not found: %w", err)
	}

	// Create backup of current (failed) binary for debugging
	failedBinaryPath := currentBinary + ".failed"
	if err := copyFile(currentBinary, failedBinaryPath); err != nil {
		log.Warn().Err(err).Msg("Failed to backup failed binary")
	}

	// Restore previous binary
	if err := copyFile(state.PreviousBinaryPath, currentBinary); err != nil {
		return fmt.Errorf("failed to restore previous binary: %w", err)
	}

	// Make executable (Unix-like systems)
	if err := os.Chmod(currentBinary, 0755); err != nil {
		log.Warn().Err(err).Msg("Failed to set executable permissions on restored binary")
	}

	// Restore config files if backup exists
	if state.ConfigBackupPath != "" {
		if err := RestoreConfigFiles(state.ConfigBackupPath); err != nil {
			log.Warn().Err(err).Msg("Failed to restore config files")
		}
	}

	log.Info().
		Str("version", state.PreviousVersion).
		Msg("Rollback completed successfully")

	return nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, sourceFile); err != nil {
		return err
	}

	return destFile.Sync()
}

// CleanupCorruptedBinary removes corrupted binary files
func CleanupCorruptedBinary(binaryPath string) error {
	// Rename to .corrupted instead of deleting (for debugging)
	corruptedPath := binaryPath + ".corrupted"

	if err := os.Rename(binaryPath, corruptedPath); err != nil {
		if os.IsNotExist(err) {
			return nil // Already cleaned up
		}
		return fmt.Errorf("failed to move corrupted binary: %w", err)
	}

	log.Info().
		Str("from", binaryPath).
		Str("to", corruptedPath).
		Msg("Moved corrupted binary for debugging")

	return nil
}

// KeepRecentVersions maintains a specified number of previous binary versions
func KeepRecentVersions(binaryDir string, keepCount int) error {
	// List all backup binaries
	pattern := filepath.Join(binaryDir, "*.bak*")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return fmt.Errorf("failed to list backup binaries: %w", err)
	}

	// If we don't have more than keepCount, nothing to clean
	if len(matches) <= keepCount {
		return nil
	}

	// Sort by modification time (oldest first)
	type fileWithTime struct {
		path    string
		modTime int64
	}

	var files []fileWithTime
	for _, path := range matches {
		info, err := os.Stat(path)
		if err != nil {
			continue
		}
		files = append(files, fileWithTime{
			path:    path,
			modTime: info.ModTime().Unix(),
		})
	}

	// Sort by modification time
	for i := 0; i < len(files)-1; i++ {
		for j := i + 1; j < len(files); j++ {
			if files[i].modTime > files[j].modTime {
				files[i], files[j] = files[j], files[i]
			}
		}
	}

	// Remove oldest files beyond keepCount
	toRemove := len(files) - keepCount
	for i := 0; i < toRemove; i++ {
		if err := os.Remove(files[i].path); err != nil {
			log.Warn().Err(err).Str("file", files[i].path).Msg("Failed to remove old backup")
		} else {
			log.Debug().Str("file", files[i].path).Msg("Removed old backup binary")
		}
	}

	log.Info().
		Int("kept", keepCount).
		Int("removed", toRemove).
		Msg("Cleaned up old binary versions")

	return nil
}
