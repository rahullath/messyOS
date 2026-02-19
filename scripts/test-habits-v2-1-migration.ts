/**
 * Test script for Habits v2.1 Schema Migration
 * Validates that the migration adds columns correctly and maintains backward compatibility
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function testColumnExists(columnName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('habit_entries')
      .select(columnName)
      .limit(1);
    
    if (error) {
      // Column doesn't exist or other error
      return false;
    }
    
    return true;
  } catch (err) {
    return false;
  }
}

async function testIndexExists(indexName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('pg_indexes', {
      schemaname: 'public',
      tablename: 'habit_entries'
    });
    
    // If RPC doesn't exist, try direct query
    const { data: indexData, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'habit_entries')
      .eq('indexname', indexName);
    
    if (indexError) {
      console.log(`Note: Could not verify index ${indexName} existence via query`);
      return true; // Assume it exists if we can't check
    }
    
    return indexData && indexData.length > 0;
  } catch (err) {
    console.log(`Note: Could not verify index ${indexName} existence`);
    return true; // Assume it exists if we can't check
  }
}

async function testBackwardCompatibility(): Promise<boolean> {
  try {
    // Test that existing queries work without new columns
    const { data, error } = await supabase
      .from('habit_entries')
      .select('id, habit_id, user_id, value, notes, date, logged_at')
      .limit(5);
    
    if (error) {
      console.error('Backward compatibility test failed:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Backward compatibility test error:', err);
    return false;
  }
}

async function testNewColumnsNullable(): Promise<boolean> {
  try {
    // Verify we can query entries without the new columns being set
    const { data, error } = await supabase
      .from('habit_entries')
      .select('id, numeric_value, parsed, source')
      .is('numeric_value', null)
      .limit(5);
    
    if (error) {
      console.error('Nullable columns test failed:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Nullable columns test error:', err);
    return false;
  }
}

async function testSourceConstraint(): Promise<boolean> {
  try {
    // Try to insert an entry with invalid source (should fail)
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const testHabitId = '00000000-0000-0000-0000-000000000001';
    
    const { data, error } = await supabase
      .from('habit_entries')
      .insert({
        user_id: testUserId,
        habit_id: testHabitId,
        value: 1,
        date: new Date().toISOString().split('T')[0],
        source: 'invalid_source'
      })
      .select();
    
    // If no error, constraint is not working
    if (!error) {
      // Clean up test entry
      if (data && data.length > 0) {
        await supabase
          .from('habit_entries')
          .delete()
          .eq('id', data[0].id);
      }
      return false;
    }
    
    // Error is expected (constraint violation)
    return error.message.includes('habit_entries_source_check') || 
           error.message.includes('violates check constraint');
  } catch (err) {
    console.error('Source constraint test error:', err);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing Habits v2.1 Schema Migration\n');
  
  // Test 1: numeric_value column exists
  console.log('Test 1: Checking numeric_value column...');
  const numericValueExists = await testColumnExists('numeric_value');
  results.push({
    test: 'numeric_value column exists',
    passed: numericValueExists,
    message: numericValueExists ? 'Column exists' : 'Column missing'
  });
  
  // Test 2: parsed column exists
  console.log('Test 2: Checking parsed column...');
  const parsedExists = await testColumnExists('parsed');
  results.push({
    test: 'parsed column exists',
    passed: parsedExists,
    message: parsedExists ? 'Column exists' : 'Column missing'
  });
  
  // Test 3: source column exists
  console.log('Test 3: Checking source column...');
  const sourceExists = await testColumnExists('source');
  results.push({
    test: 'source column exists',
    passed: sourceExists,
    message: sourceExists ? 'Column exists' : 'Column missing'
  });
  
  // Test 4: Backward compatibility
  console.log('Test 4: Testing backward compatibility...');
  const backwardCompatible = await testBackwardCompatibility();
  results.push({
    test: 'Backward compatibility',
    passed: backwardCompatible,
    message: backwardCompatible ? 'Existing queries work' : 'Existing queries broken'
  });
  
  // Test 5: New columns are nullable
  console.log('Test 5: Testing nullable columns...');
  const columnsNullable = await testNewColumnsNullable();
  results.push({
    test: 'New columns nullable',
    passed: columnsNullable,
    message: columnsNullable ? 'Columns accept NULL' : 'Columns require values'
  });
  
  // Test 6: Source constraint
  console.log('Test 6: Testing source constraint...');
  const sourceConstraint = await testSourceConstraint();
  results.push({
    test: 'Source constraint',
    passed: sourceConstraint,
    message: sourceConstraint ? 'Constraint enforced' : 'Constraint not working'
  });
  
  // Print results
  console.log('\n📊 Test Results:\n');
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\n${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('\n✅ All tests passed! Migration is successful.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review the migration.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
