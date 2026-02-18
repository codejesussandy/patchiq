//go:build !windows

package update

import (
	"os"
	"syscall"

	"github.com/rs/zerolog/log"
)

func checkDiskSpace() (bool, float64) {
	executable, err := os.Executable()
	if err != nil {
		log.Warn().Err(err).Msg("Failed to get executable path for disk space check")
		return true, 0
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs(executable, &stat); err != nil {
		log.Warn().Err(err).Msg("Failed to get disk stats")
		return true, 0
	}

	availableGB := float64(stat.Bavail*uint64(stat.Bsize)) / (1024 * 1024 * 1024)
	minRequiredGB := 0.5
	return availableGB >= minRequiredGB, availableGB
}
