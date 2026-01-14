$ErrorActionPreference = "Stop"

$TARGET = "root@[2602:ff16:13:104e::1]"
$REMOTE_BASE = "/var/www/amuldist"

Write-Host "Preparing Update Package..."

# Create temp structure
$TEMP_DIR = "deploy_temp"
if (Test-Path $TEMP_DIR) { Remove-Item $TEMP_DIR -Recurse -Force }
New-Item -ItemType Directory -Path "$TEMP_DIR/server/static" -Force | Out-Null

# Copy files
Write-Host "Copying files to temp..."
Copy-Item "server/index.js" "$TEMP_DIR/server/"
Copy-Item "server/migrate_products.js" "$TEMP_DIR/server/"
Copy-Item "server/static/app.js" "$TEMP_DIR/server/static/"
Copy-Item "server/static/distributor.html" "$TEMP_DIR/server/static/"
Copy-Item "server/static/admin.html" "$TEMP_DIR/server/static/"
Copy-Item "server/static/index.html" "$TEMP_DIR/server/static/"
Copy-Item "server/static/retailer.html" "$TEMP_DIR/server/static/"

# Create Tarball
Write-Host "Creating archive..."
tar -czf deploy.tar.gz -C $TEMP_DIR server

# Upload
Write-Host "Uploading update package (Enter Password)..."
Write-Host "Target: $TARGET"
Write-Host "Password: qD3eeHQaJd"
scp -6 -o StrictHostKeyChecking=no deploy.tar.gz "${TARGET}:${REMOTE_BASE}/deploy.tar.gz"

# Deploy, Migrate, and Restart
Write-Host "Extracting, Migrating DB, and Restarting Server (Enter Password again)..."
$REMOTE_CMD = "cd ${REMOTE_BASE} && tar -xzf deploy.tar.gz && rm deploy.tar.gz && echo 'Running Migration...' && node server/migrate_products.js && pm2 restart amul-dist-server"
ssh -6 -o StrictHostKeyChecking=no $TARGET $REMOTE_CMD

# Cleanup
Write-Host "Cleaning up local files..."
Remove-Item $TEMP_DIR -Recurse -Force
Remove-Item "deploy.tar.gz" -Force

Write-Host "Deployment Complete!"
