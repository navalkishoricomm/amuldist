Write-Host "Deploying Zero Reset Script..."
scp -6 -o StrictHostKeyChecking=no server/reset_zero_jan3.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/reset_zero_jan3.js

Write-Host "Running Zero Reset..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node reset_zero_jan3.js"
