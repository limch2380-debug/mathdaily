@echo off
echo ====================================
echo Starting Backend Server (FastAPI)
echo ====================================

cd server

echo Installing dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] 'python' command failed or library path warning.
    echo Trying 'py' launcher just in case...
    py -m pip install -r requirements.txt
)

:: 패키지 설치 에러가 나더라도 무시하고 서버 실행 시도
echo.
echo Installing completed or warnings ignored.

echo.
echo Running Fastapi server...
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
if %errorlevel% neq 0 (
    echo [WARNING] Using 'py' launcher...
    py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
)
pause
