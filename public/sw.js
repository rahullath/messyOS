// MessyOS Service Worker for PWA functionality
const CACHE_NAME = 'messos-v1';
const STATIC_CACHE_NAME = 'messos-static-v1';
const DYNAMIC_CACHE_NAME = 'messos-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.svg',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add critical CSS and JS files here when available
];

// Assets to cache on first request
const DYNAMIC_ASSETS = [
  '/dashboard',
  '/wallet',
  '/onboarding',
  '/reset-password',
  '/auth/callback'
];

// API endpoints to cache for offline functionality
const API_CACHE_PATTERNS = [
  '/api/auth/session',
  '/api/tokens/balance',
  '/api/user/profile'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle API requests with cache-first strategy for specific endpoints
  if (url.pathname.startsWith('/api/')) {
    if (API_CACHE_PATTERNS.some(pattern => url.pathname.startsWith(pattern))) {
      event.respondWith(
        caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              // Return cached version and update in background
              fetch(request)
                .then(networkResponse => {
                  if (networkResponse && networkResponse.status === 200) {
                    caches.open(DYNAMIC_CACHE_NAME)
                      .then(cache => cache.put(request, networkResponse.clone()));
                  }
                })
                .catch(() => {}); // Ignore network errors
              
              return cachedResponse;
            }
            
            // Not in cache, fetch from network and cache
            return fetch(request)
              .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                  const responseToCache = networkResponse.clone();
                  caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => cache.put(request, responseToCache));
                }
                return networkResponse;
              })
              .catch(() => {
                // Return offline response for critical API endpoints
                return new Response(JSON.stringify({ 
                  error: 'Offline', 
                  message: 'This feature requires an internet connection' 
                }), {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                });
              });
          })
      );
    }
    return; // Let other API requests go to network
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', request.url);
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone the response
            const responseToCache = networkResponse.clone();
            
            // Cache dynamic assets
            if (DYNAMIC_ASSETS.some(asset => url.pathname.startsWith(asset))) {
              caches.open(DYNAMIC_CACHE_NAME)
                .then((cache) => {
                  console.log('Service Worker: Caching dynamic asset', request.url);
                  cache.put(request, responseToCache);
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('Service Worker: Network request failed', error);
            
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/offline.html') || 
                     new Response(`
                       <!DOCTYPE html>
                       <html><head><title>Offline</title></head>
                       <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                         <h1>You're Offline</h1>
                         <p>Please check your connection and try again.</p>
                         <button onclick="window.location.reload()">Retry</button>
                       </body></html>
                     `, {
                       status: 503,
                       statusText: 'Service Unavailable',
                       headers: { 'Content-Type': 'text/html' }
                     });
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'auth-retry') {
    event.waitUntil(retryFailedAuth());
  }
  
  if (event.tag === 'token-sync') {
    event.waitUntil(syncTokenData());
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from MessyOS',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open MessyOS',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('MessyOS', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

// Helper functions
async function retryFailedAuth() {
  try {
    // Implement auth retry logic here
    console.log('Service Worker: Retrying failed authentication');
  } catch (error) {
    console.error('Service Worker: Auth retry failed', error);
  }
}

async function syncTokenData() {
  try {
    // Implement token sync logic here
    console.log('Service Worker: Syncing token data');
  } catch (error) {
    console.error('Service Worker: Token sync failed', error);
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});