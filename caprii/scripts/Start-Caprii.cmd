@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)
if not exist "node_modules\electron\cli.js" (
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo Installation failed. Keep this window open to inspect the error.
    pause
    exit /b 1
  )
)
call npm start
if errorlevel 1 pause
