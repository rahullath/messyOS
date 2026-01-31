/**
 * Test V2 Chain Integration with Plan Builder
 * 
 * This script tests that the V2 chain generation is properly integrated
 * into the plan builder and that all components work together.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PlanBuilderService } from '../src/lib/daily-plan/plan-builder';
import type { PlanInput } from '../src/types/daily-plan';
import type { Location } from '../src/types/uk-student-travel';

// Load environment variables
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testV2Integration() {
  console.log('=== Testing V2 Chain Integration ===\n');

  // Test user ID (replace with actual user ID)
  const userId = 'test-user-id';

  // Create plan input
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

  const currentLocation: Location = {
    name: 'Home',
    address: '123 Test St',
    latitude: 51.5074,
    longitude: -0.1278,
  };

  try {
    console.log('Creating plan builder service...');
    const planBuilder = new PlanBuilderService(supabase);

    console.log('Generating daily plan with V2 chain integration...');
    const plan = await planBuilder.generateDailyPlan(planInput, currentLocation);

    console.log('\n=== Plan Generated Successfully ===');
    console.log(`Plan ID: ${plan.id}`);
    console.log(`Plan Date: ${plan.planDate.toDateString()}`);
    console.log(`Wake Time: ${plan.wakeTime.toLocaleTimeString()}`);
    console.log(`Sleep Time: ${plan.sleepTime.toLocaleTimeString()}`);
    console.log(`Energy State: ${plan.energyState}`);
    console.log(`Status: ${plan.status}`);

    // Check V2 fields
    console.log('\n=== V2 Chain Data ===');
    
    if ((plan as any).chains) {
      const chains = (plan as any).chains;
      console.log(`Chains: ${chains.length}`);
      for (const chain of chains) {
        console.log(`  - Chain ${chain.chain_id}:`);
        console.log(`    Anchor: ${chain.anchor.title}`);
        console.log(`    Steps: ${chain.steps.length}`);
        console.log(`    Deadline: ${chain.chain_completion_deadline.toLocaleTimeString()}`);
      }
    } else {
      console.log('Chains: Not present (expected if no calendar events)');
    }

    if ((plan as any).wakeRamp) {
      const wakeRamp = (plan as any).wakeRamp;
      console.log(`\nWake Ramp: ${wakeRamp.skipped ? 'SKIPPED' : `${wakeRamp.duration} minutes`}`);
      if (!wakeRamp.skipped) {
        console.log(`  Start: ${wakeRamp.start.toLocaleTimeString()}`);
        console.log(`  End: ${wakeRamp.end.toLocaleTimeString()}`);
      }
    } else {
      console.log('\nWake Ramp: Not present');
    }

    if ((plan as any).homeIntervals) {
      const homeIntervals = (plan as any).homeIntervals;
      console.log(`\nHome Intervals: ${homeIntervals.length}`);
      for (const interval of homeIntervals) {
        console.log(`  - ${interval.start.toLocaleTimeString()} - ${interval.end.toLocaleTimeString()} (${interval.duration} min)`);
      }
    } else {
      console.log('\nHome Intervals: Not present');
    }

    if ((plan as any).locationPeriods) {
      const locationPeriods = (plan as any).locationPeriods;
      console.log(`\nLocation Periods: ${locationPeriods.length}`);
      for (const period of locationPeriods) {
        console.log(`  - ${period.start.toLocaleTimeString()} - ${period.end.toLocaleTimeString()}: ${period.state}`);
      }
    } else {
      console.log('\nLocation Periods: Not present');
    }

    // Check time blocks
    console.log('\n=== Time Blocks ===');
    if (plan.timeBlocks) {
      console.log(`Total blocks: ${plan.timeBlocks.length}`);
      
      const mealBlocks = plan.timeBlocks.filter(b => b.activityType === 'meal');
      console.log(`Meal blocks: ${mealBlocks.length}`);
      for (const meal of mealBlocks) {
        console.log(`  - ${meal.activityName}: ${meal.startTime.toLocaleTimeString()}`);
        if (meal.skipReason) {
          console.log(`    SKIPPED: ${meal.skipReason}`);
        }
      }
    }

    console.log('\n=== Test Passed ===');
    return true;
  } catch (error) {
    console.error('\n=== Test Failed ===');
    console.error('Error:', error);
    return false;
  }
}

// Run the test
testV2Integration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
