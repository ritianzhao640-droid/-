#!/bin/bash
# 币安长征后端部署脚本
# 在服务器上执行此脚本完成一键部署

set -e

APP_DIR="/www/wwwroot/bacz-api"
REPO_URL=""  # 留空则使用本地文件
NODE_VERSION="20"

echo "========================================"
echo "  币安长征 API 服务部署"
echo "========================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[Deploy] 安装 Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
fi

echo "[Deploy] Node.js 版本: $(node -v)"

# 创建应用目录
mkdir -p ${APP_DIR}
cd ${APP_DIR}

# 如果有 Git 仓库则拉取
if [ -n "$REPO_URL" ]; then
    if [ -d ".git" ]; then
        git pull
    else
        git clone ${REPO_URL} .
    fi
fi

# 安装依赖
echo "[Deploy] 安装依赖..."
npm install --production

# 创建 .env
cat > .env <<EOF
PORT=3000
CACHE_REFRESH_INTERVAL=300
REWARDS_UPDATE_INTERVAL=30
CORS_ORIGIN=*
EOF

# 创建数据目录
mkdir -p data .cache

# 使用 PM2 启动（如果安装了宝塔 Node 项目管理器则不需要）
if command -v pm2 &> /dev/null; then
    echo "[Deploy] 使用 PM2 启动..."
    pm2 delete bacz-api 2>/dev/null || true
    pm2 start src/server.js --name bacz-api
    pm2 save
else
    echo "[Deploy] PM2 未安装，请在宝塔面板中使用 Node 项目管理器启动"
    echo "         项目路径: ${APP_DIR}"
    echo "         启动文件: src/server.js"
    echo "         端口: 3000"
fi

echo "========================================"
echo "  部署完成"
echo "  目录: ${APP_DIR}"
echo "========================================"
