Write-Host "Deploying Move Script..."
scp -6 -o StrictHostKeyChecking=no server/move_jan3_to_jan2.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/move_jan3_to_jan2.js

Write-Host "Running Move Script..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node move_jan3_to_jan2.js"
