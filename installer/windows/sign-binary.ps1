<#
.SYNOPSIS
    Signs Windows binaries with Authenticode certificate

.DESCRIPTION
    This script signs Windows executables and MSI installers with an Authenticode
    certificate. It includes timestamp server validation to ensure signatures
    remain valid after certificate expiration.

.PARAMETER CertificatePath
    Path to the PFX certificate file

.PARAMETER Password
    Password for the PFX certificate (use SecureString in production)

.PARAMETER FilePath
    Path to the file to sign (supports .exe and .msi)

.PARAMETER TimestampServer
    RFC3161 timestamp server URL (default: http://timestamp.digicert.com)

.PARAMETER Verify
    Verify signature after signing (default: true)

.EXAMPLE
    .\sign-binary.ps1 -CertificatePath "cert.pfx" -Password "secret" -FilePath "patchify-agent.exe"

.EXAMPLE
    .\sign-binary.ps1 -CertificatePath "cert.pfx" -Password "secret" -FilePath "PatchIQAgent.msi" -Verify $true

.NOTES
    Requires: Windows SDK (for signtool.exe)
    Version: 1.0.0
    Author: PatchIQ Team
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$CertificatePath,

    [Parameter(Mandatory=$true)]
    [string]$Password,

    [Parameter(Mandatory=$true)]
    [string]$FilePath,

    [Parameter(Mandatory=$false)]
    [string]$TimestampServer = "http://timestamp.digicert.com",

    [Parameter(Mandatory=$false)]
    [bool]$Verify = $true
)

# Error handling
$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Find-SignTool {
    Write-Log "Searching for signtool.exe..."

    # Common locations for signtool.exe (Windows SDK)
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

    # Try PATH
    $pathSignTool = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($pathSignTool) {
        Write-Log "Found signtool.exe in PATH: $($pathSignTool.Source)"
        return $pathSignTool.Source
    }

    throw "signtool.exe not found. Please install Windows SDK."
}

function Test-Certificate {
    param([string]$CertPath, [string]$CertPassword)

    Write-Log "Validating certificate..."

    if (-not (Test-Path $CertPath)) {
        throw "Certificate file not found: $CertPath"
    }

    # Try to load the certificate to validate password
    try {
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
        $cert.Import($CertPath, $CertPassword, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::DefaultKeySet)

        Write-Log "Certificate loaded successfully"
        Write-Log "Subject: $($cert.Subject)"
        Write-Log "Issuer: $($cert.Issuer)"
        Write-Log "Valid from: $($cert.NotBefore) to $($cert.NotAfter)"

        if ($cert.NotAfter -lt (Get-Date)) {
            throw "Certificate has expired on $($cert.NotAfter)"
        }

        if ($cert.NotBefore -gt (Get-Date)) {
            throw "Certificate is not yet valid (valid from $($cert.NotBefore))"
        }

        $daysUntilExpiry = ($cert.NotAfter - (Get-Date)).Days
        if ($daysUntilExpiry -lt 30) {
            Write-Log "WARNING: Certificate expires in $daysUntilExpiry days" -Level "WARN"
        }

        return $true
    }
    catch {
        throw "Failed to validate certificate: $_"
    }
}

function Sign-File {
    param([string]$SignToolPath, [string]$CertPath, [string]$CertPassword, [string]$File, [string]$Timestamp)

    Write-Log "Signing file: $File"

    if (-not (Test-Path $File)) {
        throw "File not found: $File"
    }

    # Build signtool command
    # /f = certificate file
    # /p = password
    # /tr = RFC3161 timestamp server
    # /td = timestamp digest algorithm
    # /fd = file digest algorithm
    # /v = verbose output
    $arguments = @(
        "sign",
        "/f", "`"$CertPath`"",
        "/p", "`"$CertPassword`"",
        "/tr", "`"$Timestamp`"",
        "/td", "sha256",
        "/fd", "sha256",
        "/v",
        "`"$File`""
    )

    Write-Log "Executing: signtool.exe $($arguments -join ' ')"

    # Execute signing
    $process = Start-Process -FilePath $SignToolPath -ArgumentList $arguments -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        throw "Signing failed with exit code: $($process.ExitCode)"
    }

    Write-Log "File signed successfully: $File" -Level "SUCCESS"
}

function Verify-Signature {
    param([string]$SignToolPath, [string]$File)

    Write-Log "Verifying signature for: $File"

    # /pa = verify against Windows Authenticode policy
    # /v = verbose output
    $arguments = @(
        "verify",
        "/pa",
        "/v",
        "`"$File`""
    )

    Write-Log "Executing: signtool.exe $($arguments -join ' ')"

    $process = Start-Process -FilePath $SignToolPath -ArgumentList $arguments -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        throw "Signature verification failed with exit code: $($process.ExitCode)"
    }

    Write-Log "Signature verified successfully" -Level "SUCCESS"
}

# Main execution
try {
    Write-Log "========================================" -Level "INFO"
    Write-Log "Windows Authenticode Signing Script" -Level "INFO"
    Write-Log "========================================" -Level "INFO"

    # Step 1: Find signtool.exe
    $signToolPath = Find-SignTool

    # Step 2: Validate certificate
    Test-Certificate -CertPath $CertificatePath -CertPassword $Password

    # Step 3: Sign the file
    Sign-File -SignToolPath $signToolPath -CertPath $CertificatePath -CertPassword $Password -File $FilePath -Timestamp $TimestampServer

    # Step 4: Verify signature (optional)
    if ($Verify) {
        Verify-Signature -SignToolPath $signToolPath -File $FilePath
    }

    Write-Log "========================================" -Level "INFO"
    Write-Log "Signing completed successfully!" -Level "SUCCESS"
    Write-Log "========================================" -Level "INFO"

    exit 0
}
catch {
    Write-Log "ERROR: $_" -Level "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level "ERROR"
    exit 1
}
