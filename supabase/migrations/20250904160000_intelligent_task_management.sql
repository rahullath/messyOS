-- Intelligent Task Management Database Schema
-- Migration for core task management tables with comprehensive metadata

-- Custom ENUM types for task management
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'deferred');
CREATE TYPE task_complexity AS ENUM ('simple', 'moderate', 'complex');
CREATE TYPE energy_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE calendar_source_type AS ENUM ('google', 'ical', 'outlook', 'manual');
CREATE TYPE event_type AS ENUM ('class', 'meeting', 'personal', 'workout', 'task', 'break', 'meal');
CREATE TYPE flexibility_type AS ENUM ('fixed', 'moveable', 'flexible');
CREATE TYPE importance_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'partial', 'abandoned');
CREATE TYPE goal_category AS ENUM ('career', 'health', 'creative', 'financial', 'social', 'personal');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'cancelled');

-- Core tasks table with comprehensive metadata
CREATE TABLE tasks (
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

-- Calendar sources and events
CREATE TABLE calendar_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type calendar_source_type NOT NULL,
  url TEXT, -- For iCal feeds
  credentials JSONB, -- For OAuth
  sync_frequency INTEGER DEFAULT 60, -- minutes
  color TEXT DEFAULT '#3B82F6',
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_sync_frequency CHECK (sync_frequency > 0),
  CONSTRAINT valid_priority CHECK (priority > 0)
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES calendar_sources(id) ON DELETE CASCADE,
  external_id TEXT, -- ID from source system
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  event_type event_type NOT NULL DEFAULT 'personal',
  flexibility flexibility_type NOT NULL DEFAULT 'fixed',
  importance importance_level NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Time tracking sessions
CREATE TABLE time_sessions (
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
CREATE TABLE goals (
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

CREATE TABLE milestones (
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

-- AI-generated insights and plans
CREATE TABLE daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  energy_forecast JSONB,
  scheduled_blocks JSONB,
  prioritized_tasks JSONB,
  personal_development JSONB,
  balance_score DECIMAL(3,2),
  recommendations TEXT[],
  ai_confidence DECIMAL(3,2),
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_date)
);

CREATE TABLE life_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  optimization_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact_area TEXT[],
  confidence DECIMAL(3,2),
  implementation_difficulty TEXT,
  expected_benefit TEXT,
  is_implemented BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Energy patterns and user preferences
CREATE TABLE energy_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  time_of_day TIME NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0-6, null for all days
  average_energy DECIMAL(3,2),
  confidence DECIMAL(3,2),
  sample_size INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal query performance
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_category ON tasks(user_id, category);
CREATE INDEX idx_tasks_created_at ON tasks(user_id, created_at);

CREATE INDEX idx_calendar_events_user_time ON calendar_events(user_id, start_time, end_time);
CREATE INDEX idx_calendar_events_source ON calendar_events(source_id);
CREATE INDEX idx_calendar_events_type ON calendar_events(user_id, event_type);

CREATE INDEX idx_time_sessions_user_task ON time_sessions(user_id, task_id);
-- Note: Functional index on date removed due to immutability constraints
-- CREATE INDEX idx_time_sessions_user_date ON time_sessions(user_id, DATE(start_time));
CREATE INDEX idx_time_sessions_status ON time_sessions(user_id, completion_status);

CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE INDEX idx_goals_category ON goals(user_id, category);
CREATE INDEX idx_milestones_goal ON milestones(goal_id);

CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, plan_date);
CREATE INDEX idx_energy_patterns_user_time ON energy_patterns(user_id, time_of_day, day_of_week);

-- Row Level Security (RLS) policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for calendar_sources
CREATE POLICY "Users can manage their own calendar sources" ON calendar_sources
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for calendar_events
CREATE POLICY "Users can manage their own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for time_sessions
CREATE POLICY "Users can manage their own time sessions" ON time_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for goals
CREATE POLICY "Users can manage their own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for milestones
CREATE POLICY "Users can manage milestones for their goals" ON milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = milestones.goal_id 
      AND goals.user_id = auth.uid()
    )
  );

-- RLS Policies for daily_plans
CREATE POLICY "Users can manage their own daily plans" ON daily_plans
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for life_optimizations
CREATE POLICY "Users can manage their own life optimizations" ON life_optimizations
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for energy_patterns
CREATE POLICY "Users can manage their own energy patterns" ON energy_patterns
  FOR ALL USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set completed_at when task status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_task_completed_at_trigger BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- Function to calculate actual duration for time sessions
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
        NEW.actual_duration = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_session_duration_trigger BEFORE INSERT OR UPDATE ON time_sessions
    FOR EACH ROW EXECUTE FUNCTION calculate_session_duration();