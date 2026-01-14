$ErrorActionPreference = "Stop"
$TARGET = "root@[2602:ff16:13:104e::1]"
$REMOTE_BASE = "/var/www/amuldist"

Write-Host "Retrying Server-Side Operations..."
Write-Host "Target: $TARGET"
Write-Host "This will extract the uploaded file (if present), migrate the database, and restart the server."
Write-Host "Password: qD3eeHQaJd"

# Command logic:
# 1. Go to directory
# 2. Extract and remove tarball IF it exists (in case it was uploaded but not extracted)
# 3. Run migration
# 4. Restart server
$REMOTE_CMD = "cd ${REMOTE_BASE} && (if [ -f deploy.tar.gz ]; then echo 'Found update package, extracting...'; tar -xzf deploy.tar.gz && rm deploy.tar.gz; fi) && echo 'Running Migration...' && node server/migrate_products.js && pm2 restart amul-dist-server"

ssh -6 -o StrictHostKeyChecking=no -o ConnectTimeout=60 $TARGET $REMOTE_CMD

Write-Host "Done!"
