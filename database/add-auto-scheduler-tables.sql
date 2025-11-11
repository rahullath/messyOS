-- Add Auto-Scheduler Tables Migration
-- This adds the essential auto-scheduler tables to the existing database

-- Custom ENUM types for auto-scheduler
DO $$ BEGIN
    CREATE TYPE location_type AS ENUM ('gym', 'university', 'supermarket', 'restaurant', 'home', 'transport_hub', 'library', 'cafe', 'park');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE weather_condition AS ENUM ('sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'foggy');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cycling_recommendation AS ENUM ('ideal', 'acceptable', 'challenging', 'avoid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE completion_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Optimized daily plans table
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

-- Birmingham locations table
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

-- Weather data table
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

-- Auto-scheduler preferences table
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

-- Enable RLS on all tables
ALTER TABLE optimized_daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE birmingham_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_scheduler_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for optimized_daily_plans
DROP POLICY IF EXISTS "Users can view their own daily plans" ON optimized_daily_plans;
CREATE POLICY "Users can view their own daily plans" ON optimized_daily_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily plans" ON optimized_daily_plans;
CREATE POLICY "Users can insert their own daily plans" ON optimized_daily_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily plans" ON optimized_daily_plans;
CREATE POLICY "Users can update their own daily plans" ON optimized_daily_plans
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own daily plans" ON optimized_daily_plans;
CREATE POLICY "Users can delete their own daily plans" ON optimized_daily_plans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for birmingham_locations
DROP POLICY IF EXISTS "Users can view their own locations" ON birmingham_locations;
CREATE POLICY "Users can view their own locations" ON birmingham_locations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own locations" ON birmingham_locations;
CREATE POLICY "Users can insert their own locations" ON birmingham_locations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own locations" ON birmingham_locations;
CREATE POLICY "Users can update their own locations" ON birmingham_locations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own locations" ON birmingham_locations;
CREATE POLICY "Users can delete their own locations" ON birmingham_locations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for auto_scheduler_preferences
DROP POLICY IF EXISTS "Users can view their own scheduler preferences" ON auto_scheduler_preferences;
CREATE POLICY "Users can view their own scheduler preferences" ON auto_scheduler_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scheduler preferences" ON auto_scheduler_preferences;
CREATE POLICY "Users can insert their own scheduler preferences" ON auto_scheduler_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scheduler preferences" ON auto_scheduler_preferences;
CREATE POLICY "Users can update their own scheduler preferences" ON auto_scheduler_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Weather data is public (no user_id), so allow all authenticated users to read it
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view weather data" ON weather_data;
CREATE POLICY "Authenticated users can view weather data" ON weather_data
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_optimized_daily_plans_user_date ON optimized_daily_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_birmingham_locations_user_type ON birmingham_locations(user_id, location_type);
CREATE INDEX IF NOT EXISTS idx_weather_data_date_location ON weather_data(date, location);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_optimized_daily_plans_updated_at ON optimized_daily_plans;
CREATE TRIGGER update_optimized_daily_plans_updated_at BEFORE UPDATE ON optimized_daily_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_birmingham_locations_updated_at ON birmingham_locations;
CREATE TRIGGER update_birmingham_locations_updated_at BEFORE UPDATE ON birmingham_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auto_scheduler_preferences_updated_at ON auto_scheduler_preferences;
CREATE TRIGGER update_auto_scheduler_preferences_updated_at BEFORE UPDATE ON auto_scheduler_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
    (p_user_id, 'The Hub Café', 'University Centre', 'restaurant', POINT(-1.9305, 52.4508), 2.5, 18, 15, 45, '{"cycling": 0, "train": 3.20, "walking": 0}', ARRAY['Sandwiches', 'Salads', 'Hot meals', 'Coffee'])
  ON CONFLICT (user_id, name) DO NOTHING;
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

-- Insert sample weather data for Birmingham
INSERT INTO weather_data (date, location, condition, temperature, precipitation_chance, wind_speed, humidity, cycling_recommendation)
VALUES 
  (CURRENT_DATE, 'Birmingham, UK', 'cloudy', 12.5, 40, 8.2, 75, 'acceptable'),
  (CURRENT_DATE + INTERVAL '1 day', 'Birmingham, UK', 'rainy', 10.8, 75, 12.5, 85, 'challenging'),
  (CURRENT_DATE + INTERVAL '2 days', 'Birmingham, UK', 'sunny', 16.2, 15, 5.8, 60, 'ideal'),
  (CURRENT_DATE + INTERVAL '3 days', 'Birmingham, UK', 'cloudy', 14.1, 30, 9.2, 70, 'acceptable')
ON CONFLICT (date, location) DO UPDATE SET
  condition = EXCLUDED.condition,
  temperature = EXCLUDED.temperature,
  precipitation_chance = EXCLUDED.precipitation_chance,
  wind_speed = EXCLUDED.wind_speed,
  humidity = EXCLUDED.humidity,
  cycling_recommendation = EXCLUDED.cycling_recommendation;

-- Success message
SELECT 'Auto-scheduler tables added successfully!' as message;