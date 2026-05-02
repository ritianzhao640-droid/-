#!/bin/bash
# ============================================================
# 币安长征后端一键部署脚本
# 用法：在服务器终端（宝塔终端 / WebShell）中执行：
#   curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/setup-server.sh | bash
# 或手动上传后执行：bash setup-server.sh
# ============================================================

set -e

APP_DIR="/www/wwwroot/bacz-api"
FRONTEND_DIR="/www/wwwroot/bacz-frontend"
DOMAIN="bacz.ltd"
NODE_VERSION="20"

echo "========================================"
echo "  币安长征后端一键部署"
echo "  域名: ${DOMAIN}"
echo "  目录: ${APP_DIR}"
echo "========================================"

# 1. 安装 Node.js
echo ""
echo "[1/8] 检查并安装 Node.js..."
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "${NODE_VERSION}" ]; then
    echo "      正在安装 Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1
fi
echo "      Node.js: $(node -v) | npm: $(npm -v)"

# 2. 安装 PM2（如果用宝塔 Node 项目管理器则不需要）
echo ""
echo "[2/8] 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "      安装 PM2..."
    npm install -g pm2 >/dev/null 2>&1
fi
echo "      PM2: $(pm2 -v)"

# 3. 创建目录
echo ""
echo "[3/8] 创建项目目录..."
mkdir -p ${APP_DIR} ${FRONTEND_DIR} ${APP_DIR}/data ${APP_DIR}/.cache
echo "      已创建: ${APP_DIR}"
echo "      已创建: ${FRONTEND_DIR}"

# 4. 生成后端代码（内联到脚本中，避免手动上传文件）
echo ""
echo "[4/8] 写入后端服务代码..."

# package.json
cat > ${APP_DIR}/package.json <<'PKG'
{
  "name": "bacz-api-server",
  "version": "1.0.0",
  "description": "币安长征 DApp 后端数据服务",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "sync": "node src/chain-sync.js",
    "update-rewards": "node scripts/update-rewards-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ethers": "^6.10.0",
    "node-cron": "^3.0.3",
    "compression": "^1.7.4",
    "helmet": "^7.1.0",
    "dotenv": "^16.4.5"
  },
  "engines": { "node": ">=18.0.0" }
}
PKG

# .env
cat > ${APP_DIR}/.env <<ENV
PORT=3000
CACHE_REFRESH_INTERVAL=300
REWARDS_UPDATE_INTERVAL=30
CORS_ORIGIN=https://${DOMAIN}
ENV

mkdir -p ${APP_DIR}/src ${APP_DIR}/scripts

# cache.js
cat > ${APP_DIR}/src/cache.js <<'CACHE'
const fs = require('fs');
const path = require('path');
const CACHE_DIR = path.join(__dirname, '../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'chain-data.json');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
let memoryCache = { global: null, dailyBoard: null, historyBoards: null, rewards: null, lastUpdate: null, isUpdating: false };
try { if (fs.existsSync(CACHE_FILE)) memoryCache = { ...memoryCache, ...JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) }; } catch (e) {}
function get(key) { return memoryCache[key]; }
function set(key, value) { memoryCache[key] = value; memoryCache.lastUpdate = new Date().toISOString(); setTimeout(() => { try { fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2)); } catch (e) {} }, 0); }
function getAll() { return { ...memoryCache }; }
function setUpdating(status) { memoryCache.isUpdating = status; }
function getCacheAge() { if (!memoryCache.lastUpdate) return Infinity; return Date.now() - new Date(memoryCache.lastUpdate).getTime(); }
module.exports = { get, set, getAll, setUpdating, getCacheAge };
CACHE

# chain-sync.js（精简版，确保能跑）
cat > ${APP_DIR}/src/chain-sync.js <<'SYNC'
require('dotenv').config();
const { ethers } = require('ethers');
const cache = require('./cache');
const RPC_URLS = [
  process.env.BSC_RPC_URL,
  'https://bsc-rpc.publicnode.com',
  'https://binance.llamarpc.com',
  'https://bsc.drpc.org',
].filter(Boolean);
const CONTRACTS = {
  vault: '0x97C28ef2a1bC30b4418B67dA354015707d20e82D',
  token: '0x5F7dc0E34920Aa46ae8c7519a35D9d54A5f57777',
  burnDistributor: '0xaBd5898a81fD48eDBD495895b4a0113455ad825b',
  router: '0x0Dc433fc888Da1356a6F11AD7EcAce3c403c36a7',
};
const ABIS = {
  vault: ['function overview() view returns (uint256 _vaultBnbBalance, uint256 _totalStakedBnb, uint256 _vaultSlisBalance)'],
  token: ['function balanceOf(address account) view returns (uint256)'],
  burnDistributor: ['function totalActualBurned() view returns (uint256)', 'function currentDayId() view returns (uint256)', 'function dayDuration() view returns (uint256)'],
  router: ['function burnDay(address vault, uint256 dayId) view returns (uint256 rewardPot, uint256 totalBurned, uint256 participantCount, bool finalized, address[10] users, uint256[10] amounts)'],
};
const BURN_GOAL = ethers.parseUnits('1000000000', 18);
const MILESTONE_STEP = ethers.parseUnits('10000000', 18);
function fmt(value, d = 4) { if (!value || value === 0n) return '0'; const n = parseFloat(ethers.formatUnits(value, 18)); if (n === 0) return '0'; if (n < 0.0001) return n.toExponential(2); return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fmtInt(value) { if (!value || value === 0n) return '0'; const n = parseFloat(ethers.formatUnits(value, 18)); if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'; return n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function shortAddr(addr) { return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '—'; }
async function createProvider() { for (const url of RPC_URLS) { try { const p = new ethers.JsonRpcProvider(url); await p.getBlockNumber(); return p; } catch (e) {} } throw new Error('RPC 连接失败'); }

async function syncGlobalData() {
  const provider = await createProvider();
  const vault = new ethers.Contract(CONTRACTS.vault, ABIS.vault, provider);
  const token = new ethers.Contract(CONTRACTS.token, ABIS.token, provider);
  const burnDistributor = new ethers.Contract(CONTRACTS.burnDistributor, ABIS.burnDistributor, provider);
  const router = new ethers.Contract(CONTRACTS.router, ABIS.router, provider);
  const [totalBurned, ov, dayId, dayDur] = await Promise.all([
    burnDistributor.totalActualBurned(), vault.overview(), burnDistributor.currentDayId(), burnDistributor.dayDuration(),
  ]);
  let projectBurned = 0n;
  try { projectBurned = await token.balanceOf(CONTRACTS.token); } catch (e) {}
  const globalDisplay = totalBurned + projectBurned;
  const progress = Math.min(Number(globalDisplay * 10000n / BURN_GOAL) / 100, 100);
  const nextMilestone = (globalDisplay / MILESTONE_STEP + 1n) * MILESTONE_STEP;
  const nextDayEnd = (dayId + 1n) * dayDur;
  const now = Math.floor(Date.now() / 1000);
  const countdown = Math.max(0, Number(nextDayEnd) - now);
  cache.set('global', {
    totalBurned: fmtInt(globalDisplay), totalUsersBurned: fmtInt(totalBurned), projectBurned: fmtInt(projectBurned),
    vaultBnb: fmt(ov._vaultBnbBalance), stakedBnb: fmt(ov._totalStakedBnb), slisTotal: fmt(ov._vaultSlisBalance),
    progress, progressText: `已燃烧 ${fmt(globalDisplay, 4)} / 目标 10亿`, nextMilestone: fmt(nextMilestone, 0),
    currentDayId: Number(dayId), displayRound: Number(dayId - 20573n), countdown, updatedAt: new Date().toISOString(),
  });
  // 日榜
  const bd = await router.burnDay(CONTRACTS.vault, dayId);
  const users = [];
  for (let i = 0; i < 10; i++) { const addr = bd.users[i], amt = bd.amounts[i]; if (addr === ethers.ZeroAddress) break; users.push({ rank: i + 1, address: addr, shortAddress: shortAddr(addr), amount: fmtInt(amt), amountRaw: amt.toString() }); }
  cache.set('dailyBoard', { dayId: Number(dayId), displayRound: Number(dayId - 20573n), rewardPot: fmt(bd.rewardPot), totalBurned: fmtInt(bd.totalBurned), participantCount: Number(bd.participantCount), finalized: bd.finalized, users, updatedAt: new Date().toISOString() });
  // 历史日榜
  const history = []; const startDay = Math.max(0, Number(dayId) - 5);
  for (let d = Number(dayId) - 1; d > startDay; d--) { try { const b = await router.burnDay(CONTRACTS.vault, d); if (Number(b.participantCount) === 0) continue; const top3 = []; for (let i = 0; i < 3; i++) { const a = b.users[i], m = b.amounts[i]; if (a === ethers.ZeroAddress) break; top3.push({ rank: i + 1, address: a, shortAddress: shortAddr(a), amount: fmtInt(m) }); } history.push({ dayId: d, displayRound: d - 20573, rewardPot: fmt(b.rewardPot), totalBurned: fmtInt(b.totalBurned), participantCount: Number(b.participantCount), finalized: b.finalized, top3 }); } catch (e) {} }
  cache.set('historyBoards', history);
  provider.destroy();
  console.log('[Sync] 同步完成');
}

async function runSync() {
  if (cache.getAll().isUpdating) return;
  cache.setUpdating(true);
  try { await syncGlobalData(); } catch (e) { console.error('[Sync] 失败:', e.message); } finally { cache.setUpdating(false); }
}

if (require.main === module) { runSync().then(() => process.exit(0)); }
module.exports = { runSync };
SYNC

# server.js
cat > ${APP_DIR}/src/server.js <<'SERVER'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const cron = require('node-cron');
const cache = require('./cache');
const { runSync } = require('./chain-sync');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(compression());
app.use(express.json());

app.get('/health', (req, res) => { const d = cache.getAll(); res.json({ status: 'ok', lastUpdate: d.lastUpdate, cacheAge: cache.getCacheAge(), uptime: process.uptime() }); });
app.get('/api/global', (req, res) => { const d = cache.get('global'); if (!d) return res.status(503).json({ error: '数据尚未同步' }); res.json(d); });
app.get('/api/board', (req, res) => { const d = cache.get('dailyBoard'); if (!d) return res.status(503).json({ error: '数据尚未同步' }); res.json(d); });
app.get('/api/history', (req, res) => { const d = cache.get('historyBoards'); if (!d) return res.status(503).json({ error: '数据尚未同步' }); res.json(d); });
app.get('/api/rewards', (req, res) => { try { const fs = require('fs'), p = require('path'); const f = p.join(__dirname, '../data/rewards-data.json'); if (!fs.existsSync(f)) return res.status(503).json({ error: '奖励数据尚未生成' }); res.json(JSON.parse(fs.readFileSync(f, 'utf8'))); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/all', (req, res) => { const g = cache.get('global'), b = cache.get('dailyBoard'); if (!g || !b) return res.status(503).json({ error: '数据尚未同步' }); res.json({ global: g, dailyBoard: b, historyBoards: cache.get('historyBoards') || [], updatedAt: cache.getAll().lastUpdate }); });
app.use((req, res) => res.status(404).json({ error: '接口不存在' }));
app.use((err, req, res, next) => { console.error('[Server] 错误:', err); res.status(500).json({ error: '服务器内部错误' }); });

runSync().catch(e => console.error('[Server] 启动同步失败:', e.message));
cron.schedule('*/5 * * * *', () => { console.log('[Cron] 定时同步'); runSync().catch(e => console.error(e.message)); });
app.listen(PORT, '0.0.0.0', () => { console.log(`币安长征 API 已启动，端口 ${PORT}`); });
SERVER

echo "      后端代码写入完成"

# 5. 安装依赖
echo ""
echo "[5/8] 安装 npm 依赖..."
cd ${APP_DIR}
npm install --production --silent
echo "      依赖安装完成"

# 6. 启动服务
echo ""
echo "[6/8] 启动后端服务..."
pm2 delete bacz-api 2>/dev/null || true
pm2 start src/server.js --name bacz-api --silent
pm2 save --silent
echo "      服务已启动"

# 7. 宝塔计划任务（写入 crontab）
echo ""
echo "[7/8] 配置定时任务..."
(crontab -l 2>/dev/null | grep -v 'bacz-api'; echo "*/5 * * * * cd ${APP_DIR} && node src/chain-sync.js >> ${APP_DIR}/logs/sync.log 2>&1") | crontab -
mkdir -p ${APP_DIR}/logs
echo "      链上同步: 每 5 分钟"

# 8. 显示结果
echo ""
echo "========================================"
echo "  部署完成"
echo "========================================"
echo ""
echo "  后端目录: ${APP_DIR}"
echo "  API 端口: 3000"
echo "  健康检查: http://${DOMAIN}/health"
echo "  综合数据: http://${DOMAIN}/api/all"
echo ""
echo "  下一步："
echo "  1. 在宝塔面板中添加站点 ${DOMAIN}"
echo "  2. 配置反向代理到 127.0.0.1:3000"
echo "  3. 申请 SSL 证书"
echo "  4. 上传前端文件到 ${FRONTEND_DIR}"
echo "========================================"
