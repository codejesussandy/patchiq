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

// WindowsSecurityCollector collects security info on Windows
type WindowsSecurityCollector struct{}

// NewWindowsSecurityCollector creates a new security collector for Windows
func NewWindowsSecurityCollector() *WindowsSecurityCollector {
	return &WindowsSecurityCollector{}
}

// Name returns the collector name
func (c *WindowsSecurityCollector) Name() string {
	return "security"
}

// Collect gathers security information
func (c *WindowsSecurityCollector) Collect() (interface{}, error) {
	sec := &models.Security{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
	}

	sec.Encryption = c.collectEncryptionStatus()
	sec.Firewall = c.collectFirewallStatus()
	sec.Antivirus = c.collectAntivirusStatus()
	sec.LocalUsers = c.collectLocalUsers()
	sec.Compliance = c.collectComplianceStatus()

	return sec, nil
}

func (c *WindowsSecurityCollector) collectEncryptionStatus() models.EncryptionStatus {
	enc := models.EncryptionStatus{
		EncryptionType: "None",
	}

	// Windows: Check BitLocker status using manage-bde
	out, err := exec.Command("manage-bde", "-status").Output()
	if err == nil {
		output := string(out)
		enc.EncryptionType = "BitLocker"

		// Parse each volume
		volumes := strings.Split(output, "Volume")
		for _, vol := range volumes[1:] { // Skip first empty element
			drive := models.DriveEncryption{
				EncryptionMethod: "BitLocker",
			}

			lines := strings.Split(vol, "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if strings.HasPrefix(line, "C:") || strings.HasPrefix(line, "D:") {
					drive.DriveName = strings.TrimSuffix(line, "\\")
				}
				if strings.Contains(line, "Conversion Status:") {
					if strings.Contains(line, "Fully Encrypted") {
						drive.IsEncrypted = true
						drive.EncryptionPercentage = 100
						drive.ProtectionStatus = "Protected"
						enc.DriveEncryptionEnabled = true
						if strings.HasPrefix(drive.DriveName, "C:") {
							enc.SystemDriveEncrypted = true
						}
					} else if strings.Contains(line, "Encryption in Progress") {
						drive.IsEncrypted = true
						drive.ProtectionStatus = "Encrypting"
					}
				}
				if strings.Contains(line, "Percentage Encrypted:") {
					re := regexp.MustCompile(`(\d+(?:\.\d+)?)%`)
					if matches := re.FindStringSubmatch(line); len(matches) > 1 {
						if pct, err := strconv.ParseFloat(matches[1], 64); err == nil {
							drive.EncryptionPercentage = pct
						}
					}
				}
			}

			if drive.DriveName != "" {
				enc.Drives = append(enc.Drives, drive)
			}
		}
	} else {
		log.Printf("[security] BitLocker status unavailable (may require admin): %v", err)
	}

	return enc
}

func (c *WindowsSecurityCollector) collectFirewallStatus() models.FirewallStatus {
	fw := models.FirewallStatus{}

	// Windows: Check Windows Firewall status
	fw.ProductName = "Windows Defender Firewall"

	out, err := exec.Command("netsh", "advfirewall", "show", "allprofiles", "state").Output()
	if err == nil {
		if strings.Contains(string(out), "ON") {
			fw.Enabled = true
		}
	}

	// Get more detailed profile status
	profiles := []string{"domainprofile", "privateprofile", "publicprofile"}
	for _, profile := range profiles {
		if out, err := exec.Command("netsh", "advfirewall", "show", profile).Output(); err == nil {
			if strings.Contains(string(out), "State") && strings.Contains(string(out), "ON") {
				fw.Enabled = true
				break
			}
		}
	}

	return fw
}

func (c *WindowsSecurityCollector) collectAntivirusStatus() models.AntivirusStatus {
	av := models.AntivirusStatus{}

	// Windows: Check Windows Defender status
	av.Installed = true

	defender := models.AntivirusProduct{
		Name:      "Windows Defender",
		Vendor:    "Microsoft Corporation",
		IsDefault: true,
	}

	// Use PowerShell to get Defender status (more reliable than wmic)
	out, err := exec.Command("powershell", "-Command", "Get-MpComputerStatus | Select-Object -Property AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureLastUpdated,AntivirusSignatureVersion | Format-List").Output()
	if err == nil {
		output := string(out)
		if strings.Contains(output, "AntivirusEnabled") && strings.Contains(output, "True") {
			defender.Enabled = true
		}
		if strings.Contains(output, "RealTimeProtectionEnabled") && strings.Contains(output, "True") {
			defender.RealTimeProtection = true
		}
		// Extract signature version
		for _, line := range strings.Split(output, "\n") {
			if strings.Contains(line, "AntivirusSignatureVersion") {
				parts := strings.SplitN(line, ":", 2)
				if len(parts) == 2 {
					defender.DefinitionVersion = strings.TrimSpace(parts[1])
				}
			}
			if strings.Contains(line, "AntivirusSignatureLastUpdated") {
				parts := strings.SplitN(line, ":", 2)
				if len(parts) == 2 {
					defender.LastUpdate = strings.TrimSpace(parts[1])
				}
			}
		}
	} else {
		log.Printf("[security] Windows Defender status unavailable (may require admin): %v", err)
	}

	av.Products = append(av.Products, defender)

	// Check for third-party AV via WMI
	if out, err := exec.Command("wmic", "/namespace:\\\\root\\SecurityCenter2", "path", "AntivirusProduct", "get", "displayName,productState", "/format:csv").Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 2 {
				name := strings.TrimSpace(fields[1])
				if name != "" && name != "Windows Defender" {
					product := models.AntivirusProduct{
						Name:      name,
						Enabled:   true,
						IsDefault: false,
					}
					av.Products = append(av.Products, product)
				}
			}
		}
	}

	return av
}

func (c *WindowsSecurityCollector) collectLocalUsers() []models.LocalUser {
	var users []models.LocalUser

	// Windows: Get local users via wmic or net user
	out, err := exec.Command("wmic", "useraccount", "get", "name,fullname,disabled,localaccount", "/format:csv").Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for i, line := range lines {
			if i == 0 || strings.TrimSpace(line) == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 4 {
				localUser := models.LocalUser{
					Username:  strings.TrimSpace(fields[3]),
					FullName:  strings.TrimSpace(fields[2]),
					IsEnabled: strings.TrimSpace(fields[1]) != "TRUE",
				}

				// Check if admin by checking Administrators group membership
				if out, err := exec.Command("net", "localgroup", "Administrators").Output(); err == nil {
					if strings.Contains(string(out), localUser.Username) {
						localUser.IsAdmin = true
					}
				}

				// Get groups
				if out, err := exec.Command("net", "user", localUser.Username).Output(); err == nil {
					lines := strings.Split(string(out), "\n")
					inGroups := false
					for _, line := range lines {
						if strings.Contains(line, "Local Group Memberships") {
							inGroups = true
							parts := strings.SplitN(line, "*", 2)
							if len(parts) == 2 {
								groups := strings.Fields(strings.TrimSpace(parts[1]))
								for _, g := range groups {
									if g != "*" {
										localUser.Groups = append(localUser.Groups, g)
									}
								}
							}
						} else if inGroups && !strings.Contains(line, "Global Group") {
							// Continuation line
							groups := strings.Fields(strings.TrimSpace(line))
							for _, g := range groups {
								if g != "*" {
									localUser.Groups = append(localUser.Groups, g)
								}
							}
						} else if strings.Contains(line, "Global Group") {
							break
						}
					}
				}

				if localUser.Username != "" {
					users = append(users, localUser)
				}
			}
		}
	} else {
		log.Printf("[security] Failed to enumerate local users: %v", err)
	}

	return users
}

func (c *WindowsSecurityCollector) collectComplianceStatus() models.ComplianceStatus {
	comp := models.ComplianceStatus{}

	// Windows: Check Secure Boot via PowerShell
	if out, err := exec.Command("powershell", "-Command", "Confirm-SecureBootUEFI").Output(); err == nil {
		if strings.Contains(strings.ToLower(string(out)), "true") {
			comp.SecureBootEnabled = true
		}
	}

	// Check UAC (User Account Control) status
	if out, err := exec.Command("reg", "query", "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System", "/v", "EnableLUA").Output(); err == nil {
		if strings.Contains(string(out), "0x1") {
			comp.UACEnabled = true
		}
	}

	// Check screen lock settings (screen saver password)
	if out, err := exec.Command("reg", "query", "HKCU\\Control Panel\\Desktop", "/v", "ScreenSaverIsSecure").Output(); err == nil {
		if strings.Contains(string(out), "1") {
			comp.ScreenLockEnabled = true
		}
	}

	// Get screen lock timeout
	if out, err := exec.Command("reg", "query", "HKCU\\Control Panel\\Desktop", "/v", "ScreenSaveTimeOut").Output(); err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			if strings.Contains(line, "ScreenSaveTimeOut") {
				fields := strings.Fields(line)
				if len(fields) >= 3 {
					if timeout, err := strconv.Atoi(fields[len(fields)-1]); err == nil {
						comp.ScreenLockTimeout = timeout
					}
				}
			}
		}
	}

	// Check auto login
	if out, err := exec.Command("reg", "query", "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon", "/v", "AutoAdminLogon").Output(); err == nil {
		// If AutoAdminLogon is 0 or doesn't exist, auto login is disabled
		if strings.Contains(string(out), "0x0") || !strings.Contains(string(out), "0x1") {
			comp.AutoLoginDisabled = true
		}
	} else {
		// Registry key doesn't exist - auto login disabled
		comp.AutoLoginDisabled = true
	}

	// Check BitLocker status
	if out, err := exec.Command("manage-bde", "-status", "C:").Output(); err == nil {
		if strings.Contains(string(out), "Fully Encrypted") || strings.Contains(string(out), "Protection On") {
			comp.BitLockerEnabled = true
		}
	}

	// Check Remote Desktop (RDP) status
	if out, err := exec.Command("reg", "query", "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server", "/v", "fDenyTSConnections").Output(); err == nil {
		// 0 means RDP is enabled, 1 means disabled
		if strings.Contains(string(out), "0x0") {
			comp.RemoteLoginEnabled = true
		}
	}

	// Check Windows Defender SmartScreen
	if out, err := exec.Command("reg", "query", "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer", "/v", "SmartScreenEnabled").Output(); err == nil {
		if strings.Contains(string(out), "On") || strings.Contains(string(out), "Warn") {
			comp.SmartScreenEnabled = true
		}
	}

	return comp
}
