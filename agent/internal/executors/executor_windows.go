//go:build windows

package executors

// NewExecutorManager creates Windows-specific executors
func NewExecutorManager() *ExecutorManager {
	return &ExecutorManager{
		patch:        NewWindowsPatchExecutor(),
		software:     NewWindowsSoftwareExecutor(),
		remoteAccess: NewWindowsRemoteAccessExecutor(),
	}
}
