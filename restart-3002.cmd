@echo off
setlocal

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Requesting administrator privileges...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0"

echo Stopping any process listening on port 3002...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3002" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%p >nul 2>&1
)

echo Clearing the old Next.js cache...
if exist ".next" rmdir /s /q ".next"

set PORT=3002
echo Starting Next.js on http://localhost:3002 ...
echo Keep this window open while testing.
npx next dev
pause
