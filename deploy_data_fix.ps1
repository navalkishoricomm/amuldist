Write-Host "Deploying Data Fix Script..."

# 1. Copy the data fix script
Write-Host "Uploading server/move_stock_4740.js..."
scp -6 -o StrictHostKeyChecking=no server/move_stock_4740.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/move_stock_4740.js

# 2. Run the data fix script
Write-Host "Running Data Fix on Remote Server..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node move_stock_4740.js"

Write-Host "Done."
