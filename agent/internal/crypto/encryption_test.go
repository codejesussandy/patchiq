//go:build linux

package crypto

import (
	"bytes"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEncryptDecrypt_Roundtrip(t *testing.T) {
	t.Parallel()
	plaintext := []byte("hello, world! this is a secret message")

	ciphertext, err := Encrypt(plaintext)
	require.NoError(t, err)
	require.NotNil(t, ciphertext)

	decrypted, err := Decrypt(ciphertext)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted)
}

func TestEncrypt_EmptyData(t *testing.T) {
	t.Parallel()
	result, err := Encrypt([]byte{})
	assert.NoError(t, err)
	assert.Nil(t, result)
}

func TestDecrypt_EmptyData(t *testing.T) {
	t.Parallel()
	result, err := Decrypt([]byte{})
	assert.NoError(t, err)
	assert.Nil(t, result)
}

func TestEncrypt_LargePayload(t *testing.T) {
	t.Parallel()
	plaintext := bytes.Repeat([]byte("A"), 1024*1024) // 1MB

	ciphertext, err := Encrypt(plaintext)
	require.NoError(t, err)
	require.NotNil(t, ciphertext)

	decrypted, err := Decrypt(ciphertext)
	require.NoError(t, err)
	assert.Equal(t, plaintext, decrypted)
}

func TestDecrypt_GarbageData(t *testing.T) {
	t.Parallel()
	garbage := []byte("this is not encrypted data at all garbage bytes 12345")

	// Should return data as-is (migration fallback), not error
	result, err := Decrypt(garbage)
	assert.NoError(t, err)
	assert.Equal(t, garbage, result)
}

func TestEncrypt_NonDeterministic(t *testing.T) {
	t.Parallel()
	plaintext := []byte("test nonce randomness")

	c1, err := Encrypt(plaintext)
	require.NoError(t, err)
	c2, err := Encrypt(plaintext)
	require.NoError(t, err)

	// Two encryptions of the same data should produce different ciphertexts (random nonce)
	assert.NotEqual(t, c1, c2)
}

func TestEncrypt_DiffersFromPlaintext(t *testing.T) {
	t.Parallel()
	plaintext := []byte("plaintext data")

	ciphertext, err := Encrypt(plaintext)
	require.NoError(t, err)
	assert.NotEqual(t, plaintext, ciphertext)
}

func TestDecrypt_ShortData_ReturnedAsIs(t *testing.T) {
	t.Parallel()
	// Data shorter than nonce size (12 bytes for GCM) should be returned as-is
	short := []byte("short")
	result, err := Decrypt(short)
	assert.NoError(t, err)
	assert.Equal(t, short, result)
}
