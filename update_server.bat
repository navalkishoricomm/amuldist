@echo off
echo Updating server...
echo Connecting to [2602:ff16:13:104e::1]...
echo Please enter the password (qD3eeHQaJd) if prompted.
ssh -o StrictHostKeyChecking=no root@2602:ff16:13:104e::1 "cd /var/www/amuldist && echo 'Downloading update...' && curl -L -k -o update.zip https://codeload.github.com/navalkishoricomm/amuldist/zip/refs/heads/main && unzip -o update.zip > /dev/null && cp -r amuldist-main/* . && cp -r amuldist-main/.* . 2>/dev/null || true && rm -rf amuldist-main update.zip && cd server && npm install && cd .. && pm2 restart all && pm2 status"
echo.
echo Update complete.
pause
