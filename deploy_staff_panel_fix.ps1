$ErrorActionPreference = "Stop"

$TARGET = "root@[2602:ff16:13:104e::1]"
$REMOTE_PATH = "/var/www/amuldist/server/static"

Write-Host "Deploying Staff Panel Fixes..."
Write-Host "Target: $TARGET"
Write-Host "Password (if prompted): qD3eeHQaJd"

# Upload app.js
Write-Host "Uploading server/static/app.js..."
scp -6 -o StrictHostKeyChecking=no server/static/app.js "${TARGET}:${REMOTE_PATH}/app.js"

# Restart Server
Write-Host "Restarting Server..."
ssh -6 -o StrictHostKeyChecking=no $TARGET "pm2 restart amul-dist-server"

Write-Host "Deployment Complete!"
