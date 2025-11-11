-- Setup script for Auto-Scheduler
-- Run this to initialize the auto-scheduler database schema

-- First, run the main auto-scheduler schema
\i database/auto-scheduler-schema.sql

-- Insert sample Birmingham locations for testing
-- Note: In production, these would be created per user via the initialization function

-- Sample weather data for Birmingham
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

-- Create a function to set up auto-scheduler for existing users
CREATE OR REPLACE FUNCTION setup_auto_scheduler_for_existing_users()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all existing users and initialize their auto-scheduler data
  FOR user_record IN SELECT id FROM auth.users LOOP
    -- Initialize Birmingham locations
    PERFORM initialize_birmingham_locations_for_user(user_record.id);
    
    -- Initialize auto-scheduler preferences
    PERFORM initialize_auto_scheduler_preferences_for_user(user_record.id);
    
    RAISE NOTICE 'Initialized auto-scheduler for user: %', user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the setup for existing users (uncomment if needed)
-- SELECT setup_auto_scheduler_for_existing_users();

-- Create a trigger to automatically initialize auto-scheduler data for new users
CREATE OR REPLACE FUNCTION auto_initialize_user_auto_scheduler()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize Birmingham locations for new user
  PERFORM initialize_birmingham_locations_for_user(NEW.id);
  
  -- Initialize auto-scheduler preferences for new user
  PERFORM initialize_auto_scheduler_preferences_for_user(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users table (if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_auto_initialize_user_auto_scheduler ON auth.users;
CREATE TRIGGER trigger_auto_initialize_user_auto_scheduler
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_user_auto_scheduler();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_optimized_daily_plans_optimization_score ON optimized_daily_plans(optimization_score DESC);
CREATE INDEX IF NOT EXISTS idx_task_scheduling_history_completion_status ON task_scheduling_history(completion_status);
CREATE INDEX IF NOT EXISTS idx_energy_patterns_energy_level ON energy_patterns(energy_level DESC);
CREATE INDEX IF NOT EXISTS idx_weather_data_cycling_recommendation ON weather_data(cycling_recommendation);

-- Create a view for daily plan summaries
CREATE OR REPLACE VIEW daily_plan_summaries AS
SELECT 
  user_id,
  plan_date,
  optimization_score,
  wake_up_time,
  sleep_duration,
  CASE WHEN gym_session IS NOT NULL THEN true ELSE false END as has_gym_session,
  CASE WHEN meal_plan IS NOT NULL THEN (meal_plan->>'total_cost_estimate')::decimal ELSE 0 END as meal_cost,
  CASE WHEN task_scheduling IS NOT NULL THEN jsonb_array_length(task_scheduling) ELSE 0 END as tasks_count,
  CASE WHEN potential_conflicts IS NOT NULL THEN array_length(potential_conflicts, 1) ELSE 0 END as conflicts_count,
  created_at,
  updated_at
FROM optimized_daily_plans
ORDER BY plan_date DESC;

-- Create a view for user auto-scheduler statistics
CREATE OR REPLACE VIEW user_auto_scheduler_stats AS
SELECT 
  user_id,
  COUNT(*) as total_plans_generated,
  AVG(optimization_score) as avg_optimization_score,
  MAX(optimization_score) as best_optimization_score,
  COUNT(CASE WHEN gym_session IS NOT NULL THEN 1 END) as plans_with_gym,
  AVG(CASE WHEN meal_plan IS NOT NULL THEN (meal_plan->>'total_cost_estimate')::decimal ELSE 0 END) as avg_meal_cost,
  SUM(CASE WHEN task_scheduling IS NOT NULL THEN jsonb_array_length(task_scheduling) ELSE 0 END) as total_tasks_scheduled,
  MIN(created_at) as first_plan_date,
  MAX(created_at) as last_plan_date
FROM optimized_daily_plans
GROUP BY user_id;

-- Grant necessary permissions
GRANT SELECT ON daily_plan_summaries TO authenticated;
GRANT SELECT ON user_auto_scheduler_stats TO authenticated;

-- Add RLS policies for the views
ALTER VIEW daily_plan_summaries SET (security_barrier = true);
ALTER VIEW user_auto_scheduler_stats SET (security_barrier = true);

-- Comments for the new objects
COMMENT ON FUNCTION setup_auto_scheduler_for_existing_users() IS 'One-time function to initialize auto-scheduler data for existing users';
COMMENT ON FUNCTION auto_initialize_user_auto_scheduler() IS 'Trigger function to automatically set up auto-scheduler data for new users';
COMMENT ON VIEW daily_plan_summaries IS 'Summary view of all daily plans with key metrics';
COMMENT ON VIEW user_auto_scheduler_stats IS 'Aggregated statistics for each user''s auto-scheduler usage';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Auto-scheduler setup completed successfully!';
  RAISE NOTICE 'Database schema created with tables, functions, triggers, and views.';
  RAISE NOTICE 'Sample weather data inserted for Birmingham, UK.';
  RAISE NOTICE 'Auto-initialization triggers set up for new users.';
END $$;