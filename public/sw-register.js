(() => {
  if (typeof window === 'undefined') return;

  const OFFLINE_QUEUE_KEY = 'meshos-offline-queue-v1';
  const OFFLINE_MUTATION_ENDPOINTS = [
    '/api/habits',
    '/api/time-blocks',
    '/api/daily-plan',
    '/api/auth/preferences',
    '/api/auth/profile',
  ];

  function shouldQueue(url, method) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) return false;
    return OFFLINE_MUTATION_ENDPOINTS.some((prefix) => url.includes(prefix));
  }

  function loadQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveQueue(queue) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent('offline-queue-size', { detail: { size: queue.length } }));
    } catch {
      // noop
    }
  }

  function queueRequest(url, init = {}) {
    const queue = loadQueue();
    queue.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      url,
      method: init.method || 'POST',
      headers: init.headers || { 'Content-Type': 'application/json' },
      body: typeof init.body === 'string' ? init.body : null,
      queuedAt: new Date().toISOString(),
    });
    saveQueue(queue);
  }

  async function flushQueue() {
    const queue = loadQueue();
    if (!queue.length || !navigator.onLine) return;

    const remaining = [];
    for (const item of queue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        if (!response.ok) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    saveQueue(remaining);
    if (queue.length !== remaining.length) {
      window.dispatchEvent(new CustomEvent('offline-queue-flushed', {
        detail: { sent: queue.length - remaining.length, remaining: remaining.length },
      }));
    }
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : input.url;
    const method = (init.method || (typeof input !== 'string' ? input.method : 'GET') || 'GET').toUpperCase();

    try {
      return await nativeFetch(input, init);
    } catch (error) {
      if (shouldQueue(requestUrl, method)) {
        queueRequest(requestUrl, { ...init, method });
        return new Response(JSON.stringify({
          success: true,
          queued: true,
          message: 'Saved offline. Will sync when connection returns.',
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }
  };

  window.addEventListener('online', () => {
    flushQueue().catch(() => undefined);
  });

  // Register service worker for caching/offline page support.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch {
        // noop
      }
    });
  }

  // Try queue flush once on startup.
  flushQueue().catch(() => undefined);
})();
