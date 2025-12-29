Write-Host "Deploying server files..."
scp -6 -o StrictHostKeyChecking=no server/index.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/index.js
scp -6 -o StrictHostKeyChecking=no server/static/app.js server/static/retailer.html server/static/admin.html server/static/styles.css root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/static/
Write-Host "Restarting server..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "pm2 restart amuldist"
Write-Host "Deployment complete."
