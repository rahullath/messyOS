-- UK Student Life Optimization Seed Data (MINIMAL - NO USER DEPENDENCIES)
-- This version only includes global data that doesn't require user_id foreign keys
-- Birmingham-specific locations, stores, and public recipes

-- Insert Birmingham locations and stores
INSERT INTO uk_student_locations (name, type, address, coordinates, opening_hours, price_level, notes) VALUES
-- University locations
('University of Birmingham', 'university', 'Edgbaston, Birmingham B15 2TT', POINT(-1.9305, 52.4508), 
 '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "18:00"}, "sunday": {"open": "10:00", "close": "18:00"}}', 
 'mid', 'Main campus with multiple buildings'),

('Aston Webb Building', 'university', 'University of Birmingham, Edgbaston', POINT(-1.9298, 52.4502), 
 '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "09:00", "close": "18:00"}, "sunday": {"open": "10:00", "close": "18:00"}}', 
 'mid', 'Main lecture halls and administrative offices'),

('Library of Birmingham', 'university', 'Centenary Square, Birmingham B1 2ND', POINT(-1.9026, 52.4781), 
 '{"monday": {"open": "11:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "20:00"}, "wednesday": {"open": "09:00", "close": "20:00"}, "thursday": {"open": "09:00", "close": "20:00"}, "friday": {"open": "09:00", "close": "20:00"}, "saturday": {"open": "09:00", "close": "17:00"}, "sunday": {"open": "11:00", "close": "17:00"}}', 
 'mid', 'Public library with study spaces'),

-- Grocery stores
('Aldi Selly Oak', 'store', '598-600 Bristol Rd, Selly Oak, Birmingham B29 6BD', POINT(-1.9421, 52.4421), 
 '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "10:00", "close": "16:00"}}', 
 'budget', 'Budget supermarket with good prices on essentials'),

('Tesco Selly Oak', 'store', '1 Oak Tree Ln, Selly Oak, Birmingham B29 6HZ', POINT(-1.9398, 52.4398), 
 '{"monday": {"open": "06:00", "close": "00:00"}, "tuesday": {"open": "06:00", "close": "00:00"}, "wednesday": {"open": "06:00", "close": "00:00"}, "thursday": {"open": "06:00", "close": "00:00"}, "friday": {"open": "06:00", "close": "00:00"}, "saturday": {"open": "06:00", "close": "00:00"}, "sunday": {"open": "10:00", "close": "16:00"}}', 
 'mid', 'Large supermarket with wide selection, 24h most days'),

('Sainsbury''s Selly Oak', 'store', 'Heeley Rd, Selly Oak, Birmingham B29 6EJ', POINT(-1.9445, 52.4389), 
 '{"monday": {"open": "07:00", "close": "23:00"}, "tuesday": {"open": "07:00", "close": "23:00"}, "wednesday": {"open": "07:00", "close": "23:00"}, "thursday": {"open": "07:00", "close": "23:00"}, "friday": {"open": "07:00", "close": "23:00"}, "saturday": {"open": "07:00", "close": "23:00"}, "sunday": {"open": "10:00", "close": "16:00"}}', 
 'mid', 'Mid-range supermarket with good fresh produce'),

-- Transport hubs
('Five Ways Station', 'transport', 'Islington Row Middleway, Birmingham B15 1SL', POINT(-1.9180, 52.4751), 
 '{"monday": {"open": "05:30", "close": "00:30"}, "tuesday": {"open": "05:30", "close": "00:30"}, "wednesday": {"open": "05:30", "close": "00:30"}, "thursday": {"open": "05:30", "close": "00:30"}, "friday": {"open": "05:30", "close": "00:30"}, "saturday": {"open": "05:30", "close": "00:30"}, "sunday": {"open": "07:00", "close": "00:30"}}', 
 'mid', 'Main train station for university access, £2.05-2.10 to University'),

('University Station', 'transport', 'University of Birmingham, Edgbaston', POINT(-1.9342, 52.4484), 
 '{"monday": {"open": "05:30", "close": "00:30"}, "tuesday": {"open": "05:30", "close": "00:30"}, "wednesday": {"open": "05:30", "close": "00:30"}, "thursday": {"open": "05:30", "close": "00:30"}, "friday": {"open": "05:30", "close": "00:30"}, "saturday": {"open": "05:30", "close": "00:30"}, "sunday": {"open": "07:00", "close": "00:30"}}', 
 'mid', 'On-campus train station'),

('Selly Oak Station', 'transport', 'Heeley Rd, Selly Oak, Birmingham B29 6EH', POINT(-1.9456, 52.4378), 
 '{"monday": {"open": "05:30", "close": "00:30"}, "tuesday": {"open": "05:30", "close": "00:30"}, "wednesday": {"open": "05:30", "close": "00:30"}, "thursday": {"open": "05:30", "close": "00:30"}, "friday": {"open": "05:30", "close": "00:30"}, "saturday": {"open": "05:30", "close": "00:30"}, "sunday": {"open": "07:00", "close": "00:30"}}', 
 'mid', 'Station near Selly Oak shops and accommodation'),

-- Gyms and fitness
('University Sports Centre', 'gym', 'University of Birmingham, Edgbaston', POINT(-1.9289, 52.4523), 
 '{"monday": {"open": "06:30", "close": "22:00"}, "tuesday": {"open": "06:30", "close": "22:00"}, "wednesday": {"open": "06:30", "close": "22:00"}, "thursday": {"open": "06:30", "close": "22:00"}, "friday": {"open": "06:30", "close": "21:00"}, "saturday": {"open": "08:00", "close": "20:00"}, "sunday": {"open": "08:00", "close": "20:00"}}', 
 'mid', 'University gym with student discounts'),

('PureGym Selly Oak', 'gym', '47-49 Oak Tree Ln, Selly Oak, Birmingham B29 6HY', POINT(-1.9389, 52.4401), 
 '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}', 
 'budget', '24/7 gym with affordable membership'),

-- Common residential areas
('Five Ways Area', 'home', 'Five Ways, Birmingham B15', POINT(-1.9180, 52.4751), 
 '{}', 'mid', 'Popular student accommodation area'),

('Selly Oak Area', 'home', 'Selly Oak, Birmingham B29', POINT(-1.9421, 52.4421), 
 '{}', 'mid', 'Traditional student area with many house shares'),

('Edgbaston Area', 'home', 'Edgbaston, Birmingham B15', POINT(-1.9305, 52.4508), 
 '{}', 'premium', 'Close to university, higher rent');

-- Insert public recipes (no user_id required, created_by is nullable)
INSERT INTO uk_student_recipes (name, description, ingredients, instructions, cooking_time, prep_time, difficulty, servings, nutrition, storage_info, bulk_cooking_multiplier, tags, is_public) VALUES
('Quick Pasta with Tomato Sauce', 'Simple pasta dish perfect for busy students', 
 '[{"name": "pasta", "quantity": 100, "unit": "g"}, {"name": "canned tomatoes", "quantity": 200, "unit": "g"}, {"name": "garlic", "quantity": 2, "unit": "cloves"}, {"name": "olive oil", "quantity": 1, "unit": "tbsp"}, {"name": "salt", "quantity": 1, "unit": "pinch"}, {"name": "pepper", "quantity": 1, "unit": "pinch"}]',
 '["Boil water and cook pasta according to package instructions", "Heat olive oil in pan, add minced garlic", "Add canned tomatoes, season with salt and pepper", "Simmer for 5 minutes", "Drain pasta and mix with sauce"]',
 15, 5, 1, 1, 
 '{"calories": 350, "protein": 12, "carbs": 65, "fat": 8}',
 '{"fridge_days": 3, "reheating_instructions": "Microwave for 1-2 minutes or reheat in pan"}',
 4, ARRAY['quick', 'budget', 'vegetarian', 'pasta'], true),

('Overnight Oats', 'No-cook breakfast that saves morning time', 
 '[{"name": "rolled oats", "quantity": 50, "unit": "g"}, {"name": "milk", "quantity": 100, "unit": "ml"}, {"name": "yogurt", "quantity": 2, "unit": "tbsp"}, {"name": "honey", "quantity": 1, "unit": "tsp"}, {"name": "banana", "quantity": 0.5, "unit": "piece", "optional": true}]',
 '["Mix oats, milk, yogurt and honey in jar", "Add sliced banana if using", "Refrigerate overnight", "Eat cold or warm in microwave"]',
 0, 5, 1, 1,
 '{"calories": 280, "protein": 12, "carbs": 45, "fat": 6, "fiber": 5}',
 '{"fridge_days": 3}',
 5, ARRAY['breakfast', 'no-cook', 'healthy', 'meal-prep'], true),

('Student Stir Fry', 'Versatile stir fry using whatever vegetables you have', 
 '[{"name": "rice", "quantity": 75, "unit": "g"}, {"name": "mixed vegetables", "quantity": 150, "unit": "g"}, {"name": "soy sauce", "quantity": 2, "unit": "tbsp"}, {"name": "oil", "quantity": 1, "unit": "tbsp"}, {"name": "garlic", "quantity": 1, "unit": "clove"}, {"name": "ginger", "quantity": 1, "unit": "tsp", "optional": true}]',
 '["Cook rice according to package instructions", "Heat oil in large pan or wok", "Add garlic and ginger, stir for 30 seconds", "Add vegetables, stir fry for 3-4 minutes", "Add soy sauce and cooked rice, mix well"]',
 20, 10, 2, 1,
 '{"calories": 320, "protein": 8, "carbs": 58, "fat": 8, "fiber": 4}',
 '{"fridge_days": 4, "freezer_days": 30, "reheating_instructions": "Microwave for 2-3 minutes, stirring halfway"}',
 3, ARRAY['quick', 'healthy', 'vegetarian', 'customizable'], true),

('Tuna Pasta Salad', 'Cold pasta salad perfect for meal prep', 
 '[{"name": "pasta", "quantity": 100, "unit": "g"}, {"name": "canned tuna", "quantity": 1, "unit": "can"}, {"name": "mayonnaise", "quantity": 2, "unit": "tbsp"}, {"name": "sweetcorn", "quantity": 50, "unit": "g"}, {"name": "cucumber", "quantity": 0.5, "unit": "piece"}, {"name": "cherry tomatoes", "quantity": 6, "unit": "pieces"}]',
 '["Cook pasta and let cool completely", "Drain tuna and flake", "Dice cucumber and halve cherry tomatoes", "Mix all ingredients with mayonnaise", "Season with salt and pepper", "Chill before serving"]',
 15, 10, 1, 2,
 '{"calories": 420, "protein": 25, "carbs": 45, "fat": 15}',
 '{"fridge_days": 3}',
 2, ARRAY['meal-prep', 'protein', 'cold', 'lunch'], true),

('Microwave Jacket Potato', 'Quick and filling meal using microwave', 
 '[{"name": "large potato", "quantity": 1, "unit": "piece"}, {"name": "butter", "quantity": 1, "unit": "tsp"}, {"name": "cheese", "quantity": 30, "unit": "g", "optional": true}, {"name": "baked beans", "quantity": 100, "unit": "g", "optional": true}]',
 '["Wash potato and pierce with fork several times", "Microwave on high for 5-8 minutes depending on size", "Check if soft, microwave more if needed", "Cut open carefully, add butter", "Top with cheese and/or beans if using"]',
 8, 2, 1, 1,
 '{"calories": 250, "protein": 6, "carbs": 50, "fat": 4, "fiber": 6}',
 '{"fridge_days": 2, "reheating_instructions": "Microwave for 1-2 minutes"}',
 1, ARRAY['quick', 'microwave', 'filling', 'budget'], true);

-- Verification queries (run these after inserting to check success)
-- SELECT COUNT(*) as locations_count FROM uk_student_locations;
-- SELECT COUNT(*) as recipes_count FROM uk_student_recipes;

-- Expected results:
-- locations_count: 14
-- recipes_count: 5