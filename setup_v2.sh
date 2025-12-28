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

# Fix for GitHub IPv6 issues
# GitHub does not natively support IPv6 for cloning. 
# We must use a proxy or fallback to a public IPv6-to-IPv4 gateway if this is an IPv6-only machine.

echo "Configuring network (DNS64) for IPv6 access..."

# Stop systemd-resolved if it interferes
if systemctl is-active --quiet systemd-resolved; then
    echo "Disabling systemd-resolved to force DNS64..."
    sudo systemctl stop systemd-resolved
    sudo systemctl disable systemd-resolved
fi

# Force update resolv.conf
if [ -f /etc/resolv.conf ]; then
    sudo cp /etc/resolv.conf /etc/resolv.conf.bak
    sudo rm -f /etc/resolv.conf
fi

# Use Google's DNS64 servers (enables IPv6 -> IPv4 access)
echo "nameserver 2001:4860:4860::6464" | sudo tee /etc/resolv.conf
echo "nameserver 2001:4860:4860::64" | sudo tee -a /etc/resolv.conf
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf

echo "Waiting for network settings to apply..."
sleep 5

echo "Testing connection to GitHub..."
GIT_CONNECTION_OK=false
if curl -I --connect-timeout 5 https://github.com >/dev/null 2>&1; then
    echo "Connection to GitHub verified."
    GIT_CONNECTION_OK=true
else
    echo "WARNING: Connection check failed. Will skip git clone and use ZIP download."
fi

if [ ! -d "$APP_DIR" ]; then
    echo "Cloning repository to $APP_DIR..."
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER /var/www
    
    # Try cloning ONLY if connection verified
    if [ "$GIT_CONNECTION_OK" = true ] && git clone $REPO_URL $APP_DIR; then
        echo "Git clone successful."
    else
        echo "Git clone skipped or failed. Attempting to download via ZIP..."
        
        # Install unzip if missing
        if ! command -v unzip &> /dev/null; then
            echo "Installing unzip..."
            sudo apt-get install -y unzip
        fi
        
        # Download ZIP
        # Using codeload.github.com directly often bypasses some blocks, or just standard zip link
        echo "Downloading ZIP from GitHub..."
        curl -L -o amuldist.zip "https://github.com/navalkishoricomm/amuldist/archive/refs/heads/main.zip"
        
        if [ -f amuldist.zip ]; then
            echo "Unzipping repository..."
            unzip amuldist.zip
            # Move files from subdirectory (amuldist-main) to current directory
            # We are in /var/www/amuldist, unzip creates amuldist-main
            cp -r amuldist-main/* .
            cp -r amuldist-main/.* . 2>/dev/null || true
            rm -rf amuldist-main amuldist.zip
            
            # Initialize git manually so we can pull later (optional, but good)
            if command -v git &> /dev/null; then
                echo "Initializing Git for future updates..."
                git init
                git remote add origin $REPO_URL
                git fetch
                git reset --hard origin/main
            else
                echo "Git not found. Skipping Git initialization."
            fi
        else
            echo "FATAL: Could not download repository ZIP. Please check internet connection."
            exit 1
        fi
    fi
else
    echo "Updating repository..."
    
    # Check if it is a valid git repo
    if ! git -C "$APP_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo "Directory exists but is not a valid git repository. Re-cloning..."
        sudo rm -rf $APP_DIR
        sudo mkdir -p $APP_DIR
        sudo chown -R $USER:$USER /var/www
        git clone $REPO_URL $APP_DIR
    else
        cd $APP_DIR
        git pull origin main
    fi
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
