@echo off
setlocal EnableExtensions EnableDelayedExpansion
title DYUhandmade Launcher

set "DYU_PROJECT=%~dp0"
rem Use IPv4 loopback because localhost may resolve to IPv6 on Windows.
set "DYU_PORT=3000"
set "DYU_URL=http://127.0.0.1:3000"

cd /d "%DYU_PROJECT%"

echo.
echo  DYUhandmade Digital Atelier
echo  ===========================
echo.

if not exist "package.json" (
  echo [ERROR] package.json was not found in:
  echo         %DYU_PROJECT%
  goto :failed
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or is not available in PATH.
  echo         Install Node.js 20.9 or newer, then run this file again.
  goto :failed
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not installed or is not available in PATH.
  goto :failed
)

if not exist "node_modules\next\package.json" (
  echo [1/3] Installing project dependencies...
  if exist "package-lock.json" (
    call npm.cmd ci
  ) else (
    call npm.cmd install
  )
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    goto :failed
  )
) else (
  echo [1/3] Project dependencies are ready.
)

rem Next.js allows only one dev server per project, even on different ports.
rem Stop this project's old server before starting a fresh one.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%DYU_PROJECT%scripts\stop-dyu-servers.ps1"
if errorlevel 1 (
  echo [ERROR] Could not close the previous DYU server.
  goto :failed
)

echo [2/3] Starting frontend and backend...
start "DYUhandmade - Frontend and Backend" cmd.exe /c "cd /d ""%DYU_PROJECT%"" && title DYUhandmade - Frontend and Backend && npm.cmd run dev -- --port %DYU_PORT%"

echo [3/3] Waiting for the website to become ready...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(90); do { try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%DYU_URL%' -TimeoutSec 2; if ($response.StatusCode -lt 500) { exit 0 } } catch {}; Start-Sleep -Milliseconds 700 } while ((Get-Date) -lt $deadline); exit 1" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] The website did not become ready within 90 seconds.
  echo         Check the DYUhandmade server window for details.
  goto :failed
)

echo [READY] Opening %DYU_URL%
start "" "%DYU_URL%"
echo.
echo Keep the DYUhandmade server window open while using the site.
powershell.exe -NoProfile -Command "Start-Sleep -Seconds 3" >nul
exit /b 0

:failed
echo.
echo Press any key to close this launcher.
pause >nul
exit /b 1
