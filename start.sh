#!/bin/bash

# Xueqiu Portfolio Tracker 一键启动脚本

cd "$(dirname "$0")"

echo "==================================="
echo "  Xueqiu Portfolio Tracker"
echo "==================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js 版本: $(node -v)"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 首次运行，正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

echo ""
echo "🚀 启动开发服务器..."
echo ""

# 启动开发服务器
npm run dev