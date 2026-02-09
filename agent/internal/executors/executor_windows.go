//go:build windows

package executors

// NewExecutorManager creates Windows-specific executors
func NewExecutorManager(dlCfg *DownloadConfig) *ExecutorManager {
	software := NewWindowsSoftwareExecutor()
	return &ExecutorManager{
		patch:        NewWindowsPatchExecutor(),
		software:     software,
		remoteAccess: NewWindowsRemoteAccessExecutor(),
		rollback:     NewBaseRollbackExecutor("", software),
		script:       NewBaseScriptExecutor("", dlCfg),
	}
}
