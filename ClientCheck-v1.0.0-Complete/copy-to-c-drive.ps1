# Copy ClientCheck from Google Drive to C: (so npm install works reliably)
# Run in PowerShell: right-click this file -> Run with PowerShell, or:
#   powershell -ExecutionPolicy Bypass -File "copy-to-c-drive.ps1"

$src = "G:\My Drive\Client check app\ClientCheck-v1.0.0-Complete"
$dest = "C:\ClientCheck"

Write-Host "Copying project to $dest (excluding node_modules and .git)..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $dest -Force | Out-Null

# Robocopy: /E = copy subdirs including empty, /XD = exclude dirs, /NFL /NDL = less log noise
robocopy $src $dest /E /XD node_modules .git /NFL /NDL /NJH /NJS /R:2 /W:5

if ($LASTEXITCODE -ge 8) {
    Write-Host "Robocopy reported errors (code $LASTEXITCODE). Check paths." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`nDone. Project is at: $dest" -ForegroundColor Green
Write-Host "`nNext steps (run these in a new terminal):" -ForegroundColor Yellow
Write-Host "  cd C:\ClientCheck" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host "`nThen open the folder in Cursor/VS Code and use C:\ClientCheck for development.`n" -ForegroundColor Yellow
