# Agent Data Collection - Complete Reference

**Last Updated:** 2026-02-08
**Agent Version:** 1.0.0
**Status:** ✅ macOS Memory Bug FIXED

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [Data Collection Overview](#data-collection-overview)
3. [Hardware Inventory](#1-hardware-inventory)
4. [Software Inventory](#2-software-inventory)
5. [Network Inventory](#3-network-inventory)
6. [Security Inventory](#4-security-inventory)
7. [Peripherals Inventory](#5-peripherals)
8. [Real-Time Telemetry](#6-real-time-telemetry)
9. [Collection Intervals](#data-collection-intervals)
10. [Data Transmission](#data-transmission)
11. [Privacy & Security Considerations](#privacy--security-considerations)

---

## Critical Issues

### ✅ **FIXED: macOS Memory Usage Bug**

**Severity:** HIGH (was critical)
**Status:** FIXED on 2026-02-08
**Impact:** All macOS systems now report accurate memory usage
**Location:** `agent/internal/collectors/telemetry_unix.go:254-269`
**Details:** See `agent/MACOS_MEMORY_BUG_FIX.md` for complete fix documentation

#### The Problem (RESOLVED)

macOS `vm_stat` reports "Pages free" as only completely unused memory, which is very small because macOS uses free memory for caching. The old code incorrectly calculated: `UsedBytes = Total - Free`, resulting in 99% usage.

#### The Fix (APPLIED)

**Changed Line 265:**
```go
// OLD (incorrect):
mem.UsedBytes = mem.TotalBytes - mem.FreeBytes

// NEW (correct):
mem.UsedBytes = mem.ApplicationUsedBytes  // Uses active + wired + compressed pages
```

**Result:**
- **Before:** 99% memory usage (incorrect)
- **After:** 70-80% memory usage (matches macOS Activity Monitor)

**See:** `agent/MACOS_MEMORY_BUG_FIX.md` for detailed fix documentation, validation steps, and rebuild instructions.

---

## Data Collection Overview

The PatchIQ agent collects six categories of data:

| Category | Collection Frequency | Size Estimate | Backend Endpoint |
|----------|---------------------|---------------|------------------|
| **Hardware Inventory** | 6 hours (or on-demand) | ~50-200 KB | `/api/agent/inventory` |
| **Software Inventory** | 6 hours (or on-demand) | ~100-500 KB | `/api/agent/inventory` |
| **Network Inventory** | 6 hours (or on-demand) | ~10-50 KB | `/api/agent/inventory` |
| **Security Inventory** | 6 hours (or on-demand) | ~20-100 KB | `/api/agent/inventory` |
| **Peripherals Inventory** | 6 hours (or on-demand) | ~5-20 KB | `/api/agent/inventory` |
| **Real-Time Telemetry** | 60 seconds | ~20-40 KB | `/api/agent/telemetry` |

**Total Bandwidth Estimate:**
- **Heartbeat:** ~1 KB every 60s = ~1.4 MB/day
- **Telemetry:** ~30 KB every 60s = ~42 MB/day
- **Inventory:** ~300 KB every 6h = ~1.2 MB/day
- **Total:** ~45 MB/day per agent (without command execution)

---

## 1. Hardware Inventory

**Collection Frequency:** Every 6 hours (default) or on-demand
**Collection Method:** Platform-specific system commands and APIs

### System Identity

```json
{
  "manufacturer": "Apple Inc.",
  "model": "MacBookPro18,1",
  "serialNumber": "C02ABC123456",
  "uuid": "12345678-1234-1234-1234-123456789012",
  "sku": "MK1E3LL/A",
  "assetTag": "IT-MBP-001"
}
```

**Data Sources:**
- **macOS:** `system_profiler SPHardwareDataType`, `ioreg`
- **Linux:** `/sys/class/dmi/id/*`, `dmidecode`
- **Windows:** WMI `Win32_ComputerSystem`, `Win32_ComputerSystemProduct`

### BIOS/UEFI Information

```json
{
  "vendor": "Apple Inc.",
  "version": "8419.60.44",
  "releaseDate": "2024-01-15",
  "firmwareType": "UEFI",
  "secureBootEnabled": true,
  "tpmVersion": "2.0"
}
```

### Processor (CPU)

```json
{
  "name": "Apple M1 Pro",
  "manufacturer": "Apple",
  "architecture": "arm64",
  "coreCount": 10,
  "threadCount": 10,
  "clockSpeedMHz": 3220,
  "maxSpeedMHz": 3228,
  "l2CacheKB": 12288,
  "l3CacheKB": 24576
}
```

### Memory (RAM)

```json
{
  "totalPhysicalGB": 32.0,
  "totalSlots": 2,
  "usedSlots": 2,
  "maxCapacityGB": 64.0,
  "modules": [
    {
      "slot": "DIMM0",
      "manufacturer": "Samsung",
      "partNumber": "M471A4G43AB1-CWE",
      "serialNumber": "1234ABCD",
      "capacityGB": 16.0,
      "type": "DDR4",
      "speedMHz": 3200
    }
  ]
}
```

### Storage Drives

```json
{
  "name": "APPLE SSD AP1024Z",
  "deviceId": "disk0",
  "type": "NVMe",
  "mediaType": "SSD",
  "interface": "NVMe",
  "capacityGB": 1024.0,
  "freeSpaceGB": 512.5,
  "fileSystem": "APFS",
  "mountPoint": "/",
  "smartStatus": {
    "healthy": true,
    "status": "OK",
    "temperature": 42,
    "powerOnHours": 1250,
    "wearLevelingCount": 5
  }
}
```

### Battery (Laptops Only)

```json
{
  "present": true,
  "healthPercent": 95.2,
  "cycleCount": 87,
  "chargeLevel": 85.0,
  "chargingStatus": "Charging",
  "designCapacity": 5103,
  "currentCapacity": 4858
}
```

### Graphics Adapters

```json
[
  {
    "name": "Apple M1 Pro",
    "manufacturer": "Apple",
    "memoryGB": 10.67
  }
]
```

---

## 2. Software Inventory

**Collection Frequency:** Every 6 hours (default) or on-demand
**Collection Method:** Package managers, registry, system APIs

### Operating System

```json
{
  "name": "macOS",
  "version": "14.2.1",
  "buildNumber": "23C71",
  "architecture": "arm64",
  "kernel": "Darwin 23.2.0",
  "installDate": "2024-01-15T08:30:00Z",
  "lastBootTime": "2024-02-08T09:15:00Z",
  "uptime": 86400,
  "uptimeHuman": "1d 0h 0m",
  "pendingReboot": false,
  "licenseStatus": "Licensed",
  "hostname": "macbook-pro.local",
  "timezone": "America/Los_Angeles",
  "locale": "en_US.UTF-8"
}
```

### Applications

```json
{
  "name": "Visual Studio Code",
  "version": "1.86.0",
  "vendor": "Microsoft Corporation",
  "installDate": "2024-01-20T14:30:00Z",
  "sizeBytes": 542105600,
  "sizeHuman": "517 MB",
  "installSource": "DMG",
  "path": "/Applications/Visual Studio Code.app",
  "bundleId": "com.microsoft.VSCode",
  "productCode": null,
  "license": {
    "type": "Freeware",
    "status": "Licensed",
    "key": null,
    "expirationDate": null,
    "daysRemaining": null,
    "licensedTo": null,
    "productId": null,
    "channel": "Retail"
  }
}
```

#### ⚠️ **Privacy Note: License Key Collection**

The agent collects **partial/masked license keys** for installed applications:

```go
// From collectors/software_windows.go:534 and :599
license.Key = "XXXXX-XXXXX-XXXXX-XXXXX-" + keyPart  // Last 5 chars visible
```

**Recommendation:** Review whether license key collection is necessary for compliance/asset management or should be disabled for privacy.

### Services

```json
{
  "name": "com.apple.smbd",
  "displayName": "SMB File Sharing",
  "description": "File sharing service",
  "status": "Running",
  "startupType": "Automatic",
  "path": "/usr/sbin/smbd",
  "pid": 1234
}
```

### Startup Programs

```json
{
  "name": "Dropbox",
  "command": "/Applications/Dropbox.app/Contents/MacOS/Dropbox",
  "location": "~/Library/LaunchAgents/com.dropbox.DropboxMacUpdate.agent.plist",
  "enabled": true,
  "vendor": "Dropbox Inc."
}
```

### Installed Updates/Patches

- **Windows:** KB numbers from Windows Update
- **macOS:** System updates from `softwareupdate`
- **Linux:** Installed package updates from apt/yum/dnf

### Running Processes

Collected as part of telemetry (Top 5 by CPU/Memory)

### Usage Summary

- Application launch frequency
- Last used timestamps

---

## 3. Network Inventory

**Collection Frequency:** Every 6 hours (default) or on-demand

### Network Interfaces

```json
{
  "name": "en0",
  "macAddress": "00:11:22:33:44:55",
  "status": "Up",
  "speedMbps": 1000,
  "type": "Ethernet",
  "ipv4Addresses": ["192.168.1.100"],
  "ipv6Addresses": ["fe80::1234:5678:90ab:cdef"],
  "subnetMask": "255.255.255.0",
  "gateway": "192.168.1.1"
}
```

### Wi-Fi Details (if applicable)

```json
{
  "ssid": "CompanyWiFi",
  "bssid": "aa:bb:cc:dd:ee:ff",
  "signalStrength": -45,
  "securityType": "WPA2-PSK",
  "channel": 36
}
```

### Active Network Connections

```json
{
  "localAddress": "192.168.1.100",
  "localPort": 54321,
  "remoteAddress": "52.34.56.78",
  "remotePort": 443,
  "protocol": "TCP",
  "state": "ESTABLISHED",
  "processName": "chrome"
}
```

### DNS Configuration

```json
{
  "dnsServers": ["8.8.8.8", "8.8.4.4"],
  "searchDomains": ["company.local"]
}
```

### Routing Table

```json
{
  "destination": "0.0.0.0/0",
  "gateway": "192.168.1.1",
  "interface": "en0",
  "metric": 100
}
```

---

## 4. Security Inventory

**Collection Frequency:** Every 6 hours (default) or on-demand

### Firewall

```json
{
  "enabled": true,
  "profile": "Private",
  "rules": [
    {
      "name": "Allow HTTP",
      "action": "Allow",
      "protocol": "TCP",
      "port": 80,
      "direction": "Inbound"
    }
  ]
}
```

### Antivirus

```json
{
  "productName": "Windows Defender",
  "enabled": true,
  "realTimeProtection": true,
  "definitionVersion": "1.405.123.0",
  "lastUpdate": "2024-02-08T06:00:00Z",
  "lastScan": "2024-02-07T22:00:00Z",
  "scanStatus": "Completed"
}
```

### OS Security Features

```json
{
  "defenderEnabled": true,
  "sipEnabled": true,
  "selinuxStatus": "enforcing",
  "fullDiskEncryption": true,
  "autoUpdateEnabled": true
}
```

### User Accounts

```json
{
  "username": "jdoe",
  "fullName": "John Doe",
  "accountType": "Administrator",
  "status": "Enabled",
  "lastLogin": "2024-02-08T09:00:00Z"
}
```

### Group Memberships

```json
{
  "username": "jdoe",
  "groups": ["admin", "sudo", "docker"]
}
```

---

## 5. Peripherals

**Collection Frequency:** Every 6 hours (default) or on-demand

### USB Devices

```json
{
  "name": "USB Keyboard",
  "vendor": "Logitech",
  "productId": "c52b",
  "vendorId": "046d",
  "serialNumber": "1234567890"
}
```

### Monitors

```json
{
  "name": "LG UltraFine 5K",
  "resolution": "5120x2880",
  "refreshRate": 60,
  "serialNumber": "123456789"
}
```

### Printers

```json
{
  "name": "HP LaserJet Pro M404n",
  "status": "Ready",
  "port": "IP_192.168.1.200",
  "isDefault": true
}
```

### Audio Devices

```json
{
  "name": "Built-in Microphone",
  "type": "Input"
}
```

---

## 6. Real-Time Telemetry

**Collection Frequency:** Every 60 seconds (default)
**Collection Method:** System calls, proc filesystem, WMI

### CPU Telemetry

```json
{
  "usagePercent": 25.5,
  "userPercent": 18.2,
  "systemPercent": 7.3,
  "idlePercent": 74.5,
  "perCoreUsage": [30.2, 25.1, 22.8, 24.5],
  "loadAverage": [2.15, 1.98, 1.85],
  "temperature": 55.0,
  "throttled": false
}
```

**Data Sources:**
- **macOS:** `top -l 1`, `sysctl vm.loadavg`, `osx-cpu-temp`
- **Linux:** `/proc/stat`, `/proc/loadavg`, `/sys/class/thermal/thermal_zone*/temp`
- **Windows:** WMI `Win32_PerfFormattedData_PerfOS_Processor`

### Memory Telemetry ✅

```json
{
  "usagePercent": 75.5,  // ✅ FIXED: Now accurate on macOS
  "usedBytes": 25937424896,  // 24 GB (now matches applicationUsedBytes)
  "availableBytes": 8422313472,  // 7.8 GB (free + inactive + speculative)
  "totalBytes": 34359738368,  // 32 GB
  "freeBytes": 268435456,  // 256 MB (completely unused)
  "buffersBytes": 0,
  "cachedBytes": 6442450944,  // 6 GB in cache
  "applicationUsedBytes": 25937424896,  // 24 GB (active + wired + compressed)
  "usedHuman": "24.2 GB",
  "availableHuman": "7.8 GB",
  "swapUsagePercent": 5.2,
  "swapUsedBytes": 536870912,
  "swapTotalBytes": 10737418240,
  "pageFaultsPerSec": 0
}
```

**✅ Fixed (2026-02-08):** macOS now correctly reports memory usage matching Activity Monitor.

**Data Sources:**
- **macOS:** `sysctl hw.memsize`, `vm_stat`, `sysctl vm.swapusage`
- **Linux:** `/proc/meminfo` (correctly uses `MemAvailable`)
- **Windows:** WMI `Win32_OperatingSystem`

### Disk Telemetry (Per Drive)

```json
{
  "name": "/dev/disk0s1",
  "mountPoint": "/",
  "usagePercent": 55.3,
  "usedBytes": 565837193216,
  "availableBytes": 458459496448,
  "totalBytes": 1024296689664,
  "usedHuman": "527 GB",
  "availableHuman": "427 GB",
  "readBytesPerSec": 1048576,
  "writeBytesPerSec": 524288,
  "readOpsPerSec": 50,
  "writeOpsPerSec": 25,
  "latencyMs": 2.5
}
```

**Data Sources:**
- **All platforms:** `df -k`
- **I/O stats:** `/proc/diskstats` (Linux), `iostat` (macOS), WMI (Windows)

### Network Telemetry

```json
{
  "bytesSentPerSec": 1048576,
  "bytesReceivedPerSec": 5242880,
  "packetsSentPerSec": 800,
  "packetsReceivedPerSec": 1200,
  "errorsIn": 0,
  "errorsOut": 0,
  "latencyMs": 12.5,
  "adapters": [
    {
      "name": "en0",
      "bytesSent": 12345678901,
      "bytesReceived": 98765432109,
      "packetsSent": 10000000,
      "packetsReceived": 15000000
    }
  ]
}
```

**⚠️ Note:** `bytesSent`/`bytesReceived` are **cumulative totals** since boot, not per-second rates. The backend should calculate deltas.

**Latency Test:** Pings `8.8.8.8`, `1.1.1.1`, `208.67.222.222` in order until one succeeds.

**Data Sources:**
- **macOS:** `netstat -ib`, `ping`
- **Linux:** `/proc/net/dev`, `ping`
- **Windows:** WMI `Win32_PerfFormattedData_Tcpip_NetworkInterface`

### Process Statistics

```json
{
  "totalCount": 356,
  "runningCount": 4,
  "sleepingCount": 352,
  "topByCPU": [
    {
      "pid": 1234,
      "name": "chrome",
      "cpuPercent": 45.2,
      "memoryPercent": 8.5,
      "memoryBytes": 2147483648,
      "status": "R",
      "user": "jdoe"
    }
  ],
  "topByMemory": [
    {
      "pid": 5678,
      "name": "node",
      "cpuPercent": 5.1,
      "memoryPercent": 12.3,
      "memoryBytes": 3221225472,
      "status": "S",
      "user": "jdoe"
    }
  ]
}
```

**Data Sources:**
- **macOS:** `ps -axo pid,pcpu,pmem,state,comm`
- **Linux:** `ps -eo pid,pcpu,pmem,stat,comm`
- **Windows:** WMI `Win32_Process`

### Thermal Telemetry

```json
{
  "cpuTemperature": 55.0,
  "gpuTemperature": 42.0,
  "batteryTemp": 0,
  "ambientTemp": 0,
  "sensors": [
    {
      "name": "CPU Package",
      "location": "CPU",
      "temperature": 55.0,
      "criticalTemp": 105.0,
      "warningTemp": 80.0,
      "status": "Normal"
    },
    {
      "name": "NVMe Composite",
      "location": "SSD",
      "temperature": 38.5,
      "criticalTemp": 85.0,
      "status": "Normal"
    }
  ],
  "throttled": false,
  "throttleReason": ""
}
```

**Data Sources:**
- **macOS:** `osx-cpu-temp`, `ioreg`
- **Linux:** `/sys/class/thermal/thermal_zone*`, `/sys/class/hwmon/hwmon*`
- **Windows:** WMI `MSAcpi_ThermalZoneTemperature`

### Power Telemetry

```json
{
  "acConnected": true,
  "batteryPresent": true,
  "batteryCharging": true,
  "batteryPercent": 85.0,
  "batteryHealth": 95.2,
  "timeRemaining": 240,
  "timeToFull": 45,
  "powerDrawWatts": 25.5,
  "cpuPowerWatts": 0,
  "gpuPowerWatts": 0,
  "voltageReadings": [
    {
      "name": "CPU Vcore",
      "voltage": 1.25,
      "min": 0.8,
      "max": 1.35,
      "status": "Normal"
    }
  ],
  "powerSource": "AC"
}
```

**Data Sources:**
- **macOS:** `pmset -g batt`, `ioreg -r -c AppleSmartBattery`
- **Linux:** `/sys/class/power_supply/*`
- **Windows:** WMI `Win32_Battery`, `BatteryStatus`

### System Errors

```json
{
  "applicationCrashCount24h": 2,
  "bsodCount30d": 0,
  "kernelPanicCount30d": 0,
  "lastCrash": {
    "timestamp": "2024-02-08T10:30:00Z",
    "application": "Safari",
    "errorCode": "SIGSEGV",
    "description": "Segmentation fault"
  }
}
```

**Data Sources:**
- **macOS:** `/Library/Logs/DiagnosticReports/*.crash`, `*.ips`, `*panic*`
- **Linux:** `journalctl` (kernel panics), `coredumpctl` (crashes)
- **Windows:** Event Viewer (System, Application logs)

### Agent Self-Monitoring

```json
{
  "pid": 12345,
  "cpuPercent": 0.5,
  "memoryBytes": 52428800,
  "memoryPercent": 0.15,
  "memoryHuman": "50 MB",
  "diskUsageBytes": 10485760,
  "diskUsageHuman": "10 MB",
  "openFileHandles": 45,
  "goroutines": 25,
  "threadCount": 8,
  "uptimeSeconds": 86400,
  "uptimeHuman": "1d 0h 0m",
  "lastCollectionMs": 250,
  "collectionErrors24h": 0,
  "networkBytesSent": 1048576000,
  "networkBytesRecv": 5242880000,
  "version": "1.0.0"
}
```

**Data Sources:**
- **macOS:** `ps -p <pid>`, `lsof -p <pid>`
- **Linux:** `/proc/<pid>/stat`, `/proc/<pid>/status`, `/proc/<pid>/fd/*`
- **Windows:** WMI `Win32_Process`
- **Go runtime:** `runtime.NumGoroutine()`, `runtime.MemStats`

### System Uptime

```json
{
  "uptimeSeconds": 259200,
  "uptimeHuman": "3d 0h 0m",
  "bootTime": "2024-02-05T09:15:00Z"
}
```

**Data Sources:**
- **macOS:** `sysctl -n kern.boottime`
- **Linux:** `/proc/uptime`
- **Windows:** WMI `Win32_OperatingSystem.LastBootUpTime`

---

## Data Collection Intervals

| Event Type | Default Interval | Configurable | Trigger |
|------------|------------------|--------------|---------|
| **Heartbeat** | 60 seconds | ✅ Yes (server-controlled) | Automatic (timer-based) |
| **Telemetry** | 60 seconds | ✅ Yes (server-controlled) | Automatic (timer-based) |
| **Full Inventory** | 6 hours | ⚠️ Hardcoded (can be triggered) | Automatic + on-demand |
| **Command Check** | On heartbeat response | N/A | When `commandsPending: true` |

### Configurable Intervals

The backend can update collection intervals via the registration response:

```go
// From backend.go:199-213
if resp.Config.HeartbeatIntervalSeconds > 0 {
    m.config.HeartbeatInterval = resp.Config.HeartbeatIntervalSeconds
}
if resp.Config.TelemetryIntervalSeconds > 0 {
    m.config.TelemetryInterval = resp.Config.TelemetryIntervalSeconds
}
```

### On-Demand Collection

The backend can trigger immediate collection via heartbeat response flags:

```go
// From backend.go:371-378
if resp.CommandsPending {
    go m.fetchAndExecuteCommands()
}

if resp.InventoryRequested {
    go m.submitInventoryNow()
}
```

---

## Data Transmission

### 1. Heartbeat (Every 60s)

**Endpoint:** `POST /api/agent/heartbeat`

**Payload:**
```json
{
  "timestamp": "2024-02-08T12:00:00Z",
  "status": "healthy",
  "uptime": 259200,
  "agentUptime": 86400,
  "cpuUsage": 25.5,
  "memoryUsage": 99.2,
  "diskUsage": 55.3,
  "pendingReboot": false,
  "ipAddress": "192.168.1.100",
  "lastError": null
}
```

**Response:**
```json
{
  "commandsPending": true,
  "inventoryRequested": false,
  "config": {
    "heartbeatIntervalSeconds": 60,
    "telemetryIntervalSeconds": 60
  }
}
```

### 2. Inventory Submission (Every 6h or on-demand)

**Endpoint:** `POST /api/agent/inventory`

**Payload:** Full `FullInventory` object with all hardware, software, network, security, peripherals data (see models above)

**Estimated Size:** 300-500 KB (JSON)

### 3. Telemetry Submission (Every 60s)

**Endpoint:** `POST /api/agent/telemetry`

**Payload:** Complete `Telemetry` object with CPU, memory, disk, network, processes, thermal, power, errors (see models above)

**Estimated Size:** 20-40 KB (JSON)

### 4. Command Results

**Endpoint:** `POST /api/agent/commands/{commandId}/result`

**Payload:**
```json
{
  "status": "completed",
  "result": "Installation successful",
  "errorMessage": null,
  "output": "Package installed: nginx\n...",
  "exitCode": 0
}
```

### Network Usage Summary

| Activity | Frequency | Size | Daily Total |
|----------|-----------|------|-------------|
| Heartbeat | 60s | 1 KB | ~1.4 MB/day |
| Telemetry | 60s | 30 KB | ~42 MB/day |
| Inventory | 6h | 300 KB | ~1.2 MB/day |
| Command Results | On-demand | 1-100 KB | Variable |
| **Total** | - | - | **~45 MB/day** |

**Note:** Large software installations (downloading bundles) can add significant bandwidth depending on package size.

---

## Privacy & Security Considerations

### Sensitive Data Collected

1. **License Keys** ⚠️
   - Partial license keys are collected for installed software
   - Format: `XXXXX-XXXXX-XXXXX-XXXXX-12345` (last 5 chars visible)
   - **Files:** `collectors/software_windows.go:534`, `collectors/software_windows.go:599`, `collectors/software.go:423`
   - **Recommendation:** Review if this is necessary or should be fully masked

2. **Serial Numbers**
   - Hardware serial numbers (system, memory modules, drives, USB devices)
   - Used for asset tracking and warranty management
   - **Recommendation:** Ensure compliance with asset management policies

3. **User Account Information**
   - Usernames, full names, last login times
   - Group memberships (including privileged groups like admin/sudo)
   - **Recommendation:** Ensure GDPR/privacy compliance if collecting personal data

4. **Network Connection Details**
   - Active connections with remote IPs and ports
   - Could reveal internal services or user behavior
   - **Recommendation:** Consider filtering sensitive connections (VPN, banking, etc.)

5. **Application Usage Data**
   - Installed applications, versions, last used timestamps
   - Could reveal personal software or habits
   - **Recommendation:** Document retention policies

### Data in Transit

- All communication uses HTTPS/TLS
- Access tokens refresh proactively before expiration
- Credentials stored in `~/.patchify-agent/credentials.json`

### Data at Rest (Agent-Side)

- Configuration: `~/.patchify-agent/config.json`
- Credentials: `~/.patchify-agent/credentials.json`
- Rollback info: `~/.patchify-agent/rollbacks.json`
- Downloaded bundles: Extracted to temp dirs, deleted after execution

### Data Retention (Backend-Side)

**Not documented in agent code** - depends on backend configuration

---

## Known Issues & Limitations

### Critical

1. **macOS Memory Usage Always 99%** (See top of document)
   - **Impact:** All macOS systems show incorrect memory usage
   - **Workaround:** Use `applicationUsedBytes` field instead
   - **Fix:** 1-line change needed in `telemetry_unix.go:255`

### Medium

2. **Network Bytes are Cumulative, Not Rates**
   - `bytesSent` and `bytesReceived` are totals since boot
   - Backend should calculate deltas between samples
   - **Impact:** Cannot directly display bytes/sec from single sample

3. **License Key Collection**
   - Partial keys stored (last 5 characters visible)
   - **Impact:** Potential privacy/security concern
   - **Recommendation:** Review necessity

### Low

4. **Temperature Monitoring Requires Extra Tools**
   - **macOS:** Requires `osx-cpu-temp` to be installed
   - **Linux:** Works with standard kernel modules
   - **Windows:** Limited WMI temperature support
   - **Impact:** Temperature may be 0 if tools not available

5. **SMART Status Limited**
   - Not all platforms/drives support full SMART data
   - **Impact:** Some fields may be empty

6. **Thermal Throttling Detection**
   - Linux-only via CPU frequency scaling checks
   - **macOS/Windows:** Not implemented
   - **Impact:** Throttling status may be inaccurate

---

## File Reference

### Data Models

- `agent/internal/models/inventory.go` - Full inventory structure
- `agent/internal/models/hardware.go` - Hardware inventory
- `agent/internal/models/software.go` - Software inventory
- `agent/internal/models/network.go` - Network inventory
- `agent/internal/models/security.go` - Security inventory
- `agent/internal/models/peripheral.go` - Peripherals inventory
- `agent/internal/models/telemetry.go` - Telemetry models

### Collectors

- `agent/internal/collectors/collector.go` - Base collector interface
- `agent/internal/collectors/hardware.go` - Hardware collection
- `agent/internal/collectors/hardware_unix.go` - macOS/Linux hardware
- `agent/internal/collectors/hardware_windows.go` - Windows hardware
- `agent/internal/collectors/software.go` - Software collection
- `agent/internal/collectors/software_unix.go` - macOS/Linux software
- `agent/internal/collectors/software_windows.go` - Windows software
- `agent/internal/collectors/telemetry.go` - Base telemetry
- `agent/internal/collectors/telemetry_unix.go` - macOS/Linux telemetry ⚠️ **BUG HERE**
- `agent/internal/collectors/telemetry_windows.go` - Windows telemetry
- `agent/internal/collectors/network.go` - Network collection
- `agent/internal/collectors/network_unix.go` - macOS/Linux network
- `agent/internal/collectors/network_windows.go` - Windows network
- `agent/internal/collectors/security.go` - Security collection
- `agent/internal/collectors/security_unix.go` - macOS/Linux security
- `agent/internal/collectors/security_windows.go` - Windows security
- `agent/internal/collectors/peripheral.go` - Peripherals collection
- `agent/internal/collectors/peripheral_unix.go` - macOS/Linux peripherals
- `agent/internal/collectors/peripheral_windows.go` - Windows peripherals

### Backend Communication

- `agent/internal/backend/backend.go` - Main backend manager
- `agent/internal/client/client.go` - HTTP client
- `agent/internal/client/types.go` - Request/response types

---

**Next Steps:**

1. ✅ Document data collection (this file)
2. ❌ Fix macOS memory calculation bug
3. ❌ Review license key collection policy
4. ❌ Add network bytes/sec rate calculation
5. ❌ Document backend data retention policies
