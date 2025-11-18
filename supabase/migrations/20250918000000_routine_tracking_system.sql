-- Routine Tracking System Migration
-- Adds tables for routine management, personal care tracking, and substance use monitoring

-- Create routines table
CREATE TABLE IF NOT EXISTS uk_student_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  routine_type TEXT NOT NULL CHECK (routine_type IN ('morning', 'evening', 'skincare', 'laundry', 'gym', 'study')),
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  estimated_duration INTEGER NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  last_completed TIMESTAMPTZ,
  completion_streak INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, routine_type, name)
);

-- Create routine completions table
CREATE TABLE IF NOT EXISTS uk_student_routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES uk_student_routines(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  steps_completed TEXT[] NOT NULL DEFAULT '{}',
  total_duration INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create routine misses table for tracking missed activities
CREATE TABLE IF NOT EXISTS uk_student_routine_misses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  routine_id UUID REFERENCES uk_student_routines(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create substance use tracking table
CREATE TABLE IF NOT EXISTS uk_student_substance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  substance_type TEXT NOT NULL CHECK (substance_type IN ('vaping', 'smoking')),
  count INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create substance use reduction goals table
CREATE TABLE IF NOT EXISTS uk_student_substance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  substance_type TEXT NOT NULL CHECK (substance_type IN ('vaping', 'smoking')),
  target_reduction INTEGER NOT NULL DEFAULT 50,
  timeframe_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_uk_student_routines_user_id ON uk_student_routines(user_id);
CREATE INDEX idx_uk_student_routines_type ON uk_student_routines(routine_type);
CREATE INDEX idx_uk_student_routine_completions_user_id ON uk_student_routine_completions(user_id);
CREATE INDEX idx_uk_student_routine_completions_routine_id ON uk_student_routine_completions(routine_id);
CREATE INDEX idx_uk_student_routine_completions_date ON uk_student_routine_completions(completed_at);
CREATE INDEX idx_uk_student_routine_misses_user_id ON uk_student_routine_misses(user_id);
CREATE INDEX idx_uk_student_routine_misses_routine_id ON uk_student_routine_misses(routine_id);
CREATE INDEX idx_uk_student_substance_tracking_user_id ON uk_student_substance_tracking(user_id);
CREATE INDEX idx_uk_student_substance_tracking_date ON uk_student_substance_tracking(tracked_at);
CREATE INDEX idx_uk_student_substance_goals_user_id ON uk_student_substance_goals(user_id);

-- Enable RLS
ALTER TABLE uk_student_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_routine_misses ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_substance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_substance_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own routines"
  ON uk_student_routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routines"
  ON uk_student_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines"
  ON uk_student_routines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines"
  ON uk_student_routines FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own routine completions"
  ON uk_student_routine_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routine completions"
  ON uk_student_routine_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own routine misses"
  ON uk_student_routine_misses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routine misses"
  ON uk_student_routine_misses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own substance tracking"
  ON uk_student_substance_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own substance tracking"
  ON uk_student_substance_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own substance goals"
  ON uk_student_substance_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own substance goals"
  ON uk_student_substance_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own substance goals"
  ON uk_student_substance_goals FOR UPDATE
  USING (auth.uid() = user_id);
