Write-Host "Retrying Zero Reset Deployment..."

# 1. Upload
Write-Host "Uploading server/reset_zero_jan3.js..."
scp -6 -o StrictHostKeyChecking=no server/reset_zero_jan3.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/reset_zero_jan3.js

if ($LASTEXITCODE -ne 0) {
    Write-Error "Upload failed! Please check your connection."
    exit 1
}

Write-Host "Upload successful. Waiting 2 seconds..."
Start-Sleep -Seconds 2

# 2. Run
Write-Host "Running Zero Reset Script..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node reset_zero_jan3.js"
