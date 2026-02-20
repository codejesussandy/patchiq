# PatchIQ Agent MSI Build Script
# Requires: WiX Toolset 3.x, Go 1.22+
#
# Usage:
#   .\build-msi.ps1                                   # Build with default version
#   .\build-msi.ps1 -Version "1.2.3"                  # Build specific version
#   .\build-msi.ps1 -ServerUrl "https://..."          # Set default server URL
#   .\build-msi.ps1 -Clean                            # Clean build directories first
#   .\build-msi.ps1 -Version "1.2.3" -SkipBuild       # Skip Go build, use existing binary

param(
    [string]$Version = "0.1.0",
    [string]$ServerUrl = "http://localhost:3000/api",
    [int]$WebUIPort = 3006,
    [string]$LogLevel = "info",
    [int]$HeartbeatInterval = 60,
    [string]$OutputDir = ".\dist",
    [string]$WixPath = "",
    [switch]$Clean,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "[..] $msg" -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host "[!!] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[XX] $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " PatchIQ Agent MSI Builder" -ForegroundColor Cyan
Write-Host " Version: $Version" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentRoot = (Get-Item "$ScriptDir\..\..").FullName
$BuildDir = Join-Path $ScriptDir "build"
$WxsFile = Join-Path $ScriptDir "patchiq-agent.wxs"

# Verify WiX source file exists
if (-not (Test-Path $WxsFile)) {
    Write-Err "WiX source file not found: $WxsFile"
    exit 1
}

# Clean if requested
if ($Clean) {
    Write-Info "Cleaning build directories..."
    if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
    if (Test-Path $OutputDir) { Remove-Item -Recurse -Force $OutputDir }
    Write-Success "Clean complete"
}

# Create directories
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# ============================================
# Step 1: Build Go executables
# ============================================
if (-not $SkipBuild) {
    Write-Info "Building Go executable..."

    $env:GOOS = "windows"
    $env:GOARCH = "amd64"
    $env:CGO_ENABLED = "0"

    # Build main agent
    Write-Info "  Building patchiq-agent.exe..."
    Push-Location $AgentRoot
    try {
        $agentExe = Join-Path $BuildDir "patchiq-agent.exe"
        $ldflags = "-s -w -X main.Version=$Version -X main.BuildDate=$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"

        & go build -ldflags=$ldflags -o $agentExe ./cmd/agent
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to build agent binary"
        }

        Write-Success "  patchiq-agent.exe built successfully"
    }
    finally {
        Pop-Location
    }
} else {
    Write-Warn "Skipping Go build (using existing binary)"

    # Verify binary exists
    $agentExe = Join-Path $BuildDir "patchiq-agent.exe"
    if (-not (Test-Path $agentExe)) {
        Write-Err "Agent binary not found at: $agentExe"
        Write-Host "Run without -SkipBuild to build the binary first" -ForegroundColor Yellow
        exit 1
    }
}

# ============================================
# Step 2: Create installer resources
# ============================================
Write-Info "Preparing installer resources..."

# Verify icon file exists
$iconPath = Join-Path $ScriptDir "patchiq.ico"
if (-not (Test-Path $iconPath)) {
    Write-Warn "Icon file not found at: $iconPath"
    Write-Info "Creating placeholder icon..."

    # Create a minimal 16x16 32-bit ICO file (blue square)
    $ico = New-Object System.Collections.ArrayList
    # ICO header
    $ico.AddRange([byte[]](0,0,1,0,1,0,16,16,0,0,1,0,32,0,104,4,0,0,22,0,0,0)) | Out-Null
    # BMP header
    $ico.AddRange([byte[]](40,0,0,0,16,0,0,0,32,0,0,0,1,0,32,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)) | Out-Null
    # Pixel data (16x16 blue square)
    for ($i = 0; $i -lt 256; $i++) {
        $ico.AddRange([byte[]](255, 128, 0, 255)) | Out-Null  # BGRA blue
    }
    # AND mask
    for ($i = 0; $i -lt 64; $i++) {
        $ico.Add([byte]0) | Out-Null
    }
    [System.IO.File]::WriteAllBytes($iconPath, [byte[]]$ico.ToArray())
    Write-Success "Placeholder icon created"
}

# Verify license file exists
$licensePath = Join-Path $ScriptDir "License.rtf"
if (-not (Test-Path $licensePath)) {
    Write-Err "License file not found at: $licensePath"
    Write-Host "Please create License.rtf before building the MSI" -ForegroundColor Yellow
    exit 1
}

# Update default config with provided values
Write-Info "Creating default configuration..."
$configPath = Join-Path $ScriptDir "default-config.json"
$config = @{
    serverUrl = $ServerUrl
    webUiPort = $WebUIPort
    enableWebUi = $true
    heartbeatIntervalSeconds = $HeartbeatInterval
    inventoryIntervalSeconds = 21600
    telemetryIntervalSeconds = 60
    collectHardware = $true
    collectSoftware = $true
    collectNetwork = $true
    collectSecurity = $true
    collectPeripherals = $true
    collectTelemetry = $true
    commandTimeoutSeconds = 900
    logLevel = $LogLevel
    logFormat = "json"
    enableDownloadResume = $true
    jobRetentionDays = 30
}
$config | ConvertTo-Json -Depth 3 | Out-File -FilePath $configPath -Encoding UTF8
Write-Success "Default configuration created"

# ============================================
# Step 3: Find WiX Toolset
# ============================================
Write-Info "Locating WiX Toolset..."

$wixPaths = @(
    $WixPath,
    "C:\Program Files (x86)\WiX Toolset v3.14\bin",
    "C:\Program Files (x86)\WiX Toolset v3.11\bin",
    "C:\Program Files (x86)\WiX Toolset v3.10\bin",
    "C:\Program Files\WiX Toolset v3.14\bin",
    "C:\Program Files\WiX Toolset v3.11\bin",
    "C:\Program Files\WiX Toolset v3.10\bin"
)

$candle = $null
$light = $null

foreach ($path in $wixPaths) {
    if ($path -and (Test-Path (Join-Path $path "candle.exe"))) {
        $candle = Join-Path $path "candle.exe"
        $light = Join-Path $path "light.exe"
        Write-Success "Found WiX at: $path"
        break
    }
}

# Try PATH
if (-not $candle) {
    $wixCandle = Get-Command candle.exe -ErrorAction SilentlyContinue
    if ($wixCandle) {
        $candle = $wixCandle.Source
        $light = Join-Path (Split-Path $candle) "light.exe"
        Write-Success "Found WiX in PATH"
    }
}

if (-not $candle -or -not (Test-Path $candle)) {
    Write-Err "WiX Toolset not found!"
    Write-Host ""
    Write-Host "Please install WiX Toolset 3.x:" -ForegroundColor Yellow
    Write-Host "  Option 1: choco install wixtoolset" -ForegroundColor Gray
    Write-Host "  Option 2: Download from https://wixtoolset.org/releases/" -ForegroundColor Gray
    Write-Host "  Option 3: dotnet tool install --global wix (for WiX 4.x)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    Write-Host ""

    # Create standalone installer as fallback
    if (Test-Path (Join-Path $ScriptDir "Install-PatchIQAgent.ps1")) {
        Write-Info "Creating standalone PowerShell installer as fallback..."
        $psInstaller = Join-Path $OutputDir "Install-PatchIQAgent.ps1"
        Copy-Item (Join-Path $ScriptDir "Install-PatchIQAgent.ps1") $psInstaller -Force
        Copy-Item (Join-Path $BuildDir "patchiq-agent.exe") $OutputDir -Force -ErrorAction SilentlyContinue

        Write-Success "Standalone installer created at: $OutputDir"
        Write-Host ""
        Write-Host "To install manually:" -ForegroundColor Cyan
        Write-Host "  1. Copy all files from $OutputDir to target machine"
        Write-Host "  2. Run PowerShell as Administrator"
        Write-Host "  3. Execute: .\Install-PatchIQAgent.ps1 -ServerUrl `"$ServerUrl`""
        Write-Host ""
    }

    exit 1
}

# ============================================
# Step 4: Compile WiX source
# ============================================
Write-Info "Compiling WiX source..."

$wixobjFile = Join-Path $BuildDir "patchiq-agent.wixobj"

& $candle `
    -nologo `
    -arch x64 `
    "-dBuildDir=$BuildDir" `
    "-dVersion=$Version" `
    -ext WixUtilExtension `
    -out $wixobjFile `
    $WxsFile

if ($LASTEXITCODE -ne 0) {
    Write-Err "WiX compilation failed"
    exit 1
}
Write-Success "WiX object created"

# ============================================
# Step 5: Link MSI
# ============================================
Write-Info "Linking MSI..."

$msiFile = Join-Path $OutputDir "PatchIQAgent-$Version-amd64.msi"

& $light `
    -nologo `
    -ext WixUIExtension `
    -ext WixUtilExtension `
    -cultures:en-us `
    -out $msiFile `
    $wixobjFile

if ($LASTEXITCODE -ne 0) {
    Write-Err "MSI linking failed"
    exit 1
}

# Get MSI file size
$msiSize = (Get-Item $msiFile).Length / 1MB
Write-Success "MSI created: $msiFile ($([math]::Round($msiSize, 2)) MB)"

# ============================================
# Done!
# ============================================
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host " Build Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output:" -ForegroundColor Cyan
Write-Host "  MSI: $msiFile"
Write-Host "  Size: $([math]::Round($msiSize, 2)) MB"
Write-Host ""
Write-Host "Installation Commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Interactive install (GUI):" -ForegroundColor Yellow
Write-Host "    msiexec /i `"$msiFile`""
Write-Host ""
Write-Host "  Silent install (no UI):" -ForegroundColor Yellow
Write-Host "    msiexec /i `"$msiFile`" /qn"
Write-Host ""
Write-Host "  Silent install with custom server URL:" -ForegroundColor Yellow
Write-Host "    msiexec /i `"$msiFile`" SERVERURL=`"https://your-server/api`" /qn"
Write-Host ""
Write-Host "  Silent install with all options:" -ForegroundColor Yellow
Write-Host "    msiexec /i `"$msiFile`" SERVERURL=`"https://your-server/api`" WEBUI_PORT=`"3006`" LOGLEVEL=`"debug`" /qn"
Write-Host ""
Write-Host "  Uninstall:" -ForegroundColor Yellow
Write-Host "    msiexec /x `"$msiFile`" /qn"
Write-Host ""
Write-Host "Service Management:" -ForegroundColor Cyan
Write-Host "  Start:   sc start PatchIQAgent"
Write-Host "  Stop:    sc stop PatchIQAgent"
Write-Host "  Status:  sc query PatchIQAgent"
Write-Host ""
