@echo off
REM This script sets NODE_OPTIONS as a user environment variable for Windows
REM Run this once, and it will persist across terminal sessions

echo Setting NODE_OPTIONS environment variable...
setx NODE_OPTIONS "--max-old-space-size=8192" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Successfully set NODE_OPTIONS=--max-old-space-size=8192
    echo.
    echo NOTE: You need to close and reopen your terminal for this to take effect.
    echo After that, you can use 'npm start' normally and it will have more memory.
    echo.
) else (
    echo.
    echo ✗ Failed to set environment variable. Try running as Administrator.
    echo.
)

pause

