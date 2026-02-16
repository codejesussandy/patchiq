#!/bin/bash
# Windows Executor E2E Test Script (PowerShell)
# Note: This is a bash script that generates PowerShell test commands
# Run the generated PowerShell script on Windows

cat > windows_executor_test.ps1 << 'EOF'
# Windows Executor E2E Test Script
# Tests all Windows package managers with real packages

$ErrorActionPreference = "Continue"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Windows Executor E2E Test Suite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test counters
$TotalTests = 0
$PassedTests = 0
$FailedTests = 0

# Helper function to run a test
function Run-Test {
    param(
        [string]$TestName,
        [scriptblock]$TestCommand
    )

    $script:TotalTests++
    Write-Host "[$script:TotalTests] Testing: $TestName... " -NoNewline

    try {
        $result = & $TestCommand 2>&1
        if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
            Write-Host "PASS" -ForegroundColor Green
            $script:PassedTests++
            return $true
        } else {
            throw "Exit code: $LASTEXITCODE"
        }
    } catch {
        Write-Host "FAIL" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        $script:FailedTests++
        return $false
    }
}

# Helper to verify package installed
function Test-PackageInstalled {
    param(
        [string]$PackageName,
        [string]$PackageManager
    )

    switch ($PackageManager) {
        "winget" {
            $output = winget list --id $PackageName 2>&1
            return $output -match $PackageName
        }
        "choco" {
            $output = choco list --local-only $PackageName 2>&1
            return $output -match $PackageName
        }
        default {
            return Test-Path "C:\Program Files\$PackageName" -or Test-Path "C:\Program Files (x86)\$PackageName"
        }
    }
}

Write-Host "=== Test 1: Winget Package Manager ===" -ForegroundColor Cyan
Write-Host ""

# Check if winget is available
if (Get-Command winget -ErrorAction SilentlyContinue) {
    # Test 1.1: Install 7-Zip via winget
    Run-Test "winget install 7zip" {
        winget install -e --id 7zip.7zip --accept-package-agreements --accept-source-agreements --silent
    }

    # Test 1.2: Verify 7-Zip installed
    Run-Test "verify 7-Zip installation" {
        if (Test-PackageInstalled "7zip.7zip" "winget") {
            exit 0
        } else {
            throw "7-Zip not found"
        }
    }

    # Test 1.3: Uninstall 7-Zip
    Run-Test "winget uninstall 7zip" {
        winget uninstall --id 7zip.7zip --silent
    }

    # Test 1.4: Verify 7-Zip removed
    $script:TotalTests++
    Write-Host "[$script:TotalTests] Testing: verify 7-Zip removal... " -NoNewline
    if (Test-PackageInstalled "7zip.7zip" "winget") {
        Write-Host "FAIL" -ForegroundColor Red
        $script:FailedTests++
    } else {
        Write-Host "PASS" -ForegroundColor Green
        $script:PassedTests++
    }
} else {
    Write-Host "WARNING: winget not available, skipping winget tests" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test 2: Chocolatey Package Manager ===" -ForegroundColor Cyan
Write-Host ""

# Check if chocolatey is available
if (Get-Command choco -ErrorAction SilentlyContinue) {
    # Test 2.1: Install Notepad++ via chocolatey
    Run-Test "choco install notepadplusplus" {
        choco install notepadplusplus -y
    }

    # Test 2.2: Verify Notepad++ installed
    Run-Test "verify Notepad++ installation" {
        if (Test-PackageInstalled "notepadplusplus" "choco") {
            exit 0
        } else {
            throw "Notepad++ not found"
        }
    }

    # Test 2.3: Uninstall Notepad++
    Run-Test "choco uninstall notepadplusplus" {
        choco uninstall notepadplusplus -y
    }

    # Test 2.4: Verify Notepad++ removed
    $script:TotalTests++
    Write-Host "[$script:TotalTests] Testing: verify Notepad++ removal... " -NoNewline
    if (Test-PackageInstalled "notepadplusplus" "choco") {
        Write-Host "FAIL" -ForegroundColor Red
        $script:FailedTests++
    } else {
        Write-Host "PASS" -ForegroundColor Green
        $script:PassedTests++
    }
} else {
    Write-Host "WARNING: Chocolatey not available, skipping choco tests" -ForegroundColor Yellow
    Write-Host "         Install with: Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
}

Write-Host ""
Write-Host "=== Test 3: MSI Installer ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "INFO: MSI installer tests require actual .msi files" -ForegroundColor Yellow
Write-Host "      Manual test: Download a .msi file and test with:"
Write-Host "      msiexec /i package.msi /quiet /norestart"

Write-Host ""
Write-Host "=== Test 4: EXE Installer ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "INFO: EXE installer tests require actual .exe files" -ForegroundColor Yellow
Write-Host "      Manual test: Download a .exe installer and test with:"
Write-Host "      installer.exe /S /silent"

Write-Host ""
Write-Host "=== Test 5: Hub-Centric Script Bundle ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "INFO: Hub-centric bundle test requires bundle creation first" -ForegroundColor Yellow
Write-Host "      See test/create_test_bundle.sh"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Total Tests:  $TotalTests"
Write-Host "Passed:       $PassedTests" -ForegroundColor Green
Write-Host "Failed:       $FailedTests" -ForegroundColor Red
Write-Host ""

if ($FailedTests -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed" -ForegroundColor Red
    exit 1
}
EOF

echo "Generated PowerShell test script: windows_executor_test.ps1"
echo "To run on Windows:"
echo "  1. Copy windows_executor_test.ps1 to a Windows machine"
echo "  2. Open PowerShell as Administrator"
echo "  3. Run: .\windows_executor_test.ps1"

chmod +x windows_executor_test.ps1
