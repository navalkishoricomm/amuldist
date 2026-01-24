$ErrorActionPreference = "Stop"

$TARGET = "root@[2602:ff16:13:104e::1]"
$REMOTE_BASE = "/var/www/amuldist"

Write-Host "Preparing Patch Package..."

# Create temp structure
$TEMP_DIR = "deploy_patch_temp"
if (Test-Path $TEMP_DIR) { Remove-Item $TEMP_DIR -Recurse -Force }
New-Item -ItemType Directory -Path "$TEMP_DIR/server/static" -Force | Out-Null

# Copy ONLY modified/needed files
Write-Host "Copying files to temp..."
Copy-Item "server/index.js" "$TEMP_DIR/server/"
Copy-Item "server/fix_email_index.js" "$TEMP_DIR/server/"
Copy-Item "server/static/app.js" "$TEMP_DIR/server/static/"
Copy-Item "server/static/distributor.html" "$TEMP_DIR/server/static/"

# Create Tarball
Write-Host "Creating archive..."
tar -czf deploy_patch.tar.gz -C $TEMP_DIR server

# Upload
Write-Host "Uploading patch package (Enter Password)..."
Write-Host "Target: $TARGET"
scp deploy_patch.tar.gz "${TARGET}:${REMOTE_BASE}/"

# Execute Remote Commands
# 1. Extract
# 2. Run Index Fix
# 3. Restart Server
# NOTE: We are explicitly skipping migrate_products.js to avoid overwriting DB data
$REMOTE_CMD = "cd ${REMOTE_BASE} && tar -xzf deploy_patch.tar.gz && rm deploy_patch.tar.gz && echo 'Running DB Index Fix...' && node server/fix_email_index.js && pm2 restart amul-dist-server"

Write-Host "Applying Patch on Remote..."
ssh $TARGET $REMOTE_CMD

# Cleanup
Remove-Item $TEMP_DIR -Recurse -Force
Remove-Item "deploy_patch.tar.gz" -Force

Write-Host "Patch Deployed Successfully!"