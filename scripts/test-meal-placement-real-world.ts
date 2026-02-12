// Integration tests for meal placement - Real-world scenarios
// Tests Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.3, 5.4, 6.1, 6.2, 6.3

// Load environment variables from .env file
import { config } from 'dotenv';
config();

// Set up additional environment variables before importing modules
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test';
process.env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'test';
process.env.SITE = process.env.SITE || 'http://localhost:4321';

import { createClient } from '@supabase/supabase-js';
import { PlanBuilderService } from '../src/lib/daily-plan/plan-builder';
import type { PlanInput } from '../src/types/daily-plan';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
// Use service role key to bypass RLS for testing
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to format time for display
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Helper to check if time is in range
function isTimeInRange(time: Date, startHour: number, startMin: number, endHour: number, endMin: number): boolean {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const startInMinutes = startHour * 60 + startMin;
  const endInMinutes = endHour * 60 + endMin;
  return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
}

async function testMorningClassScenario() {
  console.log('=== Test 7.1: Morning Class Scenario ===');
  console.log('Wake 07:00, Class 09:00-10:00');
  console.log('Expected: Breakfast before class (07:30-08:30), Lunch after class (12:30-13:00), Dinner evening (19:00-19:45)\n');

  // Use actual user ID for testing
  const userId = '70429eba-f32e-47ab-bfcb-a75e2f819de4';
  const planBuilder = new PlanBuilderService(supabase);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0);

  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0);

  // Create a mock commitment (class)
  const classStart = new Date(today);
  classStart.setHours(9, 0, 0, 0);
  const classEnd = new Date(today);
  classEnd.setHours(10, 0, 0, 0);

  // First create a calendar source
  const { data: calendarSource, error: sourceError } = await supabase
    .from('calendar_sources')
    .insert({
      user_id: userId,
      name: 'Test Calendar',
      type: 'manual',
      is_active: true,
    })
    .select()
    .single();

  if (sourceError) {
    console.error('❌ Failed to create calendar source:', sourceError);
    throw sourceError;
  }

  // Insert mock commitment into database
  const { data: commitment, error: commitmentError } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      source_id: calendarSource.id,
      title: 'Morning Class',
      start_time: classStart.toISOString(),
      end_time: classEnd.toISOString(),
      event_type: 'class', // Use valid enum value
    })
    .select()
    .single();

  if (commitmentError) {
    console.error('❌ Failed to create test commitment:', commitmentError);
    throw commitmentError;
  }

  try {
    const planInput: PlanInput = {
      userId,
      date: today,
      wakeTime,
      sleepTime,
      energyState: 'medium',
    };

    const currentLocation = {
      name: 'Home',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    };

    const plan = await planBuilder.generateDailyPlan(planInput, currentLocation);

    console.log('Generated Plan:');
    console.log(`Wake: ${formatTime(plan.wakeTime)}`);
    console.log(`Sleep: ${formatTime(plan.sleepTime)}`);
    console.log(`\nTime Blocks (${plan.timeBlocks?.length || 0} total):\n`);

    if (!plan.timeBlocks) {
      console.error('❌ FAIL: No time blocks generated');
      return false;
    }

    // Find meal blocks
    const mealBlocks = plan.timeBlocks.filter(b => b.activityType === 'meal');
    const breakfast = mealBlocks.find(b => b.activityName.toLowerCase().includes('breakfast'));
    const lunch = mealBlocks.find(b => b.activityName.toLowerCase().includes('lunch'));
    const dinner = mealBlocks.find(b => b.activityName.toLowerCase().includes('dinner'));

    console.log('Meal blocks:');
    for (const block of mealBlocks) {
      console.log(`  ${block.activityName}: ${formatTime(block.startTime)} - ${formatTime(block.endTime)}`);
    }

    // Find commitment block
    const commitmentBlock = plan.timeBlocks.find(b => b.activityType === 'commitment');
    if (commitmentBlock) {
      console.log(`\nCommitment: ${commitmentBlock.activityName}: ${formatTime(commitmentBlock.startTime)} - ${formatTime(commitmentBlock.endTime)}`);
    }

    let passed = true;

    // Verify breakfast before class (07:30-08:30)
    // Requirement: 3.2
    if (breakfast) {
      const breakfastBeforeClass = breakfast.endTime <= classStart;
      const breakfastInRange = isTimeInRange(breakfast.startTime, 7, 30, 8, 30);
      
      if (breakfastBeforeClass && breakfastInRange) {
        console.log(`\n✅ PASS: Breakfast scheduled before class at ${formatTime(breakfast.startTime)}`);
      } else if (!breakfastBeforeClass) {
        console.log(`\n❌ FAIL: Breakfast not before class (ends at ${formatTime(breakfast.endTime)}, class starts at ${formatTime(classStart)})`);
        passed = false;
      } else {
        console.log(`\n⚠️  WARNING: Breakfast before class but not in expected range (${formatTime(breakfast.startTime)})`);
      }
    } else {
      console.log('\n❌ FAIL: Breakfast not found');
      passed = false;
    }

    // Verify lunch after class (12:30-13:00)
    // Requirement: 3.3
    if (lunch) {
      const lunchAfterClass = lunch.startTime >= classEnd;
      const lunchInRange = isTimeInRange(lunch.startTime, 12, 30, 13, 0);
      
      if (lunchAfterClass && lunchInRange) {
        console.log(`✅ PASS: Lunch scheduled after class at ${formatTime(lunch.startTime)}`);
      } else if (!lunchAfterClass) {
        console.log(`❌ FAIL: Lunch not after class (starts at ${formatTime(lunch.startTime)}, class ends at ${formatTime(classEnd)})`);
        passed = false;
      } else {
        console.log(`⚠️  WARNING: Lunch after class but not in expected range (${formatTime(lunch.startTime)})`);
      }
    } else {
      console.log('❌ FAIL: Lunch not found');
      passed = false;
    }

    // Verify dinner in evening (19:00-19:45)
    // Requirement: 3.1
    if (dinner) {
      const dinnerInRange = isTimeInRange(dinner.startTime, 19, 0, 19, 45);
      
      if (dinnerInRange) {
        console.log(`✅ PASS: Dinner scheduled in evening at ${formatTime(dinner.startTime)}`);
      } else {
        console.log(`⚠️  WARNING: Dinner not in expected range (${formatTime(dinner.startTime)})`);
      }
    } else {
      console.log('❌ FAIL: Dinner not found');
      passed = false;
    }

    return passed;
  } finally {
    // Cleanup: delete test data
    await supabase.from('calendar_events').delete().eq('user_id', userId);
    await supabase.from('calendar_sources').delete().eq('user_id', userId);
    await supabase.from('daily_plans').delete().eq('user_id', userId);
  }
}

async function testEveningSeminarScenario() {
  console.log('\n=== Test 7.2: Evening Seminar Scenario ===');
  console.log('Wake 07:00, Seminar 17:00-18:00');
  console.log('Expected: Breakfast morning (09:00-09:30), Lunch midday (13:00-13:30), Dinner after seminar (19:00-19:45)\n');

  // Use actual user ID for testing
  const userId = '70429eba-f32e-47ab-bfcb-a75e2f819de4';
  const planBuilder = new PlanBuilderService(supabase);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0);

  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0);

  // Create a mock commitment (seminar)
  const seminarStart = new Date(today);
  seminarStart.setHours(17, 0, 0, 0);
  const seminarEnd = new Date(today);
  seminarEnd.setHours(18, 0, 0, 0);

  // First create a calendar source
  const { data: calendarSource, error: sourceError } = await supabase
    .from('calendar_sources')
    .insert({
      user_id: userId,
      name: 'Test Calendar',
      type: 'manual',
      is_active: true,
    })
    .select()
    .single();

  if (sourceError) {
    console.error('❌ Failed to create calendar source:', sourceError);
    throw sourceError;
  }

  // Insert mock commitment into database
  const { data: commitment, error: commitmentError } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      source_id: calendarSource.id,
      title: 'Evening Seminar',
      start_time: seminarStart.toISOString(),
      end_time: seminarEnd.toISOString(),
      event_type: 'meeting', // Use valid enum value
    })
    .select()
    .single();

  if (commitmentError) {
    console.error('❌ Failed to create test commitment:', commitmentError);
    throw commitmentError;
  }

  try {
    const planInput: PlanInput = {
      userId,
      date: today,
      wakeTime,
      sleepTime,
      energyState: 'medium',
    };

    const currentLocation = {
      name: 'Home',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    };

    const plan = await planBuilder.generateDailyPlan(planInput, currentLocation);

    console.log('Generated Plan:');
    console.log(`Wake: ${formatTime(plan.wakeTime)}`);
    console.log(`Sleep: ${formatTime(plan.sleepTime)}`);
    console.log(`\nTime Blocks (${plan.timeBlocks?.length || 0} total):\n`);

    if (!plan.timeBlocks) {
      console.error('❌ FAIL: No time blocks generated');
      return false;
    }

    // Find meal blocks
    const mealBlocks = plan.timeBlocks.filter(b => b.activityType === 'meal');
    const breakfast = mealBlocks.find(b => b.activityName.toLowerCase().includes('breakfast'));
    const lunch = mealBlocks.find(b => b.activityName.toLowerCase().includes('lunch'));
    const dinner = mealBlocks.find(b => b.activityName.toLowerCase().includes('dinner'));

    console.log('Meal blocks:');
    for (const block of mealBlocks) {
      console.log(`  ${block.activityName}: ${formatTime(block.startTime)} - ${formatTime(block.endTime)}`);
    }

    // Find commitment block
    const commitmentBlock = plan.timeBlocks.find(b => b.activityType === 'commitment');
    if (commitmentBlock) {
      console.log(`\nCommitment: ${commitmentBlock.activityName}: ${formatTime(commitmentBlock.startTime)} - ${formatTime(commitmentBlock.endTime)}`);
    }

    let passed = true;

    // Verify breakfast in morning (09:00-09:30)
    // Requirement: 3.1
    if (breakfast) {
      const breakfastInRange = isTimeInRange(breakfast.startTime, 9, 0, 9, 30);
      
      if (breakfastInRange) {
        console.log(`\n✅ PASS: Breakfast scheduled in morning at ${formatTime(breakfast.startTime)}`);
      } else {
        console.log(`\n⚠️  WARNING: Breakfast not in expected range (${formatTime(breakfast.startTime)})`);
      }
    } else {
      console.log('\n❌ FAIL: Breakfast not found');
      passed = false;
    }

    // Verify lunch in midday (13:00-13:30)
    // Requirement: 3.3
    if (lunch) {
      const lunchInRange = isTimeInRange(lunch.startTime, 13, 0, 13, 30);
      
      if (lunchInRange) {
        console.log(`✅ PASS: Lunch scheduled in midday at ${formatTime(lunch.startTime)}`);
      } else {
        console.log(`⚠️  WARNING: Lunch not in expected range (${formatTime(lunch.startTime)})`);
      }
    } else {
      console.log('❌ FAIL: Lunch not found');
      passed = false;
    }

    // Verify dinner after seminar (19:00-19:45)
    // Requirement: 3.4
    if (dinner) {
      const dinnerAfterSeminar = dinner.startTime >= seminarEnd;
      const dinnerInRange = isTimeInRange(dinner.startTime, 19, 0, 19, 45);
      
      if (dinnerAfterSeminar && dinnerInRange) {
        console.log(`✅ PASS: Dinner scheduled after seminar at ${formatTime(dinner.startTime)}`);
      } else if (!dinnerAfterSeminar) {
        console.log(`❌ FAIL: Dinner not after seminar (starts at ${formatTime(dinner.startTime)}, seminar ends at ${formatTime(seminarEnd)})`);
        passed = false;
      } else {
        console.log(`⚠️  WARNING: Dinner after seminar but not in expected range (${formatTime(dinner.startTime)})`);
      }
    } else {
      console.log('❌ FAIL: Dinner not found');
      passed = false;
    }

    return passed;
  } finally {
    // Cleanup: delete test data
    await supabase.from('calendar_events').delete().eq('user_id', userId);
    await supabase.from('calendar_sources').delete().eq('user_id', userId);
    await supabase.from('daily_plans').delete().eq('user_id', userId);
  }
}

async function testNoCommitmentsScenario() {
  console.log('\n=== Test 7.3: No Commitments Scenario ===');
  console.log('Wake 07:00, No commitments');
  console.log('Expected: Breakfast 09:30, Lunch 13:00, Dinner 19:00\n');

  // Use actual user ID for testing
  const userId = '70429eba-f32e-47ab-bfcb-a75e2f819de4';
  const planBuilder = new PlanBuilderService(supabase);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0);

  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0);

  try {
    const planInput: PlanInput = {
      userId,
      date: today,
      wakeTime,
      sleepTime,
      energyState: 'medium',
    };

    const currentLocation = {
      name: 'Home',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    };

    const plan = await planBuilder.generateDailyPlan(planInput, currentLocation);

    console.log('Generated Plan:');
    console.log(`Wake: ${formatTime(plan.wakeTime)}`);
    console.log(`Sleep: ${formatTime(plan.sleepTime)}`);
    console.log(`\nTime Blocks (${plan.timeBlocks?.length || 0} total):\n`);

    if (!plan.timeBlocks) {
      console.error('❌ FAIL: No time blocks generated');
      return false;
    }

    // Find meal blocks
    const mealBlocks = plan.timeBlocks.filter(b => b.activityType === 'meal');
    const breakfast = mealBlocks.find(b => b.activityName.toLowerCase().includes('breakfast'));
    const lunch = mealBlocks.find(b => b.activityName.toLowerCase().includes('lunch'));
    const dinner = mealBlocks.find(b => b.activityName.toLowerCase().includes('dinner'));

    console.log('Meal blocks:');
    for (const block of mealBlocks) {
      console.log(`  ${block.activityName}: ${formatTime(block.startTime)} - ${formatTime(block.endTime)}`);
    }

    let passed = true;

    // Verify breakfast at 09:30
    // Requirements: 3.5, 5.1
    if (breakfast) {
      const breakfastAt0930 = breakfast.startTime.getHours() === 9 && breakfast.startTime.getMinutes() === 30;
      
      if (breakfastAt0930) {
        console.log(`\n✅ PASS: Breakfast scheduled at default time ${formatTime(breakfast.startTime)}`);
      } else {
        console.log(`\n⚠️  WARNING: Breakfast not at expected default time 09:30 (actual: ${formatTime(breakfast.startTime)})`);
      }
    } else {
      console.log('\n❌ FAIL: Breakfast not found');
      passed = false;
    }

    // Verify lunch at 13:00
    // Requirements: 5.3
    if (lunch) {
      const lunchAt1300 = lunch.startTime.getHours() === 13 && lunch.startTime.getMinutes() === 0;
      
      if (lunchAt1300) {
        console.log(`✅ PASS: Lunch scheduled at default time ${formatTime(lunch.startTime)}`);
      } else {
        console.log(`⚠️  WARNING: Lunch not at expected default time 13:00 (actual: ${formatTime(lunch.startTime)})`);
      }
    } else {
      console.log('❌ FAIL: Lunch not found');
      passed = false;
    }

    // Verify dinner at 19:00
    // Requirements: 5.4
    if (dinner) {
      const dinnerAt1900 = dinner.startTime.getHours() === 19 && dinner.startTime.getMinutes() === 0;
      
      if (dinnerAt1900) {
        console.log(`✅ PASS: Dinner scheduled at default time ${formatTime(dinner.startTime)}`);
      } else {
        console.log(`⚠️  WARNING: Dinner not at expected default time 19:00 (actual: ${formatTime(dinner.startTime)})`);
      }
    } else {
      console.log('❌ FAIL: Dinner not found');
      passed = false;
    }

    return passed;
  } finally {
    // Cleanup: delete test data
    await supabase.from('daily_plans').delete().eq('user_id', userId);
  }
}

async function testLateGenerationScenario() {
  console.log('\n=== Test 7.4: Late Generation Scenario ===');
  console.log('Generate at 14:00');
  console.log('Expected: Breakfast skipped, Lunch skipped, Dinner scheduled 19:00\n');

  // Use actual user ID for testing
  const userId = '70429eba-f32e-47ab-bfcb-a75e2f819de4';
  const planBuilder = new PlanBuilderService(supabase);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Set wake time to 14:00 (simulating late generation)
  const wakeTime = new Date(today);
  wakeTime.setHours(14, 0, 0, 0);

  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0);

  try {
    const planInput: PlanInput = {
      userId,
      date: today,
      wakeTime,
      sleepTime,
      energyState: 'medium',
    };

    const currentLocation = {
      name: 'Home',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    };

    const plan = await planBuilder.generateDailyPlan(planInput, currentLocation);

    console.log('Generated Plan:');
    console.log(`Wake: ${formatTime(plan.wakeTime)}`);
    console.log(`Sleep: ${formatTime(plan.sleepTime)}`);
    console.log(`\nTime Blocks (${plan.timeBlocks?.length || 0} total):\n`);

    if (!plan.timeBlocks) {
      console.error('❌ FAIL: No time blocks generated');
      return false;
    }

    // Find meal blocks
    const mealBlocks = plan.timeBlocks.filter(b => b.activityType === 'meal');
    const breakfast = mealBlocks.find(b => b.activityName.toLowerCase().includes('breakfast'));
    const lunch = mealBlocks.find(b => b.activityName.toLowerCase().includes('lunch'));
    const dinner = mealBlocks.find(b => b.activityName.toLowerCase().includes('dinner'));

    console.log('Meal blocks:');
    if (mealBlocks.length === 0) {
      console.log('  (none found in time blocks)');
    } else {
      for (const block of mealBlocks) {
        console.log(`  ${block.activityName}: ${formatTime(block.startTime)} - ${formatTime(block.endTime)}`);
      }
    }

    let passed = true;

    // Verify breakfast skipped
    // Requirement: 6.1
    if (!breakfast) {
      console.log('\n✅ PASS: Breakfast skipped (past meal window)');
    } else {
      console.log(`\n❌ FAIL: Breakfast should be skipped but found at ${formatTime(breakfast.startTime)}`);
      passed = false;
    }

    // Verify lunch skipped
    // Requirement: 6.2
    if (!lunch) {
      console.log('✅ PASS: Lunch skipped (past meal window)');
    } else {
      console.log(`❌ FAIL: Lunch should be skipped but found at ${formatTime(lunch.startTime)}`);
      passed = false;
    }

    // Verify dinner scheduled around 19:00
    // Requirement: 6.3
    if (dinner) {
      const dinnerInRange = isTimeInRange(dinner.startTime, 19, 0, 19, 30);
      
      if (dinnerInRange) {
        console.log(`✅ PASS: Dinner scheduled at ${formatTime(dinner.startTime)}`);
      } else {
        console.log(`⚠️  WARNING: Dinner not in expected range (${formatTime(dinner.startTime)})`);
      }
    } else {
      console.log('❌ FAIL: Dinner not found');
      passed = false;
    }

    return passed;
  } finally {
    // Cleanup: delete test data
    await supabase.from('daily_plans').delete().eq('user_id', userId);
  }
}

// Run all tests
async function runAllTests() {
  console.log('=== Real-World Meal Placement Integration Tests ===\n');

  const results = {
    morningClass: false,
    eveningSeminar: false,
    noCommitments: false,
    lateGeneration: false,
  };

  try {
    results.morningClass = await testMorningClassScenario();
  } catch (error) {
    console.error('❌ Morning class test failed with error:', error);
  }

  try {
    results.eveningSeminar = await testEveningSeminarScenario();
  } catch (error) {
    console.error('❌ Evening seminar test failed with error:', error);
  }

  try {
    results.noCommitments = await testNoCommitmentsScenario();
  } catch (error) {
    console.error('❌ No commitments test failed with error:', error);
  }

  try {
    results.lateGeneration = await testLateGenerationScenario();
  } catch (error) {
    console.error('❌ Late generation test failed with error:', error);
  }

  console.log('\n=== Test Summary ===');
  console.log(`Morning Class: ${results.morningClass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Evening Seminar: ${results.eveningSeminar ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`No Commitments: ${results.noCommitments ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Late Generation: ${results.lateGeneration ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n✅ All integration tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some integration tests failed');
    process.exit(1);
  }
}

runAllTests();
