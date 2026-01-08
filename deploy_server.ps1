Write-Host "Deploying server files..."
 scp -6 -o StrictHostKeyChecking=no server/index.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/index.js
 scp -6 -o StrictHostKeyChecking=no server/scripts/trigger_fix.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/trigger_fix.js
 scp -6 -o StrictHostKeyChecking=no server/scripts/fix_orders.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/fix_orders.js
 scp -6 -o StrictHostKeyChecking=no server/scripts/backfill_order_transactions.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/backfill_order_transactions.js
 scp -6 -o StrictHostKeyChecking=no server/scripts/merge_orders_by_day.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/merge_orders_by_day.js
 scp -6 -o StrictHostKeyChecking=no server/scripts/delete_order_by_time.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/delete_order_by_time.js
 scp -6 -o StrictHostKeyChecking=no server/scripts/recalc_retailer_balance.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/recalc_retailer_balance.js
scp -6 -o StrictHostKeyChecking=no server/static/app.js server/static/retailer.html server/static/admin.html server/static/distributor.html server/static/styles.css root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/static/
Write-Host "Restarting server..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "pm2 restart amul-dist-server"
Write-Host "Waiting for server to start (10s)..."
Start-Sleep -Seconds 10
Write-Host "Running fix scripts on server..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node trigger_fix.js && echo 'Running Order Fix...' && node fix_orders.js"
Write-Host "Deployment and Fix complete."
