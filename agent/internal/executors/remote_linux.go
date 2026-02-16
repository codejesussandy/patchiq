//go:build linux

package executors

import (
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"context"
	"github.com/patchify/agent/internal/models"
)

// LinuxRemoteAccessExecutor handles Linux VNC configuration
type LinuxRemoteAccessExecutor struct{}

// NewLinuxRemoteAccessExecutor creates a new Linux remote access executor
func NewLinuxRemoteAccessExecutor() *LinuxRemoteAccessExecutor {
	return &LinuxRemoteAccessExecutor{}
}

// Enable enables VNC remote access on Linux
func (e *LinuxRemoteAccessExecutor) Enable(ctx context.Context, config models.RemoteAccessConfig) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Try different VNC servers in order of preference
	vncServers := []struct {
		binary string
		start  func(models.RemoteAccessConfig) (string, error)
	}{
		{"x11vnc", e.startX11vnc},
		{"vncserver", e.startTigerVNC},
		{"Xvnc", e.startXvnc},
	}

	for _, server := range vncServers {
		if _, err := exec.LookPath(server.binary); err == nil {
			output, err := server.start(config)
			result.Output = output
			if err == nil {
				result.Success = true
				result.Message = fmt.Sprintf("VNC enabled using %s", server.binary)
				result.Duration = time.Since(startTime).Milliseconds()
				return result
			}
			result.ErrorMessage = err.Error()
		}
	}

	// If no VNC server found, try to install x11vnc
	installResult := e.installVNCServer()
	if installResult.Success {
		output, err := e.startX11vnc(config)
		result.Output = output
		if err == nil {
			result.Success = true
			result.Message = "VNC enabled using x11vnc (freshly installed)"
			result.Duration = time.Since(startTime).Milliseconds()
			return result
		}
		result.ErrorMessage = err.Error()
	}

	result.Message = "Failed to enable VNC - no VNC server available"
	if result.ErrorMessage == "" {
		result.ErrorMessage = "Could not find or install x11vnc, vncserver, or Xvnc"
	}
	result.Duration = time.Since(startTime).Milliseconds()
	return result
}

// startX11vnc starts x11vnc server
func (e *LinuxRemoteAccessExecutor) startX11vnc(config models.RemoteAccessConfig) (string, error) {
	// Kill any existing x11vnc
	exec.Command("pkill", "x11vnc").Run()

	args := []string{
		"-display", ":0",
		"-forever",
		"-shared",
		"-bg",
		"-o", "/var/log/x11vnc.log",
	}

	// Set port
	port := 5900
	if config.Port > 0 {
		port = config.Port
	}
	args = append(args, "-rfbport", strconv.Itoa(port))

	// Set password if provided
	if config.Password != "" {
		// Create password file
		passwdPath := "/tmp/.x11vnc_passwd"
		cmd := exec.Command("x11vnc", "-storepasswd", config.Password, passwdPath)
		if err := cmd.Run(); err == nil {
			args = append(args, "-rfbauth", passwdPath)
		}
	}

	// Localhost only
	if config.LocalOnly {
		args = append(args, "-localhost")
	}

	cmd := exec.Command("x11vnc", args...)
	output, err := cmd.CombinedOutput()
	return string(output), err
}

// startTigerVNC starts TigerVNC server
func (e *LinuxRemoteAccessExecutor) startTigerVNC(config models.RemoteAccessConfig) (string, error) {
	// Set password first
	if config.Password != "" {
		vncDir := os.ExpandEnv("$HOME/.vnc")
		os.MkdirAll(vncDir, 0700)

		// vncpasswd expects input from stdin
		cmd := exec.Command("vncpasswd")
		cmd.Stdin = strings.NewReader(config.Password + "\n" + config.Password + "\n")
		cmd.Run()
	}

	args := []string{}

	// Set port (TigerVNC uses display number, :1 = 5901)
	if config.Port > 0 {
		displayNum := (config.Port - 5900)
		args = append(args, fmt.Sprintf(":%d", displayNum))
	}

	if config.LocalOnly {
		args = append(args, "-localhost", "yes")
	}

	cmd := exec.Command("vncserver", args...)
	output, err := cmd.CombinedOutput()
	return string(output), err
}

// startXvnc starts Xvnc directly
func (e *LinuxRemoteAccessExecutor) startXvnc(config models.RemoteAccessConfig) (string, error) {
	args := []string{
		":1",
		"-geometry", "1280x720",
		"-depth", "24",
	}

	if config.Port > 0 {
		args = append(args, "-rfbport", strconv.Itoa(config.Port))
	}

	if config.LocalOnly {
		args = append(args, "-localhost")
	}

	cmd := exec.Command("Xvnc", args...)
	// Start in background
	err := cmd.Start()
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("Xvnc started with PID %d", cmd.Process.Pid), nil
}

// installVNCServer attempts to install x11vnc
func (e *LinuxRemoteAccessExecutor) installVNCServer() models.ExecutionResult {
	result := models.ExecutionResult{Success: false}

	// Detect package manager and install
	if _, err := exec.LookPath("apt-get"); err == nil {
		exec.Command("apt-get", "update", "-qq").Run()
		cmd := exec.Command("apt-get", "install", "-y", "x11vnc")
		output, err := cmd.CombinedOutput()
		result.Output = string(output)
		if err == nil {
			result.Success = true
			result.Message = "Installed x11vnc via apt"
			return result
		}
	}

	if _, err := exec.LookPath("dnf"); err == nil {
		cmd := exec.Command("dnf", "install", "-y", "x11vnc")
		output, err := cmd.CombinedOutput()
		result.Output = string(output)
		if err == nil {
			result.Success = true
			result.Message = "Installed x11vnc via dnf"
			return result
		}
	}

	if _, err := exec.LookPath("yum"); err == nil {
		cmd := exec.Command("yum", "install", "-y", "x11vnc")
		output, err := cmd.CombinedOutput()
		result.Output = string(output)
		if err == nil {
			result.Success = true
			result.Message = "Installed x11vnc via yum"
			return result
		}
	}

	result.ErrorMessage = "Could not install VNC server"
	result.Message = "No supported package manager found"
	return result
}

// Disable disables VNC on Linux
func (e *LinuxRemoteAccessExecutor) Disable(ctx context.Context) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	var outputs []string
	killed := false

	// Kill x11vnc
	if cmd := exec.Command("pkill", "x11vnc"); cmd.Run() == nil {
		outputs = append(outputs, "Killed x11vnc")
		killed = true
	}

	// Kill vncserver sessions
	if _, err := exec.LookPath("vncserver"); err == nil {
		cmd := exec.Command("vncserver", "-kill", ":1")
		if output, err := cmd.CombinedOutput(); err == nil {
			outputs = append(outputs, "Killed vncserver :1")
			outputs = append(outputs, string(output))
			killed = true
		}
	}

	// Kill Xvnc
	if cmd := exec.Command("pkill", "Xvnc"); cmd.Run() == nil {
		outputs = append(outputs, "Killed Xvnc")
		killed = true
	}

	// Disable systemd service if exists
	if exec.Command("systemctl", "disable", "x11vnc").Run() == nil {
		exec.Command("systemctl", "stop", "x11vnc").Run()
		outputs = append(outputs, "Disabled x11vnc systemd service")
		killed = true
	}

	result.Output = strings.Join(outputs, "\n")
	result.Duration = time.Since(startTime).Milliseconds()

	if killed || len(outputs) > 0 {
		result.Success = true
		result.Message = "VNC disabled successfully"
	} else {
		result.Message = "No VNC services were running"
		result.Success = true // Not an error if nothing was running
	}

	return result
}

// GetStatus returns the current status of VNC
func (e *LinuxRemoteAccessExecutor) GetStatus(ctx context.Context) models.RemoteAccessStatus {
	status := models.RemoteAccessStatus{
		Protocol: "VNC",
		Port:     5900,
	}

	// Check for running VNC processes
	processes := []string{"x11vnc", "Xvnc", "vncserver"}
	for _, proc := range processes {
		cmd := exec.Command("pgrep", "-x", proc)
		if cmd.Run() == nil {
			status.Enabled = true
			status.ServiceName = proc
			break
		}
	}

	// Check if port 5900 is listening
	if !status.Enabled {
		cmd := exec.Command("ss", "-tln")
		output, err := cmd.Output()
		if err == nil && strings.Contains(string(output), ":5900") {
			status.Enabled = true
		}
	}

	// Get actual port
	status.Port = e.getVNCPort()

	return status
}

// SetPassword sets the VNC password
func (e *LinuxRemoteAccessExecutor) SetPassword(ctx context.Context, password string) models.ExecutionResult {
	startTime := time.Now()
	result := models.ExecutionResult{Success: false}

	// Try x11vnc password
	x11vncPasswd := "/tmp/.x11vnc_passwd"
	cmd := exec.Command("x11vnc", "-storepasswd", password, x11vncPasswd)
	if output, err := cmd.CombinedOutput(); err == nil {
		result.Success = true
		result.Message = "VNC password set for x11vnc"
		result.Output = string(output)
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	// Try TigerVNC password
	vncDir := os.ExpandEnv("$HOME/.vnc")
	os.MkdirAll(vncDir, 0700)

	cmd = exec.Command("vncpasswd")
	cmd.Stdin = strings.NewReader(password + "\n" + password + "\n")
	if output, err := cmd.CombinedOutput(); err == nil {
		result.Success = true
		result.Message = "VNC password set for TigerVNC"
		result.Output = string(output)
		result.Duration = time.Since(startTime).Milliseconds()
		return result
	}

	result.ErrorMessage = "Could not set VNC password - no VNC password utility found"
	result.Message = "Failed to set VNC password"
	result.Duration = time.Since(startTime).Milliseconds()
	return result
}

// getVNCPort attempts to determine the actual VNC port
func (e *LinuxRemoteAccessExecutor) getVNCPort() int {
	// Check x11vnc
	cmd := exec.Command("pgrep", "-a", "x11vnc")
	output, err := cmd.Output()
	if err == nil {
		// Parse -rfbport argument
		args := strings.Fields(string(output))
		for i, arg := range args {
			if arg == "-rfbport" && i+1 < len(args) {
				if port, err := strconv.Atoi(args[i+1]); err == nil {
					return port
				}
			}
		}
	}

	// Check listening ports
	cmd = exec.Command("ss", "-tln")
	output, err = cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			if strings.Contains(line, ":59") {
				// Try to extract port
				fields := strings.Fields(line)
				for _, field := range fields {
					if strings.Contains(field, ":59") {
						parts := strings.Split(field, ":")
						if len(parts) > 0 {
							portStr := parts[len(parts)-1]
							if port, err := strconv.Atoi(portStr); err == nil && port >= 5900 && port <= 5999 {
								return port
							}
						}
					}
				}
			}
		}
	}

	return 5900 // Default
}
