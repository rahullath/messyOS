// src/test/unit/streak-calculation-advanced.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Advanced Streak Calculation Logic', () => {
  // Enhanced streak calculation that handles different habit types
  const calculateAdvancedStreaks = (entries: any[], habitType: 'build' | 'break' | 'maintain' = 'build') => {
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    
    // Sort entries by date (newest first)
    const sortedEntries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Calculate current streak (from today backwards)
    for (let i = 0; i < 365; i++) { // Check up to a year
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const entry = sortedEntries.find((e: any) => e.date === dateStr);
      
      if (entry) {
        const isSuccess = isSuccessfulEntry(entry.value, habitType);
        const isSkip = entry.value === 2;
        
        if (isSuccess || isSkip) {
          if (i === 0 || currentStreak > 0) currentStreak++;
          tempStreak++;
        } else {
          // Failed entry breaks current streak
          if (currentStreak === 0) currentStreak = tempStreak;
          break;
        }
      } else {
        // No entry - only breaks streak if we have an active one
        if (currentStreak > 0) break;
      }
      
      bestStreak = Math.max(bestStreak, tempStreak);
    }
    
    // Calculate best streak from all entries
    let runningStreak = 0;
    const allDates = generateDateRange(sortedEntries);
    
    for (const date of allDates) {
      const entry = sortedEntries.find(e => e.date === date);
      
      if (entry) {
        const isSuccess = isSuccessfulEntry(entry.value, habitType);
        const isSkip = entry.value === 2;
        
        if (isSuccess || isSkip) {
          runningStreak++;
          bestStreak = Math.max(bestStreak, runningStreak);
        } else {
          runningStreak = 0;
        }
      } else {
        runningStreak = 0;
      }
    }
      
    return { 
      currentStreak: Math.max(currentStreak, 0), 
      bestStreak: Math.max(bestStreak, currentStreak) 
    };
  };

  const isSuccessfulEntry = (value: number, habitType: 'build' | 'break' | 'maintain') => {
    switch (habitType) {
      case 'build':
        return value === 1 || value === 3; // Completed or Partial
      case 'break':
        return value === 0; // For break habits, NOT doing it is success
      case 'maintain':
        return value === 1 || value === 3; // Completed or Partial
      default:
        return value === 1 || value === 3;
    }
  };

  const generateDateRange = (entries: any[]) => {
    if (entries.length === 0) return [];
    
    const dates = entries.map(e => e.date).sort();
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    const dateRange = [];
    
    const current = new Date(startDate);
    while (current <= endDate) {
      dateRange.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dateRange.reverse(); // Newest first
  };

  describe('Build Habits', () => {
    it('should calculate streaks correctly for build habits', () => {
      const today = new Date();
      const entries = [];
      
      // Create 7 consecutive completed days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        entries.push({
          date: date.toISOString().split('T')[0],
          value: 1 // completed
        });
      }
      
      const result = calculateAdvancedStreaks(entries, 'build');
      
      expect(result.currentStreak).toBe(7);
      expect(result.bestStreak).toBe(7);
    });

    it('should handle partial completions as successes for build habits', () => {
      const today = new Date();
      const entries = [];
      
      // Mix of completed and partial
      const values = [1, 3, 1, 3, 1]; // completed, partial, completed, partial, completed
      
      values.forEach((value, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        entries.push({
          date: date.toISOString().split('T')[0],
          value
        });
      });
      
      const result = calculateAdvancedStreaks(entries, 'build');
      
      expect(result.currentStreak).toBe(5);
      expect(result.bestStreak).toBe(5);
    });
  });

  describe('Break Habits', () => {
    it('should calculate streaks correctly for break habits', () => {
      const today = new Date();
      const entries = [];
      
      // For break habits, NOT doing the habit (value 0) is success
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        entries.push({
          date: date.toISOString().split('T')[0],
          value: 0 // didn't do the bad habit = success
        });
      }
      
      const result = calculateAdvancedStreaks(entries, 'break');
      
      expect(result.currentStreak).toBe(5);
      expect(result.bestStreak).toBe(5);
    });

    it('should break streak when break habit is performed', () => {
      const today = new Date();
      const entries = [];
      
      // Pattern: didn't do, didn't do, DID do (breaks streak), didn't do
      const values = [0, 0, 1, 0]; // success, success, failure, success
      
      values.forEach((value, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        entries.push({
          date: date.toISOString().split('T')[0],
          value
        });
      });
      
      const result = calculateAdvancedStreaks(entries, 'break');
      
      // Current streak should be 2 (today and yesterday)
      expect(result.currentStreak).toBe(2);
    });
  });

  describe('Maintain Habits', () => {
    it('should calculate streaks correctly for maintain habits', () => {
      const today = new Date();
      const entries = [];
      
      // Maintain habits work like build habits
      for (let i = 0; i < 6; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        entries.push({
          date: date.toISOString().split('T')[0],
          value: 1 // maintained
        });
      }
      
      const result = calculateAdvancedStreaks(entries, 'maintain');
      
      expect(result.currentStreak).toBe(6);
      expect(result.bestStreak).toBe(6);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle timezone edge cases', () => {
      const entries = [
        { date: '2025-01-01', value: 1 },
        { date: '2025-01-02', value: 1 },
        { date: '2025-01-03', value: 1 }
      ];
      
      // Mock today as 2025-01-03
      const mockToday = new Date('2025-01-03T23:59:59Z');
      vi.setSystemTime(mockToday);
      
      const result = calculateAdvancedStreaks(entries, 'build');
      
      expect(result.currentStreak).toBe(3);
      expect(result.bestStreak).toBe(3);
      
      vi.useRealTimers();
    });

    it('should handle gaps in data correctly', () => {
      const today = new Date();
      const entries = [];
      
      // Create entries with gaps: today, yesterday, 3 days ago, 4 days ago
      const daysAgo = [0, 1, 3, 4];
      
      daysAgo.forEach(days => {
        const date = new Date(today);
        date.setDate(today.getDate() - days);
        entries.push({
          date: date.toISOString().split('T')[0],
          value: 1
        });
      });
      
      const result = calculateAdvancedStreaks(entries, 'build');
      
      // Current streak should be 2 (today and yesterday, broken by gap)
      expect(result.currentStreak).toBe(2);
      // Best streak should be 2 (either the recent 2 or the older 2)
      expect(result.bestStreak).toBe(2);
    });

    it('should handle very long streaks efficiently', () => {
      const today = new Date();
      const entries = [];
      
      // Create 100 consecutive days
      for (let i = 0; i < 100; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        entries.push({
          date: date.toISOString().split('T')[0],
          value: 1
        });
      }
      
      const startTime = Date.now();
      const result = calculateAdvancedStreaks(entries, 'build');
      const endTime = Date.now();
      
      expect(result.currentStreak).toBe(100);
      expect(result.bestStreak).toBe(100);
      
      // Should complete in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle mixed success patterns', () => {
      const today = new Date();
      const entries = [];
      
      // Complex pattern: success, skip, success, fail, success, success
      const values = [1, 2, 1, 0, 1, 1];
      
      values.forEach((value, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        entries.push({
          date: date.toISOString().split('T')[0],
          value
        });
      });
      
      const result = calculateAdvancedStreaks(entries, 'build');
      
      // Current streak: success, skip, success = 3
      expect(result.currentStreak).toBe(3);
      // Best streak should account for the longer streak before the failure
      expect(result.bestStreak).toBeGreaterThanOrEqual(3);
    });

    it('should handle empty entries gracefully', () => {
      const result = calculateAdvancedStreaks([], 'build');
      
      expect(result.currentStreak).toBe(0);
      expect(result.bestStreak).toBe(0);
    });

    it('should handle single entry correctly', () => {
      const today = new Date();
      const entries = [{
        date: today.toISOString().split('T')[0],
        value: 1
      }];
      
      const result = calculateAdvancedStreaks(entries, 'build');
      
      expect(result.currentStreak).toBe(1);
      expect(result.bestStreak).toBe(1);
    });

    it('should calculate best streak across entire history', () => {
      const baseDate = new Date('2025-01-01');
      const entries = [];
      
      // Create pattern: 5 days success, 2 days fail, 8 days success, 1 day fail, 3 days success
      const patterns = [
        { days: 5, value: 1 },  // 5 day streak
        { days: 2, value: 0 },  // break
        { days: 8, value: 1 },  // 8 day streak (best)
        { days: 1, value: 0 },  // break
        { days: 3, value: 1 }   // 3 day streak (current)
      ];
      
      let currentDate = new Date(baseDate);
      patterns.forEach(pattern => {
        for (let i = 0; i < pattern.days; i++) {
          entries.push({
            date: currentDate.toISOString().split('T')[0],
            value: pattern.value
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      
      // Mock today as the last date
      const lastDate = new Date(currentDate);
      lastDate.setDate(lastDate.getDate() - 1);
      vi.setSystemTime(lastDate);
      
      const result = calculateAdvancedStreaks(entries, 'build');
      
      expect(result.currentStreak).toBe(3);
      expect(result.bestStreak).toBe(8);
      
      vi.useRealTimers();
    });
  });
});