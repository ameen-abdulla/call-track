@echo off
title Call Track — Docker Startup

echo.
echo  ====================================
echo    Call Track — Docker Edition
echo  ====================================
echo.

REM Check Docker is installed
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  Docker is not installed.
    echo.
    echo  Please install Docker Desktop from:
    echo  https://www.docker.com/products/docker-desktop
    echo.
    start https://www.docker.com/products/docker-desktop
    pause
    exit /b
)

REM Check Docker daemon is running
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  Docker Desktop is not running.
    echo  Please open Docker Desktop and wait for it to start, then run this file again.
    echo.
    pause
    exit /b
)

echo  Building and starting Call Track...
echo  First run will take 3-5 minutes to build. Please wait.
echo.

docker compose up --build -d
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: Docker failed to start. Check Docker Desktop is running.
    pause
    exit /b
)

echo.
echo  Waiting for app to be ready...
timeout /t 8 /nobreak >nul

start http://localhost:3000

echo.
echo  ====================================
echo    Call Track is running!
echo    http://localhost:3000
echo  ====================================
echo.
echo  To stop: run "Stop Docker.bat"
echo.
timeout /t 4 /nobreak >nul
