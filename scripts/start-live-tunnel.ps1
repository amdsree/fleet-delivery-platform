# ==============================================================================
# INSTANT LIVE ONLINE TUNNEL SCRIPT
# Exposes your local Fleet Platform to the live public Internet with HTTPS
# ==============================================================================

$NodeDir = "C:\Users\Sreejith BS\.gemini\antigravity\scratch\tools\node"
if (Test-Path $NodeDir) {
    $env:PATH = "$NodeDir;" + $env:PATH
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   FLEET PLATFORM: INSTANT PUBLIC HTTPS TUNNEL LAUNCHER    " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Exposing Backend (Port 4000) and Web Dashboard (Port 3000)..." -ForegroundColor Yellow
Write-Host ""

# Start backend tunnel in background job
$BackendJob = Start-Job -ScriptBlock {
    param($node)
    $env:PATH = "$node;" + $env:PATH
    npx --yes localtunnel --port 4000
} -ArgumentList $NodeDir

# Start frontend tunnel in background job
$WebJob = Start-Job -ScriptBlock {
    param($node)
    $env:PATH = "$node;" + $env:PATH
    npx --yes localtunnel --port 3000
} -ArgumentList $NodeDir

Start-Sleep -Seconds 4

Write-Host "Fetching public live HTTPS URLs..." -ForegroundColor Cyan
$BackendOutput = Receive-Job -Job $BackendJob
$WebOutput = Receive-Job -Job $WebJob

Write-Host ""
Write-Host "Backend API Live URL:      $BackendOutput" -ForegroundColor Green
Write-Host "Admin Web Live URL:        $WebOutput" -ForegroundColor Green
Write-Host ""
Write-Host "Share the Admin Web URL with supervisors or scan QR to install on Android!" -ForegroundColor White
Write-Host "Press Ctrl+C to terminate the live tunnel." -ForegroundColor Gray

# Keep running
try {
    while ($true) {
        Start-Sleep -Seconds 5
    }
} finally {
    Stop-Job -Job $BackendJob, $WebJob
    Remove-Job -Job $BackendJob, $WebJob
    Write-Host "Live tunnels stopped." -ForegroundColor Red
}
