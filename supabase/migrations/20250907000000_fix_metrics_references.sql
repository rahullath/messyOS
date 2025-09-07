-- Fix references to old 'metrics' table in cross-module integration functions
-- This fixes the 42P01 error: relation "public.metrics" does not exist

-- Drop and recreate the calculate_life_optimization_score function with correct schema
DROP FUNCTION IF EXISTS calculate_life_optimization_score(UUID, DATE);

CREATE OR REPLACE FUNCTION calculate_life_optimization_score(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  habits_score DECIMAL(5,2) := 0;
  tasks_score DECIMAL(5,2) := 0;
  health_score DECIMAL(5,2) := 0;
  productivity_score DECIMAL(5,2) := 0;
  content_score DECIMAL(5,2) := 0;
  overall_score DECIMAL(5,2) := 0;
  result JSONB;
BEGIN
  -- Calculate habits score (percentage of completed habits for the date)
  SELECT COALESCE(
    (
      SELECT (COUNT(CASE WHEN value > 0 THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100
      FROM habit_entries he
      JOIN habits h ON he.habit_id = h.id
      WHERE he.user_id = p_user_id 
        AND he.date = p_date
        AND h.is_active = true
    ), 0
  ) INTO habits_score;

  -- Calculate tasks score (percentage of completed tasks)
  SELECT COALESCE(
    (
      SELECT (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100
      FROM tasks
      WHERE user_id = p_user_id 
        AND (completed_at::DATE = p_date OR (status != 'completed' AND created_at::DATE <= p_date))
    ), 0
  ) INTO tasks_score;

  -- Calculate health score (based on fitness metrics instead of old metrics table)
  SELECT COALESCE(
    (
      SELECT LEAST(100, AVG(value))
      FROM fitness_metrics
      WHERE user_id = p_user_id 
        AND metric_type IN ('sleep_duration', 'heart_rate_avg', 'stress_level', 'health_score')
        AND recorded_at::DATE = p_date
    ), 0
  ) INTO health_score;

  -- Calculate productivity score (based on task completion and time metrics)
  SELECT COALESCE(
    (
      SELECT LEAST(100, AVG(
        CASE 
          WHEN actual_duration IS NOT NULL AND estimated_duration IS NOT NULL AND estimated_duration > 0
          THEN GREATEST(0, 100 - (ABS(actual_duration - estimated_duration)::DECIMAL / estimated_duration * 100))
          ELSE 50 -- Default productivity score when no time data
        END
      ))
      FROM time_sessions ts
      JOIN tasks t ON ts.task_id = t.id
      WHERE t.user_id = p_user_id 
        AND ts.start_time::DATE = p_date
    ), 50 -- Default productivity score
  ) INTO productivity_score;

  -- Calculate content score (based on content engagement)
  SELECT COALESCE(
    (
      SELECT LEAST(100, COUNT(*) * 10) -- 10 points per content item, max 100
      FROM content_entries
      WHERE user_id = p_user_id 
        AND (completed_at::DATE = p_date OR started_at::DATE = p_date)
    ), 0
  ) INTO content_score;

  -- Calculate overall score (weighted average)
  overall_score := (
    habits_score * 0.3 +        -- 30% weight for habits
    tasks_score * 0.25 +         -- 25% weight for tasks  
    health_score * 0.2 +         -- 20% weight for health
    productivity_score * 0.15 +  -- 15% weight for productivity
    content_score * 0.1          -- 10% weight for content
  );

  -- Build result JSON
  result := jsonb_build_object(
    'overall_score', overall_score,
    'habits_score', habits_score,
    'tasks_score', tasks_score,
    'health_score', health_score,
    'productivity_score', productivity_score,
    'content_score', content_score,
    'date', p_date,
    'calculated_at', NOW()
  );

  -- Store the result in life_optimization_scores table
  INSERT INTO life_optimization_scores (
    user_id,
    overall_score,
    habits_score,
    tasks_score,
    health_score,
    productivity_score,
    content_score,
    score_date
  ) VALUES (
    p_user_id,
    overall_score,
    habits_score,
    tasks_score,
    health_score,
    productivity_score,
    content_score,
    p_date
  )
  ON CONFLICT (user_id, score_date) 
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    habits_score = EXCLUDED.habits_score,
    tasks_score = EXCLUDED.tasks_score,
    health_score = EXCLUDED.health_score,
    productivity_score = EXCLUDED.productivity_score,
    content_score = EXCLUDED.content_score,
    updated_at = NOW();

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the fix
COMMENT ON FUNCTION calculate_life_optimization_score(UUID, DATE) IS 
'Fixed version that uses new schema tables (fitness_metrics, etc.) instead of old metrics table';