@echo off
title Call Track — Stopping Docker

echo.
echo  ====================================
echo    Stopping Call Track (Docker)...
echo  ====================================
echo.

docker compose down

echo.
echo  Call Track has been stopped.
echo  Your data is saved and will be there next time you start.
echo.
timeout /t 3 /nobreak >nul
