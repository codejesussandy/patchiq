//go:build !windows && !linux

package service

// IsWindowsService always returns false on non-Windows platforms.
func IsWindowsService() (bool, error) {
	return false, nil
}

// RunAsService is a no-op on non-Windows platforms.
func RunAsService(startFunc func() error, stopFunc func()) error {
	return nil
}

// InstallService is not supported on non-Windows platforms.
func InstallService() error {
	return nil
}

// UninstallService is not supported on non-Windows platforms.
func UninstallService() error {
	return nil
}

// StartService is not supported on non-Windows platforms.
func StartService() error {
	return nil
}

// StopService is not supported on non-Windows platforms.
func StopService() error {
	return nil
}
