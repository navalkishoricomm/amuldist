#!/bin/bash

# Exit on error
set -e

echo "Starting deployment setup..."

# 1. Install Node.js 18.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed."
fi

# 2. Install Git
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    sudo apt-get install -y git
fi

# 3. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# 4. Setup Directory
APP_DIR="/var/www/amuldist"
REPO_URL="https://github.com/navalkishoricomm/amuldist.git"

# Fix for GitHub connection issues (IPv6/DNS)
echo "Configuring Git to handle connection issues..."
git config --global http.postBuffer 524288000
git config --global http.sslVerify false

if [ ! -d "$APP_DIR" ]; then
    echo "Cloning repository to $APP_DIR..."
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER /var/www
    
    # Try cloning
    if ! git clone $REPO_URL $APP_DIR; then
        echo "Git clone failed. Trying to fix network settings..."
        # Backup resolv.conf
        sudo cp /etc/resolv.conf /etc/resolv.conf.bak
        # Use Google DNS
        echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
        
        echo "Retrying clone..."
        git clone $REPO_URL $APP_DIR
    fi
else
    echo "Updating repository..."
    cd $APP_DIR
    git pull origin main
fi

cd $APP_DIR/server

# 5. Install Dependencies
echo "Installing dependencies..."
npm install

# 6. Configure Environment
# Check if .env exists, if not create it
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/amul_dist_app
JWT_SECRET=change_this_secret_in_prod
EOL
    echo "⚠️  PLEASE EDIT .env FILE WITH YOUR REAL CREDENTIALS!"
fi

# 7. Start Application
echo "Starting application with PM2..."
cd $APP_DIR
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | tail -n 1 | bash || true

echo "------------------------------------------------"
echo "Deployment Complete!"
echo "Server should be running on port 4000."
echo "If you want port 80, consider setting up Nginx."
echo "------------------------------------------------"
