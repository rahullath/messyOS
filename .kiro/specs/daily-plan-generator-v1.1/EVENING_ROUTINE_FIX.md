# Evening Routine Placement Fix - Implementation Summary

## Overview
Fixed evening routine placement to meet requirements 7.1-7.5. Evening routine is now scheduled as the last non-buffer block, respects the 6pm constraint, and is dropped if it doesn't fit.

## Changes Made

### 1. Removed Evening Routine from Flexible Activities
**File**: `src/lib/daily-plan/plan-builder.ts`

- Removed evening routine from the `buildActivityList()` method
- Created new helper method `getEveningRoutineActivity()` to retrieve evening routine separately
- This prevents evening routine from being scheduled in gaps like other flexible activities

### 2. Special Evening Routine Scheduling Logic
**File**: `src/lib/daily-plan/plan-builder.ts`

Added Step 5 in `createTimeBlocksWithExitTimes()` to schedule evening routine specially:

```typescript
// Step 5: Schedule evening routine as last non-buffer block
const EVENING_ROUTINE_EARLIEST_TIME = 18; // 6:00 PM

// Determine earliest time evening routine can start
const eveningRoutineMinStartTime = sleepTime.getHours() < EVENING_ROUTINE_EARLIEST_TIME
  ? new Date(Math.max(currentTime.getTime(), planStartTime.getTime()))
  : new Date(Math.max(currentTime.getTime(), eveningRoutineEarliestTime.getTime(), planStartTime.getTime()));

// Check if evening routine fits before sleep time
if (eveningRoutineEnd <= sleepTime) {
  // Add evening routine block
  // Add buffer after evening routine
}
// If doesn't fit, it's dropped
```

### 3. Updated Method Signature
**File**: `src/lib/daily-plan/plan-builder.ts`

Changed `createTimeBlocksWithExitTimes()` to accept `PlanInputs` instead of just `Commitment[]`:
- This allows access to routine information for evening routine scheduling
- Updated `generateDailyPlan()` to pass full `inputs` object

## Requirements Validation

### ✅ Requirement 7.1: Last Non-Buffer Block
Evening routine is scheduled after all other flexible activities have been placed, making it the last non-buffer block.

### ✅ Requirement 7.2: Never Before 18:00
The `EVENING_ROUTINE_EARLIEST_TIME = 18` constant enforces that evening routine cannot start before 6pm (unless sleep time is earlier).

### ✅ Requirement 7.3: Early Sleep Time Exception
If `sleepTime.getHours() < 18`, the 6pm constraint is relaxed and evening routine can start from current time.

### ✅ Requirement 7.4: Buffer After Evening Routine
A 5-minute buffer is added after evening routine (if it fits before sleep time).

### ✅ Requirement 7.5: Drop If Doesn't Fit
The `if (eveningRoutineEnd <= sleepTime)` check ensures evening routine is only added if it fits completely before sleep time.

## Test Results

Created `scripts/test-evening-routine-logic.ts` to validate the logic:

### Test 1: Normal Case (7am wake, 11pm sleep, 5pm current)
- ✅ Evening routine scheduled at 6:00pm
- ✅ Fits before sleep time

### Test 2: Early Sleep Time (5pm sleep)
- ✅ 6pm constraint relaxed
- ✅ Evening routine scheduled at 3:00pm
- ✅ Fits before sleep time

### Test 3: Very Tight Schedule (6:10pm sleep)
- ✅ Evening routine correctly dropped (doesn't fit)

### Test 4: Late Generation (9pm current)
- ✅ Evening routine scheduled immediately at 9pm
- ✅ Fits before sleep time

## Edge Cases Handled

1. **Late plan generation**: If plan is generated after 6pm, evening routine starts immediately
2. **Early sleep time**: If sleep time is before 6pm, evening routine can start earlier
3. **Insufficient time**: If evening routine + buffer doesn't fit, it's dropped entirely
4. **Plan start after 6pm**: Evening routine respects plan start time (won't be scheduled before it)

## Files Modified

1. `src/lib/daily-plan/plan-builder.ts`
   - Modified `buildActivityList()` to exclude evening routine
   - Added `getEveningRoutineActivity()` helper method
   - Updated `generateDailyPlan()` to pass full inputs
   - Modified `createTimeBlocksWithExitTimes()` signature and implementation
   - Added Step 5 for special evening routine scheduling

## Files Created

1. `scripts/test-evening-routine-logic.ts` - Logic validation tests
2. `scripts/test-evening-routine-placement.ts` - Full integration tests (requires auth)
3. `.kiro/specs/daily-plan-generator-v1.1/EVENING_ROUTINE_FIX.md` - This document

## Next Steps

The evening routine placement fix is complete. The next task in the V1.1 plan is:

**Task 6: Fix Behind Schedule Logic**
- Update behind schedule calculation to ignore skipped blocks
- Only consider blocks after planStart
- Update "Degrade Plan" button visibility

## Notes

- The implementation maintains backward compatibility
- No database schema changes required
- The fix integrates seamlessly with existing tail plan generation
- Evening routine in tail plan (Task 3) already follows these rules
