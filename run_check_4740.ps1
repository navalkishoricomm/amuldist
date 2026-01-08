Write-Host "Uploading Check Script..."
scp -6 -o StrictHostKeyChecking=no server/check_4740_date.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/check_4740_date.js

Write-Host "Running Check..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node check_4740_date.js"
