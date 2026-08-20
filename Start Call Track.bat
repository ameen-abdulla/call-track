@echo off
title Call Track — Starting...
cd /d "%~dp0call-track"

echo.
echo  ============================
echo    Call Track is starting...
echo  ============================
echo.

REM Check if the app has been built
if not exist ".next" (
    echo  First-time setup detected. Building the app...
    echo  This will take about 1-2 minutes. Please wait.
    echo.
    call npm run db:push
    call npm run db:seed
    call npm run build
    echo.
    echo  Setup complete!
    echo.
)

REM Start the server in a minimised window
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
