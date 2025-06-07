-- MeshOS Database Setup
-- Run this in your Supabase SQL Editor to create the basic tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom ENUM types
CREATE TYPE habit_type AS ENUM ('build', 'break');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');

-- Create habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  type habit_type NOT NULL DEFAULT 'build',
  target_value INTEGER DEFAULT 1,
  target_unit TEXT DEFAULT 'times',
  color TEXT DEFAULT '#3b82f6',
  streak_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  measurement_type TEXT DEFAULT 'boolean',
  best_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  position INTEGER,
  CONSTRAINT habits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create habit entries table
CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  value INTEGER DEFAULT 1,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE,
  CONSTRAINT habit_entries_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES habits(id),
  CONSTRAINT habit_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create habit scores table (for Loop Habits compatibility)
CREATE TABLE IF NOT EXISTS habit_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID,
  score NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT habit_scores_habit_id_fkey FOREIGN KEY (habit_id) REFERENCES habits(id)
);

-- Create metrics table (for health, finance, etc.)
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  priority priority_level DEFAULT 'medium',
  status task_status DEFAULT 'todo',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create content entries table
CREATE TABLE IF NOT EXISTS content_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'plan_to_watch',
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  progress TEXT,
  genre TEXT[],
  source TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date ON habit_entries(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_scores_habit_date ON habit_scores(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_metrics_user_type_date ON metrics(user_id, type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

-- Enable Row Level Security (RLS)
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (with IF NOT EXISTS equivalent)
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own habits" ON habits;
DROP POLICY IF EXISTS "Users can insert their own habits" ON habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON habits;

DROP POLICY IF EXISTS "Users can view their own habit entries" ON habit_entries;
DROP POLICY IF EXISTS "Users can insert their own habit entries" ON habit_entries;
DROP POLICY IF EXISTS "Users can update their own habit entries" ON habit_entries;
DROP POLICY IF EXISTS "Users can delete their own habit entries" ON habit_entries;

DROP POLICY IF EXISTS "Users can view their own habit scores" ON habit_scores;
DROP POLICY IF EXISTS "Users can insert their own habit scores" ON habit_scores;

DROP POLICY IF EXISTS "Users can view their own metrics" ON metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON metrics;
DROP POLICY IF EXISTS "Users can delete their own metrics" ON metrics;

DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view their own content entries" ON content_entries;
DROP POLICY IF EXISTS "Users can insert their own content entries" ON content_entries;
DROP POLICY IF EXISTS "Users can update their own content entries" ON content_entries;
DROP POLICY IF EXISTS "Users can delete their own content entries" ON content_entries;

-- Now create the policies
-- Habits policies
CREATE POLICY "Users can view their own habits" ON habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits" ON habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" ON habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" ON habits
  FOR DELETE USING (auth.uid() = user_id);

-- Habit entries policies
CREATE POLICY "Users can view their own habit entries" ON habit_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit entries" ON habit_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit entries" ON habit_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit entries" ON habit_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Habit scores policies
CREATE POLICY "Users can view their own habit scores" ON habit_scores
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM habits WHERE habits.id = habit_scores.habit_id AND habits.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own habit scores" ON habit_scores
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM habits WHERE habits.id = habit_scores.habit_id AND habits.user_id = auth.uid()
  ));

-- Metrics policies
CREATE POLICY "Users can view their own metrics" ON metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics" ON metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics" ON metrics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metrics" ON metrics
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Content entries policies
CREATE POLICY "Users can view their own content entries" ON content_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content entries" ON content_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content entries" ON content_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content entries" ON content_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Insert some sample data for testing (optional)
-- You can uncomment this after you have a user account

/*
-- Sample habits (replace 'your-user-id' with your actual user ID)
INSERT INTO habits (user_id, name, description, category, type, color) VALUES
  ('your-user-id', 'Morning Walk', 'Take a 30-minute walk', 'Fitness', 'build', '#10b981'),
  ('your-user-id', 'No Smoking', 'Avoid smoking cigarettes', 'Health', 'break', '#ef4444'),
  ('your-user-id', 'Drink Water', 'Drink 8 glasses of water', 'Health', 'build', '#3b82f6'),
  ('your-user-id', 'Code Practice', 'Practice coding for 1 hour', 'Productivity', 'build', '#8b5cf6');

-- Sample tasks
INSERT INTO tasks (user_id, title, description, category, priority) VALUES
  ('your-user-id', 'Setup MeshOS Database', 'Create all necessary tables', 'Development', 'high'),
  ('your-user-id', 'Import Loop Habits Data', 'Import existing habit data', 'Data', 'medium');
*/
