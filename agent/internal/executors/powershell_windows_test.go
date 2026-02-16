//go:build windows

package executors

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestPowerShellExecutor_ExecuteCommand(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	tests := []struct {
		name        string
		command     string
		expectError bool
		contains    string
	}{
		{
			name:        "simple command",
			command:     "Write-Output 'Hello World'",
			expectError: false,
			contains:    "Hello World",
		},
		{
			name:        "arithmetic",
			command:     "2 + 2",
			expectError: false,
			contains:    "4",
		},
		{
			name:        "invalid command",
			command:     "ThisCommandDoesNotExist",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output, err := ps.ExecuteCommand(ctx, tt.command)
			if tt.expectError && err == nil {
				t.Errorf("expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
			if tt.contains != "" && !contains(output, tt.contains) {
				t.Errorf("expected output to contain '%s', got: %s", tt.contains, output)
			}
		})
	}
}

func TestPowerShellExecutor_ExecuteScript(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	script := `
		$ErrorActionPreference = 'Stop'
		$result = 10 * 5
		Write-Output $result
	`

	stdout, stderr, exitCode, err := ps.ExecuteScript(ctx, script, 5*time.Second)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if exitCode != 0 {
		t.Errorf("expected exit code 0, got %d", exitCode)
	}

	if !contains(stdout, "50") {
		t.Errorf("expected stdout to contain '50', got: %s", stdout)
	}

	if stderr != "" {
		t.Logf("stderr (expected to be empty): %s", stderr)
	}
}

func TestPowerShellExecutor_ExecuteScriptWithError(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	script := `
		$ErrorActionPreference = 'Stop'
		throw "Test error"
	`

	stdout, stderr, exitCode, err := ps.ExecuteScript(ctx, script, 5*time.Second)
	if err == nil {
		t.Fatal("expected error but got none")
	}

	if exitCode == 0 {
		t.Errorf("expected non-zero exit code, got 0")
	}

	t.Logf("stdout: %s", stdout)
	t.Logf("stderr: %s", stderr)
}

func TestPowerShellExecutor_GetPowerShellVersion(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	version, err := ps.GetPowerShellVersion(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if version == "" {
		t.Error("expected non-empty version string")
	}

	t.Logf("PowerShell version: %s", version)
}

func TestPowerShellExecutor_IsAdministrator(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	// This test just checks that the function doesn't crash
	// Actual result depends on how tests are run
	isAdmin := ps.IsAdministrator(ctx)
	t.Logf("Running as administrator: %v", isAdmin)
}

func TestPowerShellExecutor_CheckModuleAvailable(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	// Microsoft.PowerShell.Management should always be available
	available := ps.CheckModuleAvailable(ctx, "Microsoft.PowerShell.Management")
	if !available {
		t.Error("expected Microsoft.PowerShell.Management to be available")
	}

	// NonExistentModule should not be available
	available = ps.CheckModuleAvailable(ctx, "ThisModuleDefinitelyDoesNotExist12345")
	if available {
		t.Error("expected non-existent module to be unavailable")
	}
}

func TestPowerShellExecutor_Timeout(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	// Script that sleeps for 10 seconds
	script := "Start-Sleep -Seconds 10; Write-Output 'Done'"

	// Execute with 1 second timeout
	_, _, exitCode, err := ps.ExecuteScript(ctx, script, 1*time.Second)
	if err == nil {
		t.Fatal("expected timeout error but got none")
	}

	// Exit code should be -1 for context deadline exceeded
	if exitCode == 0 {
		t.Errorf("expected non-zero exit code for timeout, got %d", exitCode)
	}

	t.Logf("timeout error (expected): %v", err)
}

func TestPowerShellExecutor_GetRegistryValue(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	// Try to read a well-known registry value
	// HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\CurrentVersion should exist on all Windows
	value, err := ps.GetRegistryValue(ctx, `HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "CurrentVersion")
	if err != nil {
		t.Fatalf("unexpected error reading registry: %v", err)
	}

	if value == "" {
		t.Error("expected non-empty registry value")
	}

	t.Logf("Windows CurrentVersion: %s", value)
}

func TestPowerShellExecutor_SetRegistryValue(t *testing.T) {
	ps := NewPowerShellExecutor(false)
	ctx := context.Background()

	// Test with HKCU (doesn't require admin)
	testKey := `HKCU:\Software\PatchIQTest`
	testValue := "TestValue"
	testData := "TestData123"

	// Set value
	err := ps.SetRegistryValue(ctx, testKey, testValue, testData, "String")
	if err != nil {
		t.Fatalf("failed to set registry value: %v", err)
	}

	// Read back
	value, err := ps.GetRegistryValue(ctx, testKey, testValue)
	if err != nil {
		t.Fatalf("failed to read back registry value: %v", err)
	}

	if value != testData {
		t.Errorf("expected registry value '%s', got '%s'", testData, value)
	}

	// Cleanup
	cleanupScript := fmt.Sprintf(`Remove-Item -Path "%s" -Force -ErrorAction SilentlyContinue`, testKey)
	ps.ExecuteCommand(ctx, cleanupScript)
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) &&
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
		len(s) > len(substr)*2 && findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
