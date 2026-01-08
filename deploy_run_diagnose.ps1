$server = "root@[2602:ff16:13:104e::1]"
$remotePath = "/var/www/amuldist/server"

# Copy the diagnostic script
scp -6 -o StrictHostKeyChecking=no server/diagnose_specific_products.js "${server}:${remotePath}/diagnose_specific_products.js"

# Run it
ssh -6 -o StrictHostKeyChecking=no $server "cd ${remotePath} && node diagnose_specific_products.js"
