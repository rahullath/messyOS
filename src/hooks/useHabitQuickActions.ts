// src/hooks/useHabitQuickActions.ts
import { useState, useEffect, useCallback } from 'react';
import { useOfflineSync } from '../lib/habits/offline-sync';

interface Habit {
  id: string;
  name: string;
  type: 'build' | 'break' | 'maintain';
  measurement_type: 'boolean' | 'count' | 'duration';
  color: string;
  streak_count: number;
  allows_skips: boolean;
  completedToday: boolean;
}

interface HabitQuickAction {
  id: string;
  name: string;
  type: 'build' | 'break' | 'maintain';
  measurement_type: 'boolean' | 'count' | 'duration';
  color: string;
  currentStreak: number;
  completedToday: boolean;
  allows_skips: boolean;
}

interface QuickActionsState {
  loading: boolean;
  error: string | null;
  syncing: boolean;
  offlineCount: number;
}

export function useHabitQuickActions(habits: Habit[]) {
  const [state, setState] = useState<QuickActionsState>({
    loading: false,
    error: null,
    syncing: false,
    offlineCount: 0
  });

  const offlineSync = useOfflineSync();

  // Convert habits to quick action format
  const quickActionHabits: HabitQuickAction[] = habits.map(habit => ({
    id: habit.id,
    name: habit.name,
    type: habit.type,
    measurement_type: habit.measurement_type,
    color: habit.color,
    currentStreak: habit.streak_count,
    completedToday: habit.completedToday,
    allows_skips: habit.allows_skips
  }));

  // Update offline count when sync status changes
  useEffect(() => {
    const updateOfflineCount = () => {
      const status = offlineSync.getStatus();
      setState(prev => ({
        ...prev,
        offlineCount: status.unsynced,
        syncing: status.syncInProgress
      }));
    };

    updateOfflineCount();

    // Listen for sync completion events
    const handleSyncComplete = (event: CustomEvent) => {
      updateOfflineCount();
      if (event.detail.success > 0) {
        showToast(`✅ Synced ${event.detail.success} offline entries`);
      }
    };

    window.addEventListener('habitSyncComplete', handleSyncComplete as EventListener);
    
    // Update count periodically
    const interval = setInterval(updateOfflineCount, 5000);

    return () => {
      window.removeEventListener('habitSyncComplete', handleSyncComplete as EventListener);
      clearInterval(interval);
    };
  }, [offlineSync]);

  const handleQuickLog = useCallback(async (habitId: string, value: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`/api/habits/${habitId}/log-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value,
          date: new Date().toISOString().split('T')[0],
          notes: 'Quick action log'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      // Refresh the page to show updated data
      window.location.reload();

    } catch (error: any) {
      console.error('Quick log failed:', error);
      
      // Add to offline queue
      offlineSync.addToQueue(habitId, value);
      
      setState(prev => ({ 
        ...prev, 
        error: 'Saved offline - will sync when connected',
        offlineCount: prev.offlineCount + 1
      }));
      
      showToast('📱 Saved offline - will sync when connected');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [offlineSync]);

  const handleBatchComplete = useCallback(async (habitIds: string[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/habits/batch-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          habitIds,
          value: 1,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      
      if (result.success > 0) {
        showToast(`✅ Completed ${result.success} habits!`);
        // Refresh the page to show updated data
        setTimeout(() => window.location.reload(), 1000);
      }

      if (result.failed > 0) {
        showToast(`⚠️ ${result.failed} habits failed to complete`);
      }

    } catch (error: any) {
      console.error('Batch complete failed:', error);
      
      // Add each habit to offline queue
      habitIds.forEach(habitId => {
        offlineSync.addToQueue(habitId, 1);
      });
      
      setState(prev => ({ 
        ...prev, 
        error: 'Saved offline - will sync when connected',
        offlineCount: prev.offlineCount + habitIds.length
      }));
      
      showToast('📱 Saved offline - will sync when connected');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [offlineSync]);

  const handleEnhancedLog = useCallback((habitId: string, habitName: string) => {
    // Use the existing enhanced logging modal function
    if (typeof window !== 'undefined' && (window as any).logHabit) {
      (window as any).logHabit(habitId, habitName);
    } else {
      // Fallback: redirect to habits page with a hash
      window.location.href = `/habits#log-${habitId}`;
    }
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    setState(prev => ({ ...prev, syncing: true }));
    
    try {
      const result = await offlineSync.syncQueue();
      if (result.success > 0) {
        showToast(`✅ Synced ${result.success} offline entries`);
        // Refresh to show updated data
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      showToast('❌ Sync failed - will retry automatically');
    } finally {
      setState(prev => ({ ...prev, syncing: false }));
    }
  }, [offlineSync]);

  return {
    habits: quickActionHabits,
    state,
    actions: {
      quickLog: handleQuickLog,
      batchComplete: handleBatchComplete,
      enhancedLog: handleEnhancedLog,
      syncOffline: syncOfflineQueue
    }
  };
}

// Utility function to show toast notifications
function showToast(message: string) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm max-w-sm text-center';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}