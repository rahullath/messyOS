-- Apply task management migration directly
-- This is a simplified version that should work with the existing database

-- Custom ENUM types for task management
DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'deferred');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_complexity AS ENUM ('simple', 'moderate', 'complex');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE energy_level AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'completed', 'partial', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE goal_category AS ENUM ('career', 'health', 'creative', 'financial', 'social', 'personal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Core tasks table with comprehensive metadata
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  complexity task_complexity NOT NULL DEFAULT 'moderate',
  energy_required energy_level NOT NULL DEFAULT 'medium',
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER, -- minutes
  deadline TIMESTAMP WITH TIME ZONE,
  created_from TEXT DEFAULT 'manual', -- 'manual', 'ai', 'email', 'conversation'
  parent_task_id UUID REFERENCES tasks(id),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_duration CHECK (estimated_duration IS NULL OR estimated_duration > 0),
  CONSTRAINT valid_actual_duration CHECK (actual_duration IS NULL OR actual_duration > 0),
  CONSTRAINT valid_position CHECK (position >= 0)
);

-- Time tracking sessions
CREATE TABLE IF NOT EXISTS time_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 10),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  distractions TEXT[],
  notes TEXT,
  completion_status session_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_session_duration CHECK (
    (end_time IS NULL AND completion_status = 'active') OR 
    (end_time IS NOT NULL AND end_time > start_time)
  )
);

-- Goals and milestones
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category goal_category NOT NULL,
  timeframe TEXT,
  measurable_outcomes TEXT[],
  success_metrics JSONB,
  status goal_status NOT NULL DEFAULT 'active',
  created_from TEXT DEFAULT 'manual',
  target_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date TIMESTAMP WITH TIME ZONE,
  completion_criteria TEXT,
  is_achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(user_id, category);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_time_sessions_user_task ON time_sessions(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_user_date ON time_sessions(user_id, DATE(start_time));
CREATE INDEX IF NOT EXISTS idx_time_sessions_status ON time_sessions(user_id, completion_status);

CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(user_id, category);
CREATE INDEX IF NOT EXISTS idx_milestones_goal ON milestones(goal_id);

-- Row Level Security (RLS) policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
DO $$ BEGIN
    CREATE POLICY "Users can view their own tasks" ON tasks
      FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own tasks" ON tasks
      FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own tasks" ON tasks
      FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete their own tasks" ON tasks
      FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RLS Policies for time_sessions
DO $$ BEGIN
    CREATE POLICY "Users can manage their own time sessions" ON time_sessions
      FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RLS Policies for goals
DO $$ BEGIN
    CREATE POLICY "Users can manage their own goals" ON goals
      FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RLS Policies for milestones
DO $$ BEGIN
    CREATE POLICY "Users can manage milestones for their goals" ON milestones
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM goals 
          WHERE goals.id = milestones.goal_id 
          AND goals.user_id = auth.uid()
        )
      );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;