package collectors

import (
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// DarwinPowerCollector collects power management info on macOS
type DarwinPowerCollector struct{}

// NewDarwinPowerCollector creates a new power management collector
func NewDarwinPowerCollector() *DarwinPowerCollector {
	return &DarwinPowerCollector{}
}

// Name returns the collector name
func (c *DarwinPowerCollector) Name() string {
	return "power"
}

// Collect gathers power management information
func (c *DarwinPowerCollector) Collect() (interface{}, error) {
	pm := &models.PowerManagement{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	}

	pm.PowerPlan = c.collectPowerPlan()
	pm.SleepSettings = c.collectSleepSettings()
	pm.WakeSettings = c.collectWakeSettings()
	pm.BatteryPolicies = c.collectBatteryPolicies()
	pm.PowerEvents = c.collectPowerEvents()

	return pm, nil
}

func (c *DarwinPowerCollector) collectPowerPlan() models.PowerPlan {
	plan := models.PowerPlan{IsActive: true}

	switch runtime.GOOS {
	case "darwin":
		// macOS doesn't have traditional power plans, but we can detect settings
		if out, err := exec.Command("pmset", "-g", "custom").Output(); err == nil {
			output := string(out)
			if strings.Contains(output, "lowpowermode") {
				if strings.Contains(output, "lowpowermode 1") {
					plan.Name = "Low Power"
					plan.Description = "Low Power Mode enabled"
				} else {
					plan.Name = "Balanced"
					plan.Description = "Default power settings"
				}
			} else {
				plan.Name = "Balanced"
				plan.Description = "Default power settings"
			}
		}
		plan.Source = "System"

	case "windows":
		// Windows: Get active power plan using powercfg
		if out, err := exec.Command("powercfg", "/getactivescheme").Output(); err == nil {
			output := string(out)
			// Format: Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2e  (Balanced)
			re := regexp.MustCompile(`GUID:\s*([a-fA-F0-9-]+)\s*\(([^)]+)\)`)
			if matches := re.FindStringSubmatch(output); len(matches) > 2 {
				plan.GUID = matches[1]
				plan.Name = strings.TrimSpace(matches[2])
			}
		}

		// Get plan description
		switch strings.ToLower(plan.Name) {
		case "balanced":
			plan.Description = "Automatically balances performance with energy consumption"
		case "high performance":
			plan.Description = "Favors performance, may reduce battery life"
		case "power saver":
			plan.Description = "Saves energy by reducing performance"
		}
		plan.Source = "System"

	default:
		// Linux: Check various power management systems
		// Try TLP
		if out, err := exec.Command("tlp-stat", "-s").Output(); err == nil {
			output := string(out)
			if strings.Contains(output, "Mode") {
				if strings.Contains(output, "AC") {
					plan.Name = "AC Power"
				} else {
					plan.Name = "Battery"
				}
				plan.Description = "TLP power management"
				plan.Source = "TLP"
			}
		}

		// Try power-profiles-daemon
		if plan.Name == "" {
			if out, err := exec.Command("powerprofilesctl", "get").Output(); err == nil {
				profile := strings.TrimSpace(string(out))
				switch profile {
				case "power-saver":
					plan.Name = "Power Saver"
					plan.Description = "Reduced performance to save power"
				case "balanced":
					plan.Name = "Balanced"
					plan.Description = "Balance between power and performance"
				case "performance":
					plan.Name = "Performance"
					plan.Description = "Maximum performance"
				default:
					plan.Name = profile
				}
				plan.Source = "power-profiles-daemon"
			}
		}

		// Fallback: Check CPU governor
		if plan.Name == "" {
			if data, err := os.ReadFile("/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"); err == nil {
				governor := strings.TrimSpace(string(data))
				switch governor {
				case "powersave":
					plan.Name = "Power Saver"
				case "performance":
					plan.Name = "Performance"
				case "schedutil", "ondemand", "conservative":
					plan.Name = "Balanced"
				default:
					plan.Name = governor
				}
				plan.Description = "CPU governor: " + governor
				plan.Source = "cpufreq"
			}
		}
	}

	return plan
}

func (c *DarwinPowerCollector) collectSleepSettings() models.SleepSettings {
	settings := models.SleepSettings{
		SleepEnabled:     true,
		HibernateEnabled: false,
	}

	switch runtime.GOOS {
	case "darwin":
		// macOS: Use pmset to get sleep settings
		if out, err := exec.Command("pmset", "-g", "custom").Output(); err == nil {
			output := string(out)
			lines := strings.Split(output, "\n")

			inBattery := false
			inAC := false

			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "Battery Power:") {
					inBattery = true
					inAC = false
				} else if strings.HasPrefix(line, "AC Power:") {
					inAC = true
					inBattery = false
				}

				parts := strings.Fields(line)
				if len(parts) >= 2 {
					key := parts[0]
					value, _ := strconv.Atoi(parts[1])

					switch key {
					case "sleep":
						if inAC {
							settings.SleepTimeoutAC = value
						} else if inBattery {
							settings.SleepTimeoutBattery = value
						}
					case "displaysleep":
						if inAC {
							settings.DisplayOffAC = value
						} else if inBattery {
							settings.DisplayOffBattery = value
						}
					case "standby":
						settings.StandbyEnabled = value == 1
					case "powernap":
						settings.PowerNap = value == 1
					case "hibernatemode":
						settings.HibernateEnabled = value > 0
					}
				}
			}
		}

	case "windows":
		// Windows: Use powercfg to query settings
		// Get sleep timeout on AC
		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_SLEEP", "STANDBYIDLE").Output(); err == nil {
			settings.SleepTimeoutAC = parsePowercfgValue(string(out), "AC")
			settings.SleepTimeoutBattery = parsePowercfgValue(string(out), "DC")
		}

		// Get display timeout
		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_VIDEO", "VIDEOIDLE").Output(); err == nil {
			settings.DisplayOffAC = parsePowercfgValue(string(out), "AC")
			settings.DisplayOffBattery = parsePowercfgValue(string(out), "DC")
		}

		// Check hibernate
		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_SLEEP", "HIBERNATEIDLE").Output(); err == nil {
			timeout := parsePowercfgValue(string(out), "AC")
			settings.HibernateEnabled = timeout > 0
			settings.HibernateTimeout = timeout
		}

		// Check hybrid sleep
		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_SLEEP", "HYBRIDSLEEP").Output(); err == nil {
			if strings.Contains(string(out), "0x00000001") {
				settings.HybridSleepEnabled = true
			}
		}

	default:
		// Linux: Check various locations
		// Check if sleep is available
		if data, err := os.ReadFile("/sys/power/mem_sleep"); err == nil {
			settings.SleepEnabled = true
			output := string(data)
			// Format: s2idle [deep]
			if strings.Contains(output, "[deep]") {
				settings.SuspendMode = "deep"
			} else if strings.Contains(output, "[s2idle]") {
				settings.SuspendMode = "s2idle"
			}
		}

		// Check if hibernate is available
		if data, err := os.ReadFile("/sys/power/disk"); err == nil {
			if strings.Contains(string(data), "platform") || strings.Contains(string(data), "shutdown") {
				settings.HibernateEnabled = true
			}
		}

		// Try to get idle timeout from systemd
		if out, err := exec.Command("gsettings", "get", "org.gnome.settings-daemon.plugins.power", "sleep-inactive-ac-timeout").Output(); err == nil {
			if timeout, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				settings.SleepTimeoutAC = timeout / 60 // Convert seconds to minutes
			}
		}
		if out, err := exec.Command("gsettings", "get", "org.gnome.settings-daemon.plugins.power", "sleep-inactive-battery-timeout").Output(); err == nil {
			if timeout, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				settings.SleepTimeoutBattery = timeout / 60
			}
		}
	}

	return settings
}

func (c *DarwinPowerCollector) collectWakeSettings() models.WakeSettings {
	wake := models.WakeSettings{}

	switch runtime.GOOS {
	case "darwin":
		if out, err := exec.Command("pmset", "-g", "custom").Output(); err == nil {
			output := string(out)

			if strings.Contains(output, "womp 1") {
				wake.WakeOnLAN = true
			}
			if strings.Contains(output, "acwake 1") || strings.Contains(output, "lidwake 1") {
				wake.LidOpenWake = true
			}
			if strings.Contains(output, "ttyskeepawake 1") {
				wake.WakeOnTouch = true
			}
		}

	case "windows":
		// Check Wake-on-LAN via PowerShell
		cmd := `Get-NetAdapterPowerManagement | Where-Object {$_.WakeOnMagicPacket -eq 'Enabled'} | Measure-Object | Select-Object -ExpandProperty Count`
		if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
			if count, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil && count > 0 {
				wake.WakeOnLAN = true
			}
		}

		// Check wake timers
		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_SLEEP", "RTCWAKE").Output(); err == nil {
			if strings.Contains(string(out), "0x00000001") || strings.Contains(string(out), "0x00000002") {
				wake.WakeTimers = true
			}
		}

	default:
		// Linux: Check WoL status
		// Get first ethernet interface
		interfaces, _ := os.ReadDir("/sys/class/net")
		for _, iface := range interfaces {
			if strings.HasPrefix(iface.Name(), "eth") || strings.HasPrefix(iface.Name(), "en") {
				if out, err := exec.Command("ethtool", iface.Name()).Output(); err == nil {
					if strings.Contains(string(out), "Wake-on: g") || strings.Contains(string(out), "Wake-on: u") {
						wake.WakeOnLAN = true
						break
					}
				}
			}
		}

		// Check lid wake (for laptops)
		if data, err := os.ReadFile("/proc/acpi/wakeup"); err == nil {
			if strings.Contains(string(data), "LID") && strings.Contains(string(data), "*enabled") {
				wake.LidOpenWake = true
			}
		}
	}

	return wake
}

func (c *DarwinPowerCollector) collectBatteryPolicies() *models.BatteryPolicies {
	// Only collect if battery is present
	hasBattery := false

	switch runtime.GOOS {
	case "darwin":
		if out, err := exec.Command("pmset", "-g", "batt").Output(); err == nil {
			if strings.Contains(string(out), "InternalBattery") {
				hasBattery = true
			}
		}
	case "windows":
		if out, err := exec.Command("wmic", "path", "Win32_Battery", "get", "Status").Output(); err == nil {
			if len(strings.TrimSpace(string(out))) > 10 { // More than just header
				hasBattery = true
			}
		}
	default:
		if entries, err := os.ReadDir("/sys/class/power_supply"); err == nil {
			for _, entry := range entries {
				typePath := "/sys/class/power_supply/" + entry.Name() + "/type"
				if data, err := os.ReadFile(typePath); err == nil {
					if strings.TrimSpace(string(data)) == "Battery" {
						hasBattery = true
						break
					}
				}
			}
		}
	}

	if !hasBattery {
		return nil
	}

	policies := &models.BatteryPolicies{
		LowBatteryLevel:  20,
		CriticalLevel:    5,
		LowBatteryAction: "Sleep",
		CriticalAction:   "Hibernate",
	}

	switch runtime.GOOS {
	case "darwin":
		// macOS: Check battery preferences
		if out, err := exec.Command("pmset", "-g", "custom").Output(); err == nil {
			output := string(out)
			// Check for optimized charging
			if strings.Contains(output, "optimizecharging 1") {
				policies.OptimizedCharging = true
			}
		}

	case "windows":
		// Windows: Query battery policies
		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_BATTERY", "BATACTIONLOW").Output(); err == nil {
			action := parsePowercfgValue(string(out), "DC")
			switch action {
			case 0:
				policies.LowBatteryAction = "Nothing"
			case 1:
				policies.LowBatteryAction = "Sleep"
			case 2:
				policies.LowBatteryAction = "Hibernate"
			case 3:
				policies.LowBatteryAction = "Shutdown"
			}
		}

		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_BATTERY", "BATACTIONCRIT").Output(); err == nil {
			action := parsePowercfgValue(string(out), "DC")
			switch action {
			case 0:
				policies.CriticalAction = "Nothing"
			case 1:
				policies.CriticalAction = "Sleep"
			case 2:
				policies.CriticalAction = "Hibernate"
			case 3:
				policies.CriticalAction = "Shutdown"
			}
		}

		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_BATTERY", "BATLEVELCRIT").Output(); err == nil {
			policies.CriticalLevel = parsePowercfgValue(string(out), "DC")
		}

		if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_BATTERY", "BATLEVELWARN").Output(); err == nil {
			policies.LowBatteryLevel = parsePowercfgValue(string(out), "DC")
		}

		// Check battery saver settings
		cmd := `(Get-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Battery\Saver\Settings' -ErrorAction SilentlyContinue).SuggestedBatteryPercentage`
		if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
			if level, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				policies.BatterySaverLevel = level
			}
		}

	default:
		// Linux: Check upower settings
		if out, err := exec.Command("upower", "-d").Output(); err == nil {
			output := string(out)
			lines := strings.Split(output, "\n")
			for _, line := range lines {
				if strings.Contains(line, "percentage") {
					// Parse critical level from system settings
				}
			}
		}

		// Check GNOME power settings
		if out, err := exec.Command("gsettings", "get", "org.gnome.settings-daemon.plugins.power", "percentage-low").Output(); err == nil {
			if level, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				policies.LowBatteryLevel = level
			}
		}
		if out, err := exec.Command("gsettings", "get", "org.gnome.settings-daemon.plugins.power", "percentage-critical").Output(); err == nil {
			if level, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				policies.CriticalLevel = level
			}
		}
	}

	return policies
}

func (c *DarwinPowerCollector) collectPowerEvents() []models.PowerEvent {
	var events []models.PowerEvent

	switch runtime.GOOS {
	case "darwin":
		// macOS: Check pmset log for recent events
		if out, err := exec.Command("pmset", "-g", "log").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			count := 0
			for i := len(lines) - 1; i >= 0 && count < 10; i-- {
				line := lines[i]
				if strings.Contains(line, "Wake") || strings.Contains(line, "Sleep") {
					event := models.PowerEvent{}
					if strings.Contains(line, "Wake") {
						event.Type = "Wake"
					} else if strings.Contains(line, "Sleep") {
						event.Type = "Sleep"
					}
					// Try to parse timestamp (first field)
					parts := strings.Fields(line)
					if len(parts) > 0 {
						event.Timestamp = parts[0]
					}
					events = append(events, event)
					count++
				}
			}
		}

	case "windows":
		// Windows: Query System event log for power events
		// Event IDs: 42=Sleep, 1=Wake, 107=Resume
		cmd := `Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; Id=42,1,107} -MaxEvents 10 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id, Message | ConvertTo-Json`
		if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
			output := strings.TrimSpace(string(out))
			if output != "" && output != "null" {
				// Parse events
				re := regexp.MustCompile(`"TimeCreated"\s*:\s*"([^"]+)"`)
				times := re.FindAllStringSubmatch(output, -1)
				re = regexp.MustCompile(`"Id"\s*:\s*(\d+)`)
				ids := re.FindAllStringSubmatch(output, -1)

				for i := 0; i < len(times) && i < len(ids); i++ {
					event := models.PowerEvent{
						Timestamp: times[i][1],
					}
					id, _ := strconv.Atoi(ids[i][1])
					switch id {
					case 42:
						event.Type = "Sleep"
					case 1:
						event.Type = "Wake"
					case 107:
						event.Type = "Resume"
					}
					events = append(events, event)
				}
			}
		}

	default:
		// Linux: Check journalctl for power events
		if out, err := exec.Command("journalctl", "-u", "systemd-logind", "--since", "24 hours ago", "-q", "--no-pager", "-n", "20").Output(); err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "Lid") || strings.Contains(line, "suspend") || strings.Contains(line, "resume") {
					event := models.PowerEvent{}
					if strings.Contains(line, "suspend") {
						event.Type = "Sleep"
					} else if strings.Contains(line, "resume") {
						event.Type = "Wake"
					} else if strings.Contains(line, "Lid closed") {
						event.Type = "LidClose"
					} else if strings.Contains(line, "Lid opened") {
						event.Type = "LidOpen"
					}
					// Try to extract timestamp (typically at the beginning)
					parts := strings.SplitN(line, " ", 4)
					if len(parts) >= 3 {
						event.Timestamp = strings.Join(parts[:3], " ")
					}
					if event.Type != "" {
						events = append(events, event)
					}
				}
			}
		}
	}

	return events
}

// Helper function to parse powercfg output values
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
