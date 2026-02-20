package update

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateKeyPair(t *testing.T) {
	t.Parallel()

	pub, priv, err := GenerateKeyPair()
	require.NoError(t, err)
	assert.Len(t, pub, ed25519.PublicKeySize)
	assert.Len(t, priv, ed25519.PrivateKeySize)
}

func TestSignAndVerifyManifest(t *testing.T) {
	t.Parallel()

	pub, priv, err := GenerateKeyPair()
	require.NoError(t, err)

	m := &Manifest{
		Version:     "1.0.0",
		ReleaseDate: time.Now(),
		Builds: map[string]BuildInfo{
			"linux-amd64": {
				URL:      "https://example.com/agent",
				SHA256:   "abc123",
				Size:     1024,
				Platform: "linux-amd64",
			},
		},
	}

	err = SignManifest(m, priv)
	require.NoError(t, err)

	assert.Equal(t, "Ed25519", m.SignatureAlg)
	assert.NotEmpty(t, m.Signature)

	pubBase64 := base64.StdEncoding.EncodeToString(pub)
	verifier, err := NewManifestVerifier(pubBase64)
	require.NoError(t, err)

	// Marshal canonical JSON to pass to VerifyManifest
	manifestBytes, err := json.Marshal(m)
	require.NoError(t, err)

	err = verifier.VerifyManifest(m, manifestBytes)
	assert.NoError(t, err)
}

func TestVerifyManifest_TamperedFails(t *testing.T) {
	t.Parallel()

	pub, priv, err := GenerateKeyPair()
	require.NoError(t, err)

	m := &Manifest{
		Version:     "1.0.0",
		ReleaseDate: time.Now(),
		Builds: map[string]BuildInfo{
			"linux-amd64": {
				URL:    "https://example.com/agent",
				SHA256: "abc123",
				Size:   1024,
			},
		},
	}

	err = SignManifest(m, priv)
	require.NoError(t, err)

	// Tamper with the manifest
	m.Version = "9.9.9"

	pubBase64 := base64.StdEncoding.EncodeToString(pub)
	verifier, err := NewManifestVerifier(pubBase64)
	require.NoError(t, err)

	manifestBytes, err := json.Marshal(m)
	require.NoError(t, err)

	err = verifier.VerifyManifest(m, manifestBytes)
	assert.Error(t, err)
}

func TestNewManifestVerifier_InvalidKey(t *testing.T) {
	t.Parallel()

	_, err := NewManifestVerifier("not-valid-base64!!!")
	assert.Error(t, err)

	// Wrong size key
	shortKey := base64.StdEncoding.EncodeToString([]byte("short"))
	_, err = NewManifestVerifier(shortKey)
	assert.Error(t, err)
}

func TestVerifyManifest_WrongAlgorithm(t *testing.T) {
	t.Parallel()

	pub, priv, err := GenerateKeyPair()
	require.NoError(t, err)

	m := &Manifest{
		Version:     "1.0.0",
		ReleaseDate: time.Now(),
		Builds: map[string]BuildInfo{
			"linux-amd64": {URL: "https://x.com", SHA256: "abc", Size: 1},
		},
	}
	err = SignManifest(m, priv)
	require.NoError(t, err)

	m.SignatureAlg = "RSA"

	pubBase64 := base64.StdEncoding.EncodeToString(pub)
	verifier, err := NewManifestVerifier(pubBase64)
	require.NoError(t, err)

	manifestBytes, _ := json.Marshal(m)
	err = verifier.VerifyManifest(m, manifestBytes)
	assert.Error(t, err)
}

func TestValidateManifest_Valid(t *testing.T) {
	t.Parallel()

	m := &Manifest{
		Version:     "1.0.0",
		ReleaseDate: time.Now(),
		Signature:   "somesig",
		SignatureAlg: "Ed25519",
		Builds: map[string]BuildInfo{
			"linux-amd64": {URL: "https://x.com", SHA256: "abc", Size: 1024},
		},
	}

	err := m.ValidateManifest()
	assert.NoError(t, err)
}

func TestValidateManifest_MissingVersion(t *testing.T) {
	t.Parallel()

	m := &Manifest{
		ReleaseDate: time.Now(),
		Signature:   "somesig",
		SignatureAlg: "Ed25519",
		Builds: map[string]BuildInfo{
			"linux-amd64": {URL: "https://x.com", SHA256: "abc", Size: 1},
		},
	}

	err := m.ValidateManifest()
	assert.Error(t, err)
}

func TestValidateManifest_EmptyBuilds(t *testing.T) {
	t.Parallel()

	m := &Manifest{
		Version:     "1.0.0",
		ReleaseDate: time.Now(),
		Signature:   "somesig",
		SignatureAlg: "Ed25519",
		Builds:      map[string]BuildInfo{},
	}

	err := m.ValidateManifest()
	assert.Error(t, err)
}

func TestValidateManifest_MissingSignature(t *testing.T) {
	t.Parallel()

	m := &Manifest{
		Version:     "1.0.0",
		ReleaseDate: time.Now(),
		SignatureAlg: "Ed25519",
		Builds: map[string]BuildInfo{
			"linux-amd64": {URL: "https://x.com", SHA256: "abc", Size: 1},
		},
	}

	err := m.ValidateManifest()
	assert.Error(t, err)
}

func TestValidateManifest_ZeroReleaseDate(t *testing.T) {
	t.Parallel()

	m := &Manifest{
		Version:     "1.0.0",
		Signature:   "somesig",
		SignatureAlg: "Ed25519",
		Builds: map[string]BuildInfo{
			"linux-amd64": {URL: "https://x.com", SHA256: "abc", Size: 1},
		},
	}

	err := m.ValidateManifest()
	assert.Error(t, err)
}

func TestGetBuildForPlatform(t *testing.T) {
	t.Parallel()

	m := &Manifest{
		Builds: map[string]BuildInfo{
			"linux-amd64": {URL: "https://x.com/linux", SHA256: "abc", Size: 1024, Platform: "linux-amd64"},
		},
	}

	build, err := m.GetBuildForPlatform("linux-amd64")
	require.NoError(t, err)
	assert.Equal(t, "https://x.com/linux", build.URL)

	_, err = m.GetBuildForPlatform("nonexistent-platform")
	assert.Error(t, err)
}

func TestFetchManifest(t *testing.T) {
	t.Parallel()

	pub, priv, err := GenerateKeyPair()
	require.NoError(t, err)

	m := &Manifest{
		Version:     "2.0.0",
		ReleaseDate: time.Now(),
		Builds: map[string]BuildInfo{
			"linux-amd64": {URL: "https://x.com", SHA256: "abc", Size: 1024},
		},
	}
	err = SignManifest(m, priv)
	require.NoError(t, err)

	manifestBytes, err := json.Marshal(m)
	require.NoError(t, err)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(manifestBytes)
	}))
	defer ts.Close()

	pubBase64 := base64.StdEncoding.EncodeToString(pub)
	verifier, err := NewManifestVerifier(pubBase64)
	require.NoError(t, err)

	result, err := verifier.FetchManifest(ts.URL)
	require.NoError(t, err)
	assert.Equal(t, "2.0.0", result.Version)
}

func TestFetchManifest_HTTPError(t *testing.T) {
	t.Parallel()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer ts.Close()

	pub, _, err := GenerateKeyPair()
	require.NoError(t, err)

	pubBase64 := base64.StdEncoding.EncodeToString(pub)
	verifier, err := NewManifestVerifier(pubBase64)
	require.NoError(t, err)

	_, err = verifier.FetchManifest(ts.URL)
	assert.Error(t, err)
}
