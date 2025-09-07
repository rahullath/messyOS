-- Habits Performance Optimization Migration
-- Comprehensive database optimizations for habits module

-- ============================================================================
-- 1. ADVANCED INDEXING STRATEGY
-- ============================================================================

-- Drop existing basic indexes to recreate with better strategy
DROP INDEX IF EXISTS idx_habits_user_active;
DROP INDEX IF EXISTS idx_habits_user_position;
DROP INDEX IF EXISTS idx_habit_entries_user_date;
DROP INDEX IF EXISTS idx_habit_entries_habit_date;
DROP INDEX IF EXISTS idx_habit_entries_date;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_habits_user_active_position 
ON habits(user_id, is_active, position) 
WHERE user_id IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_habits_user_category_type 
ON habits(user_id, category, type) 
WHERE user_id IS NOT NULL;

-- Optimized indexes for habit entries with date-based queries
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_date_desc 
ON habit_entries(user_id, date DESC, habit_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date_value 
ON habit_entries(habit_id, date DESC, value) 
WHERE habit_id IS NOT NULL;

-- Index for streak calculations (consecutive date queries)
CREATE INDEX IF NOT EXISTS idx_habit_entries_streak_calc 
ON habit_entries(habit_id, date, value) 
WHERE habit_id IS NOT NULL AND value IS NOT NULL;

-- Context data indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_habit_entries_context_analytics 
ON habit_entries USING GIN(context_tags) 
WHERE context_tags IS NOT NULL AND array_length(context_tags, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_habit_entries_mood_energy 
ON habit_entries(user_id, mood, energy_level, date) 
WHERE user_id IS NOT NULL AND mood IS NOT NULL AND energy_level IS NOT NULL;

-- Location-based analytics index
CREATE INDEX IF NOT EXISTS idx_habit_entries_location_success 
ON habit_entries(user_id, location, value, date) 
WHERE user_id IS NOT NULL AND location IS NOT NULL;

-- Time-based completion patterns
CREATE INDEX IF NOT EXISTS idx_habit_entries_completion_time 
ON habit_entries(user_id, completion_time, value, date) 
WHERE user_id IS NOT NULL AND completion_time IS NOT NULL;

-- ============================================================================
-- 2. MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Daily habit completion summary (for dashboard performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS habit_daily_summary AS
SELECT 
    user_id,
    date,
    COUNT(*) as total_habits_logged,
    COUNT(*) FILTER (WHERE value > 0) as completed_habits,
    ROUND(
        (COUNT(*) FILTER (WHERE value > 0)::decimal / COUNT(*)) * 100, 2
    ) as completion_rate,
    AVG(effort) FILTER (WHERE effort IS NOT NULL) as avg_effort,
    AVG(mood) FILTER (WHERE mood IS NOT NULL) as avg_mood,
    AVG(energy_level) FILTER (WHERE energy_level IS NOT NULL) as avg_energy,
    array_agg(DISTINCT location) FILTER (WHERE location IS NOT NULL) as locations,
    -- Note: Simplified tags aggregation to avoid set-returning function in aggregate
    jsonb_agg(DISTINCT context_tags) FILTER (WHERE context_tags IS NOT NULL) as all_tags
FROM habit_entries 
WHERE user_id IS NOT NULL
GROUP BY user_id, date;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_daily_summary_user_date 
ON habit_daily_summary(user_id, date);

-- Weekly habit statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS habit_weekly_stats AS
SELECT 
    he.user_id,
    he.habit_id,
    date_trunc('week', he.date) as week_start,
    COUNT(*) as entries_count,
    COUNT(*) FILTER (WHERE value > 0) as completions,
    ROUND(
        (COUNT(*) FILTER (WHERE value > 0)::decimal / COUNT(*)) * 100, 2
    ) as weekly_completion_rate,
    MAX(value) as max_value,
    AVG(value) as avg_value,
    AVG(effort) FILTER (WHERE effort IS NOT NULL) as avg_effort,
    AVG(mood) FILTER (WHERE mood IS NOT NULL) as avg_mood,
    AVG(energy_level) FILTER (WHERE energy_level IS NOT NULL) as avg_energy
FROM habit_entries he
JOIN habits h ON he.habit_id = h.id
WHERE he.user_id IS NOT NULL AND h.is_active = true
GROUP BY he.user_id, he.habit_id, date_trunc('week', he.date);

-- Create index on weekly stats
CREATE INDEX IF NOT EXISTS idx_habit_weekly_stats_user_week 
ON habit_weekly_stats(user_id, week_start DESC);

-- ============================================================================
-- 3. OPTIMIZED STREAK CALCULATION FUNCTION
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS calculate_habit_streak(UUID, DATE);

-- Optimized streak calculation function
CREATE OR REPLACE FUNCTION calculate_habit_streak(
    p_habit_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
    current_streak INTEGER,
    best_streak INTEGER,
    streak_type TEXT
) AS $$
DECLARE
    habit_type TEXT;
    current_streak_count INTEGER := 0;
    best_streak_count INTEGER := 0;
    temp_streak INTEGER := 0;
    entry_record RECORD;
    expected_value INTEGER;
BEGIN
    -- Get habit type to determine success criteria
    SELECT type INTO habit_type FROM habits WHERE id = p_habit_id;
    
    -- Set expected value based on habit type
    expected_value := CASE 
        WHEN habit_type = 'break' THEN 0  -- For break habits, 0 is success
        ELSE 1  -- For build/maintain habits, 1+ is success
    END;
    
    -- Calculate streaks using optimized query with window functions
    FOR entry_record IN (
        WITH daily_success AS (
            SELECT 
                date,
                CASE 
                    WHEN habit_type = 'break' THEN (value = 0 OR value IS NULL)
                    ELSE (value > 0)
                END as is_success,
                ROW_NUMBER() OVER (ORDER BY date DESC) as row_num
            FROM habit_entries 
            WHERE habit_id = p_habit_id 
                AND date <= p_as_of_date
                AND date >= p_as_of_date - INTERVAL '365 days'  -- Limit to last year for performance
            ORDER BY date DESC
        ),
        streak_groups AS (
            SELECT 
                date,
                is_success,
                row_num,
                row_num - ROW_NUMBER() OVER (PARTITION BY is_success ORDER BY date DESC) as streak_group
            FROM daily_success
        )
        SELECT 
            date,
            is_success,
            COUNT(*) OVER (PARTITION BY streak_group, is_success ORDER BY date DESC) as streak_length,
            row_num
        FROM streak_groups
        ORDER BY date DESC
    ) LOOP
        -- Calculate current streak (from most recent date)
        IF entry_record.row_num = 1 THEN
            IF entry_record.is_success THEN
                current_streak_count := entry_record.streak_length;
            ELSE
                current_streak_count := 0;
            END IF;
        END IF;
        
        -- Track best streak
        IF entry_record.is_success THEN
            best_streak_count := GREATEST(best_streak_count, entry_record.streak_length);
        END IF;
    END LOOP;
    
    -- Return results
    RETURN QUERY SELECT 
        current_streak_count,
        best_streak_count,
        habit_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. BATCH STREAK UPDATE FUNCTION
-- ============================================================================

-- Function to update streaks for all habits of a user efficiently
CREATE OR REPLACE FUNCTION update_user_habit_streaks(p_user_id UUID)
RETURNS TABLE(
    habit_id UUID,
    old_streak INTEGER,
    new_current_streak INTEGER,
    new_best_streak INTEGER
) AS $$
DECLARE
    habit_record RECORD;
    streak_result RECORD;
BEGIN
    -- Process each active habit for the user
    FOR habit_record IN (
        SELECT id, streak_count, best_streak 
        FROM habits 
        WHERE user_id = p_user_id AND is_active = true
    ) LOOP
        -- Calculate new streaks
        SELECT * INTO streak_result 
        FROM calculate_habit_streak(habit_record.id);
        
        -- Update habit with new streak values
        UPDATE habits 
        SET 
            streak_count = streak_result.current_streak,
            best_streak = GREATEST(COALESCE(best_streak, 0), streak_result.best_streak),
            updated_at = NOW()
        WHERE id = habit_record.id;
        
        -- Return the changes
        RETURN QUERY SELECT 
            habit_record.id,
            habit_record.streak_count,
            streak_result.current_streak,
            GREATEST(COALESCE(habit_record.best_streak, 0), streak_result.best_streak);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ANALYTICS AGGREGATION FUNCTIONS
-- ============================================================================

-- Function to get habit completion rates with context analysis
CREATE OR REPLACE FUNCTION get_habit_analytics(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30,
    p_habit_ids UUID[] DEFAULT NULL
) RETURNS TABLE(
    habit_id UUID,
    habit_name TEXT,
    total_entries INTEGER,
    successful_entries INTEGER,
    completion_rate DECIMAL,
    avg_effort DECIMAL,
    avg_mood DECIMAL,
    avg_energy DECIMAL,
    best_locations TEXT[],
    best_weather TEXT[],
    optimal_times TIME[],
    success_tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH habit_stats AS (
        SELECT 
            h.id as habit_id,
            h.name as habit_name,
            COUNT(he.*) as total_entries,
            COUNT(*) FILTER (WHERE 
                CASE 
                    WHEN h.type = 'break' THEN he.value = 0 OR he.value IS NULL
                    ELSE he.value > 0
                END
            ) as successful_entries,
            AVG(he.effort) FILTER (WHERE he.effort IS NOT NULL) as avg_effort,
            AVG(he.mood) FILTER (WHERE he.mood IS NOT NULL) as avg_mood,
            AVG(he.energy_level) FILTER (WHERE he.energy_level IS NOT NULL) as avg_energy
        FROM habits h
        LEFT JOIN habit_entries he ON h.id = he.habit_id 
            AND he.date >= CURRENT_DATE - INTERVAL '1 day' * p_days
        WHERE h.user_id = p_user_id 
            AND h.is_active = true
            AND (p_habit_ids IS NULL OR h.id = ANY(p_habit_ids))
        GROUP BY h.id, h.name, h.type
    ),
    context_analysis AS (
        SELECT 
            h.id as habit_id,
            -- Best locations (where success rate > average)
            array_agg(DISTINCT he.location) FILTER (
                WHERE he.location IS NOT NULL 
                AND he.value > 0
            ) as best_locations,
            -- Best weather conditions
            array_agg(DISTINCT he.weather) FILTER (
                WHERE he.weather IS NOT NULL 
                AND he.value > 0
            ) as best_weather,
            -- Optimal completion times
            array_agg(DISTINCT he.completion_time) FILTER (
                WHERE he.completion_time IS NOT NULL 
                AND he.value > 0
            ) as optimal_times,
            -- Success-associated tags
            -- Note: Simplified tags aggregation to avoid set-returning function in aggregate
            jsonb_agg(DISTINCT he.context_tags) FILTER (
                WHERE he.context_tags IS NOT NULL 
                AND he.value > 0
            ) as success_tags
        FROM habits h
        LEFT JOIN habit_entries he ON h.id = he.habit_id 
            AND he.date >= CURRENT_DATE - INTERVAL '1 day' * p_days
        WHERE h.user_id = p_user_id 
            AND h.is_active = true
            AND (p_habit_ids IS NULL OR h.id = ANY(p_habit_ids))
        GROUP BY h.id
    )
    SELECT 
        hs.habit_id,
        hs.habit_name,
        hs.total_entries,
        hs.successful_entries,
        CASE 
            WHEN hs.total_entries > 0 
            THEN ROUND((hs.successful_entries::decimal / hs.total_entries) * 100, 2)
            ELSE 0
        END as completion_rate,
        ROUND(hs.avg_effort, 2) as avg_effort,
        ROUND(hs.avg_mood, 2) as avg_mood,
        ROUND(hs.avg_energy, 2) as avg_energy,
        ca.best_locations,
        ca.best_weather,
        ca.optimal_times,
        ca.success_tags
    FROM habit_stats hs
    LEFT JOIN context_analysis ca ON hs.habit_id = ca.habit_id
    ORDER BY hs.completion_rate DESC, hs.total_entries DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. REFRESH MATERIALIZED VIEWS FUNCTION
-- ============================================================================

-- Function to refresh analytics materialized views
CREATE OR REPLACE FUNCTION refresh_habit_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW habit_daily_summary;
    REFRESH MATERIALIZED VIEW habit_weekly_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. PERFORMANCE MONITORING
-- ============================================================================

-- Create table to track query performance
CREATE TABLE IF NOT EXISTS habit_query_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    user_id UUID,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_habit_query_performance_type_time 
ON habit_query_performance(query_type, created_at DESC);

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
    p_query_type TEXT,
    p_execution_time_ms INTEGER,
    p_user_id UUID DEFAULT NULL,
    p_parameters JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO habit_query_performance (
        query_type, 
        execution_time_ms, 
        user_id, 
        parameters
    ) VALUES (
        p_query_type, 
        p_execution_time_ms, 
        p_user_id, 
        p_parameters
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to clean up old performance logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_performance_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM habit_query_performance 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION calculate_habit_streak(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_habit_streaks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_habit_analytics(UUID, INTEGER, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_habit_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION log_query_performance(TEXT, INTEGER, UUID, JSONB) TO authenticated;

-- Grant permissions for materialized views
GRANT SELECT ON habit_daily_summary TO authenticated;
GRANT SELECT ON habit_weekly_stats TO authenticated;

-- Grant permissions for performance monitoring
GRANT SELECT ON habit_query_performance TO authenticated;

-- ============================================================================
-- 10. INITIAL DATA POPULATION
-- ============================================================================

-- Populate materialized views with existing data
SELECT refresh_habit_analytics();

-- Update existing habits with calculated streaks
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN (SELECT DISTINCT user_id FROM habits WHERE is_active = true) LOOP
        PERFORM update_user_habit_streaks(user_record.user_id);
    END LOOP;
END $$;

-- ============================================================================
-- 11. SCHEDULED MAINTENANCE (Comments for cron setup)
-- ============================================================================

-- The following should be set up as cron jobs or scheduled tasks:
-- 
-- 1. Refresh materialized views every hour:
--    SELECT cron.schedule('refresh-habit-analytics', '0 * * * *', 'SELECT refresh_habit_analytics();');
--
-- 2. Clean up performance logs daily:
--    SELECT cron.schedule('cleanup-habit-performance', '0 2 * * *', 'SELECT cleanup_performance_logs();');
--
-- 3. Update habit streaks daily:
--    SELECT cron.schedule('update-habit-streaks', '0 1 * * *', 
--    'DO $$ DECLARE user_record RECORD; BEGIN 
--     FOR user_record IN (SELECT DISTINCT user_id FROM habits WHERE is_active = true) LOOP 
--       PERFORM update_user_habit_streaks(user_record.user_id); 
--     END LOOP; END $$;');

-- Migration: Comprehensive performance optimization for habits module including advanced indexing, materialized views, optimized functions, and monitoring