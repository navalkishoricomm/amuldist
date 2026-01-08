$ErrorActionPreference = "Stop"
$ServerHost = "2602:ff16:13:104e::1"
$User = "root"
$RemotePath = "/var/www/amuldist"
$LocalArchive = "server_restore.tar.gz"

Write-Host "=========================================="
Write-Host "   RESTORING APP FROM REMOTE SERVER"
Write-Host "=========================================="
Write-Host "Server: $ServerHost"
Write-Host "User:   $User"
Write-Host "Password: qD3eeHQaJd"
Write-Host "------------------------------------------"

# 1. Compressing remote files (excluding node_modules to save time)
Write-Host "`n[1/4] Compressing remote files..."
ssh -6 -o StrictHostKeyChecking=no "$User@$ServerHost" "tar --exclude='server/node_modules' -czf /tmp/$LocalArchive -C $RemotePath server"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to compress remote files. Check password and connection."
    exit 1
}

# 2. Download the archive
Write-Host "`n[2/4] Downloading backup..."
scp -6 -o StrictHostKeyChecking=no "$User@[$ServerHost]:/tmp/$LocalArchive" .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to download backup."
    exit 1
}

# 3. Extract to local folder
Write-Host "`n[3/4] Extracting files..."
# Rename current server folder to server_old_backup just in case
if (Test-Path "server") {
    if (Test-Path "server_old_backup") { Remove-Item "server_old_backup" -Recurse -Force }
    Rename-Item "server" "server_old_backup"
}

tar -xzf $LocalArchive

# Restore node_modules if they existed, or run npm install
if (Test-Path "server_old_backup/node_modules") {
    Write-Host "Restoring node_modules..."
    Move-Item "server_old_backup/node_modules" "server/node_modules"
} else {
    Write-Host "Installing dependencies..."
    cd server
    npm install
    cd ..
}

# Restore .env if it existed
if (Test-Path "server_old_backup/.env") {
    Copy-Item "server_old_backup/.env" "server/.env"
}

# 4. Cleanup
Write-Host "`n[4/4] Cleaning up..."
Remove-Item $LocalArchive
ssh -6 -o StrictHostKeyChecking=no "$User@$ServerHost" "rm /tmp/$LocalArchive"

Write-Host "`n=========================================="
Write-Host "   RESTORATION COMPLETE"
Write-Host "=========================================="
Write-Host "You can now restart the server."
