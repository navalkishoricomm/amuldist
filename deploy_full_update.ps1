$ErrorActionPreference = "Stop"

$TARGET = "root@[2602:ff16:13:104e::1]"
$REMOTE_PATH_STATIC = "/var/www/amuldist/server/static"
$REMOTE_PATH_SERVER = "/var/www/amuldist/server"

Write-Host "Deploying Full Updates..."
Write-Host "Target: $TARGET"
Write-Host "Password (if prompted): qD3eeHQaJd"

# Upload index.js (Backend)
Write-Host "Uploading server/index.js..."
scp -6 -o StrictHostKeyChecking=no server/index.js "${TARGET}:${REMOTE_PATH_SERVER}/index.js"

# Upload app.js (Main Logic)
Write-Host "Uploading server/static/app.js..."
scp -6 -o StrictHostKeyChecking=no server/static/app.js "${TARGET}:${REMOTE_PATH_STATIC}/app.js"

# Upload HTML files
Write-Host "Uploading server/static/distributor.html..."
scp -6 -o StrictHostKeyChecking=no server/static/distributor.html "${TARGET}:${REMOTE_PATH_STATIC}/distributor.html"

Write-Host "Uploading server/static/admin.html..."
scp -6 -o StrictHostKeyChecking=no server/static/admin.html "${TARGET}:${REMOTE_PATH_STATIC}/admin.html"

Write-Host "Uploading server/static/index.html..."
scp -6 -o StrictHostKeyChecking=no server/static/index.html "${TARGET}:${REMOTE_PATH_STATIC}/index.html"

Write-Host "Uploading server/static/retailer.html..."
scp -6 -o StrictHostKeyChecking=no server/static/retailer.html "${TARGET}:${REMOTE_PATH_STATIC}/retailer.html"

# Restart Server
Write-Host "Restarting Server..."
ssh -6 -o StrictHostKeyChecking=no $TARGET "pm2 restart amul-dist-server"

Write-Host "Deployment Complete!"
