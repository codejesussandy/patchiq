package update

import (
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func sha256hex(data []byte) string {
	h := sha256.Sum256(data)
	return fmt.Sprintf("%x", h)
}

func TestDetectCorruption_Clean(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	content := []byte("binary content here")
	binaryPath := filepath.Join(tmpDir, "agent")
	err := os.WriteFile(binaryPath, content, 0755)
	require.NoError(t, err)

	checksum := sha256hex(content)
	report := DetectCorruption(binaryPath, int64(len(content)), checksum)

	assert.False(t, report.Detected)
	assert.False(t, report.ShouldRollback)
}

func TestDetectCorruption_Nonexistent(t *testing.T) {
	t.Parallel()

	report := DetectCorruption("/nonexistent/path/agent", 1024, "abc123")

	assert.True(t, report.Detected)
	assert.True(t, report.ShouldRollback)
	assert.Equal(t, CorruptionUnknown, report.Type)
}

func TestDetectCorruption_WrongSize(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	content := []byte("short")
	binaryPath := filepath.Join(tmpDir, "agent")
	err := os.WriteFile(binaryPath, content, 0755)
	require.NoError(t, err)

	// Report expects larger size
	report := DetectCorruption(binaryPath, 1024, "")

	assert.True(t, report.Detected)
	assert.Equal(t, CorruptionTruncated, report.Type)
	assert.True(t, report.ShouldRollback)
}

func TestDetectCorruption_WrongChecksum(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	content := []byte("binary content")
	binaryPath := filepath.Join(tmpDir, "agent")
	err := os.WriteFile(binaryPath, content, 0755)
	require.NoError(t, err)

	report := DetectCorruption(binaryPath, int64(len(content)), "wrongchecksum000000000000000000000000000000000000000000000000000000")

	assert.True(t, report.Detected)
	assert.Equal(t, CorruptionChecksum, report.Type)
	assert.True(t, report.ShouldRollback)
}

func TestDetectCorruption_NoChecksumSkips(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	content := []byte("binary content")
	binaryPath := filepath.Join(tmpDir, "agent")
	err := os.WriteFile(binaryPath, content, 0755)
	require.NoError(t, err)

	// Empty checksum - should not check checksum
	report := DetectCorruption(binaryPath, int64(len(content)), "")

	assert.False(t, report.Detected)
}

func TestCleanupCorruptedBinary(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	binaryPath := filepath.Join(tmpDir, "agent")
	err := os.WriteFile(binaryPath, []byte("content"), 0755)
	require.NoError(t, err)

	err = CleanupCorruptedBinary(binaryPath)
	require.NoError(t, err)

	// Original should be gone
	_, err = os.Stat(binaryPath)
	assert.True(t, os.IsNotExist(err))

	// .corrupted should exist
	_, err = os.Stat(binaryPath + ".corrupted")
	assert.NoError(t, err)
}

func TestCleanupCorruptedBinary_Nonexistent(t *testing.T) {
	t.Parallel()

	// Should not error when file doesn't exist
	err := CleanupCorruptedBinary("/nonexistent/path/agent")
	assert.NoError(t, err)
}
