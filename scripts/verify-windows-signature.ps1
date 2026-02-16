<#
.SYNOPSIS
    Verifies Authenticode signatures on Windows binaries

.DESCRIPTION
    This script verifies that Windows executables and MSI installers have valid
    Authenticode signatures. It checks signature validity, timestamp, and certificate chain.

.PARAMETER FilePath
    Path to the file to verify (supports .exe and .msi)

.PARAMETER Strict
    Enable strict mode (requires valid timestamp and non-expired certificate)

.EXAMPLE
    .\verify-windows-signature.ps1 -FilePath "patchify-agent.exe"

.EXAMPLE
    .\verify-windows-signature.ps1 -FilePath "PatchIQAgent.msi" -Strict $true

.NOTES
    Requires: Windows SDK (for signtool.exe)
    Version: 1.0.0
    Author: PatchIQ Team
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath,

    [Parameter(Mandatory=$false)]
    [bool]$Strict = $false
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Find-SignTool {
    Write-Log "Searching for signtool.exe..."

    $possiblePaths = @(
        "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe",
        "C:\Program Files (x86)\Windows Kits\10\App Certification Kit\signtool.exe",
        "C:\Program Files\Microsoft SDKs\Windows\*\bin\signtool.exe"
    )

    foreach ($pattern in $possiblePaths) {
        $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue |
                 Sort-Object -Property FullName -Descending |
                 Select-Object -First 1

        if ($found) {
            Write-Log "Found signtool.exe at: $($found.FullName)"
            return $found.FullName
        }
    }

    $pathSignTool = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($pathSignTool) {
        Write-Log "Found signtool.exe in PATH: $($pathSignTool.Source)"
        return $pathSignTool.Source
    }

    throw "signtool.exe not found. Please install Windows SDK."
}

function Verify-Signature {
    param([string]$SignToolPath, [string]$File)

    Write-Log "Verifying file: $File"

    if (-not (Test-Path $File)) {
        throw "File not found: $File"
    }

    # Get file info
    $fileInfo = Get-Item $File
    Write-Log "File size: $($fileInfo.Length) bytes"
    Write-Log "Last modified: $($fileInfo.LastWriteTime)"

    # Verify with signtool
    $arguments = @(
        "verify",
        "/pa",  # Verify against Authenticode policy
        "/v",   # Verbose output
        "`"$File`""
    )

    Write-Log "Executing: signtool.exe $($arguments -join ' ')"

    # Capture output
    $output = & $SignToolPath $arguments 2>&1
    $exitCode = $LASTEXITCODE

    # Display output
    Write-Host "`n--- SignTool Output ---"
    Write-Host $output
    Write-Host "--- End Output ---`n"

    if ($exitCode -ne 0) {
        throw "Signature verification failed with exit code: $exitCode"
    }

    Write-Log "Signature verified successfully" -Level "SUCCESS"
}

function Get-SignatureDetails {
    param([string]$File)

    Write-Log "Extracting signature details..."

    try {
        $signature = Get-AuthenticodeSignature -FilePath $File

        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "Signature Details" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan

        Write-Host "Status: $($signature.Status)" -ForegroundColor $(if ($signature.Status -eq "Valid") { "Green" } else { "Red" })
        Write-Host "Status Message: $($signature.StatusMessage)"

        if ($signature.SignerCertificate) {
            $cert = $signature.SignerCertificate
            Write-Host "`nCertificate Information:"
            Write-Host "  Subject: $($cert.Subject)"
            Write-Host "  Issuer: $($cert.Issuer)"
            Write-Host "  Thumbprint: $($cert.Thumbprint)"
            Write-Host "  Serial Number: $($cert.SerialNumber)"
            Write-Host "  Valid From: $($cert.NotBefore)"
            Write-Host "  Valid To: $($cert.NotAfter)"

            $daysUntilExpiry = ($cert.NotAfter - (Get-Date)).Days
            if ($daysUntilExpiry -lt 0) {
                Write-Host "  Expiry Status: EXPIRED $([Math]::Abs($daysUntilExpiry)) days ago" -ForegroundColor Red
            } elseif ($daysUntilExpiry -lt 30) {
                Write-Host "  Expiry Status: Expires in $daysUntilExpiry days" -ForegroundColor Yellow
            } else {
                Write-Host "  Expiry Status: Valid for $daysUntilExpiry days" -ForegroundColor Green
            }
        }

        if ($signature.TimeStamperCertificate) {
            $tsCert = $signature.TimeStamperCertificate
            Write-Host "`nTimestamp Information:"
            Write-Host "  Timestamp Server: $($tsCert.Subject)"
            Write-Host "  Timestamp Issuer: $($tsCert.Issuer)"
            Write-Host "  Timestamp Valid From: $($tsCert.NotBefore)"
            Write-Host "  Timestamp Valid To: $($tsCert.NotAfter)"
        } else {
            Write-Host "`nTimestamp Information: NOT TIMESTAMPED" -ForegroundColor Yellow
        }

        Write-Host "========================================`n" -ForegroundColor Cyan

        # Strict mode checks
        if ($Strict) {
            Write-Log "Running strict mode checks..." -Level "INFO"

            if ($signature.Status -ne "Valid") {
                throw "Strict mode: Signature status is not Valid: $($signature.Status)"
            }

            if (-not $signature.TimeStamperCertificate) {
                throw "Strict mode: Signature is not timestamped"
            }

            if ($signature.SignerCertificate.NotAfter -lt (Get-Date)) {
                throw "Strict mode: Signing certificate has expired"
            }

            Write-Log "All strict mode checks passed" -Level "SUCCESS"
        }

        return $signature
    }
    catch {
        Write-Log "Failed to extract signature details: $_" -Level "ERROR"
        throw
    }
}

# Main execution
try {
    Write-Log "========================================" -Level "INFO"
    Write-Log "Windows Signature Verification Script" -Level "INFO"
    Write-Log "========================================" -Level "INFO"

    # Step 1: Find signtool.exe
    $signToolPath = Find-SignTool

    # Step 2: Verify signature with signtool
    Verify-Signature -SignToolPath $signToolPath -File $FilePath

    # Step 3: Get detailed signature information
    $signature = Get-SignatureDetails -File $FilePath

    Write-Log "========================================" -Level "INFO"
    Write-Log "Verification completed successfully!" -Level "SUCCESS"
    Write-Log "========================================" -Level "INFO"

    exit 0
}
catch {
    Write-Log "ERROR: $_" -Level "ERROR"
    exit 1
}
