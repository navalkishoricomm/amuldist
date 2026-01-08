Write-Host "Deploying Verification Report..."
scp -6 -o StrictHostKeyChecking=no server/verify_report_jan3.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/verify_report_jan3.js

Write-Host "Running Report Verification..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node verify_report_jan3.js"
