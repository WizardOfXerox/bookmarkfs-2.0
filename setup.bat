@echo off
echo ============================================
echo   BookmarkFS 2.0 - Windows Setup Script
echo ============================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

echo [OK] Node.js found: 
node --version

:: Check for npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

echo [OK] npm found:
npm --version
echo.

:: Install dependencies
echo [1/3] Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.
echo.

:: Build the extension
echo [2/3] Building extension with Webpack...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)
echo [OK] Build complete.
echo.

:: Copy WASM to dist if not already there
echo [3/3] Ensuring unrar.wasm is in dist/...
if not exist "dist\unrar.wasm" (
    copy "node_modules\node-unrar-js\dist\js\unrar.wasm" "dist\unrar.wasm" >nul 2>nul
    echo [OK] Copied unrar.wasm to dist/
) else (
    echo [OK] unrar.wasm already present.
)
echo.

echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo To load the extension in Chrome:
echo   1. Open chrome://extensions
echo   2. Enable "Developer mode" (toggle in top-right)
echo   3. Click "Load unpacked"
echo   4. Select this folder: %CD%
echo.
pause
