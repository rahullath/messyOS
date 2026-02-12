-- UK Student Meal Planning Database Schema
-- Tables for inventory, meal plans, recipes, and related functionality

-- Inventory tracking for fridge, pantry, and freezer items
CREATE TABLE IF NOT EXISTS uk_student_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL,
  expiry_date DATE,
  purchase_date DATE,
  store TEXT,
  cost NUMERIC CHECK (cost >= 0),
  category TEXT NOT NULL DEFAULT 'other',
  location TEXT NOT NULL DEFAULT 'fridge' CHECK (location IN ('fridge', 'pantry', 'freezer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes database for meal planning
CREATE TABLE IF NOT EXISTS uk_student_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL, -- Array of {name, quantity, unit, optional, substitutes}
  instructions TEXT[] NOT NULL,
  cooking_time INTEGER NOT NULL CHECK (cooking_time >= 0), -- minutes
  prep_time INTEGER NOT NULL DEFAULT 0 CHECK (prep_time >= 0), -- minutes
  difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  servings INTEGER NOT NULL DEFAULT 1 CHECK (servings > 0),
  nutrition JSONB, -- {calories, protein, carbs, fat, fiber, sugar, sodium}
  storage_info JSONB, -- {fridge_days, freezer_days, pantry_days, reheating_instructions}
  bulk_cooking_multiplier NUMERIC NOT NULL DEFAULT 1.0 CHECK (bulk_cooking_multiplier >= 1.0),
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly meal plans
CREATE TABLE IF NOT EXISTS uk_student_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  meals JSONB NOT NULL, -- Weekly meal schedule {date: {breakfast, lunch, dinner, snacks}}
  shopping_list JSONB NOT NULL, -- Array of shopping items
  total_cost NUMERIC CHECK (total_cost >= 0),
  nutrition_summary JSONB, -- Weekly nutrition totals
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Store locations and information
CREATE TABLE IF NOT EXISTS uk_student_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'store',
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  opening_hours JSONB, -- {monday: {open, close}, tuesday: {open, close}, etc}
  price_level TEXT NOT NULL DEFAULT 'mid' CHECK (price_level IN ('budget', 'mid', 'premium')),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel routes and preferences
CREATE TABLE IF NOT EXISTS uk_student_travel_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  preferred_method TEXT NOT NULL CHECK (preferred_method IN ('bike', 'train', 'walk', 'bus')),
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  cost_pence INTEGER CHECK (cost_pence >= 0),
  weather_conditions JSONB, -- {temperature, condition, precipitation_chance, wind_speed}
  frequency_used INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences for UK student features
CREATE TABLE IF NOT EXISTS uk_student_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  home_location TEXT NOT NULL DEFAULT 'five-ways',
  transport_preference TEXT NOT NULL DEFAULT 'mixed' CHECK (transport_preference IN ('bike', 'train', 'mixed')),
  cooking_time_limits JSONB NOT NULL DEFAULT '{"breakfast": 10, "lunch": 20, "dinner": 30}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  bulk_cooking_frequency INTEGER DEFAULT 4 CHECK (bulk_cooking_frequency > 0),
  budget_alert_enabled BOOLEAN DEFAULT true,
  weather_notifications BOOLEAN DEFAULT true,
  laundry_reminder_enabled BOOLEAN DEFAULT true,
  skincare_tracking_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uk_inventory_user_id ON uk_student_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_uk_inventory_expiry ON uk_student_inventory(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uk_inventory_location ON uk_student_inventory(location);
CREATE INDEX IF NOT EXISTS idx_uk_inventory_category ON uk_student_inventory(category);

CREATE INDEX IF NOT EXISTS idx_uk_recipes_public ON uk_student_recipes(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_uk_recipes_cooking_time ON uk_student_recipes(cooking_time);
CREATE INDEX IF NOT EXISTS idx_uk_recipes_difficulty ON uk_student_recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_uk_recipes_tags ON uk_student_recipes USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_uk_meal_plans_user_week ON uk_student_meal_plans(user_id, week_start_date);

CREATE INDEX IF NOT EXISTS idx_uk_stores_location ON uk_student_stores(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uk_stores_active ON uk_student_stores(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_uk_routes_user_id ON uk_student_travel_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_uk_routes_locations ON uk_student_travel_routes(from_location, to_location);

-- Row Level Security (RLS) policies
ALTER TABLE uk_student_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_travel_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_preferences ENABLE ROW LEVEL SECURITY;

-- Inventory policies
CREATE POLICY "Users can view their own inventory" ON uk_student_inventory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory" ON uk_student_inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory" ON uk_student_inventory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory" ON uk_student_inventory
  FOR DELETE USING (auth.uid() = user_id);

-- Meal plans policies
CREATE POLICY "Users can view their own meal plans" ON uk_student_meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans" ON uk_student_meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" ON uk_student_meal_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" ON uk_student_meal_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Recipes policies (public recipes viewable by all, private by owner only)
CREATE POLICY "Anyone can view public recipes" ON uk_student_recipes
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can insert their own recipes" ON uk_student_recipes
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own recipes" ON uk_student_recipes
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own recipes" ON uk_student_recipes
  FOR DELETE USING (auth.uid() = created_by);

-- Travel routes policies
CREATE POLICY "Users can view their own routes" ON uk_student_travel_routes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routes" ON uk_student_travel_routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routes" ON uk_student_travel_routes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routes" ON uk_student_travel_routes
  FOR DELETE USING (auth.uid() = user_id);

-- Preferences policies
CREATE POLICY "Users can view their own preferences" ON uk_student_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON uk_student_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON uk_student_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON uk_student_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Stores are public (no RLS needed)
-- Everyone can view store information

-- Insert some sample Birmingham stores
INSERT INTO uk_student_stores (name, type, address, latitude, longitude, opening_hours, price_level, user_rating) VALUES
('Aldi Five Ways', 'store', 'Five Ways, Birmingham', 52.4751, -1.9180, 
 '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "10:00", "close": "16:00"}}',
 'budget', 4),
('Tesco Selly Oak', 'store', 'Selly Oak, Birmingham', 52.4376, -1.9358,
 '{"monday": {"open": "06:00", "close": "00:00"}, "tuesday": {"open": "06:00", "close": "00:00"}, "wednesday": {"open": "06:00", "close": "00:00"}, "thursday": {"open": "06:00", "close": "00:00"}, "friday": {"open": "06:00", "close": "00:00"}, "saturday": {"open": "06:00", "close": "00:00"}, "sunday": {"open": "10:00", "close": "16:00"}}',
 'mid', 4),
('Sainsburys University', 'store', 'University of Birmingham', 52.4508, -1.9305,
 '{"monday": {"open": "07:00", "close": "23:00"}, "tuesday": {"open": "07:00", "close": "23:00"}, "wednesday": {"open": "07:00", "close": "23:00"}, "thursday": {"open": "07:00", "close": "23:00"}, "friday": {"open": "07:00", "close": "23:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "11:00", "close": "17:00"}}',
 'mid', 4),
('Premier Selly Oak', 'store', 'Selly Oak High Street', 52.4376, -1.9358,
 '{"monday": {"open": "06:00", "close": "23:00"}, "tuesday": {"open": "06:00", "close": "23:00"}, "wednesday": {"open": "06:00", "close": "23:00"}, "thursday": {"open": "06:00", "close": "23:00"}, "friday": {"open": "06:00", "close": "23:00"}, "saturday": {"open": "06:00", "close": "23:00"}, "sunday": {"open": "07:00", "close": "22:00"}}',
 'premium', 3),
('University Superstore', 'store', 'University of Birmingham Campus', 52.4508, -1.9305,
 '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "09:00", "close": "18:00"}, "sunday": {"open": "10:00", "close": "16:00"}}',
 'mid', 3)
ON CONFLICT DO NOTHING;

-- Insert some sample recipes suitable for UK students
INSERT INTO uk_student_recipes (name, description, ingredients, instructions, cooking_time, prep_time, difficulty, servings, nutrition, storage_info, bulk_cooking_multiplier, tags) VALUES
('Quick Pasta with Tomato Sauce', 'Simple pasta dish perfect for busy students',
 '[{"name": "pasta", "quantity": 100, "unit": "g", "optional": false}, {"name": "canned tomatoes", "quantity": 200, "unit": "g", "optional": false}, {"name": "garlic", "quantity": 2, "unit": "cloves", "optional": false}, {"name": "olive oil", "quantity": 2, "unit": "tbsp", "optional": false}, {"name": "cheese", "quantity": 30, "unit": "g", "optional": true}]',
 '["Boil pasta according to package instructions", "Heat oil in pan, add minced garlic", "Add canned tomatoes and simmer for 10 minutes", "Mix with cooked pasta", "Serve with cheese if desired"]',
 15, 5, 2, 1,
 '{"calories": 450, "protein": 15, "carbs": 65, "fat": 12, "fiber": 4}',
 '{"fridge_days": 3, "freezer_days": 30, "reheating_instructions": "Microwave for 2-3 minutes or reheat in pan"}',
 3.0, '{"lunch", "dinner", "quick", "vegetarian", "budget"}'),

('Chicken and Rice Bowl', 'Protein-rich meal perfect for post-gym',
 '[{"name": "chicken breast", "quantity": 150, "unit": "g", "optional": false}, {"name": "rice", "quantity": 80, "unit": "g", "optional": false}, {"name": "mixed vegetables", "quantity": 100, "unit": "g", "optional": false}, {"name": "soy sauce", "quantity": 1, "unit": "tbsp", "optional": false}, {"name": "garlic", "quantity": 2, "unit": "cloves", "optional": false}]',
 '["Cook rice according to package instructions", "Season and cook chicken breast in pan until done", "Steam or stir-fry vegetables", "Slice chicken and serve over rice with vegetables", "Drizzle with soy sauce"]',
 20, 10, 3, 1,
 '{"calories": 520, "protein": 35, "carbs": 60, "fat": 8, "fiber": 3}',
 '{"fridge_days": 4, "freezer_days": 60, "reheating_instructions": "Microwave for 3-4 minutes, add splash of water if needed"}',
 4.0, '{"lunch", "dinner", "protein", "meal-prep", "healthy"}'),

('Overnight Oats', 'No-cook breakfast that saves morning time',
 '[{"name": "oats", "quantity": 50, "unit": "g", "optional": false}, {"name": "milk", "quantity": 100, "unit": "ml", "optional": false}, {"name": "yogurt", "quantity": 50, "unit": "g", "optional": false}, {"name": "banana", "quantity": 0.5, "unit": "piece", "optional": true}, {"name": "honey", "quantity": 1, "unit": "tsp", "optional": true}]',
 '["Mix oats, milk, and yogurt in jar", "Add honey if desired", "Refrigerate overnight", "Top with sliced banana before eating"]',
 0, 5, 1, 1,
 '{"calories": 280, "protein": 12, "carbs": 45, "fat": 6, "fiber": 5}',
 '{"fridge_days": 3, "reheating_instructions": "Eat cold or microwave for 30 seconds if preferred warm"}',
 5.0, '{"breakfast", "no-cook", "healthy", "meal-prep", "quick"}'),

('Student Stir-Fry', 'Versatile stir-fry using whatever vegetables you have',
 '[{"name": "mixed vegetables", "quantity": 200, "unit": "g", "optional": false}, {"name": "noodles", "quantity": 100, "unit": "g", "optional": false}, {"name": "soy sauce", "quantity": 2, "unit": "tbsp", "optional": false}, {"name": "oil", "quantity": 1, "unit": "tbsp", "optional": false}, {"name": "garlic", "quantity": 2, "unit": "cloves", "optional": false}, {"name": "ginger", "quantity": 1, "unit": "tsp", "optional": true}]',
 '["Cook noodles according to package instructions", "Heat oil in large pan or wok", "Add garlic and ginger, stir for 30 seconds", "Add vegetables and stir-fry for 5-7 minutes", "Add cooked noodles and soy sauce, toss together"]',
 12, 8, 2, 1,
 '{"calories": 380, "protein": 12, "carbs": 55, "fat": 10, "fiber": 6}',
 '{"fridge_days": 3, "reheating_instructions": "Stir-fry in pan for 2-3 minutes or microwave for 2 minutes"}',
 2.0, '{"lunch", "dinner", "vegetarian", "quick", "flexible"}')
ON CONFLICT DO NOTHING;