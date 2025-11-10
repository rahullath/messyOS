// scripts/update-remote-database.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateDatabase() {
  console.log('🔄 Updating remote database schema...');
  
  try {
    // Check current habits table structure
    console.log('📋 Checking current habits table structure...');
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .limit(1);
    
    if (habitsError) {
      console.error('❌ Error checking habits table:', habitsError);
      return;
    }
    
    console.log('✅ Habits table exists');
    
    // Check if we have the new fields by trying to select them
    const { data: testFields, error: testError } = await supabase
      .from('habits')
      .select('measurement_type, allows_skips, position, best_streak, reminder_time')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  New fields don\'t exist yet, they need to be added');
      console.log('❌ Cannot add columns via Supabase client - need to use SQL editor');
      console.log('');
      console.log('🔧 Please go to your Supabase dashboard SQL editor and run this SQL:');
      console.log('');
      console.log(`-- Add missing columns to habits table
ALTER TABLE habits ADD COLUMN IF NOT EXISTS measurement_type TEXT DEFAULT 'boolean' CHECK (measurement_type IN ('boolean', 'count', 'duration'));
ALTER TABLE habits ADD COLUMN IF NOT EXISTS allows_skips BOOLEAN DEFAULT false;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS reminder_time TIME;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;

-- Update existing habits to have proper position values
UPDATE habits SET position = (SELECT ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)) WHERE position = 0 OR position IS NULL;

-- Add missing columns to habit_entries table
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS effort INTEGER CHECK (effort >= 1 AND effort <= 5);
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5);
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS mood INTEGER CHECK (mood >= 1 AND mood <= 5);
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS weather TEXT;
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS context_tags TEXT[];
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE habit_entries ADD COLUMN IF NOT EXISTS completion_time TIME;

-- Update existing entries to have proper date values
UPDATE habit_entries SET date = logged_at::date WHERE date IS NULL AND logged_at IS NOT NULL;

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
('Daily Walk', 'Health', 'build', 'boolean', 'Take a walk outside for fresh air', NULL, NULL, '#059669', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habits_user_position ON habits(user_id, position) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(habit_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_templates_popular ON habit_templates(is_popular) WHERE is_popular = true;

-- Enable RLS on habit_templates
ALTER TABLE habit_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view habit templates" ON habit_templates FOR SELECT USING (true);
GRANT SELECT ON habit_templates TO authenticated;`);
      
      console.log('');
      console.log('📍 Go to: https://supabase.com/dashboard/project/mdhtpjpwwbuepsytgrva/sql/new');
      
    } else {
      console.log('✅ New fields already exist!');
      console.log('📊 Current field values:', testFields[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateDatabase();