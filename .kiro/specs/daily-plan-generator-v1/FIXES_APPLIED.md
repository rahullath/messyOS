# Spine V1 Fixes Applied

## Summary

Applied 6 critical architectural fixes to prevent bugs and ensure V1 actually works.

## Fixes

### 1. Exit Time Calculator Before Plan Builder ✅

**Problem:** Building time blocks before calculating exit times would require awkward retro-fitting.

**Fix:** Moved Exit Time Calculator (Task 2) before Plan Builder (Task 3). Exit times are now calculated during time block generation, creating travel blocks and prep blocks as part of the initial plan.

**Impact:** 
- Travel blocks integrated naturally into schedule
- Exit times stored during plan generation
- No retro-fitting needed

### 2. Pinned Commitments + Gap-Fill Scheduler ✅

**Problem:** "Handle fixed commitments at their scheduled times" was vague and could cause overlaps.

**Fix:** Added explicit gap-fill algorithm in Task 3.3:
1. Pin fixed commitments at their scheduled times first
2. Add travel and prep blocks before each commitment
3. Fill gaps between commitments with flexible activities (routines, meals, tasks)
4. Drop tasks if no space available (don't create overlaps)

**Impact:**
- No overlap bugs
- Clear scheduling strategy
- Tasks dropped gracefully when calendar is full

### 3. Sequencer Derived from time_blocks ✅

**Problem:** Separate `currentIndex` structure creates "index drift" bugs when activities are skipped or completed.

**Fix:** Removed `currentIndex` from database schema. Sequencer now derives from `time_blocks`:
- `getCurrentBlock()` = first block where `status='pending'`
- `getNextBlocks(n)` = next n pending blocks after current
- `markBlockComplete()` updates status, sequence updates automatically

**Impact:**
- No index drift bugs
- Simpler data model
- Sequence always correct

### 4. Degradation Recomputes Buffers ✅

**Problem:** Keeping old buffers after dropping tasks creates nonsense schedules.

**Fix:** Task 5.1 now rebuilds time blocks with recomputed buffers:
1. Keep fixed commitments, routines, and meals
2. Mark dropped tasks as "skipped"
3. Rebuild time blocks from scratch
4. Recompute 5-minute transitions between all activities

**Impact:**
- Degraded plans make sense
- Buffers match actual schedule
- No orphaned buffers

### 5. Meal Blocks Always Included ✅

**Problem:** Meals weren't mentioned in V1, but they're critical for "survivable day."

**Fix:** Task 3.2 now adds meal blocks:
- Breakfast: 15 minutes (cook + eat + cleanup)
- Lunch: 30 minutes
- Dinner: 45 minutes

No inventory integration. No meal suggestions. Just structure.

**Impact:**
- Eating time explicitly scheduled
- Prevents "I'll skip lunch" lies
- Huge for day survival

### 6. Routine Service Fallback ✅

**Problem:** v5 `routine-service` might expect uk-student tables, causing setup blockers.

**Fix:** Task 11.2 now has explicit fallback:
- Try to fetch routines from `routine-service.ts`
- If service fails or no routines exist, use defaults:
  - Morning Routine: 30 minutes
  - Evening Routine: 20 minutes

**Impact:**
- V1 works even if v5 service unavailable
- No schema setup blockers
- Graceful degradation

## Architectural Improvements

### Before Fixes
- Exit times calculated after plan generation (awkward retro-fit)
- Vague "handle fixed commitments" (overlap bugs likely)
- Separate currentIndex (index drift bugs)
- Keep old buffers during degradation (nonsense schedules)
- No meals (skipped eating)
- Hard dependency on v5 routine service (setup blocker)

### After Fixes
- Exit times integrated during plan generation (clean)
- Explicit gap-fill algorithm (no overlaps)
- Sequence derived from time_blocks (no drift)
- Recompute buffers during degradation (sensible schedules)
- Meals always included (survivable days)
- Fallback to default routines (no blockers)

## Result

Spine V1 is now:
- **Robust:** No overlap bugs, no index drift, no nonsense schedules
- **Survivable:** Meals included, routines have fallbacks
- **Implementable:** No v5 setup blockers, clear algorithms

Ready to build.
