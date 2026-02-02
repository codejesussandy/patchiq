package collectors

import (
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// agentStartTime tracks when the agent started (set on first collection)
var agentStartTime time.Time

// CPU sampling state for calculating instantaneous CPU usage
var (
	prevCPUUser    int64
	prevCPUNice    int64
	prevCPUSystem  int64
	prevCPUIdle    int64
	prevCPUIowait  int64
	prevCPUIrq     int64
	prevCPUSoftirq int64
	prevCPUSteal   int64
	prevCPUTotal   int64
	prevCPUTime    time.Time
)

// getThermalStatus returns a status string based on temperature thresholds
func getThermalStatus(temp, warning, critical float64) string {
	if critical > 0 && temp >= critical {
		return "Critical"
	}
	if warning > 0 && temp >= warning {
		return "Warning"
	}
	return "Normal"
}

// Helper functions

func extractPercent(s string) float64 {
	s = strings.TrimSpace(s)
	parts := strings.Fields(s)
	for _, part := range parts {
		if strings.HasSuffix(part, "%") {
			numStr := strings.TrimSuffix(part, "%")
			if pct, err := strconv.ParseFloat(numStr, 64); err == nil {
				return pct
			}
		}
	}
	return -1
}

func parseMemorySize(s string) int64 {
	s = strings.TrimSpace(s)
	s = strings.ToUpper(s)

	var multiplier int64 = 1
	if strings.HasSuffix(s, "G") {
		multiplier = 1024 * 1024 * 1024
		s = strings.TrimSuffix(s, "G")
	} else if strings.HasSuffix(s, "M") {
		multiplier = 1024 * 1024
		s = strings.TrimSuffix(s, "M")
	} else if strings.HasSuffix(s, "K") {
		multiplier = 1024
		s = strings.TrimSuffix(s, "K")
	}

	if size, err := strconv.ParseFloat(s, 64); err == nil {
		return int64(size * float64(multiplier))
	}
	return 0
}

func sortByCPU(procs []models.ProcessInfo) {
	// Simple bubble sort for small lists
	for i := 0; i < len(procs)-1; i++ {
		for j := 0; j < len(procs)-i-1; j++ {
			if procs[j].CPUPercent < procs[j+1].CPUPercent {
				procs[j], procs[j+1] = procs[j+1], procs[j]
			}
		}
	}
}

func sortByMemory(procs []models.ProcessInfo) {
	for i := 0; i < len(procs)-1; i++ {
		for j := 0; j < len(procs)-i-1; j++ {
			if procs[j].MemoryPercent < procs[j+1].MemoryPercent {
				procs[j], procs[j+1] = procs[j+1], procs[j]
			}
		}
	}
}
