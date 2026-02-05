//go:build darwin || linux

package collectors

import (
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// UnixPowerCollector collects power management info on macOS and Linux
type UnixPowerCollector struct{}

// NewUnixPowerCollector creates a new power management collector for Unix systems (macOS/Linux)
func NewUnixPowerCollector() *UnixPowerCollector {
	return &UnixPowerCollector{}
}

// Backward compatibility aliases
type DarwinPowerCollector = UnixPowerCollector

func NewDarwinPowerCollector() *UnixPowerCollector {
	return NewUnixPowerCollector()
}

// Name returns the collector name
func (c *UnixPowerCollector) Name() string {
	return "power"
}

// Collect gathers power management information
func (c *UnixPowerCollector) Collect() (interface{}, error) {
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

func (c *UnixPowerCollector) collectPowerPlan() models.PowerPlan {
	plan := models.PowerPlan{IsActive: true}

	switch runtime.GOOS {
	case "darwin":
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

	default:
		// Linux: Check various power management systems
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

func (c *UnixPowerCollector) collectSleepSettings() models.SleepSettings {
	settings := models.SleepSettings{
		SleepEnabled:     true,
		HibernateEnabled: false,
	}

	switch runtime.GOOS {
	case "darwin":
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

	default:
		if data, err := os.ReadFile("/sys/power/mem_sleep"); err == nil {
			settings.SleepEnabled = true
			output := string(data)
			if strings.Contains(output, "[deep]") {
				settings.SuspendMode = "deep"
			} else if strings.Contains(output, "[s2idle]") {
				settings.SuspendMode = "s2idle"
			}
		}

		if data, err := os.ReadFile("/sys/power/disk"); err == nil {
			if strings.Contains(string(data), "platform") || strings.Contains(string(data), "shutdown") {
				settings.HibernateEnabled = true
			}
		}

		if out, err := exec.Command("gsettings", "get", "org.gnome.settings-daemon.plugins.power", "sleep-inactive-ac-timeout").Output(); err == nil {
			if timeout, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				settings.SleepTimeoutAC = timeout / 60
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

func (c *UnixPowerCollector) collectWakeSettings() models.WakeSettings {
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

	default:
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

		if data, err := os.ReadFile("/proc/acpi/wakeup"); err == nil {
			if strings.Contains(string(data), "LID") && strings.Contains(string(data), "*enabled") {
				wake.LidOpenWake = true
			}
		}
	}

	return wake
}

func (c *UnixPowerCollector) collectBatteryPolicies() *models.BatteryPolicies {
	hasBattery := false

	switch runtime.GOOS {
	case "darwin":
		if out, err := exec.Command("pmset", "-g", "batt").Output(); err == nil {
			if strings.Contains(string(out), "InternalBattery") {
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
		if out, err := exec.Command("pmset", "-g", "custom").Output(); err == nil {
			output := string(out)
			if strings.Contains(output, "optimizecharging 1") {
				policies.OptimizedCharging = true
			}
		}

	default:
		if out, err := exec.Command("upower", "-d").Output(); err == nil {
			_ = string(out)
		}

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

func (c *UnixPowerCollector) collectPowerEvents() []models.PowerEvent {
	var events []models.PowerEvent

	switch runtime.GOOS {
	case "darwin":
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
					parts := strings.Fields(line)
					if len(parts) > 0 {
						event.Timestamp = parts[0]
					}
					events = append(events, event)
					count++
				}
			}
		}

	default:
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
