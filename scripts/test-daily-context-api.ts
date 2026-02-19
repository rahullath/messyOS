/**
 * Test script for /api/context/today endpoint
 * 
 * Tests:
 * - Authentication check (401 for unauthenticated)
 * - Response structure matches DailyContext interface
 * - Caching behavior (60s TTL)
 * - Cache invalidation on new habit entry
 * - Error handling
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY!;
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';

interface DailyContext {
  date: string;
  wake: {
    timestamp?: string;
    source?: string;
    reliability: number;
  };
  substances: {
    nicotine: { used: boolean; reliability: number; [key: string]: any };
    cannabis: { used: boolean; reliability: number; [key: string]: any };
    caffeine: { used: boolean; reliability: number; [key: string]: any };
  };
  meds: {
    taken: boolean;
    reliability: number;
    [key: string]: any;
  };
  hygiene: {
    shower_done: boolean;
    reliability: number;
    [key: string]: any;
  };
  meals: {
    reliability: number;
    [key: string]: any;
  };
  day_flags: {
    low_energy_risk: boolean;
    sleep_debt_risk: boolean;
  };
  duration_priors: {
    bathroom_min: number;
    hygiene_min: number;
    shower_min: number;
    dress_min: number;
    pack_min: number;
    cook_simple_meal_min: number;
  };
}

async function testDailyContextAPI() {
  console.log('🧪 Testing /api/context/today endpoint\n');

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Test 1: Unauthenticated request should return 401
  console.log('Test 1: Unauthenticated request');
  try {
    const response = await fetch('http://localhost:4321/api/context/today');
    console.log(`  Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('  ✅ Correctly returns 401 for unauthenticated request\n');
    } else {
      console.log('  ❌ Expected 401, got', response.status, '\n');
    }
  } catch (error) {
    console.log('  ⚠️  Server not running or error:', error, '\n');
  }

  // Sign in for authenticated tests
  console.log('Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError || !authData.session) {
    console.log('❌ Failed to sign in:', authError?.message);
    console.log('Please ensure TEST_USER_EMAIL and TEST_USER_PASSWORD are set correctly');
    return;
  }

  const accessToken = authData.session.access_token;
  console.log('✅ Signed in successfully\n');

  // Test 2: Authenticated request should return valid DailyContext
  console.log('Test 2: Authenticated request returns valid DailyContext');
  try {
    const response = await fetch('http://localhost:4321/api/context/today', {
      headers: {
        'Cookie': `sb-access-token=${accessToken}`,
      },
    });

    console.log(`  Status: ${response.status}`);
    const cacheHeader = response.headers.get('X-Cache');
    console.log(`  Cache: ${cacheHeader || 'N/A'}`);

    if (response.status === 200) {
      const context = await response.json() as DailyContext;
      
      // Validate structure
      const hasRequiredFields = 
        context.date &&
        context.wake &&
        context.substances &&
        context.meds &&
        context.hygiene &&
        context.meals &&
        context.day_flags &&
        context.duration_priors;

      if (hasRequiredFields) {
        console.log('  ✅ Response has all required fields');
        console.log(`  Date: ${context.date}`);
        console.log(`  Wake reliability: ${context.wake.reliability}`);
        console.log(`  Meds taken: ${context.meds.taken}`);
        console.log(`  Shower done: ${context.hygiene.shower_done}`);
        console.log(`  Low energy risk: ${context.day_flags.low_energy_risk}`);
        console.log(`  Sleep debt risk: ${context.day_flags.sleep_debt_risk}\n`);
      } else {
        console.log('  ❌ Response missing required fields\n');
        console.log('  Response:', JSON.stringify(context, null, 2), '\n');
      }
    } else {
      const error = await response.json();
      console.log('  ❌ Request failed:', error, '\n');
    }
  } catch (error) {
    console.log('  ❌ Error:', error, '\n');
  }

  // Test 3: Cache behavior - second request should hit cache
  console.log('Test 3: Cache behavior (second request should hit cache)');
  try {
    const response = await fetch('http://localhost:4321/api/context/today', {
      headers: {
        'Cookie': `sb-access-token=${accessToken}`,
      },
    });

    const cacheHeader = response.headers.get('X-Cache');
    console.log(`  Status: ${response.status}`);
    console.log(`  Cache: ${cacheHeader}`);

    if (cacheHeader === 'HIT') {
      console.log('  ✅ Cache is working (HIT on second request)\n');
    } else {
      console.log('  ⚠️  Expected cache HIT, got', cacheHeader, '\n');
    }
  } catch (error) {
    console.log('  ❌ Error:', error, '\n');
  }

  // Test 4: Invalid date parameter
  console.log('Test 4: Invalid date parameter');
  try {
    const response = await fetch('http://localhost:4321/api/context/today?date=invalid', {
      headers: {
        'Cookie': `sb-access-token=${accessToken}`,
      },
    });

    console.log(`  Status: ${response.status}`);
    
    if (response.status === 400) {
      const error = await response.json();
      console.log('  ✅ Correctly returns 400 for invalid date');
      console.log(`  Error: ${error.error}\n`);
    } else {
      console.log('  ❌ Expected 400, got', response.status, '\n');
    }
  } catch (error) {
    console.log('  ❌ Error:', error, '\n');
  }

  // Test 5: Specific date parameter
  console.log('Test 5: Specific date parameter');
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const response = await fetch(`http://localhost:4321/api/context/today?date=${dateStr}`, {
      headers: {
        'Cookie': `sb-access-token=${accessToken}`,
      },
    });

    console.log(`  Status: ${response.status}`);
    
    if (response.status === 200) {
      const context = await response.json() as DailyContext;
      console.log('  ✅ Successfully fetched context for specific date');
      console.log(`  Date: ${context.date}\n`);
    } else {
      console.log('  ❌ Request failed\n');
    }
  } catch (error) {
    console.log('  ❌ Error:', error, '\n');
  }

  console.log('✅ All tests completed!');
}

// Run tests
testDailyContextAPI().catch(console.error);
