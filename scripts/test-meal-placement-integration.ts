// Test script to verify meal placement integration in plan builder
// This tests that meals are scheduled correctly using the new placement algorithm

import { createClient } from '@supabase/supabase-js';
import { PlanBuilderService } from '../src/lib/daily-plan/plan-builder';
import type { PlanInput } from '../src/types/daily-plan';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMealPlacementIntegration() {
  console.log('=== Testing Meal Placement Integration ===\n');

  // Test user ID (replace with actual test user)
  const userId = 'test-user-id';

  // Create plan builder service
  const planBuilder = new PlanBuilderService(supabase);

  // Test 1: Morning class scenario
  console.log('Test 1: Morning class scenario');
  console.log('Expected: Breakfast before class, lunch after class, dinner in evening\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0);

  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0);

  const planInput: PlanInput = {
    userId,
    date: today,
    wakeTime,
    sleepTime,
    energyState: 'medium',
  };

  try {
    const currentLocation = {
      name: 'Home',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    };

    const plan = await planBuilder.generateDailyPlan(planInput, currentLocation);

    console.log('\nGenerated Plan:');
    console.log(`Wake: ${plan.wakeTime.toLocaleTimeString()}`);
    console.log(`Sleep: ${plan.sleepTime.toLocaleTimeString()}`);
    console.log(`\nTime Blocks (${plan.timeBlocks?.length || 0} total):`);

    if (plan.timeBlocks) {
      const mealBlocks = plan.timeBlocks.filter(b => b.activityType === 'meal');
      
      console.log('\nMeal blocks:');
      for (const block of mealBlocks) {
        console.log(`  ${block.activityName}: ${block.startTime.toLocaleTimeString()} - ${block.endTime.toLocaleTimeString()}`);
      }

      // Verify meals are not all scheduled before 9am
      const nineAM = new Date(today);
      nineAM.setHours(9, 0, 0, 0);

      const mealsBeforeNine = mealBlocks.filter(b => b.startTime < nineAM);
      
      if (mealsBeforeNine.length === 3) {
        console.log('\n❌ FAIL: All three meals scheduled before 9am (the bug still exists)');
      } else {
        console.log('\n✅ PASS: Meals are spread throughout the day');
      }

      // Check meal spacing
      console.log('\nMeal spacing check:');
      for (let i = 1; i < mealBlocks.length; i++) {
        const prevMeal = mealBlocks[i - 1];
        const currentMeal = mealBlocks[i];
        const gapMinutes = (currentMeal.startTime.getTime() - prevMeal.endTime.getTime()) / 60000;
        
        console.log(`  Gap between ${prevMeal.activityName} and ${currentMeal.activityName}: ${Math.round(gapMinutes)} minutes`);
        
        if (gapMinutes < 180) {
          console.log(`    ⚠️  Warning: Gap is less than 3 hours`);
        }
      }
    }

    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testMealPlacementIntegration()
  .then(() => {
    console.log('\n=== All tests completed ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n=== Tests failed ===');
    console.error(error);
    process.exit(1);
  });
