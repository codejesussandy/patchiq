# Agent Software Classification Enhancement

**Purpose:** Improve the agent's ability to distinguish between third-party apps, system apps, and services for better asset management, security analysis, and license tracking.

---

## 🎯 **Current State vs. Target State**

### **Current Collection** (What we have now)
```typescript
Application {
  name: "Google Chrome"
  version: "120.0.6099.109"
  vendor: "Google LLC"
  installDate: "2024-01-15"
  sizeBytes: 542105600
  installSource: "DMG"  // or "MSI", "PKG", "brew", "apt"
  path: "/Applications/Google Chrome.app"
  bundleId: "com.google.Chrome"  // macOS only
  productCode: "{GUID}"  // Windows only
  license: { ... }
}
```

**Problems:**
- ❌ Can't distinguish system apps from third-party apps
- ❌ Can't identify bloatware vs. essential software
- ❌ Can't tell if app was IT-deployed or user-installed
- ❌ Can't categorize apps (productivity, security, development, etc.)
- ❌ Can't identify security risks (unsigned apps, deprecated versions)

### **Target Collection** (What we need)
```typescript
Application {
  // Existing fields
  name: "Google Chrome"
  version: "120.0.6099.109"
  vendor: "Google LLC"

  // NEW: Classification fields
  classificationType: "ThirdParty"  // System, ThirdParty, UserInstalled, ITDeployed
  category: "Browser"  // Browser, Productivity, Security, Development, etc.
  isSystemApp: false
  isPreInstalled: false

  // NEW: Installation metadata
  installMethod: "ManualInstall"  // ManualInstall, PackageManager, AppStore, EnterpriseDeployment
  installScope: "AllUsers"  // AllUsers, CurrentUser, System
  installedBy: "john.doe"  // Username who installed
  approvalStatus: "Approved"  // Approved, Unapproved, Prohibited, Unknown

  // NEW: Security metadata
  digitalSignature: {
    isSigned: true
    signedBy: "Google LLC"
    isValidSignature: true
    signingAuthority: "DigiCert"
    certificateExpiry: "2025-12-31"
  }

  // NEW: Update metadata
  updateChannel: "Stable"  // Stable, Beta, Dev, Canary
  lastUpdated: "2024-02-01"
  autoUpdateEnabled: true
  updateSource: "VendorWebsite"  // VendorWebsite, PackageManager, AppStore, Enterprise

  // NEW: Usage & behavior
  launchFrequency: "Daily"  // Never, Rarely, Weekly, Daily, Hourly
  lastUsed: "2024-02-09T10:30:00Z"
  avgDailyUsageMinutes: 120
  networkAccess: true
  requiresAdmin: false

  // NEW: Dependencies
  dependencies: ["Microsoft .NET Framework 4.8", "Visual C++ Redistributable"]
  conflictsWith: ["Firefox ESR"]

  // Existing fields
  installDate: "2024-01-15"
  sizeBytes: 542105600
  installSource: "DMG"
  path: "/Applications/Google Chrome.app"
  bundleId: "com.google.Chrome"
  license: { ... }
}
```

---

## 📊 **New Fields Breakdown**

### **1. Classification Fields**

#### **classificationType** (enum: System | ThirdParty | UserInstalled | ITDeployed)
**Purpose:** Primary classification of software origin

**Logic:**
```go
func determineClassificationType(app Application) string {
    // System apps
    if isSystemPath(app.Path) && isSystemVendor(app.Vendor) {
        return "System"
    }

    // IT deployed (installed via enterprise tools)
    if app.InstallSource == "GPO" || app.InstallSource == "SCCM" ||
       app.InstallSource == "Jamf" || app.InstallSource == "Intune" {
        return "ITDeployed"
    }

    // User installed in user directories
    if isUserPath(app.Path) {
        return "UserInstalled"
    }

    // Everything else is third-party
    return "ThirdParty"
}

func isSystemPath(path string) bool {
    systemPaths := []string{
        // Windows
        "C:\\Windows\\",
        "C:\\Program Files\\Windows",

        // macOS
        "/System/",
        "/Library/Apple/",
        "/usr/libexec/",

        // Linux
        "/bin/",
        "/sbin/",
        "/usr/bin/",
        "/usr/sbin/",
        "/lib/",
        "/usr/lib/",
    }

    for _, sysPath := range systemPaths {
        if strings.HasPrefix(path, sysPath) {
            return true
        }
    }
    return false
}

func isSystemVendor(vendor string) bool {
    systemVendors := []string{
        "Microsoft Corporation",
        "Apple Inc.",
        "Apple",
        "Canonical Ltd.",
        "Red Hat",
        "SUSE",
        "Debian",
        "Ubuntu",
    }

    for _, sysVendor := range systemVendors {
        if vendor == sysVendor {
            return true
        }
    }
    return false
}

func isUserPath(path string) bool {
    userPaths := []string{
        // Windows
        "C:\\Users\\",
        "%USERPROFILE%",
        "%LOCALAPPDATA%",

        // macOS
        "/Users/",
        "~/",

        // Linux
        "/home/",
        "~/.local/",
    }

    for _, userPath := range userPaths {
        if strings.Contains(path, userPath) {
            return true
        }
    }
    return false
}
```

---

#### **category** (enum: Browser | Productivity | Security | Development | Media | Gaming | Utility | Communication | Finance | Healthcare | Education | Unknown)
**Purpose:** Functional categorization for reporting and policy enforcement

**Logic:**
```go
func categorizeApplication(app Application) string {
    // Category detection rules

    // 1. Check known applications
    knownApps := map[string]string{
        "Google Chrome": "Browser",
        "Firefox": "Browser",
        "Microsoft Edge": "Browser",
        "Safari": "Browser",

        "Microsoft Word": "Productivity",
        "Microsoft Excel": "Productivity",
        "Microsoft PowerPoint": "Productivity",
        "Adobe Acrobat": "Productivity",

        "Visual Studio Code": "Development",
        "IntelliJ IDEA": "Development",
        "Docker Desktop": "Development",
        "Postman": "Development",

        "Slack": "Communication",
        "Microsoft Teams": "Communication",
        "Zoom": "Communication",
        "Discord": "Communication",

        "Spotify": "Media",
        "VLC": "Media",
        "iTunes": "Media",

        "Norton Antivirus": "Security",
        "McAfee": "Security",
        "1Password": "Security",

        "Steam": "Gaming",
        "Epic Games": "Gaming",
    }

    if category, found := knownApps[app.Name]; found {
        return category
    }

    // 2. Check bundle ID (macOS)
    if strings.Contains(app.BundleID, ".browser.") {
        return "Browser"
    }

    // 3. Check path patterns
    if strings.Contains(app.Path, "Games") {
        return "Gaming"
    }

    // 4. Check vendor patterns
    if strings.Contains(app.Vendor, "Antivirus") ||
       strings.Contains(app.Vendor, "Security") {
        return "Security"
    }

    return "Unknown"
}
```

---

#### **isSystemApp** (boolean)
**Purpose:** Quick flag for system/OS components

**Sources:**
- **Windows:** Check if in `C:\Windows\` or signed by Microsoft
- **macOS:** Check if in `/System/`, `/Library/Apple/`, or part of macOS base install
- **Linux:** Check if in `/bin/`, `/sbin/`, `/usr/bin/`, `/usr/sbin/`, or installed via base packages

---

#### **isPreInstalled** (boolean)
**Purpose:** Identify bloatware and OEM software

**Logic:**
```go
func isPreInstalled(app Application) bool {
    // Check installation date vs OS installation date
    osInstallDate := getOSInstallDate()
    appInstallDate := parseDate(app.InstallDate)

    // If installed within 1 day of OS install, likely pre-installed
    if appInstallDate.Sub(osInstallDate) < 24*time.Hour {
        return true
    }

    // Check for known OEM bloatware patterns
    oemBloatware := []string{
        "McAfee", // Trial versions
        "Norton", // Trial versions
        "WildTangent", // Games
        "Candy Crush",
        "Dell SupportAssist",
        "HP Support Assistant",
        "Lenovo Vantage",
    }

    for _, bloat := range oemBloatware {
        if strings.Contains(app.Name, bloat) {
            return true
        }
    }

    return false
}
```

---

### **2. Installation Metadata**

#### **installMethod** (enum: ManualInstall | PackageManager | AppStore | EnterpriseDeployment | Bundled | Unknown)
**Purpose:** Track how software was installed

**Sources:**
- **Windows:**
  - Check registry: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{GUID}\InstallSource`
  - Check MSI database: `msiexec /qn /l*v`
  - Check for `.exe` installer remnants in `%TEMP%`
  - Check GPO deployment logs
  - Check SCCM/Intune markers

- **macOS:**
  - Check receipt: `/var/db/receipts/` (PKG installs)
  - Check App Store metadata: `/Applications/{App}.app/Contents/_MASReceipt/receipt`
  - Check Homebrew: `brew list --versions`
  - Check Jamf Pro: `/Library/Application Support/JAMF/Receipts/`
  - Check for DMG remnants: `~/Downloads/*.dmg`

- **Linux:**
  - Check package manager: `dpkg -l`, `rpm -qa`, `snap list`, `flatpak list`
  - Check install logs: `/var/log/apt/`, `/var/log/yum.log`
  - Check if compiled from source: presence of `.git` or `configure` scripts

---

#### **installScope** (enum: System | AllUsers | CurrentUser)
**Purpose:** Determine access scope and permissions

**Sources:**
- **Windows:**
  - `HKLM\SOFTWARE` = AllUsers
  - `HKCU\SOFTWARE` = CurrentUser
  - `C:\Program Files\` = AllUsers
  - `%LOCALAPPDATA%` = CurrentUser

- **macOS:**
  - `/Applications/` = AllUsers
  - `~/Applications/` = CurrentUser
  - `/System/` = System

- **Linux:**
  - `/usr/`, `/opt/` = AllUsers
  - `~/.local/`, `~/bin/` = CurrentUser
  - `/bin/`, `/sbin/` = System

---

#### **installedBy** (string - username)
**Purpose:** Track who installed software (accountability, licensing)

**Sources:**
- **Windows:**
  - Registry: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{GUID}\InstalledBy`
  - Event Viewer: Application install events (Event ID 11707)
  - File owner of install directory: `Get-Acl | Select Owner`

- **macOS:**
  - File owner: `ls -l /Applications/{App}.app`
  - Install logs: `/var/log/install.log` (includes username)
  - Jamf logs: `/var/log/jamf.log`

- **Linux:**
  - Package manager logs: `/var/log/apt/history.log`, `/var/log/yum.log`
  - File owner: `stat -c '%U' /opt/{app}`

---

#### **approvalStatus** (enum: Approved | Unapproved | Prohibited | Unknown)
**Purpose:** Policy enforcement and security compliance

**Logic:**
```go
func determineApprovalStatus(app Application, whitelist []string, blacklist []string) string {
    appIdentifier := fmt.Sprintf("%s|%s", app.Name, app.Vendor)

    // Check blacklist first (prohibited)
    for _, prohibited := range blacklist {
        if strings.Contains(appIdentifier, prohibited) {
            return "Prohibited"
        }
    }

    // Check whitelist (approved)
    for _, approved := range whitelist {
        if strings.Contains(appIdentifier, approved) {
            return "Approved"
        }
    }

    // IT-deployed = auto-approved
    if app.ClassificationType == "ITDeployed" {
        return "Approved"
    }

    // System apps = auto-approved
    if app.IsSystemApp {
        return "Approved"
    }

    // Everything else is unapproved (needs review)
    return "Unapproved"
}
```

---

### **3. Security Metadata**

#### **digitalSignature** (object)
**Purpose:** Verify software authenticity and detect malware

**Structure:**
```go
type DigitalSignature struct {
    IsSigned          bool   `json:"isSigned"`
    SignedBy          string `json:"signedBy"`           // Certificate subject
    IsValidSignature  bool   `json:"isValidSignature"`   // Signature verification result
    SigningAuthority  string `json:"signingAuthority"`   // CA that issued cert
    CertificateExpiry string `json:"certificateExpiry"`  // ISO8601
    TrustLevel        string `json:"trustLevel"`         // Trusted, Untrusted, Unknown
}
```

**Collection:**
- **Windows:**
  ```powershell
  Get-AuthenticodeSignature "C:\Program Files\App\app.exe"
  ```

- **macOS:**
  ```bash
  codesign -dv --verbose=4 /Applications/App.app 2>&1
  spctl -a -vv /Applications/App.app 2>&1
  ```

- **Linux:**
  ```bash
  # Check if binary is signed (rare on Linux)
  # Most validation done via package manager signatures
  rpm --checksig package.rpm
  dpkg-sig --verify package.deb
  ```

---

### **4. Update Metadata**

#### **updateChannel** (enum: Stable | Beta | Dev | Canary | LTS | Unknown)
**Purpose:** Track software update risk and version management

**Sources:**
- Check application preferences/config files
- Check registry keys (Windows)
- Check plist files (macOS)
- Check version string patterns (e.g., "120.0.6099.109-beta")

---

#### **autoUpdateEnabled** (boolean)
**Purpose:** Understand update mechanisms and potential security gaps

**Sources:**
- **Windows:**
  - Check auto-update services in Task Scheduler
  - Check registry: `HKLM\SOFTWARE\{Vendor}\{App}\AutoUpdate`

- **macOS:**
  - Check LaunchAgents for update daemons
  - Check app preferences: `defaults read com.vendor.app AutoUpdate`

- **Linux:**
  - Check if installed via package manager (auto-update via system)
  - Check for cron jobs: `crontab -l | grep update`

---

#### **updateSource** (enum: VendorWebsite | PackageManager | AppStore | Enterprise | Manual)
**Purpose:** Track update channels for security and compliance

---

### **5. Usage & Behavior Metadata**

#### **launchFrequency** (enum: Never | Rarely | Weekly | Daily | Hourly)
**Purpose:** Identify unused software for license optimization

**Collection:**
```go
func calculateLaunchFrequency(lastUsed time.Time, avgDailyUsage int) string {
    if lastUsed.IsZero() {
        return "Never"
    }

    daysSinceLastUse := time.Since(lastUsed).Hours() / 24

    if avgDailyUsage > 60 {
        return "Hourly"  // Used more than 1 hour per day
    } else if daysSinceLastUse <= 1 {
        return "Daily"
    } else if daysSinceLastUse <= 7 {
        return "Weekly"
    } else if daysSinceLastUse <= 30 {
        return "Rarely"
    } else {
        return "Never"
    }
}
```

**Sources:**
- **Windows:**
  - Prefetch files: `C:\Windows\Prefetch\` (last execution time)
  - Event Viewer: Application start events
  - Process accounting

- **macOS:**
  - QuickLook cache: `~/Library/Application Support/com.apple.sharedfilelist/`
  - Unified logs: `log show --predicate 'process == "AppName"'`
  - FSEvents (file system events)

- **Linux:**
  - Command history: `~/.bash_history`, `~/.zsh_history`
  - Process accounting: `sa`, `lastcomm`
  - Audit logs: `auditd`

---

#### **networkAccess** (boolean)
**Purpose:** Security risk assessment (does app phone home?)

**Collection:**
- Check active network connections: `netstat -anb` (Windows), `lsof -i` (Unix)
- Check firewall rules
- Monitor DNS requests
- Check for hardcoded IPs/domains in app bundle

---

#### **requiresAdmin** (boolean)
**Purpose:** Privilege escalation risk assessment

**Collection:**
- **Windows:**
  - Check manifest: `requestedExecutionLevel` (requireAdministrator, highestAvailable)
  - Check UAC prompts in logs

- **macOS:**
  - Check if app requests admin via AuthorizationExecuteWithPrivileges
  - Check for SMJobBless (privileged helper tools)

- **Linux:**
  - Check setuid bit: `ls -l /usr/bin/app`
  - Check PolicyKit rules: `/usr/share/polkit-1/actions/`

---

### **6. Dependency Tracking**

#### **dependencies** (array of strings)
**Purpose:** Understand installation requirements and conflicts

**Collection:**
- **Windows:**
  - Check registry: `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Dependencies`
  - MSI database: `MsiEnumRelatedProducts`
  - Dependency Walker: Analyze DLL dependencies

- **macOS:**
  - Homebrew: `brew deps {package}`
  - Check dylib dependencies: `otool -L /Applications/App.app/Contents/MacOS/App`

- **Linux:**
  - `apt-cache depends {package}`
  - `rpm -qR {package}`

---

## 🎨 **UI/UX Benefits**

With this enhanced classification, the frontend can:

### **1. Smart Filtering**
```
View: All Applications (847)
├─ System Apps (342) - Hide by default ✅
├─ Third-Party Apps (421)
│  ├─ Approved (380)
│  └─ Unapproved (41) ⚠️ Needs review
├─ User-Installed (52)
│  └─ Unapproved (48) ⚠️ Security risk
└─ IT-Deployed (32) ✅ Compliant
```

### **2. Category Views**
```
Software by Category:
├─ Browsers (12)
│  ├─ Chrome ✅ Approved, Daily use
│  ├─ Firefox ✅ Approved, Weekly use
│  └─ Opera ⚠️ Unapproved, Never used ← Remove?
├─ Productivity (87)
├─ Development (34)
└─ Gaming (8) ⚠️ Not work-related
```

### **3. Security Dashboard**
```
Security Risks:
├─ Unsigned Applications (7) 🔴
│  └─ unknown-tool.exe (UserInstalled, Never used)
├─ Prohibited Software (2) 🔴
│  ├─ BitTorrent (File sharing - Policy violation)
│  └─ TeamViewer (Unapproved remote access)
├─ Outdated Software (23) 🟡
└─ Unused Software (94) 🟡 (>90 days, can reclaim licenses)
```

### **4. License Optimization**
```
License Recommendations:
├─ Unused Licenses (12)
│  └─ Adobe Creative Cloud ($52.99/mo) - Last used 127 days ago
├─ Duplicate Software (5)
│  └─ 3 PDF editors installed (keep Adobe, remove others)
└─ Potential Savings: $847/month
```

---

## 🔧 **Implementation Plan**

### **Phase 1: Core Classification** (2-3 days)
- Add new fields to `Application` model
- Implement classification logic (system vs third-party)
- Implement category detection
- Update agent collectors for all platforms

### **Phase 2: Security Metadata** (1-2 days)
- Digital signature verification
- Network access detection
- Admin privilege detection

### **Phase 3: Usage Tracking** (1-2 days)
- Last used timestamp
- Launch frequency calculation
- Usage minutes tracking

### **Phase 4: Dependency & Updates** (1-2 days)
- Dependency detection
- Update channel detection
- Auto-update status

### **Phase 5: Backend & Frontend** (2-3 days)
- Update backend schemas
- Add filtering and search
- Create security dashboard
- Create license optimization reports

**Total Time: 7-12 days**

---

## 📊 **Classification Examples**

### **Example 1: Google Chrome**
```json
{
  "name": "Google Chrome",
  "version": "120.0.6099.109",
  "vendor": "Google LLC",

  "classificationType": "ThirdParty",
  "category": "Browser",
  "isSystemApp": false,
  "isPreInstalled": false,

  "installMethod": "ManualInstall",
  "installScope": "AllUsers",
  "installedBy": "john.doe",
  "approvalStatus": "Approved",

  "digitalSignature": {
    "isSigned": true,
    "signedBy": "Google LLC",
    "isValidSignature": true,
    "signingAuthority": "DigiCert",
    "trustLevel": "Trusted"
  },

  "updateChannel": "Stable",
  "autoUpdateEnabled": true,
  "updateSource": "VendorWebsite",

  "launchFrequency": "Daily",
  "lastUsed": "2024-02-09T10:30:00Z",
  "avgDailyUsageMinutes": 240,
  "networkAccess": true,
  "requiresAdmin": false,

  "dependencies": ["Microsoft Visual C++ Runtime"]
}
```

### **Example 2: Windows Defender (System App)**
```json
{
  "name": "Windows Defender",
  "version": "4.18.24010.12",
  "vendor": "Microsoft Corporation",

  "classificationType": "System",
  "category": "Security",
  "isSystemApp": true,
  "isPreInstalled": true,

  "installMethod": "Bundled",
  "installScope": "System",
  "installedBy": "SYSTEM",
  "approvalStatus": "Approved",

  "digitalSignature": {
    "isSigned": true,
    "signedBy": "Microsoft Corporation",
    "isValidSignature": true,
    "signingAuthority": "Microsoft Root Certificate Authority",
    "trustLevel": "Trusted"
  },

  "updateChannel": "Stable",
  "autoUpdateEnabled": true,
  "updateSource": "WindowsUpdate"
}
```

### **Example 3: Unknown User Tool (Security Risk)**
```json
{
  "name": "remote-access-tool.exe",
  "version": "1.0.0",
  "vendor": "Unknown",

  "classificationType": "UserInstalled",
  "category": "Unknown",
  "isSystemApp": false,
  "isPreInstalled": false,

  "installMethod": "ManualInstall",
  "installScope": "CurrentUser",
  "installedBy": "john.doe",
  "approvalStatus": "Prohibited",  // ⚠️ Security team should investigate

  "digitalSignature": {
    "isSigned": false,  // 🔴 UNSIGNED
    "trustLevel": "Untrusted"
  },

  "launchFrequency": "Rarely",
  "networkAccess": true,  // 🔴 Phones home
  "requiresAdmin": true   // 🔴 Requests elevated privileges
}
```

---

## ✅ **Success Metrics**

After implementation, teams should be able to:

1. **IT Admins:**
   - ✅ Identify all unapproved software in 2 clicks
   - ✅ Find unused licenses to reclaim
   - ✅ Generate compliance reports automatically

2. **Security Teams:**
   - ✅ Detect unsigned/malicious software
   - ✅ Identify prohibited applications
   - ✅ Track privilege escalation risks

3. **Finance:**
   - ✅ Optimize license spending
   - ✅ Identify unused software
   - ✅ Forecast license renewals

4. **End Users:**
   - ✅ Transparent - see what's tracked
   - ✅ Self-service - request software approval
   - ✅ No manual surveys needed

---

**Next Steps:**
1. Review and approve this classification scheme
2. Prioritize which fields are most critical
3. Start with Phase 1 (Core Classification)
4. Iterate based on feedback

**Questions to answer:**
- Which categories matter most to your organization?
- Should we track web browser extensions separately?
- Do you need container/Docker image tracking?
- Should we track VS Code extensions, npm packages, etc.?
