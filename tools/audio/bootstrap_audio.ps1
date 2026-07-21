# tools/audio/bootstrap_audio.ps1
# Windows PowerShell bootstrap script for ChillPup audio toolchain (.venv-audio)

$ErrorActionPreference = "Stop"

Write-Host "=== ChillPup Audio Toolchain Environment Bootstrap ===" -ForegroundColor Cyan

# 1. Locate Python 3.11+
$pythonCmd = $null
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    $verOut = & python --version 2>&1
    if ($verOut -match "Python (\d+)\.(\d+)") {
        $major = [int]$Matches[1]
        $minor = [int]$Matches[2]
        if ($major -ge 3 -and $minor -ge 11) {
            $pythonCmd = "python"
        }
    }
}

if (-not $pythonCmd -and (Get-Command "py" -ErrorAction SilentlyContinue)) {
    $verOut = & py -3.11 --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pythonCmd = "py -3.11"
    } else {
        $verOut = & py -3 --version 2>&1
        if ($verOut -match "Python (\d+)\.(\d+)") {
            if ([int]$Matches[1] -ge 3 -and [int]$Matches[2] -ge 11) {
                $pythonCmd = "py -3"
            }
        }
    }
}

if (-not $pythonCmd) {
    Write-Host "[ERROR] Python 3.11 or newer is required but was not found." -ForegroundColor Red
    Write-Host "Please install Python 3.11+ from https://www.python.org/downloads/ or via winget:" -ForegroundColor Yellow
    Write-Host "  winget install Python.Python.3.11" -ForegroundColor Yellow
    exit 1
}

Write-Host "[INFO] Using Python command: $pythonCmd" -ForegroundColor Green

# 2. Check/Create .venv-audio
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$venvDir = Join-Path $repoRoot ".venv-audio"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "[INFO] Creating virtual environment at $venvDir..." -ForegroundColor Yellow
    Invoke-Expression "$pythonCmd -m venv `"$venvDir`""
    if (-not (Test-Path $venvPython)) {
        Write-Host "[ERROR] Failed to create virtual environment." -ForegroundColor Red
        exit 1
    }
}

Write-Host "[INFO] Virtual environment ready at $venvDir" -ForegroundColor Green

# 3. Upgrade pip and install requirements
Write-Host "[INFO] Upgrading pip inside virtual environment..." -ForegroundColor Yellow
& "$venvPython" -m pip install --upgrade pip --quiet

$reqPath = Join-Path $PSScriptRoot "requirements.txt"
Write-Host "[INFO] Installing dependencies from $reqPath..." -ForegroundColor Yellow
& "$venvPython" -m pip install -r "$reqPath"

# 4. Verify FFmpeg and FFprobe
$ffmpegOk = $true
if (-not (Get-Command "ffmpeg" -ErrorAction SilentlyContinue)) {
    Write-Host "[WARNING] ffmpeg was not found in PATH." -ForegroundColor Red
    $ffmpegOk = $false
}
if (-not (Get-Command "ffprobe" -ErrorAction SilentlyContinue)) {
    Write-Host "[WARNING] ffprobe was not found in PATH." -ForegroundColor Red
    $ffmpegOk = $false
}

if (-not $ffmpegOk) {
    Write-Host "`n[PREREQUISITE ACTION REQUIRED]" -ForegroundColor Yellow
    Write-Host "FFmpeg and FFprobe are required for encoding M4A listening copies and LUFS QA analysis." -ForegroundColor Yellow
    Write-Host "To install FFmpeg on Windows using winget:" -ForegroundColor Cyan
    Write-Host "  winget install Gyan.FFmpeg" -ForegroundColor Cyan
    Write-Host "  (or choco install ffmpeg / scoop install ffmpeg)" -ForegroundColor Cyan
    Write-Host "After installation, restart PowerShell and re-run bootstrap:`n" -ForegroundColor Yellow
    Write-Host "  .\tools\audio\bootstrap_audio.ps1`n" -ForegroundColor Cyan
    exit 1
} else {
    $ffmpegVer = & ffmpeg -version | Select-Object -First 1
    Write-Host "[INFO] FFmpeg verified: $ffmpegVer" -ForegroundColor Green
}

Write-Host "`n=== Environment Bootstrap Complete ===" -ForegroundColor Green
Write-Host "Virtual Environment Python: $venvPython" -ForegroundColor Cyan
Write-Host "To run generation:" -ForegroundColor Cyan
Write-Host "  & `"$venvPython`" tools/audio/generate_candidates.py" -ForegroundColor Cyan
