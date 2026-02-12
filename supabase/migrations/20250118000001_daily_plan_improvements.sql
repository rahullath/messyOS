-- Daily Plan Generator V1 - Schema Improvements
-- This migration adds improvements to the existing daily plan schema

-- 1. Add time validation constraints
ALTER TABLE daily_plans 
ADD CONSTRAINT daily_plans_valid_time CHECK (sleep_time > wake_time);

ALTER TABLE time_blocks 
ADD CONSTRAINT time_blocks_valid_time CHECK (end_time > start_time);

-- 2. Add CHECK constraint for travel_method
ALTER TABLE exit_times 
ADD CONSTRAINT exit_times_valid_travel_method CHECK (travel_method IN ('bike', 'train', 'walk', 'bus'));

-- 3. Drop the UPDATE policy for exit_times (making them immutable)
DROP POLICY IF EXISTS "Users can update exit times for their plans" ON exit_times;

-- 4. Add WITH CHECK to UPDATE policies for daily_plans
DROP POLICY IF EXISTS "Users can update their own daily plans" ON daily_plans;
CREATE POLICY "Users can update their own daily plans"
ON daily_plans
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Add WITH CHECK to UPDATE policies for time_blocks
DROP POLICY IF EXISTS "Users can update time blocks for their plans" ON time_blocks;
CREATE POLICY "Users can update time blocks for their plans"
ON time_blocks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
    AND daily_plans.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
    AND daily_plans.user_id = auth.uid()
  )
);

-- 6. Create namespaced trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION daily_plan_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Update triggers to use the new function (if they exist)
DROP TRIGGER IF EXISTS update_daily_plans_updated_at ON daily_plans;
CREATE TRIGGER update_daily_plans_updated_at
BEFORE UPDATE ON daily_plans
FOR EACH ROW
EXECUTE FUNCTION daily_plan_update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_blocks_updated_at ON time_blocks;
CREATE TRIGGER update_time_blocks_updated_at
BEFORE UPDATE ON time_blocks
FOR EACH ROW
EXECUTE FUNCTION daily_plan_update_updated_at_column();
