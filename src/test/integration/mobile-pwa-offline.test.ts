// src/test/integration/mobile-pwa-offline.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock service worker and offline functionality
global.navigator = {
  ...global.navigator,
  serviceWorker: {
    register: vi.fn(),
    ready: Promise.resolve({
      sync: {
        register: vi.fn()
      }
    } as any),
    addEventListener: vi.fn(),
    postMessage: vi.fn()
  } as any,
  onLine: true
};

// Mock IndexedDB for offline storage
global.indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
} as any;

describe('Mobile PWA and Offline Functionality', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;
  let mockServiceWorker: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mobile-optimized DOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="manifest" href="/manifest.json">
        </head>
        <body>
          <div id="app" class="mobile-app">
            <!-- PWA Install Banner -->
            <div id="install-banner" class="hidden">
              <p>Install MessyOS for the best experience</p>
              <button id="install-btn">Install</button>
              <button id="dismiss-btn">Dismiss</button>
            </div>

            <!-- Network Status Indicator -->
            <div id="network-status" class="online">
              <span id="status-text">Online</span>
            </div>

            <!-- Offline Queue Indicator -->
            <div id="offline-queue" class="hidden">
              <span id="queue-count">0</span> actions pending sync
            </div>

            <!-- Mobile Quick Actions -->
            <div id="mobile-quick-actions">
              <div id="quick-habits-list"></div>
              <button id="sync-now-btn" class="hidden">Sync Now</button>
            </div>

            <!-- Touch-optimized habit cards -->
            <div id="habits-container" class="touch-optimized">
              <div class="habit-card swipeable" data-habit-id="habit-1">
                <h3>Exercise</h3>
                <div class="swipe-actions">
                  <button class="swipe-complete">✓</button>
                  <button class="swipe-skip">⏭</button>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window as any;
    
    // Set up global variables
    (global as any).document = document;
    (global as any).window = window;

    // Mock service worker registration
    mockServiceWorker = {
      register: vi.fn().mockResolvedValue({
        installing: null,
        waiting: null,
        active: {
          postMessage: vi.fn()
        },
        addEventListener: vi.fn(),
        update: vi.fn()
      }),
      ready: Promise.resolve({
        sync: {
          register: vi.fn().mockResolvedValue(undefined)
        },
        showNotification: vi.fn()
      })
    };

    (window as any).navigator = {
      ...window.navigator,
      serviceWorker: mockServiceWorker,
      onLine: true
    };

    // Mock IndexedDB
    const mockIDBRequest = {
      onsuccess: null,
      onerror: null,
      result: null,
      addEventListener: vi.fn()
    };

    const mockIDBDatabase = {
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockReturnValue(mockIDBRequest),
          get: vi.fn().mockReturnValue(mockIDBRequest),
          getAll: vi.fn().mockReturnValue(mockIDBRequest),
          delete: vi.fn().mockReturnValue(mockIDBRequest),
          clear: vi.fn().mockReturnValue(mockIDBRequest)
        }),
        oncomplete: null,
        onerror: null
      }),
      close: vi.fn()
    };

    (window as any).indexedDB = {
      open: vi.fn().mockReturnValue({
        ...mockIDBRequest,
        onupgradeneeded: null,
        result: mockIDBDatabase
      })
    };
  });

  describe('PWA Installation', () => {
    it('should handle PWA install prompt', async () => {
      let deferredPrompt: any = null;

      // Mock beforeinstallprompt event
      const mockInstallPrompt = {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };

      // Set up PWA install functionality
      (window as any).setupPWAInstall = () => {
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          deferredPrompt = e;
          
          const installBanner = document.getElementById('install-banner');
          installBanner?.classList.remove('hidden');
        });

        const installBtn = document.getElementById('install-btn');
        installBtn?.addEventListener('click', async () => {
          if (deferredPrompt) {
            await deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            
            if (choiceResult.outcome === 'accepted') {
              const installBanner = document.getElementById('install-banner');
              installBanner?.classList.add('hidden');
            }
            
            deferredPrompt = null;
          }
        });

        const dismissBtn = document.getElementById('dismiss-btn');
        dismissBtn?.addEventListener('click', () => {
          const installBanner = document.getElementById('install-banner');
          installBanner?.classList.add('hidden');
          deferredPrompt = null;
        });
      };

      // Initialize PWA install
      (window as any).setupPWAInstall();

      // Simulate beforeinstallprompt event
      const beforeInstallPromptEvent = new Event('beforeinstallprompt') as any;
      beforeInstallPromptEvent.prompt = mockInstallPrompt.prompt;
      beforeInstallPromptEvent.userChoice = mockInstallPrompt.userChoice;
      beforeInstallPromptEvent.preventDefault = vi.fn();

      window.dispatchEvent(beforeInstallPromptEvent);

      // Verify install banner is shown
      const installBanner = document.getElementById('install-banner');
      expect(installBanner?.classList.contains('hidden')).toBe(false);

      // Simulate clicking install button
      const installBtn = document.getElementById('install-btn');
      await installBtn?.click();

      // Verify prompt was called
      expect(mockInstallPrompt.prompt).toHaveBeenCalled();
    });

    it('should register service worker successfully', async () => {
      // Set up service worker registration
      (window as any).registerServiceWorker = async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            return registration;
          } catch (error) {
            console.error('Service worker registration failed:', error);
            throw error;
          }
        }
        throw new Error('Service workers not supported');
      };

      // Register service worker
      const registration = await (window as any).registerServiceWorker();

      // Verify registration was called
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
      expect(registration).toBeDefined();
    });
  });

  describe('Offline Functionality', () => {
    it('should detect network status changes', async () => {
      // Set up network status monitoring
      (window as any).setupNetworkMonitoring = () => {
        const updateNetworkStatus = (isOnline: boolean) => {
          const statusElement = document.getElementById('network-status');
          const statusText = document.getElementById('status-text');
          
          if (statusElement && statusText) {
            statusElement.className = isOnline ? 'online' : 'offline';
            statusText.textContent = isOnline ? 'Online' : 'Offline';
          }

          if (!isOnline) {
            (window as any).enableOfflineMode();
          } else {
            (window as any).syncOfflineQueue();
          }
        };

        window.addEventListener('online', () => updateNetworkStatus(true));
        window.addEventListener('offline', () => updateNetworkStatus(false));

        // Initial status
        updateNetworkStatus(navigator.onLine);
      };

      (window as any).enableOfflineMode = () => {
        const offlineQueue = document.getElementById('offline-queue');
        offlineQueue?.classList.remove('hidden');
      };

      // Initialize network monitoring
      (window as any).setupNetworkMonitoring();

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));

      // Verify offline status is displayed
      const statusElement = document.getElementById('network-status');
      const statusText = document.getElementById('status-text');
      
      expect(statusElement?.className).toBe('offline');
      expect(statusText?.textContent).toBe('Offline');

      // Verify offline queue is shown
      const offlineQueue = document.getElementById('offline-queue');
      expect(offlineQueue?.classList.contains('hidden')).toBe(false);
    });

    it('should queue actions when offline', async () => {
      // Mock offline storage
      const offlineQueue: any[] = [];

      (window as any).queueOfflineAction = async (action: any) => {
        // Store in IndexedDB (mocked)
        const request = indexedDB.open('HabitsOfflineDB', 1);
        
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['offlineQueue'], 'readwrite');
            const store = transaction.objectStore('offlineQueue');
            
            const addRequest = store.add({
              ...action,
              timestamp: Date.now(),
              id: Math.random().toString(36)
            });
            
            addRequest.onsuccess = () => {
              offlineQueue.push(action);
              (window as any).updateQueueDisplay();
              resolve(addRequest.result);
            };
            
            addRequest.onerror = () => reject(addRequest.error);
          };
          
          request.onerror = () => reject(request.error);
        });
      };

      (window as any).updateQueueDisplay = () => {
        const queueCount = document.getElementById('queue-count');
        if (queueCount) {
          queueCount.textContent = offlineQueue.length.toString();
        }

        const syncBtn = document.getElementById('sync-now-btn');
        if (offlineQueue.length > 0) {
          syncBtn?.classList.remove('hidden');
        } else {
          syncBtn?.classList.add('hidden');
        }
      };

      (window as any).logHabitOffline = async (habitId: string, value: number) => {
        const action = {
          type: 'LOG_HABIT',
          habitId,
          value,
          date: new Date().toISOString().split('T')[0]
        };

        if (!navigator.onLine) {
          await (window as any).queueOfflineAction(action);
          return { queued: true };
        }

        // If online, make API call
        return fetch(`/api/habits/${habitId}/log-enhanced`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action)
        });
      };

      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

      // Queue an offline action
      await (window as any).logHabitOffline('habit-1', 1);

      // Verify action was queued
      expect(offlineQueue).toHaveLength(1);
      expect(offlineQueue[0].type).toBe('LOG_HABIT');
      expect(offlineQueue[0].habitId).toBe('habit-1');

      // Verify queue display is updated
      const queueCount = document.getElementById('queue-count');
      expect(queueCount?.textContent).toBe('1');

      const syncBtn = document.getElementById('sync-now-btn');
      expect(syncBtn?.classList.contains('hidden')).toBe(false);
    });

    it('should sync offline queue when back online', async () => {
      const offlineQueue = [
        { type: 'LOG_HABIT', habitId: 'habit-1', value: 1, date: '2025-01-01' },
        { type: 'LOG_HABIT', habitId: 'habit-2', value: 1, date: '2025-01-01' }
      ];

      // Mock fetch for sync
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      (window as any).syncOfflineQueue = async () => {
        if (!navigator.onLine) return;

        const syncResults = [];

        for (const action of offlineQueue) {
          try {
            if (action.type === 'LOG_HABIT') {
              const response = await fetch(`/api/habits/${action.habitId}/log-enhanced`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  value: action.value,
                  date: action.date
                })
              });

              if (response.ok) {
                syncResults.push({ action, success: true });
              } else {
                syncResults.push({ action, success: false, error: 'API error' });
              }
            }
          } catch (error) {
            syncResults.push({ action, success: false, error: (error as Error).message });
          }
        }

        // Clear successfully synced actions
        const successfulSyncs = syncResults.filter(r => r.success);
        if (successfulSyncs.length > 0) {
          // Clear from IndexedDB (mocked)
          offlineQueue.splice(0, successfulSyncs.length);
          (window as any).updateQueueDisplay();
        }

        return syncResults;
      };

      (window as any).updateQueueDisplay = () => {
        const queueCount = document.getElementById('queue-count');
        if (queueCount) {
          queueCount.textContent = offlineQueue.length.toString();
        }
      };

      // Simulate going back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });

      // Sync offline queue
      const syncResults = await (window as any).syncOfflineQueue();

      // Verify API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith('/api/habits/habit-1/log-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1, date: '2025-01-01' })
      });

      // Verify sync results
      expect(syncResults).toHaveLength(2);
      expect(syncResults.every((r: any) => r.success)).toBe(true);

      // Verify queue was cleared
      const queueCount = document.getElementById('queue-count');
      expect(queueCount?.textContent).toBe('0');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle swipe gestures for habit completion', async () => {
      let swipeStartX = 0;
      let swipeEndX = 0;

      // Set up swipe gesture handling
      (window as any).setupSwipeGestures = () => {
        const habitCards = document.querySelectorAll('.habit-card.swipeable');

        habitCards.forEach(card => {
          card.addEventListener('touchstart', (e) => {
            const touch = (e as TouchEvent).touches[0];
            swipeStartX = touch.clientX;
          });

          card.addEventListener('touchend', (e) => {
            const touch = (e as TouchEvent).changedTouches[0];
            swipeEndX = touch.clientX;

            const swipeDistance = swipeEndX - swipeStartX;
            const minSwipeDistance = 100;

            if (Math.abs(swipeDistance) > minSwipeDistance) {
              const habitId = card.getAttribute('data-habit-id');
              
              if (swipeDistance > 0) {
                // Swipe right - complete
                (window as any).quickCompleteHabit(habitId);
              } else {
                // Swipe left - skip
                (window as any).quickSkipHabit(habitId);
              }
            }
          });

          // Visual feedback during swipe
          card.addEventListener('touchmove', (e) => {
            const touch = (e as TouchEvent).touches[0];
            const currentX = touch.clientX;
            const deltaX = currentX - swipeStartX;

            // Apply transform for visual feedback
            (card as HTMLElement).style.transform = `translateX(${deltaX * 0.3}px)`;
            
            if (deltaX > 50) {
              card.classList.add('swipe-complete-preview');
            } else if (deltaX < -50) {
              card.classList.add('swipe-skip-preview');
            } else {
              card.classList.remove('swipe-complete-preview', 'swipe-skip-preview');
            }
          });
        });
      };

      (window as any).quickCompleteHabit = async (habitId: string) => {
        const card = document.querySelector(`[data-habit-id="${habitId}"]`);
        card?.classList.add('completed');
        
        // Reset transform
        (card as HTMLElement).style.transform = '';
        
        return { success: true, action: 'completed' };
      };

      (window as any).quickSkipHabit = async (habitId: string) => {
        const card = document.querySelector(`[data-habit-id="${habitId}"]`);
        card?.classList.add('skipped');
        
        // Reset transform
        (card as HTMLElement).style.transform = '';
        
        return { success: true, action: 'skipped' };
      };

      // Initialize swipe gestures
      (window as any).setupSwipeGestures();

      // Simulate swipe right gesture
      const habitCard = document.querySelector('.habit-card[data-habit-id="habit-1"]');
      
      // Mock touch events
      const createTouchEvent = (type: string, clientX: number) => {
        const event = new Event(type) as any;
        event.touches = type === 'touchend' ? undefined : [{ clientX }];
        event.changedTouches = type === 'touchend' ? [{ clientX }] : undefined;
        return event;
      };

      // Simulate swipe right (complete)
      habitCard?.dispatchEvent(createTouchEvent('touchstart', 100));
      habitCard?.dispatchEvent(createTouchEvent('touchmove', 150));
      habitCard?.dispatchEvent(createTouchEvent('touchend', 250));

      // Verify habit was completed
      expect(habitCard?.classList.contains('completed')).toBe(true);

      // Test swipe left (skip) on another card
      const habitCard2 = document.createElement('div');
      habitCard2.className = 'habit-card swipeable';
      habitCard2.setAttribute('data-habit-id', 'habit-2');
      document.getElementById('habits-container')?.appendChild(habitCard2);

      // Re-setup gestures for new card
      (window as any).setupSwipeGestures();

      // Simulate swipe left
      habitCard2.dispatchEvent(createTouchEvent('touchstart', 250));
      habitCard2.dispatchEvent(createTouchEvent('touchmove', 200));
      habitCard2.dispatchEvent(createTouchEvent('touchend', 100));

      // Verify habit was skipped
      expect(habitCard2.classList.contains('skipped')).toBe(true);
    });

    it('should handle long press for enhanced logging', async () => {
      let longPressTimer: NodeJS.Timeout | null = null;
      const longPressDuration = 500; // ms

      // Set up long press handling
      (window as any).setupLongPress = () => {
        const habitCards = document.querySelectorAll('.habit-card');

        habitCards.forEach(card => {
          card.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            longPressTimer = setTimeout(() => {
              const habitId = card.getAttribute('data-habit-id');
              const habitName = card.querySelector('h3')?.textContent || 'Habit';
              (window as any).showEnhancedLoggingModal(habitId, habitName);
            }, longPressDuration);
          });

          card.addEventListener('touchend', () => {
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
          });

          card.addEventListener('touchmove', () => {
            if (longPressTimer) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
          });
        });
      };

      (window as any).showEnhancedLoggingModal = (habitId: string, habitName: string) => {
        // Create modal for testing
        const modal = document.createElement('div');
        modal.id = 'enhanced-logging-modal';
        modal.innerHTML = `<h2>Enhanced Logging: ${habitName}</h2>`;
        document.body.appendChild(modal);
        
        return { habitId, habitName, modalShown: true };
      };

      // Initialize long press
      (window as any).setupLongPress();

      // Simulate long press
      const habitCard = document.querySelector('.habit-card[data-habit-id="habit-1"]');
      
      const touchStartEvent = new Event('touchstart') as any;
      touchStartEvent.preventDefault = vi.fn();
      
      habitCard?.dispatchEvent(touchStartEvent);

      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, longPressDuration + 100));

      // Verify enhanced logging modal was shown
      const modal = document.getElementById('enhanced-logging-modal');
      expect(modal).toBeTruthy();
      expect(modal?.innerHTML).toContain('Enhanced Logging: Exercise');
    });
  });

  describe('Performance Optimization', () => {
    it('should handle large datasets efficiently on mobile', async () => {
      // Create large dataset
      const largeHabitsList = [];
      for (let i = 0; i < 1000; i++) {
        largeHabitsList.push({
          id: `habit-${i}`,
          name: `Habit ${i}`,
          current_streak: Math.floor(Math.random() * 100)
        });
      }

      // Set up virtual scrolling for performance
      (window as any).setupVirtualScrolling = (habits: any[]) => {
        const container = document.getElementById('habits-container');
        const itemHeight = 80; // px
        const visibleItems = Math.ceil(window.innerHeight / itemHeight);
        const bufferSize = 5;

        let scrollTop = 0;
        let startIndex = 0;
        let endIndex = Math.min(visibleItems + bufferSize, habits.length);

        const renderVisibleItems = () => {
          if (!container) return;
          
          container.innerHTML = '';
          
          for (let i = startIndex; i < endIndex; i++) {
            const habit = habits[i];
            const habitElement = document.createElement('div');
            habitElement.className = 'habit-card virtual-item';
            habitElement.style.height = `${itemHeight}px`;
            habitElement.innerHTML = `
              <h3>${habit.name}</h3>
              <p>Streak: ${habit.current_streak}</p>
            `;
            container.appendChild(habitElement);
          }
        };

        const handleScroll = () => {
          scrollTop = window.scrollY;
          const newStartIndex = Math.floor(scrollTop / itemHeight);
          const newEndIndex = Math.min(newStartIndex + visibleItems + bufferSize, habits.length);

          if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
            startIndex = newStartIndex;
            endIndex = newEndIndex;
            renderVisibleItems();
          }
        };

        window.addEventListener('scroll', handleScroll);
        renderVisibleItems();

        return { visibleItems: endIndex - startIndex };
      };

      const startTime = Date.now();
      const result = (window as any).setupVirtualScrolling(largeHabitsList);
      const endTime = Date.now();

      // Verify performance
      expect(endTime - startTime).toBeLessThan(100); // Should render quickly
      
      // Verify only visible items are rendered
      const renderedItems = document.querySelectorAll('.virtual-item');
      expect(renderedItems.length).toBeLessThan(50); // Much less than 1000
      expect(result.visibleItems).toBeGreaterThan(0);
    });

    it('should implement efficient caching for offline data', async () => {
      const cache = new Map();
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes

      // Set up caching system
      (window as any).cacheManager = {
        set: (key: string, data: any) => {
          cache.set(key, {
            data,
            timestamp: Date.now()
          });
        },

        get: (key: string) => {
          const cached = cache.get(key);
          if (!cached) return null;

          const isExpired = Date.now() - cached.timestamp > cacheExpiry;
          if (isExpired) {
            cache.delete(key);
            return null;
          }

          return cached.data;
        },

        clear: () => {
          cache.clear();
        },

        size: () => cache.size
      };

      // Test caching
      const testData = { habits: [{ id: 'habit-1', name: 'Exercise' }] };
      
      (window as any).cacheManager.set('habits-list', testData);
      
      // Verify data is cached
      const cachedData = (window as any).cacheManager.get('habits-list');
      expect(cachedData).toEqual(testData);
      expect((window as any).cacheManager.size()).toBe(1);

      // Test cache expiry (mock time passage)
      vi.advanceTimersByTime(cacheExpiry + 1000);
      
      const expiredData = (window as any).cacheManager.get('habits-list');
      expect(expiredData).toBeNull();
      expect((window as any).cacheManager.size()).toBe(0);
    });
  });
});