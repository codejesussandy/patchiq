package executors

import (
	"context"
	"testing"

	"github.com/patchify/agent/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockSoftwareExecutor implements SoftwareExecutor for testing
type mockSoftwareExecutor struct {
	installedVersion string
	installErr       bool
	uninstallErr     bool
}

func (m *mockSoftwareExecutor) InstallSoftware(ctx context.Context, pkg models.SoftwarePackage) models.ExecutionResult {
	if m.installErr {
		return models.ExecutionResult{Success: false, ErrorMessage: "install failed"}
	}
	return models.ExecutionResult{Success: true, Message: "installed"}
}

func (m *mockSoftwareExecutor) UpgradeSoftware(ctx context.Context, pkg models.SoftwarePackage) models.ExecutionResult {
	return m.InstallSoftware(ctx, pkg)
}

func (m *mockSoftwareExecutor) UninstallSoftware(ctx context.Context, name string) models.ExecutionResult {
	if m.uninstallErr {
		return models.ExecutionResult{Success: false, ErrorMessage: "uninstall failed"}
	}
	return models.ExecutionResult{Success: true, Message: "uninstalled"}
}

func (m *mockSoftwareExecutor) GetInstalledVersion(ctx context.Context, name string) (string, error) {
	if m.installedVersion == "" {
		return "", nil
	}
	return m.installedVersion, nil
}

func TestNewBaseRollbackExecutor(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{}
	exec := NewBaseRollbackExecutor(dir, sw)
	require.NotNil(t, exec)
}

func TestRollbackSaveAndGet(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{}
	exec := NewBaseRollbackExecutor(dir, sw)

	ctx := context.Background()
	info := models.RollbackInfo{
		ID:               "RB-test-001",
		PackageName:      "mypackage",
		InstalledVersion: "1.0.0",
		InstallSource:    "apt",
		WasInstalled:     false,
		InstalledAt:      "2024-01-01T00:00:00Z",
		SupportsRollback: true,
	}

	err := exec.SaveRollbackInfo(ctx, info)
	require.NoError(t, err)

	got, err := exec.GetRollbackInfo(ctx, "RB-test-001")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, info.PackageName, got.PackageName)
	assert.Equal(t, info.InstalledVersion, got.InstalledVersion)
}

func TestRollbackListInfo(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{}
	exec := NewBaseRollbackExecutor(dir, sw)

	ctx := context.Background()

	// Empty initially
	list, err := exec.ListRollbackInfo(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 0)

	// Add two entries
	err = exec.SaveRollbackInfo(ctx, models.RollbackInfo{
		ID:          "RB-aaa",
		PackageName: "pkg-a",
	})
	require.NoError(t, err)

	err = exec.SaveRollbackInfo(ctx, models.RollbackInfo{
		ID:          "RB-bbb",
		PackageName: "pkg-b",
	})
	require.NoError(t, err)

	list, err = exec.ListRollbackInfo(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 2)
}

func TestRollbackDeleteInfo(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{}
	exec := NewBaseRollbackExecutor(dir, sw)

	ctx := context.Background()
	info := models.RollbackInfo{
		ID:          "RB-del-001",
		PackageName: "toremove",
	}
	err := exec.SaveRollbackInfo(ctx, info)
	require.NoError(t, err)

	err = exec.DeleteRollbackInfo(ctx, "RB-del-001")
	require.NoError(t, err)

	_, err = exec.GetRollbackInfo(ctx, "RB-del-001")
	assert.Error(t, err)
}

func TestGetRollbackInfoNotFound(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{}
	exec := NewBaseRollbackExecutor(dir, sw)

	ctx := context.Background()
	_, err := exec.GetRollbackInfo(ctx, "nonexistent")
	assert.Error(t, err)
}

func TestCreateRollbackInfoForInstall(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{installedVersion: "0.9.0"}
	exec := NewBaseRollbackExecutor(dir, sw)

	ctx := context.Background()
	info, err := exec.CreateRollbackInfoForInstall(ctx, "myapp", "apt", "cmd-001", sw)
	require.NoError(t, err)
	require.NotNil(t, info)

	assert.Equal(t, "myapp", info.PackageName)
	assert.Equal(t, "apt", info.InstallSource)
	assert.Equal(t, "cmd-001", info.CommandID)
	assert.Equal(t, "0.9.0", info.PreviousVersion)
	assert.True(t, info.WasInstalled)
	assert.NotEmpty(t, info.ID)
}

func TestCreateRollbackInfoForInstallNotPreviouslyInstalled(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{installedVersion: ""}
	exec := NewBaseRollbackExecutor(dir, sw)

	ctx := context.Background()
	info, err := exec.CreateRollbackInfoForInstall(ctx, "newapp", "brew", "cmd-002", sw)
	require.NoError(t, err)
	require.NotNil(t, info)

	assert.Equal(t, "newapp", info.PackageName)
	assert.False(t, info.WasInstalled)
}

func TestExecuteRollbackNotInstalled(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{}
	exec := NewBaseRollbackExecutor(dir, sw)

	ctx := context.Background()

	// Save a rollback info for a package that was not previously installed
	err := exec.SaveRollbackInfo(ctx, models.RollbackInfo{
		ID:               "RB-111",
		PackageName:      "mypkg",
		WasInstalled:     false,
		SupportsRollback: true,
	})
	require.NoError(t, err)

	result := exec.ExecuteRollback(ctx, "RB-111", false)
	assert.True(t, result.Success)
}

func TestSaveRollbackInfoAutoID(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sw := &mockSoftwareExecutor{}
	exec := NewBaseRollbackExecutor(dir, sw)

	ctx := context.Background()
	info := models.RollbackInfo{
		PackageName: "noid",
	}
	err := exec.SaveRollbackInfo(ctx, info)
	require.NoError(t, err)

	list, err := exec.ListRollbackInfo(ctx)
	require.NoError(t, err)
	require.Len(t, list, 1)
	assert.NotEmpty(t, list[0].ID)
}
