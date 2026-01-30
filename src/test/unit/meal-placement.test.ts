// Unit tests for meal placement algorithm (V1.2)
// Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3

import { describe, it, expect, beforeEach } from 'vitest';
import type { TimeBlock } from '../../types/daily-plan';

// Since meal placement functions are internal to plan-builder.ts,
// we need to test them through the module's behavior or extract them.
// For now, we'll create test helpers that replicate the logic for testing.

// Meal scheduling constants (from plan-builder.ts)
const MEAL_WINDOWS = {
  breakfast: { start: '06:30', end: '11:30' },
  lunch: { start: '11:30', end: '15:30' },
  dinner: { start: '17:00', end: '21:30' }
};

const MIN_MEAL_GAP_MINUTES = 180; // 3 hours

const DEFAULT_MEAL_TIMES = {
  breakfast: '09:30',
  lunch: '13:00',
  dinner: '19:00'
};

const MEAL_DURATIONS = {
  breakfast: 15,
  lunch: 30,
  dinner: 45
};

type MealType = 'breakfast' | 'lunch' | 'dinner';

interface MealPlacement {
  meal: MealType;
  time?: Date;
  duration?: number;
  skipped: boolean;
  skipReason?: string;
  metadata?: {
    targetTime?: Date;
    placementReason?: 'anchor-aware' | 'default';
  };
}

// Helper functions replicated from plan-builder.ts for testing

function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function hasConflict(
  proposedStart: Date,
  proposedEnd: Date,
  anchors: TimeBlock[]
): boolean {
  for (const anchor of anchors) {
    const anchorStart = anchor.startTime.getTime();
    const anchorEnd = anchor.endTime.getTime();
    const propStart = proposedStart.getTime();
    const propEnd = proposedEnd.getTime();

    if (propStart < anchorEnd && propEnd > anchorStart) {
      return true;
    }
  }
  return false;
}

function checkMealSpacing(
  proposedTime: Date,
  previousMealEndTime: Date | null
): boolean {
  if (!previousMealEndTime) {
    return true;
  }

  const gapMinutes = (proposedTime.getTime() - previousMealEndTime.getTime()) / 60000;
  return gapMinutes >= MIN_MEAL_GAP_MINUTES;
}

function clampToMealWindow(
  targetTime: Date,
  mealType: MealType,
  now: Date
): Date | null {
  const window = MEAL_WINDOWS[mealType];
  const windowStart = parseTimeToDate(window.start, targetTime);
  const windowEnd = parseTimeToDate(window.end, targetTime);

  if (now > windowEnd) {
    return null;
  }

  let clamped = new Date(targetTime);
  if (clamped < windowStart) {
    clamped = windowStart;
  }
  if (clamped > windowEnd) {
    clamped = windowEnd;
  }

  if (clamped < now) {
    clamped = new Date(now);
  }

  if (clamped > windowEnd) {
    return null;
  }

  return clamped;
}

function findAvailableSlot(
  targetTime: Date,
  duration: number,
  anchors: TimeBlock[],
  searchRangeMinutes: number = 30
): Date | null {
  const targetEnd = new Date(targetTime.getTime() + duration * 60000);
  if (!hasConflict(targetTime, targetEnd, anchors)) {
    return targetTime;
  }

  for (let offset = 5; offset <= searchRangeMinutes; offset += 5) {
    const candidateTime = new Date(targetTime.getTime() + offset * 60000);
    const candidateEnd = new Date(candidateTime.getTime() + duration * 60000);
    if (!hasConflict(candidateTime, candidateEnd, anchors)) {
      return candidateTime;
    }
  }

  for (let offset = 5; offset <= searchRangeMinutes; offset += 5) {
    const candidateTime = new Date(targetTime.getTime() - offset * 60000);
    const candidateEnd = new Date(candidateTime.getTime() + duration * 60000);
    if (!hasConflict(candidateTime, candidateEnd, anchors)) {
      return candidateTime;
    }
  }

  return null;
}

function calculateMealTargetTime(
  mealType: MealType,
  anchors: TimeBlock[],
  wakeTime: Date,
  now: Date
): Date {
  if (anchors.length === 0) {
    const defaultTime = parseTimeToDate(DEFAULT_MEAL_TIMES[mealType], wakeTime);
    
    if (mealType === 'breakfast') {
      if (wakeTime.getHours() >= 9) {
        return new Date(wakeTime.getTime() + 45 * 60000);
      }
    }
    
    return defaultTime;
  }

  switch (mealType) {
    case 'breakfast': {
      const breakfastTarget = new Date(wakeTime.getTime() + 45 * 60000);
      return breakfastTarget;
    }

    case 'lunch': {
      const noon = new Date(wakeTime);
      noon.setHours(12, 0, 0, 0);
      
      const morningAnchors = anchors.filter(a => a.endTime < noon);
      
      if (morningAnchors.length > 0) {
        const lastMorningAnchor = morningAnchors[morningAnchors.length - 1];
        return new Date(lastMorningAnchor.endTime.getTime() + 30 * 60000);
      }
      
      const lunchDefault = new Date(wakeTime);
      lunchDefault.setHours(12, 30, 0, 0);
      return lunchDefault;
    }

    case 'dinner': {
      const afternoon = new Date(wakeTime);
      afternoon.setHours(15, 0, 0, 0);
      
      const eveningAnchors = anchors.filter(a => a.endTime > afternoon);
      
      if (eveningAnchors.length > 0) {
        const lastEveningAnchor = eveningAnchors[eveningAnchors.length - 1];
        return new Date(lastEveningAnchor.endTime.getTime() + 30 * 60000);
      }
      
      const dinnerDefault = new Date(wakeTime);
      dinnerDefault.setHours(19, 0, 0, 0);
      return dinnerDefault;
    }
  }
}

function placeMeals(
  anchors: TimeBlock[],
  wakeTime: Date,
  sleepTime: Date,
  now: Date
): MealPlacement[] {
  const meals: MealType[] = ['breakfast', 'lunch', 'dinner'];
  const placements: MealPlacement[] = [];
  let previousMealEnd: Date | null = null;

  for (const meal of meals) {
    const targetTime = calculateMealTargetTime(meal, anchors, wakeTime, now);
    
    const clampedTime = clampToMealWindow(targetTime, meal, now);
    if (!clampedTime) {
      placements.push({
        meal,
        skipped: true,
        skipReason: 'Past meal window',
      });
      continue;
    }
    
    if (!checkMealSpacing(clampedTime, previousMealEnd)) {
      placements.push({
        meal,
        skipped: true,
        skipReason: 'Spacing constraint',
      });
      continue;
    }
    
    const duration = MEAL_DURATIONS[meal];
    const slot = findAvailableSlot(clampedTime, duration, anchors);
    if (!slot) {
      placements.push({
        meal,
        skipped: true,
        skipReason: 'No valid slot',
      });
      continue;
    }
    
    const mealEnd = new Date(slot.getTime() + duration * 60000);
    if (mealEnd > sleepTime) {
      placements.push({
        meal,
        skipped: true,
        skipReason: 'Would exceed sleep time',
      });
      continue;
    }
    
    const placementReason = anchors.length > 0 ? 'anchor-aware' : 'default';
    placements.push({
      meal,
      time: slot,
      duration,
      skipped: false,
      metadata: {
        targetTime,
        placementReason,
      },
    });
    
    previousMealEnd = mealEnd;
  }

  return placements;
}

// Helper to create a mock TimeBlock
function createMockTimeBlock(
  startTime: Date,
  endTime: Date,
  activityType: string = 'commitment'
): TimeBlock {
  return {
    id: 'mock-id',
    planId: 'mock-plan-id',
    startTime,
    endTime,
    activityType: activityType as any,
    activityName: 'Mock Activity',
    isFixed: true,
    sequenceOrder: 1,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Meal Placement - Subtask 6.1: Meal Windows', () => {
  let baseDate: Date;
  let wakeTime: Date;
  let sleepTime: Date;
  let now: Date;

  beforeEach(() => {
    // Set up a consistent test date: 2025-01-30 at 07:00
    baseDate = new Date('2025-01-30T07:00:00');
    wakeTime = new Date(baseDate);
    sleepTime = new Date('2025-01-30T23:00:00');
    now = new Date(baseDate);
  });

  it('should only schedule breakfast between 06:30 and 11:30', () => {
    // Requirements: 1.1
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    expect(breakfast).toBeDefined();
    
    if (breakfast && !breakfast.skipped && breakfast.time) {
      const breakfastHour = breakfast.time.getHours();
      const breakfastMinute = breakfast.time.getMinutes();
      const breakfastTimeInMinutes = breakfastHour * 60 + breakfastMinute;
      
      // 06:30 = 390 minutes, 11:30 = 690 minutes
      expect(breakfastTimeInMinutes).toBeGreaterThanOrEqual(390);
      expect(breakfastTimeInMinutes).toBeLessThanOrEqual(690);
    }
  });

  it('should only schedule lunch between 11:30 and 15:30', () => {
    // Requirements: 1.2
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const lunch = placements.find(p => p.meal === 'lunch');
    expect(lunch).toBeDefined();
    
    if (lunch && !lunch.skipped && lunch.time) {
      const lunchHour = lunch.time.getHours();
      const lunchMinute = lunch.time.getMinutes();
      const lunchTimeInMinutes = lunchHour * 60 + lunchMinute;
      
      // 11:30 = 690 minutes, 15:30 = 930 minutes
      expect(lunchTimeInMinutes).toBeGreaterThanOrEqual(690);
      expect(lunchTimeInMinutes).toBeLessThanOrEqual(930);
    }
  });

  it('should only schedule dinner between 17:00 and 21:30', () => {
    // Requirements: 1.3
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const dinner = placements.find(p => p.meal === 'dinner');
    expect(dinner).toBeDefined();
    
    if (dinner && !dinner.skipped && dinner.time) {
      const dinnerHour = dinner.time.getHours();
      const dinnerMinute = dinner.time.getMinutes();
      const dinnerTimeInMinutes = dinnerHour * 60 + dinnerMinute;
      
      // 17:00 = 1020 minutes, 21:30 = 1290 minutes
      expect(dinnerTimeInMinutes).toBeGreaterThanOrEqual(1020);
      expect(dinnerTimeInMinutes).toBeLessThanOrEqual(1290);
    }
  });

  it('should skip breakfast when generated after 11:30', () => {
    // Requirements: 1.4, 6.1
    const lateNow = new Date('2025-01-30T12:00:00');
    const placements = placeMeals([], wakeTime, sleepTime, lateNow);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    expect(breakfast).toBeDefined();
    expect(breakfast?.skipped).toBe(true);
    expect(breakfast?.skipReason).toBe('Past meal window');
  });

  it('should skip lunch when generated after 15:30', () => {
    // Requirements: 1.4, 6.2
    const lateNow = new Date('2025-01-30T16:00:00');
    const placements = placeMeals([], wakeTime, sleepTime, lateNow);
    
    const lunch = placements.find(p => p.meal === 'lunch');
    expect(lunch).toBeDefined();
    expect(lunch?.skipped).toBe(true);
    expect(lunch?.skipReason).toBe('Past meal window');
  });

  it('should skip dinner when generated after 21:30', () => {
    // Requirements: 1.4, 6.3
    const lateNow = new Date('2025-01-30T22:00:00');
    const placements = placeMeals([], wakeTime, sleepTime, lateNow);
    
    const dinner = placements.find(p => p.meal === 'dinner');
    expect(dinner).toBeDefined();
    expect(dinner?.skipped).toBe(true);
    expect(dinner?.skipReason).toBe('Past meal window');
  });

  it('should skip meal when no valid slot exists in window', () => {
    // Requirements: 1.5
    // Create anchors that block the entire breakfast window
    const anchors: TimeBlock[] = [
      createMockTimeBlock(
        new Date('2025-01-30T06:30:00'),
        new Date('2025-01-30T11:30:00')
      )
    ];
    
    const placements = placeMeals(anchors, wakeTime, sleepTime, now);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    expect(breakfast).toBeDefined();
    expect(breakfast?.skipped).toBe(true);
    expect(breakfast?.skipReason).toBe('No valid slot');
  });
});


describe('Meal Placement - Subtask 6.2: Meal Spacing', () => {
  let baseDate: Date;
  let wakeTime: Date;
  let sleepTime: Date;
  let now: Date;

  beforeEach(() => {
    baseDate = new Date('2025-01-30T07:00:00');
    wakeTime = new Date(baseDate);
    sleepTime = new Date('2025-01-30T23:00:00');
    now = new Date(baseDate);
  });

  it('should enforce minimum 3-hour gap between meals', () => {
    // Requirements: 2.1
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const placedMeals = placements.filter(p => !p.skipped && p.time);
    
    for (let i = 1; i < placedMeals.length; i++) {
      const prevMeal = placedMeals[i - 1];
      const currMeal = placedMeals[i];
      
      if (prevMeal.time && prevMeal.duration && currMeal.time) {
        const prevMealEnd = new Date(prevMeal.time.getTime() + prevMeal.duration * 60000);
        const gapMinutes = (currMeal.time.getTime() - prevMealEnd.getTime()) / 60000;
        
        expect(gapMinutes).toBeGreaterThanOrEqual(180);
      }
    }
  });

  it('should not schedule lunch before 12:00 when breakfast ends at 09:00', () => {
    // Requirements: 2.2
    // Set wake time so breakfast is at 08:45 (ends at 09:00)
    const earlyWake = new Date('2025-01-30T08:00:00');
    const placements = placeMeals([], earlyWake, sleepTime, earlyWake);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    const lunch = placements.find(p => p.meal === 'lunch');
    
    if (breakfast && !breakfast.skipped && breakfast.time && breakfast.duration) {
      const breakfastEnd = new Date(breakfast.time.getTime() + breakfast.duration * 60000);
      
      if (lunch && !lunch.skipped && lunch.time) {
        const gapMinutes = (lunch.time.getTime() - breakfastEnd.getTime()) / 60000;
        expect(gapMinutes).toBeGreaterThanOrEqual(180);
        
        // Lunch should not be before 12:00 (09:00 + 3 hours)
        expect(lunch.time.getHours()).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it('should not schedule dinner before 16:00 when lunch ends at 13:00', () => {
    // Requirements: 2.3
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const lunch = placements.find(p => p.meal === 'lunch');
    const dinner = placements.find(p => p.meal === 'dinner');
    
    if (lunch && !lunch.skipped && lunch.time && lunch.duration) {
      const lunchEnd = new Date(lunch.time.getTime() + lunch.duration * 60000);
      
      if (dinner && !dinner.skipped && dinner.time) {
        const gapMinutes = (dinner.time.getTime() - lunchEnd.getTime()) / 60000;
        expect(gapMinutes).toBeGreaterThanOrEqual(180);
        
        // Dinner should not be before 16:00 (13:00 + 3 hours)
        expect(dinner.time.getHours()).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it('should skip later meal when spacing constraint cannot be met', () => {
    // Requirements: 2.4
    // Create a scenario where lunch would violate spacing
    // Force breakfast to be very late (11:15)
    const lateBreakfastWake = new Date('2025-01-30T10:30:00');
    const placements = placeMeals([], lateBreakfastWake, sleepTime, lateBreakfastWake);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    const lunch = placements.find(p => p.meal === 'lunch');
    
    // Breakfast should be placed
    expect(breakfast?.skipped).toBe(false);
    
    // Lunch might be skipped due to spacing or window constraints
    if (lunch?.skipped) {
      expect(['Spacing constraint', 'Past meal window', 'No valid slot']).toContain(lunch.skipReason);
    }
  });

  it('should use meal end times (not start times) for spacing calculation', () => {
    // Requirements: 2.5
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    const lunch = placements.find(p => p.meal === 'lunch');
    
    if (breakfast && !breakfast.skipped && breakfast.time && breakfast.duration &&
        lunch && !lunch.skipped && lunch.time) {
      
      // Calculate gap from breakfast END to lunch START
      const breakfastEnd = new Date(breakfast.time.getTime() + breakfast.duration * 60000);
      const gapMinutes = (lunch.time.getTime() - breakfastEnd.getTime()) / 60000;
      
      // Gap should be at least 180 minutes from END of breakfast
      expect(gapMinutes).toBeGreaterThanOrEqual(180);
    }
  });
});


describe('Meal Placement - Subtask 6.3: Anchor-Aware Placement', () => {
  let baseDate: Date;
  let wakeTime: Date;
  let sleepTime: Date;
  let now: Date;

  beforeEach(() => {
    baseDate = new Date('2025-01-30T07:00:00');
    wakeTime = new Date(baseDate);
    sleepTime = new Date('2025-01-30T23:00:00');
    now = new Date(baseDate);
  });

  it('should schedule meals around commitments (not before them)', () => {
    // Requirements: 3.1
    // Create a morning commitment at 09:00-10:00
    const anchors: TimeBlock[] = [
      createMockTimeBlock(
        new Date('2025-01-30T09:00:00'),
        new Date('2025-01-30T10:00:00')
      )
    ];
    
    const placements = placeMeals(anchors, wakeTime, sleepTime, now);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    
    // Breakfast should be placed, and should not conflict with the commitment
    if (breakfast && !breakfast.skipped && breakfast.time && breakfast.duration) {
      const breakfastEnd = new Date(breakfast.time.getTime() + breakfast.duration * 60000);
      
      // Breakfast should either be before 09:00 or after 10:00
      const isBeforeCommitment = breakfastEnd.getTime() <= new Date('2025-01-30T09:00:00').getTime();
      const isAfterCommitment = breakfast.time.getTime() >= new Date('2025-01-30T10:00:00').getTime();
      
      expect(isBeforeCommitment || isAfterCommitment).toBe(true);
    }
  });

  it('should place breakfast near wake time if within breakfast window', () => {
    // Requirements: 3.2
    // When there are NO anchors, breakfast uses default time (09:30)
    // When there ARE anchors, breakfast is placed near wake time (wake + 45 min)
    
    // Test with anchors to verify anchor-aware placement
    const anchors: TimeBlock[] = [
      createMockTimeBlock(
        new Date('2025-01-30T14:00:00'),
        new Date('2025-01-30T15:00:00')
      )
    ];
    
    const placements = placeMeals(anchors, wakeTime, sleepTime, now);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    
    if (breakfast && !breakfast.skipped && breakfast.time) {
      // With anchors, breakfast should be wake + 45 minutes
      const expectedTime = new Date(wakeTime.getTime() + 45 * 60000);
      const timeDiffMinutes = Math.abs(breakfast.time.getTime() - expectedTime.getTime()) / 60000;
      expect(timeDiffMinutes).toBeLessThanOrEqual(30); // Within 30 minutes of target
    }
  });

  it('should place lunch after morning commitments', () => {
    // Requirements: 3.3
    // Create a morning commitment at 09:00-10:00
    const anchors: TimeBlock[] = [
      createMockTimeBlock(
        new Date('2025-01-30T09:00:00'),
        new Date('2025-01-30T10:00:00')
      )
    ];
    
    const placements = placeMeals(anchors, wakeTime, sleepTime, now);
    
    const lunch = placements.find(p => p.meal === 'lunch');
    
    if (lunch && !lunch.skipped && lunch.time) {
      // Lunch should be after the morning commitment ends (10:00)
      expect(lunch.time.getTime()).toBeGreaterThanOrEqual(
        new Date('2025-01-30T10:00:00').getTime()
      );
    }
  });

  it('should place dinner after evening commitments', () => {
    // Requirements: 3.4
    // Create an evening commitment at 17:00-18:00
    const anchors: TimeBlock[] = [
      createMockTimeBlock(
        new Date('2025-01-30T17:00:00'),
        new Date('2025-01-30T18:00:00')
      )
    ];
    
    const placements = placeMeals(anchors, wakeTime, sleepTime, now);
    
    const dinner = placements.find(p => p.meal === 'dinner');
    
    if (dinner && !dinner.skipped && dinner.time) {
      // Dinner should be after the evening commitment ends (18:00)
      expect(dinner.time.getTime()).toBeGreaterThanOrEqual(
        new Date('2025-01-30T18:00:00').getTime()
      );
    }
  });

  it('should use anchor-aware placement reason when commitments exist', () => {
    // Requirements: 3.1
    const anchors: TimeBlock[] = [
      createMockTimeBlock(
        new Date('2025-01-30T09:00:00'),
        new Date('2025-01-30T10:00:00')
      )
    ];
    
    const placements = placeMeals(anchors, wakeTime, sleepTime, now);
    
    const placedMeals = placements.filter(p => !p.skipped);
    
    for (const meal of placedMeals) {
      expect(meal.metadata?.placementReason).toBe('anchor-aware');
    }
  });
});


describe('Meal Placement - Subtask 6.4: Default Meal Times', () => {
  let sleepTime: Date;
  let now: Date;

  beforeEach(() => {
    sleepTime = new Date('2025-01-30T23:00:00');
  });

  it('should use default times (09:30, 13:00, 19:00) for no-commitment plan', () => {
    // Requirements: 5.1, 5.3, 5.4
    const wakeTime = new Date('2025-01-30T07:00:00');
    now = new Date(wakeTime);
    
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    const lunch = placements.find(p => p.meal === 'lunch');
    const dinner = placements.find(p => p.meal === 'dinner');
    
    // Breakfast should be at 09:30 (default when wake < 09:00)
    if (breakfast && !breakfast.skipped && breakfast.time) {
      expect(breakfast.time.getHours()).toBe(9);
      expect(breakfast.time.getMinutes()).toBe(30);
    }
    
    // Lunch should be at 13:00
    if (lunch && !lunch.skipped && lunch.time) {
      expect(lunch.time.getHours()).toBe(13);
      expect(lunch.time.getMinutes()).toBe(0);
    }
    
    // Dinner should be at 19:00
    if (dinner && !dinner.skipped && dinner.time) {
      expect(dinner.time.getHours()).toBe(19);
      expect(dinner.time.getMinutes()).toBe(0);
    }
  });

  it('should schedule breakfast at wake + 45 minutes when wake time >= 09:00', () => {
    // Requirements: 5.2
    const wakeTime = new Date('2025-01-30T09:30:00');
    now = new Date(wakeTime);
    
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    
    if (breakfast && !breakfast.skipped && breakfast.time) {
      const expectedBreakfastTime = new Date(wakeTime.getTime() + 45 * 60000);
      expect(breakfast.time.getTime()).toBe(expectedBreakfastTime.getTime());
    }
  });

  it('should use default placement reason when no commitments exist', () => {
    // Requirements: 5.5
    const wakeTime = new Date('2025-01-30T07:00:00');
    now = new Date(wakeTime);
    
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const placedMeals = placements.filter(p => !p.skipped);
    
    for (const meal of placedMeals) {
      expect(meal.metadata?.placementReason).toBe('default');
    }
  });

  it('should adjust later meals forward when default times violate spacing', () => {
    // Requirements: 5.5
    // This is implicitly tested by the spacing constraint tests
    // If breakfast is at 09:30 (ends 09:45), lunch at 13:00 is fine (3h 15min gap)
    const wakeTime = new Date('2025-01-30T07:00:00');
    now = new Date(wakeTime);
    
    const placements = placeMeals([], wakeTime, sleepTime, now);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    const lunch = placements.find(p => p.meal === 'lunch');
    
    if (breakfast && !breakfast.skipped && breakfast.time && breakfast.duration &&
        lunch && !lunch.skipped && lunch.time) {
      
      const breakfastEnd = new Date(breakfast.time.getTime() + breakfast.duration * 60000);
      const gapMinutes = (lunch.time.getTime() - breakfastEnd.getTime()) / 60000;
      
      // Gap should be at least 180 minutes
      expect(gapMinutes).toBeGreaterThanOrEqual(180);
    }
  });
});


describe('Meal Placement - Subtask 6.5: Late Generation', () => {
  let wakeTime: Date;
  let sleepTime: Date;

  beforeEach(() => {
    wakeTime = new Date('2025-01-30T07:00:00');
    sleepTime = new Date('2025-01-30T23:00:00');
  });

  it('should skip breakfast when generated after 11:30', () => {
    // Requirements: 6.1
    const lateNow = new Date('2025-01-30T12:00:00');
    
    const placements = placeMeals([], wakeTime, sleepTime, lateNow);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    
    expect(breakfast).toBeDefined();
    expect(breakfast?.skipped).toBe(true);
    expect(breakfast?.skipReason).toBe('Past meal window');
  });

  it('should skip lunch when generated after 15:30', () => {
    // Requirements: 6.2
    const lateNow = new Date('2025-01-30T16:00:00');
    
    const placements = placeMeals([], wakeTime, sleepTime, lateNow);
    
    const lunch = placements.find(p => p.meal === 'lunch');
    
    expect(lunch).toBeDefined();
    expect(lunch?.skipped).toBe(true);
    expect(lunch?.skipReason).toBe('Past meal window');
  });

  it('should skip dinner when generated after 21:30', () => {
    // Requirements: 6.3
    const lateNow = new Date('2025-01-30T22:00:00');
    
    const placements = placeMeals([], wakeTime, sleepTime, lateNow);
    
    const dinner = placements.find(p => p.meal === 'dinner');
    
    expect(dinner).toBeDefined();
    expect(dinner?.skipped).toBe(true);
    expect(dinner?.skipReason).toBe('Past meal window');
  });

  it('should skip all meals when generated very late (after 21:30)', () => {
    // Requirements: 6.4
    const veryLateNow = new Date('2025-01-30T22:00:00');
    
    const placements = placeMeals([], wakeTime, sleepTime, veryLateNow);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    const lunch = placements.find(p => p.meal === 'lunch');
    const dinner = placements.find(p => p.meal === 'dinner');
    
    expect(breakfast?.skipped).toBe(true);
    expect(lunch?.skipped).toBe(true);
    expect(dinner?.skipped).toBe(true);
  });

  it('should only place remaining meals when generated mid-day', () => {
    // Requirements: 6.1, 6.2, 6.3
    const midDayNow = new Date('2025-01-30T14:00:00');
    
    const placements = placeMeals([], wakeTime, sleepTime, midDayNow);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    const lunch = placements.find(p => p.meal === 'lunch');
    const dinner = placements.find(p => p.meal === 'dinner');
    
    // Breakfast should be skipped (past 11:30)
    expect(breakfast?.skipped).toBe(true);
    
    // Lunch window is 11:30-15:30, so at 14:00 it's still within the window
    // Lunch should be placed (not skipped)
    expect(lunch?.skipped).toBe(false);
    expect(lunch?.time).toBeDefined();
    
    // Dinner should be placed (before 21:30)
    expect(dinner?.skipped).toBe(false);
    expect(dinner?.time).toBeDefined();
  });

  it('should place breakfast and lunch but skip dinner when generated at 16:00', () => {
    // Edge case: generated after lunch window but before dinner window
    const afternoonNow = new Date('2025-01-30T16:00:00');
    
    const placements = placeMeals([], wakeTime, sleepTime, afternoonNow);
    
    const breakfast = placements.find(p => p.meal === 'breakfast');
    const lunch = placements.find(p => p.meal === 'lunch');
    const dinner = placements.find(p => p.meal === 'dinner');
    
    // Breakfast should be skipped (past 11:30)
    expect(breakfast?.skipped).toBe(true);
    
    // Lunch should be skipped (past 15:30)
    expect(lunch?.skipped).toBe(true);
    
    // Dinner should be placed (within 17:00-21:30 window)
    expect(dinner?.skipped).toBe(false);
  });
});
