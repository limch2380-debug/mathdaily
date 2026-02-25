@echo off
echo Starting MathDaily App...

start cmd /k "cd . && start_backend.bat"
timeout /t 3 >nul
start cmd /k "cd . && start_frontend.bat"

echo.
echo =================================
echo  모두 실행되었습니다!
echo  Python 서버 창과 Next.js 창을
echo  닫지 말고 유지해주세요.
echo =================================
echo.
pause
