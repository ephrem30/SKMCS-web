// ============================================================
// sw.js — SKMCS 웹사이트 Service Worker
// git push 할 때 add_cache_busting.sh가 SW_VERSION을 자동 갱신합니다.
// ============================================================

const SW_VERSION = '20260811000706';
const CACHE_NAME = 'skmcs-cache-v' + SW_VERSION;

// ── 설치: 즉시 활성화 ──
self.addEventListener('install', event => {
    console.log('[SW] 설치됨, 버전:', SW_VERSION);
    self.skipWaiting();
});

// ── 활성화: 이전 버전 캐시 전부 삭제 ──
self.addEventListener('activate', event => {
    console.log('[SW] 활성화됨, 구버전 캐시 정리 중...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] 삭제:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => {
            console.log('[SW] 캐시 정리 완료');
            return self.clients.claim();
        })
    );
});

// ── Fetch 인터셉트: HTML 요청은 항상 네트워크 우선 ──
self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    // 외부 CDN은 통과
    if (url.origin !== self.location.origin && !url.hostname.includes('github.io')) {
        return;
    }

    // HTML 페이지 요청: 항상 네트워크 먼저 (iOS 캐시 완전 무시)
    const isNavigation = req.mode === 'navigate' ||
        (req.method === 'GET' && (req.headers.get('accept') || '').includes('text/html'));

    if (isNavigation) {
        event.respondWith(
            fetch(req, { cache: 'no-store' })
                .catch(() => caches.match(req))
        );
        return;
    }

    // CSS/JS/이미지: 캐시 우선, 없으면 네트워크
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(req).then(cached => {
                if (cached) return cached;
                return fetch(req).then(response => {
                    if (response && response.ok && req.method === 'GET') {
                        cache.put(req, response.clone());
                    }
                    return response;
                });
            });
        })
    );
});
