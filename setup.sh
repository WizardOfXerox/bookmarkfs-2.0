#!/usr/bin/env bash
set -e

echo "============================================"
echo "  BookmarkFS 2.0 - Setup Script"
echo "============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/ and try again."
    exit 1
fi
echo "[OK] Node.js found: $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not installed or not in PATH."
    exit 1
fi
echo "[OK] npm found: $(npm --version)"
echo ""

# Install dependencies
echo "[1/3] Installing dependencies..."
npm install
echo "[OK] Dependencies installed."
echo ""

# Build the extension
echo "[2/3] Building extension with Webpack..."
npm run build
echo "[OK] Build complete."
echo ""

# Ensure WASM is in dist
echo "[3/3] Ensuring unrar.wasm is in dist/..."
if [ ! -f "dist/unrar.wasm" ]; then
    cp "node_modules/node-unrar-js/dist/js/unrar.wasm" "dist/unrar.wasm" 2>/dev/null || true
    echo "[OK] Copied unrar.wasm to dist/"
else
    echo "[OK] unrar.wasm already present."
fi
echo ""

echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "To load the extension in Chrome:"
echo "  1. Open chrome://extensions"
echo "  2. Enable 'Developer mode' (toggle in top-right)"
echo "  3. Click 'Load unpacked'"
echo "  4. Select this folder: $(pwd)"
echo ""
