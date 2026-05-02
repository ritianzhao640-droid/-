/**
 * 🚀 Service Worker - 缓存策略优化
 * 版本: v2
 */

const CACHE_NAME = 'bacz-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index-optimized.html',
  '/css/critical.css',
  '/css/main.css',
  '/js/app.js',
  '/contracts.js',
  '/rewards-data.json',
  '/assets/bg-optimized.webp',
  '/assets/bg-mobile.webp',
];

// 安装: 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.warn('[SW] 预缓存失败:', err);
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
    // 后台更新缓存
    fetch(request).then((response) => {
      if (response.ok) cache.put(request, response);
    }).catch(() => {});
    return cached;
  }
  
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
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
    throw error;
  }
}

// 缓存回退策略
async function cacheFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
