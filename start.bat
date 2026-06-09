@echo off
cd /d "%~dp0"

echo Starting backend...
start /b node server.js

echo Opening browser in 3 seconds...
ping -n 4 127.0.0.1 >nul
start http://localhost:5173

echo Starting frontend...
cd client
npm run dev
