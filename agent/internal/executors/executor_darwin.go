//go:build darwin

package executors

// NewExecutorManager creates macOS-specific executors
func NewExecutorManager() *ExecutorManager {
	return &ExecutorManager{
		patch:        NewDarwinPatchExecutor(),
		software:     NewDarwinSoftwareExecutor(),
		remoteAccess: NewDarwinRemoteAccessExecutor(),
	}
}
