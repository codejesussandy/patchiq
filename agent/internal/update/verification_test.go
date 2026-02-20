package update

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func writeTempFile(t *testing.T, content []byte) string {
	t.Helper()
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "testfile")
	err := os.WriteFile(path, content, 0644)
	require.NoError(t, err)
	return path
}

func computeSHA256(data []byte) string {
	h := sha256.Sum256(data)
	return fmt.Sprintf("%x", h)
}

func TestVerifyChecksum_Correct(t *testing.T) {
	t.Parallel()

	content := []byte("file content for checksum test")
	path := writeTempFile(t, content)
	checksum := computeSHA256(content)

	result := VerifyChecksum(path, checksum)
	assert.True(t, result.Passed)
}

func TestVerifyChecksum_Wrong(t *testing.T) {
	t.Parallel()

	content := []byte("file content")
	path := writeTempFile(t, content)

	result := VerifyChecksum(path, "wrongchecksum00000000000000000000000000000000000000000000000000000")
	assert.False(t, result.Passed)
	assert.NotEmpty(t, result.ErrorMessage)
}

func TestVerifyChecksum_Empty_Skips(t *testing.T) {
	t.Parallel()

	content := []byte("anything")
	path := writeTempFile(t, content)

	result := VerifyChecksum(path, "")
	assert.True(t, result.Passed)
}

func TestVerifyChecksum_MissingFile(t *testing.T) {
	t.Parallel()

	result := VerifyChecksum("/nonexistent/path/file", "abc123")
	assert.False(t, result.Passed)
}

func TestPostUpdateValidation_Success(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"healthy": true, "status": "healthy"})
	}))
	defer ts.Close()

	// PostUpdateValidation has a 3s sleep + 5 retries - use short timeout
	result := PostUpdateValidation(ts.URL, 2*time.Second)
	assert.True(t, result.Passed)
}

func TestPostUpdateValidation_Failure(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer ts.Close()

	result := PostUpdateValidation(ts.URL, 1*time.Second)
	assert.False(t, result.Passed)
	assert.NotEmpty(t, result.ErrorMessage)
}

func TestVerifyBackendConnectivity_Success(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	result := VerifyBackendConnectivity(ts.URL, 5*time.Second)
	assert.True(t, result.Passed)
}

func TestVerifyBackendConnectivity_EmptyURL(t *testing.T) {
	t.Parallel()

	result := VerifyBackendConnectivity("", 5*time.Second)
	assert.True(t, result.Passed)
}

func TestVerifyBackendConnectivity_Unreachable(t *testing.T) {
	t.Parallel()

	result := VerifyBackendConnectivity("http://127.0.0.1:1", 500*time.Millisecond)
	assert.False(t, result.Passed)
}
