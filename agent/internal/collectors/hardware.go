package collectors

import (
	"bytes"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

// Helper functions shared across platform-specific hardware collectors

func readFileContent(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

// parseWmicValue extracts the value from wmic /value output format (Key=Value)
func parseWmicValue(output, key string) string {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, key+"=") {
			return strings.TrimSpace(strings.TrimPrefix(line, key+"="))
		}
	}
	return ""
}

func parseSize(sizeStr string) float64 {
	sizeStr = strings.TrimSpace(sizeStr)
	sizeStr = strings.ToUpper(sizeStr)

	var multiplier float64 = 1
	if strings.HasSuffix(sizeStr, "T") || strings.HasSuffix(sizeStr, "TI") || strings.HasSuffix(sizeStr, "TB") || strings.HasSuffix(sizeStr, "TIB") {
		multiplier = 1024
		// Trim secondary suffixes first (I, B), then primary (T)
		sizeStr = strings.TrimSuffix(sizeStr, "B")
		sizeStr = strings.TrimSuffix(sizeStr, "I")
		sizeStr = strings.TrimSuffix(sizeStr, "T")
	} else if strings.HasSuffix(sizeStr, "G") || strings.HasSuffix(sizeStr, "GI") || strings.HasSuffix(sizeStr, "GB") || strings.HasSuffix(sizeStr, "GIB") {
		multiplier = 1
		// Trim secondary suffixes first (I, B), then primary (G)
		sizeStr = strings.TrimSuffix(sizeStr, "B")
		sizeStr = strings.TrimSuffix(sizeStr, "I")
		sizeStr = strings.TrimSuffix(sizeStr, "G")
	} else if strings.HasSuffix(sizeStr, "M") || strings.HasSuffix(sizeStr, "MI") || strings.HasSuffix(sizeStr, "MB") || strings.HasSuffix(sizeStr, "MIB") {
		multiplier = 1.0 / 1024
		// Trim secondary suffixes first (I, B), then primary (M)
		sizeStr = strings.TrimSuffix(sizeStr, "B")
		sizeStr = strings.TrimSuffix(sizeStr, "I")
		sizeStr = strings.TrimSuffix(sizeStr, "M")
	} else if strings.HasSuffix(sizeStr, "K") || strings.HasSuffix(sizeStr, "KI") || strings.HasSuffix(sizeStr, "KB") || strings.HasSuffix(sizeStr, "KIB") {
		multiplier = 1.0 / (1024 * 1024)
		// Trim secondary suffixes first (I, B), then primary (K)
		sizeStr = strings.TrimSuffix(sizeStr, "B")
		sizeStr = strings.TrimSuffix(sizeStr, "I")
		sizeStr = strings.TrimSuffix(sizeStr, "K")
	}

	size, _ := strconv.ParseFloat(strings.TrimSpace(sizeStr), 64)
	return size * multiplier
}

func runCommand(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	return out.String(), err
}
