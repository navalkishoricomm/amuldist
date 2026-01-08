$server = "root@[2602:ff16:13:104e::1]"
$remotePath = "/var/www/amuldist/server"

Write-Host "Uploading force_zero_jan3_specific.js..."
scp -6 -o StrictHostKeyChecking=no server/force_zero_jan3_specific.js "${server}:${remotePath}/force_zero_jan3_specific.js"

Write-Host "Running script on remote server..."
ssh -6 -o StrictHostKeyChecking=no $server "cd ${remotePath} && node force_zero_jan3_specific.js"

Write-Host "Done."
