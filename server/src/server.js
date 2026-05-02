/**
 * 币安长征 API 服务
 * Express + 内存缓存，提供链上数据的快速查询接口
 */

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
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const REFRESH_INTERVAL = parseInt(process.env.CACHE_REFRESH_INTERVAL, 10) || 300; // 秒

// 项目根目录（静态文件所在目录）
const path = require('path');
const projectRoot = path.join(__dirname, '../..');

// ==================== 中间件 ====================
app.use(helmet({
  contentSecurityPolicy: false, // 允许前端嵌入
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(compression());
app.use(express.json());

// ==================== API 路由 ====================

// 健康检查
app.get('/health', (req, res) => {
  const data = cache.getAll();
  res.json({
    status: 'ok',
    lastUpdate: data.lastUpdate,
    cacheAge: cache.getCacheAge(),
    uptime: process.uptime(),
  });
});

// 全局数据
app.get('/api/global', (req, res) => {
  const data = cache.get('global');
  if (!data) {
    return res.status(503).json({ error: '数据尚未同步，请稍后再试' });
  }
  res.json(data);
});

// 当前日榜
app.get('/api/board', (req, res) => {
  const data = cache.get('dailyBoard');
  if (!data) {
    return res.status(503).json({ error: '数据尚未同步，请稍后再试' });
  }
  res.json(data);
});

// 历史日榜
app.get('/api/history', (req, res) => {
  const data = cache.get('historyBoards');
  if (!data) {
    return res.status(503).json({ error: '数据尚未同步，请稍后再试' });
  }
  res.json(data);
});

// 奖励排名（从文件读取）
app.get('/api/rewards', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const rewardsFile = path.join(__dirname, '../data/rewards-data.json');
    if (!fs.existsSync(rewardsFile)) {
      return res.status(503).json({ error: '奖励数据尚未生成' });
    }
    const data = JSON.parse(fs.readFileSync(rewardsFile, 'utf8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: '读取奖励数据失败', message: e.message });
  }
});

// 综合数据（一次性返回所有）
app.get('/api/all', (req, res) => {
  const global = cache.get('global');
  const dailyBoard = cache.get('dailyBoard');
  const historyBoards = cache.get('historyBoards');

  if (!global || !dailyBoard) {
    return res.status(503).json({ error: '数据尚未同步，请稍后再试' });
  }

  res.json({
    global,
    dailyBoard,
    historyBoards: historyBoards || [],
    updatedAt: cache.getAll().lastUpdate,
  });
});

// 静态文件服务（API 路由之后，404 之前）
app.use(express.static(projectRoot, {
  index: 'index.html',
  dotfiles: 'ignore',
  maxAge: '30d'
}));

// 首页兜底
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Server] 错误:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

// ==================== 定时任务 ====================

// 启动时立即同步一次
console.log('[Server] 启动同步...');
runSync().catch(e => console.error('[Server] 启动同步失败:', e.message));

// 定时同步（默认每 5 分钟）
const cronExpression = `*/${Math.ceil(REFRESH_INTERVAL / 60)} * * * *`;
cron.schedule(cronExpression, () => {
  console.log('[Cron] 定时同步触发');
  runSync().catch(e => console.error('[Cron] 同步失败:', e.message));
});

// ==================== 启动 ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
========================================
  币安长征 API 服务已启动
  端口: ${PORT}
  缓存刷新: 每 ${REFRESH_INTERVAL} 秒
  CORS: ${CORS_ORIGIN}
========================================
  API 列表:
  GET /health       - 健康检查
  GET /api/global   - 全局数据
  GET /api/board    - 当前日榜
  GET /api/history  - 历史日榜
  GET /api/rewards  - 奖励排名
  GET /api/all      - 综合数据
========================================
`);
});
