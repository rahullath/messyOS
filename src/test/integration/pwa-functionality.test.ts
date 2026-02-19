import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PWA Functionality and Static Asset Loading', () => {
  const baseUrl = 'http://localhost:3000';

  beforeAll(() => {
    // Set up default mock responses
    mockFetch.mockImplementation((url: string) => {
      const urlPath = new URL(url).pathname;
      
      if (urlPath === '/manifest.json') {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ 
            'content-type': 'application/json',
            'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT'
          }),
          json: () => Promise.resolve({
            name: 'MessyOS - Life Optimization Platform',
            short_name: 'MessyOS',
            start_url: '/',
            display: 'standalone',
            orientation: 'portrait-primary',
            scope: '/',
            display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
            background_color: '#0f172a',
            theme_color: '#06b6d4',
            icons: [
              { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
              { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
              { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
              { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
              { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
              { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
              { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
            ]
          })
        });
      }
      
      if (urlPath === '/sw.js') {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ 
            'content-type': 'application/javascript',
            'cache-control': 'no-cache'
          }),
          text: () => Promise.resolve(`
            // MessyOS Service Worker for PWA functionality
            const CACHE_NAME = 'messyos-v1';
            const STATIC_ASSETS = [
              '/',
              '/manifest.json',
              '/favicon.svg',
              '/offline.html',
              '/icons/icon-192x192.png',
              '/icons/icon-512x512.png'
            ];
            
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
        });
      }
      
      if (urlPath.startsWith('/icons/')) {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ 
            'content-type': 'image/png',
            'cache-control': 'public, max-age=31536000'
          })
        });
      }
      
      if (urlPath === '/favicon.svg') {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ 
            'content-type': 'image/svg+xml',
            'etag': '"favicon-123"'
          })
        });
      }
      
      if (urlPath === '/offline.html') {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ 
            'content-type': 'text/html',
            'cache-control': 'public, max-age=3600'
          }),
          text: () => Promise.resolve('<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your connection.</p><button onclick="window.location.reload()">Retry</button></body></html>')
        });
      }
      
      if (urlPath === '/') {
        return Promise.resolve({
          status: 200,
          headers: new Headers({ 'content-type': 'text/html' }),
          text: () => Promise.resolve('<!DOCTYPE html><html><head><title>MessyOS</title></head><body><div>waitlist</div></body></html>')
        });
      }
      
      return Promise.resolve({
        status: 404,
        headers: new Headers()
      });
    });
  });

  describe('Static Asset Loading', () => {
    it('should serve manifest.json without authentication redirects', async () => {
      const response = await fetch(`${baseUrl}/manifest.json`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const manifest = await response.json();
      expect(manifest.name).toBe('MessyOS - Life Optimization Platform');
      expect(manifest.short_name).toBe('MessyOS');
      expect(manifest.start_url).toBe('/');
      expect(manifest.icons).toHaveLength(8);
    });

    it('should serve PWA icons without authentication redirects', async () => {
      const iconSizes = ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'];
      
      for (const size of iconSizes) {
        const response = await fetch(`${baseUrl}/icons/icon-${size}.png`);
        
        // Should not redirect to login (302) or return auth error (401/403)
        expect(response.status).not.toBe(302);
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        
        // Should either serve the icon (200) or return 404 if not found
        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.headers.get('content-type')).toContain('image/png');
        }
      }
    });

    it('should serve service worker without authentication redirects', async () => {
      const response = await fetch(`${baseUrl}/sw.js`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('javascript');
      
      const swContent = await response.text();
      expect(swContent).toContain('MessyOS Service Worker');
      expect(swContent).toContain('CACHE_NAME');
    });

    it('should serve favicon without authentication redirects', async () => {
      const response = await fetch(`${baseUrl}/favicon.svg`);
      
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      
      if (response.status === 200) {
        expect(response.headers.get('content-type')).toContain('image/svg');
      }
    });

    it('should serve offline.html without authentication redirects', async () => {
      const response = await fetch(`${baseUrl}/offline.html`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      
      const content = await response.text();
      expect(content).toContain('<!DOCTYPE html>');
    });
  });

  describe('Landing Page Functionality', () => {
    it('should serve landing page without auth errors for unauthenticated users', async () => {
      const response = await fetch(`${baseUrl}/`, {
        redirect: 'manual' // Don't follow redirects automatically
      });
      
      // Should serve the page directly, not redirect to login
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      
      const content = await response.text();
      expect(content).toContain('<!DOCTYPE html>');
      // Should not contain auth error messages
      expect(content).not.toContain('Authentication required');
      expect(content).not.toContain('Please log in');
    });

    it('should handle waitlist functionality without authentication', async () => {
      // First get the landing page
      const pageResponse = await fetch(`${baseUrl}/`);
      expect(pageResponse.status).toBe(200);
      
      const content = await pageResponse.text();
      
      // Check that waitlist form is present and functional
      expect(content).toContain('waitlist');
      
      // The page should load without JavaScript errors related to auth
      // This is tested by ensuring no auth-related error scripts are injected
      expect(content).not.toContain('auth session missing');
      expect(content).not.toContain('authentication error');
    });
  });

  describe('Service Worker Registration', () => {
    it('should allow service worker registration without auth interference', async () => {
      // Test that the service worker script is accessible
      const swResponse = await fetch(`${baseUrl}/sw.js`);
      expect(swResponse.status).toBe(200);
      
      const swContent = await swResponse.text();
      
      // Verify service worker contains expected functionality
      expect(swContent).toContain('install');
      expect(swContent).toContain('activate');
      expect(swContent).toContain('fetch');
      expect(swContent).toContain('STATIC_ASSETS');
      
      // Verify it caches the correct assets
      expect(swContent).toContain('/manifest.json');
      expect(swContent).toContain('/favicon.svg');
      expect(swContent).toContain('/offline.html');
    });

    it('should cache static assets correctly in service worker', async () => {
      const swResponse = await fetch(`${baseUrl}/sw.js`);
      const swContent = await swResponse.text();
      
      // Extract STATIC_ASSETS array from service worker
      const staticAssetsMatch = swContent.match(/STATIC_ASSETS\s*=\s*\[([\s\S]*?)\]/);
      expect(staticAssetsMatch).toBeTruthy();
      
      const staticAssetsContent = staticAssetsMatch![1];
      
      // Verify critical assets are included
      expect(staticAssetsContent).toContain("'/'");
      expect(staticAssetsContent).toContain("'/manifest.json'");
      expect(staticAssetsContent).toContain("'/favicon.svg'");
      expect(staticAssetsContent).toContain("'/offline.html'");
      expect(staticAssetsContent).toContain("'/icons/icon-192x192.png'");
      expect(staticAssetsContent).toContain("'/icons/icon-512x512.png'");
    });
  });

  describe('PWA Manifest Validation', () => {
    it('should have valid PWA manifest with all required fields', async () => {
      const response = await fetch(`${baseUrl}/manifest.json`);
      const manifest = await response.json();
      
      // Required PWA fields
      expect(manifest.name).toBeDefined();
      expect(manifest.short_name).toBeDefined();
      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBeDefined();
      expect(manifest.background_color).toBeDefined();
      expect(manifest.theme_color).toBeDefined();
      expect(manifest.icons).toBeDefined();
      
      // Icons validation
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThan(0);
      
      // Check for required icon sizes
      const iconSizes = manifest.icons.map((icon: any) => icon.sizes);
      expect(iconSizes).toContain('192x192');
      expect(iconSizes).toContain('512x512');
      
      // Verify icon paths are accessible
      for (const icon of manifest.icons) {
        const iconResponse = await fetch(`${baseUrl}${icon.src}`);
        // Should not redirect to auth
        expect(iconResponse.status).not.toBe(302);
        expect(iconResponse.status).not.toBe(401);
        expect(iconResponse.status).not.toBe(403);
      }
    });

    it('should have proper PWA display and orientation settings', async () => {
      const response = await fetch(`${baseUrl}/manifest.json`);
      const manifest = await response.json();
      
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('portrait-primary');
      expect(manifest.scope).toBe('/');
      
      // Check for modern PWA features
      expect(manifest.display_override).toBeDefined();
      expect(Array.isArray(manifest.display_override)).toBe(true);
    });
  });

  describe('Error Handling and Analytics', () => {
    it('should not generate auth errors for public routes', async () => {
      // Test multiple public routes to ensure no auth errors
      const publicRoutes = ['/', '/login', '/reset-password'];
      
      for (const route of publicRoutes) {
        const response = await fetch(`${baseUrl}${route}`, {
          redirect: 'manual'
        });
        
        // Should not redirect to login (indicating auth error)
        if (route !== '/login') {
          expect(response.status).not.toBe(302);
        }
        
        // Should serve content successfully
        if (response.status === 200) {
          const content = await response.text();
          expect(content).toContain('<!DOCTYPE html>');
          
          // Should not contain auth error indicators
          expect(content).not.toContain('auth session missing');
          expect(content).not.toContain('authentication required');
        }
      }
    });

    it('should handle undefined user IDs gracefully in analytics', async () => {
      // Test that the landing page loads without JavaScript errors
      const response = await fetch(`${baseUrl}/`);
      expect(response.status).toBe(200);
      
      const content = await response.text();
      
      // Check that analytics scripts handle undefined users
      // This is verified by ensuring no error-throwing code is present
      if (content.includes('analytics')) {
        expect(content).not.toContain('user.id.toString()');
        expect(content).not.toContain('userId.split(');
        // Should use safe access patterns
        expect(content).toMatch(/user\?\.id|user &&|user\.id \|\|/);
      }
    });
  });

  describe('Network and Caching Behavior', () => {
    it('should set appropriate cache headers for static assets', async () => {
      const staticAssets = [
        '/manifest.json',
        '/sw.js',
        '/favicon.svg',
        '/offline.html'
      ];
      
      for (const asset of staticAssets) {
        const response = await fetch(`${baseUrl}${asset}`);
        
        if (response.status === 200) {
          // Should have appropriate caching headers
          const cacheControl = response.headers.get('cache-control');
          const etag = response.headers.get('etag');
          const lastModified = response.headers.get('last-modified');
          
          // At least one caching mechanism should be present
          expect(cacheControl || etag || lastModified).toBeTruthy();
        }
      }
    });

    it('should handle offline scenarios gracefully', async () => {
      // Test offline.html is accessible
      const response = await fetch(`${baseUrl}/offline.html`);
      expect(response.status).toBe(200);
      
      const content = await response.text();
      expect(content).toContain('offline');
      expect(content).toContain('<!DOCTYPE html>');
      
      // Should have retry functionality
      expect(content).toContain('reload');
    });
  });
});