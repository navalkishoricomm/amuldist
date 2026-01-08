Write-Host "Deploying fixed files..."

# 1. Copy main server file (contains IST timezone fix)
Write-Host "Uploading server/index.js..."
scp -6 -o StrictHostKeyChecking=no server/index.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/index.js

# 2. Copy the fix verification script
Write-Host "Uploading server/fix_stock.js..."
scp -6 -o StrictHostKeyChecking=no server/fix_stock.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/fix_stock.js

# 3. Copy static files (contains app.js Opening Stock fix)
Write-Host "Uploading static files..."
scp -6 -o StrictHostKeyChecking=no server/static/app.js server/static/retailer.html server/static/admin.html server/static/distributor.html server/static/styles.css root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/static/

# 4. Restart Server
Write-Host "Restarting server..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "pm2 restart amul-dist-server"

Write-Host "Waiting for server to start (5s)..."
Start-Sleep -Seconds 5

# 5. Run the verification script
Write-Host "Running Stock Fix Diagnostic on Remote Server..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node fix_stock.js"

Write-Host "Done."
