#!/bin/bash
set -e

echo "Starting Offline Deployment..."

# 1. Install Node.js 18.x if missing
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    # Try to configure DNS64 first just in case
    echo "nameserver 2001:4860:4860::6464" | sudo tee /etc/resolv.conf > /dev/null
    
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs unzip
fi

# 2. Install PM2 if missing
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# 3. Setup Directory
APP_DIR="/var/www/amuldist"
cd $APP_DIR/server

# 4. Install Dependencies
echo "Installing dependencies..."
npm install

# 5. Configure Environment
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/amul_dist_app
JWT_SECRET=change_this_secret_in_prod
EOL
    echo "⚠️  PLEASE EDIT .env FILE WITH YOUR REAL CREDENTIALS!"
fi

# 6. Start Application
echo "Starting application..."
pm2 delete amul-dist-app 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "Deployment Complete! Server running on port 4000."
