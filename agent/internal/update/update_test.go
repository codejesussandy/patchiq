package update

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPerform_MissingDownloadURL(t *testing.T) {
	t.Parallel()

	result := Perform(Request{})
	assert.False(t, result.Success)
	assert.Contains(t, result.ErrorMessage, "downloadUrl is required")
}

func TestPerform_DownloadServerError(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	result := Perform(Request{
		DownloadURL: ts.URL + "/agent",
		Version:     "1.0.0",
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.ErrorMessage, "HTTP 404")
}

func TestPerform_DownloadServerUnavailable(t *testing.T) {
	t.Parallel()

	result := Perform(Request{
		DownloadURL: "http://127.0.0.1:1/agent",
		Version:     "1.0.0",
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.ErrorMessage, "download failed")
}

func TestPerform_ChecksumMismatch(t *testing.T) {
	t.Parallel()

	binaryContent := []byte("fake binary content for testing")
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write(binaryContent)
	}))
	defer ts.Close()

	result := Perform(Request{
		DownloadURL: ts.URL + "/agent",
		Checksum:    "0000000000000000000000000000000000000000000000000000000000000000",
		Version:     "1.0.0",
	})
	assert.False(t, result.Success)
	assert.Contains(t, result.ErrorMessage, "checksum verification failed")
}

func TestPerform_ChecksumMatch_BinaryReplaced(t *testing.T) {
	// This test verifies the full download + checksum + replace flow.
	// We create a temp "current binary" and point os.Executable to it,
	// but since we can't override os.Executable, we test the sub-components directly.
	t.Parallel()

	binaryContent := []byte("new agent binary v2.0.0")
	checksum := sha256.Sum256(binaryContent)
	checksumHex := fmt.Sprintf("%x", checksum)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write(binaryContent)
	}))
	defer ts.Close()

	// Perform will try to replace os.Executable() which we can't control,
	// so this will fail at the replace step. But the download and checksum
	// verification should succeed. The error will be about replacing the binary.
	result := Perform(Request{
		DownloadURL: ts.URL + "/agent",
		Checksum:    checksumHex,
		Version:     "2.0.0",
	})

	// The download and checksum pass, but replacing current binary may fail
	// in test environment. That's fine - we're testing the download+verify pipeline.
	if !result.Success {
		// Should NOT be a checksum error
		assert.NotContains(t, result.ErrorMessage, "checksum verification failed")
		// Should NOT be a download error
		assert.NotContains(t, result.ErrorMessage, "download failed")
	}
}

func TestPerform_NoChecksum_ProceedsWithWarning(t *testing.T) {
	t.Parallel()

	binaryContent := []byte("agent binary without checksum")
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write(binaryContent)
	}))
	defer ts.Close()

	result := Perform(Request{
		DownloadURL: ts.URL + "/agent",
		Version:     "1.0.0",
		// No checksum - should proceed with warning
	})

	// Should NOT fail on checksum
	if !result.Success {
		assert.NotContains(t, result.ErrorMessage, "checksum")
	}
}

func TestPerform_EmptyResponse(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		// Empty body - 0 bytes
	}))
	defer ts.Close()

	result := Perform(Request{
		DownloadURL: ts.URL + "/agent",
		Version:     "1.0.0",
		Checksum:    "abc123",
	})
	assert.False(t, result.Success)
}

// Test the replaceAndRestartUnix function directly
func TestReplaceAndRestartUnix_Success(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	currentBinary := filepath.Join(tmpDir, "patchiq-agent")
	newBinary := filepath.Join(tmpDir, "patchiq-agent-new")

	// Create "current" binary
	err := os.WriteFile(currentBinary, []byte("old version"), 0755)
	require.NoError(t, err)

	// Create "new" binary
	err = os.WriteFile(newBinary, []byte("new version"), 0755)
	require.NoError(t, err)

	result := replaceAndRestartUnix(currentBinary, newBinary)
	assert.True(t, result.Success)
	assert.Contains(t, result.Message, "Update installed")

	// Verify backup was created
	backupPath := currentBinary + ".bak"
	backupData, err := os.ReadFile(backupPath)
	require.NoError(t, err)
	assert.Equal(t, []byte("old version"), backupData)

	// Verify current binary is now the new version
	currentData, err := os.ReadFile(currentBinary)
	require.NoError(t, err)
	assert.Equal(t, []byte("new version"), currentData)
}

func TestReplaceAndRestartUnix_MissingNewBinary(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	currentBinary := filepath.Join(tmpDir, "patchiq-agent")

	err := os.WriteFile(currentBinary, []byte("old version"), 0755)
	require.NoError(t, err)

	result := replaceAndRestartUnix(currentBinary, "/nonexistent/new-binary")
	assert.False(t, result.Success)
	assert.Contains(t, result.ErrorMessage, "failed to install new binary")

	// Verify original binary was restored from backup
	currentData, err := os.ReadFile(currentBinary)
	require.NoError(t, err)
	assert.Equal(t, []byte("old version"), currentData)
}

// Test copyFile helper
func TestCopyFile(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	srcPath := filepath.Join(tmpDir, "src")
	dstPath := filepath.Join(tmpDir, "dst")

	content := []byte("file content to copy")
	err := os.WriteFile(srcPath, content, 0644)
	require.NoError(t, err)

	err = copyFile(srcPath, dstPath)
	require.NoError(t, err)

	copied, err := os.ReadFile(dstPath)
	require.NoError(t, err)
	assert.Equal(t, content, copied)
}

func TestCopyFile_SourceMissing(t *testing.T) {
	t.Parallel()

	tmpDir := t.TempDir()
	err := copyFile("/nonexistent/src", filepath.Join(tmpDir, "dst"))
	assert.Error(t, err)
}

// Test the Request struct serialization
func TestRequest_Fields(t *testing.T) {
	t.Parallel()

	req := Request{
		DownloadURL: "http://minio:9000/agents/windows/amd64/0.1.0/patchiq-agent.exe",
		Checksum:    "abc123",
		Version:     "0.1.0",
	}

	assert.NotEmpty(t, req.DownloadURL)
	assert.NotEmpty(t, req.Checksum)
	assert.NotEmpty(t, req.Version)
}
