//go:build windows

package update

import (
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/rs/zerolog/log"
)

func checkDiskSpace() (bool, float64) {
	executable, err := os.Executable()
	if err != nil {
		log.Warn().Err(err).Msg("Failed to get executable path for disk space check")
		return true, 0
	}

	drive := filepath.VolumeName(executable)
	if drive == "" {
		drive = "C:"
	}

	// Use wmic to get free space
	cmd := exec.Command("wmic", "logicaldisk", "where", "DeviceID='"+drive+"'", "get", "FreeSpace", "/value")
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Warn().Err(err).Msg("Failed to get disk free space via wmic")
		return true, 0
	}

	for _, line := range strings.Split(string(output), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "FreeSpace=") {
			val := strings.TrimPrefix(line, "FreeSpace=")
			freeBytes, err := strconv.ParseUint(strings.TrimSpace(val), 10, 64)
			if err == nil {
				availableGB := float64(freeBytes) / (1024 * 1024 * 1024)
				return availableGB >= 0.5, availableGB
			}
		}
	}

	return true, 0
}
