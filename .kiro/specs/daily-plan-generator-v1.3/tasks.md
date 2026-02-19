# Implementation Plan: Spine V1.3 (Wake Ramp + Location Awareness)

## Overview

V1.2 fixed meal timing. V1.3 adds physical reality: wake-up ramp, location awareness, and round-trip commitments.

**The Problems:**
1. No startup time (wake → lunch instantly)
2. Meals scheduled while not home
3. No return travel from commitments

**The Fixes:**
1. Wake Ramp (75-120 min startup block)
2. Commitment Envelopes (prep + travel + event + return + recovery)
3. Location State (at_home vs not_home, meals require home)

**Target:** 1-2 sessions to add physical reality.

## Tasks

- [ ] 1. Add Wake Ramp generation
  - [ ] 1.1 Create WAKE_RAMP_DURATIONS constant
    ```typescript
    const WAKE_RAMP_DURATIONS = {
      low: 120,    // 2 hours when low energy
      medium: 90,  // 1.5 hours when medium energy
      high: 75     // 1.25 hours when high energy
    };
    ```
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ] 1.2 Create generateWakeRamp() function
    ```typescript
    function generateWakeRamp(
      planStart: Date,
      wakeTime: Date,
      energyState: 'low' | 'medium' | 'high'
    ): TimeBlock | null
    ```
    - Skip if planStart > wakeTime + 2 hours (already awake)
    - Use duration based on energy state
    - Add metadata about components (toilet, shower, hygiene, dress)
    - Return single "Wake Ramp" block
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 12.1, 12.2, 12.3_

  - [ ]* 1.3 Write unit tests for Wake Ramp
    - Test duration based on energy
    - Test skip when already awake
    - Test metadata includes components
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 12.2_

- [ ] 2. Implement Commitment Envelopes
  - [ ] 2.1 Create PREP_DURATIONS constant
    ```typescript
    const PREP_DURATIONS = {
      default: 15,
      seminar: 25,
      workshop: 25,
      no_location: 25
    };
    ```
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 2.2 Create RECOVERY_DURATIONS constant
    ```typescript
    const RECOVERY_DURATIONS = {
      short: 10,   // < 2 hour commitment
      long: 20     // >= 2 hour commitment
    };
    ```
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 2.3 Create buildCommitmentEnvelope() function
    ```typescript
    function buildCommitmentEnvelope(
      commitment: CalendarEvent,
      currentLocation: Location
    ): CommitmentEnvelope
    ```
    - Calculate prep duration (based on type/location)
    - Calculate travel there (using travel service)
    - Include commitment block
    - Calculate travel back (same duration as there)
    - Calculate recovery buffer (based on commitment duration)
    - Return 5 blocks with envelope metadata
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 2.4 Handle commitments without location
    - Use 25-minute prep
    - Skip travel blocks
    - Skip return travel
    - Add recovery buffer
    - Assume at_home throughout
    - _Requirements: 7.5, 10.4_

  - [ ]* 2.5 Write unit tests for commitment envelopes
    - Test 5-block structure
    - Test prep duration calculation
    - Test return travel duration
    - Test recovery buffer duration
    - Test no-location handling
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 8.1, 8.2_

- [ ] 3. Implement Location State Tracking
  - [ ] 3.1 Add location_state to TimeBlock metadata
    ```typescript
    interface TimeBlock {
      // ... existing fields
      metadata?: {
        // ... existing metadata
        location_state?: 'at_home' | 'not_home';
        envelope_id?: string;
        envelope_type?: 'prep' | 'travel_there' | 'commitment' | 'travel_back' | 'recovery';
      };
    }
    ```
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 14.1, 14.2_

  - [ ] 3.2 Create calculateLocationState() function
    ```typescript
    function calculateLocationState(blocks: TimeBlock[]): TimeBlock[]
    ```
    - Set at_home for planStart
    - Set not_home for travel_there through commitment
    - Set at_home after recovery
    - Return blocks with location_state set
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 3.3 Create getHomeIntervals() function
    ```typescript
    function getHomeIntervals(
      blocks: TimeBlock[],
      planStart: Date,
      sleepTime: Date
    ): TimeInterval[]
    ```
    - Start with full day
    - Subtract commitment envelopes
    - Filter intervals < 30 minutes
    - Return valid home intervals
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 3.4 Write unit tests for location state
    - Test location_state transitions
    - Test home intervals calculation
    - Test filtering short intervals
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3_

- [ ] 4. Update meal placement to use home intervals
  - [ ] 4.1 Modify placeMeals() to accept home intervals
    ```typescript
    function placeMeals(
      homeIntervals: TimeInterval[],
      wakeTime: Date,
      sleepTime: Date,
      now: Date
    ): MealPlacement[]
    ```
    - Only consider times within home intervals
    - If no home interval in meal window, mark as portable suggestion
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.1, 11.2, 11.4_

  - [ ] 4.2 Update meal skip reasons
    - Add "No home interval in window" reason
    - Add "Portable suggestion" status
    - Store portable suggestions in metadata
    - _Requirements: 5.5, 11.1, 11.2, 11.4, 11.5_

  - [ ]* 4.3 Write unit tests for location-aware meal placement
    - Test meals only in home intervals
    - Test portable suggestions when no home interval
    - Test skip reasons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5. Update plan generation order
  - [ ] 5.1 Modify generateDailyPlan() to follow new order
    ```typescript
    async function generateDailyPlan(input: PlanInput): Promise<DailyPlan> {
      // 1. Calculate planStart
      const planStart = Math.max(input.wakeTime, now);
      
      // 2. Add Wake Ramp
      const wakeRamp = generateWakeRamp(planStart, input.wakeTime, input.energyState);
      
      // 3. Build commitment envelopes
      const envelopes = input.commitments.map(c => buildCommitmentEnvelope(c, userLocation));
      
      // 4. Calculate home intervals
      const allBlocks = [wakeRamp, ...envelopes.flat()].filter(Boolean);
      const homeIntervals = getHomeIntervals(allBlocks, planStart, input.sleepTime);
      
      // 5. Place meals in home intervals
      const meals = placeMeals(homeIntervals, input.wakeTime, input.sleepTime, now);
      
      // 6. Place tasks in remaining home intervals
      const tasks = placeTasks(homeIntervals, meals, input.tasks, input.energyState);
      
      // 7. Add evening routine (in last home interval)
      const eveningRoutine = placeEveningRoutine(homeIntervals, input.sleepTime);
      
      // 8. Combine and sort all blocks
      const timeBlocks = sortAndValidate([...allBlocks, ...meals, ...tasks, eveningRoutine]);
      
      return { ...plan, timeBlocks };
    }
    ```
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 5.2 Update evening routine placement
    - Place in last home interval
    - Skip if no home interval after 18:00
    - Skip if doesn't fit
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 5.3 Write integration tests for generation order
    - Test order is followed
    - Test location_state is set for all blocks
    - Test no overlaps
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6. Add location state validation
  - [ ] 6.1 Create validateLocationState() function
    ```typescript
    function validateLocationState(blocks: TimeBlock[]): ValidationResult
    ```
    - Check no meals during not_home
    - Check no travel during at_home
    - Check transitions are valid
    - Return errors or warnings
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 6.2 Add validation to plan generation
    - Call validateLocationState() before saving
    - Log errors
    - Auto-fix if possible (skip conflicting meals)
    - _Requirements: 15.1, 15.4, 15.5_

  - [ ]* 6.3 Write unit tests for validation
    - Test catches meals during not_home
    - Test catches travel during at_home
    - Test auto-fix works
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 7. Update UI to show location context
  - [ ] 7.1 Add location indicator to time blocks
    - Show 🏠 for at_home blocks
    - Show 🚶 for not_home blocks
    - Show in activity list
    - _Requirements: 4.5_

  - [ ] 7.2 Group commitment envelopes visually
    - Show prep + travel + event + return + recovery as grouped
    - Use indentation or visual grouping
    - Label as "Trip to [commitment]"
    - _Requirements: 14.2_

  - [ ] 7.3 Show portable meal suggestions
    - Display "Consider portable meal" for skipped meals with no home interval
    - Show in separate section or with special icon
    - _Requirements: 11.2, 11.4_

- [ ] 8. Write integration tests
  - [ ] 8.1 Test wake ramp + commitment envelope
    - Wake 07:00
    - Class 09:00-10:00
    - Verify Wake Ramp 07:00-08:15
    - Verify envelope: prep 08:15-08:30, travel 08:30-08:50, class 09:00-10:00, return 10:00-10:20, recovery 10:20-10:30
    - Verify breakfast in home interval (after Wake Ramp or after recovery)
    - _Requirements: 1.1, 3.1, 5.1_

  - [ ] 8.2 Test location-aware meal placement
    - Wake 07:00
    - Seminar 17:00-18:00
    - Verify breakfast at home (morning)
    - Verify lunch at home (midday)
    - Verify dinner at home (after return + recovery, ~19:00)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.3 Test late generation with Wake Ramp skip
    - Generate at 14:00
    - Verify Wake Ramp skipped
    - Verify location_state = at_home immediately
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 8.4 Test no-location commitment
    - Commitment with no location
    - Verify prep block added
    - Verify no travel blocks
    - Verify recovery added
    - Verify location_state = at_home throughout
    - _Requirements: 7.5, 10.4_

- [ ] 9. End-to-end verification
  - [ ] 9.1 Test real scenario: Morning class
    - Wake 07:00, Class 09:00-10:00
    - Verify plan looks like:
      - 07:00-08:15 Wake Ramp
      - 08:15-08:30 Breakfast
      - 08:30-08:45 Prep
      - 08:45-09:00 Travel
      - 09:00-10:00 Class
      - 10:00-10:15 Return
      - 10:15-10:25 Recovery
      - 12:30-13:00 Lunch
      - 19:00-19:45 Dinner
    - _Requirements: 1.1, 3.1, 5.1_

  - [ ] 9.2 Test real scenario: Evening seminar (your Jan 30 example)
    - Wake 12:00, Seminar 17:00-18:00
    - Verify plan looks like:
      - 12:00-13:30 Wake Ramp (or skipped if already awake)
      - 13:30-14:10 Lunch
      - 14:10-15:10 Primary Focus
      - 15:10-15:25 Prep
      - 15:25-16:15 Travel
      - 17:00-18:00 Seminar
      - 18:00-18:35 Return
      - 18:35-18:55 Recovery
      - 19:00-19:45 Dinner
      - 22:30-22:50 Evening Routine
    - _Requirements: 1.1, 3.1, 5.1, 8.1, 8.2_

  - [ ] 9.3 Test real scenario: No commitments
    - Wake 07:00, No commitments
    - Verify plan looks like:
      - 07:00-08:15 Wake Ramp
      - 09:30-09:45 Breakfast
      - 10:00-11:00 Primary Focus
      - 13:00-13:30 Lunch
      - 19:00-19:45 Dinner
      - 22:30-22:50 Evening Routine
    - _Requirements: 1.1, 5.1, 13.1_

- [ ] 10. Final checkpoint - V1.3 complete
  - Ensure all tests pass, ask the user if questions arise.

## Implementation Notes

### Where to Make Changes

**Primary file:** `src/lib/daily-plan/plan-builder.ts`

**Changes:**
1. Add constants (Wake Ramp durations, prep durations, recovery durations)
2. Add generateWakeRamp() function
3. Add buildCommitmentEnvelope() function
4. Add calculateLocationState() function
5. Add getHomeIntervals() function
6. Modify placeMeals() to use home intervals
7. Rewrite generateDailyPlan() to follow new order

**Database:** Use existing metadata field, no schema changes needed.

### Key Algorithms

**Commitment Envelope:**
```typescript
function buildCommitmentEnvelope(commitment, location) {
  const prep = { duration: getPrepDuration(commitment), type: 'prep' };
  const travelThere = { duration: getTravelDuration(location, commitment.location), type: 'travel_there' };
  const event = { duration: commitment.duration, type: 'commitment' };
  const travelBack = { duration: travelThere.duration, type: 'travel_back' };
  const recovery = { duration: getRecoveryDuration(commitment), type: 'recovery' };
  
  return [prep, travelThere, event, travelBack, recovery];
}
```

**Home Intervals:**
```typescript
function getHomeIntervals(blocks, planStart, sleepTime) {
  const intervals = [{ start: planStart, end: sleepTime }];
  
  // Subtract each commitment envelope
  for (const envelope of getEnvelopes(blocks)) {
    intervals = subtractInterval(intervals, envelope.start, envelope.end);
  }
  
  // Filter short intervals
  return intervals.filter(i => duration(i) >= 30);
}
```

## What's Explicitly NOT in V1.3

- Full geolocation tracking
- Multi-stop routing
- Complex location modeling
- Location-based notifications
- Portable meal scheduling (just suggestions)
- Timeline visualization
- Analytics

This is surgical: add wake ramp, commitment envelopes, and location awareness. V1.3 makes plans map to physical reality.
