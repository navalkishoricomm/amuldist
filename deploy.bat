@echo off
echo ==========================================
echo      AMUL DISTRIBUTOR DIRECT DEPLOY
echo ==========================================

echo 1. Creating deployment package...
"C:\Program Files\Git\bin\git.exe" archive --format=zip --output=deploy.zip HEAD
if %errorlevel% neq 0 (
    echo Error creating zip file.
    pause
    exit /b
)

echo 2. Uploading package to server...
echo    (Please enter password: qD3eeHQaJd)
echo    NOTE: Uploading to IPv6 address...
scp -o StrictHostKeyChecking=no deploy.zip root@[2602:ff16:13:104e::1]:/tmp/deploy.zip

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Upload failed! 
    echo Possible reasons:
    echo  - Wrong password.
    echo  - Network connection issue.
    echo.
    pause
    exit /b
)

echo 3. Executing deployment on server...
echo    (Please enter password: qD3eeHQaJd)
ssh -o StrictHostKeyChecking=no root@2602:ff16:13:104e::1 "mkdir -p /var/www/amuldist && apt-get update && apt-get install -y unzip && unzip -o /tmp/deploy.zip -d /var/www/amuldist && cd /var/www/amuldist && sed -i 's/\r$//' setup_offline.sh && bash setup_offline.sh"

echo ==========================================
echo           DEPLOYMENT FINISHED
echo ==========================================
pause
