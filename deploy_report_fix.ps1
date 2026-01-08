$ErrorActionPreference = "Stop"

$TARGET = "root@[2602:ff16:13:104e::1]"
$REMOTE_PATH = "/var/www/amuldist"

Write-Host "Deploying Report Fix..."
Write-Host "Password is: qD3eeHQaJd"

Write-Host "Uploading server/static/app.js..."
scp -6 -o StrictHostKeyChecking=no server/static/app.js "${TARGET}:${REMOTE_PATH}/server/static/app.js"

# Restart Server
Write-Host "Restarting Backend..."
ssh -6 -o StrictHostKeyChecking=no $TARGET "pm2 restart amul-dist-server"

Write-Host "Done!"