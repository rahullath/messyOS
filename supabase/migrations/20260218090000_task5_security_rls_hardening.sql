-- Task 5: Security + RLS hardening for daily plan and habits flows.
-- Additive migration: policy normalization only.

-- Ensure RLS is enabled for scoped tables.
ALTER TABLE IF EXISTS public.daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exit_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.habit_entries ENABLE ROW LEVEL SECURITY;

-- ---------------------------
-- daily_plans
-- ---------------------------
DROP POLICY IF EXISTS "Users can manage their own daily plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Users can insert their own daily plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Users can select their own daily plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Users can update their own daily plans" ON public.daily_plans;
DROP POLICY IF EXISTS "Users can delete their own daily plans" ON public.daily_plans;

CREATE POLICY "Users can insert their own daily plans"
ON public.daily_plans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own daily plans"
ON public.daily_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily plans"
ON public.daily_plans
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily plans"
ON public.daily_plans
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ---------------------------
-- time_blocks
-- ---------------------------
DROP POLICY IF EXISTS "Users can insert time blocks for their plans" ON public.time_blocks;
DROP POLICY IF EXISTS "Users can select time blocks for their plans" ON public.time_blocks;
DROP POLICY IF EXISTS "Users can update time blocks for their plans" ON public.time_blocks;
DROP POLICY IF EXISTS "Users can delete time blocks for their plans" ON public.time_blocks;

CREATE POLICY "Users can insert time blocks for their plans"
ON public.time_blocks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
      AND daily_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can select time blocks for their plans"
ON public.time_blocks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
      AND daily_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update time blocks for their plans"
ON public.time_blocks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
      AND daily_plans.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
      AND daily_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete time blocks for their plans"
ON public.time_blocks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
      AND daily_plans.user_id = auth.uid()
  )
);

-- ---------------------------
-- exit_times
-- ---------------------------
DROP POLICY IF EXISTS "Users can insert exit times for their plans" ON public.exit_times;
DROP POLICY IF EXISTS "Users can select exit times for their plans" ON public.exit_times;
DROP POLICY IF EXISTS "Users can delete exit times for their plans" ON public.exit_times;
DROP POLICY IF EXISTS "Users can update exit times for their plans" ON public.exit_times;

CREATE POLICY "Users can insert exit times for their plans"
ON public.exit_times
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.daily_plans
    WHERE daily_plans.id = exit_times.plan_id
      AND daily_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can select exit times for their plans"
ON public.exit_times
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_plans
    WHERE daily_plans.id = exit_times.plan_id
      AND daily_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete exit times for their plans"
ON public.exit_times
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_plans
    WHERE daily_plans.id = exit_times.plan_id
      AND daily_plans.user_id = auth.uid()
  )
);

-- ---------------------------
-- habits
-- ---------------------------
DROP POLICY IF EXISTS "Users can only access their own habits" ON public.habits;
CREATE POLICY "Users can only access their own habits"
ON public.habits
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ---------------------------
-- habit_entries
-- ---------------------------
DROP POLICY IF EXISTS "Users can only access their own habit entries" ON public.habit_entries;
CREATE POLICY "Users can only access their own habit entries"
ON public.habit_entries
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
