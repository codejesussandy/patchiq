//go:build darwin

package executors

// NewExecutorManager creates macOS-specific executors
func NewExecutorManager() *ExecutorManager {
	software := NewDarwinSoftwareExecutor()
	return &ExecutorManager{
		patch:        NewDarwinPatchExecutor(),
		software:     software,
		remoteAccess: NewDarwinRemoteAccessExecutor(),
		rollback:     NewBaseRollbackExecutor("", software),
		script:       NewBaseScriptExecutor(""),
	}
}
