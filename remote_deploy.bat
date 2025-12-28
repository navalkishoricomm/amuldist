@echo off
if "%1"=="" (
    echo Usage: remote_deploy.bat YOUR_SERVER_IP
    echo Example: remote_deploy.bat 123.45.67.89
    exit /b
)

echo Connecting to %1 and running setup script...
ssh root@%1 "curl -sL https://raw.githubusercontent.com/navalkishoricomm/amuldist/main/setup_v2.sh | bash"
pause