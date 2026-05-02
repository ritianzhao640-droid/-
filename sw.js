/**
 * 🚀 Service Worker - 缓存策略优化 v3
 * 修复：缓存列表与实际文件匹配、添加离线降级
 */

const CACHE_NAME = 'bacz-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/app.js',
  '/contracts.js',
  '/rewards-data.json',
];

// 可选资源（不存在时不阻塞）
const OPTIONAL_ASSETS = [
  '/assets/bg-optimized.webp',
  '/assets/bg-mobile.webp',
  '/assets/bg-optimized.jpg',
];

// 安装: 预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] 预缓存核心资源');
        // 核心资源必须缓存
        await cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[SW] 核心资源缓存失败:', err);
        });
        // 可选资源不阻塞
        for (const asset of OPTIONAL_ASSETS) {
          try {
            const response = await fetch(asset);
            if (response.ok) cache.put(asset, response);
          } catch (e) {
            console.log('[SW] 可选资源跳过:', asset);
          }
        }
      })
  );
  self.skipWaiting();
});

// 激活: 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') return;

  // 策略1: 缓存优先 (静态资源)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 策略2: 网络优先 (API 数据)
  if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 策略3: 缓存回退 (其他资源)
  event.respondWith(cacheFallback(request));
});

// 判断静态资源
function isStaticAsset(url) {
  const staticExts = ['.css', '.js', '.webp', '.png', '.jpg', '.woff2', '.json'];
  return staticExts.some((ext) => url.pathname.endsWith(ext));
}

// 判断 API 请求
function isAPIRequest(url) {
  return url.pathname.includes('/api/') ||
         url.hostname.includes('binance.org') ||
         url.hostname.includes('bsc-dataseed');
}

// 缓存优先策略
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    // 后台更新缓存（不阻塞）
    fetch(request).then((response) => {
      if (response.ok) cache.put(request, response);
    }).catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    // 离线降级：返回简单的离线页面
    if (request.mode === 'navigate') {
      return new Response(`
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>离线 - 币安长征</title></head>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f0ebe0;">
          <div style="text-align:center;">
            <h1 style="color:#3d8b6f;">📡 网络断开</h1>
            <p>请检查网络连接后刷新页面</p>
            <button onclick="location.reload()" style="padding:10px 20px;background:#3d8b6f;color:#fff;border:none;border-radius:8px;cursor:pointer;">刷新</button>
          </div>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }
    throw e;
  }
}

// 网络优先策略
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // API 离线降级
    return new Response(
      JSON.stringify({ error: '网络断开，显示缓存数据', offline: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 缓存回退策略
async function cacheFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    throw e;
  }
}
