-- Temporarily disable triggers that reference the old metrics table
-- This is a quick fix to allow habit imports to work

-- Drop the problematic triggers
DROP TRIGGER IF EXISTS update_life_score_trigger ON habit_entries;
DROP TRIGGER IF EXISTS update_life_score_tasks_trigger ON tasks;

-- Drop the problematic functions (they'll be recreated later with fixed schema)
DROP FUNCTION IF EXISTS trigger_update_life_score();
DROP FUNCTION IF EXISTS trigger_update_life_score_tasks();
DROP FUNCTION IF EXISTS calculate_life_optimization_score(UUID, DATE);
DROP FUNCTION IF EXISTS check_and_award_achievements(UUID);

-- Add comment
COMMENT ON SCHEMA public IS 'Temporarily disabled cross-module triggers to fix habit import issues. The triggers referenced the old metrics table which no longer exists.';