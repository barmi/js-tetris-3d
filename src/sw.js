// Service worker — 자체 자산은 cache-first, CDN three.js 는 stale-while-revalidate.
// 캐시 버전 (CACHE_NAME) 만 올리면 다음 activate 에서 이전 캐시가 정리된다.

const CACHE_NAME = 'js-tetris-3d-v1';

// install 시점에 미리 받아 둘 자체 자산.
const SELF_PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/styles.css',
  './js/main.js',
  './js/scene.js',
  './js/pit.js',
  './js/block.js',
  './js/blocksets.js',
  './js/game.js',
  './js/renderer.js',
  './js/nextPreview.js',
  './js/controls.js',
  './js/ui.js',
  './js/storage.js',
  './js/cameraControls.js',
  './js/audio.js',
  './js/effects.js',
  './js/axesGizmo.js',
  './js/autoPlay.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SELF_PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // unpkg.com 의 three.js — 첫 fetch 시 네트워크에서 받아 캐시에 저장.
  // 이후 오프라인에서도 동작하도록.
  if (url.hostname === 'unpkg.com') {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  // 같은 origin — cache-first, 없으면 네트워크.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request)),
    );
  }
});

function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const fetchPromise = fetch(request)
      .then((res) => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => cached);
    return cached || fetchPromise;
  });
}
