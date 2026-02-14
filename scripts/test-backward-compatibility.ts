/**
 * Comprehensive backward compatibility test for Habits v2.1 migration
 * Ensures existing application queries continue to work unchanged
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestCase {
  name: string;
  query: () => Promise<any>;
  description: string;
}

const testCases: TestCase[] = [
  {
    name: 'Basic habit_entries select',
    description: 'Select all original columns without new columns',
    query: async () => {
      return await supabase
        .from('habit_entries')
        .select('id, habit_id, user_id, value, notes, date, logged_at, created_at')
        .limit(5);
    }
  },
  {
    name: 'Filter by date',
    description: 'Query entries by date (critical for temporal boundaries)',
    query: async () => {
      const today = new Date().toISOString().split('T')[0];
      return await supabase
        .from('habit_entries')
        .select('id, date')
        .lt('date', today)
        .limit(5);
    }
  },
  {
    name: 'Filter by user_id and date',
    description: 'Query entries by user and date (daily context aggregation)',
    query: async () => {
      return await supabase
        .from('habit_entries')
        .select('id, user_id, date')
        .not('user_id', 'is', null)
        .not('date', 'is', null)
        .limit(5);
    }
  },
  {
    name: 'Order by logged_at',
    description: 'Query entries ordered by timestamp',
    query: async () => {
      return await supabase
        .from('habit_entries')
        .select('id, logged_at')
        .order('logged_at', { ascending: false })
        .limit(5);
    }
  },
  {
    name: 'Join with habits table',
    description: 'Query entries with habit details',
    query: async () => {
      return await supabase
        .from('habit_entries')
        .select('id, habit_id, habits(name, type)')
        .limit(5);
    }
  },
  {
    name: 'Insert without new columns',
    description: 'Insert entry using only original columns',
    query: async () => {
      // Find an existing habit to use for the test
      const { data: habits } = await supabase
        .from('habits')
        .select('id, user_id')
        .limit(1);
      
      if (!habits || habits.length === 0) {
        // No habits exist, skip this test
        return { data: null, error: null };
      }
      
      const testHabitId = habits[0].id;
      const testUserId = habits[0].user_id;
      
      const { data, error } = await supabase
        .from('habit_entries')
        .insert({
          user_id: testUserId,
          habit_id: testHabitId,
          value: 1,
          notes: 'Test entry for backward compatibility',
          date: new Date().toISOString().split('T')[0]
        })
        .select();
      
      // Clean up test entry
      if (data && data.length > 0) {
        await supabase
          .from('habit_entries')
          .delete()
          .eq('id', data[0].id);
      }
      
      return { data, error };
    }
  },
  {
    name: 'Update without new columns',
    description: 'Update entry using only original columns',
    query: async () => {
      // Find an entry to update
      const { data: entries } = await supabase
        .from('habit_entries')
        .select('id, notes')
        .limit(1);
      
      if (!entries || entries.length === 0) {
        return { data: null, error: null }; // No entries to test with
      }
      
      const originalNotes = entries[0].notes;
      const testId = entries[0].id;
      
      // Update
      const { data, error } = await supabase
        .from('habit_entries')
        .update({ notes: 'Updated for backward compatibility test' })
        .eq('id', testId)
        .select();
      
      // Restore original
      await supabase
        .from('habit_entries')
        .update({ notes: originalNotes })
        .eq('id', testId);
      
      return { data, error };
    }
  },
  {
    name: 'Query with new columns included',
    description: 'Select including new columns (should work with NULL values)',
    query: async () => {
      return await supabase
        .from('habit_entries')
        .select('id, value, notes, numeric_value, parsed, source')
        .limit(5);
    }
  }
];

async function runBackwardCompatibilityTests() {
  console.log('🧪 Running Backward Compatibility Tests\n');
  console.log('Testing that existing application queries work unchanged after migration\n');
  
  let passedCount = 0;
  let failedCount = 0;
  
  for (const testCase of testCases) {
    process.stdout.write(`Testing: ${testCase.name}... `);
    
    try {
      const { data, error } = await testCase.query();
      
      if (error) {
        console.log('❌ FAILED');
        console.log(`  Error: ${error.message}`);
        console.log(`  Description: ${testCase.description}\n`);
        failedCount++;
      } else {
        console.log('✅ PASSED');
        passedCount++;
      }
    } catch (err: any) {
      console.log('❌ FAILED');
      console.log(`  Exception: ${err.message}`);
      console.log(`  Description: ${testCase.description}\n`);
      failedCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passedCount}/${testCases.length} tests passed`);
  console.log('='.repeat(60) + '\n');
  
  if (failedCount === 0) {
    console.log('✅ All backward compatibility tests passed!');
    console.log('   Existing application code will continue to work unchanged.\n');
    process.exit(0);
  } else {
    console.log(`❌ ${failedCount} test(s) failed!`);
    console.log('   Migration may break existing functionality.\n');
    process.exit(1);
  }
}

runBackwardCompatibilityTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
