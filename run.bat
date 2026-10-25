@echo off
title UBFD / Group Cash OS Launcher
echo ========================================================
echo   Starting Unified Business Finance Dashboard (UBFD)
echo ========================================================
echo.

set "ROOT_DIR=%~dp0"

:: 1. Detect Python / Uvicorn executable
if exist "%ROOT_DIR%backend\.venv\Scripts\uvicorn.exe" (
    set "UVICORN_BIN=%ROOT_DIR%backend\.venv\Scripts\uvicorn.exe"
) else (
    set "UVICORN_BIN=python -m uvicorn"
)

:: 2. Launch FastAPI Backend Server
echo [1/3] Starting Backend API Server (FastAPI on Port 8000)...
start "UBFD Backend (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend" && "%UVICORN_BIN%" app.main:app --port 8000 --reload"

:: 3. Launch Frontend Vite Server
echo [2/3] Starting Frontend Web App (Vite on Port 3000)...
start "UBFD Frontend (Port 3000)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

:: 4. Wait for services to bind ports
echo [3/3] Waiting for services to initialize...
timeout /t 4 /nobreak >nul

:: 5. Open Default Browser to Localhost
echo Opening http://localhost:3000 in your browser...
start http://localhost:3000

echo.
echo ========================================================
echo   Services are running!
echo   * Web App:    http://localhost:3000
echo   * API Docs:   http://localhost:8000/docs
echo.
echo   (Keep the launched console windows open while using)
echo ========================================================
echo.
pause
