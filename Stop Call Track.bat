@echo off
title Call Track — Stopping...

echo.
echo  ============================
echo    Stopping Call Track...
echo  ============================
echo.

REM Kill whatever process is listening on port 3000
set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    set FOUND=1
)

REM Also close the server window by title as a backup
taskkill /F /FI "WINDOWTITLE eq Call Track Server" >nul 2>&1

if "%FOUND%"=="1" (
    echo  Call Track has been stopped.
) else (
    echo  Call Track was not running.
)

echo.
echo  You can now close this window.
echo.
timeout /t 3 /nobreak >nul
