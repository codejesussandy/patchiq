//go:build linux

package executors

// NewExecutorManager creates Linux-specific executors
func NewExecutorManager() *ExecutorManager {
	return &ExecutorManager{
		patch:        NewLinuxPatchExecutor(),
		software:     NewLinuxSoftwareExecutor(),
		remoteAccess: NewLinuxRemoteAccessExecutor(),
	}
}
