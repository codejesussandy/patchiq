# Agent Improvements Implementation Plan

**Last Updated:** 2026-02-09
**Status:** Ready for Implementation
**Estimated Total Time:** 6-9 days (Core) + 1-2 weeks (Software Classification)

---

## 🎯 **Scope**

This plan covers critical agent improvements, **EXCLUDING**:
- ❌ Privacy/data collection review (separate task)
- ❌ HTTPS enforcement (separate task)

**INCLUDED:**
- ✅ Real-time agent status detection (fix "always Connected" bug)
- ✅ HTTP proxy support (corporate networks)
- ✅ Bandwidth throttling & download resume
- ✅ Windows Service native support
- ✅ **Zero-Config Installers** for all platforms (Windows/macOS/Linux)
- ✅ **Enhanced Software Classification** (distinguish system/third-party/user apps)
- ✅ Configurable inventory interval
- ✅ Improved error reporting

---

## 🚀 **Zero-Configuration Deployment Goal**

**Current State:**
```
User downloads agent binary
→ Manually copy to /opt/ or C:\Program Files
→ Create systemd/launchd/Windows Service manually
→ Edit config file with server URL
→ Start service manually
→ Check logs to verify it works
```

**Target State:**
```
Windows: Double-click PatchIQAgent.msi → Done ✅
macOS:   Double-click PatchIQAgent.pkg → Done ✅
Linux:   sudo apt install ./patchiq-agent.deb → Done ✅

- Agent installed ✅
- Service created ✅
- Service started ✅
- Registers with server automatically ✅
- No configuration needed ✅
```

**User Experience:**
1. Download installer for your platform
2. Run installer
3. Done - agent is working

**Optional Configuration:**
- Server URL can be embedded at build time
- OR prompted during installation
- OR configured via central management later

---

## 📋 **Task Overview**

| Phase | Tasks | Priority | Time | Dependencies |
|-------|-------|----------|------|--------------|
| **Phase 1** | Real-time Agent Status | **CRITICAL** | 4-6h | None |
| **Phase 2** | HTTP Proxy Support | **HIGH** | 4-6h | None |
| **Phase 3** | Bandwidth Throttling | **MEDIUM** | 6-8h | None |
| **Phase 4** | Windows Service | **MEDIUM** | 1-2d | None |
| **Phase 5** | Professional Installers | **MEDIUM** | 2-3d | Phase 4 |
| **Phase 6** | Polish & Testing | **LOW** | 1d | All phases |
| **Phase 7** | Software Classification | **MEDIUM** | 1-2w | None (parallel) |

---

## 🔴 **PHASE 1: Real-time Agent Status Detection**

### **Problem**
Asset Details page always shows "Connected" even when agent is offline. The backend sets `status: 'Connected'` on every heartbeat but never sets it to `Disconnected` when heartbeats stop.

**Current behavior:**
```typescript
// Agent sends heartbeat every 60s
// Backend updates: status = 'Connected', lastHeartbeat = NOW

// Agent goes offline (crashes, network down, etc.)
// Backend never updates status (still shows 'Connected')
// lastHeartbeat gets stale but status never changes
```

### **Solution**
Implement real-time status calculation based on `lastHeartbeat` age.

---

#### **Task 1.1: Add Status Calculation Logic (Backend)**

**Priority:** CRITICAL
**Time:** 1 hour
**Files:** `backend/src/modules/agents/agents.service.ts`

**Implementation:**

```typescript
// Add helper function to calculate real-time status
function calculateAgentStatus(agent: { lastHeartbeat: Date | null; status: string }): string {
  if (!agent.lastHeartbeat) {
    return 'Disconnected';
  }

  const now = new Date();
  const lastHeartbeatTime = new Date(agent.lastHeartbeat);
  const timeSinceHeartbeat = (now.getTime() - lastHeartbeatTime.getTime()) / 1000; // seconds

  // Agent heartbeats every 60s, consider offline after 3 minutes (3 missed heartbeats)
  const OFFLINE_THRESHOLD = 180; // 3 minutes

  if (timeSinceHeartbeat > OFFLINE_THRESHOLD) {
    return 'Disconnected';
  }

  // If database status is 'Error', respect that
  if (agent.status === 'Error') {
    return 'Error';
  }

  return 'Connected';
}
```

**Changes needed:**

1. Update `listAgents()` method around line 254:
```typescript
// After line 269
const agents = allAgents.map((agent) => ({
  id: agent.id,
  name: agent.name,
  agentId: agent.agentId,
  hostname: agent.hostname,
  os: agent.os,
  osVersion: agent.osVersion,
  architecture: agent.architecture,
  ipAddress: agent.ipAddress,
  version: agent.version,
  status: calculateAgentStatus(agent), // ← Add real-time calculation
  lastHeartbeat: agent.lastHeartbeat?.toISOString() ?? null,
  lastHeartbeatRelative: agent.lastHeartbeat
    ? getRelativeTime(agent.lastHeartbeat)
    : null,
  // ... rest of fields
}));
```

2. Update `getAgent()` method around line 311:
```typescript
return {
  id: agent.id,
  name: agent.name,
  // ... other fields
  status: calculateAgentStatus(agent), // ← Add real-time calculation
  lastHeartbeat: agent.lastHeartbeat?.toISOString() ?? null,
  // ... rest of fields
};
```

3. Update `getAgentDetails()` method around line 401:
```typescript
return {
  id: finalAgent!.id,
  // ... other fields
  status: calculateAgentStatus(finalAgent!), // ← Add real-time calculation
  lastHeartbeat: finalAgent!.lastHeartbeat?.toISOString() ?? null,
  // ... rest of fields
};
```

**Testing:**
```bash
# Test 1: Start agent, check status shows "Connected"
curl http://localhost:3000/api/agents

# Test 2: Stop agent, wait 3 minutes, check status shows "Disconnected"
# (no need to restart backend, status is calculated on-demand)

# Test 3: Frontend - Asset Details should now show correct status
```

---

#### **Task 1.2: Update Assets Transformer (Backend)**

**Priority:** CRITICAL
**Time:** 30 minutes
**Files:** `backend/src/modules/assets/assets.transformer.ts`

**Changes needed:**

```typescript
// Around line 256, update isConnected calculation
const isConnected = calculateAgentStatus(dbRecord.agent!) === 'Connected';
```

**Import the helper:**
```typescript
// At top of file
import { calculateAgentStatus } from '../agents/agents.service';

// OR better: move to shared utility
// src/shared/utils/agent-status.ts
export function calculateAgentStatus(agent: { lastHeartbeat: Date | null; status: string }): string {
  // ... (same implementation as above)
}
```

---

#### **Task 1.3: Real-time Status in Frontend**

**Priority:** HIGH
**Time:** 2 hours
**Files:** `frontend/src/pages/assets/components/AssetDetails.tsx`

**Current issue:** Frontend fetches asset once and never updates status

**Solution:** Add polling for agent status or use the existing telemetry polling

**Implementation:**

```typescript
// Around line 88, add agent status polling
const [agentStatus, setAgentStatus] = useState<'Connected' | 'Disconnected' | 'Error'>('Disconnected');

// Add new fetch function
const fetchAgentStatus = async () => {
  if (!asset?.agent?.id) return;

  try {
    const response = await fetch(`/api/agents/${asset.agent.id}`);
    if (response.ok) {
      const agentData = await response.json();
      setAgentStatus(agentData.status);
    }
  } catch (error) {
    console.error('Failed to fetch agent status:', error);
  }
};

// Update useEffect to poll agent status
useEffect(() => {
  if (!asset?.agent?.id) return;

  // Fetch immediately
  fetchAgentStatus();

  // Then poll every 30 seconds (same as telemetry)
  const interval = setInterval(fetchAgentStatus, 30000);

  return () => clearInterval(interval);
}, [asset?.agent?.id]);

// Update the UI around line 2364
<div
  style={{
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: agentStatus === 'Connected' ? '#52c41a' : '#ff4d4f',
    display: 'inline-block',
  }}
/>
<span>Agent Status</span>
<Tag color={agentStatus === 'Connected' ? 'green' : 'red'}>
  {agentStatus}
</Tag>
```

**Better alternative:** Use existing telemetry polling

```typescript
// The component already polls telemetry every 30s
// Fetch agent status alongside telemetry

const fetchTelemetry = async () => {
  // ... existing telemetry fetch code ...

  // Also fetch agent status
  if (asset?.agent?.id) {
    try {
      const agentResponse = await fetch(`/api/agents/${asset.agent.id}`);
      if (agentResponse.ok) {
        const agentData = await agentResponse.json();
        // Update asset state with new agent status
        setAsset(prev => prev ? {
          ...prev,
          agent: {
            ...prev.agent!,
            status: agentData.status,
          }
        } : null);
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    }
  }
};
```

---

#### **Task 1.4: Add Visual Indicator for Last Seen**

**Priority:** LOW
**Time:** 1 hour
**Files:** `frontend/src/pages/assets/components/AssetDetails.tsx`

**Enhancement:** Show "Last seen: 2 minutes ago" next to status

```typescript
// Around line 2370, enhance the agent status display
<Space direction="vertical" size="small">
  <Space>
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: asset.agent.status === 'Connected' ? '#52c41a' : '#ff4d4f',
        display: 'inline-block',
      }}
    />
    <span>Agent Status</span>
    <Tag color={asset.agent.status === 'Connected' ? 'green' : 'red'}>
      {asset.agent.status}
    </Tag>
  </Space>

  {/* Add last seen */}
  {asset.agent.lastHeartbeat && (
    <Text type="secondary" style={{ fontSize: 12 }}>
      Last seen: {asset.agent.lastHeartbeatRelative || 'unknown'}
    </Text>
  )}
</Space>
```

---

### **Phase 1 Testing Checklist**

- [ ] Backend calculates status based on lastHeartbeat age
- [ ] Status shows "Connected" when agent sends heartbeats
- [ ] Status shows "Disconnected" after 3 minutes of no heartbeat
- [ ] Frontend updates status every 30 seconds
- [ ] Asset Details page shows correct real-time status
- [ ] "Last seen" timestamp displays correctly
- [ ] Status persists across page refreshes
- [ ] Multiple assets show correct individual statuses

---

## 🌐 **PHASE 2: HTTP Proxy Support**

### **Problem**
Agent cannot connect through corporate HTTP proxies. 80% of enterprises require proxy for outbound connections.

**Impact:** Cannot deploy in most corporate networks.

---

#### **Task 2.1: Add Proxy Configuration Options**

**Priority:** HIGH
**Time:** 1 hour
**Files:**
- `agent/internal/config/config.go`
- `agent/cmd/agent/main.go`

**Implementation:**

```go
// config/config.go - Add proxy fields to Config struct

type Config struct {
	// ... existing fields ...

	// Proxy configuration
	ProxyURL      string `json:"proxyUrl"`      // http://proxy.company.com:8080
	ProxyUser     string `json:"proxyUser"`     // username for proxy auth
	ProxyPassword string `json:"proxyPassword"` // password for proxy auth
	NoProxy       string `json:"noProxy"`       // Comma-separated list of hosts to bypass proxy
}
```

```go
// cmd/agent/main.go - Add command-line flags

func main() {
	// ... existing flags ...

	proxyURL := flag.String("proxy", "", "HTTP proxy URL (e.g., http://proxy.company.com:8080)")
	proxyUser := flag.String("proxy-user", "", "Proxy username for authentication")
	proxyPassword := flag.String("proxy-password", "", "Proxy password for authentication")
	noProxy := flag.String("no-proxy", "", "Comma-separated list of hosts to bypass proxy")

	flag.Parse()

	// ... load config ...

	// Override from CLI flags
	if explicitFlags["proxy"] {
		cfg.ProxyURL = *proxyURL
	}
	if explicitFlags["proxy-user"] {
		cfg.ProxyUser = *proxyUser
	}
	if explicitFlags["proxy-password"] {
		cfg.ProxyPassword = *proxyPassword
	}
	if explicitFlags["no-proxy"] {
		cfg.NoProxy = *noProxy
	}

	// Also read from environment variables (standard)
	if cfg.ProxyURL == "" {
		cfg.ProxyURL = os.Getenv("HTTP_PROXY")
		if cfg.ProxyURL == "" {
			cfg.ProxyURL = os.Getenv("HTTPS_PROXY")
		}
	}
	if cfg.NoProxy == "" {
		cfg.NoProxy = os.Getenv("NO_PROXY")
	}
}
```

---

#### **Task 2.2: Implement Proxy Transport**

**Priority:** HIGH
**Time:** 2 hours
**Files:** `agent/internal/client/client.go`

**Implementation:**

```go
// client/client.go - Update HTTP client creation

import (
	"net/http"
	"net/url"
	"golang.org/x/net/http/httpproxy"
)

func New(serverURL string, agentVersion string, config *config.Config) *Client {
	// Create custom transport with proxy support
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: false, // Always validate certs in production
		},
	}

	// Configure proxy
	if config.ProxyURL != "" {
		proxyURL, err := url.Parse(config.ProxyURL)
		if err != nil {
			log.Printf("Invalid proxy URL: %v", err)
		} else {
			// Add authentication if provided
			if config.ProxyUser != "" {
				proxyURL.User = url.UserPassword(config.ProxyUser, config.ProxyPassword)
			}

			transport.Proxy = http.ProxyURL(proxyURL)
		}
	} else {
		// Use system proxy settings from environment (HTTP_PROXY, HTTPS_PROXY, NO_PROXY)
		transport.Proxy = http.ProxyFromEnvironment
	}

	// Create HTTP client with timeout
	httpClient := &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
	}

	return &Client{
		baseURL:    serverURL,
		httpClient: httpClient,
		version:    agentVersion,
	}
}
```

---

#### **Task 2.3: Add Proxy Testing Command**

**Priority:** MEDIUM
**Time:** 1 hour
**Files:** `agent/cmd/agent/main.go`

**Implementation:**

```go
// Add --test-proxy flag
testProxy := flag.Bool("test-proxy", false, "Test proxy connection and exit")

if *testProxy {
	testProxyConnection(cfg)
	os.Exit(0)
}

func testProxyConnection(cfg *config.Config) {
	fmt.Println("Testing proxy connection...")
	fmt.Printf("Server URL: %s\n", cfg.ServerURL)
	fmt.Printf("Proxy URL: %s\n", cfg.ProxyURL)

	// Create client with proxy
	client := client.New(cfg.ServerURL, "test", cfg)

	// Try to reach server
	resp, err := client.httpClient.Get(cfg.ServerURL + "/health")
	if err != nil {
		fmt.Printf("❌ Connection failed: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		fmt.Println("✅ Connection successful!")
		fmt.Printf("Status code: %d\n", resp.StatusCode)
	} else {
		fmt.Printf("⚠️  Connection reached server but got status: %d\n", resp.StatusCode)
	}
}
```

**Usage:**
```bash
# Test proxy connection
./patchiq-agent --proxy http://proxy.company.com:8080 \
  --proxy-user john.doe \
  --proxy-password secret123 \
  --server https://patchiq.company.com/api \
  --test-proxy
```

---

#### **Task 2.4: Update Setup Wizard**

**Priority:** LOW
**Time:** 30 minutes
**Files:** `agent/cmd/agent/main.go`

**Enhancement:** Add proxy configuration to setup wizard

```go
func runSetupWizard() {
	// ... existing wizard code ...

	// Ask about proxy
	fmt.Println("\nProxy Configuration (optional, press Enter to skip):")
	fmt.Print("HTTP Proxy URL: ")
	var proxyURL string
	fmt.Scanln(&proxyURL)
	if proxyURL != "" {
		cfg.ProxyURL = proxyURL

		fmt.Print("Proxy Username (optional): ")
		var proxyUser string
		fmt.Scanln(&proxyUser)
		if proxyUser != "" {
			cfg.ProxyUser = proxyUser

			fmt.Print("Proxy Password: ")
			var proxyPass string
			fmt.Scanln(&proxyPass)
			cfg.ProxyPassword = proxyPass
		}
	}

	// ... rest of wizard ...
}
```

---

### **Phase 2 Testing Checklist**

- [ ] Agent works without proxy (default behavior)
- [ ] Agent connects through HTTP proxy (no auth)
- [ ] Agent connects through authenticated proxy (username/password)
- [ ] NO_PROXY environment variable bypasses proxy correctly
- [ ] --test-proxy command validates connection
- [ ] Setup wizard prompts for proxy settings
- [ ] Config file saves/loads proxy settings
- [ ] Works with Squid proxy
- [ ] Works with corporate proxy (BlueCoat, Zscaler)

---

## 📊 **PHASE 3: Bandwidth Throttling & Download Resume**

### **Problem**
Large bundle downloads (100MB-1GB) saturate network and can't resume if interrupted.

---

#### **Task 3.1: Implement Rate Limiter**

**Priority:** MEDIUM
**Time:** 2 hours
**Files:** `agent/internal/executors/script_executor.go`

**Implementation:**

```go
// Add new file: agent/internal/executors/rate_limiter.go

package executors

import (
	"io"
	"time"
	"golang.org/x/time/rate"
)

// RateLimitedReader wraps an io.Reader with rate limiting
type RateLimitedReader struct {
	reader  io.Reader
	limiter *rate.Limiter
}

// NewRateLimitedReader creates a new rate-limited reader
// bytesPerSecond: maximum bytes per second (0 = unlimited)
func NewRateLimitedReader(reader io.Reader, bytesPerSecond int) *RateLimitedReader {
	if bytesPerSecond <= 0 {
		// No rate limiting
		return &RateLimitedReader{
			reader:  reader,
			limiter: nil,
		}
	}

	// Create rate limiter
	// Allow burst of 64KB for better performance
	limiter := rate.NewLimiter(rate.Limit(bytesPerSecond), 64*1024)

	return &RateLimitedReader{
		reader:  reader,
		limiter: limiter,
	}
}

// Read implements io.Reader with rate limiting
func (r *RateLimitedReader) Read(p []byte) (int, error) {
	if r.limiter == nil {
		// No rate limiting
		return r.reader.Read(p)
	}

	// Rate limit the read
	n, err := r.reader.Read(p)
	if n > 0 && r.limiter != nil {
		// Wait for tokens
		r.limiter.WaitN(context.Background(), n)
	}
	return n, err
}
```

---

#### **Task 3.2: Add Download Progress Tracking**

**Priority:** MEDIUM
**Time:** 2 hours
**Files:** `agent/internal/executors/script_executor.go`

**Implementation:**

```go
// Add progress tracking wrapper

type ProgressReader struct {
	reader      io.Reader
	total       int64  // Total bytes to download
	downloaded  int64  // Bytes downloaded so far
	lastLog     time.Time
	onProgress  func(downloaded int64, total int64, bytesPerSec float64)
}

func NewProgressReader(reader io.Reader, total int64, onProgress func(int64, int64, float64)) *ProgressReader {
	return &ProgressReader{
		reader:     reader,
		total:      total,
		downloaded: 0,
		lastLog:    time.Now(),
		onProgress: onProgress,
	}
}

func (r *ProgressReader) Read(p []byte) (int, error) {
	n, err := r.reader.Read(p)
	if n > 0 {
		r.downloaded += int64(n)

		// Log progress every 2 seconds
		if time.Since(r.lastLog) > 2*time.Second {
			elapsed := time.Since(r.lastLog).Seconds()
			bytesPerSec := float64(n) / elapsed

			if r.onProgress != nil {
				r.onProgress(r.downloaded, r.total, bytesPerSec)
			}

			r.lastLog = time.Now()
		}
	}
	return n, err
}
```

---

#### **Task 3.3: Implement Download Resume**

**Priority:** MEDIUM
**Time:** 2 hours
**Files:** `agent/internal/executors/script_executor.go`

**Implementation:**

```go
// Update downloadBundle() method to support resume

func (e *BaseScriptExecutor) downloadBundle(url string, expectedChecksum string) (string, error) {
	// Create temp file
	tempFile, err := os.CreateTemp(e.bundleDir, "bundle-*.tar.gz")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	tempPath := tempFile.Name()

	// Check if partial download exists
	fileInfo, err := tempFile.Stat()
	if err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to stat temp file: %w", err)
	}

	existingSize := fileInfo.Size()

	// Create HTTP request with Range header for resume
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Add Range header if resuming
	if existingSize > 0 {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-", existingSize))
		log.Printf("Resuming download from byte %d", existingSize)

		// Seek to end of file to append
		_, err = tempFile.Seek(0, io.SeekEnd)
		if err != nil {
			tempFile.Close()
			os.Remove(tempPath)
			return "", fmt.Errorf("failed to seek: %w", err)
		}
	}

	// Download with timeout
	client := &http.Client{
		Timeout: 30 * time.Minute,
	}

	resp, err := client.Do(req)
	if err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to download bundle: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	// 200 = full download, 206 = partial content (resume)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		tempFile.Close()
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to download bundle: HTTP %d", resp.StatusCode)
	}

	// Get total size from Content-Length or Content-Range
	totalSize := resp.ContentLength
	if resp.StatusCode == http.StatusPartialContent {
		// Parse Content-Range: bytes 1000-2000/3000
		// totalSize is after the /
		contentRange := resp.Header.Get("Content-Range")
		if contentRange != "" {
			parts := strings.Split(contentRange, "/")
			if len(parts) == 2 {
				if size, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
					totalSize = size
				}
			}
		}
	}

	// Read download speed limit from config (default: 10 MB/s)
	maxBytesPerSec := 10 * 1024 * 1024 // 10 MB/s default
	if e.config != nil && e.config.MaxDownloadSpeedMBps > 0 {
		maxBytesPerSec = e.config.MaxDownloadSpeedMBps * 1024 * 1024
	}

	// Wrap reader with rate limiter and progress tracker
	reader := resp.Body

	// Add rate limiting
	if maxBytesPerSec > 0 {
		reader = NewRateLimitedReader(reader, maxBytesPerSec)
	}

	// Add progress tracking
	progressReader := NewProgressReader(reader, totalSize, func(downloaded, total int64, bytesPerSec float64) {
		percent := float64(downloaded) / float64(total) * 100
		mbps := bytesPerSec / (1024 * 1024)
		log.Printf("Download progress: %.1f%% (%d/%d bytes) @ %.2f MB/s",
			percent, downloaded, total, mbps)
	})

	// Download with checksum calculation
	hasher := sha256.New()
	writer := io.MultiWriter(tempFile, hasher)

	_, err = io.Copy(writer, progressReader)
	tempFile.Close()

	if err != nil {
		os.Remove(tempPath)
		return "", fmt.Errorf("failed to save bundle: %w", err)
	}

	// Verify checksum if provided
	if expectedChecksum != "" {
		actualChecksum := hex.EncodeToString(hasher.Sum(nil))
		if !strings.EqualFold(actualChecksum, expectedChecksum) {
			os.Remove(tempPath)
			return "", fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
		}
	}

	log.Printf("Bundle downloaded successfully: %s", tempPath)
	return tempPath, nil
}
```

---

#### **Task 3.4: Add Configuration Options**

**Priority:** MEDIUM
**Time:** 30 minutes
**Files:** `agent/internal/config/config.go`

**Implementation:**

```go
// Add to Config struct

type Config struct {
	// ... existing fields ...

	// Download configuration
	MaxDownloadSpeedMBps int  `json:"maxDownloadSpeedMbps"` // Max download speed in MB/s (0 = unlimited)
	EnableDownloadResume bool `json:"enableDownloadResume"` // Enable resume on interrupted downloads
}

// Update DefaultConfig
func DefaultConfig() *Config {
	return &Config{
		// ... existing defaults ...
		MaxDownloadSpeedMBps: 0,    // Unlimited by default
		EnableDownloadResume: true, // Enable resume by default
	}
}
```

---

### **Phase 3 Testing Checklist**

- [ ] Downloads work without rate limiting (default)
- [ ] Rate limiting throttles download speed correctly
- [ ] Progress logs show download percentage and speed
- [ ] Downloads resume after network interruption
- [ ] Checksum validation still works with resume
- [ ] Large files (500MB+) download successfully
- [ ] Multiple concurrent downloads don't exceed total limit
- [ ] Configuration persists across restarts

---

## 🪟 **PHASE 4: Windows Service Native Support**

### **Problem**
Agent must run as Windows Service to survive user logouts, but currently requires external wrapper (NSSM).

---

#### **Task 4.1: Add Windows Service Mode**

**Priority:** MEDIUM
**Time:** 4 hours
**Files:**
- `agent/cmd/agent/main.go`
- `agent/internal/service/` (new package)

**Implementation:**

```go
// Create new file: agent/internal/service/service_windows.go

//go:build windows

package service

import (
	"fmt"
	"log"
	"time"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/eventlog"
)

type windowsService struct {
	startFunc func() error
	stopFunc  func()
}

func (s *windowsService) Execute(args []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (ssec bool, errno uint32) {
	const cmdsAccepted = svc.AcceptStop | svc.AcceptShutdown

	changes <- svc.Status{State: svc.StartPending}

	// Start the agent
	if err := s.startFunc(); err != nil {
		log.Printf("Failed to start agent: %v", err)
		return true, 1
	}

	changes <- svc.Status{State: svc.Running, Accepts: cmdsAccepted}

	// Wait for stop signal
loop:
	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Interrogate:
				changes <- c.CurrentStatus
			case svc.Stop, svc.Shutdown:
				changes <- svc.Status{State: svc.StopPending}
				s.stopFunc()
				break loop
			}
		}
	}

	changes <- svc.Status{State: svc.Stopped}
	return
}

// RunAsService runs the agent as a Windows Service
func RunAsService(serviceName string, startFunc func() error, stopFunc func()) error {
	// Set up event log
	elog, err := eventlog.Open(serviceName)
	if err != nil {
		return fmt.Errorf("failed to open event log: %w", err)
	}
	defer elog.Close()

	elog.Info(1, fmt.Sprintf("%s service starting", serviceName))
	defer elog.Info(1, fmt.Sprintf("%s service stopped", serviceName))

	// Run service
	svc := &windowsService{
		startFunc: startFunc,
		stopFunc:  stopFunc,
	}

	err = svc.Run(serviceName, svc)
	if err != nil {
		elog.Error(1, fmt.Sprintf("%s service failed: %v", serviceName, err))
		return err
	}

	return nil
}

// IsWindowsService returns true if running as a Windows Service
func IsWindowsService() (bool, error) {
	return svc.IsWindowsService()
}
```

---

#### **Task 4.2: Update Main Entry Point**

**Priority:** MEDIUM
**Time:** 2 hours
**Files:** `agent/cmd/agent/main.go`

**Implementation:**

```go
// Update main() function

func main() {
	// Detect if running as Windows Service
	isService, err := service.IsWindowsService()
	if err != nil {
		log.Fatalf("Failed to detect service mode: %v", err)
	}

	if isService {
		// Run in service mode
		if err := runAsWindowsService(); err != nil {
			log.Fatalf("Service failed: %v", err)
		}
		return
	}

	// Run in console mode (existing code)
	runAsConsole()
}

func runAsConsole() {
	// All existing main() code goes here
	// ... (parse flags, load config, start agent, etc.)
}

var (
	agentStopCh chan struct{}
	agentWg     sync.WaitGroup
)

func runAsWindowsService() error {
	const serviceName = "PatchIQAgent"

	return service.RunAsService(
		serviceName,
		// Start function
		func() error {
			agentStopCh = make(chan struct{})

			// Load configuration (from registry or file)
			cfg := loadServiceConfig()

			// Start agent components
			go startAgent(cfg, &agentWg, agentStopCh)

			return nil
		},
		// Stop function
		func() {
			log.Println("Service stop requested, shutting down...")
			close(agentStopCh)
			agentWg.Wait()
			log.Println("Service stopped")
		},
	)
}

func loadServiceConfig() *config.Config {
	// Try to load from default locations
	homeDir, _ := os.UserHomeDir()
	configPaths := []string{
		`C:\ProgramData\PatchIQ\config.json`,
		filepath.Join(homeDir, ".patchify-agent", "config.json"),
	}

	for _, path := range configPaths {
		if cfg, err := config.Load(path); err == nil {
			log.Printf("Loaded service config from %s", path)
			return cfg
		}
	}

	// Fallback to defaults
	log.Println("Using default service configuration")
	return config.DefaultConfig()
}

func startAgent(cfg *config.Config, wg *sync.WaitGroup, stopCh chan struct{}) {
	defer wg.Done()
	wg.Add(1)

	// Initialize agent components
	cm := collectors.NewCollectorManager()
	em := executors.NewExecutorManager()

	// Start backend communication
	backendMgr := backend.New(cfg, cm, em, version)
	if err := backendMgr.Start(); err != nil {
		log.Printf("Failed to start backend communication: %v", err)
	}

	// Wait for stop signal
	<-stopCh

	// Cleanup
	backendMgr.Stop()
}
```

---

#### **Task 4.3: Add Service Installation Commands**

**Priority:** MEDIUM
**Time:** 2 hours
**Files:** `agent/cmd/agent/main.go`

**Implementation:**

```go
// Add service management commands

import (
	"golang.org/x/sys/windows/svc/mgr"
	"golang.org/x/sys/windows/svc"
)

func main() {
	// ... existing detection code ...

	// Add service management flags
	installService := flag.Bool("install-service", false, "Install as Windows Service")
	uninstallService := flag.Bool("uninstall-service", false, "Uninstall Windows Service")
	startService := flag.Bool("start-service", false, "Start Windows Service")
	stopService := flag.Bool("stop-service", false, "Stop Windows Service")

	flag.Parse()

	// Handle service management commands
	if *installService {
		if err := installWindowsService(); err != nil {
			log.Fatalf("Failed to install service: %v", err)
		}
		fmt.Println("✓ Service installed successfully")
		fmt.Println("To start: sc start PatchIQAgent")
		os.Exit(0)
	}

	if *uninstallService {
		if err := uninstallWindowsService(); err != nil {
			log.Fatalf("Failed to uninstall service: %v", err)
		}
		fmt.Println("✓ Service uninstalled successfully")
		os.Exit(0)
	}

	if *startService {
		if err := startWindowsService(); err != nil {
			log.Fatalf("Failed to start service: %v", err)
		}
		fmt.Println("✓ Service started successfully")
		os.Exit(0)
	}

	if *stopService {
		if err := stopWindowsService(); err != nil {
			log.Fatalf("Failed to stop service: %v", err)
		}
		fmt.Println("✓ Service stopped successfully")
		os.Exit(0)
	}

	// ... rest of existing code ...
}

func installWindowsService() error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}

	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()

	s, err := m.OpenService("PatchIQAgent")
	if err == nil {
		s.Close()
		return fmt.Errorf("service already exists")
	}

	s, err = m.CreateService(
		"PatchIQAgent",
		exePath,
		mgr.Config{
			DisplayName: "PatchIQ Agent",
			Description: "PatchIQ endpoint management agent for inventory collection and patch deployment",
			StartType:   mgr.StartAutomatic,
		},
	)
	if err != nil {
		return err
	}
	defer s.Close()

	// Set recovery actions (restart on failure)
	err = s.SetRecoveryActions([]mgr.RecoveryAction{
		{
			Type:  mgr.ServiceRestart,
			Delay: 10 * time.Second,
		},
		{
			Type:  mgr.ServiceRestart,
			Delay: 10 * time.Second,
		},
		{
			Type:  mgr.ServiceRestart,
			Delay: 10 * time.Second,
		},
	}, 60*60*24) // Reset fail count after 24 hours
	if err != nil {
		return err
	}

	return nil
}

func uninstallWindowsService() error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()

	s, err := m.OpenService("PatchIQAgent")
	if err != nil {
		return fmt.Errorf("service not found")
	}
	defer s.Close()

	// Stop service if running
	status, err := s.Query()
	if err != nil {
		return err
	}
	if status.State != svc.Stopped {
		_, err = s.Control(svc.Stop)
		if err != nil {
			return err
		}

		// Wait for service to stop
		for i := 0; i < 30; i++ {
			status, err = s.Query()
			if err != nil {
				return err
			}
			if status.State == svc.Stopped {
				break
			}
			time.Sleep(time.Second)
		}
	}

	return s.Delete()
}

func startWindowsService() error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()

	s, err := m.OpenService("PatchIQAgent")
	if err != nil {
		return fmt.Errorf("service not found")
	}
	defer s.Close()

	return s.Start()
}

func stopWindowsService() error {
	m, err := mgr.Connect()
	if err != nil {
		return err
	}
	defer m.Disconnect()

	s, err := m.OpenService("PatchIQAgent")
	if err != nil {
		return fmt.Errorf("service not found")
	}
	defer s.Close()

	_, err = s.Control(svc.Stop)
	return err
}
```

**Usage:**
```powershell
# Install service (requires admin)
.\patchiq-agent.exe --install-service

# Start service
.\patchiq-agent.exe --start-service
# OR
sc start PatchIQAgent

# Stop service
.\patchiq-agent.exe --stop-service

# Uninstall service
.\patchiq-agent.exe --uninstall-service
```

---

### **Phase 4 Testing Checklist**

- [ ] Agent installs as Windows Service
- [ ] Service starts automatically on boot
- [ ] Service runs as LocalSystem account
- [ ] Service survives user logout
- [ ] Service restarts on failure (recovery actions)
- [ ] Service logs to Windows Event Viewer
- [ ] Service can be managed via services.msc
- [ ] Uninstall removes service cleanly
- [ ] Configuration loads from ProgramData

---

## 📦 **PHASE 5: Professional Installers (Zero-Configuration)**

### **Problem**
No professional installer for any platform. Users have to manually:
- Copy binary
- Create service
- Configure settings
- Start agent

**Goal:** One-click installation - user double-clicks installer, everything works.

### **Requirements**
- ✅ **Windows:** MSI installer (double-click → installed & running)
- ✅ **macOS:** PKG installer (double-click → installed & running)
- ✅ **Linux:** DEB/RPM packages (apt install → installed & running)
- ✅ **All platforms:** No additional configuration steps required
- ✅ **Server URL:** Can be embedded in installer OR prompted during installation
- ✅ **Service:** Auto-created and auto-started
- ✅ **Uninstall:** Clean removal via standard OS methods

**Note:** This requires WiX Toolset (Windows), pkgbuild (macOS), fpm (Linux).

---

#### **Task 5.1: Create WiX Installer Project**

**Priority:** MEDIUM
**Time:** 4 hours
**Files:** `agent/installer/windows/` (new directory)

**Prerequisites:**
```powershell
# Install WiX Toolset v3
# Download from: https://wixtoolset.org/
```

**Create: `agent/installer/windows/patchiq-agent.wxs`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product
    Id="*"
    Name="PatchIQ Agent"
    Language="1033"
    Version="1.0.0.0"
    Manufacturer="PatchIQ"
    UpgradeCode="12345678-1234-1234-1234-123456789012">

    <Package
      InstallerVersion="200"
      Compressed="yes"
      InstallScope="perMachine"
      Comments="PatchIQ Agent Installer"
      Description="Endpoint management agent for PatchIQ" />

    <MajorUpgrade
      DowngradeErrorMessage="A newer version of [ProductName] is already installed." />

    <MediaTemplate EmbedCab="yes" />

    <!-- Features -->
    <Feature Id="ProductFeature" Title="PatchIQ Agent" Level="1">
      <ComponentGroupRef Id="ProductComponents" />
      <ComponentRef Id="ServiceComponent" />
    </Feature>

    <!-- UI -->
    <UIRef Id="WixUI_Minimal" />
    <WixVariable Id="WixUILicenseRtf" Value="license.rtf" />

    <!-- Properties -->
    <Property Id="PATCHIQ_SERVER_URL" Value="https://patchiq.company.com/api">
      <RegistrySearch
        Id="ServerURLSearch"
        Root="HKLM"
        Key="SOFTWARE\PatchIQ\Agent"
        Name="ServerURL"
        Type="raw" />
    </Property>
  </Product>

  <!-- Directory structure -->
  <Fragment>
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="ProgramFilesFolder">
        <Directory Id="INSTALLFOLDER" Name="PatchIQ">
          <Directory Id="AgentFolder" Name="Agent" />
        </Directory>
      </Directory>

      <Directory Id="CommonAppDataFolder">
        <Directory Id="PatchIQDataFolder" Name="PatchIQ">
          <Directory Id="ConfigFolder" Name="Agent" />
        </Directory>
      </Directory>
    </Directory>
  </Fragment>

  <!-- Components -->
  <Fragment>
    <ComponentGroup Id="ProductComponents" Directory="AgentFolder">
      <Component Id="AgentExecutable">
        <File
          Id="PatchIQAgentEXE"
          Source="..\..\patchiq-agent.exe"
          KeyPath="yes"
          Checksum="yes" />
      </Component>
    </ComponentGroup>

    <Component Id="ServiceComponent" Directory="AgentFolder">
      <ServiceInstall
        Id="ServiceInstaller"
        Name="PatchIQAgent"
        DisplayName="PatchIQ Agent"
        Description="PatchIQ endpoint management agent"
        Type="ownProcess"
        Start="auto"
        ErrorControl="normal"
        Arguments=""
        Account="LocalSystem" />

      <ServiceControl
        Id="ServiceControl"
        Name="PatchIQAgent"
        Start="install"
        Stop="both"
        Remove="uninstall"
        Wait="yes" />

      <!-- Save server URL to registry -->
      <RegistryKey
        Root="HKLM"
        Key="SOFTWARE\PatchIQ\Agent">
        <RegistryValue
          Name="ServerURL"
          Type="string"
          Value="[PATCHIQ_SERVER_URL]" />
        <RegistryValue
          Name="InstallPath"
          Type="string"
          Value="[AgentFolder]" />
      </RegistryKey>
    </Component>
  </Fragment>
</Wix>
```

---

#### **Task 5.2: Add Configuration Dialog**

**Priority:** MEDIUM
**Time:** 2 hours
**Files:** `agent/installer/windows/ServerURLDialog.wxs`

**Implementation:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Fragment>
    <UI>
      <Dialog Id="ServerURLDlg" Width="370" Height="270" Title="PatchIQ Server Configuration">
        <Control Id="Title" Type="Text" X="15" Y="6" Width="200" Height="15" Transparent="yes" NoPrefix="yes">
          <Text>{\WixUI_Font_Title}Server Configuration</Text>
        </Control>

        <Control Id="Description" Type="Text" X="25" Y="23" Width="280" Height="15" Transparent="yes" NoPrefix="yes">
          <Text>Enter the PatchIQ server URL</Text>
        </Control>

        <Control Id="ServerURLLabel" Type="Text" X="25" Y="60" Width="290" Height="10" NoPrefix="yes" Text="&amp;Server URL:" />
        <Control Id="ServerURLEdit" Type="Edit" X="25" Y="72" Width="290" Height="18" Property="PATCHIQ_SERVER_URL" />

        <Control Id="ExampleText" Type="Text" X="25" Y="95" Width="290" Height="30" NoPrefix="yes">
          <Text>Example: https://patchiq.yourcompany.com/api</Text>
        </Control>

        <Control Id="Back" Type="PushButton" X="180" Y="243" Width="56" Height="17" Text="&amp;Back">
          <Publish Event="NewDialog" Value="LicenseAgreementDlg">1</Publish>
        </Control>

        <Control Id="Next" Type="PushButton" X="236" Y="243" Width="56" Height="17" Default="yes" Text="&amp;Next">
          <Publish Event="NewDialog" Value="VerifyReadyDlg">1</Publish>
        </Control>

        <Control Id="Cancel" Type="PushButton" X="304" Y="243" Width="56" Height="17" Cancel="yes" Text="Cancel">
          <Publish Event="SpawnDialog" Value="CancelDlg">1</Publish>
        </Control>
      </Dialog>
    </UI>
  </Fragment>
</Wix>
```

---

#### **Task 5.3: Create Build Script**

**Priority:** MEDIUM
**Time:** 1 hour
**Files:** `agent/installer/windows/build.ps1`

**Implementation:**

```powershell
# Build script for MSI installer

param(
    [string]$Version = "1.0.0",
    [string]$Architecture = "x64"
)

$ErrorActionPreference = "Stop"

Write-Host "Building PatchIQ Agent MSI Installer..." -ForegroundColor Cyan
Write-Host "Version: $Version"
Write-Host "Architecture: $Architecture"

# Paths
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$InstallerDir = $PSScriptRoot
$BinDir = Join-Path $ProjectRoot "bin"
$OutputDir = Join-Path $InstallerDir "output"

# Ensure output directory exists
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Build agent binary
Write-Host "`nBuilding agent binary..." -ForegroundColor Yellow
Push-Location $ProjectRoot
go build -ldflags "-X main.version=$Version" -o "$BinDir\patchiq-agent.exe" .\cmd\agent
Pop-Location

if (-not (Test-Path "$BinDir\patchiq-agent.exe")) {
    Write-Error "Failed to build agent binary"
    exit 1
}

Write-Host "✓ Agent binary built successfully" -ForegroundColor Green

# Build MSI
Write-Host "`nBuilding MSI installer..." -ForegroundColor Yellow

# Run WiX candle (compile)
& candle.exe `
    -arch $Architecture `
    -dVersion=$Version `
    -dSourceDir=$BinDir `
    -out "$OutputDir\" `
    "$InstallerDir\patchiq-agent.wxs" `
    "$InstallerDir\ServerURLDialog.wxs"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Candle failed"
    exit 1
}

# Run WiX light (link)
& light.exe `
    -out "$OutputDir\PatchIQAgent-$Version-$Architecture.msi" `
    -cultures:en-US `
    -ext WixUIExtension `
    "$OutputDir\patchiq-agent.wixobj" `
    "$OutputDir\ServerURLDialog.wixobj"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Light failed"
    exit 1
}

Write-Host "`n✓ MSI installer built successfully!" -ForegroundColor Green
Write-Host "Output: $OutputDir\PatchIQAgent-$Version-$Architecture.msi" -ForegroundColor Cyan
```

**Usage:**
```powershell
cd agent/installer/windows
.\build.ps1 -Version "1.0.0" -Architecture "x64"
```

---

#### **Task 5.4: Add Uninstall Cleanup**

**Priority:** LOW
**Time:** 1 hour
**Files:** Updated in `patchiq-agent.wxs`

**Implementation:**

```xml
<!-- Add to WiX file -->
<Component Id="ConfigCleanup" Directory="ConfigFolder">
  <RemoveFile Id="RemoveConfigFiles" Name="*.*" On="uninstall" />
  <RemoveFolderEx Id="RemoveConfigFolder" On="uninstall" Property="PatchIQDataFolder" />
</Component>
```

---

#### **Task 5.5: Create macOS PKG Installer**

**Priority:** MEDIUM
**Time:** 3-4 hours
**Files:** `agent/installer/macos/` (new directory)

**Implementation:**

**Create: `agent/installer/macos/build.sh`**

```bash
#!/bin/bash
set -e

VERSION=${1:-1.0.0}
ARCH=${2:-$(uname -m)}

echo "Building PatchIQ Agent PKG Installer for macOS..."
echo "Version: $VERSION"
echo "Architecture: $ARCH"

# Paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INSTALLER_DIR="$PROJECT_ROOT/installer/macos"
BUILD_DIR="$INSTALLER_DIR/build"
PAYLOAD_DIR="$BUILD_DIR/payload"
SCRIPTS_DIR="$BUILD_DIR/scripts"
OUTPUT_DIR="$INSTALLER_DIR/output"

# Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$PAYLOAD_DIR" "$SCRIPTS_DIR" "$OUTPUT_DIR"

# Build agent binary
echo "Building agent binary..."
cd "$PROJECT_ROOT"
go build -ldflags "-X main.version=$VERSION" -o "$PAYLOAD_DIR/patchiq-agent" ./cmd/agent
chmod +x "$PAYLOAD_DIR/patchiq-agent"

# Create installation structure
mkdir -p "$PAYLOAD_DIR/opt/patchiq"
mkdir -p "$PAYLOAD_DIR/Library/LaunchDaemons"
mkdir -p "$PAYLOAD_DIR/usr/local/bin"

mv "$PAYLOAD_DIR/patchiq-agent" "$PAYLOAD_DIR/opt/patchiq/"

# Create LaunchDaemon plist
cat > "$PAYLOAD_DIR/Library/LaunchDaemons/com.patchiq.agent.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.patchiq.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/patchiq/patchiq-agent</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/patchiq/agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/patchiq/agent-error.log</string>
</dict>
</plist>
EOF

# Create postinstall script
cat > "$SCRIPTS_DIR/postinstall" <<'EOF'
#!/bin/bash

# Create log directory
mkdir -p /var/log/patchiq
chmod 755 /var/log/patchiq

# Set permissions
chmod +x /opt/patchiq/patchiq-agent
chown root:wheel /opt/patchiq/patchiq-agent

# Load and start service
launchctl load /Library/LaunchDaemons/com.patchiq.agent.plist
launchctl start com.patchiq.agent

echo "PatchIQ Agent installed successfully!"
exit 0
EOF

chmod +x "$SCRIPTS_DIR/postinstall"

# Create preinstall script (prompt for server URL if not set)
cat > "$SCRIPTS_DIR/preinstall" <<'EOF'
#!/bin/bash

# Check if server URL is already configured
if [ ! -f "/opt/patchiq/config.json" ]; then
    # Create default config
    mkdir -p /opt/patchiq
    cat > /opt/patchiq/config.json <<'CONFIGEOF'
{
  "serverUrl": "https://patchiq.yourcompany.com/api",
  "webUiPort": 5003
}
CONFIGEOF
fi

exit 0
EOF

chmod +x "$SCRIPTS_DIR/preinstall"

# Build PKG
echo "Building PKG..."
pkgbuild \
    --root "$PAYLOAD_DIR" \
    --scripts "$SCRIPTS_DIR" \
    --identifier "com.patchiq.agent" \
    --version "$VERSION" \
    --install-location "/" \
    "$OUTPUT_DIR/PatchIQAgent-$VERSION-$ARCH.pkg"

echo "✓ PKG installer built successfully!"
echo "Output: $OUTPUT_DIR/PatchIQAgent-$VERSION-$ARCH.pkg"
```

**Usage:**
```bash
cd agent/installer/macos
./build.sh 1.0.0
```

---

#### **Task 5.6: Create Linux DEB/RPM Packages**

**Priority:** MEDIUM
**Time:** 3-4 hours
**Files:** `agent/installer/linux/` (new directory)

**Prerequisites:**
```bash
# Install FPM (Effing Package Management)
gem install fpm
```

**Create: `agent/installer/linux/build.sh`**

```bash
#!/bin/bash
set -e

VERSION=${1:-1.0.0}
ARCH=${2:-amd64}
FORMAT=${3:-deb}  # deb or rpm

echo "Building PatchIQ Agent $FORMAT Package..."
echo "Version: $VERSION"
echo "Architecture: $ARCH"

# Paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INSTALLER_DIR="$PROJECT_ROOT/installer/linux"
BUILD_DIR="$INSTALLER_DIR/build"
OUTPUT_DIR="$INSTALLER_DIR/output"

# Clean
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$OUTPUT_DIR"

# Build agent binary
echo "Building agent binary..."
cd "$PROJECT_ROOT"
GOOS=linux GOARCH=$ARCH go build \
    -ldflags "-X main.version=$VERSION" \
    -o "$BUILD_DIR/patchiq-agent" \
    ./cmd/agent

# Create directory structure
mkdir -p "$BUILD_DIR/opt/patchiq"
mkdir -p "$BUILD_DIR/etc/systemd/system"
mkdir -p "$BUILD_DIR/etc/patchiq"

# Copy binary
cp "$BUILD_DIR/patchiq-agent" "$BUILD_DIR/opt/patchiq/"
chmod +x "$BUILD_DIR/opt/patchiq/patchiq-agent"

# Create systemd service
cat > "$BUILD_DIR/etc/systemd/system/patchiq-agent.service" <<'EOF'
[Unit]
Description=PatchIQ Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/opt/patchiq/patchiq-agent
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create default config
cat > "$BUILD_DIR/etc/patchiq/config.json" <<'EOF'
{
  "serverUrl": "https://patchiq.yourcompany.com/api",
  "webUiPort": 5003,
  "dataDir": "/var/lib/patchiq-agent"
}
EOF

# Create post-install script
cat > "$BUILD_DIR/post-install.sh" <<'EOF'
#!/bin/bash

# Create data directory
mkdir -p /var/lib/patchiq-agent
chmod 755 /var/lib/patchiq-agent

# Reload systemd
systemctl daemon-reload

# Enable and start service
systemctl enable patchiq-agent
systemctl start patchiq-agent

echo "PatchIQ Agent installed successfully!"
echo "Status: systemctl status patchiq-agent"
echo "Logs: journalctl -u patchiq-agent -f"
EOF

chmod +x "$BUILD_DIR/post-install.sh"

# Create pre-uninstall script
cat > "$BUILD_DIR/pre-uninstall.sh" <<'EOF'
#!/bin/bash

# Stop and disable service
systemctl stop patchiq-agent || true
systemctl disable patchiq-agent || true
EOF

chmod +x "$BUILD_DIR/pre-uninstall.sh"

# Build package with FPM
echo "Building $FORMAT package..."

fpm \
    -s dir \
    -t $FORMAT \
    -n patchiq-agent \
    -v $VERSION \
    --architecture $ARCH \
    --description "PatchIQ endpoint management agent" \
    --url "https://patchiq.io" \
    --maintainer "support@patchiq.io" \
    --license "Proprietary" \
    --after-install "$BUILD_DIR/post-install.sh" \
    --before-remove "$BUILD_DIR/pre-uninstall.sh" \
    --config-files /etc/patchiq/config.json \
    -C "$BUILD_DIR" \
    --package "$OUTPUT_DIR/patchiq-agent_${VERSION}_${ARCH}.$FORMAT" \
    opt/patchiq/patchiq-agent=/opt/patchiq/patchiq-agent \
    etc/systemd/system/patchiq-agent.service=/etc/systemd/system/patchiq-agent.service \
    etc/patchiq/config.json=/etc/patchiq/config.json

echo "✓ $FORMAT package built successfully!"
echo "Output: $OUTPUT_DIR/patchiq-agent_${VERSION}_${ARCH}.$FORMAT"
```

**Usage:**
```bash
# Build DEB (Debian/Ubuntu)
cd agent/installer/linux
./build.sh 1.0.0 amd64 deb

# Build RPM (CentOS/RHEL/Fedora)
./build.sh 1.0.0 x86_64 rpm
```

**Installation:**
```bash
# Debian/Ubuntu
sudo dpkg -i patchiq-agent_1.0.0_amd64.deb
# OR
sudo apt install ./patchiq-agent_1.0.0_amd64.deb

# CentOS/RHEL/Fedora
sudo rpm -i patchiq-agent_1.0.0_x86_64.rpm
# OR
sudo yum install ./patchiq-agent_1.0.0_x86_64.rpm
```

---

#### **Task 5.7: Build All Platforms Script**

**Priority:** LOW
**Time:** 1 hour
**Files:** `agent/installer/build-all.sh`

**Create master build script:**

```bash
#!/bin/bash
set -e

VERSION=${1:-1.0.0}

echo "Building PatchIQ Agent Installers v$VERSION for all platforms..."

# Windows MSI (x64)
echo -e "\n=== Building Windows x64 MSI ==="
cd windows
powershell -ExecutionPolicy Bypass -File build.ps1 -Version $VERSION -Architecture x64
cd ..

# macOS PKG (x86_64 and arm64)
echo -e "\n=== Building macOS PKG ==="
cd macos
./build.sh $VERSION x86_64
./build.sh $VERSION arm64
cd ..

# Linux DEB (amd64)
echo -e "\n=== Building Linux DEB (amd64) ==="
cd linux
./build.sh $VERSION amd64 deb
cd ..

# Linux RPM (x86_64)
echo -e "\n=== Building Linux RPM (x86_64) ==="
cd linux
./build.sh $VERSION x86_64 rpm
cd ..

echo -e "\n✓ All installers built successfully!"
echo -e "\nOutput files:"
find . -name "*.msi" -o -name "*.pkg" -o -name "*.deb" -o -name "*.rpm" | sort
```

---

### **Phase 5 Testing Checklist**

#### **Windows MSI**
- [ ] Double-click MSI → Agent installs automatically
- [ ] Service created and started
- [ ] No additional steps required
- [ ] Appears in "Add/Remove Programs"
- [ ] Uninstall via "Add/Remove Programs" works
- [ ] Server URL can be configured during install
- [ ] Upgrade preserves configuration

#### **macOS PKG**
- [ ] Double-click PKG → Agent installs automatically
- [ ] LaunchDaemon created and started
- [ ] Agent survives logout
- [ ] No additional steps required
- [ ] Uninstall with pkgutil --forget works
- [ ] Works on both Intel and Apple Silicon

#### **Linux DEB/RPM**
- [ ] `apt install` → Agent installs and starts
- [ ] `rpm install` → Agent installs and starts
- [ ] Systemd service enabled and running
- [ ] No additional steps required
- [ ] `apt remove` / `rpm remove` cleans up
- [ ] Config file preserved on upgrade

#### **Cross-Platform**
- [ ] All installers work without manual configuration
- [ ] Default server URL can be changed
- [ ] Services auto-start on boot
- [ ] Logs accessible (Event Viewer/Console.app/journalctl)
- [ ] Agent registers with server automatically

---

## 🔧 **PHASE 6: Polish & Improvements**

### **Quick Wins**

---

#### **Task 6.1: Make Inventory Interval Configurable**

**Priority:** LOW
**Time:** 1 hour
**Files:**
- `agent/internal/backend/backend.go`
- `agent/internal/config/config.go`

**Implementation:**

```go
// backend.go - Update inventoryLoop()

func (m *Manager) inventoryLoop() {
	defer m.wg.Done()

	// Initial inventory after 30 seconds
	select {
	case <-time.After(30 * time.Second):
	case <-m.stopCh:
		return
	}

	m.submitInventoryNow()

	// Create ticker with configurable interval
	interval := time.Duration(m.config.InventoryInterval) * time.Second
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.submitInventoryNow()
		case <-m.resetInventory: // ← Add new channel
			ticker.Reset(time.Duration(m.config.InventoryInterval) * time.Second)
			log.Printf("Inventory interval updated to %ds", m.config.InventoryInterval)
		case <-m.stopCh:
			return
		}
	}
}

// Add to Manager struct
type Manager struct {
	// ... existing fields ...
	resetInventory chan struct{} // ← Add new channel
}

// Update New() function
func New(...) *Manager {
	return &Manager{
		// ... existing fields ...
		resetInventory: make(chan struct{}, 1), // ← Initialize channel
	}
}

// Update processHeartbeat() to apply server config
func (m *Manager) processHeartbeat(...) {
	// ... existing code ...

	// Apply inventory interval from server
	if resp.Config.InventoryIntervalSeconds > 0 &&
	   resp.Config.InventoryIntervalSeconds != m.config.InventoryInterval {
		m.config.InventoryInterval = resp.Config.InventoryIntervalSeconds
		select {
		case m.resetInventory <- struct{}{}:
		default:
		}
	}
}
```

---

#### **Task 6.2: Improve Error Messages**

**Priority:** LOW
**Time:** 2 hours
**Files:** Various

**Implementation:**

```go
// Add structured error types

type AgentError struct {
	Code    string
	Message string
	Hint    string
	Cause   error
}

func (e *AgentError) Error() string {
	if e.Hint != "" {
		return fmt.Sprintf("[%s] %s\nHint: %s", e.Code, e.Message, e.Hint)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Common errors
var (
	ErrConnectionFailed = &AgentError{
		Code:    "CONN_001",
		Message: "Failed to connect to server",
		Hint:    "Check network connectivity and proxy settings. Use --test-proxy to diagnose.",
	}

	ErrAuthFailed = &AgentError{
		Code:    "AUTH_001",
		Message: "Authentication failed",
		Hint:    "Agent credentials may be invalid. Delete ~/.patchify-agent/credentials.json and restart.",
	}

	ErrDownloadFailed = &AgentError{
		Code:    "DL_001",
		Message: "Bundle download failed",
		Hint:    "Check network connection and available disk space.",
	}
)
```

---

#### **Task 6.3: Add Version Check**

**Priority:** LOW
**Time:** 1 hour
**Files:** `agent/internal/backend/backend.go`

**Implementation:**

```go
// Check for agent updates during heartbeat

func (m *Manager) processHeartbeat(...) {
	// ... existing code ...

	// Check if server has newer agent version
	if resp.LatestAgentVersion != "" && resp.LatestAgentVersion != m.agentVersion {
		log.Printf("⚠️  New agent version available: %s (current: %s)",
			resp.LatestAgentVersion, m.agentVersion)
		log.Printf("Download: %s", resp.AgentDownloadURL)
	}
}
```

---

### **Phase 6 Testing Checklist**

- [ ] Inventory interval configurable from server
- [ ] Error messages are clear and actionable
- [ ] Agent checks for updates
- [ ] All configuration options documented
- [ ] Agent logs useful diagnostic information

---

## 🎨 **PHASE 7: Enhanced Software Classification**

**Priority:** MEDIUM
**Time Estimate:** 1-2 weeks
**Dependencies:** None (can run in parallel with other phases)

**Goal:** Improve the agent's ability to distinguish between third-party apps, system apps, and services for better asset management, security analysis, and license tracking.

### **Current State vs. Target State**

**Problems with Current Collection:**
- ❌ Can't distinguish system apps from third-party apps
- ❌ Can't identify bloatware vs. essential software
- ❌ Can't tell if app was IT-deployed or user-installed
- ❌ Can't categorize apps (productivity, security, development, etc.)
- ❌ Can't identify security risks (unsigned apps, deprecated versions)
- ❌ No usage tracking (can't identify unused licenses)

**Target:** Add 25+ new fields across 6 categories to enable:
- ✅ Smart filtering (hide 342 system apps by default)
- ✅ Security dashboard (7 unsigned apps, 2 prohibited, 23 outdated)
- ✅ License optimization ($847/month potential savings)
- ✅ Compliance reports (94% approved, 5% unapproved, 1% prohibited)

---

### **Task 7.1: Core Classification Fields** (2-3 days)

Add new fields to distinguish software types:

#### **classificationType** (enum: System | ThirdParty | UserInstalled | ITDeployed)

**Detection Logic:**
```go
// agent/internal/models/classification.go
func DetermineClassificationType(app Application) string {
    // System apps
    if isSystemPath(app.Path) && isSystemVendor(app.Vendor) {
        return "System"
    }

    // IT deployed (via enterprise tools)
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
        "/bin/", "/sbin/", "/usr/bin/", "/usr/sbin/", "/lib/", "/usr/lib/",
    }

    for _, sysPath := range systemPaths {
        if strings.HasPrefix(path, sysPath) {
            return true
        }
    }
    return false
}

func isUserPath(path string) bool {
    userPaths := []string{
        "C:\\Users\\", "%USERPROFILE%", "%LOCALAPPDATA%",  // Windows
        "/Users/", "~/",                                      // macOS
        "/home/", "~/.local/",                               // Linux
    }

    for _, userPath := range userPaths {
        if strings.Contains(path, userPath) {
            return true
        }
    }
    return false
}
```

#### **category** (enum: Browser | Productivity | Security | Development | Media | Gaming | Utility | Communication | Unknown)

**Detection Logic:**
```go
func CategorizeApplication(app Application) string {
    // 1. Check known applications database
    knownApps := map[string]string{
        "Google Chrome": "Browser",
        "Firefox": "Browser",
        "Microsoft Edge": "Browser",
        "Visual Studio Code": "Development",
        "Docker Desktop": "Development",
        "Slack": "Communication",
        "Microsoft Teams": "Communication",
        "Norton Antivirus": "Security",
        "Spotify": "Media",
        "Steam": "Gaming",
    }

    if category, found := knownApps[app.Name]; found {
        return category
    }

    // 2. Check bundle ID patterns (macOS)
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

#### **isSystemApp** (boolean) and **isPreInstalled** (boolean)

**Detection Logic:**
```go
func IsPreInstalled(app Application) bool {
    // Check installation date vs OS installation date
    osInstallDate := getOSInstallDate()
    appInstallDate := parseDate(app.InstallDate)

    // If installed within 1 day of OS install, likely pre-installed
    if appInstallDate.Sub(osInstallDate) < 24*time.Hour {
        return true
    }

    // Check for known OEM bloatware patterns
    oemBloatware := []string{
        "McAfee", "Norton",  // Trial versions
        "WildTangent", "Candy Crush",  // Games
        "Dell SupportAssist", "HP Support Assistant", "Lenovo Vantage",
    }

    for _, bloat := range oemBloatware {
        if strings.Contains(app.Name, bloat) {
            return true
        }
    }

    return false
}
```

#### **Installation Metadata Fields:**
- `installMethod` (enum: ManualInstall | PackageManager | AppStore | EnterpriseDeployment | Bundled | Unknown)
- `installScope` (enum: System | AllUsers | CurrentUser)
- `installedBy` (string - username)
- `approvalStatus` (enum: Approved | Unapproved | Prohibited | Unknown)

**Data Sources:**
- **Windows:** Registry keys, Event Viewer (Event ID 11707), file ownership
- **macOS:** `/var/log/install.log`, file ownership, Jamf receipts
- **Linux:** Package manager logs (`/var/log/apt/history.log`, `/var/log/yum.log`)

---

### **Task 7.2: Security Metadata** (1-2 days)

Add digital signature verification and security attributes:

#### **digitalSignature** (object)

**Structure:**
```go
type DigitalSignature struct {
    IsSigned          bool   `json:"isSigned"`
    SignedBy          string `json:"signedBy"`           // Certificate subject
    IsValidSignature  bool   `json:"isValidSignature"`   // Signature verification
    SigningAuthority  string `json:"signingAuthority"`   // CA that issued cert
    CertificateExpiry string `json:"certificateExpiry"`  // ISO8601
    TrustLevel        string `json:"trustLevel"`         // Trusted, Untrusted, Unknown
}
```

**Platform-Specific Collection:**

**Windows:**
```powershell
Get-AuthenticodeSignature "C:\Program Files\App\app.exe"
```

**macOS:**
```bash
codesign -dv --verbose=4 /Applications/App.app 2>&1
spctl -a -vv /Applications/App.app 2>&1
```

**Linux:**
```bash
# Check package manager signatures
rpm --checksig package.rpm
dpkg-sig --verify package.deb
```

#### **Security Risk Fields:**
- `networkAccess` (boolean) - Does app make network connections?
- `requiresAdmin` (boolean) - Does app require elevated privileges?

**Detection:**
- **Windows:** Check manifest `requestedExecutionLevel`, UAC logs
- **macOS:** Check for `AuthorizationExecuteWithPrivileges`, SMJobBless
- **Linux:** Check setuid bit, PolicyKit rules

---

### **Task 7.3: Usage & Behavior Tracking** (1-2 days)

Add usage metrics for license optimization:

#### **Usage Fields:**
- `launchFrequency` (enum: Never | Rarely | Weekly | Daily | Hourly)
- `lastUsed` (timestamp)
- `avgDailyUsageMinutes` (integer)

**Calculation Logic:**
```go
func CalculateLaunchFrequency(lastUsed time.Time, avgDailyUsage int) string {
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

**Platform-Specific Data Sources:**

**Windows:**
- Prefetch files: `C:\Windows\Prefetch\` (last execution time)
- Event Viewer: Application start events
- Process accounting

**macOS:**
- QuickLook cache: `~/Library/Application Support/com.apple.sharedfilelist/`
- Unified logs: `log show --predicate 'process == "AppName"'`
- FSEvents (file system events)

**Linux:**
- Command history: `~/.bash_history`, `~/.zsh_history`
- Process accounting: `sa`, `lastcomm`
- Audit logs: `auditd`

---

### **Task 7.4: Update & Dependency Metadata** (1-2 days)

Track software updates and dependencies:

#### **Update Tracking:**
- `updateChannel` (enum: Stable | Beta | Dev | Canary | LTS | Unknown)
- `lastUpdated` (timestamp)
- `autoUpdateEnabled` (boolean)
- `updateSource` (enum: VendorWebsite | PackageManager | AppStore | Enterprise | Manual)

**Detection:**
- Check application preferences/config files
- Check registry keys (Windows)
- Check plist files (macOS)
- Check version string patterns (e.g., "120.0.6099.109-beta")

#### **Dependency Tracking:**
- `dependencies` (array of strings)
- `conflictsWith` (array of strings)

**Collection:**
- **Windows:** Registry dependencies, MSI database, Dependency Walker
- **macOS:** `brew deps {package}`, `otool -L` for dylib dependencies
- **Linux:** `apt-cache depends`, `rpm -qR`

---

### **Task 7.5: Backend & Frontend Integration** (2-3 days)

#### **Backend Changes:**

**Update Prisma Schema:**
```prisma
// backend/src/db/prisma/schema.prisma
model Application {
  // Existing fields...

  // NEW: Classification
  classificationType String?  // System, ThirdParty, UserInstalled, ITDeployed
  category           String?  // Browser, Productivity, Security, etc.
  isSystemApp        Boolean  @default(false)
  isPreInstalled     Boolean  @default(false)

  // NEW: Installation metadata
  installMethod      String?  // ManualInstall, PackageManager, AppStore, etc.
  installScope       String?  // System, AllUsers, CurrentUser
  installedBy        String?
  approvalStatus     String?  @default("Unknown")

  // NEW: Security
  digitalSignature   Json?    // DigitalSignature object
  networkAccess      Boolean  @default(false)
  requiresAdmin      Boolean  @default(false)

  // NEW: Updates
  updateChannel      String?
  lastUpdated        DateTime?
  autoUpdateEnabled  Boolean  @default(false)
  updateSource       String?

  // NEW: Usage
  launchFrequency    String?  // Never, Rarely, Weekly, Daily, Hourly
  lastUsed           DateTime?
  avgDailyUsageMinutes Int?

  // NEW: Dependencies
  dependencies       Json?    // Array of strings
  conflictsWith      Json?    // Array of strings
}
```

**Add API Endpoints:**
```typescript
// backend/src/modules/assets/assets.routes.ts
router.get('/:id/software/security-risks', assetsController.getSoftwareSecurityRisks);
router.get('/:id/software/unused', assetsController.getUnusedSoftware);
router.get('/:id/software/by-category', assetsController.getSoftwareByCategory);
```

#### **Frontend Changes:**

**Smart Filtering:**
```tsx
// frontend/src/pages/assets/components/tabs/SoftwareTab.tsx
<Select value={filterType} onChange={setFilterType}>
  <Option value="all">All Applications (847)</Option>
  <Option value="system">System Apps (342)</Option>
  <Option value="thirdParty">Third-Party Apps (421)</Option>
  <Option value="userInstalled">User-Installed (52)</Option>
  <Option value="itDeployed">IT-Deployed (32)</Option>
  <Option value="unapproved">⚠️ Unapproved (89)</Option>
  <Option value="prohibited">🔴 Prohibited (2)</Option>
</Select>
```

**Security Dashboard:**
```tsx
// frontend/src/pages/dashboard/SecurityDashboard.tsx
<Card title="Security Risks">
  <Statistic title="Unsigned Applications" value={7} prefix={<WarningOutlined />} />
  <Statistic title="Prohibited Software" value={2} prefix={<StopOutlined />} />
  <Statistic title="Outdated Software" value={23} prefix={<ClockCircleOutlined />} />
  <Statistic title="Unused Software (>90 days)" value={94} />
</Card>
```

**License Optimization Report:**
```tsx
// frontend/src/pages/reports/LicenseOptimization.tsx
<Card title="Unused Licenses">
  <List
    dataSource={unusedLicenses}
    renderItem={(item) => (
      <List.Item>
        <List.Item.Meta
          title={item.name}
          description={`Last used ${item.daysSinceLastUse} days ago`}
        />
        <Text type="danger">${item.monthlyCost}/month</Text>
      </List.Item>
    )}
  />
  <Text strong>Potential Savings: $847/month</Text>
</Card>
```

---

### **Phase 7: UI/UX Benefits**

With enhanced classification, users can:

#### **1. Smart Filtering**
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

#### **2. Category Views**
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

#### **3. Security Dashboard**
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

#### **4. License Optimization**
```
License Recommendations:
├─ Unused Licenses (12)
│  └─ Adobe Creative Cloud ($52.99/mo) - Last used 127 days ago
├─ Duplicate Software (5)
│  └─ 3 PDF editors installed (keep Adobe, remove others)
└─ Potential Savings: $847/month
```

---

### **Phase 7 Testing Checklist**

- [ ] Classification detection works on all platforms (Windows, macOS, Linux)
- [ ] Digital signature verification works correctly
- [ ] Usage tracking collects last used and frequency data
- [ ] Smart filtering shows correct counts for each classification type
- [ ] Security dashboard highlights unsigned and prohibited apps
- [ ] License optimization report identifies unused software
- [ ] Backend API endpoints return classification data
- [ ] Frontend UI displays all new fields correctly
- [ ] Performance impact minimal (<5% increase in collection time)

---

## 📝 **Documentation Updates Needed**

1. **README.md** - Add installation instructions for all features
2. **AGENT_DEPLOYMENT_NETWORK.md** - Add proxy configuration examples
3. **User Guide** - Create end-user documentation
4. **Troubleshooting Guide** - Common issues and solutions
5. **Configuration Reference** - All config options explained

---

## ⏱️ **Time Estimates Summary**

| Phase | Description | Time | Priority |
|-------|-------------|------|----------|
| **Phase 1** | Real-time Agent Status | **4-6 hours** | CRITICAL |
| **Phase 2** | HTTP Proxy Support | **4-6 hours** | HIGH |
| **Phase 3** | Bandwidth & Resume | **6-8 hours** | MEDIUM |
| **Phase 4** | Windows Service | **1-2 days** | MEDIUM |
| **Phase 5** | Professional Installers (All Platforms) | **2-3 days** | MEDIUM |
| **Phase 6** | Polish & Testing | **1 day** | LOW |
| **Phase 7** | Enhanced Software Classification | **1-2 weeks** | MEDIUM |
| **TOTAL** | Phases 1-6 | **6-9 days** | |
| **TOTAL** | Phase 7 (parallel) | **1-2 weeks** | |

**Phase 5 Breakdown:**
- Windows MSI: 1-1.5 days
- macOS PKG: 3-4 hours
- Linux DEB/RPM: 3-4 hours
- Testing all installers: 0.5 day

**Phase 7 Breakdown:**
- Core Classification: 2-3 days
- Security Metadata: 1-2 days
- Usage Tracking: 1-2 days
- Dependencies & Updates: 1-2 days
- Backend & Frontend: 2-3 days

---

## 🎯 **Recommended Implementation Order**

### **Week 1: Critical Fixes**
```
Day 1: Phase 1 (Agent Status) - 4-6 hours
Day 2: Phase 2 (Proxy Support) - 4-6 hours
Day 3: Phase 3 (Bandwidth/Resume) - 6-8 hours
Day 4: Testing & Documentation
Day 5: Buffer for issues
```

### **Week 2: Platform Installers**
```
Day 1-2: Phase 4 (Windows Service)
Day 3: Phase 5.1-5.4 (Windows MSI)
Day 4: Phase 5.5 (macOS PKG) + Phase 5.6 (Linux DEB/RPM)
Day 5: Phase 5.7 (Build automation) + Phase 6 (Polish) + Final Testing
```

### **Phase 7: Software Classification (Parallel Track)**

**Can be developed independently while Phases 1-6 are in progress.**

```
Week 1: Core Classification (Task 7.1) + Security Metadata (Task 7.2)
Week 2: Usage Tracking (Task 7.3) + Dependencies (Task 7.4) + Backend/Frontend (Task 7.5)
```

**Rationale:** Phase 7 is an enhancement to data collection and doesn't depend on status fixes, proxy support, or installers. It can be developed by a separate developer or team while the other phases are being implemented.

**Integration Point:** Once Phases 1-6 are complete and Phase 7 is ready, merge both tracks and deploy together.

---

## ✅ **Success Criteria**

### **Phase 1 Complete When:**
- [ ] Asset Details shows "Disconnected" when agent offline
- [ ] Status updates every 30 seconds without page refresh
- [ ] "Last seen" timestamp displays correctly

### **Phase 2 Complete When:**
- [ ] Agent works through authenticated proxy
- [ ] Proxy settings configurable via CLI/config/env
- [ ] --test-proxy command validates connection

### **Phase 3 Complete When:**
- [ ] Large downloads don't saturate network
- [ ] Downloads resume after interruption
- [ ] Progress logs show download speed

### **Phase 4 Complete When:**
- [ ] Agent runs as Windows Service
- [ ] Service survives user logout
- [ ] Service auto-restarts on failure

### **Phase 5 Complete When:**
- [ ] **Windows:** MSI installer works on Windows 10/11/Server (zero config)
- [ ] **macOS:** PKG installer works on Intel and Apple Silicon (zero config)
- [ ] **Linux:** DEB package works on Debian/Ubuntu (zero config)
- [ ] **Linux:** RPM package works on CentOS/RHEL/Fedora (zero config)
- [ ] All installers auto-create and auto-start services
- [ ] All installers require NO additional configuration steps
- [ ] Uninstallers remove all files cleanly
- [ ] Upgrades preserve configuration
- [ ] Default server URL configurable at build time

### **Phase 6 Complete When:**
- [ ] All features documented
- [ ] Error messages helpful
- [ ] Tests pass on all platforms

### **Phase 7 Complete When:**
- [ ] Agent collects `classificationType`, `category`, `isSystemApp` fields
- [ ] Digital signature verification works on all platforms (Windows/macOS/Linux)
- [ ] Usage tracking collects `launchFrequency`, `lastUsed`, `avgDailyUsageMinutes`
- [ ] Dependency detection populates `dependencies` array
- [ ] Backend API returns classification data in responses
- [ ] Frontend shows smart filtering (System/ThirdParty/UserInstalled/ITDeployed)
- [ ] Security dashboard displays unsigned/prohibited apps
- [ ] License optimization report identifies unused software (>90 days)
- [ ] Category views (Browser, Productivity, Security, etc.) work correctly
- [ ] Performance impact <5% increase in collection time
- [ ] Classification accuracy >90% on test systems

---

## 🚀 **Quick Start Implementation**

To get started immediately:

```bash
# 1. Create feature branch
git checkout -b feature/agent-improvements

# 2. Start with Phase 1 (highest impact, lowest effort)
cd backend/src/modules/agents
# Add calculateAgentStatus() helper function

# 3. Test immediately
npm run dev
# Check Asset Details page

# 4. Move to Phase 2
cd ../../../agent
# Add proxy support

# 5. Iterate
```

---

**Ready to start? Begin with Phase 1 - it's the quickest win with immediate visible impact!**

---

## 📦 **Before & After Comparison**

### **Current Agent Installation (Manual)**

**Windows:**
```powershell
# 1. Download binary
curl -o patchiq-agent.exe https://...

# 2. Copy to Program Files
copy patchiq-agent.exe "C:\Program Files\PatchIQ\"

# 3. Create service manually
sc.exe create PatchIQAgent binPath= "C:\Program Files\PatchIQ\patchiq-agent.exe"

# 4. Start service
sc.exe start PatchIQAgent

# 5. Configure server URL
# Edit registry or config file

Total steps: 5+ manual steps ❌
Time: 10-15 minutes
User experience: Technical, error-prone
```

**macOS:**
```bash
# 1. Download binary
curl -o patchiq-agent https://...

# 2. Copy to /opt
sudo cp patchiq-agent /opt/patchiq/
sudo chmod +x /opt/patchiq/patchiq-agent

# 3. Create launchd plist
sudo nano /Library/LaunchDaemons/com.patchiq.agent.plist
# Copy/paste XML configuration

# 4. Load and start
sudo launchctl load /Library/LaunchDaemons/com.patchiq.agent.plist

# 5. Configure server URL
# Edit config file

Total steps: 5+ manual steps ❌
Time: 10-15 minutes
User experience: Technical, error-prone
```

**Linux:**
```bash
# 1. Download binary
curl -o patchiq-agent https://...

# 2. Copy to /opt
sudo cp patchiq-agent /opt/patchiq/
sudo chmod +x /opt/patchiq/patchiq-agent

# 3. Create systemd service
sudo nano /etc/systemd/system/patchiq-agent.service
# Copy/paste service configuration

# 4. Enable and start
sudo systemctl daemon-reload
sudo systemctl enable patchiq-agent
sudo systemctl start patchiq-agent

# 5. Configure server URL
# Edit config file

Total steps: 5+ manual steps ❌
Time: 10-15 minutes
User experience: Technical, error-prone
```

---

### **New Agent Installation (Zero-Config)**

**Windows:**
```
1. Download: PatchIQAgent-1.0.0-x64.msi
2. Double-click installer
3. Click "Next, Next, Finish"
4. Done ✅

Total steps: 1 click
Time: 30 seconds
User experience: Consumer-grade, foolproof
```

**macOS:**
```
1. Download: PatchIQAgent-1.0.0-arm64.pkg
2. Double-click installer
3. Click "Continue, Install"
4. Done ✅

Total steps: 1 click
Time: 30 seconds
User experience: Consumer-grade, foolproof
```

**Linux:**
```bash
# Debian/Ubuntu
sudo apt install ./patchiq-agent_1.0.0_amd64.deb

# OR CentOS/RHEL
sudo rpm -i patchiq-agent_1.0.0_x86_64.rpm

# Done ✅

Total steps: 1 command
Time: 10 seconds
User experience: Standard package manager
```

---

## 🎯 **Impact Summary**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Installation Steps** | 5+ manual | 1 click/command | **80% reduction** |
| **Time to Install** | 10-15 min | 30 sec | **95% faster** |
| **Technical Knowledge Required** | High | None | **Accessible to all** |
| **Error Rate** | High | Near zero | **Reliable** |
| **Support Calls** | Many | Few | **Lower support costs** |
| **Enterprise Deployment** | Difficult | Easy | **GPO/MDM ready** |

---

## 💼 **Enterprise Deployment Benefits**

With professional installers, enterprises can deploy via:

**Windows:**
- Group Policy (GPO) - Push MSI to all computers
- SCCM/Intune - Software distribution
- PowerShell DSC - Automated deployment

**macOS:**
- Jamf Pro - Push PKG to all Macs
- Munki - Software management
- Apple Profile Manager

**Linux:**
- Ansible/Puppet/Chef - Configuration management
- APT/YUM repositories - Central package hosting
- Cloud-init - Auto-install on new VMs

**Result:** Deploy to 1,000 endpoints in minutes, not days.
