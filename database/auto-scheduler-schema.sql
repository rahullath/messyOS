-- Auto-Scheduler Database Schema
-- Supports AI-powered perfect day planning with Birmingham UK context

-- Optimized daily plans with Birmingham UK context
CREATE TABLE IF NOT EXISTS optimized_daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  wake_up_time TIME NOT NULL,
  sleep_duration INTEGER, -- minutes
  gym_session JSONB, -- GymSession details
  meal_plan JSONB, -- Complete meal planning with macros
  travel_optimization JSONB, -- Travel routes and methods
  task_scheduling JSONB, -- Optimized task placement
  optimization_score DECIMAL(3,2), -- 0.00 to 1.00
  birmingham_context JSONB, -- Location-specific data
  weather_consideration JSONB,
  ai_reasoning TEXT[], -- Array of reasoning strings
  potential_conflicts TEXT[], -- Array of conflict warnings
  backup_plans JSONB, -- Array of backup plan objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_date)
);

-- Birmingham-specific location and route data
CREATE TABLE IF NOT EXISTS birmingham_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  location_type location_type NOT NULL,
  coordinates POINT,
  cycling_distance_from_home DECIMAL(4,2), -- miles
  cycling_time_estimate INTEGER, -- minutes
  train_time_estimate INTEGER, -- minutes
  walking_time_estimate INTEGER, -- minutes
  cost_considerations JSONB,
  opening_hours JSONB,
  specialties TEXT[],
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal planning and macro tracking
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  meal_type meal_type NOT NULL,
  location TEXT NOT NULL,
  ingredients JSONB,
  macros JSONB,
  preparation_time INTEGER,
  estimated_cost DECIMAL(6,2),
  actual_cost DECIMAL(6,2),
  shopping_list JSONB,
  restaurant_option JSONB,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Energy patterns and scheduling preferences
CREATE TABLE IF NOT EXISTS energy_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  time_of_day TIME NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday, null for all days
  energy_level DECIMAL(3,2) CHECK (energy_level >= 0 AND energy_level <= 10), -- 0-10 scale
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1), -- 0-1 confidence score
  sample_size INTEGER DEFAULT 1,
  activity_context TEXT, -- What the user was doing during this energy level
  factors_affecting JSONB, -- Sleep quality, weather, etc.
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, time_of_day, day_of_week)
);

-- Task scheduling history and performance
CREATE TABLE IF NOT EXISTS task_scheduling_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  energy_match_score DECIMAL(3,2), -- How well energy matched task complexity
  completion_status completion_status NOT NULL DEFAULT 'scheduled',
  productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 10),
  scheduling_method TEXT DEFAULT 'auto_scheduler', -- 'auto_scheduler', 'manual', 'ai_suggestion'
  rescheduled_count INTEGER DEFAULT 0,
  cancellation_reason TEXT,
  user_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather data and impact tracking
CREATE TABLE IF NOT EXISTS weather_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  location TEXT DEFAULT 'Birmingham, UK',
  condition weather_condition NOT NULL,
  temperature DECIMAL(4,1), -- Celsius
  precipitation_chance INTEGER CHECK (precipitation_chance >= 0 AND precipitation_chance <= 100),
  wind_speed DECIMAL(4,1), -- mph
  humidity INTEGER CHECK (humidity >= 0 AND humidity <= 100),
  cycling_recommendation cycling_recommendation NOT NULL,
  impact_on_schedule JSONB, -- How weather affected the day's schedule
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, location)
);

-- User preferences for auto-scheduling
CREATE TABLE IF NOT EXISTS auto_scheduler_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sleep preferences
  preferred_wake_time TIME DEFAULT '06:00:00',
  preferred_bedtime TIME DEFAULT '22:00:00',
  minimum_sleep_duration INTEGER DEFAULT 480, -- 8 hours in minutes
  
  -- Gym preferences
  gym_frequency INTEGER DEFAULT 4, -- times per week
  preferred_gym_times TEXT[] DEFAULT ARRAY['morning', 'evening'],
  workout_duration_preference INTEGER DEFAULT 60, -- minutes
  travel_method_preference TEXT DEFAULT 'cycling',
  
  -- Meal preferences
  cooking_time_limit INTEGER DEFAULT 45, -- minutes per meal
  daily_calorie_target INTEGER DEFAULT 2200,
  daily_protein_target INTEGER DEFAULT 120, -- grams
  dietary_restrictions TEXT[],
  meal_budget_limit DECIMAL(6,2) DEFAULT 15.00, -- per day
  
  -- Task scheduling preferences
  max_tasks_per_day INTEGER DEFAULT 8,
  complex_task_time_preference TEXT DEFAULT 'morning', -- 'morning', 'afternoon', 'evening'
  break_duration_between_tasks INTEGER DEFAULT 15, -- minutes
  deadline_buffer_days INTEGER DEFAULT 1,
  
  -- External preferences
  weather_sensitivity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  budget_consciousness TEXT DEFAULT 'medium',
  schedule_flexibility TEXT DEFAULT 'moderate', -- 'rigid', 'moderate', 'flexible'
  
  -- AI behavior preferences
  optimization_priority TEXT DEFAULT 'balanced', -- 'energy', 'time', 'cost', 'balanced'
  suggestion_frequency TEXT DEFAULT 'moderate', -- 'minimal', 'moderate', 'frequent'
  backup_plan_generation BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Optimization insights and learning
CREATE TABLE IF NOT EXISTS optimization_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'energy_pattern', 'task_efficiency', 'meal_timing', etc.
  insight_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  impact_score DECIMAL(3,2) CHECK (impact_score >= 0 AND impact_score <= 1), -- How much this affects optimization
  date_range_start DATE,
  date_range_end DATE,
  sample_size INTEGER,
  status TEXT DEFAULT 'active', -- 'active', 'outdated', 'invalidated'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom ENUM types for auto-scheduler
CREATE TYPE IF NOT EXISTS location_type AS ENUM ('gym', 'university', 'supermarket', 'restaurant', 'home', 'transport_hub', 'library', 'cafe', 'park');
CREATE TYPE IF NOT EXISTS meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout');
CREATE TYPE IF NOT EXISTS weather_condition AS ENUM ('sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'foggy');
CREATE TYPE IF NOT EXISTS cycling_recommendation AS ENUM ('ideal', 'acceptable', 'challenging', 'avoid');
CREATE TYPE IF NOT EXISTS completion_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled');

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_optimized_daily_plans_user_date ON optimized_daily_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_birmingham_locations_user_type ON birmingham_locations(user_id, location_type);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date_type ON meal_plans(user_id, plan_date, meal_type);
CREATE INDEX IF NOT EXISTS idx_energy_patterns_user_time ON energy_patterns(user_id, time_of_day, day_of_week);
CREATE INDEX IF NOT EXISTS idx_task_scheduling_history_user_task ON task_scheduling_history(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_weather_data_date_location ON weather_data(date, location);
CREATE INDEX IF NOT EXISTS idx_optimization_insights_user_type ON optimization_insights(user_id, insight_type);

-- Row Level Security (RLS) policies
ALTER TABLE optimized_daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE birmingham_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_scheduling_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_scheduler_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for optimized_daily_plans
CREATE POLICY IF NOT EXISTS "Users can view their own daily plans" ON optimized_daily_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own daily plans" ON optimized_daily_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own daily plans" ON optimized_daily_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own daily plans" ON optimized_daily_plans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for birmingham_locations
CREATE POLICY IF NOT EXISTS "Users can view their own locations" ON birmingham_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own locations" ON birmingham_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own locations" ON birmingham_locations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own locations" ON birmingham_locations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for meal_plans
CREATE POLICY IF NOT EXISTS "Users can view their own meal plans" ON meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own meal plans" ON meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own meal plans" ON meal_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own meal plans" ON meal_plans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for energy_patterns
CREATE POLICY IF NOT EXISTS "Users can view their own energy patterns" ON energy_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own energy patterns" ON energy_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own energy patterns" ON energy_patterns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own energy patterns" ON energy_patterns
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for task_scheduling_history
CREATE POLICY IF NOT EXISTS "Users can view their own task scheduling history" ON task_scheduling_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own task scheduling history" ON task_scheduling_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own task scheduling history" ON task_scheduling_history
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for auto_scheduler_preferences
CREATE POLICY IF NOT EXISTS "Users can view their own scheduler preferences" ON auto_scheduler_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own scheduler preferences" ON auto_scheduler_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own scheduler preferences" ON auto_scheduler_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for optimization_insights
CREATE POLICY IF NOT EXISTS "Users can view their own optimization insights" ON optimization_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own optimization insights" ON optimization_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own optimization insights" ON optimization_insights
  FOR UPDATE USING (auth.uid() = user_id);

-- Weather data is public (no user_id), so no RLS needed
-- But we can add a policy to allow all authenticated users to read it
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users can view weather data" ON weather_data
  FOR SELECT USING (auth.role() = 'authenticated');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_optimized_daily_plans_updated_at BEFORE UPDATE ON optimized_daily_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_birmingham_locations_updated_at BEFORE UPDATE ON birmingham_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_energy_patterns_updated_at BEFORE UPDATE ON energy_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_scheduling_history_updated_at BEFORE UPDATE ON task_scheduling_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_scheduler_preferences_updated_at BEFORE UPDATE ON auto_scheduler_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_optimization_insights_updated_at BEFORE UPDATE ON optimization_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample Birmingham locations for new users
INSERT INTO birmingham_locations (user_id, name, address, location_type, coordinates, cycling_distance_from_home, cycling_time_estimate, train_time_estimate, walking_time_estimate, cost_considerations, specialties)
VALUES 
  -- This will be inserted per user, so we'll create a function for it
  -- For now, this is just the schema structure

-- Function to initialize default Birmingham locations for new users
CREATE OR REPLACE FUNCTION initialize_birmingham_locations_for_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO birmingham_locations (user_id, name, address, location_type, coordinates, cycling_distance_from_home, cycling_time_estimate, train_time_estimate, walking_time_estimate, cost_considerations, specialties)
  VALUES 
    (p_user_id, 'University of Birmingham', 'Edgbaston, Birmingham B15 2TT', 'university', POINT(-1.9305, 52.4508), 2.5, 18, 15, 45, '{"cycling": 0, "train": 3.20, "walking": 0}', ARRAY['Lectures', 'Library', 'Dining', 'Sports']),
    (p_user_id, 'Local Gym', '3.7 miles from home', 'gym', POINT(-1.8904, 52.4862), 3.7, 34, 25, 75, '{"cycling": 0, "train": 4.50, "walking": 0}', ARRAY['Weights', 'Cardio', 'Classes', 'Shower facilities']),
    (p_user_id, 'Tesco Express', 'Selly Oak', 'supermarket', POINT(-1.9366, 52.4412), 0.8, 6, 10, 12, '{"cycling": 0, "train": 2.50, "walking": 0}', ARRAY['Quick essentials', 'Ready meals', 'Fresh produce']),
    (p_user_id, 'ASDA Superstore', 'Queslett Road', 'supermarket', POINT(-1.9234, 52.5123), 2.1, 15, 20, 35, '{"cycling": 0, "train": 3.50, "walking": 0}', ARRAY['Bulk shopping', 'Value products', 'Wide selection']),
    (p_user_id, 'Selly Oak Train Station', 'Selly Oak', 'transport_hub', POINT(-1.9366, 52.4412), 0.5, 4, 0, 8, '{"cycling": 0, "train": 0, "walking": 0}', ARRAY['Cross City Line', 'City Centre', 'University']),
    (p_user_id, 'The Hub Café', 'University Centre', 'restaurant', POINT(-1.9305, 52.4508), 2.5, 18, 15, 45, '{"cycling": 0, "train": 3.20, "walking": 0}', ARRAY['Sandwiches', 'Salads', 'Hot meals', 'Coffee']);
END;
$$ LANGUAGE plpgsql;

-- Function to initialize default auto-scheduler preferences for new users
CREATE OR REPLACE FUNCTION initialize_auto_scheduler_preferences_for_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO auto_scheduler_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE optimized_daily_plans IS 'Stores AI-generated perfect daily schedules with Birmingham UK context';
COMMENT ON TABLE birmingham_locations IS 'User-specific locations in Birmingham with travel time and cost data';
COMMENT ON TABLE meal_plans IS 'Detailed meal planning with macros, costs, and preparation times';
COMMENT ON TABLE energy_patterns IS 'Learned user energy patterns throughout the day for optimal task scheduling';
COMMENT ON TABLE task_scheduling_history IS 'Historical data on task scheduling performance for learning and optimization';
COMMENT ON TABLE weather_data IS 'Weather data for Birmingham UK affecting travel and scheduling decisions';
COMMENT ON TABLE auto_scheduler_preferences IS 'User preferences for auto-scheduling behavior and priorities';
COMMENT ON TABLE optimization_insights IS 'AI-generated insights about user patterns and optimization opportunities';