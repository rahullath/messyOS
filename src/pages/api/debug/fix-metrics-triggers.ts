// Debug endpoint to fix the metrics table trigger issue
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  const serverAuth = createServerAuth(cookies);
  
  try {
    const user = await serverAuth.requireAuth();
    
    console.log('🔧 Fixing metrics table triggers...');
    
    // SQL to drop problematic triggers and functions
    const fixSQL = `
      -- Drop the problematic triggers
      DROP TRIGGER IF EXISTS update_life_score_trigger ON habit_entries;
      DROP TRIGGER IF EXISTS update_life_score_tasks_trigger ON tasks;
      
      -- Drop the problematic functions
      DROP FUNCTION IF EXISTS trigger_update_life_score();
      DROP FUNCTION IF EXISTS trigger_update_life_score_tasks();
      DROP FUNCTION IF EXISTS calculate_life_optimization_score(UUID, DATE);
      DROP FUNCTION IF EXISTS check_and_award_achievements(UUID);
    `;
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: fixSQL });
    
    if (error) {
      // Try alternative method - execute SQL directly
      console.log('🔄 Trying alternative SQL execution method...');
      
      // Split into individual commands and execute them
      const commands = [
        "DROP TRIGGER IF EXISTS update_life_score_trigger ON habit_entries",
        "DROP TRIGGER IF EXISTS update_life_score_tasks_trigger ON tasks", 
        "DROP FUNCTION IF EXISTS trigger_update_life_score()",
        "DROP FUNCTION IF EXISTS trigger_update_life_score_tasks()",
        "DROP FUNCTION IF EXISTS calculate_life_optimization_score(UUID, DATE)",
        "DROP FUNCTION IF EXISTS check_and_award_achievements(UUID)"
      ];
      
      let successCount = 0;
      const errors = [];
      
      for (const command of commands) {
        try {
          const { error: cmdError } = await supabase.rpc('exec_sql', { sql_query: command });
          if (cmdError) {
            console.warn(`⚠️ Command failed: ${command}`, cmdError);
            errors.push({ command, error: cmdError.message });
          } else {
            successCount++;
            console.log(`✅ Executed: ${command}`);
          }
        } catch (err) {
          console.warn(`⚠️ Command failed: ${command}`, err);
          errors.push({ command, error: err.message });
        }
      }
      
      return new Response(JSON.stringify({ 
        success: successCount > 0, 
        message: `Fixed ${successCount}/${commands.length} database objects`,
        successCount,
        totalCommands: commands.length,
        errors: errors.length > 0 ? errors : undefined
      }), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Triggers and functions dropped successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully fixed metrics table trigger issues',
      details: 'Dropped problematic triggers and functions that referenced old metrics table'
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('🚨 Fix failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Fix failed', 
      details: error.message,
      suggestion: 'You may need to run the SQL commands manually in Supabase dashboard'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};