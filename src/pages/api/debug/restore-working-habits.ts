// Debug endpoint to restore the working habits system
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  const serverAuth = createServerAuth(cookies);
  
  try {
    const user = await serverAuth.requireAuth();
    
    console.log('🔧 Restoring beautiful working habits system...');
    
    // SQL to restore the working system
    const restoreSQL = `
      -- 1. Drop existing functions to recreate them
      DROP FUNCTION IF EXISTS calculate_habit_streak(UUID, DATE);
      DROP FUNCTION IF EXISTS update_user_habit_streaks(UUID);
      DROP FUNCTION IF EXISTS insert_habit_entry_safe(UUID, UUID, DATE, INTEGER, TEXT);
      DROP FUNCTION IF EXISTS trigger_update_habit_streaks();
      DROP TRIGGER IF EXISTS update_habit_streaks_on_entry ON habit_entries;
      
      -- 2. Restore optimized streak calculation function
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
      
      -- 3. Restore batch streak update function
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
      
      -- 4. Restore safe insertion function for duplicate prevention
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
      
      -- 5. Restore automatic streak update trigger
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
      CREATE TRIGGER update_habit_streaks_on_entry
        AFTER INSERT OR UPDATE ON habit_entries
        FOR EACH ROW
        EXECUTE FUNCTION trigger_update_habit_streaks();
      
      -- Grant permissions
      GRANT EXECUTE ON FUNCTION calculate_habit_streak(UUID, DATE) TO authenticated;
      GRANT EXECUTE ON FUNCTION update_user_habit_streaks(UUID) TO authenticated;
      GRANT EXECUTE ON FUNCTION insert_habit_entry_safe(UUID, UUID, DATE, INTEGER, TEXT) TO authenticated;
    `;
    
    // Split into individual commands and execute them
    const commands = restoreSQL.split(';').filter(cmd => cmd.trim().length > 0);
    let successCount = 0;
    const errors = [];
    
    for (const command of commands) {
      const cleanCommand = command.trim();
      if (!cleanCommand) continue;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: cleanCommand });
        if (error) {
          console.warn(`⚠️ Command failed: ${cleanCommand.substring(0, 50)}...`, error);
          errors.push({ command: cleanCommand.substring(0, 100), error: error.message });
        } else {
          successCount++;
          console.log(`✅ Executed: ${cleanCommand.substring(0, 50)}...`);
        }
      } catch (err: any) {
        console.warn(`⚠️ Command failed: ${cleanCommand.substring(0, 50)}...`, err);
        errors.push({ command: cleanCommand.substring(0, 100), error: err.message });
      }
    }
    
    // Now recalculate streaks for all existing habits
    console.log('🔥 Recalculating streaks for all existing habits...');
    
    const { data: users } = await supabase
      .from('habits')
      .select('user_id')
      .eq('is_active', true);
    
    const uniqueUsers = [...new Set(users?.map(h => h.user_id) || [])];
    let streakUpdateResults = [];
    
    for (const userId of uniqueUsers) {
      try {
        const { data: results, error } = await supabase
          .rpc('update_user_habit_streaks', { p_user_id: userId });
          
        if (error) {
          console.error(`Failed to update streaks for user ${userId}:`, error);
        } else {
          streakUpdateResults.push({ userId, updated: results?.length || 0 });
          console.log(`✅ Updated streaks for user ${userId}: ${results?.length || 0} habits`);
        }
      } catch (err: any) {
        console.error(`Exception updating streaks for user ${userId}:`, err);
      }
    }
    
    return new Response(JSON.stringify({ 
      success: successCount > 0, 
      message: `Restored working habits system: ${successCount}/${commands.length} commands executed successfully`,
      successCount,
      totalCommands: commands.length,
      streakUpdates: streakUpdateResults,
      errors: errors.length > 0 ? errors : undefined
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('🚨 Restoration failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Restoration failed', 
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};