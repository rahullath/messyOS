-- Simple Tasks Schema for MeshOS
-- Run this in your Supabase SQL editor

-- Drop existing tables if they exist (be careful with this in production)
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS task_sessions CASCADE;
DROP TABLE IF EXISTS task_templates CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- Tasks table with essential fields
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic task info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  
  -- Priority and status
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'completed', 'on_hold')) DEFAULT 'todo',
  
  -- Time management
  estimated_duration INTEGER, -- in minutes
  due_date TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Context and energy
  energy_required TEXT CHECK (energy_required IN ('low', 'medium', 'high')) DEFAULT 'medium',
  complexity TEXT CHECK (complexity IN ('simple', 'moderate', 'complex')) DEFAULT 'moderate',
  
  -- Location and context
  location TEXT,
  context JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  
  -- Reminders
  email_reminders BOOLEAN DEFAULT false,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task time sessions (for time tracking)
CREATE TABLE task_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- in seconds
  
  -- Session context
  session_type TEXT CHECK (session_type IN ('work', 'break', 'review', 'planning')) DEFAULT 'work',
  notes TEXT,
  
  -- Productivity metrics
  productivity_score INTEGER CHECK (productivity_score >= 1 AND productivity_score <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  mood TEXT,
  context TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simple indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_task_sessions_task_id ON task_sessions(task_id);
CREATE INDEX idx_task_sessions_user_id ON task_sessions(user_id);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view own tasks" ON tasks 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for task_sessions
CREATE POLICY "Users can view own task sessions" ON task_sessions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task sessions" ON task_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task sessions" ON task_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own task sessions" ON task_sessions 
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically calculate duration
CREATE TRIGGER calculate_task_session_duration
  BEFORE INSERT OR UPDATE ON task_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();

-- Insert some sample data for testing (optional)
-- INSERT INTO tasks (user_id, title, description, category, priority, due_date) VALUES
-- (auth.uid(), 'Sample Task', 'This is a sample task for testing', 'Work', 'medium', NOW() + INTERVAL '1 day');