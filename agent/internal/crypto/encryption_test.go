package crypto

import (
	"bytes"
	"testing"
)

func TestEncryptDecrypt(t *testing.T) {
	testCases := []struct {
		name string
		data []byte
	}{
		{
			name: "empty data",
			data: []byte{},
		},
		{
			name: "simple string",
			data: []byte("hello world"),
		},
		{
			name: "json data",
			data: []byte(`{"accessToken":"test123","refreshToken":"refresh456"}`),
		},
		{
			name: "binary data",
			data: []byte{0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Encrypt
			encrypted, err := Encrypt(tc.data)
			if err != nil {
				t.Fatalf("Encrypt failed: %v", err)
			}

			// For macOS, encrypted data will be "KEYCHAIN" marker
			// For other platforms, it should be different from plaintext (unless empty)
			if len(tc.data) > 0 {
				// On macOS, check for keychain marker
				// On other platforms, encrypted should differ from plaintext
				if string(encrypted) != "KEYCHAIN" && bytes.Equal(encrypted, tc.data) {
					t.Error("Encrypted data should differ from plaintext")
				}
			}

			// Decrypt
			decrypted, err := Decrypt(encrypted)
			if err != nil {
				t.Fatalf("Decrypt failed: %v", err)
			}

			// Verify decrypted matches original
			if !bytes.Equal(decrypted, tc.data) {
				t.Errorf("Decrypted data doesn't match original.\nExpected: %v\nGot: %v", tc.data, decrypted)
			}
		})
	}
}

func TestDecryptPlaintext(t *testing.T) {
	// Test that plaintext JSON passes through (for migration)
	plaintext := []byte(`{"accessToken":"test"}`)

	decrypted, err := Decrypt(plaintext)
	if err != nil {
		t.Fatalf("Decrypt plaintext failed: %v", err)
	}

	if !bytes.Equal(decrypted, plaintext) {
		t.Error("Plaintext should pass through unchanged")
	}
}
