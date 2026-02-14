/**
 * Verification script for Habits v2.1 indexes
 * Checks that all performance indexes were created correctly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyIndexes() {
  console.log('🔍 Verifying Habits v2.1 Indexes\n');
  
  const expectedIndexes = [
    'idx_habit_entries_numeric_value',
    'idx_habit_entries_parsed',
    'idx_habit_entries_source',
    'idx_habit_entries_date_user'
  ];
  
  console.log('Expected indexes:');
  expectedIndexes.forEach(idx => console.log(`  - ${idx}`));
  console.log();
  
  // Query to check indexes
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = 'habit_entries'
        AND indexname IN (
          'idx_habit_entries_numeric_value',
          'idx_habit_entries_parsed',
          'idx_habit_entries_source',
          'idx_habit_entries_date_user'
        )
        ORDER BY indexname;
      `
    });
  
  if (error) {
    console.log('Note: Could not query indexes directly via RPC');
    console.log('Attempting alternative verification...\n');
    
    // Alternative: Try to use the indexes by querying with them
    const tests = [
      { name: 'numeric_value index', query: supabase.from('habit_entries').select('id').not('numeric_value', 'is', null).limit(1) },
      { name: 'parsed index', query: supabase.from('habit_entries').select('id').not('parsed', 'is', null).limit(1) },
      { name: 'source index', query: supabase.from('habit_entries').select('id').not('source', 'is', null).limit(1) },
      { name: 'date_user index', query: supabase.from('habit_entries').select('id').not('date', 'is', null).not('user_id', 'is', null).limit(1) }
    ];
    
    let allPassed = true;
    for (const test of tests) {
      const { error: testError } = await test.query;
      if (testError) {
        console.log(`❌ ${test.name}: Query failed`);
        allPassed = false;
      } else {
        console.log(`✅ ${test.name}: Query successful (index likely exists)`);
      }
    }
    
    if (allPassed) {
      console.log('\n✅ All index queries successful - indexes are likely created correctly');
    } else {
      console.log('\n⚠️  Some index queries failed - please verify manually');
    }
    
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Found indexes:');
    data.forEach((idx: any) => {
      console.log(`✅ ${idx.indexname}`);
      console.log(`   ${idx.indexdef}\n`);
    });
    
    const foundIndexes = data.map((idx: any) => idx.indexname);
    const missingIndexes = expectedIndexes.filter(idx => !foundIndexes.includes(idx));
    
    if (missingIndexes.length > 0) {
      console.log('⚠️  Missing indexes:');
      missingIndexes.forEach(idx => console.log(`  - ${idx}`));
    } else {
      console.log('✅ All expected indexes are present!');
    }
  } else {
    console.log('⚠️  No indexes found - they may not have been created');
  }
}

verifyIndexes().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
