@echo off
echo Initializing Git Push...

:: Check if git is available
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not found in PATH!
    echo Trying standard paths...
    if exist "C:\Program Files\Git\bin\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\bin\git.exe"
    ) else (
        echo [FATAL] Could not find git.exe. Please install Git.
        pause
        exit /b
    )
) else (
    set "GIT_CMD=git"
)

echo Using Git at: %GIT_CMD%

:: Add files and commit (in case there are new changes)
"%GIT_CMD%" add .
"%GIT_CMD%" commit -m "Auto-commit before push"

:: Set remote (if not exists, it will error but that's fine)
"%GIT_CMD%" remote remove origin 2>nul
"%GIT_CMD%" remote add origin https://github.com/navalkishoricomm/amuldist.git
"%GIT_CMD%" branch -M main

echo.
echo ---------------------------------------------------
echo Pushing to https://github.com/navalkishoricomm/amuldist.git
echo You may be asked to sign in via browser or enter a token.
echo ---------------------------------------------------

"%GIT_CMD%" push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Push failed.
    echo If the error is "Permission denied" or "Authentication failed":
    echo 1. Make sure you have permission to access the repo.
    echo 2. Try signing in when prompted.
    pause
    exit /b
)

echo.
echo [SUCCESS] Code pushed successfully!
pause
