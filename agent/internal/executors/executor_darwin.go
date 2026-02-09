//go:build darwin

package executors

// NewExecutorManager creates macOS-specific executors
func NewExecutorManager(dlCfg *DownloadConfig) *ExecutorManager {
	software := NewDarwinSoftwareExecutor()
	return &ExecutorManager{
		patch:        NewDarwinPatchExecutor(),
		software:     software,
		remoteAccess: NewDarwinRemoteAccessExecutor(),
		rollback:     NewBaseRollbackExecutor("", software),
		script:       NewBaseScriptExecutor("", dlCfg),
	}
}
