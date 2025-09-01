// src/lib/pwa/service-worker.ts - Service Worker registration and management
export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWACapabilities {
  isSupported: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
  hasServiceWorker: boolean;
}

class PWAService {
  private installPrompt: PWAInstallPrompt | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  /**
   * Initialize PWA functionality
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined') {
      return; // Skip on server-side
    }

    try {
      // Register service worker
      await this.registerServiceWorker();
      
      // Set up install prompt handling
      this.setupInstallPrompt();
      
      // Set up update handling
      this.setupUpdateHandling();
      
      console.log('PWA: Initialized successfully');
    } catch (error) {
      console.error('PWA: Initialization failed', error);
    }
  }

  /**
   * Register the service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('PWA: Service Worker registered', this.registration.scope);

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              this.notifyUpdate();
            }
          });
        }
      });

    } catch (error) {
      console.error('PWA: Service Worker registration failed', error);
      throw error;
    }
  }

  /**
   * Set up install prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event as any;
      console.log('PWA: Install prompt available');
      
      // Dispatch custom event for UI components
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA: App installed successfully');
      this.installPrompt = null;
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });
  }

  /**
   * Set up update handling
   */
  private setupUpdateHandling(): void {
    if (!this.registration) return;

    // Check for updates periodically
    setInterval(() => {
      this.registration?.update();
    }, 60000); // Check every minute

    // Handle messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        this.notifyUpdate();
      }
    });
  }

  /**
   * Prompt user to install the PWA
   */
  async promptInstall(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('PWA: Install prompt not available');
      return false;
    }

    try {
      await this.installPrompt.prompt();
      const result = await this.installPrompt.userChoice;
      
      console.log('PWA: Install prompt result', result.outcome);
      
      if (result.outcome === 'accepted') {
        this.installPrompt = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PWA: Install prompt failed', error);
      return false;
    }
  }

  /**
   * Update the service worker
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.registration) {
      throw new Error('No service worker registration found');
    }

    const waitingWorker = this.registration.waiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page after the new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }

  /**
   * Get PWA capabilities
   */
  getCapabilities(): PWACapabilities {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone === true;

    return {
      isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
      isInstalled: isStandalone,
      isInstallable: this.installPrompt !== null,
      isStandalone,
      hasServiceWorker: this.registration !== null
    };
  }

  /**
   * Check if app is running in standalone mode
   */
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Notify about available updates
   */
  private notifyUpdate(): void {
    console.log('PWA: Update available');
    
    // Dispatch custom event for UI components
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  /**
   * Clear all caches (for debugging)
   */
  async clearCaches(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('PWA: All caches cleared');
    }
  }

  /**
   * Get cache usage information
   */
  async getCacheInfo(): Promise<{ name: string; size: number }[]> {
    if (!('caches' in window)) {
      return [];
    }

    const cacheNames = await caches.keys();
    const cacheInfo = [];

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheInfo.push({
        name: cacheName,
        size: keys.length
      });
    }

    return cacheInfo;
  }
}

// Export singleton instance
export const pwaService = new PWAService();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  pwaService.init().catch(console.error);
}