Write-Host "Deploying Debug Specific Products Script..."
scp -6 -o StrictHostKeyChecking=no server/debug_specific_products.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/debug_specific_products.js

Write-Host "Running Debug..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node debug_specific_products.js"
