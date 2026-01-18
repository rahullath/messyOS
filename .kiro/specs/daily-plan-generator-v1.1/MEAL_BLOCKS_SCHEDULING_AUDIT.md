# Meal Blocks Scheduling Audit - Task 10.2

## Audit Date
January 18, 2026

## Requirements Being Verified
- **8.1**: Breakfast block scheduled in gaps
- **8.2**: Lunch block scheduled in gaps
- **8.3**: Dinner block scheduled in gaps

## Code Location
File: `src/lib/daily-plan/plan-builder.ts`
Method: `createTimeBlocksWithExitTimes()`

## Audit Findings

### Gap-Fill Scheduling Algorithm

The plan builder uses a gap-fill scheduling algorithm that processes flexible activities (including meal blocks) in the order they appear in the activity list.

**Algorithm Flow** (Lines 428-520):

1. **Identify Fixed Blocks**: Commitments and travel blocks are identified as fixed
2. **Sort Fixed Blocks**: Fixed blocks are sorted by start time
3. **Fill Gaps Before Fixed Blocks**: 
   - For each fixed block, fill the gap before it with flexible activities
   - Activities are taken from the `flexibleActivities` array in order
   - Each activity is checked to see if it fits in the gap (with buffer)
   - If it fits, it's scheduled; if not, move to next gap
4. **Fill Remaining Time**: After all fixed blocks, fill remaining time until sleep

### Meal Blocks in Activity List Order

From `buildActivityList()` method (lines 193-280), the activity list order is:

1. Morning routine
2. Fixed commitments (sorted by time)
3. **Breakfast** (15 min) ← First meal
4. **Lunch** (30 min) ← Second meal
5. **Dinner** (45 min) ← Third meal
6. Tasks OR Primary Focus Block

### ✅ Requirement 8.1: Breakfast Scheduled in Gaps

**Status**: ✅ **VERIFIED**

**Logic**:
- Breakfast is added to `flexibleActivities` array (line 428)
- Gap-fill algorithm processes activities in order (lines 432-478)
- Breakfast is the first meal in the list, so it gets scheduled in the first available gap after morning routine
- If breakfast doesn't fit in a gap before a commitment, it will be scheduled in the next gap or after all commitments

**Code Reference**: Lines 432-478 (gap-fill loop)

```typescript
for (const fixedBlock of fixedBlocks) {
  // Fill gap before this fixed block
  const gapEnd = fixedBlock.startTime;

  while (flexibleActivities.length > 0 && currentTime < gapEnd) {
    const activity = flexibleActivities[0];
    const activityEnd = new Date(currentTime.getTime() + activity.duration * 60000);

    // Check if activity fits in gap (with buffer)
    if (activityEnd.getTime() + BUFFER_MINUTES * 60000 <= gapEnd.getTime()) {
      // Add activity block (including meal blocks)
      blocks.push({
        startTime: new Date(currentTime),
        endTime: activityEnd,
        activityType: activity.type,
        activityName: activity.name,
        activityId: activity.activityId,
        isFixed: false,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
      });
      // ... buffer code ...
      flexibleActivities.shift(); // Remove used activity
    } else {
      break; // Try next gap
    }
  }
}
```

---

### ✅ Requirement 8.2: Lunch Scheduled in Gaps

**Status**: ✅ **VERIFIED**

**Logic**:
- Lunch is added to `flexibleActivities` array after breakfast
- Same gap-fill algorithm processes lunch
- Lunch gets scheduled in the next available gap after breakfast (or after commitments if gaps are too small)

**Code Reference**: Same gap-fill loop (lines 432-478)

---

### ✅ Requirement 8.3: Dinner Scheduled in Gaps

**Status**: ✅ **VERIFIED**

**Logic**:
- Dinner is added to `flexibleActivities` array after lunch
- Same gap-fill algorithm processes dinner
- Dinner gets scheduled in the next available gap after lunch
- **Special handling**: Dinner is also included in tail plan generation (lines 698-717) when no blocks exist after plan start

**Code Reference**: 
- Gap-fill loop (lines 432-478)
- Tail plan generation (lines 698-717)

---

## Additional Verification: Remaining Time Fill

After all fixed blocks are processed, the algorithm fills remaining time (lines 507-540):

```typescript
// Step 4: Fill remaining time after last commitment (excluding evening routine)
while (flexibleActivities.length > 0 && currentTime < sleepTime) {
  const activity = flexibleActivities.shift()!;
  const activityEnd = new Date(currentTime.getTime() + activity.duration * 60000);

  // Don't exceed sleep time
  if (activityEnd > sleepTime) {
    break;
  }

  // Add activity block
  blocks.push({
    startTime: new Date(currentTime),
    endTime: activityEnd,
    activityType: activity.type,
    activityName: activity.name,
    activityId: activity.activityId,
    isFixed: false,
    sequenceOrder: sequenceOrder++,
    status: 'pending',
  });
  // ... buffer code ...
}
```

This ensures that any meal blocks that didn't fit in gaps before commitments will be scheduled after all commitments.

---

## Edge Cases Handled

### ✅ Case 1: No Commitments
- All flexible activities (including all meal blocks) are scheduled sequentially from wake time
- Breakfast → Lunch → Dinner → Tasks → Evening Routine

### ✅ Case 2: Many Commitments with Small Gaps
- Meal blocks that don't fit in gaps before commitments are scheduled after all commitments
- Algorithm ensures all flexible activities are eventually scheduled (if time permits)

### ✅ Case 3: Late Generation (Tail Plan)
- If no blocks exist after plan start, tail plan is generated
- Tail plan explicitly includes Dinner (lines 698-717)
- Breakfast and lunch are marked as skipped if they ended before plan start

### ✅ Case 4: Not Enough Time
- If a meal block doesn't fit before sleep time, it's dropped
- This is acceptable behavior (can't force activities that don't fit)

---

## Summary

### All Requirements Met ✅

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| 8.1 - Breakfast scheduled in gaps | ✅ PASS | Gap-fill algorithm lines 432-478 |
| 8.2 - Lunch scheduled in gaps | ✅ PASS | Gap-fill algorithm lines 432-478 |
| 8.3 - Dinner scheduled in gaps | ✅ PASS | Gap-fill algorithm lines 432-478 + Tail plan lines 698-717 |

### Implementation Quality

**Strengths**:
1. ✅ Robust gap-fill algorithm that processes all flexible activities
2. ✅ Meal blocks are treated as flexible activities and scheduled in order
3. ✅ Algorithm handles multiple edge cases (no commitments, many commitments, late generation)
4. ✅ Dinner is explicitly included in tail plan for late-day generation
5. ✅ Activities that don't fit are gracefully dropped (acceptable behavior)

**No Issues Found**: The gap-fill scheduling correctly handles all meal blocks.

### Conclusion

**Task 10.2 Status**: ✅ **COMPLETE - NO FIXES NEEDED**

The plan builder correctly schedules meal blocks in gaps:
- Gap-fill algorithm processes all flexible activities (including meal blocks) in order
- Meal blocks are scheduled in available gaps between fixed commitments
- Remaining meal blocks are scheduled after all commitments
- Dinner is included in tail plans for late-day generation
- No code changes required - implementation is correct

**Overall Task 10 Status**: ✅ **COMPLETE**

All meal block requirements are properly implemented:
- ✅ Task 10.1: Meal blocks always added to activity list
- ✅ Task 10.2: Meal blocks scheduled in gaps via gap-fill algorithm
- ✅ No fixes needed - implementation is correct
