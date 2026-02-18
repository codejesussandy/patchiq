# PatchIQ Agent Installer Script
# Version: 0.1.0
# Run as Administrator: Right-click PowerShell -> Run as Administrator

<#
.SYNOPSIS
    Installs or uninstalls the PatchIQ Agent on Windows.

.DESCRIPTION
    This script installs the PatchIQ Agent as a Windows Service, configures it
    to communicate with the PatchIQ backend, and starts the local web UI.

.PARAMETER ServerUrl
    The URL of the PatchIQ backend API (default: http://localhost:3000/api)

.PARAMETER UiPort
    The port for the local web UI (default: 4504)

.PARAMETER AgentExePath
    Path to the patchiq-agent.exe file (default: same directory as script)

.PARAMETER Uninstall
    Uninstalls the PatchIQ Agent

.EXAMPLE
    .\Install-PatchIQAgent.ps1 -ServerUrl "https://patchiq.company.com/api"

.EXAMPLE
    .\Install-PatchIQAgent.ps1 -Uninstall
#>

#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [Parameter()]
    [string]$ServerUrl = "http://localhost:3000/api",

    [Parameter()]
    [int]$UiPort = 4504,

    [Parameter()]
    [string]$AgentExePath,

    [Parameter()]
    [switch]$Uninstall,

    [Parameter()]
    [switch]$Reinstall,

    [Parameter()]
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$Version = "0.1.0"

# Configuration
$InstallDir = "$env:ProgramFiles\PatchIQ"
$DataDir = "$env:ProgramData\PatchIQ"
$ServiceName = "PatchIQAgent"
$ServiceDisplayName = "PatchIQ Agent"
$ServiceDescription = "PatchIQ Endpoint Management Agent - Collects inventory, telemetry and executes deployment jobs"

# Logging functions
function Write-Step {
    param($msg)
    if (-not $Quiet) { Write-Host "[*] $msg" -ForegroundColor Cyan }
}

function Write-Success {
    param($msg)
    if (-not $Quiet) { Write-Host "[✓] $msg" -ForegroundColor Green }
}

function Write-Fail {
    param($msg)
    Write-Host "[✗] $msg" -ForegroundColor Red
}

function Write-Info {
    param($msg)
    if (-not $Quiet) { Write-Host "    $msg" -ForegroundColor Gray }
}

# Check if running as admin
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Fail "This script must be run as Administrator"
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Uninstall function
function Uninstall-PatchIQAgent {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Yellow
    Write-Host " Uninstalling PatchIQ Agent" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Yellow
    Write-Host ""

    # Stop and remove service
    $service = Get-Service $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        Write-Step "Stopping service..."
        try {
            Stop-Service $ServiceName -Force -ErrorAction Stop
            Start-Sleep -Seconds 2
        } catch {
            Write-Info "Service may already be stopped"
        }

        Write-Step "Removing service..."
        # Use sc.exe for reliable service deletion
        $result = sc.exe delete $ServiceName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Service removed"
        } else {
            Write-Info "Service removal: $result"
        }
    } else {
        Write-Info "Service not found"
    }

    # Remove firewall rule
    Write-Step "Removing firewall rule..."
    Remove-NetFirewallRule -DisplayName "PatchIQ Agent Web UI" -ErrorAction SilentlyContinue

    # Remove environment variables
    Write-Step "Removing environment variables..."
    [Environment]::SetEnvironmentVariable("PATCHIQ_DATA_DIR", $null, "Machine")
    [Environment]::SetEnvironmentVariable("PATCHIQ_SERVER_URL", $null, "Machine")

    # Remove installation directory
    if (Test-Path $InstallDir) {
        Write-Step "Removing installation directory..."
        try {
            Remove-Item -Recurse -Force $InstallDir
            Write-Success "Installation directory removed"
        } catch {
            Write-Fail "Could not remove $InstallDir - files may be in use"
        }
    }

    Write-Host ""
    Write-Success "PatchIQ Agent uninstalled successfully!"
    Write-Host ""
    Write-Host "Note: Data directory preserved at: $DataDir" -ForegroundColor Yellow
    Write-Host "To remove data: Remove-Item -Recurse -Force '$DataDir'" -ForegroundColor Gray
    Write-Host ""
}

# Install function
function Install-PatchIQAgent {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host " PatchIQ Agent Installer v$Version" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""

    # Determine source path
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    if (-not $AgentExePath) {
        $AgentExePath = Join-Path $ScriptDir "patchiq-agent.exe"
    }

    # Check if agent executable exists
    if (-not (Test-Path $AgentExePath)) {
        # Try to download from a release URL (placeholder)
        Write-Fail "Agent executable not found at: $AgentExePath"
        Write-Host ""
        Write-Host "Please ensure patchiq-agent.exe is in the same directory as this script," -ForegroundColor Yellow
        Write-Host "or specify the path using -AgentExePath parameter." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To build from source:" -ForegroundColor Cyan
        Write-Host "  cd agent"
        Write-Host "  set GOOS=windows"
        Write-Host "  set GOARCH=amd64"
        Write-Host "  go build -o patchiq-agent.exe ./cmd/agent"
        Write-Host ""
        exit 1
    }

    # Check for existing installation
    $existingService = Get-Service $ServiceName -ErrorAction SilentlyContinue
    if ($existingService -and -not $Reinstall) {
        Write-Fail "PatchIQ Agent is already installed"
        Write-Host ""
        Write-Host "To reinstall, use: .\Install-PatchIQAgent.ps1 -Reinstall" -ForegroundColor Yellow
        Write-Host "To uninstall, use: .\Install-PatchIQAgent.ps1 -Uninstall" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    if ($existingService -and $Reinstall) {
        Write-Step "Removing existing installation..."
        Uninstall-PatchIQAgent
        Write-Host ""
        Write-Host "Proceeding with fresh installation..." -ForegroundColor Cyan
        Write-Host ""
    }

    # Create directories
    Write-Step "Creating directories..."
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    New-Item -ItemType Directory -Force -Path "$InstallDir\logs" | Out-Null
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    New-Item -ItemType Directory -Force -Path "$DataDir\config" | Out-Null
    Write-Info "Installation: $InstallDir"
    Write-Info "Data:         $DataDir"

    # Copy files
    Write-Step "Copying files..."
    Copy-Item $AgentExePath "$InstallDir\patchiq-agent.exe" -Force
    Write-Info "patchiq-agent.exe copied"

    # Create configuration file
    Write-Step "Creating configuration..."
    $config = @{
        serverUrl                 = $ServerUrl
        webUiPort                 = $UiPort
        enableWebUi               = $true
        heartbeatIntervalSeconds  = 60
        inventoryIntervalSeconds  = 21600
        telemetryIntervalSeconds  = 60
        collectHardware           = $true
        collectSoftware           = $true
        collectNetwork            = $true
        collectSecurity           = $true
        collectPeripherals        = $true
        collectTelemetry          = $true
        logLevel                  = "info"
        dataDir                   = $DataDir
    }
    $config | ConvertTo-Json -Depth 3 | Out-File -FilePath "$DataDir\config\config.json" -Encoding UTF8
    Write-Info "Configuration saved to $DataDir\config\config.json"

    # Set environment variables
    Write-Step "Setting environment variables..."
    [Environment]::SetEnvironmentVariable("PATCHIQ_DATA_DIR", $DataDir, "Machine")
    [Environment]::SetEnvironmentVariable("PATCHIQ_SERVER_URL", $ServerUrl, "Machine")
    Write-Info "PATCHIQ_DATA_DIR = $DataDir"
    Write-Info "PATCHIQ_SERVER_URL = $ServerUrl"

    # Create Windows Service using sc.exe (more reliable than PowerShell)
    Write-Step "Installing Windows service..."
    $exePath = "$InstallDir\patchiq-agent.exe"
    $binPath = "`"$exePath`" -service"

    # Create service
    $result = sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= "$ServiceDisplayName" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Failed to create service: $result"
        exit 1
    }

    # Set service description
    sc.exe description $ServiceName "$ServiceDescription" | Out-Null

    # Configure service recovery (restart on failure)
    sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null

    Write-Success "Service installed"

    # Start service
    Write-Step "Starting service..."
    Start-Service $ServiceName
    Start-Sleep -Seconds 2

    $service = Get-Service $ServiceName
    if ($service.Status -eq "Running") {
        Write-Success "Service started successfully"
    } else {
        Write-Fail "Service failed to start. Status: $($service.Status)"
        Write-Host "Check Windows Event Viewer for details" -ForegroundColor Yellow
    }

    # Configure firewall
    Write-Step "Configuring firewall..."
    Remove-NetFirewallRule -DisplayName "PatchIQ Agent Web UI" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "PatchIQ Agent Web UI" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $UiPort `
        -Action Allow `
        -Profile Private,Domain `
        | Out-Null
    Write-Info "Firewall rule created for port $UiPort"

    # Summary
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Success "Installation Complete!"
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Cyan
    Write-Host "  Installation Directory: $InstallDir"
    Write-Host "  Data Directory:         $DataDir"
    Write-Host "  Backend Server:         $ServerUrl"
    Write-Host "  Web UI:                 http://localhost:$UiPort"
    Write-Host ""
    Write-Host "Service Status:" -ForegroundColor Cyan
    Get-Service $ServiceName | Format-Table Name, Status, StartType -AutoSize
    Write-Host ""
    Write-Host "Quick Links:" -ForegroundColor Cyan
    Write-Host "  Open Web UI:  Start-Process http://localhost:$UiPort"
    Write-Host "  View Logs:    Get-Content '$InstallDir\logs\agent.log' -Tail 50"
    Write-Host "  Stop Service: Stop-Service $ServiceName"
    Write-Host "  Start Service: Start-Service $ServiceName"
    Write-Host ""
    Write-Host "To uninstall:" -ForegroundColor Yellow
    Write-Host "  .\Install-PatchIQAgent.ps1 -Uninstall"
    Write-Host ""
}

# Main execution
if ($Uninstall) {
    Uninstall-PatchIQAgent
} else {
    Install-PatchIQAgent
}
