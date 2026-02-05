//go:build windows

package collectors

import (
	"log"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/patchify/agent/internal/models"
)

// WindowsPowerCollector collects power management info on Windows
type WindowsPowerCollector struct{}

// NewWindowsPowerCollector creates a new power management collector for Windows
func NewWindowsPowerCollector() *WindowsPowerCollector {
	return &WindowsPowerCollector{}
}

// Name returns the collector name
func (c *WindowsPowerCollector) Name() string {
	return "power"
}

// Collect gathers power management information
func (c *WindowsPowerCollector) Collect() (interface{}, error) {
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

func (c *WindowsPowerCollector) collectPowerPlan() models.PowerPlan {
	plan := models.PowerPlan{IsActive: true}

	if out, err := exec.Command("powercfg", "/getactivescheme").Output(); err == nil {
		output := string(out)
		re := regexp.MustCompile(`GUID:\s*([a-fA-F0-9-]+)\s*\(([^)]+)\)`)
		if matches := re.FindStringSubmatch(output); len(matches) > 2 {
			plan.GUID = matches[1]
			plan.Name = strings.TrimSpace(matches[2])
		}
	} else {
		log.Printf("[power] Failed to get active power scheme: %v", err)
	}

	switch strings.ToLower(plan.Name) {
	case "balanced":
		plan.Description = "Automatically balances performance with energy consumption"
	case "high performance":
		plan.Description = "Favors performance, may reduce battery life"
	case "power saver":
		plan.Description = "Saves energy by reducing performance"
	}
	plan.Source = "System"

	return plan
}

func (c *WindowsPowerCollector) collectSleepSettings() models.SleepSettings {
	settings := models.SleepSettings{
		SleepEnabled:     true,
		HibernateEnabled: false,
	}

	if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_SLEEP", "STANDBYIDLE").Output(); err == nil {
		settings.SleepTimeoutAC = parsePowercfgValue(string(out), "AC")
		settings.SleepTimeoutBattery = parsePowercfgValue(string(out), "DC")
	}

	if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_VIDEO", "VIDEOIDLE").Output(); err == nil {
		settings.DisplayOffAC = parsePowercfgValue(string(out), "AC")
		settings.DisplayOffBattery = parsePowercfgValue(string(out), "DC")
	}

	if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_SLEEP", "HIBERNATEIDLE").Output(); err == nil {
		timeout := parsePowercfgValue(string(out), "AC")
		settings.HibernateEnabled = timeout > 0
		settings.HibernateTimeout = timeout
	}

	if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_SLEEP", "HYBRIDSLEEP").Output(); err == nil {
		if strings.Contains(string(out), "0x00000001") {
			settings.HybridSleepEnabled = true
		}
	}

	return settings
}

func (c *WindowsPowerCollector) collectWakeSettings() models.WakeSettings {
	wake := models.WakeSettings{}

	cmd := `Get-NetAdapterPowerManagement | Where-Object {$_.WakeOnMagicPacket -eq 'Enabled'} | Measure-Object | Select-Object -ExpandProperty Count`
	if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
		if count, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil && count > 0 {
			wake.WakeOnLAN = true
		}
	}

	if out, err := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_SLEEP", "RTCWAKE").Output(); err == nil {
		if strings.Contains(string(out), "0x00000001") || strings.Contains(string(out), "0x00000002") {
			wake.WakeTimers = true
		}
	}

	return wake
}

func (c *WindowsPowerCollector) collectBatteryPolicies() *models.BatteryPolicies {
	hasBattery := false

	// Use PowerShell Get-CimInstance (replaces deprecated wmic)
	if out, err := exec.Command("powershell", "-NoProfile", "-Command", `Get-CimInstance Win32_Battery | Select-Object Status`).Output(); err == nil {
		if len(strings.TrimSpace(string(out))) > 10 {
			hasBattery = true
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

	cmd := `(Get-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Battery\Saver\Settings' -ErrorAction SilentlyContinue).SuggestedBatteryPercentage`
	if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
		if level, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
			policies.BatterySaverLevel = level
		}
	}

	return policies
}

func (c *WindowsPowerCollector) collectPowerEvents() []models.PowerEvent {
	var events []models.PowerEvent

	cmd := `Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; Id=42,1,107} -MaxEvents 10 -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id, Message | ConvertTo-Json`
	if out, err := exec.Command("powershell", "-Command", cmd).Output(); err == nil {
		output := strings.TrimSpace(string(out))
		if output != "" && output != "null" {
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

	return events
}
