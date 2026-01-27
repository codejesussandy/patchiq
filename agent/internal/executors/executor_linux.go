//go:build linux

package executors

// NewExecutorManager creates Linux-specific executors
func NewExecutorManager() *ExecutorManager {
	software := NewLinuxSoftwareExecutor()
	return &ExecutorManager{
		patch:        NewLinuxPatchExecutor(),
		software:     software,
		remoteAccess: NewLinuxRemoteAccessExecutor(),
		rollback:     NewBaseRollbackExecutor("", software),
		script:       NewBaseScriptExecutor(""),
	}
}
