-- UK Student Life Optimization Schema Migration
-- This migration adds tables specific to UK student life optimization features

-- Inventory tracking for meal planning
CREATE TABLE uk_student_inventory (
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

-- Meal plans and recipes
CREATE TABLE uk_student_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  meals JSONB NOT NULL DEFAULT '{}', -- Weekly meal schedule
  shopping_list JSONB NOT NULL DEFAULT '[]',
  total_cost NUMERIC CHECK (total_cost >= 0),
  nutrition_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date)
);

-- Travel routes and preferences
CREATE TABLE uk_student_travel_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  preferred_method TEXT NOT NULL CHECK (preferred_method IN ('bike', 'train', 'walk', 'bus')),
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  cost_pence INTEGER CHECK (cost_pence >= 0),
  weather_conditions JSONB DEFAULT '{}',
  frequency_used INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UK-specific financial data
CREATE TABLE uk_student_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'GBP' CHECK (currency IN ('GBP', 'USD', 'EUR')),
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  store TEXT,
  location TEXT,
  payment_method TEXT CHECK (payment_method IN ('monzo', 'iq-prepaid', 'icici-uk', 'cash', 'card')),
  receipt_data JSONB DEFAULT '{}',
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic schedule integration
CREATE TABLE uk_student_academic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('class', 'assignment', 'exam', 'deadline', 'study_session')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  building TEXT,
  importance INTEGER DEFAULT 3 CHECK (importance >= 1 AND importance <= 5),
  preparation_time INTEGER CHECK (preparation_time >= 0), -- minutes needed
  travel_time INTEGER CHECK (travel_time >= 0), -- minutes to get there
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal care and routine tracking
CREATE TABLE uk_student_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_type TEXT NOT NULL CHECK (routine_type IN ('morning', 'evening', 'skincare', 'laundry', 'gym', 'study')),
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]', -- Array of routine steps
  estimated_duration INTEGER CHECK (estimated_duration > 0), -- minutes
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  last_completed TIMESTAMPTZ,
  completion_streak INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location and store data
CREATE TABLE uk_student_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('store', 'university', 'gym', 'home', 'transport', 'other')),
  address TEXT,
  coordinates POINT,
  opening_hours JSONB DEFAULT '{}',
  price_level TEXT CHECK (price_level IN ('budget', 'mid', 'premium')),
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, type)
);

-- Budget tracking and limits
CREATE TABLE uk_student_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  weekly_limit NUMERIC CHECK (weekly_limit >= 0),
  monthly_limit NUMERIC CHECK (monthly_limit >= 0),
  current_weekly_spent NUMERIC DEFAULT 0 CHECK (current_weekly_spent >= 0),
  current_monthly_spent NUMERIC DEFAULT 0 CHECK (current_monthly_spent >= 0),
  week_start_date DATE NOT NULL,
  month_start_date DATE NOT NULL,
  alert_threshold NUMERIC DEFAULT 0.8 CHECK (alert_threshold >= 0 AND alert_threshold <= 1),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Recipe database
CREATE TABLE uk_student_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  cooking_time INTEGER CHECK (cooking_time > 0), -- minutes
  prep_time INTEGER CHECK (prep_time >= 0), -- minutes
  difficulty INTEGER DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
  servings INTEGER DEFAULT 1 CHECK (servings > 0),
  nutrition JSONB DEFAULT '{}',
  storage_info JSONB DEFAULT '{}',
  bulk_cooking_multiplier NUMERIC DEFAULT 1 CHECK (bulk_cooking_multiplier > 0),
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences for UK student features
CREATE TABLE uk_student_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  home_location TEXT DEFAULT 'five-ways',
  transport_preference TEXT DEFAULT 'mixed' CHECK (transport_preference IN ('bike', 'train', 'mixed')),
  cooking_time_limits JSONB DEFAULT '{"breakfast": 10, "lunch": 20, "dinner": 30}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  bulk_cooking_frequency INTEGER DEFAULT 2 CHECK (bulk_cooking_frequency >= 1),
  budget_alert_enabled BOOLEAN DEFAULT true,
  weather_notifications BOOLEAN DEFAULT true,
  laundry_reminder_enabled BOOLEAN DEFAULT true,
  skincare_tracking_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_uk_inventory_user_id ON uk_student_inventory(user_id);
CREATE INDEX idx_uk_inventory_expiry ON uk_student_inventory(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_uk_meal_plans_user_week ON uk_student_meal_plans(user_id, week_start_date);
CREATE INDEX idx_uk_travel_routes_user ON uk_student_travel_routes(user_id);
CREATE INDEX idx_uk_travel_routes_locations ON uk_student_travel_routes(from_location, to_location);
CREATE INDEX idx_uk_expenses_user_date ON uk_student_expenses(user_id, transaction_date);
CREATE INDEX idx_uk_expenses_category ON uk_student_expenses(category);
CREATE INDEX idx_uk_academic_events_user_time ON uk_student_academic_events(user_id, start_time);
CREATE INDEX idx_uk_routines_user_type ON uk_student_routines(user_id, routine_type);
CREATE INDEX idx_uk_locations_type ON uk_student_locations(type);
CREATE INDEX idx_uk_budgets_user_category ON uk_student_budgets(user_id, category);
CREATE INDEX idx_uk_recipes_tags ON uk_student_recipes USING GIN(tags);

-- Row Level Security (RLS) policies
ALTER TABLE uk_student_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_travel_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_academic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own inventory" ON uk_student_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON uk_student_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON uk_student_inventory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON uk_student_inventory FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own meal plans" ON uk_student_meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal plans" ON uk_student_meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal plans" ON uk_student_meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans" ON uk_student_meal_plans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own travel routes" ON uk_student_travel_routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own travel routes" ON uk_student_travel_routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own travel routes" ON uk_student_travel_routes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own travel routes" ON uk_student_travel_routes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own expenses" ON uk_student_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON uk_student_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON uk_student_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON uk_student_expenses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own academic events" ON uk_student_academic_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own academic events" ON uk_student_academic_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own academic events" ON uk_student_academic_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own academic events" ON uk_student_academic_events FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own routines" ON uk_student_routines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routines" ON uk_student_routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routines" ON uk_student_routines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routines" ON uk_student_routines FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own budgets" ON uk_student_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON uk_student_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON uk_student_budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON uk_student_budgets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON uk_student_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON uk_student_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON uk_student_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own preferences" ON uk_student_preferences FOR DELETE USING (auth.uid() = user_id);

-- Public access for locations and recipes
ALTER TABLE uk_student_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view locations" ON uk_student_locations FOR SELECT USING (true);
CREATE POLICY "Anyone can view public recipes" ON uk_student_recipes FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own recipes" ON uk_student_recipes FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert own recipes" ON uk_student_recipes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own recipes" ON uk_student_recipes FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own recipes" ON uk_student_recipes FOR DELETE USING (auth.uid() = created_by);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_uk_student_inventory_updated_at BEFORE UPDATE ON uk_student_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_meal_plans_updated_at BEFORE UPDATE ON uk_student_meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_travel_routes_updated_at BEFORE UPDATE ON uk_student_travel_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_expenses_updated_at BEFORE UPDATE ON uk_student_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_academic_events_updated_at BEFORE UPDATE ON uk_student_academic_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_routines_updated_at BEFORE UPDATE ON uk_student_routines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_budgets_updated_at BEFORE UPDATE ON uk_student_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_preferences_updated_at BEFORE UPDATE ON uk_student_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_locations_updated_at BEFORE UPDATE ON uk_student_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uk_student_recipes_updated_at BEFORE UPDATE ON uk_student_recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();