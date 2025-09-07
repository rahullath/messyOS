-- Habits Enhancement Migration
-- Add missing fields to support the new habit creation modal

-- First, ensure the habits table exists with basic structure
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Health',
    type TEXT DEFAULT 'build' CHECK (type IN ('build', 'break', 'maintain')),
    target_value INTEGER,
    target_unit TEXT,
    color TEXT DEFAULT '#3B82F6',
    streak_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to habits table
DO $$ 
BEGIN
    -- Add measurement_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habits' AND column_name = 'measurement_type') THEN
        ALTER TABLE habits ADD COLUMN measurement_type TEXT DEFAULT 'boolean' 
        CHECK (measurement_type IN ('boolean', 'count', 'duration'));
    END IF;

    -- Add allows_skips column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habits' AND column_name = 'allows_skips') THEN
        ALTER TABLE habits ADD COLUMN allows_skips BOOLEAN DEFAULT false;
    END IF;

    -- Add reminder_time column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habits' AND column_name = 'reminder_time') THEN
        ALTER TABLE habits ADD COLUMN reminder_time TIME;
    END IF;

    -- Add position column for ordering
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habits' AND column_name = 'position') THEN
        ALTER TABLE habits ADD COLUMN position INTEGER DEFAULT 0;
    END IF;

    -- Add best_streak column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habits' AND column_name = 'best_streak') THEN
        ALTER TABLE habits ADD COLUMN best_streak INTEGER DEFAULT 0;
    END IF;

    -- Update existing habits to have proper position values
    UPDATE habits SET position = 
        (SELECT ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at))
    WHERE position = 0 OR position IS NULL;

END $$;

-- Ensure habit_entries table exists with basic structure
CREATE TABLE IF NOT EXISTS habit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    value INTEGER DEFAULT 1,
    notes TEXT,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to habit_entries table for enhanced logging
DO $$ 
BEGIN
    -- Add date column for proper date tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'date') THEN
        ALTER TABLE habit_entries ADD COLUMN date DATE DEFAULT CURRENT_DATE;
    END IF;

    -- Add effort column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'effort') THEN
        ALTER TABLE habit_entries ADD COLUMN effort INTEGER CHECK (effort >= 1 AND effort <= 5);
    END IF;

    -- Add energy_level column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'energy_level') THEN
        ALTER TABLE habit_entries ADD COLUMN energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5);
    END IF;

    -- Add mood column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'mood') THEN
        ALTER TABLE habit_entries ADD COLUMN mood INTEGER CHECK (mood >= 1 AND mood <= 5);
    END IF;

    -- Add location column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'location') THEN
        ALTER TABLE habit_entries ADD COLUMN location TEXT;
    END IF;

    -- Add weather column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'weather') THEN
        ALTER TABLE habit_entries ADD COLUMN weather TEXT;
    END IF;

    -- Add context_tags column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'context_tags') THEN
        ALTER TABLE habit_entries ADD COLUMN context_tags TEXT[];
    END IF;

    -- Add duration_minutes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'duration_minutes') THEN
        ALTER TABLE habit_entries ADD COLUMN duration_minutes INTEGER;
    END IF;

    -- Add completion_time column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'completion_time') THEN
        ALTER TABLE habit_entries ADD COLUMN completion_time TIME;
    END IF;

    -- Update existing entries to have proper date values
    UPDATE habit_entries SET date = logged_at::date 
    WHERE date IS NULL AND logged_at IS NOT NULL;

END $$;

-- Create habit templates table
CREATE TABLE IF NOT EXISTS habit_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('build', 'break', 'maintain')),
    measurement_type TEXT NOT NULL CHECK (measurement_type IN ('boolean', 'count', 'duration')),
    description TEXT,
    suggested_target INTEGER,
    target_unit TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_popular BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert popular habit templates
INSERT INTO habit_templates (name, category, type, measurement_type, description, suggested_target, target_unit, color, is_popular) VALUES
('Exercise', 'Health', 'build', 'duration', 'Daily physical activity to stay healthy', 30, 'minutes', '#10B981', true),
('Meditation', 'Wellness', 'build', 'duration', 'Mindfulness practice for mental clarity', 10, 'minutes', '#8B5CF6', true),
('Reading', 'Learning', 'build', 'duration', 'Daily reading for personal growth', 30, 'minutes', '#3B82F6', true),
('Drink Water', 'Health', 'build', 'count', 'Stay hydrated throughout the day', 8, 'glasses', '#06B6D4', true),
('Journaling', 'Wellness', 'build', 'boolean', 'Daily reflection and gratitude practice', NULL, NULL, '#F59E0B', true),
('Limit Social Media', 'Productivity', 'break', 'duration', 'Reduce time spent on social media', 60, 'minutes', '#EF4444', true),
('Sleep 8 Hours', 'Health', 'maintain', 'duration', 'Maintain consistent sleep schedule', 8, 'hours', '#6366F1', true),
('Daily Walk', 'Health', 'build', 'boolean', 'Take a walk outside for fresh air', NULL, NULL, '#059669', true);
-- Note: ON CONFLICT removed as name column doesn't have unique constraint

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habits_user_position ON habits(user_id, position) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_date ON habit_entries(user_id, logged_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date ON habit_entries(habit_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_templates_popular ON habit_templates(is_popular) WHERE is_popular = true;

-- Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can only access their own habits" ON habits;
CREATE POLICY "Users can only access their own habits" ON habits
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can only access their own habit entries" ON habit_entries;
CREATE POLICY "Users can only access their own habit entries" ON habit_entries
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Anyone can view habit templates" ON habit_templates;
CREATE POLICY "Anyone can view habit templates" ON habit_templates
  FOR SELECT USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS habits_updated_at ON habits;
CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT ALL ON habits TO authenticated;
GRANT ALL ON habit_entries TO authenticated;
GRANT SELECT ON habit_templates TO authenticated;