package client

import (
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetMachineID_Returns32CharHex(t *testing.T) {
	t.Parallel()
	id, err := GetMachineID()
	require.NoError(t, err)
	assert.Len(t, id, 32, "machine ID should be 32 hex chars (16 bytes SHA256 prefix)")
	// Verify it's valid hex
	_, err = hex.DecodeString(id)
	assert.NoError(t, err, "machine ID should be valid hex")
}

func TestGetMachineID_Deterministic(t *testing.T) {
	t.Parallel()
	id1, err := GetMachineID()
	require.NoError(t, err)

	id2, err := GetMachineID()
	require.NoError(t, err)

	assert.Equal(t, id1, id2, "GetMachineID should return the same value on repeated calls")
}

func TestGetMachineID_NotEmpty(t *testing.T) {
	t.Parallel()
	id, err := GetMachineID()
	require.NoError(t, err)
	assert.NotEmpty(t, id)
}
