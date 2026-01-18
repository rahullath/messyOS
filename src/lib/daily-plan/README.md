# Daily Plan Generator V1 - Database Layer

This directory contains the database schema and utilities for the Daily Plan Generator V1 (Spine Only).

## Files Created

### 1. Migration File
- **Location**: `supabase/migrations/20250118000000_daily_plan_generator_v1.sql`
- **Purpose**: Creates the database schema for daily plans, time blocks, and exit times
- **Tables**:
  - `daily_plans`: Main plan records with wake/sleep times and energy state
  - `time_blocks`: Individual activities in the plan (commitments, tasks, routines, meals, buffers, travel)
  - `exit_times`: Exit time calculations for commitments with travel information

### 2. TypeScript Types
- **Location**: `src/types/daily-plan.ts`
- **Purpose**: Type definitions for all daily plan entities
- **Exports**:
  - `DailyPlan`, `TimeBlock`, `ExitTime` - Application types (camelCase)
  - `DailyPlanRow`, `TimeBlockRow`, `ExitTimeRow` - Database row types (snake_case)
  - `CreateDailyPlan`, `CreateTimeBlock`, `CreateExitTime` - Types for creating new records
  - `UpdateDailyPlan`, `UpdateTimeBlock` - Types for updating records
  - Type enums: `EnergyState`, `PlanStatus`, `ActivityType`, `BlockStatus`, `TravelMethod`

### 3. Database Utilities
- **Location**: `src/lib/daily-plan/database.ts`
- **Purpose**: CRUD operations for all daily plan entities
- **Functions**:
  - Daily Plan: `createDailyPlan`, `getDailyPlan`, `getDailyPlanByDate`, `updateDailyPlan`, `deleteDailyPlan`
  - Time Blocks: `createTimeBlock`, `createTimeBlocks`, `getTimeBlock`, `getTimeBlocksByPlan`, `updateTimeBlock`, `deleteTimeBlock`, `deleteTimeBlocksByPlan`
  - Exit Times: `createExitTime`, `createExitTimes`, `getExitTime`, `getExitTimesByPlan`, `deleteExitTime`, `deleteExitTimesByPlan` (Note: exit_times are immutable - no update functions)
  - Composite: `getDailyPlanWithBlocks`, `getDailyPlanByDateWithBlocks`

### 4. Index File
- **Location**: `src/lib/daily-plan/index.ts`
- **Purpose**: Main export point for the daily plan module

## Database Schema

### daily_plans
- Stores the main plan record for each day
- One plan per user per date (enforced by unique constraint)
- Tracks energy state (low/medium/high) and plan status (active/degraded/completed)

### time_blocks
- Stores individual activities in the plan
- Ordered by `sequence_order` field
- Supports multiple activity types: commitment, task, routine, meal, buffer, travel
- Tracks completion status: pending, completed, skipped

### exit_times
- Stores calculated exit times for commitments
- Links to both the plan and the specific time block
- Includes travel duration, preparation time, and travel method
- **Immutable**: Exit times should be deleted and recreated rather than updated

## Data Integrity Constraints

The schema includes several constraints to prevent invalid data:

1. **Time Validation**:
   - `daily_plans`: `sleep_time` must be after `wake_time`
   - `time_blocks`: `end_time` must be after `start_time`

2. **Enum Constraints**:
   - `energy_state`: Must be 'low', 'medium', or 'high'
   - `plan_status`: Must be 'active', 'degraded', or 'completed'
   - `activity_type`: Must be 'commitment', 'task', 'routine', 'meal', 'buffer', or 'travel'
   - `block_status`: Must be 'pending', 'completed', or 'skipped'
   - `travel_method`: Must be 'bike', 'train', 'walk', or 'bus'

3. **Uniqueness**:
   - One plan per user per date (enforced by unique constraint on `user_id` + `plan_date`)

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own plans
- Users can only modify time blocks and exit times for their own plans
- All operations (SELECT, INSERT, UPDATE, DELETE) are protected
- UPDATE policies include both USING and WITH CHECK clauses to prevent unauthorized modifications
- Exit times are immutable (no UPDATE policy - delete and recreate instead)

## Usage Example

```typescript
import { createClient } from '@supabase/supabase-js';
import { 
  createDailyPlan, 
  createTimeBlocks, 
  getDailyPlanByDateWithBlocks 
} from './lib/daily-plan';

const supabase = createClient(url, key);

// Create a new plan
const plan = await createDailyPlan(supabase, {
  user_id: userId,
  plan_date: '2026-01-18',
  wake_time: '2026-01-18T07:00:00Z',
  sleep_time: '2026-01-18T23:00:00Z',
  energy_state: 'medium',
  status: 'active'
});

// Add time blocks
const blocks = await createTimeBlocks(supabase, [
  {
    plan_id: plan.id,
    start_time: '2026-01-18T07:00:00Z',
    end_time: '2026-01-18T07:30:00Z',
    activity_type: 'routine',
    activity_name: 'Morning Routine',
    is_fixed: false,
    sequence_order: 1,
    status: 'pending'
  },
  // ... more blocks
]);

// Fetch complete plan with all blocks
const completePlan = await getDailyPlanByDateWithBlocks(
  supabase, 
  userId, 
  new Date('2026-01-18')
);
```

## Next Steps

After this task is complete, the next tasks will implement:
1. Exit Time Calculator (using travel service)
2. Plan Builder service (core logic)
3. Sequencer service (derive from time_blocks)
4. Plan Degradation
5. API endpoints
6. UI components

## Notes

- The migration drops the existing `daily_plans` table from the intelligent task management system
- The V1 schema is simpler and focused on the spine functionality
- Type assertions (`as any`) are used in database.ts to work with the current Supabase types until the migration is applied
- Exit times are immutable - to modify an exit time, delete and recreate it (this simplifies the logic and prevents tracking issues)
- The trigger function is namespaced as `daily_plan_update_updated_at_column()` to avoid collisions with other modules
- Time validation constraints prevent invalid time ranges (end before start, sleep before wake)
- Travel method is constrained to valid values: 'bike', 'train', 'walk', 'bus'
