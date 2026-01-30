# Implementation Plan: Spine V1.2 (Meal Scheduling Fix)

## Overview

V1.1 is deployed. This plan fixes the meal scheduling bug surgically — no rewrites, no new abstractions, just fix the placement logic in `plan-builder.ts`.

**The Bug:** Meals scheduled immediately after wake (Breakfast 07:35, Lunch 07:55, Dinner 08:30)

**The Fix:** Add meal-specific constraints (windows, spacing, anchor-awareness)

**Target:** 1 session to fix meal placement.

## Tasks

- [x] 1. Add meal scheduling constants
  - [x] 1.1 Create MEAL_WINDOWS constant in plan-builder.ts
    ```typescript
    const MEAL_WINDOWS = {
      breakfast: { start: '06:30', end: '11:30' },
      lunch: { start: '11:30', end: '15:30' },
      dinner: { start: '17:00', end: '21:30' }
    };
    ```
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Create MIN_MEAL_GAP_MINUTES constant
    ```typescript
    const MIN_MEAL_GAP_MINUTES = 180; // 3 hours
    ```
    - _Requirements: 2.1_

  - [x] 1.3 Create DEFAULT_MEAL_TIMES constant
    ```typescript
    const DEFAULT_MEAL_TIMES = {
      breakfast: '09:30',
      lunch: '13:00',
      dinner: '19:00'
    };
    ```
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2. Implement meal placement algorithm
  - [x] 2.1 Create placeMeals() function
    ```typescript
    function placeMeals(
      anchors: TimeBlock[],  // commitments + travel blocks
      wakeTime: Date,
      sleepTime: Date,
      now: Date
    ): MealPlacement[]
    ```
    - Calculate target time for each meal
    - Clamp to meal window
    - Check spacing constraint
    - Find available slot (±30 min from target)
    - Return placement or skip reason
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 2.2 Implement calculateMealTargetTime() helper
    ```typescript
    function calculateMealTargetTime(
      mealType: 'breakfast' | 'lunch' | 'dinner',
      anchors: TimeBlock[],
      wakeTime: Date,
      now: Date
    ): Date
    ```
    - If no anchors, use default times
    - If anchors exist, place around them:
      - Breakfast: near wake (if in window)
      - Lunch: after morning anchors or 12:30
      - Dinner: after evening anchors or 19:00
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4_

  - [x] 2.3 Implement clampToMealWindow() helper
    ```typescript
    function clampToMealWindow(
      targetTime: Date,
      mealType: 'breakfast' | 'lunch' | 'dinner'
    ): Date | null
    ```
    - Clamp target time to meal window
    - Return null if current time past window
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3_

  - [x] 2.4 Implement checkMealSpacing() helper
    ```typescript
    function checkMealSpacing(
      proposedTime: Date,
      previousMealEndTime: Date | null
    ): boolean
    ```
    - Return true if spacing >= 3 hours
    - Return true if no previous meal
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.5 Implement findAvailableSlot() helper
    ```typescript
    function findAvailableSlot(
      targetTime: Date,
      duration: number,
      anchors: TimeBlock[],
      searchRangeMinutes: number = 30
    ): Date | null
    ```
    - Search ±30 minutes from target time
    - Check for conflicts with anchors
    - Return first available slot or null
    - _Requirements: 7.3, 7.4_

- [x] 3. Modify plan builder to use meal placement
  - [x] 3.1 Update buildActivityList() to separate meals
    - Remove meals from normal activity list
    - Keep meals in separate array for later placement
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.2 Update createTimeBlocks() to place meals after anchors
    - Schedule commitments first
    - Schedule travel blocks second
    - Call placeMeals() to get meal placements
    - Insert meal blocks at calculated times
    - Schedule tasks and routines in remaining gaps
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.3 Handle skipped meals
    - When placeMeals() returns skip reason, don't create time block
    - Log skip reason for debugging
    - _Requirements: 1.4, 1.5, 6.4, 6.5, 6.6_

- [x] 4. Update wake time default logic
  - [x] 4.1 Modify plan generation form
    - If current time < 12:00, default wake time = 07:00
    - If current time >= 12:00, default wake time = now rounded down to nearest 15 min
    - Allow user to override
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 4.2 Update API endpoint
    - Accept wake time from form
    - Use planStart = max(wakeTime, now) as before
    - _Requirements: 8.4_

- [x] 5. Add meal placement metadata
  - [x] 5.1 Extend TimeBlock interface
    ```typescript
    interface TimeBlock {
      // ... existing fields
      metadata?: {
        target_time?: Date;
        placement_reason?: 'anchor-aware' | 'default';
        skip_reason?: string;
      };
    }
    ```
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 5.2 Store metadata when placing meals
    - Record target_time
    - Record placement_reason
    - Record skip_reason if skipped
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 5.3 Add debug logging
    - Log meal placement decisions
    - Log skip reasons
    - _Requirements: 9.4_

- [x] 6. Write unit tests for meal placement
  - [x] 6.1 Test meal windows
    - Test breakfast only scheduled 06:30-11:30
    - Test lunch only scheduled 11:30-15:30
    - Test dinner only scheduled 17:00-21:30
    - Test meals skipped when past window
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3_

  - [x] 6.2 Test meal spacing
    - Test 3-hour minimum gap enforced
    - Test later meal skipped if spacing violated
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 6.3 Test anchor-aware placement
    - Test meals scheduled around commitments
    - Test breakfast near wake
    - Test lunch after morning commitments
    - Test dinner after evening commitments
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.4 Test default meal times
    - Test no-commitment plan uses defaults (09:30, 13:00, 19:00)
    - Test wake time affects breakfast default
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.5 Test late generation
    - Test breakfast skipped when generated after 11:30
    - Test lunch skipped when generated after 15:30
    - Test dinner skipped when generated after 21:30
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Integration testing
  - [x] 7.1 Test real-world scenario: Morning class
    - Wake 07:00
    - Class 09:00-10:00
    - Verify breakfast before class (07:30-08:30)
    - Verify lunch after class (12:30-13:00)
    - Verify dinner evening (19:00-19:45)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 7.2 Test real-world scenario: Evening seminar
    - Wake 07:00
    - Seminar 17:00-18:00
    - Verify breakfast morning (09:00-09:30)
    - Verify lunch midday (13:00-13:30)
    - Verify dinner after seminar (19:00-19:45)
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 7.3 Test real-world scenario: No commitments
    - Wake 07:00
    - No commitments
    - Verify breakfast 09:30
    - Verify lunch 13:00
    - Verify dinner 19:00
    - _Requirements: 3.5, 5.1, 5.3, 5.4_

  - [x] 7.4 Test real-world scenario: Late generation
    - Generate at 14:00
    - Verify breakfast skipped
    - Verify lunch skipped
    - Verify dinner scheduled 19:00
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. End-to-end verification
  - [x] 8.1 Generate plan with morning class
    - Verify meals at reasonable times
    - Verify no "three meals before 9am" bug
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 8.2 Generate plan with no commitments
    - Verify default meal times used
    - Verify day looks "boring and sane"
    - _Requirements: 3.5, 5.1, 5.3, 5.4_

  - [x] 8.3 Generate plan late in day
    - Verify past meals skipped
    - Verify remaining meals scheduled correctly
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Final checkpoint - V1.2 complete
  - Ensure all tests pass, ask the user if questions arise.

## Implementation Notes

### Where to Make Changes

**Primary file:** `src/lib/daily-plan/plan-builder.ts`

**Changes:**
1. Add constants at top of file
2. Add meal placement functions (placeMeals, helpers)
3. Modify buildActivityList() to separate meals
4. Modify createTimeBlocks() to place meals after anchors

**No database changes needed** - use existing time_blocks table with metadata field.

### Algorithm Summary

```typescript
// Pseudocode for meal placement
function placeMeals(anchors, wake, sleep, now) {
  const meals = ['breakfast', 'lunch', 'dinner'];
  const placements = [];
  let previousMealEnd = null;

  for (const meal of meals) {
    // 1. Calculate target time
    const target = calculateMealTargetTime(meal, anchors, wake, now);
    
    // 2. Clamp to window
    const clamped = clampToMealWindow(target, meal);
    if (!clamped) {
      placements.push({ meal, skipped: true, reason: 'Past meal window' });
      continue;
    }
    
    // 3. Check spacing
    if (!checkMealSpacing(clamped, previousMealEnd)) {
      placements.push({ meal, skipped: true, reason: 'Spacing constraint' });
      continue;
    }
    
    // 4. Find available slot
    const slot = findAvailableSlot(clamped, MEAL_DURATIONS[meal], anchors);
    if (!slot) {
      placements.push({ meal, skipped: true, reason: 'No valid slot' });
      continue;
    }
    
    // 5. Place meal
    placements.push({ meal, time: slot, duration: MEAL_DURATIONS[meal] });
    previousMealEnd = new Date(slot.getTime() + MEAL_DURATIONS[meal] * 60000);
  }
  
  return placements;
}
```

## What's Explicitly NOT in V1.2

- Meal suggestions based on inventory
- Meal complexity optimization
- Nutritional tracking
- Recipe integration
- Grocy/meal planning service integration
- Timeline visualization
- Notifications
- Analytics

This is surgical meal placement fix only. V1.2 makes meal timing sane, nothing more.
