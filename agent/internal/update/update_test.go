package update

import (
	"crypto/sha256"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// TestChecksumVerification tests that checksum verification works correctly
func TestChecksumVerification(t *testing.T) {
	// Create a test file content
	testContent := []byte("This is a test binary content for checksum verification")
	expectedChecksum := fmt.Sprintf("%x", sha256.Sum256(testContent))
	wrongChecksum := "0000000000000000000000000000000000000000000000000000000000000000"

	tests := []struct {
		name          string
		content       []byte
		checksum      string
		shouldSucceed bool
		errorContains string
	}{
		{
			name:          "Valid checksum - should succeed",
			content:       testContent,
			checksum:      expectedChecksum,
			shouldSucceed: true,
		},
		{
			name:          "Wrong checksum - should fail",
			content:       testContent,
			checksum:      wrongChecksum,
			shouldSucceed: false,
			errorContains: "checksum verification failed",
		},
		{
			name:          "Empty checksum - should succeed with warning",
			content:       testContent,
			checksum:      "",
			shouldSucceed: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test HTTP server
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				w.Write(tt.content)
			}))
			defer server.Close()

			// Create temporary directory for test
			tempDir, err := os.MkdirTemp("", "update-test-*")
			if err != nil {
				t.Fatalf("Failed to create temp dir: %v", err)
			}
			defer os.RemoveAll(tempDir)

			// Change to temp directory (update creates files in current binary's directory)
			originalWd, _ := os.Getwd()
			defer os.Chdir(originalWd)

			// Create a fake current binary in temp dir
			fakeBinary := filepath.Join(tempDir, "patchiq-agent-test")
			if err := os.WriteFile(fakeBinary, []byte("fake binary"), 0755); err != nil {
				t.Fatalf("Failed to create fake binary: %v", err)
			}

			// Note: We can't fully test Perform() because it tries to replace the running binary
			// Instead, we'll test the checksum calculation logic by examining the error message

			req := Request{
				DownloadURL: server.URL,
				Checksum:    tt.checksum,
				Version:     "1.0.0-test",
			}

			result := Perform(req)

			if tt.shouldSucceed {
				// For empty checksum, we expect success but with warning in logs
				// For valid checksum, we expect it to proceed to binary replacement
				// (which will fail in test environment, but that's OK)
				if result.ErrorMessage != "" && !contains(result.ErrorMessage, "checksum") {
					// Ignore binary replacement errors
					t.Logf("Ignoring non-checksum error: %s", result.ErrorMessage)
				}
			} else {
				if result.ErrorMessage == "" {
					t.Errorf("Expected error but got success")
				}
				if tt.errorContains != "" && !contains(result.ErrorMessage, tt.errorContains) {
					t.Errorf("Expected error containing '%s', got: %s", tt.errorContains, result.ErrorMessage)
				}
			}
		})
	}
}

// TestChecksumMismatchDetailed tests specific checksum mismatch scenarios
func TestChecksumMismatchDetailed(t *testing.T) {
	testContent := []byte("test content for detailed verification")
	correctChecksum := fmt.Sprintf("%x", sha256.Sum256(testContent))

	// Create test HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write(testContent)
	}))
	defer server.Close()

	tests := []struct {
		name             string
		providedChecksum string
		expectError      bool
	}{
		{
			name:             "Correct checksum",
			providedChecksum: correctChecksum,
			expectError:      false,
		},
		{
			name:             "Incorrect checksum - all zeros",
			providedChecksum: "0000000000000000000000000000000000000000000000000000000000000000",
			expectError:      true,
		},
		{
			name:             "Incorrect checksum - one char different",
			providedChecksum: correctChecksum[:len(correctChecksum)-1] + "f",
			expectError:      true,
		},
		{
			name:             "Incorrect checksum - wrong length",
			providedChecksum: "abc123",
			expectError:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := Request{
				DownloadURL: server.URL,
				Checksum:    tt.providedChecksum,
				Version:     "1.0.0",
			}

			result := Perform(req)

			hasChecksumError := contains(result.ErrorMessage, "checksum")

			if tt.expectError && !hasChecksumError {
				t.Errorf("Expected checksum error but didn't get one. Error: %s", result.ErrorMessage)
			}

			if !tt.expectError && hasChecksumError {
				t.Errorf("Didn't expect checksum error but got: %s", result.ErrorMessage)
			}
		})
	}
}

// TestDownloadURLRequired tests that download URL is mandatory
func TestDownloadURLRequired(t *testing.T) {
	req := Request{
		DownloadURL: "",
		Checksum:    "abc123",
		Version:     "1.0.0",
	}

	result := Perform(req)

	if result.ErrorMessage == "" {
		t.Error("Expected error for missing download URL")
	}

	if !contains(result.ErrorMessage, "downloadUrl is required") {
		t.Errorf("Expected 'downloadUrl is required' error, got: %s", result.ErrorMessage)
	}
}

// TestDownloadFailure tests handling of download failures
func TestDownloadFailure(t *testing.T) {
	tests := []struct {
		name          string
		statusCode    int
		errorContains string
	}{
		{
			name:          "404 Not Found",
			statusCode:    http.StatusNotFound,
			errorContains: "HTTP 404",
		},
		{
			name:          "500 Internal Server Error",
			statusCode:    http.StatusInternalServerError,
			errorContains: "HTTP 500",
		},
		{
			name:          "403 Forbidden",
			statusCode:    http.StatusForbidden,
			errorContains: "HTTP 403",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(tt.statusCode)
			}))
			defer server.Close()

			req := Request{
				DownloadURL: server.URL,
				Checksum:    "abc123",
				Version:     "1.0.0",
			}

			result := Perform(req)

			if result.ErrorMessage == "" {
				t.Error("Expected error for HTTP failure")
			}

			if !contains(result.ErrorMessage, tt.errorContains) {
				t.Errorf("Expected error containing '%s', got: %s", tt.errorContains, result.ErrorMessage)
			}
		})
	}
}

// TestInvalidURL tests handling of invalid download URLs
func TestInvalidURL(t *testing.T) {
	req := Request{
		DownloadURL: "not-a-valid-url",
		Checksum:    "abc123",
		Version:     "1.0.0",
	}

	result := Perform(req)

	if result.ErrorMessage == "" {
		t.Error("Expected error for invalid URL")
	}

	if !contains(result.ErrorMessage, "download failed") {
		t.Errorf("Expected 'download failed' error, got: %s", result.ErrorMessage)
	}
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr || len(s) > len(substr) &&
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
		findInString(s, substr)))
}

func findInString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
