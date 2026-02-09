//go:build windows

package service

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/eventlog"
	"golang.org/x/sys/windows/svc/mgr"
)

const serviceName = "PatchIQAgent"

type windowsService struct {
	startFunc func() error
	stopFunc  func()
}

func (ws *windowsService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (ssec bool, errno uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown

	changes <- svc.Status{State: svc.StartPending}

	if err := ws.startFunc(); err != nil {
		log.Printf("Failed to start agent: %v", err)
		return true, 1
	}

	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}

loop:
	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				changes <- svc.Status{State: svc.StopPending}
				ws.stopFunc()
				break loop
			}
		}
	}

	changes <- svc.Status{State: svc.Stopped}
	return
}

// IsWindowsService returns true if the process is running as a Windows Service.
func IsWindowsService() (bool, error) {
	return svc.IsWindowsService()
}

// RunAsService runs the agent as a Windows Service.
func RunAsService(startFunc func() error, stopFunc func()) error {
	elog, err := eventlog.Open(serviceName)
	if err != nil {
		return fmt.Errorf("failed to open event log: %w", err)
	}
	defer elog.Close()

	elog.Info(1, fmt.Sprintf("%s service starting", serviceName))
	defer elog.Info(1, fmt.Sprintf("%s service stopped", serviceName))

	ws := &windowsService{
		startFunc: startFunc,
		stopFunc:  stopFunc,
	}

	if err := svc.Run(serviceName, ws); err != nil {
		elog.Error(1, fmt.Sprintf("%s service failed: %v", serviceName, err))
		return err
	}

	return nil
}

// InstallService installs the agent as a Windows Service.
func InstallService() error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}

	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager (run as Administrator): %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err == nil {
		s.Close()
		return fmt.Errorf("service %s already exists", serviceName)
	}

	s, err = m.CreateService(
		serviceName,
		exePath,
		mgr.Config{
			DisplayName: "PatchIQ Agent",
			Description: "PatchIQ endpoint management agent for inventory collection and patch deployment",
			StartType:   mgr.StartAutomatic,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to create service: %w", err)
	}
	defer s.Close()

	// Set recovery actions: restart on failure
	err = s.SetRecoveryActions([]mgr.RecoveryAction{
		{Type: mgr.ServiceRestart, Delay: 10 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 30 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 60 * time.Second},
	}, 86400) // Reset fail count after 24 hours

	if err != nil {
		log.Printf("Warning: could not set recovery actions: %v", err)
	}

	// Set up event logging
	_ = eventlog.InstallAsEventCreate(serviceName, eventlog.Error|eventlog.Warning|eventlog.Info)

	return nil
}

// UninstallService removes the Windows Service.
func UninstallService() error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager (run as Administrator): %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		return fmt.Errorf("service %s not found", serviceName)
	}
	defer s.Close()

	// Stop service if running
	status, err := s.Query()
	if err != nil {
		return err
	}
	if status.State != svc.Stopped {
		_, _ = s.Control(svc.Stop)
		for i := 0; i < 30; i++ {
			status, err = s.Query()
			if err != nil {
				return err
			}
			if status.State == svc.Stopped {
				break
			}
			time.Sleep(time.Second)
		}
	}

	if err := s.Delete(); err != nil {
		return fmt.Errorf("failed to delete service: %w", err)
	}

	_ = eventlog.Remove(serviceName)
	return nil
}

// StartService starts the Windows Service.
func StartService() error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		return fmt.Errorf("service %s not found", serviceName)
	}
	defer s.Close()

	return s.Start()
}

// StopService stops the Windows Service.
func StopService() error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("failed to connect to service manager: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(serviceName)
	if err != nil {
		return fmt.Errorf("service %s not found", serviceName)
	}
	defer s.Close()

	_, err = s.Control(svc.Stop)
	return err
}

// DefaultConfigPaths returns Windows-specific config paths for service mode.
func DefaultConfigPaths() []string {
	homeDir, _ := os.UserHomeDir()
	return []string{
		filepath.Join(os.Getenv("ProgramData"), "PatchIQ", "config.json"),
		filepath.Join(homeDir, ".patchify-agent", "config.json"),
	}
}
