@echo off
title Call Track — Starting...
cd /d "%~dp0"

echo.
echo  ============================
echo    Call Track is starting...
echo  ============================
echo.

REM ── Check if Node.js is installed ──────────────────────────────────
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  Node.js is not installed on this computer.
    echo.
    echo  Please follow these steps:
    echo.
    echo   1. Open your browser and go to:
    echo      https://nodejs.org
    echo.
    echo   2. Click the big green "LTS" download button
    echo.
    echo   3. Run the downloaded installer
    echo      ^(just click Next, Next, Next, Finish^)
    echo.
    echo   4. Once installed, double-click this file again.
    echo.
    start https://nodejs.org
    echo  Opening nodejs.org in your browser now...
    echo.
    pause
    exit /b
)

REM ── Install packages if node_modules is missing ────────────────────
if not exist "node_modules" (
    echo  Installing packages for the first time...
    echo  This takes 1-2 minutes. Please wait.
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  ERROR: npm install failed. Please check your internet connection and try again.
        pause
        exit /b
    )
    echo.
)

REM ── First-time setup: generate client, push DB, seed, build ────────
if not exist ".next" (
    echo  First-time setup — building the app and setting up database...
    echo  This takes 2-3 minutes. Please wait and do not close this window.
    echo.

    echo  [1/4] Generating Prisma client...
    call npx prisma generate
    if %ERRORLEVEL% NEQ 0 ( echo  ERROR: prisma generate failed. & pause & exit /b )

    echo  [2/4] Setting up database...
    call npx prisma db push
    if %ERRORLEVEL% NEQ 0 ( echo  ERROR: db push failed. & pause & exit /b )

    echo  [3/4] Seeding database with sample data...
    call npm run db:seed
    if %ERRORLEVEL% NEQ 0 ( echo  ERROR: db seed failed. & pause & exit /b )

    echo  [4/4] Building the app...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  ERROR: Build failed. Please contact your developer.
        pause
        exit /b
    )

    echo.
    echo  Setup complete!
    echo.
)

REM ── Start the server ───────────────────────────────────────────────
start "Call Track Server" /MIN cmd /k "npm run start"

echo  Server is starting up...
echo  Opening browser in 8 seconds...
echo.
timeout /t 8 /nobreak >nul

start http://localhost:3000

echo.
echo  ============================
echo    Call Track is running!
echo    http://localhost:3000
echo  ============================
echo.
echo  To stop the app, run "Stop Call Track.bat"
echo.
timeout /t 4 /nobreak >nul
