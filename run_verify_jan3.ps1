Write-Host "Deploying Verification Script..."

# 1. Upload
Write-Host "Uploading server/verify_jan3_stock.js..."
scp -6 -o StrictHostKeyChecking=no server/verify_jan3_stock.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/verify_jan3_stock.js

if ($LASTEXITCODE -ne 0) {
    Write-Error "Upload failed!"
    exit 1
}

# 2. Run
Write-Host "Running Verification..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node verify_jan3_stock.js"
