Write-Host "Deploying Force Zero Script v2..."

# 1. Upload
Write-Host "Uploading server/force_zero_v2.js..."
scp -6 -o StrictHostKeyChecking=no server/force_zero_v2.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/force_zero_v2.js

if ($LASTEXITCODE -ne 0) {
    Write-Error "Upload failed!"
    exit 1
}

# 2. Run
Write-Host "Running Force Zero..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node force_zero_v2.js"
