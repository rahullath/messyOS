-- Daily Plan Generator V1 Schema
-- This migration adds the spine V1 structure for the daily plan generator

-- Drop existing daily_plans table if it exists (from intelligent task management)
-- We'll recreate it with the V1 structure
DROP TABLE IF EXISTS daily_plans CASCADE;

-- Daily plans table (V1 structure)
CREATE TABLE daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_date DATE NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  sleep_time TIMESTAMPTZ NOT NULL,
  energy_state TEXT NOT NULL CHECK (energy_state IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_date),
  CONSTRAINT daily_plans_valid_time CHECK (sleep_time > wake_time)
);

-- Time blocks table
CREATE TABLE time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES daily_plans(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('commitment', 'task', 'routine', 'meal', 'buffer', 'travel')),
  activity_name TEXT NOT NULL,
  activity_id UUID, -- Reference to the actual task/commitment/routine
  is_fixed BOOLEAN DEFAULT FALSE,
  sequence_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT time_blocks_valid_time CHECK (end_time > start_time)
);

-- Exit times table (immutable - delete and recreate instead of updating)
CREATE TABLE exit_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES daily_plans(id) ON DELETE CASCADE NOT NULL,
  time_block_id UUID REFERENCES time_blocks(id) ON DELETE CASCADE NOT NULL,
  commitment_id UUID NOT NULL,
  exit_time TIMESTAMPTZ NOT NULL,
  travel_duration INTEGER NOT NULL, -- minutes
  preparation_time INTEGER NOT NULL, -- minutes
  travel_method TEXT NOT NULL CHECK (travel_method IN ('bike', 'train', 'walk', 'bus')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, plan_date);
CREATE INDEX idx_daily_plans_status ON daily_plans(status);
CREATE INDEX idx_time_blocks_plan ON time_blocks(plan_id);
CREATE INDEX idx_time_blocks_sequence ON time_blocks(plan_id, sequence_order);
CREATE INDEX idx_time_blocks_status ON time_blocks(status);
CREATE INDEX idx_exit_times_plan ON exit_times(plan_id);
CREATE INDEX idx_exit_times_time_block ON exit_times(time_block_id);

-- Enable Row Level Security
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_times ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_plans
CREATE POLICY "Users can insert their own daily plans"
ON daily_plans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own daily plans"
ON daily_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily plans"
ON daily_plans
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily plans"
ON daily_plans
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for time_blocks
CREATE POLICY "Users can insert time blocks for their plans"
ON time_blocks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
    AND daily_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can select time blocks for their plans"
ON time_blocks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
    AND daily_plans.user_id = auth.uid()
  )
);

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

CREATE POLICY "Users can delete time blocks for their plans"
ON time_blocks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = time_blocks.plan_id
    AND daily_plans.user_id = auth.uid()
  )
);

-- RLS Policies for exit_times (immutable - no UPDATE policy)
CREATE POLICY "Users can insert exit times for their plans"
ON exit_times
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = exit_times.plan_id
    AND daily_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can select exit times for their plans"
ON exit_times
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = exit_times.plan_id
    AND daily_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete exit times for their plans"
ON exit_times
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM daily_plans
    WHERE daily_plans.id = exit_times.plan_id
    AND daily_plans.user_id = auth.uid()
  )
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION daily_plan_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_plans_updated_at
BEFORE UPDATE ON daily_plans
FOR EACH ROW
EXECUTE FUNCTION daily_plan_update_updated_at_column();

CREATE TRIGGER update_time_blocks_updated_at
BEFORE UPDATE ON time_blocks
FOR EACH ROW
EXECUTE FUNCTION daily_plan_update_updated_at_column();
