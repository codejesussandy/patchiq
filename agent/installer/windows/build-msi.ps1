# PatchIQ Agent MSI Build Script
# Requires: WiX Toolset 3.x, Go 1.22+
#
# Usage:
#   .\build-msi.ps1                           # Build with default version
#   .\build-msi.ps1 -Version "1.2.3"          # Build specific version
#   .\build-msi.ps1 -ServerUrl "https://..."  # Set default server URL
#   .\build-msi.ps1 -Clean                    # Clean build directories first

param(
    [string]$Version = "1.0.0",
    [string]$ServerUrl = "http://localhost:5001/api",
    [int]$UiPort = 5003,
    [string]$OutputDir = ".\output",
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
$WxsFile = Join-Path $ScriptDir "Product.wxs"

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
    Write-Info "Building Go executables..."

    $env:GOOS = "windows"
    $env:GOARCH = "amd64"
    $env:CGO_ENABLED = "0"

    # Build main agent
    Write-Info "  Building patchiq-agent.exe..."
    Push-Location $AgentRoot
    try {
        $agentExe = Join-Path $BuildDir "patchiq-agent.exe"
        go build -ldflags="-s -w -X main.version=$Version" -o $agentExe ./cmd/agent
        if ($LASTEXITCODE -ne 0) { throw "Failed to build agent" }
        Write-Success "  patchiq-agent.exe built"
    }
    finally {
        Pop-Location
    }

    # Build service wrapper
    Write-Info "  Building patchiq-service.exe..."
    Push-Location $AgentRoot
    try {
        $serviceExe = Join-Path $BuildDir "patchiq-service.exe"
        go build -ldflags="-s -w -X main.version=$Version" -o $serviceExe ./cmd/service
        if ($LASTEXITCODE -ne 0) { throw "Failed to build service" }
        Write-Success "  patchiq-service.exe built"
    }
    finally {
        Pop-Location
    }
} else {
    Write-Warn "Skipping Go build (using existing executables)"
}

# ============================================
# Step 2: Create installer resources
# ============================================
Write-Info "Creating installer resources..."

# Create icon if not exists
$iconPath = Join-Path $ScriptDir "patchiq.ico"
if (-not (Test-Path $iconPath)) {
    Write-Info "  Creating placeholder icon..."
    # Create a minimal 16x16 32-bit ICO file
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
    Write-Success "  Icon created"
}

# Create license RTF
$licensePath = Join-Path $ScriptDir "License.rtf"
if (-not (Test-Path $licensePath)) {
    Write-Info "  Creating license file..."
    @"
{\rtf1\ansi\deff0
{\fonttbl{\f0 Arial;}}
\f0\fs22
{\b PatchIQ Agent - End User License Agreement}\par
\par
Copyright (c) 2024 PatchIQ. All rights reserved.\par
\par
{\b 1. License Grant}\par
This software is provided under the terms of your PatchIQ subscription agreement. You are granted a non-exclusive, non-transferable license to use this software on endpoints covered by your subscription.\par
\par
{\b 2. Data Collection}\par
The PatchIQ Agent collects hardware inventory, software inventory, and system telemetry data to facilitate endpoint management. This data is transmitted securely to your configured PatchIQ server.\par
\par
{\b 3. Support}\par
For support, visit: https://patchiq.io/support\par
\par
By installing this software, you agree to these terms.\par
}
"@ | Out-File -FilePath $licensePath -Encoding ASCII
    Write-Success "  License file created"
}

# Update default config with provided values
$configPath = Join-Path $ScriptDir "default-config.json"
$config = @{
    serverUrl = $ServerUrl
    webUiPort = $UiPort
    enableWebUi = $true
    heartbeatIntervalSeconds = 60
    inventoryIntervalSeconds = 21600
    telemetryIntervalSeconds = 60
    collectHardware = $true
    collectSoftware = $true
    collectNetwork = $true
    collectSecurity = $true
    collectPeripherals = $true
    collectTelemetry = $true
    logLevel = "info"
}
$config | ConvertTo-Json -Depth 3 | Out-File -FilePath $configPath -Encoding UTF8
Write-Success "  Config file updated"

# ============================================
# Step 3: Find WiX Toolset
# ============================================
Write-Info "Locating WiX Toolset..."

$wixPaths = @(
    $WixPath,
    "C:\Program Files (x86)\WiX Toolset v3.14\bin",
    "C:\Program Files (x86)\WiX Toolset v3.11\bin",
    "C:\Program Files (x86)\WiX Toolset v3.10\bin"
)

$candle = $null
$light = $null

foreach ($path in $wixPaths) {
    if ($path -and (Test-Path (Join-Path $path "candle.exe"))) {
        $candle = Join-Path $path "candle.exe"
        $light = Join-Path $path "light.exe"
        Write-Success "  Found WiX at: $path"
        break
    }
}

# Try PATH
if (-not $candle) {
    $wixCandle = Get-Command candle.exe -ErrorAction SilentlyContinue
    if ($wixCandle) {
        $candle = $wixCandle.Source
        $light = Join-Path (Split-Path $candle) "light.exe"
        Write-Success "  Found WiX in PATH"
    }
}

if (-not $candle -or -not (Test-Path $candle)) {
    Write-Err "WiX Toolset not found!"
    Write-Host ""
    Write-Host "Please install WiX Toolset 3.x:" -ForegroundColor Yellow
    Write-Host "  Option 1: choco install wixtoolset" -ForegroundColor Gray
    Write-Host "  Option 2: Download from https://wixtoolset.org/releases/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    Write-Host ""

    # Create standalone installer as fallback
    Write-Info "Creating standalone PowerShell installer as fallback..."
    $psInstaller = Join-Path $OutputDir "Install-PatchIQAgent.ps1"
    Copy-Item (Join-Path $ScriptDir "Install-PatchIQAgent.ps1") $psInstaller -Force
    Copy-Item (Join-Path $BuildDir "patchiq-agent.exe") $OutputDir -Force -ErrorAction SilentlyContinue
    Copy-Item (Join-Path $BuildDir "patchiq-service.exe") $OutputDir -Force -ErrorAction SilentlyContinue

    Write-Success "Standalone installer created at: $OutputDir"
    Write-Host ""
    Write-Host "To install manually:" -ForegroundColor Cyan
    Write-Host "  1. Copy all files from $OutputDir to target machine"
    Write-Host "  2. Run PowerShell as Administrator"
    Write-Host "  3. Execute: .\Install-PatchIQAgent.ps1 -ServerUrl `"$ServerUrl`""
    Write-Host ""
    exit 0
}

# ============================================
# Step 4: Compile WiX source
# ============================================
Write-Info "Compiling WiX source..."

$wixobjFile = Join-Path $BuildDir "Product.wixobj"

& $candle `
    -nologo `
    -arch x64 `
    -dBuildDir="$BuildDir" `
    -dVersion="$Version" `
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

$msiFile = Join-Path $OutputDir "PatchIQAgent-$Version-x64.msi"

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
Write-Success "MSI created: $msiFile"

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
Write-Host ""
Write-Host "Installation:" -ForegroundColor Cyan
Write-Host "  Double-click the MSI file, or run:"
Write-Host "  msiexec /i `"$msiFile`" /qn"
Write-Host ""
Write-Host "Custom server URL (silent install):" -ForegroundColor Cyan
Write-Host "  msiexec /i `"$msiFile`" SERVERURL=`"https://your-server/api`" /qn"
Write-Host ""
