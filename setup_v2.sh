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
# REPO_URL="https://github.com/navalkishoricomm/amuldist.git" 

echo "Configuring network (DNS64) for IPv6 access..."
# ... (Keep network config)

if [ ! -d "$APP_DIR" ]; then
    echo "Creating directory $APP_DIR..."
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER /var/www
    
    # ALWAYS use ZIP download to avoid Git network issues
    echo "Downloading ZIP from GitHub (skipping Git clone due to network restrictions)..."
    
    # Install unzip if missing
    if ! command -v unzip &> /dev/null; then
        echo "Installing unzip..."
        sudo apt-get install -y unzip
    fi

    curl -L -o amuldist.zip "https://github.com/navalkishoricomm/amuldist/archive/refs/heads/main.zip"
    
    if [ -f amuldist.zip ]; then
        echo "Unzipping repository..."
        unzip -o amuldist.zip
        # Move files from subdirectory (amuldist-main) to current directory
        cp -r amuldist-main/* .
        cp -r amuldist-main/.* . 2>/dev/null || true
        rm -rf amuldist-main amuldist.zip
    else
        echo "FATAL: Could not download repository ZIP. Please check internet connection."
        exit 1
    fi
else
    echo "Updating repository..."
    # If directory exists, we can't easily "git pull" if we didn't clone.
    # So we will re-download ZIP and overwrite.
    echo "Directory exists. Re-downloading via ZIP to ensure latest code..."
    
    # Install unzip if missing
    if ! command -v unzip &> /dev/null; then
        sudo apt-get install -y unzip
    fi
    
    curl -L -o amuldist.zip "https://github.com/navalkishoricomm/amuldist/archive/refs/heads/main.zip"
    
    if [ -f amuldist.zip ]; then
        unzip -o amuldist.zip
        cp -r amuldist-main/* $APP_DIR/
        cp -r amuldist-main/.* $APP_DIR/ 2>/dev/null || true
        rm -rf amuldist-main amuldist.zip
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
