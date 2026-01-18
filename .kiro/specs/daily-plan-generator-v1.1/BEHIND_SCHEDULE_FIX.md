# Behind Schedule Logic Fix - Implementation Summary

## Task 6: Fix Behind Schedule Logic

**Status:** ✅ Complete

## Overview

Fixed the behind schedule calculation and "Degrade Plan" button visibility to properly handle late plan generation and skipped blocks.

## Changes Made

### File: `src/components/daily-plan/DegradePlanButton.tsx`

Updated the `checkShouldShow` function to implement all requirements:

#### Requirement 5.1: Only consider blocks after planStart
- Filter time blocks to only include those ending after `plan.planStart`
- This prevents morning blocks from affecting the calculation when plan is generated late

#### Requirement 5.2: Ignore blocks with status = 'skipped'
- Find the first **pending** block (automatically ignores skipped blocks)
- Skipped morning blocks no longer trigger "behind schedule" state

#### Requirement 5.3: Check if now > currentBlock.endTime + 30 minutes
- Calculate 30 minutes after current block end time
- Show button only if current time exceeds this threshold

#### Requirement 5.4: When all blocks before now are skipped, don't consider user behind schedule
- Handled by finding first pending block (skipped blocks are ignored in the search)

#### Requirement 5.5: Hide button in specific cases
- Hide if no current block exists (all completed/skipped)
- Hide if current block hasn't started yet (all remaining blocks are in the future)

## Logic Flow

```typescript
1. Get all blocks after planStart
2. Find first pending block (ignores skipped)
3. If no pending block → HIDE
4. If pending block hasn't started → HIDE
5. If now > block.endTime + 30min → SHOW
6. Otherwise → HIDE
```

## Test Results

Created comprehensive test suite in `scripts/test-behind-schedule-logic.ts`:

✅ Test 1: User behind schedule (40 min late) → SHOW
✅ Test 2: User on time (20 min late) → HIDE
✅ Test 3: Skipped morning blocks ignored → HIDE
✅ Test 4: Only blocks after planStart considered → HIDE
✅ Test 5: All blocks completed → HIDE
✅ Test 6: All blocks in future → HIDE
✅ Test 7: Complex scenario (late gen + skipped + behind) → SHOW

**All 7 tests passed!**

## Requirements Validated

- ✅ 5.1: Only consider blocks after planStart
- ✅ 5.2: Ignore skipped blocks
- ✅ 5.3: Check if now > currentBlock.endTime + 30 minutes
- ✅ 5.4: Don't trigger on skipped blocks
- ✅ 5.5: Hide button when no current block or all blocks in future

## Impact

### Before Fix
- Plans generated at 3pm showed "Degrade Plan" because morning blocks were "behind schedule"
- Skipped blocks incorrectly triggered behind schedule state
- Button showed even when all remaining activities were in the future

### After Fix
- Plans generated late only consider blocks after generation time
- Skipped blocks are properly ignored
- Button only shows when user is actually behind on pending activities
- Button hides when all remaining blocks are in the future

## Next Steps

This fix is part of V1.1 post-deployment improvements. Related tasks:
- Task 7: Fix Completion Logic (uses similar planStart filtering)
- Task 12: End-to-end testing (will validate this fix in real scenarios)
