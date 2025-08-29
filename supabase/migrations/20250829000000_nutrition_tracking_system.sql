-- Nutrition Tracking System Migration
-- Comprehensive nutrition tracking with foods, recipes, and meal logging

-- Step 1: Create foods table with nutritional data per 100g
CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT UNIQUE,
  
  -- Nutrition per 100g
  calories DECIMAL(6,2) NOT NULL,
  protein DECIMAL(5,2) DEFAULT 0,
  carbs DECIMAL(5,2) DEFAULT 0,
  fat DECIMAL(5,2) DEFAULT 0,
  fiber DECIMAL(5,2) DEFAULT 0,
  sugar DECIMAL(5,2) DEFAULT 0,
  sodium DECIMAL(6,2) DEFAULT 0, -- mg
  
  -- Micronutrients (per 100g)
  vitamin_c DECIMAL(5,2) DEFAULT 0, -- mg
  iron DECIMAL(5,2) DEFAULT 0, -- mg
  calcium DECIMAL(6,2) DEFAULT 0, -- mg
  
  -- Food categories
  category TEXT NOT NULL, -- 'grains', 'proteins', 'vegetables', 'fruits', 'dairy', etc.
  subcategory TEXT,
  
  -- Common serving sizes
  common_portions JSONB DEFAULT '[]'::jsonb, -- [{"name": "1 cup", "grams": 150}, {"name": "1 slice", "grams": 30}]
  
  -- Metadata
  is_verified BOOLEAN DEFAULT false,
  is_brand_specific BOOLEAN DEFAULT false,
  cuisine_type TEXT, -- 'indian', 'western', 'chinese', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recipe info
  name TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT,
  meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'
  
  -- Serving info
  servings DECIMAL(3,1) DEFAULT 1,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  
  -- Recipe metadata
  is_public BOOLEAN DEFAULT false,
  difficulty_level TEXT, -- 'easy', 'medium', 'hard'
  tags TEXT[], -- ['vegetarian', 'gluten-free', 'high-protein']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create recipe_ingredients junction table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  food_id UUID REFERENCES foods(id) ON DELETE CASCADE,
  
  -- Ingredient amount
  quantity DECIMAL(8,2) NOT NULL, -- in grams
  notes TEXT, -- "finely chopped", "optional", etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create food_logs table for tracking daily intake
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What was eaten
  food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  
  -- Amount and timing
  quantity_grams DECIMAL(8,2) NOT NULL,
  meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- For recipes: what portion of the total recipe was consumed
  recipe_portion DECIMAL(4,2) DEFAULT 1.0, -- 1.0 = entire recipe, 0.5 = half recipe
  
  -- Optional notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create nutrition_goals table for user targets
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Daily targets
  daily_calories DECIMAL(6,2) NOT NULL,
  daily_protein DECIMAL(5,2) NOT NULL,
  daily_carbs DECIMAL(5,2) NOT NULL,
  daily_fat DECIMAL(5,2) NOT NULL,
  daily_fiber DECIMAL(5,2) DEFAULT 25,
  
  -- Goal type and activity
  goal_type TEXT DEFAULT 'maintain', -- 'lose_weight', 'gain_weight', 'maintain', 'bulk', 'cut'
  activity_level TEXT DEFAULT 'moderate', -- 'sedentary', 'light', 'moderate', 'active', 'very_active'
  
  -- User physical data
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,1),
  age INTEGER,
  gender TEXT, -- 'male', 'female', 'other'
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active goal per user
  UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods USING GIN(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode) WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_food_id ON recipe_ingredients(food_id);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(DATE(logged_at));
CREATE INDEX IF NOT EXISTS idx_food_logs_meal_type ON food_logs(meal_type);

CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_id ON nutrition_goals(user_id);

-- Step 7: Create RLS policies
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Foods table - readable by all authenticated users, writable by admins only
CREATE POLICY "Anyone can view foods" ON foods
  FOR SELECT TO authenticated USING (true);

-- Recipes table - users can CRUD their own recipes, view public recipes
CREATE POLICY "Users can view own and public recipes" ON recipes
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create own recipes" ON recipes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Recipe ingredients - inherit recipe permissions
CREATE POLICY "Users can view recipe ingredients" ON recipe_ingredients
  FOR SELECT TO authenticated USING (
    recipe_id IN (
      SELECT id FROM recipes 
      WHERE user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "Users can manage own recipe ingredients" ON recipe_ingredients
  FOR ALL TO authenticated USING (
    recipe_id IN (
      SELECT id FROM recipes 
      WHERE user_id = auth.uid()
    )
  );

-- Food logs - users can only access their own logs
CREATE POLICY "Users can view own food logs" ON food_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can create own food logs" ON food_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own food logs" ON food_logs
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own food logs" ON food_logs
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Nutrition goals - users can only access their own goals
CREATE POLICY "Users can manage own nutrition goals" ON nutrition_goals
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Step 8: Create helpful functions

-- Function to calculate recipe nutrition
CREATE OR REPLACE FUNCTION calculate_recipe_nutrition(recipe_id_param UUID)
RETURNS TABLE(
  total_calories DECIMAL,
  total_protein DECIMAL,
  total_carbs DECIMAL,
  total_fat DECIMAL,
  total_fiber DECIMAL,
  per_serving_calories DECIMAL,
  per_serving_protein DECIMAL,
  per_serving_carbs DECIMAL,
  per_serving_fat DECIMAL,
  per_serving_fiber DECIMAL
) AS $$
DECLARE
  recipe_servings DECIMAL;
BEGIN
  -- Get recipe servings
  SELECT servings INTO recipe_servings
  FROM recipes 
  WHERE id = recipe_id_param;
  
  RETURN QUERY
  WITH recipe_totals AS (
    SELECT 
      SUM((ri.quantity / 100.0) * f.calories) as calories,
      SUM((ri.quantity / 100.0) * f.protein) as protein,
      SUM((ri.quantity / 100.0) * f.carbs) as carbs,
      SUM((ri.quantity / 100.0) * f.fat) as fat,
      SUM((ri.quantity / 100.0) * f.fiber) as fiber
    FROM recipe_ingredients ri
    JOIN foods f ON ri.food_id = f.id
    WHERE ri.recipe_id = recipe_id_param
  )
  SELECT 
    rt.calories,
    rt.protein,
    rt.carbs,
    rt.fat,
    rt.fiber,
    rt.calories / recipe_servings,
    rt.protein / recipe_servings,
    rt.carbs / recipe_servings,
    rt.fat / recipe_servings,
    rt.fiber / recipe_servings
  FROM recipe_totals rt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily nutrition summary
CREATE OR REPLACE FUNCTION get_daily_nutrition_summary(
  user_id_param UUID,
  date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_calories DECIMAL,
  total_protein DECIMAL,
  total_carbs DECIMAL,
  total_fat DECIMAL,
  total_fiber DECIMAL,
  meal_breakdown JSONB,
  goal_progress JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_logs AS (
    SELECT 
      fl.*,
      CASE 
        WHEN fl.food_id IS NOT NULL THEN
          -- Direct food log
          (fl.quantity_grams / 100.0) * f.calories
        ELSE
          -- Recipe log
          (SELECT per_serving_calories FROM calculate_recipe_nutrition(fl.recipe_id)) * fl.recipe_portion
      END as log_calories,
      CASE 
        WHEN fl.food_id IS NOT NULL THEN
          (fl.quantity_grams / 100.0) * f.protein
        ELSE
          (SELECT per_serving_protein FROM calculate_recipe_nutrition(fl.recipe_id)) * fl.recipe_portion
      END as log_protein,
      CASE 
        WHEN fl.food_id IS NOT NULL THEN
          (fl.quantity_grams / 100.0) * f.carbs
        ELSE
          (SELECT per_serving_carbs FROM calculate_recipe_nutrition(fl.recipe_id)) * fl.recipe_portion
      END as log_carbs,
      CASE 
        WHEN fl.food_id IS NOT NULL THEN
          (fl.quantity_grams / 100.0) * f.fat
        ELSE
          (SELECT per_serving_fat FROM calculate_recipe_nutrition(fl.recipe_id)) * fl.recipe_portion
      END as log_fat,
      CASE 
        WHEN fl.food_id IS NOT NULL THEN
          (fl.quantity_grams / 100.0) * f.fiber
        ELSE
          (SELECT per_serving_fiber FROM calculate_recipe_nutrition(fl.recipe_id)) * fl.recipe_portion
      END as log_fiber
    FROM food_logs fl
    LEFT JOIN foods f ON fl.food_id = f.id
    WHERE fl.user_id = user_id_param 
      AND DATE(fl.logged_at) = date_param
  ),
  daily_totals AS (
    SELECT 
      SUM(log_calories) as calories,
      SUM(log_protein) as protein,
      SUM(log_carbs) as carbs,
      SUM(log_fat) as fat,
      SUM(log_fiber) as fiber
    FROM daily_logs
  ),
  meal_totals AS (
    SELECT 
      meal_type,
      SUM(log_calories) as meal_calories,
      SUM(log_protein) as meal_protein,
      SUM(log_carbs) as meal_carbs,
      SUM(log_fat) as meal_fat
    FROM daily_logs
    GROUP BY meal_type
  ),
  user_goals AS (
    SELECT daily_calories, daily_protein, daily_carbs, daily_fat
    FROM nutrition_goals 
    WHERE user_id = user_id_param AND is_active = true
  )
  SELECT 
    dt.calories,
    dt.protein,
    dt.carbs,
    dt.fat,
    dt.fiber,
    COALESCE(
      jsonb_object_agg(
        mt.meal_type, 
        jsonb_build_object(
          'calories', mt.meal_calories,
          'protein', mt.meal_protein,
          'carbs', mt.meal_carbs,
          'fat', mt.meal_fat
        )
      ),
      '{}'::jsonb
    ) as meal_breakdown,
    CASE 
      WHEN ug.daily_calories IS NOT NULL THEN
        jsonb_build_object(
          'calorie_progress', ROUND((dt.calories / ug.daily_calories * 100), 1),
          'protein_progress', ROUND((dt.protein / ug.daily_protein * 100), 1),
          'carbs_progress', ROUND((dt.carbs / ug.daily_carbs * 100), 1),
          'fat_progress', ROUND((dt.fat / ug.daily_fat * 100), 1)
        )
      ELSE '{}'::jsonb
    END as goal_progress
  FROM daily_totals dt
  CROSS JOIN meal_totals mt
  LEFT JOIN user_goals ug ON true
  GROUP BY dt.calories, dt.protein, dt.carbs, dt.fat, dt.fiber, 
           ug.daily_calories, ug.daily_protein, ug.daily_carbs, ug.daily_fat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Insert seed data for common Indian/UK foods
INSERT INTO foods (name, category, subcategory, calories, protein, carbs, fat, fiber, common_portions, cuisine_type) VALUES
-- Grains & Cereals
('Basmati Rice (cooked)', 'grains', 'rice', 130, 2.7, 28.0, 0.3, 0.4, '[{"name": "1 cup", "grams": 200}, {"name": "1 serving", "grams": 150}]', 'indian'),
('Brown Rice (cooked)', 'grains', 'rice', 112, 2.6, 22.0, 0.9, 1.8, '[{"name": "1 cup", "grams": 195}, {"name": "1 serving", "grams": 150}]', 'universal'),
('Chapati/Roti', 'grains', 'bread', 297, 11.0, 56.0, 4.0, 11.0, '[{"name": "1 medium roti", "grams": 40}, {"name": "1 large roti", "grams": 60}]', 'indian'),
('White Bread', 'grains', 'bread', 265, 9.0, 49.0, 3.2, 2.7, '[{"name": "1 slice", "grams": 30}, {"name": "1 thick slice", "grams": 40}]', 'western'),
('Oats (rolled)', 'grains', 'cereal', 389, 16.9, 66.3, 6.9, 10.6, '[{"name": "1/2 cup dry", "grams": 40}, {"name": "1 cup cooked", "grams": 240}]', 'universal'),

-- Proteins
('Chicken Breast (cooked)', 'proteins', 'meat', 165, 31.0, 0.0, 3.6, 0.0, '[{"name": "100g portion", "grams": 100}, {"name": "1 small breast", "grams": 120}]', 'universal'),
('Paneer', 'proteins', 'dairy', 296, 18.3, 1.2, 25.0, 0.0, '[{"name": "1 cube", "grams": 25}, {"name": "100g serving", "grams": 100}]', 'indian'),
('Eggs (whole)', 'proteins', 'eggs', 155, 13.0, 1.1, 11.0, 0.0, '[{"name": "1 large egg", "grams": 50}, {"name": "2 eggs", "grams": 100}]', 'universal'),
('Lentils (dal, cooked)', 'proteins', 'legumes', 116, 9.0, 20.0, 0.4, 8.0, '[{"name": "1 cup", "grams": 200}, {"name": "1 serving", "grams": 150}]', 'indian'),
('Chickpeas (cooked)', 'proteins', 'legumes', 164, 8.9, 27.4, 2.6, 7.6, '[{"name": "1 cup", "grams": 165}, {"name": "1/2 cup", "grams": 82}]', 'universal'),

-- Vegetables
('Onion', 'vegetables', 'root', 40, 1.1, 9.3, 0.1, 1.7, '[{"name": "1 medium onion", "grams": 110}, {"name": "1 cup diced", "grams": 160}]', 'universal'),
('Tomato', 'vegetables', 'fruit', 18, 0.9, 3.9, 0.2, 1.2, '[{"name": "1 medium tomato", "grams": 123}, {"name": "1 cup diced", "grams": 180}]', 'universal'),
('Potato', 'vegetables', 'root', 77, 2.0, 17.5, 0.1, 2.2, '[{"name": "1 medium potato", "grams": 150}, {"name": "1 cup diced", "grams": 150}]', 'universal'),
('Spinach (raw)', 'vegetables', 'leafy', 23, 2.9, 3.6, 0.4, 2.2, '[{"name": "1 cup", "grams": 30}, {"name": "100g bunch", "grams": 100}]', 'universal'),
('Broccoli', 'vegetables', 'cruciferous', 34, 2.8, 7.0, 0.4, 2.6, '[{"name": "1 cup florets", "grams": 91}, {"name": "1 medium head", "grams": 600}]', 'western'),

-- Fruits
('Apple', 'fruits', 'pome', 52, 0.3, 14.0, 0.2, 2.4, '[{"name": "1 medium apple", "grams": 182}, {"name": "1 small apple", "grams": 150}]', 'universal'),
('Banana', 'fruits', 'tropical', 89, 1.1, 23.0, 0.3, 2.6, '[{"name": "1 medium banana", "grams": 118}, {"name": "1 large banana", "grams": 136}]', 'universal'),
('Mango', 'fruits', 'tropical', 60, 0.8, 15.0, 0.4, 1.6, '[{"name": "1 cup diced", "grams": 165}, {"name": "1 medium mango", "grams": 200}]', 'indian'),

-- Dairy
('Milk (whole)', 'dairy', 'liquid', 42, 3.4, 5.0, 1.0, 0.0, '[{"name": "1 cup", "grams": 240}, {"name": "1 glass", "grams": 200}]', 'universal'),
('Greek Yogurt (plain)', 'dairy', 'fermented', 59, 10.0, 3.6, 0.4, 0.0, '[{"name": "1 cup", "grams": 245}, {"name": "1 serving", "grams": 150}]', 'western'),
('Curd/Dahi (plain)', 'dairy', 'fermented', 60, 3.1, 4.7, 4.3, 0.0, '[{"name": "1 cup", "grams": 245}, {"name": "1 small bowl", "grams": 100}]', 'indian'),

-- Cooking oils and fats
('Ghee', 'fats', 'cooking_fat', 900, 0.0, 0.0, 100.0, 0.0, '[{"name": "1 tsp", "grams": 5}, {"name": "1 tbsp", "grams": 15}]', 'indian'),
('Olive Oil', 'fats', 'cooking_oil', 884, 0.0, 0.0, 100.0, 0.0, '[{"name": "1 tsp", "grams": 5}, {"name": "1 tbsp", "grams": 15}]', 'western'),

-- Spices and seasonings (commonly used in significant quantities)
('Coconut (fresh)', 'nuts_seeds', 'coconut', 354, 3.3, 15.2, 33.5, 9.0, '[{"name": "1/4 cup shredded", "grams": 20}, {"name": "1 tbsp", "grams": 15}]', 'indian')

ON CONFLICT (name) DO NOTHING;

-- Step 10: Add comments
COMMENT ON TABLE foods IS 'Master food database with nutrition per 100g';
COMMENT ON TABLE recipes IS 'User-created recipes with multiple ingredients';
COMMENT ON TABLE recipe_ingredients IS 'Junction table linking recipes to foods with quantities';
COMMENT ON TABLE food_logs IS 'Daily food intake tracking for users';
COMMENT ON TABLE nutrition_goals IS 'User nutrition targets and physical data';

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;