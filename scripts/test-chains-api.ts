/**
 * Test script for GET /api/chains/today endpoint
 * 
 * Tests:
 * 1. Basic chain generation with default parameters
 * 2. Chain generation with custom parameters
 * 3. Chain generation with no calendar events
 * 4. Error handling for invalid parameters
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY!;

// Test user credentials (use your test account)
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

async function testChainsAPI() {
  console.log('🧪 Testing GET /api/chains/today endpoint\n');

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let session;

  // Try to sign in if credentials are provided
  if (TEST_EMAIL && TEST_PASSWORD) {
    console.log('📝 Signing in with test credentials...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (authError || !authData.session) {
      console.error('❌ Authentication failed:', authError?.message);
      console.log('⚠️  Continuing with endpoint structure tests only\n');
    } else {
      console.log('✅ Signed in successfully\n');
      session = authData.session;
    }
  } else {
    console.log('⚠️  No test credentials provided (TEST_USER_EMAIL, TEST_USER_PASSWORD)');
    console.log('⚠️  Will test endpoint structure only\n');
  }
  const baseUrl = 'http://localhost:4321';

  // Test 1: Basic chain generation (today, default parameters)
  console.log('Test 1: Basic chain generation with defaults');
  console.log('─'.repeat(50));
  
  if (!session) {
    console.log('⚠️  Skipping (no authentication)\n');
  } else {
    try {
      const response = await fetch(`${baseUrl}/api/chains/today`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Request failed:', error);
      } else {
        const data = await response.json();
        console.log('✅ Success!');
        console.log('Date:', data.date);
        console.log('Anchors:', data.anchors.length);
        console.log('Chains:', data.chains.length);
        console.log('Home Intervals:', data.home_intervals.length);
        console.log('Wake Ramp:', data.wake_ramp ? 'Included' : 'Skipped');
        
        if (data.anchors.length > 0) {
          console.log('\nFirst Anchor:');
          console.log('  Title:', data.anchors[0].title);
          console.log('  Type:', data.anchors[0].type);
          console.log('  Must Attend:', data.anchors[0].must_attend);
        }

        if (data.chains.length > 0) {
          console.log('\nFirst Chain:');
          console.log('  Anchor:', data.chains[0].anchor.title);
          console.log('  Steps:', data.chains[0].steps.length);
          console.log('  Completion Deadline:', new Date(data.chains[0].chain_completion_deadline).toLocaleTimeString());
          console.log('  Status:', data.chains[0].status);
        }

        if (data.home_intervals.length > 0) {
          console.log('\nFirst Home Interval:');
          console.log('  Start:', new Date(data.home_intervals[0].start).toLocaleTimeString());
          console.log('  End:', new Date(data.home_intervals[0].end).toLocaleTimeString());
          console.log('  Duration:', data.home_intervals[0].duration, 'minutes');
        }
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
  console.log('\n');

  // Test 2: Chain generation with custom parameters
  console.log('Test 2: Chain generation with custom parameters');
  console.log('─'.repeat(50));
  
  if (!session) {
    console.log('⚠️  Skipping (no authentication)\n');
  } else {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const wakeTime = new Date(tomorrow);
      wakeTime.setHours(8, 0, 0, 0);

      const sleepTime = new Date(tomorrow);
      sleepTime.setHours(22, 30, 0, 0);

      const params = new URLSearchParams({
        date: tomorrowStr,
        wakeTime: wakeTime.toISOString(),
        sleepTime: sleepTime.toISOString(),
        energy: 'high',
      });

      const response = await fetch(`${baseUrl}/api/chains/today?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Request failed:', error);
      } else {
        const data = await response.json();
        console.log('✅ Success!');
        console.log('Date:', data.date);
        console.log('Anchors:', data.anchors.length);
        console.log('Chains:', data.chains.length);
        console.log('Wake Ramp:', data.wake_ramp ? `${data.wake_ramp.duration} minutes` : 'Skipped');
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
  console.log('\n');

  // Test 3: Error handling - invalid energy parameter
  console.log('Test 3: Error handling - invalid energy parameter');
  console.log('─'.repeat(50));
  
  if (!session) {
    console.log('⚠️  Skipping (no authentication)\n');
  } else {
    try {
      const params = new URLSearchParams({
        energy: 'invalid',
      });

      const response = await fetch(`${baseUrl}/api/chains/today?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.log('✅ Correctly rejected invalid parameter');
        console.log('Error:', error.error);
        console.log('Details:', error.details);
      } else {
        console.error('❌ Should have rejected invalid parameter');
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
  console.log('\n');

  // Test 4: Error handling - invalid date format
  console.log('Test 4: Error handling - invalid date format');
  console.log('─'.repeat(50));
  
  if (!session) {
    console.log('⚠️  Skipping (no authentication)\n');
  } else {
    try {
      const params = new URLSearchParams({
        date: 'not-a-date',
      });

      const response = await fetch(`${baseUrl}/api/chains/today?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.log('✅ Correctly rejected invalid date');
        console.log('Error:', error.error);
        console.log('Details:', error.details);
      } else {
        console.error('❌ Should have rejected invalid date');
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }
  console.log('\n');

  // Test 5: Unauthorized access (no token)
  console.log('Test 5: Unauthorized access (no token)');
  console.log('─'.repeat(50));
  try {
    const response = await fetch(`${baseUrl}/api/chains/today`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      console.log('✅ Correctly rejected unauthorized request');
      const error = await response.json();
      console.log('Error:', error.error);
    } else {
      console.error('❌ Should have rejected unauthorized request');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  console.log('\n');

  console.log('✅ All tests completed!');
}

// Run tests
testChainsAPI().catch(console.error);
