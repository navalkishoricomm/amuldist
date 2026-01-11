$ErrorActionPreference = "Stop"

$TARGET = "root@[2602:ff16:13:104e::1]"
$REMOTE_PATH = "/var/www/amuldist"

Write-Host "Deploying Staff Login Changes..."
Write-Host "Password is: qD3eeHQaJd"

# Backend
Write-Host "Uploading server/index.js..."
scp -6 -o StrictHostKeyChecking=no server/index.js "${TARGET}:${REMOTE_PATH}/server/index.js"

# Frontend
Write-Host "Uploading server/static/staff_logic.js..."
scp -6 -o StrictHostKeyChecking=no server/static/staff_logic.js "${TARGET}:${REMOTE_PATH}/server/static/staff_logic.js"

Write-Host "Uploading server/static/distributor.html..."
scp -6 -o StrictHostKeyChecking=no server/static/distributor.html "${TARGET}:${REMOTE_PATH}/server/static/distributor.html"

Write-Host "Uploading server/static/app.js..."
scp -6 -o StrictHostKeyChecking=no server/static/app.js "${TARGET}:${REMOTE_PATH}/server/static/app.js"

Write-Host "Uploading server/static/index.html..."
scp -6 -o StrictHostKeyChecking=no server/static/index.html "${TARGET}:${REMOTE_PATH}/server/static/index.html"

# Restart Server
Write-Host "Restarting Backend..."
ssh -6 -o StrictHostKeyChecking=no $TARGET "pm2 restart amul-dist-server"

Write-Host "Done!"
