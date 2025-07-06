-- Enhanced Tasks Schema for MeshOS
-- Run this in your Supabase SQL editor

-- Tasks table with comprehensive tracking
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic task info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  
  -- Priority and status
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled', 'on_hold')) DEFAULT 'todo',
  
  -- Time management
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes
  due_date TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Context and mood tracking
  energy_required TEXT CHECK (energy_required IN ('low', 'medium', 'high')) DEFAULT 'medium',
  complexity TEXT CHECK (complexity IN ('simple', 'moderate', 'complex')) DEFAULT 'moderate',
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  
  -- Location and context
  location TEXT,
  context JSONB DEFAULT '[]', -- ['focused', 'collaborative', 'creative', 'routine']
  tags JSONB DEFAULT '[]',
  
  -- Productivity tracking
  interruptions INTEGER DEFAULT 0,
  focus_score INTEGER CHECK (focus_score >= 1 AND focus_score <= 10),
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 10),
  
  -- AI and automation
  ai_suggestions JSONB DEFAULT '{}',
  auto_scheduled BOOLEAN DEFAULT false,
  recurring_pattern TEXT, -- 'daily', 'weekly', 'monthly', etc.
  parent_task_id UUID REFERENCES tasks(id),
  
  -- Reminders and notifications
  reminder_times JSONB DEFAULT '[]', -- Array of timestamps
  email_reminders BOOLEAN DEFAULT false,
  
  -- Notes and reflection
  notes TEXT,
  completion_notes TEXT,
  lessons_learned TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task time sessions (for detailed time tracking)
CREATE TABLE IF NOT EXISTS task_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- in seconds
  
  -- Session context
  session_type TEXT CHECK (session_type IN ('focus', 'break', 'review', 'planning')) DEFAULT 'focus',
  interruptions INTEGER DEFAULT 0,
  notes TEXT,
  
  -- Productivity metrics
  productivity_score INTEGER CHECK (productivity_score >= 1 AND productivity_score <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT CHECK (dependency_type IN ('blocks', 'enables', 'related')) DEFAULT 'blocks',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(task_id, depends_on_task_id)
);

-- Task templates for recurring tasks
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  title_template TEXT NOT NULL,
  description_template TEXT,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  estimated_duration INTEGER,
  energy_required TEXT DEFAULT 'medium',
  complexity TEXT DEFAULT 'moderate',
  
  -- Template settings
  default_context JSONB DEFAULT '[]',
  default_tags JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_task_sessions_task_id ON task_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_sessions_user_date ON task_sessions(user_id, DATE(started_at));

-- RLS Policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Task sessions policies
CREATE POLICY "Users can view own task sessions" ON task_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task sessions" ON task_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own task sessions" ON task_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task sessions" ON task_sessions FOR DELETE USING (auth.uid() = user_id);

-- Task dependencies policies
CREATE POLICY "Users can view own task dependencies" ON task_dependencies FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own task dependencies" ON task_dependencies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own task dependencies" ON task_dependencies FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own task dependencies" ON task_dependencies FOR DELETE USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND user_id = auth.uid())
);

-- Task templates policies
CREATE POLICY "Users can view own task templates" ON task_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task templates" ON task_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own task templates" ON task_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task templates" ON task_templates FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_updated_at();

-- Function to calculate task session duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_task_session_duration
  BEFORE INSERT OR UPDATE ON task_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();