Write-Host "Uploading Diagnostic Script..."
scp -6 -o StrictHostKeyChecking=no server/explain_4740.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/explain_4740.js

Write-Host "Running Diagnostic..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node explain_4740.js"
