# Late Plan Generation Fix

## Problem

When generating a plan later in the day (e.g., at 2 PM instead of 7 AM), the system would:
1. Create blocks for activities that already passed (7 AM - 2 PM)
2. Show these as "current" activities even though they're in the past
3. Trigger "behind schedule" warnings immediately
4. Create a confusing user experience

## Solution (Minimal, Spine-Safe)

### Step 1: Compute Plan Start Time

In `plan-builder.ts`, compute the actual plan start time:

```typescript
// Round up to next 5-minute interval
private roundUpToNext5Minutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 5;
  if (remainder !== 0) {
    rounded.setMinutes(minutes + (5 - remainder));
  }
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  return rounded;
}

// In generateDailyPlan():
const now = new Date();
const roundedNow = this.roundUpToNext5Minutes(now);
const planStartTime = new Date(Math.max(input.wakeTime.getTime(), roundedNow.getTime()));
```

**Logic:**
- If generating at 7 AM (wake time), plan starts at 7 AM
- If generating at 2 PM, plan starts at 2:00 PM (rounded to next 5-min)
- If generating at 2:03 PM, plan starts at 2:05 PM (rounded up)

### Step 2: Mark Past Blocks as Skipped

In `createTimeBlocksWithExitTimes()`, after building all blocks:

```typescript
// Step 5: Mark blocks that ended before plan start as skipped
for (const block of blocks) {
  if (block.endTime <= planStartTime) {
    block.status = 'skipped';
    block.skipReason = 'Occurred before plan start';
  }
}
```

**Result:**
- Blocks that ended before plan start are marked as skipped
- First pending block is the first one that ends after plan start
- User sees only relevant activities

### Step 3: Behind Schedule Logic (Already Correct)

The `DegradePlanButton` already uses the correct logic:

```typescript
// Find current block (first pending block)
const currentBlock = plan.timeBlocks.find(block => block.status === 'pending');

// Check if behind schedule
const now = new Date();
const endTime = new Date(currentBlock.endTime);
const thirtyMinutesAfterEnd = new Date(endTime.getTime() + 30 * 60 * 1000);
setShouldShow(now > thirtyMinutesAfterEnd);
```

**Logic:**
- Only checks against the CURRENT pending block
- Not against blocks that already ended hours ago
- Shows degrade button only when truly behind

## Example Scenarios

### Scenario 1: Generate at 7 AM (Wake Time)
- Plan start: 7:00 AM
- All blocks from 7 AM onwards are pending
- No blocks skipped
- Works as before

### Scenario 2: Generate at 2 PM
- Wake time: 7 AM
- Plan start: 2:00 PM (rounded from current time)
- Blocks 7 AM - 2 PM: Marked as skipped ("Occurred before plan start")
- Blocks 2 PM onwards: Pending
- First pending block becomes "current"
- User sees only relevant activities

### Scenario 3: Generate at 2:03 PM
- Wake time: 7 AM
- Plan start: 2:05 PM (rounded up to next 5-min)
- Blocks 7 AM - 2:05 PM: Skipped
- Blocks 2:05 PM onwards: Pending
- Clean 5-minute intervals maintained

## Benefits

✅ **No Confusion** - Only shows activities that haven't happened yet  
✅ **Correct Current Block** - First pending block is actually current  
✅ **No False Warnings** - Behind schedule only triggers for actual delays  
✅ **Minimal Change** - Spine-safe, doesn't break existing functionality  
✅ **Clean UX** - Users see a sensible plan regardless of generation time  

## Testing

### Manual Test
1. Go to `/daily-plan`
2. Generate a plan at any time of day
3. Verify:
   - Past activities are marked as skipped
   - Current activity is actually current
   - No "behind schedule" warning unless truly behind

### Expected Behavior

**Morning Generation (7 AM):**
```
⏳ Morning Routine (7:00-7:30) ← CURRENT
⏳ Transition (7:30-7:35)
⏳ Breakfast (7:35-7:50)
...
```

**Afternoon Generation (2 PM):**
```
⊘ Morning Routine (7:00-7:30) - Occurred before plan start
⊘ Transition (7:30-7:35) - Occurred before plan start
⊘ Breakfast (7:35-7:50) - Occurred before plan start
...
⊘ Lunch (12:00-12:30) - Occurred before plan start
⏳ Transition (14:00-14:05) ← CURRENT
⏳ Task: Review code (14:05-15:05)
...
```

## Files Changed

1. `src/lib/daily-plan/plan-builder.ts`
   - Added `roundUpToNext5Minutes()` helper
   - Compute `planStartTime` in `generateDailyPlan()`
   - Pass `planStartTime` to `createTimeBlocksWithExitTimes()`
   - Mark past blocks as skipped

2. `src/components/daily-plan/DegradePlanButton.tsx`
   - No changes needed (already correct)

## Backwards Compatibility

✅ **Fully Compatible** - Existing plans work as before  
✅ **No Breaking Changes** - API unchanged  
✅ **No Migration Needed** - Only affects new plan generation  

## Future Enhancements (V2)

- Show skipped blocks in a collapsed section
- Add "Regenerate from now" button
- Time travel: "What if I started at X time?"
- Analytics: Track when plans are generated vs wake time

---

**Status:** ✅ Implemented  
**Version:** V1.1  
**Date:** January 18, 2026
