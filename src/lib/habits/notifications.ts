// src/lib/habits/notifications.ts
export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface HabitReminder {
  habitId: string;
  habitName: string;
  time: string; // HH:MM format
  enabled: boolean;
  days: number[]; // 0-6, Sunday to Saturday
}

class HabitNotificationService {
  private registrationPromise: Promise<ServiceWorkerRegistration | null> = Promise.resolve(null);

  constructor() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      this.registrationPromise = this.initializeServiceWorker();
    }
  }

  private async initializeServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered for notifications');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return { granted: false, denied: true, default: false };
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };
  }

  async scheduleHabitReminder(reminder: HabitReminder): Promise<boolean> {
    const permission = await this.requestPermission();
    if (!permission.granted) {
      console.warn('Notification permission not granted');
      return false;
    }

    const registration = await this.registrationPromise;
    if (!registration) {
      console.error('Service Worker not available');
      return false;
    }

    try {
      // Store reminder in localStorage for persistence
      const reminders = this.getStoredReminders();
      reminders[reminder.habitId] = reminder;
      localStorage.setItem('habit-reminders', JSON.stringify(reminders));

      // Schedule notifications for the next 7 days
      await this.scheduleWeeklyNotifications(reminder);
      
      return true;
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
      return false;
    }
  }

  private async scheduleWeeklyNotifications(reminder: HabitReminder): Promise<void> {
    const registration = await this.registrationPromise;
    if (!registration) return;

    // Clear existing notifications for this habit
    await this.cancelHabitNotifications(reminder.habitId);

    const now = new Date();
    const [hours, minutes] = reminder.time.split(':').map(Number);

    // Schedule for the next 7 days
    for (let i = 0; i < 7; i++) {
      const notificationDate = new Date(now);
      notificationDate.setDate(now.getDate() + i);
      notificationDate.setHours(hours, minutes, 0, 0);

      // Only schedule if the day is enabled and time is in the future
      const dayOfWeek = notificationDate.getDay();
      if (reminder.days.includes(dayOfWeek) && notificationDate > now) {
        const delay = notificationDate.getTime() - now.getTime();
        
        // Use setTimeout for near-term notifications (within 24 hours)
        if (delay < 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            this.showNotification(reminder);
          }, delay);
        }

        // Also store in IndexedDB for service worker to handle
        await this.storeNotificationInDB({
          id: `${reminder.habitId}-${notificationDate.getTime()}`,
          habitId: reminder.habitId,
          habitName: reminder.habitName,
          scheduledTime: notificationDate.getTime(),
          shown: false
        });
      }
    }
  }

  private async storeNotificationInDB(notification: {
    id: string;
    habitId: string;
    habitName: string;
    scheduledTime: number;
    shown: boolean;
  }): Promise<void> {
    if (!('indexedDB' in window)) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HabitNotifications', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['notifications'], 'readwrite');
        const store = transaction.objectStore('notifications');
        
        store.put(notification);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('notifications')) {
          const store = db.createObjectStore('notifications', { keyPath: 'id' });
          store.createIndex('habitId', 'habitId', { unique: false });
          store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
        }
      };
    });
  }

  async showNotification(reminder: HabitReminder): Promise<void> {
    const permission = await this.requestPermission();
    if (!permission.granted) return;

    const registration = await this.registrationPromise;
    if (!registration) {
      // Fallback to browser notification
      new Notification(`Time for ${reminder.habitName}!`, {
        body: 'Don\'t forget to complete your habit today.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: `habit-${reminder.habitId}`,
        requireInteraction: true,
        actions: [
          { action: 'complete', title: 'Mark Complete' },
          { action: 'snooze', title: 'Remind in 1 hour' }
        ]
      });
      return;
    }

    // Use service worker for better control
    await registration.showNotification(`Time for ${reminder.habitName}!`, {
      body: 'Don\'t forget to complete your habit today.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: `habit-${reminder.habitId}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'complete', title: 'Mark Complete', icon: '/icons/check.png' },
        { action: 'snooze', title: 'Remind in 1 hour', icon: '/icons/snooze.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
      ],
      data: {
        habitId: reminder.habitId,
        habitName: reminder.habitName,
        url: '/habits'
      }
    });
  }

  async cancelHabitNotifications(habitId: string): Promise<void> {
    const registration = await this.registrationPromise;
    if (!registration) return;

    // Get all notifications and cancel those for this habit
    const notifications = await registration.getNotifications({
      tag: `habit-${habitId}`
    });

    notifications.forEach(notification => notification.close());

    // Remove from IndexedDB
    if ('indexedDB' in window) {
      const request = indexedDB.open('HabitNotifications', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['notifications'], 'readwrite');
        const store = transaction.objectStore('notifications');
        const index = store.index('habitId');
        
        index.openCursor(IDBKeyRange.only(habitId)).onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      };
    }
  }

  async updateHabitReminder(reminder: HabitReminder): Promise<boolean> {
    // Cancel existing notifications
    await this.cancelHabitNotifications(reminder.habitId);
    
    if (reminder.enabled) {
      // Schedule new notifications
      return await this.scheduleHabitReminder(reminder);
    } else {
      // Remove from storage
      const reminders = this.getStoredReminders();
      delete reminders[reminder.habitId];
      localStorage.setItem('habit-reminders', JSON.stringify(reminders));
      return true;
    }
  }

  getStoredReminders(): Record<string, HabitReminder> {
    try {
      const stored = localStorage.getItem('habit-reminders');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  getHabitReminder(habitId: string): HabitReminder | null {
    const reminders = this.getStoredReminders();
    return reminders[habitId] || null;
  }

  async testNotification(): Promise<void> {
    const permission = await this.requestPermission();
    if (!permission.granted) {
      alert('Please enable notifications to test this feature.');
      return;
    }

    await this.showNotification({
      habitId: 'test',
      habitName: 'Test Habit',
      time: '12:00',
      enabled: true,
      days: [0, 1, 2, 3, 4, 5, 6]
    });
  }

  // Daily check for missed notifications (call this on app startup)
  async checkMissedNotifications(): Promise<void> {
    if (!('indexedDB' in window)) return;

    const request = indexedDB.open('HabitNotifications', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const now = Date.now();
      
      // Find notifications that should have been shown but weren't
      const index = store.index('scheduledTime');
      const range = IDBKeyRange.upperBound(now);
      
      index.openCursor(range).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const notification = cursor.value;
          if (!notification.shown && (now - notification.scheduledTime) < 60 * 60 * 1000) {
            // Show if less than 1 hour late
            this.showNotification({
              habitId: notification.habitId,
              habitName: notification.habitName,
              time: '12:00', // Dummy time
              enabled: true,
              days: []
            });
            
            // Mark as shown
            notification.shown = true;
            cursor.update(notification);
          }
          cursor.continue();
        }
      };
    };
  }

  // Get notification statistics
  getNotificationStats(): {
    totalReminders: number;
    activeReminders: number;
    permissionStatus: string;
  } {
    const reminders = this.getStoredReminders();
    const total = Object.keys(reminders).length;
    const active = Object.values(reminders).filter(r => r.enabled).length;
    
    return {
      totalReminders: total,
      activeReminders: active,
      permissionStatus: 'Notification' in window ? Notification.permission : 'not-supported'
    };
  }
}

// Export singleton instance
export const notificationService = new HabitNotificationService();

// Utility functions
export const formatReminderTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const getDayNames = (days: number[]): string => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map(d => dayNames[d]).join(', ');
};

// Initialize service on import
if (typeof window !== 'undefined') {
  // Check for missed notifications on app startup
  notificationService.checkMissedNotifications();
}