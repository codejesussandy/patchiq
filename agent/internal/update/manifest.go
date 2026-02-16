package update

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

// Manifest represents the update manifest with signed metadata
type Manifest struct {
	Version          string                `json:"version"`          // Version number (e.g., "1.2.3")
	ReleaseDate      time.Time             `json:"releaseDate"`      // Release timestamp
	Builds           map[string]BuildInfo  `json:"builds"`           // Platform-specific builds
	Signature        string                `json:"signature"`        // Base64-encoded Ed25519 signature
	SignatureAlg     string                `json:"signatureAlg"`     // Signature algorithm (always "Ed25519")
	MinAgentVersion  string                `json:"minAgentVersion"`  // Minimum agent version that can apply this update
	ReleaseNotes     string                `json:"releaseNotes,omitempty"` // Optional release notes
}

// BuildInfo contains information about a specific platform build
type BuildInfo struct {
	URL      string `json:"url"`      // Download URL (presigned or direct)
	SHA256   string `json:"sha256"`   // SHA256 checksum (hex-encoded)
	Size     int64  `json:"size"`     // File size in bytes
	Platform string `json:"platform"` // Platform identifier (e.g., "windows-amd64")
}

// ManifestVerifier handles manifest signature verification
type ManifestVerifier struct {
	publicKey ed25519.PublicKey
}

// NewManifestVerifier creates a new manifest verifier with the embedded public key
func NewManifestVerifier(publicKeyBase64 string) (*ManifestVerifier, error) {
	publicKeyBytes, err := base64.StdEncoding.DecodeString(publicKeyBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode public key: %w", err)
	}

	if len(publicKeyBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("invalid public key size: got %d, want %d", len(publicKeyBytes), ed25519.PublicKeySize)
	}

	publicKey := ed25519.PublicKey(publicKeyBytes)

	return &ManifestVerifier{
		publicKey: publicKey,
	}, nil
}

// FetchManifest downloads and verifies the update manifest from the specified URL
func (mv *ManifestVerifier) FetchManifest(url string) (*Manifest, error) {
	log.Info().Str("url", url).Msg("Fetching update manifest")

	// Download manifest
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to download manifest: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("manifest download failed: HTTP %d", resp.StatusCode)
	}

	// Read manifest
	manifestBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read manifest: %w", err)
	}

	// Parse manifest
	var manifest Manifest
	if err := json.Unmarshal(manifestBytes, &manifest); err != nil {
		return nil, fmt.Errorf("failed to parse manifest: %w", err)
	}

	// Verify manifest signature
	if err := mv.VerifyManifest(&manifest, manifestBytes); err != nil {
		return nil, fmt.Errorf("manifest signature verification failed: %w", err)
	}

	log.Info().
		Str("version", manifest.Version).
		Time("releaseDate", manifest.ReleaseDate).
		Int("builds", len(manifest.Builds)).
		Msg("Update manifest verified successfully")

	return &manifest, nil
}

// VerifyManifest verifies the manifest signature
func (mv *ManifestVerifier) VerifyManifest(manifest *Manifest, manifestBytes []byte) error {
	// Check signature algorithm
	if manifest.SignatureAlg != "Ed25519" {
		return fmt.Errorf("unsupported signature algorithm: %s", manifest.SignatureAlg)
	}

	// Decode signature from base64
	signatureBytes, err := base64.StdEncoding.DecodeString(manifest.Signature)
	if err != nil {
		return fmt.Errorf("failed to decode signature: %w", err)
	}

	if len(signatureBytes) != ed25519.SignatureSize {
		return fmt.Errorf("invalid signature size: got %d, want %d", len(signatureBytes), ed25519.SignatureSize)
	}

	// Create canonical JSON for verification (without signature field)
	// We need to re-marshal the manifest without the signature to get the original signed data
	manifestCopy := *manifest
	manifestCopy.Signature = "" // Remove signature for verification

	canonicalJSON, err := json.Marshal(manifestCopy)
	if err != nil {
		return fmt.Errorf("failed to create canonical JSON: %w", err)
	}

	// Verify signature
	if !ed25519.Verify(mv.publicKey, canonicalJSON, signatureBytes) {
		return fmt.Errorf("signature verification failed: invalid signature")
	}

	return nil
}

// GetBuildForPlatform returns the build info for the specified platform
func (m *Manifest) GetBuildForPlatform(platform string) (*BuildInfo, error) {
	build, ok := m.Builds[platform]
	if !ok {
		return nil, fmt.Errorf("no build found for platform: %s", platform)
	}

	return &build, nil
}

// ValidateManifest performs basic validation on the manifest structure
func (m *Manifest) ValidateManifest() error {
	if m.Version == "" {
		return fmt.Errorf("manifest version is empty")
	}

	if m.ReleaseDate.IsZero() {
		return fmt.Errorf("manifest releaseDate is zero")
	}

	if len(m.Builds) == 0 {
		return fmt.Errorf("manifest has no builds")
	}

	if m.Signature == "" {
		return fmt.Errorf("manifest signature is empty")
	}

	if m.SignatureAlg != "Ed25519" {
		return fmt.Errorf("invalid signature algorithm: %s", m.SignatureAlg)
	}

	// Validate each build
	for platform, build := range m.Builds {
		if build.URL == "" {
			return fmt.Errorf("build %s has empty URL", platform)
		}
		if build.SHA256 == "" {
			return fmt.Errorf("build %s has empty SHA256 checksum", platform)
		}
		if build.Size <= 0 {
			return fmt.Errorf("build %s has invalid size: %d", platform, build.Size)
		}
	}

	return nil
}

// SignManifest signs the manifest with the provided private key (for manifest generation)
func SignManifest(manifest *Manifest, privateKey ed25519.PrivateKey) error {
	// Set signature algorithm
	manifest.SignatureAlg = "Ed25519"

	// Create canonical JSON (without signature)
	manifest.Signature = "" // Clear signature field before signing

	canonicalJSON, err := json.Marshal(manifest)
	if err != nil {
		return fmt.Errorf("failed to marshal manifest: %w", err)
	}

	// Sign the canonical JSON
	signature := ed25519.Sign(privateKey, canonicalJSON)

	// Encode signature as base64
	manifest.Signature = base64.StdEncoding.EncodeToString(signature)

	return nil
}

// GenerateKeyPair generates a new Ed25519 key pair for manifest signing
// This is a utility function for key generation scripts
func GenerateKeyPair() (publicKey ed25519.PublicKey, privateKey ed25519.PrivateKey, err error) {
	publicKey, privateKey, err = ed25519.GenerateKey(nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate key pair: %w", err)
	}

	return publicKey, privateKey, nil
}
