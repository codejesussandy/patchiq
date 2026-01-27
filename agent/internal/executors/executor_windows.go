//go:build windows

package executors

// NewExecutorManager creates Windows-specific executors
func NewExecutorManager() *ExecutorManager {
	software := NewWindowsSoftwareExecutor()
	return &ExecutorManager{
		patch:        NewWindowsPatchExecutor(),
		software:     software,
		remoteAccess: NewWindowsRemoteAccessExecutor(),
		rollback:     NewBaseRollbackExecutor("", software),
		script:       NewBaseScriptExecutor(""),
	}
}
