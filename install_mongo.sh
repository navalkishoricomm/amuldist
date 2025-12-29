#!/bin/bash
set -e

echo "Installing prerequisites..."
apt-get update
apt-get install -y gnupg

echo "Importing MongoDB public key from local file..."
cat /root/mongodb-server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor --yes

echo "Adding MongoDB repository..."
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

echo "Updating package list..."
apt-get update

echo "Installing MongoDB..."
apt-get install -y mongodb-org

echo "Starting MongoDB..."
systemctl start mongod
systemctl enable mongod

echo "Checking MongoDB status..."
systemctl status mongod --no-pager

echo "MongoDB installation complete."
