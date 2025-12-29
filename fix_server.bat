@echo off
echo Uploading correct configuration...
echo Please enter password (qD3eeHQaJd) when prompted.
scp -o StrictHostKeyChecking=no server_env root@[2602:ff16:13:104e::1]:/var/www/amuldist/server/.env

if %errorlevel% neq 0 (
    echo Failed to upload config.
    pause
    exit /b
)

echo Restarting server...
ssh -o StrictHostKeyChecking=no root@2602:ff16:13:104e::1 "pm2 restart all && pm2 status"

echo.
echo Server fixed.
pause
