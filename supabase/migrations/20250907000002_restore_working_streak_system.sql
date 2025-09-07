-- Restore the beautiful working habit streak calculation system
-- This restores the original database functions that were accidentally removed

-- ============================================================================
-- 1. RESTORE STREAK CALCULATION FUNCTION
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS calculate_habit_streak(UUID, DATE);

-- Optimized streak calculation function (restored from working system)
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
-- 2. RESTORE BATCH STREAK UPDATE FUNCTION
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
-- 3. RESTORE AUTOMATIC STREAK UPDATE TRIGGERS
-- ============================================================================

-- Create trigger function to automatically update streaks when habits are logged
CREATE OR REPLACE FUNCTION trigger_update_habit_streaks()
RETURNS TRIGGER AS $$
DECLARE
    streak_result RECORD;
BEGIN
    -- Calculate new streak for the affected habit
    SELECT * INTO streak_result 
    FROM calculate_habit_streak(NEW.habit_id, NEW.date);
    
    -- Update the habit with new streak values
    UPDATE habits 
    SET 
        streak_count = streak_result.current_streak,
        best_streak = GREATEST(COALESCE(best_streak, 0), streak_result.best_streak),
        updated_at = NOW()
    WHERE id = NEW.habit_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update streaks on habit entry insertion/update
DROP TRIGGER IF EXISTS update_habit_streaks_on_entry ON habit_entries;
CREATE TRIGGER update_habit_streaks_on_entry
  AFTER INSERT OR UPDATE ON habit_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_habit_streaks();

-- ============================================================================
-- 4. RESTORE DUPLICATE PREVENTION FOR IMPORTS
-- ============================================================================

-- Enhanced function to handle habit imports without duplicates
CREATE OR REPLACE FUNCTION insert_habit_entry_safe(
    p_habit_id UUID,
    p_user_id UUID,
    p_date DATE,
    p_value INTEGER,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    entry_id UUID;
    existing_entry_id UUID;
BEGIN
    -- Check if entry already exists for this habit and date
    SELECT id INTO existing_entry_id
    FROM habit_entries
    WHERE habit_id = p_habit_id 
      AND user_id = p_user_id 
      AND date = p_date;
    
    IF existing_entry_id IS NOT NULL THEN
        -- Update existing entry instead of creating duplicate
        UPDATE habit_entries 
        SET 
            value = GREATEST(value, p_value), -- Keep higher value
            notes = COALESCE(p_notes, notes),
            logged_at = NOW()
        WHERE id = existing_entry_id;
        
        RETURN existing_entry_id;
    ELSE
        -- Insert new entry
        INSERT INTO habit_entries (
            habit_id, user_id, date, value, notes, logged_at
        ) VALUES (
            p_habit_id, p_user_id, p_date, p_value, p_notes, NOW()
        ) RETURNING id INTO entry_id;
        
        RETURN entry_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for restored functions
GRANT EXECUTE ON FUNCTION calculate_habit_streak(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_habit_streaks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_habit_entry_safe(UUID, UUID, DATE, INTEGER, TEXT) TO authenticated;

-- ============================================================================
-- 6. FIX EXISTING DATA
-- ============================================================================

-- Update existing habits with calculated streaks to fix the 0 streak issue
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Process each user with habits
    FOR user_record IN (SELECT DISTINCT user_id FROM habits WHERE is_active = true) LOOP
        PERFORM update_user_habit_streaks(user_record.user_id);
    END LOOP;
    
    RAISE NOTICE 'Successfully recalculated streaks for all users';
END $$;

-- Add comment
COMMENT ON SCHEMA public IS 'Restored the beautiful working habit streak calculation system with automatic updates and duplicate prevention';