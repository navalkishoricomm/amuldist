@echo off
echo Initializing Git...
git init
if %errorlevel% neq 0 (
    echo [ERROR] Git is not found!
    echo Please install Git from https://git-scm.com/download/win
    echo After installing, run this script again.
    pause
    exit /b
)

echo Adding files...
git add .
git commit -m "Initial commit for Amul Distributor App"

echo.
echo ---------------------------------------------------
echo Code committed locally.
echo Now we need to push to GitHub/GitLab.
echo ---------------------------------------------------
set /p remote_url="Enter your Remote Repository URL (e.g., https://github.com/user/repo.git): "

if "%remote_url%"=="" (
    echo No URL provided. Exiting.
    pause
    exit /b
)

git remote add origin %remote_url%
git branch -M main
echo Pushing to remote...
git push -u origin main

echo.
echo Done!
pause
