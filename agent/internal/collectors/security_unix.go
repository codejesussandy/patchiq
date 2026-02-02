//go:build darwin || linux

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

// DarwinSecurityCollector collects security info on macOS
type DarwinSecurityCollector struct{}

// NewDarwinSecurityCollector creates a new security collector for macOS
func NewDarwinSecurityCollector() *DarwinSecurityCollector {
	return &DarwinSecurityCollector{}
}

// Name returns the collector name
func (c *DarwinSecurityCollector) Name() string {
	return "security"
}

// Collect gathers security information
func (c *DarwinSecurityCollector) Collect() (interface{}, error) {
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

func (c *DarwinSecurityCollector) collectEncryptionStatus() models.EncryptionStatus {
	enc := models.EncryptionStatus{
		EncryptionType: "None",
	}

	switch runtime.GOOS {
	case "darwin":
		// Check FileVault status
		out, err := exec.Command("fdesetup", "status").Output()
		if err == nil {
			status := string(out)
			if strings.Contains(status, "FileVault is On") {
				enc.DriveEncryptionEnabled = true
				enc.SystemDriveEncrypted = true
				enc.EncryptionType = "FileVault"

				if strings.Contains(status, "Encryption in progress") {
					re := regexp.MustCompile(`(\d+)%`)
					if matches := re.FindStringSubmatch(status); len(matches) > 1 {
						enc.Drives = append(enc.Drives, models.DriveEncryption{
							DriveName:        "Macintosh HD",
							IsEncrypted:      true,
							EncryptionMethod: "FileVault 2",
							ProtectionStatus: "Encrypting",
						})
					}
				} else {
					enc.Drives = append(enc.Drives, models.DriveEncryption{
						DriveName:            "Macintosh HD",
						IsEncrypted:          true,
						EncryptionMethod:     "FileVault 2",
						EncryptionPercentage: 100,
						ProtectionStatus:     "Protected",
					})
				}
			}
		}

	default:
		// Linux: Check LUKS encryption
		out, err := exec.Command("lsblk", "-o", "NAME,TYPE,FSTYPE").Output()
		if err == nil {
			if strings.Contains(string(out), "crypto_LUKS") || strings.Contains(string(out), "luks") {
				enc.DriveEncryptionEnabled = true
				enc.EncryptionType = "LUKS"
				enc.SystemDriveEncrypted = true
			}
		}

		// Check for encrypted home
		if _, err := os.Stat("/home/.ecryptfs"); err == nil {
			enc.DriveEncryptionEnabled = true
			enc.EncryptionType = "eCryptfs"
		}
	}

	return enc
}

func (c *DarwinSecurityCollector) collectFirewallStatus() models.FirewallStatus {
	fw := models.FirewallStatus{}

	switch runtime.GOOS {
	case "darwin":
		// Check macOS firewall
		out, err := exec.Command("defaults", "read", "/Library/Preferences/com.apple.alf", "globalstate").Output()
		if err == nil {
			state := strings.TrimSpace(string(out))
			switch state {
			case "1", "2":
				fw.Enabled = true
			default:
				fw.Enabled = false
			}
		}

		fw.ProductName = "macOS Application Firewall"

		// Check stealth mode
		out, err = exec.Command("defaults", "read", "/Library/Preferences/com.apple.alf", "stealthenabled").Output()
		if err == nil {
			if strings.TrimSpace(string(out)) == "1" {
				fw.StealthMode = true
			}
		}

		// Also check pf (packet filter)
		out, err = exec.Command("pfctl", "-s", "info").Output()
		if err == nil {
			if strings.Contains(string(out), "Status: Enabled") {
				fw.Enabled = true
			}
		}

	default:
		// Linux: Check iptables/nftables/ufw
		out, err := exec.Command("ufw", "status").Output()
		if err == nil {
			if strings.Contains(string(out), "Status: active") {
				fw.Enabled = true
				fw.ProductName = "UFW"
			}
		}

		if !fw.Enabled {
			out, err = exec.Command("firewall-cmd", "--state").Output()
			if err == nil && strings.Contains(string(out), "running") {
				fw.Enabled = true
				fw.ProductName = "firewalld"
			}
		}

		if !fw.Enabled {
			out, err = exec.Command("iptables", "-L", "-n").Output()
			if err == nil {
				lines := strings.Split(string(out), "\n")
				ruleCount := 0
				for _, line := range lines {
					if !strings.HasPrefix(line, "Chain") && !strings.HasPrefix(line, "target") && strings.TrimSpace(line) != "" {
						ruleCount++
					}
				}
				if ruleCount > 0 {
					fw.Enabled = true
					fw.ProductName = "iptables"
				}
			}
		}
	}

	return fw
}

func (c *DarwinSecurityCollector) collectAntivirusStatus() models.AntivirusStatus {
	av := models.AntivirusStatus{}

	switch runtime.GOOS {
	case "darwin":
		// macOS has XProtect built-in
		av.Installed = true

		xprotect := models.AntivirusProduct{
			Name:               "XProtect",
			Vendor:             "Apple Inc.",
			Enabled:            true,
			IsDefault:          true,
			RealTimeProtection: true,
		}

		// Get XProtect version
		out, err := exec.Command("defaults", "read", "/System/Library/CoreServices/XProtect.bundle/Contents/Resources/XProtect.meta", "Version").Output()
		if err == nil {
			xprotect.DefinitionVersion = strings.TrimSpace(string(out))
		}

		av.Products = append(av.Products, xprotect)

		// Check for third-party AV
		thirdPartyAV := []struct {
			name string
			path string
		}{
			{"Sophos", "/Library/Sophos Anti-Virus"},
			{"Norton", "/Applications/Norton Security.app"},
			{"Avast", "/Applications/Avast.app"},
			{"Kaspersky", "/Applications/Kaspersky Internet Security.app"},
			{"Malwarebytes", "/Applications/Malwarebytes.app"},
			{"ESET", "/Applications/ESET Endpoint Security.app"},
		}

		for _, avp := range thirdPartyAV {
			if _, err := os.Stat(avp.path); err == nil {
				av.Products = append(av.Products, models.AntivirusProduct{
					Name:      avp.name,
					Enabled:   true,
					IsDefault: false,
				})
			}
		}

	default:
		// Linux: Check for ClamAV and other AV products
		if out, err := exec.Command("which", "clamscan").Output(); err == nil && len(out) > 0 {
			av.Installed = true
			product := models.AntivirusProduct{
				Name:    "ClamAV",
				Enabled: true,
			}

			if out, err := exec.Command("pgrep", "clamd").Output(); err == nil && len(out) > 0 {
				product.RealTimeProtection = true
			}

			if out, err := exec.Command("clamscan", "--version").Output(); err == nil {
				lines := strings.Split(string(out), "\n")
				if len(lines) > 0 {
					product.DefinitionVersion = strings.TrimSpace(lines[0])
				}
			}

			av.Products = append(av.Products, product)
		}
	}

	return av
}

func (c *DarwinSecurityCollector) collectLocalUsers() []models.LocalUser {
	var users []models.LocalUser

	switch runtime.GOOS {
	case "darwin":
		// Get list of users using dscl
		out, err := exec.Command("dscl", ".", "-list", "/Users").Output()
		if err != nil {
			return users
		}

		usernames := strings.Split(strings.TrimSpace(string(out)), "\n")
		for _, username := range usernames {
			username = strings.TrimSpace(username)

			// Skip system users
			if strings.HasPrefix(username, "_") || username == "daemon" || username == "nobody" || username == "root" {
				continue
			}

			localUser := models.LocalUser{
				Username:  username,
				IsEnabled: true,
			}

			if out, err := exec.Command("dscl", ".", "-read", "/Users/"+username, "RealName").Output(); err == nil {
				lines := strings.Split(string(out), "\n")
				for _, line := range lines {
					if !strings.HasPrefix(line, "RealName:") && strings.TrimSpace(line) != "" {
						localUser.FullName = strings.TrimSpace(line)
					}
				}
			}

			if out, err := exec.Command("dseditgroup", "-o", "checkmember", "-m", username, "admin").Output(); err == nil {
				if strings.Contains(string(out), "yes") {
					localUser.IsAdmin = true
				}
			}

			if out, err := exec.Command("groups", username).Output(); err == nil {
				parts := strings.SplitN(string(out), ":", 2)
				if len(parts) == 2 {
					groups := strings.Fields(strings.TrimSpace(parts[1]))
					localUser.Groups = groups
				}
			}

			users = append(users, localUser)
		}

	default:
		// Linux: Parse /etc/passwd
		data, err := os.ReadFile("/etc/passwd")
		if err != nil {
			return users
		}

		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			fields := strings.Split(line, ":")
			if len(fields) < 7 {
				continue
			}

			uid, _ := strconv.Atoi(fields[2])

			// Skip system users (UID < 1000, except root)
			// Also skip "nobody" user (UID 65534) which is a special system account
			if (uid < 1000 && uid != 0) || uid == 65534 {
				continue
			}

			localUser := models.LocalUser{
				Username:  fields[0],
				FullName:  strings.Split(fields[4], ",")[0], // GECOS field
				IsEnabled: true,
				IsAdmin:   uid == 0, // root user is always admin
			}

			// Check if admin (in sudo or wheel group)
			if out, err := exec.Command("groups", fields[0]).Output(); err == nil {
				output := string(out)
				parts := strings.SplitN(output, ":", 2)
				if len(parts) == 2 {
					groups := strings.Fields(strings.TrimSpace(parts[1]))
					localUser.Groups = groups
					for _, g := range groups {
						if g == "sudo" || g == "wheel" || g == "admin" {
							localUser.IsAdmin = true
							break
						}
					}
				}
			}

			// Check if account is locked
			shadowData, err := os.ReadFile("/etc/shadow")
			if err == nil {
				shadowLines := strings.Split(string(shadowData), "\n")
				for _, shadowLine := range shadowLines {
					shadowFields := strings.Split(shadowLine, ":")
					if len(shadowFields) >= 2 && shadowFields[0] == fields[0] {
						if strings.HasPrefix(shadowFields[1], "!") || strings.HasPrefix(shadowFields[1], "*") {
							localUser.IsEnabled = false
						}
						break
					}
				}
			}

			users = append(users, localUser)
		}
	}

	return users
}

func (c *DarwinSecurityCollector) collectComplianceStatus() models.ComplianceStatus {
	comp := models.ComplianceStatus{}

	switch runtime.GOOS {
	case "darwin":
		// Check Secure Boot (Apple Silicon)
		if out, err := exec.Command("csrutil", "status").Output(); err == nil {
			if strings.Contains(string(out), "enabled") {
				comp.SIPEnabled = true
			}
		}

		// Check Gatekeeper
		if out, err := exec.Command("spctl", "--status").Output(); err == nil {
			if strings.Contains(string(out), "enabled") {
				comp.GatekeeperEnabled = true
			}
		}

		// Check screen lock settings
		if out, err := exec.Command("defaults", "read", "com.apple.screensaver", "askForPassword").Output(); err == nil {
			if strings.TrimSpace(string(out)) == "1" {
				comp.ScreenLockEnabled = true
			}
		}

		// Get screen lock delay
		if out, err := exec.Command("defaults", "read", "com.apple.screensaver", "askForPasswordDelay").Output(); err == nil {
			if delay, err := strconv.Atoi(strings.TrimSpace(string(out))); err == nil {
				comp.ScreenLockTimeout = delay
			}
		}

		// Check auto login
		if _, err := exec.Command("defaults", "read", "/Library/Preferences/com.apple.loginwindow", "autoLoginUser").Output(); err != nil {
			// Error means no auto-login user set
			comp.AutoLoginDisabled = true
		}

		// Check FileVault status
		if out, err := exec.Command("fdesetup", "status").Output(); err == nil {
			if strings.Contains(string(out), "FileVault is On") {
				comp.FileVaultEnabled = true
			}
		}

		// Check remote login (SSH)
		if out, err := exec.Command("systemsetup", "-getremotelogin").Output(); err == nil {
			if strings.Contains(string(out), "On") {
				comp.RemoteLoginEnabled = true
			}
		}

	default:
		// Linux compliance checks

		// Check Secure Boot
		if data, err := os.ReadFile("/sys/firmware/efi/efivars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c"); err == nil {
			if len(data) > 0 && data[len(data)-1] == 1 {
				comp.SecureBootEnabled = true
			}
		}

		// Check screen lock (GNOME)
		if out, err := exec.Command("gsettings", "get", "org.gnome.desktop.screensaver", "lock-enabled").Output(); err == nil {
			if strings.TrimSpace(string(out)) == "true" {
				comp.ScreenLockEnabled = true
			}
		}

		// Check SSH
		if out, err := exec.Command("systemctl", "is-active", "sshd").Output(); err == nil {
			if strings.TrimSpace(string(out)) == "active" {
				comp.RemoteLoginEnabled = true
			}
		}
	}

	return comp
}
