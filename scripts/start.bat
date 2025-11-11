@echo off
REM Startup script for running both FastAPI backend and Next.js frontend on Windows (monorepo)

echo Starting Worth It Application (Monorepo)...
echo ============================================

REM Get script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

REM Check if uv is installed
where uv >nul 2>nul
if %errorlevel% neq 0 (
    echo uv package manager not found. Please install uv from https://docs.astral.sh/uv/getting-started/installation/
    echo Then run this script again.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install backend dependencies
echo.
echo Installing backend dependencies with uv...
cd /d "%PROJECT_ROOT%\backend"
uv sync

REM Install frontend dependencies
echo.
echo Installing frontend dependencies with npm...
cd /d "%PROJECT_ROOT%\frontend"
call npm install

REM Start FastAPI backend in background
echo.
echo Starting FastAPI backend on http://localhost:8000...
cd /d "%PROJECT_ROOT%\backend"
start "Worth It Backend" uv run uvicorn worth_it.api:app --host 0.0.0.0 --reload --port 8000

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Check if backend is running
curl -s http://localhost:8000/health > nul 2>&1
if errorlevel 1 (
    echo ERROR: FastAPI backend failed to start
    taskkill /FI "WINDOWTITLE eq Worth It Backend*" /F >nul 2>&1
    pause
    exit /b 1
)

echo FastAPI backend is running

REM Start Next.js frontend
echo.
echo Starting Next.js frontend on http://localhost:3000...
cd /d "%PROJECT_ROOT%\frontend"
start "Worth It Frontend" npm run dev

echo.
echo ============================================
echo Application is running!
echo ============================================
echo.
echo FastAPI Backend:  http://localhost:8000
echo API Docs:         http://localhost:8000/docs
echo Next.js Frontend: http://localhost:3000
echo.
echo Two windows have been opened for backend and frontend.
echo Close both windows to stop the services.
echo.

REM Keep this window open
pause
