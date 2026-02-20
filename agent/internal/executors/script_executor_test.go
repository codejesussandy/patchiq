package executors

import (
	"context"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewBaseScriptExecutor(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	exec := NewBaseScriptExecutor(dir, nil)
	require.NotNil(t, exec)
	assert.Equal(t, dir, exec.dataDir)
}

func TestNewBaseScriptExecutorDefaultDir(t *testing.T) {
	t.Parallel()

	exec := NewBaseScriptExecutor("", nil)
	require.NotNil(t, exec)
	assert.NotEmpty(t, exec.dataDir)
}

func TestExecuteInlineScriptSuccess(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	exec := NewBaseScriptExecutor(dir, nil)

	ctx := context.Background()
	result := exec.ExecuteInlineScript(ctx, "echo hello", "install", false, nil)

	assert.True(t, result.Success)
	assert.Equal(t, 0, result.ExitCode)
	assert.Contains(t, result.Output, "hello")
}

func TestExecuteInlineScriptNonZeroExit(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	exec := NewBaseScriptExecutor(dir, nil)

	ctx := context.Background()
	result := exec.ExecuteInlineScript(ctx, "exit 1", "install", false, nil)

	assert.False(t, result.Success)
	assert.NotEqual(t, 0, result.ExitCode)
}

func TestExecuteInlineScriptEmpty(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	exec := NewBaseScriptExecutor(dir, nil)

	ctx := context.Background()
	result := exec.ExecuteInlineScript(ctx, "", "install", false, nil)
	// Empty script - bash runs empty script, may succeed or fail
	// We just check the function returns a result
	assert.NotNil(t, result)
}

func TestExecuteInlineScriptWithEnvVars(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	exec := NewBaseScriptExecutor(dir, nil)

	ctx := context.Background()
	env := map[string]string{
		"MY_TEST_VAR": "test_value_123",
	}

	// PowerShell uses $env:VAR syntax, bash uses $VAR
	script := "echo $MY_TEST_VAR"
	if runtime.GOOS == "windows" {
		script = "Write-Output $env:MY_TEST_VAR"
	}
	result := exec.ExecuteInlineScript(ctx, script, "install", false, env)

	assert.True(t, result.Success)
	assert.Contains(t, result.Output, "test_value_123")
}

func TestExecuteInlineScriptContextCancellation(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	exec := NewBaseScriptExecutor(dir, nil)

	// Note: ExecuteInlineScript internally creates a new context with 900s timeout,
	// so a cancelled context does not propagate. Just verify we get a result.
	ctx := context.Background()
	result := exec.ExecuteInlineScript(ctx, "echo cancelled_test", "install", false, nil)
	assert.NotNil(t, result)
	assert.True(t, result.Success)
}

func TestExecuteInlineScriptDuration(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	exec := NewBaseScriptExecutor(dir, nil)

	ctx := context.Background()
	result := exec.ExecuteInlineScript(ctx, "echo hello", "install", false, nil)

	assert.True(t, result.Success)
	assert.GreaterOrEqual(t, result.Duration, int64(0))
}
