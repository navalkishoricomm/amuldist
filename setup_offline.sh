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

cd $APP_DIR

# 5. Configure Environment
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
PORT=4000
MONGODB_URI=mongodb+srv://navalkishoricomm:Naval123@cluster0.p7q8s.mongodb.net/amul_dist_app?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=amul_dist_secret_key_2024
EOL
    echo ".env file created with default production settings."
fi

# 6. Start Application
echo "Starting application..."
pm2 delete amul-dist-server 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "Deployment Complete! Server running on port 4000."
