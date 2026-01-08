Write-Host "Deploying Timestamp Fix..."
scp -6 -o StrictHostKeyChecking=no server/fix_jan2_timestamps.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/fix_jan2_timestamps.js

Write-Host "Running Timestamp Fix..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node fix_jan2_timestamps.js"

Write-Host "Re-running Force Zero..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node force_zero_v2.js"
