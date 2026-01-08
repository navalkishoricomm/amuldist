Write-Host "Uploading Report Generator..."
scp -6 -o StrictHostKeyChecking=no server/generate_report.js root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/generate_report.js

Write-Host "Running Report for Jan 3, 2026..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node generate_report.js 2026-01-03"

Write-Host "Also checking Jan 3, 2025 for comparison (just in case)..."
ssh -6 -o StrictHostKeyChecking=no root@[2602:ff16:13:104e::1] "cd /var/www/amuldist/server && node generate_report.js 2025-01-03"
