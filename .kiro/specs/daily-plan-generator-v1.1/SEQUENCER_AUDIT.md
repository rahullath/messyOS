# Sequencer Source of Truth Audit

**Date:** January 18, 2026  
**Task:** 8.1 - Audit sequencer implementation  
**Requirements:** 9.1, 9.2, 9.3, 9.4, 9.5

## Executive Summary

✅ **AUDIT PASSED** - The sequencer implementation correctly uses `time_blocks.status` as the single source of truth. No separate index tracking exists.

## Audit Findings

### 1. getCurrentBlock Implementation ✅

**Location:** `src/lib/daily-plan/sequencer.ts:19-28`

**Verification:**
- ✅ Queries `time_blocks` via `getTimeBlocksByPlan()`
- ✅ Finds first block where `status === 'pending'`
- ✅ Returns null if no pending blocks found
- ✅ No separate index field used

**Code:**
```typescript
export async function getCurrentBlock(
  supabase: AnySupabaseClient,
  planId: string
): Promise<TimeBlock | null> {
  const timeBlocks = await getTimeBlocksByPlan(supabase, planId);
  
  // Find first block with status='pending'
  const currentBlock = timeBlocks.find(block => block.status === 'pending');
  
  return currentBlock || null;
}
```

**Requirements Met:** 9.1 ✅

---

### 2. getNextBlocks Implementation ✅

**Location:** `src/lib/daily-plan/sequencer.ts:58-83`

**Verification:**
- ✅ Queries `time_blocks` via `getTimeBlocksByPlan()`
- ✅ Finds current block by `status === 'pending'`
- ✅ Returns next n blocks where `status === 'pending'`
- ✅ No separate index field used

**Code:**
```typescript
export async function getNextBlocks(
  supabase: AnySupabaseClient,
  planId: string,
  count: number
): Promise<TimeBlock[]> {
  const timeBlocks = await getTimeBlocksByPlan(supabase, planId);
  
  // Find current block
  const currentIndex = timeBlocks.findIndex(block => block.status === 'pending');
  
  if (currentIndex === -1) {
    return [];
  }
  
  // Get next n pending blocks after current
  const nextBlocks: TimeBlock[] = [];
  for (let i = currentIndex + 1; i < timeBlocks.length && nextBlocks.length < count; i++) {
    if (timeBlocks[i].status === 'pending') {
      nextBlocks.push(timeBlocks[i]);
    }
  }
  
  return nextBlocks;
}
```

**Note:** The variable name `currentIndex` is a local variable used for iteration only. It is NOT stored in the database or persisted anywhere.

**Requirements Met:** 9.2 ✅

---

### 3. markBlockComplete Implementation ✅

**Location:** `src/lib/daily-plan/sequencer.ts:127-133`

**Verification:**
- ✅ Only updates `time_blocks.status` to 'completed'
- ✅ Uses `updateTimeBlock()` which updates the database
- ✅ No separate index field updated
- ✅ Sequence advances automatically on next `getCurrentBlock()` call

**Code:**
```typescript
export async function markBlockComplete(
  supabase: AnySupabaseClient,
  blockId: string
): Promise<TimeBlock> {
  return await updateTimeBlock(supabase, blockId, {
    status: 'completed',
  });
}
```

**Requirements Met:** 9.3 ✅

---

### 4. Database Schema Verification ✅

**Location:** `supabase/migrations/20250118000000_daily_plan_generator_v1.sql`

**Verification:**
- ✅ No `current_index` column in `daily_plans` table
- ✅ No `current_index` column in `time_blocks` table
- ✅ Only `sequence_order` exists (for ordering blocks)
- ✅ `status` column exists with CHECK constraint

**Schema:**
```sql
CREATE TABLE daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_date DATE NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  sleep_time TIMESTAMPTZ NOT NULL,
  energy_state TEXT NOT NULL CHECK (energy_state IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'completed')),
  -- NO current_index field ✅
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES daily_plans(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  activity_type TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  activity_id UUID,
  is_fixed BOOLEAN DEFAULT FALSE,
  sequence_order INTEGER NOT NULL, -- For ordering only ✅
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')), -- Source of truth ✅
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Requirements Met:** 9.4 ✅

---

### 5. TypeScript Interface Verification ✅

**Location:** `src/types/daily-plan.ts`

**Verification:**
- ✅ No `currentIndex` field in `DailyPlan` interface
- ✅ No `currentIndex` field in `TimeBlock` interface
- ✅ Only `status` field exists for tracking block state

**Interfaces:**
```typescript
export interface DailyPlan {
  id: string;
  userId: string;
  planDate: Date;
  wakeTime: Date;
  sleepTime: Date;
  energyState: EnergyState;
  status: PlanStatus;
  generatedAt: Date;
  generatedAfterNow: boolean;
  planStart: Date;
  createdAt: Date;
  updatedAt: Date;
  timeBlocks?: TimeBlock[];
  exitTimes?: ExitTime[];
  // NO currentIndex field ✅
}

export interface TimeBlock {
  id: string;
  planId: string;
  startTime: Date;
  endTime: Date;
  activityType: ActivityType;
  activityName: string;
  activityId?: string;
  isFixed: boolean;
  sequenceOrder: number; // For ordering only ✅
  status: BlockStatus; // Source of truth ✅
  skipReason?: string;
  createdAt: Date;
  updatedAt: Date;
  // NO currentIndex field ✅
}
```

**Requirements Met:** 9.5 ✅

---

### 6. API Endpoint Verification ✅

**Location:** `src/pages/api/daily-plan/[id]/activity/[activityId].ts`

**Verification:**
- ✅ Uses `markBlockComplete()` for completed status
- ✅ Uses `markBlockSkipped()` for skipped status
- ✅ No separate index manipulation
- ✅ Sequence advances automatically

**Code:**
```typescript
if (body.status === 'completed') {
  updatedActivity = await markBlockComplete(supabase, activityId);
} else {
  const skipReason = body.skipReason || 'Skipped by user';
  updatedActivity = await markBlockSkipped(supabase, activityId, skipReason);
}
```

---

### 7. Database Query Verification ✅

**Location:** `src/lib/daily-plan/database.ts`

**Verification:**
- ✅ `getTimeBlocksByPlan()` orders by `sequence_order`
- ✅ No queries filter or update by `current_index`
- ✅ All queries use standard CRUD operations

**Code:**
```typescript
export async function getTimeBlocksByPlan(
  supabase: AnySupabaseClient,
  planId: string
): Promise<TimeBlock[]> {
  const { data, error } = await supabase
    .from('time_blocks')
    .select()
    .eq('plan_id', planId)
    .order('sequence_order', { ascending: true }); // Orders by sequence_order ✅

  if (error) throw error;
  return data.map(rowToTimeBlock);
}
```

---

## Conclusion

### ✅ All Requirements Met

| Requirement | Status | Details |
|-------------|--------|---------|
| 9.1 | ✅ PASS | `getCurrentBlock()` queries `time_blocks.status` |
| 9.2 | ✅ PASS | `getNextBlocks()` queries `time_blocks.status` |
| 9.3 | ✅ PASS | `markBlockComplete()` only updates `time_blocks.status` |
| 9.4 | ✅ PASS | No `current_index` in database schema or TypeScript interfaces |
| 9.5 | ✅ PASS | Sequence derived from `time_blocks.status` in real-time |

### No Action Required

The sequencer implementation is **correct and complete**. No separate index tracking exists. The system derives sequence state from `time_blocks.status` as designed.

### Design Notes

1. **Local Variable vs Persisted Field:** The variable name `currentIndex` appears in `getNextBlocks()` but is only a local variable for iteration. It is NOT stored in the database.

2. **sequence_order vs status:** 
   - `sequence_order`: Defines the order of blocks (immutable after creation)
   - `status`: Defines the current state of each block (mutable: pending → completed/skipped)
   - The sequencer uses BOTH: orders by `sequence_order`, filters by `status`

3. **Automatic Advancement:** When a block is marked complete/skipped, the next call to `getCurrentBlock()` automatically returns the next pending block. No manual index increment needed.

### Test Coverage

The sequencer has comprehensive unit tests in `src/test/unit/sequencer.test.ts` that verify:
- ✅ `getCurrentBlock()` returns first pending block
- ✅ `getNextBlocks()` returns next n pending blocks
- ✅ `markBlockComplete()` updates status
- ✅ Sequence advances automatically after completion

---

**Audit Status:** ✅ COMPLETE  
**Action Required:** None - Task 8.2 is NOT needed
