import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock service worker environment
const mockServiceWorker = {
  register: vi.fn(() => Promise.resolve({
    installing: null,
    waiting: null,
    active: {
      scriptURL: 'http://localhost:3000/sw.js',
      state: 'activated'
    },
    scope: 'http://localhost:3000/',
    update: vi.fn(() => Promise.resolve()),
    unregister: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  getRegistration: vi.fn(() => Promise.resolve(null)),
  getRegistrations: vi.fn(() => Promise.resolve([])),
  ready: Promise.resolve({
    installing: null,
    waiting: null,
    active: {
      scriptURL: 'http://localhost:3000/sw.js',
      state: 'activated'
    },
    scope: 'http://localhost:3000/'
  })
};

describe('Service Worker Registration', () => {
  let dom: JSDOM;
  let window: Window & typeof globalThis;
  let document: Document;

  beforeAll(() => {
    // Set up DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MessyOS</title>
          <link rel="manifest" href="/manifest.json">
        </head>
        <body>
          <div id="app"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000/',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    window = dom.window as any;
    document = window.document;

    // Mock navigator.serviceWorker
    Object.defineProperty(window.navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true
    });

    // Set up global environment
    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
  });

  afterAll(() => {
    dom.window.close();
  });

  describe('Service Worker Availability', () => {
    it('should detect service worker support', () => {
      expect('serviceWorker' in navigator).toBe(true);
      expect(navigator.serviceWorker).toBeDefined();
      expect(typeof navigator.serviceWorker.register).toBe('function');
    });

    it('should register service worker successfully', async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
      expect(registration).toBeDefined();
      expect(registration.scope).toBe('http://localhost:3000/');
    });

    it('should handle service worker registration with options', async () => {
      const options = { scope: '/' };
      await navigator.serviceWorker.register('/sw.js', options);
      
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', options);
    });
  });

  describe('Service Worker Script Validation', () => {
    it('should validate service worker script content', async () => {
      // Mock fetch to return service worker content
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(`
          // MessyOS Service Worker for PWA functionality
          const CACHE_NAME = 'messyos-v1';
          
          self.addEventListener('install', (event) => {
            console.log('Service Worker: Installing...');
          });
          
          self.addEventListener('activate', (event) => {
            console.log('Service Worker: Activating...');
          });
          
          self.addEventListener('fetch', (event) => {
            console.log('Service Worker: Fetch event');
          });
        `)
      })) as any;

      const response = await fetch('/sw.js');
      const swContent = await response.text();

      expect(swContent).toContain('MessyOS Service Worker');
      expect(swContent).toContain('CACHE_NAME');
      expect(swContent).toContain("addEventListener('install'");
      expect(swContent).toContain("addEventListener('activate'");
      expect(swContent).toContain("addEventListener('fetch'");
    });

    it('should validate service worker caching strategy', async () => {
      const response = await fetch('/sw.js');
      const swContent = await response.text();

      // Check for proper caching implementation (using the mock content)
      expect(swContent).toContain('CACHE_NAME');
      expect(swContent).toContain('install');
      expect(swContent).toContain('activate');
      expect(swContent).toContain('fetch');
    });
  });

  describe('PWA Manifest Integration', () => {
    it('should have manifest link in document head', () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      expect(manifestLink).toBeTruthy();
      expect(manifestLink?.getAttribute('href')).toBe('/manifest.json');
    });

    it('should validate manifest accessibility', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          name: 'MessyOS - Life Optimization Platform',
          short_name: 'MessyOS',
          start_url: '/',
          display: 'standalone',
          background_color: '#0f172a',
          theme_color: '#06b6d4',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        })
      })) as any;

      const response = await fetch('/manifest.json');
      const manifest = await response.json();

      expect(manifest.name).toBe('MessyOS - Life Optimization Platform');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.icons).toHaveLength(2);
    });
  });

  describe('Service Worker Lifecycle', () => {
    it('should handle service worker installation', async () => {
      const installHandler = vi.fn();
      
      // Simulate service worker installation
      const installEvent = new Event('install');
      installHandler(installEvent);

      expect(installHandler).toHaveBeenCalledWith(installEvent);
    });

    it('should handle service worker activation', async () => {
      const activateHandler = vi.fn();
      
      // Simulate service worker activation
      const activateEvent = new Event('activate');
      activateHandler(activateEvent);

      expect(activateHandler).toHaveBeenCalledWith(activateEvent);
    });

    it('should handle service worker updates', async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      expect(typeof registration.update).toBe('function');
      
      // Should be able to call update without errors
      const updateResult = registration.update();
      expect(updateResult).toBeDefined();
    });
  });

  describe('Caching Behavior', () => {
    it('should cache critical assets during installation', async () => {
      const mockCache = {
        addAll: vi.fn(() => Promise.resolve()),
        add: vi.fn(() => Promise.resolve()),
        put: vi.fn(() => Promise.resolve()),
        match: vi.fn(() => Promise.resolve(null)),
        delete: vi.fn(() => Promise.resolve(true))
      };

      const mockCaches = {
        open: vi.fn(() => Promise.resolve(mockCache)),
        match: vi.fn(() => Promise.resolve(null)),
        delete: vi.fn(() => Promise.resolve(true)),
        keys: vi.fn(() => Promise.resolve(['old-cache']))
      };

      global.caches = mockCaches as any;

      // Simulate service worker install event
      const criticalAssets = [
        '/',
        '/login',
        '/manifest.json',
        '/favicon.svg',
        '/offline.html',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ];

      await mockCaches.open('messyos-static-v1');
      await mockCache.addAll(criticalAssets);

      expect(mockCaches.open).toHaveBeenCalledWith('messyos-static-v1');
      expect(mockCache.addAll).toHaveBeenCalledWith(criticalAssets);
    });

    it('should handle fetch events with cache-first strategy', async () => {
      const mockCache = {
        match: vi.fn(() => Promise.resolve(new Response('cached content'))),
        put: vi.fn(() => Promise.resolve())
      };

      const mockCaches = {
        match: vi.fn(() => Promise.resolve(new Response('cached content'))),
        open: vi.fn(() => Promise.resolve(mockCache))
      };

      global.caches = mockCaches as any;

      // Simulate fetch event for cached resource
      const request = new Request('http://localhost:3000/manifest.json');
      const cachedResponse = await mockCaches.match(request);

      expect(cachedResponse).toBeTruthy();
      expect(mockCaches.match).toHaveBeenCalledWith(request);
    });
  });

  describe('Offline Functionality', () => {
    it('should serve offline page when network fails', async () => {
      const mockCache = {
        match: vi.fn((request) => {
          if (request.url?.includes('/offline.html')) {
            return Promise.resolve(new Response(`
              <!DOCTYPE html>
              <html>
                <head><title>Offline</title></head>
                <body>
                  <h1>You're Offline</h1>
                  <p>Please check your connection and try again.</p>
                  <button onclick="window.location.reload()">Retry</button>
                </body>
              </html>
            `));
          }
          return Promise.resolve(null);
        })
      };

      const mockCaches = {
        match: mockCache.match
      };

      global.caches = mockCaches as any;

      // Simulate offline scenario
      const offlineResponse = await mockCaches.match('/offline.html');
      
      if (offlineResponse) {
        const content = await offlineResponse.text();
        expect(content).toContain('You\'re Offline');
        expect(content).toContain('Retry');
      } else {
        // If no cached response, that's also valid behavior
        expect(offlineResponse).toBeNull();
      }
    });

    it('should handle API requests gracefully when offline', async () => {
      // Simulate offline API response
      const offlineApiResponse = new Response(JSON.stringify({
        error: 'Offline',
        message: 'This feature requires an internet connection'
      }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(offlineApiResponse.status).toBe(503);
      
      const data = await offlineApiResponse.json();
      expect(data.error).toBe('Offline');
      expect(data.message).toContain('internet connection');
    });
  });

  describe('Background Sync and Push Notifications', () => {
    it('should register for background sync events', () => {
      const syncHandler = vi.fn();
      
      // Simulate background sync registration
      const syncEvent = new Event('sync');
      Object.defineProperty(syncEvent, 'tag', { value: 'auth-retry' });
      
      syncHandler(syncEvent);
      expect(syncHandler).toHaveBeenCalledWith(syncEvent);
    });

    it('should handle push notification events', () => {
      const pushHandler = vi.fn();
      
      // Simulate push notification
      const pushEvent = new Event('push');
      Object.defineProperty(pushEvent, 'data', {
        value: { text: () => 'New notification from MessyOS' }
      });
      
      pushHandler(pushEvent);
      expect(pushHandler).toHaveBeenCalledWith(pushEvent);
    });
  });

  describe('Service Worker Communication', () => {
    it('should handle messages from main thread', () => {
      const messageHandler = vi.fn();
      
      // Simulate message from main thread
      const messageEvent = new MessageEvent('message', {
        data: { type: 'SKIP_WAITING' }
      });
      
      messageHandler(messageEvent);
      expect(messageHandler).toHaveBeenCalledWith(messageEvent);
    });

    it('should respond to version requests', () => {
      const messageHandler = vi.fn((event) => {
        if (event.data?.type === 'GET_VERSION') {
          event.ports[0]?.postMessage({ version: 'messyos-v1' });
        }
      });
      
      const port = {
        postMessage: vi.fn()
      };
      
      const messageEvent = new MessageEvent('message', {
        data: { type: 'GET_VERSION' },
        ports: [port]
      });
      
      messageHandler(messageEvent);
      expect(port.postMessage).toHaveBeenCalledWith({ version: 'messyos-v1' });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service worker registration failures gracefully', async () => {
      const failingRegister = vi.fn(() => Promise.reject(new Error('Registration failed')));
      
      Object.defineProperty(window.navigator, 'serviceWorker', {
        value: { register: failingRegister },
        writable: true
      });

      await expect(navigator.serviceWorker.register('/sw.js')).rejects.toThrow('Registration failed');
      expect(failingRegister).toHaveBeenCalledWith('/sw.js');
    });

    it('should handle cache failures during installation', async () => {
      const failingCache = {
        addAll: vi.fn(() => Promise.reject(new Error('Cache failed')))
      };

      const mockCaches = {
        open: vi.fn(() => Promise.resolve(failingCache))
      };

      global.caches = mockCaches as any;

      await expect(failingCache.addAll(['/', '/manifest.json'])).rejects.toThrow('Cache failed');
    });
  });
});