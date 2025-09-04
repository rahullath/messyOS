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
  
  if (event.tag === 'habit-sync') {
    event.waitUntil(syncHabitEntries());
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
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'complete' && data.habitId) {
    // Handle habit completion from notification
    event.waitUntil(handleHabitCompletion(data.habitId, data.habitName));
  } else if (action === 'snooze' && data.habitId) {
    // Snooze for 1 hour
    event.waitUntil(scheduleSnoozeNotification(data.habitId, data.habitName));
  } else if (action === 'dismiss') {
    // Just close the notification
    return;
  } else if (action === 'explore') {
    event.waitUntil(clients.openWindow('/dashboard'));
  } else {
    // Default action - open the habits page
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/habits') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(data.url || '/habits');
        }
      })
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

// Handle habit completion from notification
async function handleHabitCompletion(habitId, habitName) {
  try {
    console.log('Service Worker: Completing habit from notification', habitId);
    
    const response = await fetch('/api/habits/batch-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        completions: [{
          habitId: habitId,
          value: 1,
          date: new Date().toISOString().split('T')[0],
          notes: 'Completed from notification'
        }]
      })
    });

    if (response.ok) {
      // Show success notification
      await self.registration.showNotification(`${habitName} completed! 🎉`, {
        body: 'Great job staying consistent!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: `habit-completed-${habitId}`,
        requireInteraction: false,
        vibrate: [100, 50, 100],
        data: { type: 'success', habitId }
      });
      
      // Notify main thread
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'HABIT_COMPLETED_FROM_NOTIFICATION',
          habitId,
          habitName
        });
      });
    } else {
      throw new Error('Failed to complete habit');
    }
  } catch (error) {
    console.error('Service Worker: Error completing habit:', error);
    
    // Show error notification
    await self.registration.showNotification('Unable to complete habit', {
      body: 'Please open the app to complete your habit.',
      icon: '/icons/icon-192x192.png',
      tag: `habit-error-${habitId}`,
      actions: [
        { action: 'open', title: 'Open App' }
      ],
      data: { type: 'error', habitId }
    });
  }
}

// Schedule snooze notification
async function scheduleSnoozeNotification(habitId, habitName) {
  console.log('Service Worker: Scheduling snooze notification', habitId);
  
  // Schedule notification for 1 hour later
  setTimeout(async () => {
    await self.registration.showNotification(`Reminder: ${habitName}`, {
      body: 'Don\'t forget to complete your habit!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: `habit-snooze-${habitId}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'complete', title: 'Mark Complete' },
        { action: 'snooze', title: 'Snooze Again' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      data: {
        type: 'reminder',
        habitId,
        habitName,
        url: '/habits'
      }
    });
  }, 60 * 60 * 1000); // 1 hour
}

async function syncTokenData() {
  try {
    // Implement token sync logic here
    console.log('Service Worker: Syncing token data');
  } catch (error) {
    console.error('Service Worker: Token sync failed', error);
  }
}

async function syncHabitEntries() {
  try {
    console.log('Service Worker: Syncing habit entries...');
    
    // Get offline queue from localStorage
    const offlineQueue = await getOfflineHabitQueue();
    
    if (offlineQueue.length === 0) {
      console.log('Service Worker: No offline habit entries to sync');
      return;
    }
    
    let syncedCount = 0;
    const failedEntries = [];
    
    for (const entry of offlineQueue) {
      try {
        const response = await fetch(`/api/habits/${entry.habitId}/log-enhanced`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value: entry.value,
            date: entry.date,
            notes: `Synced from offline (${new Date(entry.timestamp).toLocaleString()})`
          })
        });
        
        if (response.ok) {
          syncedCount++;
        } else {
          failedEntries.push(entry);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync habit entry:', error);
        failedEntries.push(entry);
      }
    }
    
    // Update the offline queue to remove synced entries
    await updateOfflineQueue(failedEntries);
    
    console.log(`Service Worker: Successfully synced ${syncedCount} habit entries`);
    
    // Notify the main thread about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'HABIT_SYNC_COMPLETE',
        syncedCount,
        failedCount: failedEntries.length
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Habit sync failed:', error);
    throw error;
  }
}

async function getOfflineHabitQueue() {
  try {
    // Since we can't access localStorage directly in service worker,
    // we'll need to communicate with the main thread
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data.queue || []);
        };
        
        clients[0].postMessage({
          type: 'GET_OFFLINE_QUEUE'
        }, [channel.port2]);
      });
    }
    return [];
  } catch (error) {
    console.error('Service Worker: Failed to get offline queue:', error);
    return [];
  }
}

async function updateOfflineQueue(remainingEntries) {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'UPDATE_OFFLINE_QUEUE',
        queue: remainingEntries
      });
    }
  } catch (error) {
    console.error('Service Worker: Failed to update offline queue:', error);
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