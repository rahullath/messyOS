// src/lib/habits/offline-sync.ts
export interface OfflineHabitEntry {
  id: string;
  habitId: string;
  value: number;
  date: string;
  timestamp: number;
  synced: boolean;
  retryCount: number;
}

export class HabitOfflineSync {
  private static instance: HabitOfflineSync;
  private queue: OfflineHabitEntry[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private maxRetries: number = 3;

  private constructor() {
    this.loadQueue();
    this.setupEventListeners();
  }

  static getInstance(): HabitOfflineSync {
    if (!HabitOfflineSync.instance) {
      HabitOfflineSync.instance = new HabitOfflineSync();
    }
    return HabitOfflineSync.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncQueue();
      this.registerBackgroundSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Sync when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.syncQueue();
      }
    });

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'HABIT_SYNC_COMPLETE') {
          // Remove synced entries from local queue
          this.queue = this.queue.filter(entry => !entry.synced);
          this.saveQueue();
          
          // Dispatch event for UI updates
          window.dispatchEvent(new CustomEvent('habitSyncComplete', {
            detail: { 
              success: event.data.syncedCount, 
              failed: event.data.failedCount, 
              remaining: this.queue.length 
            }
          }));
        } else if (event.data.type === 'GET_OFFLINE_QUEUE') {
          // Send queue to service worker
          event.ports[0].postMessage({ queue: this.queue });
        } else if (event.data.type === 'UPDATE_OFFLINE_QUEUE') {
          // Update queue from service worker
          this.queue = event.data.queue;
          this.saveQueue();
        }
      });
    }
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem('habitOfflineQueue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('habitOfflineQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  addToQueue(habitId: string, value: number, date?: string): string {
    const entry: OfflineHabitEntry = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      habitId,
      value,
      date: date || new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    };

    this.queue.push(entry);
    this.saveQueue();

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncQueue();
    } else {
      // Register for background sync when back online
      this.registerBackgroundSync();
    }

    return entry.id;
  }

  async syncQueue(): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress || !this.isOnline) {
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let successCount = 0;
    let failedCount = 0;

    const unsyncedEntries = this.queue.filter(entry => !entry.synced && entry.retryCount < this.maxRetries);

    for (const entry of unsyncedEntries) {
      try {
        await this.syncEntry(entry);
        entry.synced = true;
        successCount++;
      } catch (error) {
        console.error('Failed to sync entry:', error);
        entry.retryCount++;
        failedCount++;
      }
    }

    // Remove synced entries and entries that exceeded max retries
    this.queue = this.queue.filter(entry => !entry.synced && entry.retryCount < this.maxRetries);
    this.saveQueue();

    this.syncInProgress = false;

    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('habitSyncComplete', {
      detail: { success: successCount, failed: failedCount, remaining: this.queue.length }
    }));

    return { success: successCount, failed: failedCount };
  }

  private async syncEntry(entry: OfflineHabitEntry): Promise<void> {
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
  }

  getQueueStatus() {
    return {
      total: this.queue.length,
      unsynced: this.queue.filter(e => !e.synced).length,
      failed: this.queue.filter(e => e.retryCount >= this.maxRetries).length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  // Force sync a specific entry
  async retrySyncEntry(entryId: string): Promise<boolean> {
    const entry = this.queue.find(e => e.id === entryId);
    if (!entry || entry.synced) return false;

    try {
      await this.syncEntry(entry);
      entry.synced = true;
      this.saveQueue();
      return true;
    } catch (error) {
      entry.retryCount++;
      this.saveQueue();
      return false;
    }
  }

  private registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        return (registration as any).sync.register('habit-sync');
      }).catch(error => {
        console.error('Background sync registration failed:', error);
      });
    }
  }
}

// Utility functions for React components
export const useOfflineSync = () => {
  const sync = HabitOfflineSync.getInstance();
  
  return {
    addToQueue: (habitId: string, value: number, date?: string) => sync.addToQueue(habitId, value, date),
    syncQueue: () => sync.syncQueue(),
    getStatus: () => sync.getQueueStatus(),
    clearQueue: () => sync.clearQueue()
  };
};

// Background sync registration for service worker
export const registerBackgroundSync = () => {
  if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(registration => {
      return (registration as any).sync.register('habit-sync');
    }).catch(error => {
      console.error('Background sync registration failed:', error);
    });
  }
};