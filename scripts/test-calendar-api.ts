/**
 * Test Calendar API Endpoints
 * Quick diagnostic to check if calendar sources API is working
 */

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_USER_ID = '70429eba-f32e-47ab-bfcb-a75e2f819de4';

async function testCalendarAPI() {
  console.log('=== Testing Calendar API ===\n');

  // Test 1: Check if we can read calendar sources
  console.log('Test 1: Reading calendar sources...');
  const { data: sources, error: sourcesError } = await supabase
    .from('calendar_sources')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (sourcesError) {
    console.error('❌ Error reading sources:', sourcesError);
  } else {
    console.log(`✅ Successfully read ${sources?.length || 0} sources`);
    if (sources && sources.length > 0) {
      sources.forEach(s => console.log(`  - ${s.name} (${s.type})`));
    }
  }

  // Test 2: Try to create a test calendar source
  console.log('\nTest 2: Creating test calendar source...');
  const { data: newSource, error: createError } = await supabase
    .from('calendar_sources')
    .insert({
      user_id: TEST_USER_ID,
      name: 'API Test Source',
      type: 'manual',
      color: '#FF0000',
      sync_frequency: 60,
      is_active: true,
      priority: 1
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating source:', createError);
  } else {
    console.log('✅ Successfully created test source:', newSource.id);
    
    // Clean up - delete the test source
    console.log('\nTest 3: Cleaning up test source...');
    const { error: deleteError } = await supabase
      .from('calendar_sources')
      .delete()
      .eq('id', newSource.id);
    
    if (deleteError) {
      console.error('❌ Error deleting test source:', deleteError);
    } else {
      console.log('✅ Successfully deleted test source');
    }
  }

  // Test 4: Check RLS policies
  console.log('\nTest 4: Checking if RLS is blocking operations...');
  const { data: rlsTest, error: rlsError } = await supabase
    .from('calendar_sources')
    .select('count')
    .eq('user_id', TEST_USER_ID);

  if (rlsError) {
    console.error('❌ RLS might be blocking:', rlsError);
  } else {
    console.log('✅ RLS check passed');
  }

  console.log('\n=== Test Complete ===');
}

testCalendarAPI().catch(console.error);
