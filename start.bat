@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js가 없습니다. https://nodejs.org 에서 설치하세요. & pause & exit /b 1)
if not exist node_modules (echo 처음 실행: 패키지를 설치합니다... & call npm.cmd install || (pause & exit /b 1))
node --env-file-if-exists=.env scripts/doctor.js || (pause & exit /b 1)
set OPEN_BROWSER=1
node --env-file-if-exists=.env server/index.js
pause
