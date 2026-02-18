@echo off
setlocal
echo ===================================================
2: echo   MathDaily - 새로운 PC 환경 설정 (Setup)
3: echo ===================================================
4: echo.
5: 
6: :: 1. Node.js 확인
7: echo [1/4] Node.js 설치 확인 중...
8: node -v >nul 2>&1
9: if %errorlevel% neq 0 (
10:     echo [ERROR] Node.js가 설치되어 있지 않습니다!
11:     echo https://nodejs.org 에서 LTS 버전을 설치한 후 다시 실행해주세요.
12:     pause
13:     exit /b
14: )
15: echo Node.js 버전: 
16: node -v
17: 
18: :: 2. Python 확인
19: echo.
20: echo [2/4] Python 설치 확인 중...
21: python --version >nul 2>&1
22: if %errorlevel% neq 0 (
23:     echo [ERROR] Python이 설치되어 있지 않습니다!
24:     echo https://www.python.org 에서 설치(Add to PATH 체크 필수) 후 다시 실행해주세요.
25:     pause
26:     exit /b
27: )
28: python --version
29: 
30: :: 3. 프론트엔드 의존성 설치
31: echo.
32: echo [3/4] 프론트엔드 패키지 설치 중 (npm install)...
33: call npm install
34: if %errorlevel% neq 0 (
35:     echo [WARNING] npm install 중 문제가 발생했습니다. 네트워크를 확인해주세요.
36: )
37: 
38: :: 4. 백엔드 의존성 설치
39: echo.
40: echo [4/4] 백엔드 패키지 설치 중 (pip install)...
41: cd server
42: python -m pip install -r requirements.txt
43: if %errorlevel% neq 0 (
44:     echo [WARNING] pip install 중 문제가 발생했습니다.
45: )
46: cd ..
47: 
48: echo.
49: echo ===================================================
50: echo   모든 설정이 완료되었습니다!
51: echo   이제 'start_all.bat'을 실행하여 앱을 시작하세요.
52: echo ===================================================
53: echo.
54: pause
