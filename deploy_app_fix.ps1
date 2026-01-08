Write-Host "Deploying Fixed app.js..."
scp -6 -o StrictHostKeyChecking=no server/static/app.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/static/app.js
Write-Host "Done. Please refresh your browser."
