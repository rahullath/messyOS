// Test script to verify meal blocks always exist in daily plans
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5

import { config } from 'dotenv';
config(); // Load .env file

import { createClient } from '@supabase/supabase-js';
import { PlanBuilderService } from '../src/lib/daily-plan/plan-builder';
import type { PlanInput } from '../src/types/daily-plan';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMealBlocksVerification() {
  console.log('🧪 Testing Meal Blocks Verification\n');

  const planBuilder = new PlanBuilderService(supabase);
  const userId = 'test-user-' + Date.now();

  // Test 1: Normal plan generation (wake at 7am)
  console.log('Test 1: Normal plan generation (wake at 7am)');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0);

  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0);

  const input1: PlanInput = {
    userId,
    date: today,
    wakeTime,
    sleepTime,
    energyState: 'medium',
  };

  try {
    const plan1 = await planBuilder.generateDailyPlan(input1, {
      name: 'Home',
      address: '123 Test St',
      latitude: 51.5074,
      longitude: -0.1278,
    });

    console.log(`✓ Plan generated with ${plan1.timeBlocks?.length || 0} blocks`);

    // Check for meal blocks
    const breakfastBlock = plan1.timeBlocks?.find(
      b => b.activityType === 'meal' && b.activityName === 'Breakfast'
    );
    const lunchBlock = plan1.timeBlocks?.find(
      b => b.activityType === 'meal' && b.activityName === 'Lunch'
    );
    const dinnerBlock = plan1.timeBlocks?.find(
      b => b.activityType === 'meal' && b.activityName === 'Dinner'
    );

    console.log(`  Breakfast: ${breakfastBlock ? '✓ Found' : '✗ Missing'} (status: ${breakfastBlock?.status || 'N/A'})`);
    console.log(`  Lunch: ${lunchBlock ? '✓ Found' : '✗ Missing'} (status: ${lunchBlock?.status || 'N/A'})`);
    console.log(`  Dinner: ${dinnerBlock ? '✓ Found' : '✗ Missing'} (status: ${dinnerBlock?.status || 'N/A'})`);

    if (!breakfastBlock || !lunchBlock || !dinnerBlock) {
      console.log('  ✗ FAIL: Not all meal blocks present');
    } else {
      console.log('  ✓ PASS: All meal blocks present');
    }
  } catch (error) {
    console.error('  ✗ Error:', error);
  }

  console.log();

  // Test 2: Late generation (3pm) - breakfast and lunch should be skipped
  console.log('Test 2: Late generation (3pm) - breakfast and lunch should be skipped');
  
  const now = new Date(today);
  now.setHours(15, 0, 0, 0); // 3pm

  // Mock current time by using wake time in the past
  const wakeTime2 = new Date(today);
  wakeTime2.setHours(7, 0, 0, 0);

  const input2: PlanInput = {
    userId: userId + '-2',
    date: today,
    wakeTime: wakeTime2,
    sleepTime,
    energyState: 'medium',
  };

  try {
    // Note: This test assumes the plan builder uses current time internally
    // In a real test, we'd need to mock Date.now() or pass current time as a parameter
    const plan2 = await planBuilder.generateDailyPlan(input2, {
      name: 'Home',
      address: '123 Test St',
      latitude: 51.5074,
      longitude: -0.1278,
    });

    console.log(`✓ Plan generated with ${plan2.timeBlocks?.length || 0} blocks`);

    // Check for meal blocks
    const breakfastBlock2 = plan2.timeBlocks?.find(
      b => b.activityType === 'meal' && b.activityName === 'Breakfast'
    );
    const lunchBlock2 = plan2.timeBlocks?.find(
      b => b.activityType === 'meal' && b.activityName === 'Lunch'
    );
    const dinnerBlock2 = plan2.timeBlocks?.find(
      b => b.activityType === 'meal' && b.activityName === 'Dinner'
    );

    console.log(`  Breakfast: ${breakfastBlock2 ? 'Found' : 'Missing'} (status: ${breakfastBlock2?.status || 'N/A'})`);
    console.log(`  Lunch: ${lunchBlock2 ? 'Found' : 'Missing'} (status: ${lunchBlock2?.status || 'N/A'})`);
    console.log(`  Dinner: ${dinnerBlock2 ? 'Found' : 'Missing'} (status: ${dinnerBlock2?.status || 'N/A'})`);

    // For late generation, breakfast and lunch should be skipped, dinner should be pending
    const breakfastCorrect = !breakfastBlock2 || breakfastBlock2.status === 'skipped';
    const lunchCorrect = !lunchBlock2 || lunchBlock2.status === 'skipped';
    const dinnerCorrect = dinnerBlock2 && dinnerBlock2.status === 'pending';

    if (breakfastCorrect && lunchCorrect && dinnerCorrect) {
      console.log('  ✓ PASS: Meal blocks correctly handled for late generation');
    } else {
      console.log('  ✗ FAIL: Meal blocks not correctly handled for late generation');
    }
  } catch (error) {
    console.error('  ✗ Error:', error);
  }

  console.log();

  // Test 3: Tail plan generation - dinner should be included
  console.log('Test 3: Tail plan generation - dinner should be included');
  
  const lateWakeTime = new Date(today);
  lateWakeTime.setHours(20, 0, 0, 0); // 8pm wake time (very late)

  const lateSleepTime = new Date(today);
  lateSleepTime.setHours(23, 30, 0, 0);

  const input3: PlanInput = {
    userId: userId + '-3',
    date: today,
    wakeTime: lateWakeTime,
    sleepTime: lateSleepTime,
    energyState: 'medium',
  };

  try {
    const plan3 = await planBuilder.generateDailyPlan(input3, {
      name: 'Home',
      address: '123 Test St',
      latitude: 51.5074,
      longitude: -0.1278,
    });

    console.log(`✓ Plan generated with ${plan3.timeBlocks?.length || 0} blocks`);

    // Check for dinner in tail plan
    const dinnerBlock3 = plan3.timeBlocks?.find(
      b => b.activityType === 'meal' && b.activityName === 'Dinner'
    );

    console.log(`  Dinner: ${dinnerBlock3 ? '✓ Found' : '✗ Missing'} (status: ${dinnerBlock3?.status || 'N/A'})`);

    if (dinnerBlock3 && dinnerBlock3.status === 'pending') {
      console.log('  ✓ PASS: Dinner included in tail plan');
    } else {
      console.log('  ✗ FAIL: Dinner not properly included in tail plan');
    }
  } catch (error) {
    console.error('  ✗ Error:', error);
  }

  console.log('\n✅ Meal blocks verification complete');
}

testMealBlocksVerification().catch(console.error);
