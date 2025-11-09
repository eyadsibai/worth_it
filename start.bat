@echo off
REM Startup script for running both FastAPI backend and Streamlit frontend on Windows

echo Starting Worth It Application...
echo ================================

REM Check if uv is installed
where uv >nul 2>nul
if %errorlevel% neq 0 (
    echo uv package manager not found. Please install uv from https://docs.astral.sh/uv/getting-started/installation/
    echo Then run this script again.
    pause
    exit /b 1
)

REM Install/sync dependencies using uv
echo Installing dependencies with uv...
uv sync

REM Start FastAPI backend in background
echo.
echo Starting FastAPI backend on http://localhost:8000...
start /B uv run uvicorn api:app --host 0.0.0.0 --port 8000

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Check if backend is running
curl -s http://localhost:8000/health > nul 2>&1
if errorlevel 1 (
    echo ERROR: FastAPI backend failed to start
    exit /b 1
)

echo FastAPI backend is running

REM Start Streamlit frontend
echo.
echo Starting Streamlit frontend on http://localhost:8501...
start /B uv run streamlit run app.py

echo.
echo ================================
echo Application is running!
echo ================================
echo.
echo FastAPI Backend:  http://localhost:8000
echo API Docs:         http://localhost:8000/docs
echo Streamlit UI:     http://localhost:8501
echo.
echo Press Ctrl+C to stop services
echo.

REM Keep window open
pause
