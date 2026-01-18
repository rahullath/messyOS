# Migration Guide: Applying Schema Improvements

## If You Already Ran the Old Migration

If you already ran `20250118000000_daily_plan_generator_v1.sql`, you have two options:

### Option 1: Apply Improvements Migration (Recommended)

Run the new improvements-only migration:

```bash
# Local development
npx supabase migration up

# Or apply to remote
npx supabase db push
```

This will apply `20250118000001_daily_plan_improvements.sql` which adds:
- Time validation constraints
- Travel method CHECK constraint
- WITH CHECK clauses to UPDATE policies
- Removes UPDATE policy for exit_times (making them immutable)
- Namespaced trigger function

### Option 2: Reset and Rerun (Clean Slate)

If you're in early development with no important data:

```bash
# Reset local database
npx supabase db reset

# This will rerun all migrations including the updated one
```

## If You Haven't Run Any Migrations Yet

Just run the migrations normally:

```bash
npx supabase migration up
```

The main migration file (`20250118000000_daily_plan_generator_v1.sql`) already includes all improvements.

## Verifying the Migration

After running the migration, verify the improvements were applied:

```sql
-- Check constraints exist
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid IN (
  'daily_plans'::regclass,
  'time_blocks'::regclass,
  'exit_times'::regclass
);

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('daily_plans', 'time_blocks', 'exit_times')
ORDER BY tablename, policyname;

-- Check trigger function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'daily_plan_update_updated_at_column';
```

## Expected Results

After migration, you should see:

### Constraints:
- `daily_plans_valid_time` on `daily_plans`
- `time_blocks_valid_time` on `time_blocks`
- `exit_times_valid_travel_method` on `exit_times`

### Policies:
- `daily_plans`: INSERT, SELECT, UPDATE (with WITH CHECK), DELETE
- `time_blocks`: INSERT, SELECT, UPDATE (with WITH CHECK), DELETE
- `exit_times`: INSERT, SELECT, DELETE (no UPDATE - immutable)

### Functions:
- `daily_plan_update_updated_at_column()`

## Troubleshooting

### Error: "constraint already exists"
If you get constraint errors, the constraint might already exist. You can safely ignore these or modify the migration to use `IF NOT EXISTS` (though PostgreSQL doesn't support this for constraints directly).

### Error: "policy already exists"
The migration uses `DROP POLICY IF EXISTS` before creating policies, so this shouldn't happen. If it does, manually drop the policy:

```sql
DROP POLICY "policy_name" ON table_name;
```

Then rerun the migration.

### Error: "function already exists"
The migration uses `CREATE OR REPLACE FUNCTION`, so this shouldn't happen.

## Rolling Back

If you need to roll back the improvements:

```bash
# Create a rollback migration
npx supabase migration new rollback_daily_plan_improvements
```

Then add:

```sql
-- Remove constraints
ALTER TABLE daily_plans DROP CONSTRAINT IF EXISTS daily_plans_valid_time;
ALTER TABLE time_blocks DROP CONSTRAINT IF EXISTS time_blocks_valid_time;
ALTER TABLE exit_times DROP CONSTRAINT IF EXISTS exit_times_valid_travel_method;

-- Restore old policies (without WITH CHECK)
DROP POLICY IF EXISTS "Users can update their own daily plans" ON daily_plans;
CREATE POLICY "Users can update their own daily plans"
ON daily_plans FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update time blocks for their plans" ON time_blocks;
CREATE POLICY "Users can update time blocks for their plans"
ON time_blocks FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM daily_plans WHERE daily_plans.id = time_blocks.plan_id AND daily_plans.user_id = auth.uid()));

-- Restore UPDATE policy for exit_times
CREATE POLICY "Users can update exit times for their plans"
ON exit_times FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM daily_plans WHERE daily_plans.id = exit_times.plan_id AND daily_plans.user_id = auth.uid()));
```
