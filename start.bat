@echo off
chcp 65001 >nul
title Xueqiu Portfolio Tracker

cd /d "%~dp0"

echo ===================================
echo   Xueqiu Portfolio Tracker
echo ===================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js 版本: %NODE_VERSION%

:: 检查依赖是否安装
if not exist "node_modules" (
    echo.
    echo 📦 首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo 🚀 启动开发服务器...
echo.

:: 启动开发服务器
call npm run dev

pause