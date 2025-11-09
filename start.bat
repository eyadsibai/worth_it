@echo off
REM Startup script for running both FastAPI backend and Streamlit frontend on Windows

echo Starting Worth It Application...
echo ================================

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q numpy pandas scipy numpy-financial streamlit plotly pytest pydantic fastapi uvicorn httpx requests

REM Start FastAPI backend in background
echo.
echo Starting FastAPI backend on http://localhost:8000...
start /B uvicorn api:app --host 0.0.0.0 --port 8000

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
start /B streamlit run app.py

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
