Write-Host "Deploying Finder Script..."
scp -6 -o StrictHostKeyChecking=no server/find_4740.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/find_4740.js

Write-Host "Running Finder..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node find_4740.js"
