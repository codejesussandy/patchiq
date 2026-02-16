package client

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestNew_EnforcesHTTPS(t *testing.T) {
	tests := []struct {
		name      string
		baseURL   string
		wantError bool
	}{
		{
			name:      "HTTP URL rejected",
			baseURL:   "http://example.com",
			wantError: true,
		},
		{
			name:      "HTTPS URL accepted",
			baseURL:   "https://example.com",
			wantError: false,
		},
		{
			name:      "HTTPS with port accepted",
			baseURL:   "https://example.com:8443",
			wantError: false,
		},
		{
			name:      "HTTP with localhost rejected",
			baseURL:   "http://localhost:3000",
			wantError: true,
		},
		{
			name:      "HTTPS with localhost accepted",
			baseURL:   "https://localhost:3000",
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, err := New(tt.baseURL, "1.0.0", nil)

			if tt.wantError {
				if err == nil {
					t.Errorf("New() error = nil, want error for URL: %s", tt.baseURL)
				}
				if client != nil {
					t.Errorf("New() client = %v, want nil on error", client)
				}
			} else {
				if err != nil {
					t.Errorf("New() error = %v, want nil for URL: %s", err, tt.baseURL)
				}
				if client == nil {
					t.Errorf("New() client = nil, want non-nil")
				}
			}
		})
	}
}

func TestBuildTransport_TLSConfig(t *testing.T) {
	t.Run("Default TLS configuration", func(t *testing.T) {
		transport, err := buildTransport(nil)
		if err != nil {
			t.Fatalf("buildTransport() error = %v", err)
		}

		if transport.TLSClientConfig == nil {
			t.Fatal("TLS config is nil")
		}

		if transport.TLSClientConfig.MinVersion != tls.VersionTLS12 {
			t.Errorf("MinVersion = %d, want %d (TLS 1.2)", transport.TLSClientConfig.MinVersion, tls.VersionTLS12)
		}

		if transport.TLSClientConfig.InsecureSkipVerify {
			t.Error("InsecureSkipVerify = true, want false (TLS validation must be enforced)")
		}
	})

	t.Run("Proxy configuration", func(t *testing.T) {
		proxyConfig := &ProxyConfig{
			ProxyURL: "http://proxy.example.com:8080",
			Username: "user",
			Password: "pass",
		}

		transport, err := buildTransport(proxyConfig)
		if err != nil {
			t.Fatalf("buildTransport() error = %v", err)
		}

		if transport.Proxy == nil {
			t.Fatal("Proxy is nil")
		}

		// TLS should still be configured even with proxy
		if transport.TLSClientConfig == nil {
			t.Fatal("TLS config is nil with proxy")
		}
	})

	t.Run("Invalid proxy URL", func(t *testing.T) {
		proxyConfig := &ProxyConfig{
			ProxyURL: "://invalid-url",
		}

		_, err := buildTransport(proxyConfig)
		if err == nil {
			t.Error("buildTransport() error = nil, want error for invalid proxy URL")
		}
	})
}

func TestBuildTransport_CustomCAcert(t *testing.T) {
	// Create a temporary CA certificate
	tempDir := t.TempDir()
	caCertPath := filepath.Join(tempDir, "ca-cert.pem")

	// Generate self-signed CA certificate
	caCert, caCertPEM := generateTestCACert(t)

	// Write CA cert to file
	if err := os.WriteFile(caCertPath, caCertPEM, 0644); err != nil {
		t.Fatalf("Failed to write CA cert: %v", err)
	}

	t.Run("Load custom CA certificate", func(t *testing.T) {
		proxyConfig := &ProxyConfig{
			CACertFile: caCertPath,
		}

		transport, err := buildTransport(proxyConfig)
		if err != nil {
			t.Fatalf("buildTransport() error = %v", err)
		}

		if transport.TLSClientConfig == nil {
			t.Fatal("TLS config is nil")
		}

		if transport.TLSClientConfig.RootCAs == nil {
			t.Fatal("RootCAs is nil")
		}

		// Verify our CA cert is in the pool
		opts := x509.VerifyOptions{
			Roots: transport.TLSClientConfig.RootCAs,
		}
		if _, err := caCert.Verify(opts); err != nil {
			t.Errorf("CA cert not in root pool: %v", err)
		}
	})

	t.Run("Nonexistent CA cert file", func(t *testing.T) {
		proxyConfig := &ProxyConfig{
			CACertFile: "/nonexistent/ca-cert.pem",
		}

		_, err := buildTransport(proxyConfig)
		if err == nil {
			t.Error("buildTransport() error = nil, want error for nonexistent CA cert")
		}
	})

	t.Run("Invalid CA cert format", func(t *testing.T) {
		invalidCertPath := filepath.Join(tempDir, "invalid-cert.pem")
		if err := os.WriteFile(invalidCertPath, []byte("not a certificate"), 0644); err != nil {
			t.Fatalf("Failed to write invalid cert: %v", err)
		}

		proxyConfig := &ProxyConfig{
			CACertFile: invalidCertPath,
		}

		_, err := buildTransport(proxyConfig)
		if err == nil {
			t.Error("buildTransport() error = nil, want error for invalid CA cert")
		}
	})
}

func TestClient_TLSConnection(t *testing.T) {
	// Create test HTTPS server
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success": true}`))
	}))
	defer server.Close()

	t.Run("TLS connection works", func(t *testing.T) {
		// Save server's CA cert for client to trust
		tempDir := t.TempDir()
		caCertPath := filepath.Join(tempDir, "server-ca.pem")

		caCertPEM := pem.EncodeToMemory(&pem.Block{
			Type:  "CERTIFICATE",
			Bytes: server.Certificate().Raw,
		})
		if err := os.WriteFile(caCertPath, caCertPEM, 0644); err != nil {
			t.Fatalf("Failed to write server CA cert: %v", err)
		}

		proxyConfig := &ProxyConfig{
			CACertFile: caCertPath,
		}

		client, err := New(server.URL, "1.0.0", proxyConfig)
		if err != nil {
			t.Fatalf("New() error = %v", err)
		}

		// Make a request to verify TLS works
		resp, err := client.httpClient.Get(server.URL)
		if err != nil {
			t.Fatalf("HTTPS request failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Status = %d, want %d", resp.StatusCode, http.StatusOK)
		}
	})
}

// generateTestCACert creates a self-signed CA certificate for testing
func generateTestCACert(t *testing.T) (*x509.Certificate, []byte) {
	t.Helper()

	// Generate RSA key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("Failed to generate private key: %v", err)
	}

	// Create certificate template
	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			Organization: []string{"Test CA"},
			CommonName:   "Test CA",
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(24 * time.Hour),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IsCA:                  true,
	}

	// Create self-signed certificate
	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &privateKey.PublicKey, privateKey)
	if err != nil {
		t.Fatalf("Failed to create certificate: %v", err)
	}

	// Parse certificate
	cert, err := x509.ParseCertificate(certDER)
	if err != nil {
		t.Fatalf("Failed to parse certificate: %v", err)
	}

	// Encode to PEM
	certPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certDER,
	})

	return cert, certPEM
}

func TestProxyConfig_Integration(t *testing.T) {
	t.Run("Proxy with TLS enforcement", func(t *testing.T) {
		proxyConfig := &ProxyConfig{
			ProxyURL:             "http://proxy.example.com:8080",
			Username:             "user",
			Password:             "pass",
			MaxDownloadSpeedMBps: 10,
			EnableDownloadResume: true,
		}

		transport, err := buildTransport(proxyConfig)
		if err != nil {
			t.Fatalf("buildTransport() error = %v", err)
		}

		// Verify TLS is configured even with proxy
		if transport.TLSClientConfig == nil {
			t.Error("TLS config is nil (must be configured even with proxy)")
		}

		if transport.TLSClientConfig.InsecureSkipVerify {
			t.Error("InsecureSkipVerify = true (must be false)")
		}

		// Verify proxy is configured
		if transport.Proxy == nil {
			t.Error("Proxy is nil")
		}
	})
}
