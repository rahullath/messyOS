-- UK Student Travel System Database Schema

-- Travel routes and preferences
CREATE TABLE IF NOT EXISTS uk_student_travel_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  from_coordinates POINT NOT NULL,
  to_coordinates POINT NOT NULL,
  preferred_method TEXT NOT NULL CHECK (preferred_method IN ('bike', 'train', 'walk', 'bus')),
  distance_meters INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  cost_pence INTEGER NOT NULL DEFAULT 0,
  elevation_meters INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'moderate' CHECK (difficulty IN ('easy', 'moderate', 'hard')),
  weather_suitability DECIMAL(3,2) DEFAULT 0.5 CHECK (weather_suitability >= 0 AND weather_suitability <= 1),
  energy_required INTEGER DEFAULT 3 CHECK (energy_required >= 1 AND energy_required <= 5),
  safety_rating INTEGER DEFAULT 3 CHECK (safety_rating >= 1 AND safety_rating <= 5),
  frequency_used INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  route_data JSONB, -- Store detailed route information
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel plans for specific dates
CREATE TABLE IF NOT EXISTS uk_student_travel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  routes JSONB NOT NULL, -- Array of route objects
  total_cost_pence INTEGER NOT NULL DEFAULT 0,
  total_time_minutes INTEGER NOT NULL DEFAULT 0,
  total_distance_meters INTEGER NOT NULL DEFAULT 0,
  weather_considerations TEXT[],
  energy_forecast JSONB, -- {morning: 3, afternoon: 4, evening: 2}
  recommendations TEXT[],
  alternatives JSONB, -- Array of alternative route objects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_date)
);

-- Travel cost tracking
CREATE TABLE IF NOT EXISTS uk_student_travel_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  travel_date DATE NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('bike', 'train', 'walk', 'bus')),
  route_description TEXT NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  cost_pence INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'daily-commute' CHECK (category IN ('daily-commute', 'gym', 'shopping', 'social', 'other')),
  notes TEXT,
  receipt_data JSONB, -- Store receipt/ticket information
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Birmingham locations and points of interest
CREATE TABLE IF NOT EXISTS uk_student_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('home', 'university', 'gym', 'store', 'train-station', 'bus-stop', 'other')),
  address TEXT,
  coordinates POINT NOT NULL,
  building_code TEXT, -- For university buildings
  opening_hours JSONB, -- Store opening hours as JSON
  price_level TEXT CHECK (price_level IN ('budget', 'mid', 'premium')),
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  amenities TEXT[], -- ['bike-parking', 'covered', 'secure', 'lift-access']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User travel preferences
CREATE TABLE IF NOT EXISTS uk_student_travel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_method TEXT DEFAULT 'mixed' CHECK (preferred_method IN ('bike', 'train', 'mixed')),
  max_walking_distance_meters INTEGER DEFAULT 1000,
  weather_threshold JSONB DEFAULT '{"minTemperature": 5, "maxWindSpeed": 20, "maxPrecipitation": 2}',
  fitness_level TEXT DEFAULT 'medium' CHECK (fitness_level IN ('low', 'medium', 'high')),
  budget_constraints JSONB DEFAULT '{"dailyLimit": 500, "weeklyLimit": 1500}', -- in pence
  time_preferences JSONB DEFAULT '{"bufferTime": 10, "maxTravelTime": 60}', -- in minutes
  home_location_id UUID REFERENCES uk_student_locations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Weather data cache
CREATE TABLE IF NOT EXISTS uk_student_weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_coordinates POINT NOT NULL,
  temperature DECIMAL(4,1) NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('sunny', 'cloudy', 'rainy', 'stormy', 'snowy')),
  wind_speed DECIMAL(4,1) NOT NULL DEFAULT 0,
  humidity INTEGER DEFAULT 50 CHECK (humidity >= 0 AND humidity <= 100),
  precipitation DECIMAL(4,1) DEFAULT 0,
  visibility INTEGER DEFAULT 10000, -- in meters
  forecast_timestamp TIMESTAMPTZ NOT NULL,
  is_forecast BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Index for efficient location-based queries
  CONSTRAINT unique_weather_location_time UNIQUE(location_coordinates, forecast_timestamp)
);

-- Train service disruptions and real-time data
CREATE TABLE IF NOT EXISTS uk_student_train_disruptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line TEXT NOT NULL,
  from_station TEXT NOT NULL,
  to_station TEXT NOT NULL,
  disruption_type TEXT NOT NULL CHECK (disruption_type IN ('delay', 'cancellation', 'service-change')),
  delay_minutes INTEGER DEFAULT 0,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  alternative_routes JSONB, -- Array of alternative route suggestions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_travel_routes_user_locations ON uk_student_travel_routes(user_id, from_location, to_location);
CREATE INDEX IF NOT EXISTS idx_travel_plans_user_date ON uk_student_travel_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_travel_costs_user_date ON uk_student_travel_costs(user_id, travel_date);
CREATE INDEX IF NOT EXISTS idx_locations_type_coordinates ON uk_student_locations USING GIST(coordinates) WHERE type IN ('university', 'gym', 'store');
CREATE INDEX IF NOT EXISTS idx_weather_location_time ON uk_student_weather_cache USING GIST(location_coordinates);
CREATE INDEX IF NOT EXISTS idx_train_disruptions_time ON uk_student_train_disruptions(start_time, end_time) WHERE end_time IS NULL OR end_time > NOW();

-- Insert default Birmingham locations
INSERT INTO uk_student_locations (name, type, address, coordinates, building_code, amenities) VALUES
  ('Five Ways Station', 'train-station', 'Five Ways, Birmingham B16 0SP', POINT(52.4751, -1.9180), NULL, ARRAY['lift-access', 'covered']),
  ('University Station', 'train-station', 'University, Birmingham B15 2TT', POINT(52.4508, -1.9305), NULL, ARRAY['lift-access', 'covered']),
  ('Selly Oak Station', 'train-station', 'Selly Oak, Birmingham B29 6EJ', POINT(52.4373, -1.9417), NULL, ARRAY['lift-access']),
  ('University of Birmingham', 'university', 'Edgbaston, Birmingham B15 2TT', POINT(52.4508, -1.9305), 'MAIN', ARRAY['bike-parking', 'secure']),
  ('Muirhead Tower', 'university', 'University of Birmingham', POINT(52.4501, -1.9298), 'R13', ARRAY['lift-access']),
  ('Business School', 'university', 'University of Birmingham', POINT(52.4515, -1.9285), 'R25', ARRAY['lift-access', 'bike-parking']),
  ('Sports Centre', 'gym', 'University of Birmingham', POINT(52.4485, -1.9335), 'R16', ARRAY['bike-parking', 'secure', 'shower']),
  ('Aldi Selly Oak', 'store', '1 Heeley Rd, Selly Oak, Birmingham B29 6EJ', POINT(52.4385, -1.9425), NULL, ARRAY['bike-parking']),
  ('Tesco Selly Oak', 'store', '2 Oak Tree Ln, Selly Oak, Birmingham B29 6HZ', POINT(52.4395, -1.9445), NULL, ARRAY['bike-parking', 'covered']),
  ('University Superstore', 'store', 'Guild of Students, University of Birmingham', POINT(52.4505, -1.9315), NULL, ARRAY['bike-parking'])
ON CONFLICT DO NOTHING;

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(lat1 DECIMAL, lon1 DECIMAL, lat2 DECIMAL, lon2 DECIMAL)
RETURNS INTEGER AS $$
DECLARE
    R INTEGER := 6371000; -- Earth's radius in meters
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    
    a := SIN(dLat/2) * SIN(dLat/2) + 
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
         SIN(dLon/2) * SIN(dLon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN ROUND(R * c);
END;
$$ LANGUAGE plpgsql;

-- Function to update travel route usage statistics
CREATE OR REPLACE FUNCTION update_route_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE uk_student_travel_routes 
    SET frequency_used = frequency_used + 1,
        last_used = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND from_location = NEW.from_location 
      AND to_location = NEW.to_location;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update route usage when travel costs are recorded
CREATE TRIGGER trigger_update_route_usage
    AFTER INSERT ON uk_student_travel_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_route_usage();

-- Function to clean old weather cache data (keep only last 7 days)
CREATE OR REPLACE FUNCTION clean_weather_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM uk_student_weather_cache 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;