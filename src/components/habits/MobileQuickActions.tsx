// src/components/habits/MobileQuickActions.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TouchButton } from '../layout/MobileLayout';

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

interface MobileQuickActionsProps {
  habits: HabitQuickAction[];
  onQuickLog: (habitId: string, value: number) => Promise<void>;
  onBatchComplete: (habitIds: string[]) => Promise<void>;
  onEnhancedLog: (habitId: string, habitName: string) => void;
  className?: string;
}

interface OfflineLogEntry {
  habitId: string;
  value: number;
  timestamp: number;
  date: string;
}

export default function MobileQuickActions({
  habits,
  onQuickLog,
  onBatchComplete,
  onEnhancedLog,
  className = ''
}: MobileQuickActionsProps) {
  const [batchMode, setBatchMode] = useState(false);
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineLogEntry[]>([]);
  const [swipeStates, setSwipeStates] = useState<Map<string, { startX: number; currentX: number; swiping: boolean }>>(new Map());
  const touchStartRef = useRef<Map<string, { x: number; y: number; time: number }>>(new Map());

  // Get pending habits (not completed today)
  const pendingHabits = habits.filter(h => !h.completedToday);
  const completedToday = habits.filter(h => h.completedToday).length;

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem('habitOfflineQueue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Save offline queue to localStorage
    localStorage.setItem('habitOfflineQueue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    const successfulSyncs: number[] = [];
    
    for (let i = 0; i < offlineQueue.length; i++) {
      const entry = offlineQueue[i];
      try {
        await onQuickLog(entry.habitId, entry.value);
        successfulSyncs.push(i);
      } catch (error) {
        console.error('Failed to sync offline entry:', error);
        break; // Stop syncing on first failure
      }
    }

    // Remove successfully synced entries
    if (successfulSyncs.length > 0) {
      setOfflineQueue(prev => prev.filter((_, index) => !successfulSyncs.includes(index)));
      
      // Show sync success message
      showToast(`✅ Synced ${successfulSyncs.length} offline entries`);
    }
  };

  const handleQuickLog = async (habitId: string, value: number) => {
    const entry: OfflineLogEntry = {
      habitId,
      value,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0]
    };

    if (isOnline) {
      try {
        await onQuickLog(habitId, value);
        showToast('✅ Logged successfully!');
      } catch (error) {
        // Add to offline queue if online request fails
        setOfflineQueue(prev => [...prev, entry]);
        showToast('📱 Saved offline - will sync when connected');
      }
    } else {
      // Add to offline queue
      setOfflineQueue(prev => [...prev, entry]);
      showToast('📱 Saved offline - will sync when connected');
    }
  };

  const handleBatchComplete = async () => {
    if (selectedHabits.size === 0) return;

    const habitIds = Array.from(selectedHabits);
    
    if (isOnline) {
      try {
        await onBatchComplete(habitIds);
        setSelectedHabits(new Set());
        setBatchMode(false);
        showToast(`✅ Completed ${habitIds.length} habits!`);
      } catch (error) {
        // Add each to offline queue
        const entries = habitIds.map(habitId => ({
          habitId,
          value: 1,
          timestamp: Date.now(),
          date: new Date().toISOString().split('T')[0]
        }));
        setOfflineQueue(prev => [...prev, ...entries]);
        showToast('📱 Saved offline - will sync when connected');
      }
    } else {
      // Add to offline queue
      const entries = habitIds.map(habitId => ({
        habitId,
        value: 1,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      }));
      setOfflineQueue(prev => [...prev, ...entries]);
      setSelectedHabits(new Set());
      setBatchMode(false);
      showToast('📱 Saved offline - will sync when connected');
    }
  };

  const toggleHabitSelection = (habitId: string) => {
    setSelectedHabits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(habitId)) {
        newSet.delete(habitId);
      } else {
        newSet.add(habitId);
      }
      return newSet;
    });
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent, habitId: string) => {
    const touch = e.touches[0];
    touchStartRef.current.set(habitId, {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    
    setSwipeStates(prev => new Map(prev.set(habitId, {
      startX: touch.clientX,
      currentX: touch.clientX,
      swiping: false
    })));
  };

  const handleTouchMove = (e: React.TouchEvent, habitId: string) => {
    const touch = e.touches[0];
    const startTouch = touchStartRef.current.get(habitId);
    
    if (!startTouch) return;

    const deltaX = touch.clientX - startTouch.x;
    const deltaY = Math.abs(touch.clientY - startTouch.y);
    
    // Only start swiping if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
      e.preventDefault(); // Prevent scrolling
      
      setSwipeStates(prev => new Map(prev.set(habitId, {
        startX: startTouch.x,
        currentX: touch.clientX,
        swiping: true
      })));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, habitId: string, habit: HabitQuickAction) => {
    const startTouch = touchStartRef.current.get(habitId);
    const swipeState = swipeStates.get(habitId);
    
    if (!startTouch || !swipeState) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaTime = Date.now() - startTouch.time;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Reset swipe state
    setSwipeStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(habitId);
      return newMap;
    });
    touchStartRef.current.delete(habitId);

    // Determine swipe action
    if (Math.abs(deltaX) > 80 || velocity > 0.5) {
      if (deltaX > 0) {
        // Swipe right - complete
        handleQuickLog(habitId, 1);
      } else {
        // Swipe left - skip (if allowed) or enhanced logging
        if (habit.allows_skips) {
          handleQuickLog(habitId, 2); // Skip value
        } else {
          onEnhancedLog(habitId, habit.name);
        }
      }
    }
  };

  const showToast = (message: string) => {
    // Create and show toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  if (pendingHabits.length === 0) {
    return (
      <div className={`bg-slate-800/50 rounded-xl p-6 text-center ${className}`}>
        <div className="text-4xl mb-2">🎉</div>
        <h3 className="text-lg font-semibold text-white mb-1">All Done!</h3>
        <p className="text-gray-400 text-sm">You've completed all your habits for today</p>
        <div className="mt-4 text-cyan-400 font-medium">
          {completedToday}/{habits.length} habits completed
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800/50 rounded-xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
          <p className="text-gray-400 text-sm">
            {pendingHabits.length} pending • {completedToday}/{habits.length} done
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Offline indicator */}
          {!isOnline && (
            <div className="flex items-center space-x-1 text-orange-400 text-xs">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>Offline</span>
            </div>
          )}
          
          {/* Offline queue indicator */}
          {offlineQueue.length > 0 && (
            <div className="flex items-center space-x-1 text-blue-400 text-xs">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>{offlineQueue.length} queued</span>
            </div>
          )}
          
          {/* Batch mode toggle */}
          <TouchButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setBatchMode(!batchMode);
              setSelectedHabits(new Set());
            }}
            className={batchMode ? 'text-cyan-400 bg-cyan-400/10' : ''}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </TouchButton>
        </div>
      </div>

      {/* Batch mode controls */}
      {batchMode && (
        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">
              {selectedHabits.size} selected
            </span>
            <div className="flex space-x-2">
              <TouchButton
                variant="ghost"
                size="sm"
                onClick={() => setSelectedHabits(new Set())}
                disabled={selectedHabits.size === 0}
              >
                Clear
              </TouchButton>
              <TouchButton
                variant="primary"
                size="sm"
                onClick={handleBatchComplete}
                disabled={selectedHabits.size === 0}
              >
                Complete {selectedHabits.size}
              </TouchButton>
            </div>
          </div>
        </div>
      )}

      {/* Habits list */}
      <div className="space-y-2">
        {pendingHabits.map((habit) => {
          const swipeState = swipeStates.get(habit.id);
          const isSelected = selectedHabits.has(habit.id);
          const translateX = swipeState?.swiping ? swipeState.currentX - swipeState.startX : 0;
          
          return (
            <div
              key={habit.id}
              className="relative overflow-hidden rounded-lg"
              onTouchStart={(e) => handleTouchStart(e, habit.id)}
              onTouchMove={(e) => handleTouchMove(e, habit.id)}
              onTouchEnd={(e) => handleTouchEnd(e, habit.id, habit)}
            >
              {/* Swipe background indicators */}
              <div className="absolute inset-0 flex">
                <div className="flex-1 bg-green-600/20 flex items-center justify-start pl-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 bg-blue-600/20 flex items-center justify-end pr-4">
                  {habit.allows_skips ? (
                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3-3 3m-6-3h9" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Habit card */}
              <div
                className={`relative bg-slate-700/50 p-4 transition-transform duration-200 ${
                  batchMode && isSelected ? 'bg-cyan-600/20 border border-cyan-400/30' : ''
                }`}
                style={{ transform: `translateX(${Math.max(-100, Math.min(100, translateX))}px)` }}
                onClick={() => batchMode && toggleHabitSelection(habit.id)}
              >
                <div className="flex items-center space-x-3">
                  {/* Selection checkbox in batch mode */}
                  {batchMode && (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'bg-cyan-600 border-cyan-600' : 'border-gray-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Habit color indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />

                  {/* Habit info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-white truncate">{habit.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        habit.type === 'build' 
                          ? 'bg-green-500/20 text-green-400' 
                          : habit.type === 'break'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {habit.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-400">
                        🔥 {habit.currentStreak} day streak
                      </span>
                      {habit.allows_skips && (
                        <span className="text-xs text-blue-400">⏭️ Flexible</span>
                      )}
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  {!batchMode && (
                    <div className="flex space-x-2">
                      {habit.measurement_type === 'boolean' ? (
                        <TouchButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleQuickLog(habit.id, 1)}
                          className="px-3"
                        >
                          ✓
                        </TouchButton>
                      ) : (
                        <TouchButton
                          variant="secondary"
                          size="sm"
                          onClick={() => onEnhancedLog(habit.id, habit.name)}
                          className="px-3"
                        >
                          Log
                        </TouchButton>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Swipe instructions */}
      {!batchMode && pendingHabits.length > 0 && (
        <div className="mt-4 text-center text-xs text-gray-500">
          💡 Swipe right to complete, left to {pendingHabits.some(h => h.allows_skips) ? 'skip' : 'log details'}
        </div>
      )}
    </div>
  );
}