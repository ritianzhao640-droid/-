/**
 * 缓存管理模块
 * 内存缓存 + 文件持久化，保证服务重启后数据不丢失
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'chain-data.json');

// 确保缓存目录存在
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// 内存缓存
let memoryCache = {
  global: null,
  dailyBoard: null,
  historyBoards: null,
  rewards: null,
  lastUpdate: null,
  isUpdating: false,
};

// 启动时从文件恢复
try {
  if (fs.existsSync(CACHE_FILE)) {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    memoryCache = { ...memoryCache, ...data };
    console.log('[Cache] 已从文件恢复缓存，最后更新:', memoryCache.lastUpdate);
  }
} catch (e) {
  console.warn('[Cache] 文件恢复失败:', e.message);
}

function get(key) {
  return memoryCache[key];
}

function set(key, value) {
  memoryCache[key] = value;
  memoryCache.lastUpdate = new Date().toISOString();
  // 异步写入文件
  setTimeout(() => {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2));
    } catch (e) {
      console.warn('[Cache] 文件写入失败:', e.message);
    }
  }, 0);
}

function getAll() {
  return { ...memoryCache };
}

function setUpdating(status) {
  memoryCache.isUpdating = status;
}

function getCacheAge() {
  if (!memoryCache.lastUpdate) return Infinity;
  return Date.now() - new Date(memoryCache.lastUpdate).getTime();
}

module.exports = {
  get,
  set,
  getAll,
  setUpdating,
  getCacheAge,
};
