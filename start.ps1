# Stock Dashboard - PowerShell launcher
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Start backend
$server = Start-Process -FilePath "node" -ArgumentList "server.js" `
  -WorkingDirectory $root -PassThru -WindowStyle Hidden

Write-Host "Backend started (PID $($server.Id))"

# Open browser after a short delay
Start-Job -ScriptBlock {
  Start-Sleep -Seconds 3
  Start-Process "http://localhost:5173"
} | Out-Null

Write-Host "Starting frontend... (Ctrl+C to stop)"

try {
  Push-Location "$root\client"
  npm run dev
} finally {
  Pop-Location
  Write-Host "Shutting down..."
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
