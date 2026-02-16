//go:build windows
// +build windows

package crypto

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

// Encrypt encrypts data using Windows DPAPI
func Encrypt(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, nil
	}

	blob := &windows.DataBlob{
		Size: uint32(len(data)),
		Data: &data[0],
	}

	var encBlob windows.DataBlob
	err := windows.CryptProtectData(blob, nil, nil, 0, nil, 0, &encBlob)
	if err != nil {
		return nil, err
	}

	encData := make([]byte, encBlob.Size)
	copy(encData, (*[1 << 30]byte)(unsafe.Pointer(encBlob.Data))[:encBlob.Size])
	windows.LocalFree(windows.Handle(unsafe.Pointer(encBlob.Data)))

	return encData, nil
}

// Decrypt decrypts data using Windows DPAPI
func Decrypt(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, nil
	}

	blob := &windows.DataBlob{
		Size: uint32(len(data)),
		Data: &data[0],
	}

	var decBlob windows.DataBlob
	err := windows.CryptUnprotectData(blob, nil, nil, 0, nil, 0, &decBlob)
	if err != nil {
		return nil, err
	}

	decData := make([]byte, decBlob.Size)
	copy(decData, (*[1 << 30]byte)(unsafe.Pointer(decBlob.Data))[:decBlob.Size])
	windows.LocalFree(windows.Handle(unsafe.Pointer(decBlob.Data)))

	return decData, nil
}
