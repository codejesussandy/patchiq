package collectors

import (
	"strconv"
	"strings"
)

// parsePowercfgValue parses powercfg output values
func parsePowercfgValue(output, powerType string) int {
	lines := strings.Split(output, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		prefix := "Current AC Power Setting Index:"
		if powerType == "DC" {
			prefix = "Current DC Power Setting Index:"
		}
		if strings.HasPrefix(line, prefix) {
			parts := strings.Fields(line)
			if len(parts) > 0 {
				hexVal := parts[len(parts)-1]
				if strings.HasPrefix(hexVal, "0x") {
					val, err := strconv.ParseInt(hexVal[2:], 16, 64)
					if err == nil {
						return int(val)
					}
				}
			}
		}
	}
	return 0
}
