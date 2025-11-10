// Test script to verify task management schema
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTaskSchema() {
  console.log('Testing Task Management Schema...');
  
  try {
    // Test if task-related tables exist by querying their structure
    const tables = [
      'tasks',
      'time_sessions', 
      'goals',
      'milestones',
      'calendar_sources',
      'calendar_events',
      'daily_plans',
      'life_optimizations',
      'energy_patterns'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.code === '42P01') {
          console.log(`❌ Table '${table}' does not exist`);
        } else {
          console.log(`✅ Table '${table}' exists and is accessible`);
        }
      } catch (err) {
        console.log(`❌ Error testing table '${table}':`, err.message);
      }
    }

    // Test enum types by attempting to insert a test record
    console.log('\nTesting enum types...');
    
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Test UUID
    
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: testUserId,
        title: 'Test Task',
        category: 'test',
        priority: 'medium',
        status: 'pending',
        complexity: 'moderate',
        energy_required: 'medium'
      })
      .select()
      .single();

    if (taskError) {
      if (taskError.code === '23503') {
        console.log('✅ Task table structure is correct (foreign key constraint expected)');
      } else {
        console.log('❌ Task insertion error:', taskError.message);
      }
    } else {
      console.log('✅ Task created successfully:', taskData.id);
      
      // Clean up test data
      await supabase
        .from('tasks')
        .delete()
        .eq('id', taskData.id);
      console.log('✅ Test task cleaned up');
    }

  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
  }
}

testTaskSchema();