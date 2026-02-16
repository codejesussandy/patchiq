package update

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGenerateKeyPair(t *testing.T) {
	publicKey, privateKey, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("GenerateKeyPair() error = %v", err)
	}

	if len(publicKey) != ed25519.PublicKeySize {
		t.Errorf("PublicKey size = %d, want %d", len(publicKey), ed25519.PublicKeySize)
	}

	if len(privateKey) != ed25519.PrivateKeySize {
		t.Errorf("PrivateKey size = %d, want %d", len(privateKey), ed25519.PrivateKeySize)
	}

	// Verify keys are related (public key should be derivable from private key)
	derivedPublicKey := privateKey.Public().(ed25519.PublicKey)
	if string(derivedPublicKey) != string(publicKey) {
		t.Error("Public key mismatch: derived public key doesn't match generated public key")
	}
}

func TestSignManifest(t *testing.T) {
	// Generate test key pair
	publicKey, privateKey, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("GenerateKeyPair() error = %v", err)
	}

	// Create test manifest
	manifest := &Manifest{
		Version:     "1.2.3",
		ReleaseDate: time.Now(),
		Builds: map[string]BuildInfo{
			"linux-amd64": {
				URL:      "https://example.com/agent-linux-amd64",
				SHA256:   "abcd1234",
				Size:     1024,
				Platform: "linux-amd64",
			},
		},
	}

	// Sign manifest
	err = SignManifest(manifest, privateKey)
	if err != nil {
		t.Fatalf("SignManifest() error = %v", err)
	}

	// Verify signature was added
	if manifest.Signature == "" {
		t.Error("Signature is empty after signing")
	}

	if manifest.SignatureAlg != "Ed25519" {
		t.Errorf("SignatureAlg = %s, want Ed25519", manifest.SignatureAlg)
	}

	// Verify signature is valid base64
	_, err = base64.StdEncoding.DecodeString(manifest.Signature)
	if err != nil {
		t.Errorf("Signature is not valid base64: %v", err)
	}

	// Verify signature manually
	manifestCopy := *manifest
	manifestCopy.Signature = ""
	canonicalJSON, err := json.Marshal(manifestCopy)
	if err != nil {
		t.Fatalf("Failed to marshal manifest: %v", err)
	}

	signatureBytes, _ := base64.StdEncoding.DecodeString(manifest.Signature)
	if !ed25519.Verify(publicKey, canonicalJSON, signatureBytes) {
		t.Error("Signature verification failed")
	}
}

func TestManifestVerifier_VerifyManifest(t *testing.T) {
	// Generate test key pair
	publicKey, privateKey, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("GenerateKeyPair() error = %v", err)
	}

	// Create and sign test manifest
	manifest := &Manifest{
		Version:     "1.2.3",
		ReleaseDate: time.Now(),
		Builds: map[string]BuildInfo{
			"linux-amd64": {
				URL:      "https://example.com/agent-linux-amd64",
				SHA256:   "abcd1234",
				Size:     1024,
				Platform: "linux-amd64",
			},
		},
	}

	if err := SignManifest(manifest, privateKey); err != nil {
		t.Fatalf("SignManifest() error = %v", err)
	}

	// Create verifier
	publicKeyBase64 := base64.StdEncoding.EncodeToString(publicKey)
	verifier, err := NewManifestVerifier(publicKeyBase64)
	if err != nil {
		t.Fatalf("NewManifestVerifier() error = %v", err)
	}

	// Marshal manifest for verification
	manifestBytes, err := json.Marshal(manifest)
	if err != nil {
		t.Fatalf("Marshal error = %v", err)
	}

	t.Run("Valid signature", func(t *testing.T) {
		err := verifier.VerifyManifest(manifest, manifestBytes)
		if err != nil {
			t.Errorf("VerifyManifest() error = %v, want nil", err)
		}
	})

	t.Run("Invalid signature", func(t *testing.T) {
		// Tamper with signature
		tamperedManifest := *manifest
		tamperedManifest.Signature = base64.StdEncoding.EncodeToString(make([]byte, ed25519.SignatureSize))

		tamperedBytes, _ := json.Marshal(tamperedManifest)
		err := verifier.VerifyManifest(&tamperedManifest, tamperedBytes)
		if err == nil {
			t.Error("VerifyManifest() error = nil, want error for invalid signature")
		}
	})

	t.Run("Tampered content", func(t *testing.T) {
		// Tamper with version (but keep original signature)
		tamperedManifest := *manifest
		tamperedManifest.Version = "9.9.9"

		tamperedBytes, _ := json.Marshal(tamperedManifest)
		err := verifier.VerifyManifest(&tamperedManifest, tamperedBytes)
		if err == nil {
			t.Error("VerifyManifest() error = nil, want error for tampered content")
		}
	})

	t.Run("Wrong signature algorithm", func(t *testing.T) {
		wrongAlgManifest := *manifest
		wrongAlgManifest.SignatureAlg = "RSA"

		wrongAlgBytes, _ := json.Marshal(wrongAlgManifest)
		err := verifier.VerifyManifest(&wrongAlgManifest, wrongAlgBytes)
		if err == nil {
			t.Error("VerifyManifest() error = nil, want error for unsupported algorithm")
		}
	})
}

func TestNewManifestVerifier(t *testing.T) {
	t.Run("Valid public key", func(t *testing.T) {
		publicKey, _, err := GenerateKeyPair()
		if err != nil {
			t.Fatalf("GenerateKeyPair() error = %v", err)
		}

		publicKeyBase64 := base64.StdEncoding.EncodeToString(publicKey)
		verifier, err := NewManifestVerifier(publicKeyBase64)

		if err != nil {
			t.Errorf("NewManifestVerifier() error = %v, want nil", err)
		}
		if verifier == nil {
			t.Error("NewManifestVerifier() returned nil verifier")
		}
	})

	t.Run("Invalid base64", func(t *testing.T) {
		_, err := NewManifestVerifier("not-valid-base64!!!")
		if err == nil {
			t.Error("NewManifestVerifier() error = nil, want error for invalid base64")
		}
	})

	t.Run("Invalid key size", func(t *testing.T) {
		invalidKey := base64.StdEncoding.EncodeToString([]byte("too-short"))
		_, err := NewManifestVerifier(invalidKey)
		if err == nil {
			t.Error("NewManifestVerifier() error = nil, want error for invalid key size")
		}
	})
}

func TestManifest_ValidateManifest(t *testing.T) {
	validManifest := &Manifest{
		Version:      "1.2.3",
		ReleaseDate:  time.Now(),
		Signature:    "valid-signature",
		SignatureAlg: "Ed25519",
		Builds: map[string]BuildInfo{
			"linux-amd64": {
				URL:      "https://example.com/agent",
				SHA256:   "abcd1234",
				Size:     1024,
				Platform: "linux-amd64",
			},
		},
	}

	tests := []struct {
		name      string
		manifest  *Manifest
		wantError bool
	}{
		{
			name:      "Valid manifest",
			manifest:  validManifest,
			wantError: false,
		},
		{
			name: "Empty version",
			manifest: &Manifest{
				Version:      "",
				ReleaseDate:  time.Now(),
				Signature:    "sig",
				SignatureAlg: "Ed25519",
				Builds:       validManifest.Builds,
			},
			wantError: true,
		},
		{
			name: "Zero release date",
			manifest: &Manifest{
				Version:      "1.0.0",
				ReleaseDate:  time.Time{},
				Signature:    "sig",
				SignatureAlg: "Ed25519",
				Builds:       validManifest.Builds,
			},
			wantError: true,
		},
		{
			name: "No builds",
			manifest: &Manifest{
				Version:      "1.0.0",
				ReleaseDate:  time.Now(),
				Signature:    "sig",
				SignatureAlg: "Ed25519",
				Builds:       map[string]BuildInfo{},
			},
			wantError: true,
		},
		{
			name: "Empty signature",
			manifest: &Manifest{
				Version:      "1.0.0",
				ReleaseDate:  time.Now(),
				Signature:    "",
				SignatureAlg: "Ed25519",
				Builds:       validManifest.Builds,
			},
			wantError: true,
		},
		{
			name: "Invalid signature algorithm",
			manifest: &Manifest{
				Version:      "1.0.0",
				ReleaseDate:  time.Now(),
				Signature:    "sig",
				SignatureAlg: "RSA",
				Builds:       validManifest.Builds,
			},
			wantError: true,
		},
		{
			name: "Build with empty URL",
			manifest: &Manifest{
				Version:      "1.0.0",
				ReleaseDate:  time.Now(),
				Signature:    "sig",
				SignatureAlg: "Ed25519",
				Builds: map[string]BuildInfo{
					"linux-amd64": {
						URL:      "",
						SHA256:   "abcd",
						Size:     1024,
						Platform: "linux-amd64",
					},
				},
			},
			wantError: true,
		},
		{
			name: "Build with empty checksum",
			manifest: &Manifest{
				Version:      "1.0.0",
				ReleaseDate:  time.Now(),
				Signature:    "sig",
				SignatureAlg: "Ed25519",
				Builds: map[string]BuildInfo{
					"linux-amd64": {
						URL:      "https://example.com/agent",
						SHA256:   "",
						Size:     1024,
						Platform: "linux-amd64",
					},
				},
			},
			wantError: true,
		},
		{
			name: "Build with invalid size",
			manifest: &Manifest{
				Version:      "1.0.0",
				ReleaseDate:  time.Now(),
				Signature:    "sig",
				SignatureAlg: "Ed25519",
				Builds: map[string]BuildInfo{
					"linux-amd64": {
						URL:      "https://example.com/agent",
						SHA256:   "abcd",
						Size:     0,
						Platform: "linux-amd64",
					},
				},
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.manifest.ValidateManifest()
			if (err != nil) != tt.wantError {
				t.Errorf("ValidateManifest() error = %v, wantError %v", err, tt.wantError)
			}
		})
	}
}

func TestManifest_GetBuildForPlatform(t *testing.T) {
	manifest := &Manifest{
		Builds: map[string]BuildInfo{
			"linux-amd64": {
				URL:      "https://example.com/linux-amd64",
				SHA256:   "abcd1234",
				Size:     1024,
				Platform: "linux-amd64",
			},
			"windows-amd64": {
				URL:      "https://example.com/windows-amd64",
				SHA256:   "efgh5678",
				Size:     2048,
				Platform: "windows-amd64",
			},
		},
	}

	t.Run("Existing platform", func(t *testing.T) {
		build, err := manifest.GetBuildForPlatform("linux-amd64")
		if err != nil {
			t.Errorf("GetBuildForPlatform() error = %v, want nil", err)
		}
		if build == nil {
			t.Fatal("GetBuildForPlatform() returned nil build")
		}
		if build.Platform != "linux-amd64" {
			t.Errorf("Platform = %s, want linux-amd64", build.Platform)
		}
	})

	t.Run("Nonexistent platform", func(t *testing.T) {
		_, err := manifest.GetBuildForPlatform("darwin-arm64")
		if err == nil {
			t.Error("GetBuildForPlatform() error = nil, want error for nonexistent platform")
		}
	})
}

func TestManifestVerifier_FetchManifest(t *testing.T) {
	// Generate test key pair
	publicKey, privateKey, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("GenerateKeyPair() error = %v", err)
	}

	// Create and sign test manifest
	manifest := &Manifest{
		Version:     "1.2.3",
		ReleaseDate: time.Now(),
		Builds: map[string]BuildInfo{
			"linux-amd64": {
				URL:      "https://example.com/agent-linux-amd64",
				SHA256:   "abcd1234",
				Size:     1024,
				Platform: "linux-amd64",
			},
		},
	}

	if err := SignManifest(manifest, privateKey); err != nil {
		t.Fatalf("SignManifest() error = %v", err)
	}

	manifestJSON, err := json.Marshal(manifest)
	if err != nil {
		t.Fatalf("Marshal error = %v", err)
	}

	// Create test HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(manifestJSON)
	}))
	defer server.Close()

	// Create verifier
	publicKeyBase64 := base64.StdEncoding.EncodeToString(publicKey)
	verifier, err := NewManifestVerifier(publicKeyBase64)
	if err != nil {
		t.Fatalf("NewManifestVerifier() error = %v", err)
	}

	t.Run("Successful fetch and verify", func(t *testing.T) {
		fetchedManifest, err := verifier.FetchManifest(server.URL)
		if err != nil {
			t.Errorf("FetchManifest() error = %v, want nil", err)
		}
		if fetchedManifest == nil {
			t.Fatal("FetchManifest() returned nil manifest")
		}
		if fetchedManifest.Version != manifest.Version {
			t.Errorf("Version = %s, want %s", fetchedManifest.Version, manifest.Version)
		}
	})

	t.Run("Invalid URL", func(t *testing.T) {
		_, err := verifier.FetchManifest("http://nonexistent.example.com/manifest.json")
		if err == nil {
			t.Error("FetchManifest() error = nil, want error for invalid URL")
		}
	})
}

func TestManifest_EndToEnd(t *testing.T) {
	// Simulate complete workflow: generate keys, sign manifest, verify manifest

	// Step 1: Generate key pair
	publicKey, privateKey, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("GenerateKeyPair() error = %v", err)
	}

	// Step 2: Create manifest
	manifest := &Manifest{
		Version:     "2.0.0",
		ReleaseDate: time.Now(),
		Builds: map[string]BuildInfo{
			"linux-amd64": {
				URL:      "https://downloads.example.com/agent-linux-amd64-2.0.0",
				SHA256:   "abc123def456",
				Size:     15728640, // 15 MB
				Platform: "linux-amd64",
			},
			"windows-amd64": {
				URL:      "https://downloads.example.com/agent-windows-amd64-2.0.0.exe",
				SHA256:   "fed654cba321",
				Size:     18874368, // 18 MB
				Platform: "windows-amd64",
			},
		},
		MinAgentVersion: "1.0.0",
		ReleaseNotes:    "Bug fixes and performance improvements",
	}

	// Step 3: Sign manifest
	if err := SignManifest(manifest, privateKey); err != nil {
		t.Fatalf("SignManifest() error = %v", err)
	}

	// Step 4: Validate manifest structure
	if err := manifest.ValidateManifest(); err != nil {
		t.Errorf("ValidateManifest() error = %v", err)
	}

	// Step 5: Create verifier with public key
	publicKeyBase64 := base64.StdEncoding.EncodeToString(publicKey)
	verifier, err := NewManifestVerifier(publicKeyBase64)
	if err != nil {
		t.Fatalf("NewManifestVerifier() error = %v", err)
	}

	// Step 6: Verify signature
	manifestBytes, _ := json.Marshal(manifest)
	if err := verifier.VerifyManifest(manifest, manifestBytes); err != nil {
		t.Errorf("VerifyManifest() error = %v", err)
	}

	// Step 7: Get build for specific platform
	linuxBuild, err := manifest.GetBuildForPlatform("linux-amd64")
	if err != nil {
		t.Errorf("GetBuildForPlatform() error = %v", err)
	}
	if linuxBuild.Size != 15728640 {
		t.Errorf("Build size = %d, want 15728640", linuxBuild.Size)
	}

	t.Log("End-to-end test passed: manifest signed and verified successfully")
}
