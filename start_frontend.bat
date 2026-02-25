@echo off
echo ====================================
echo Starting Frontend (Next.js)
echo ====================================

echo Installing node modules if missing...
if not exist node_modules (
    npm install
)

echo.
echo Opening Browser...
start http://localhost:3000

echo.
echo Running Next.js on 0.0.0.0 (Local Network Accessible)...
npx next dev -H 0.0.0.0 -p 3000

pause
