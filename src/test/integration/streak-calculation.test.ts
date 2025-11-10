// src/test/integration/streak-calculation.test.ts
import { describe, it, expect } from 'vitest';

describe('Streak Calculation Logic', () => {
  // Helper function to calculate streaks (extracted from the API)
  const calculateStreaks = (entries: any[]) => {
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    
    // Calculate current streak (from today backwards)
    for (let i = 0; i < 100; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const entry = entries.find((e: any) => e.date === dateStr);
      
      if (entry) {
        if (entry.value === 1 || entry.value === 3) { // Completed or partial
          if (i === 0 || currentStreak > 0) currentStreak++;
          tempStreak++;
        } else if (entry.value === 2) { // Skipped - doesn't break streak
          if (i === 0 || currentStreak > 0) currentStreak++;
          tempStreak++;
        } else { // Failed (value = 0)
          if (currentStreak === 0) currentStreak = tempStreak;
          break;
        }
      } else {
        // No entry - only breaks streak if we have an active one
        if (currentStreak > 0) break;
      }
      
      bestStreak = Math.max(bestStreak, tempStreak);
    }
      
    return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak) };
  };

  it('should calculate current streak correctly with completed entries', () => {
    const today = new Date();
    const entries = [];
    
    // Create 5 consecutive completed days
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      entries.push({
        date: date.toISOString().split('T')[0],
        value: 1 // completed
      });
    }
    
    // Add a failed day before the streak
    const failedDate = new Date(today);
    failedDate.setDate(today.getDate() - 5);
    entries.push({
      date: failedDate.toISOString().split('T')[0],
      value: 0 // failed
    });

    const result = calculateStreaks(entries);
    
    expect(result.currentStreak).toBe(5);
    expect(result.bestStreak).toBe(5);
  });

  it('should handle skipped days without breaking streak', () => {
    const today = new Date();
    const entries = [];
    
    // Create pattern: completed, skipped, completed, completed
    const dates = [0, 1, 2, 3]; // days ago
    const values = [1, 2, 1, 1]; // completed, skipped, completed, completed
    
    dates.forEach((daysAgo, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      entries.push({
        date: date.toISOString().split('T')[0],
        value: values[index]
      });
    });

    const result = calculateStreaks(entries);
    
    // Should count all 4 days as streak (including the skipped day)
    expect(result.currentStreak).toBe(4);
    expect(result.bestStreak).toBe(4);
  });

  it('should reset streak on failed days', () => {
    const today = new Date();
    const entries = [];
    
    // Create pattern: completed, completed, failed, completed (older)
    const dates = [0, 1, 2, 3];
    const values = [1, 1, 0, 1]; // completed, completed, failed, completed
    
    dates.forEach((daysAgo, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      entries.push({
        date: date.toISOString().split('T')[0],
        value: values[index]
      });
    });

    const result = calculateStreaks(entries);
    
    // Current streak should only be 2 (today and yesterday)
    expect(result.currentStreak).toBe(2);
    // Best streak should still be 2 since the failed day breaks the longer streak
    expect(result.bestStreak).toBe(2);
  });

  it('should handle partial completions as streak continuation', () => {
    const today = new Date();
    const entries = [];
    
    // Create pattern: completed, partial, completed
    const dates = [0, 1, 2];
    const values = [1, 3, 1]; // completed, partial, completed
    
    dates.forEach((daysAgo, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      entries.push({
        date: date.toISOString().split('T')[0],
        value: values[index]
      });
    });

    const result = calculateStreaks(entries);
    
    // All 3 days should count as streak (partial counts as success)
    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
  });

  it('should handle empty entries correctly', () => {
    const result = calculateStreaks([]);
    
    expect(result.currentStreak).toBe(0);
    expect(result.bestStreak).toBe(0);
  });

  it('should handle mixed patterns correctly', () => {
    const today = new Date();
    const entries = [];
    
    // Create complex pattern: completed, partial, skipped, completed, failed, completed (older)
    const dates = [0, 1, 2, 3, 4, 5];
    const values = [1, 3, 2, 1, 0, 1]; // completed, partial, skipped, completed, failed, completed
    
    dates.forEach((daysAgo, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      entries.push({
        date: date.toISOString().split('T')[0],
        value: values[index]
      });
    });

    const result = calculateStreaks(entries);
    
    // Current streak should be 4 (today through 3 days ago, stopped by failed day)
    expect(result.currentStreak).toBe(4);
    expect(result.bestStreak).toBe(4);
  });
});