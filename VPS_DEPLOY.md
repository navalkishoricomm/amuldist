# Deploying to Your Own VPS (Ubuntu/Debian)

Since Render's free tier isn't working for you, here is how to deploy to your own server (e.g., DigitalOcean, AWS EC2, Linode, or any Linux VPS).

## Prerequisites
- A Linux server (Ubuntu 20.04 or 22.04 recommended).
- SSH access to the server.

## Step 1: Connect to your Server
Open your terminal (PowerShell or Command Prompt) and SSH into your server:
```bash
ssh root@your_server_ip
```

## Step 2: Run the Setup Script
I have created a `setup_v2.sh` script to ensure you get the latest fixes.

Run these commands on your server:

1.  **Download the script:**
    ```bash
    curl -O https://raw.githubusercontent.com/navalkishoricomm/amuldist/main/setup_v2.sh
    ```

2.  **Make it executable:**
    ```bash
    chmod +x setup_v2.sh
    ```

3.  **Run it:**
    ```bash
    ./setup_v2.sh
    ```

## Step 3: Configure Database
The script will create a `.env` file at `/var/www/amuldist/server/.env`. You need to edit it to put your real MongoDB Atlas connection string.

1.  **Edit the file:**
    ```bash
    nano /var/www/amuldist/server/.env
    ```

2.  **Update `MONGODB_URI`**:
    Delete the placeholder and paste your Atlas connection string (e.g., `mongodb+srv://...`).

3.  **Save and Exit:**
    Press `Ctrl + X`, then `Y`, then `Enter`.

4.  **Restart the Server:**
    ```bash
    pm2 restart all
    ```

## Step 4: Access the App
Your server is now running on port 4000.
URL: `http://your_server_ip:4000`

**Update the APK:**
Open the App on your phone -> Login Screen -> Server Settings -> Enter `http://your_server_ip:4000` -> Save.
